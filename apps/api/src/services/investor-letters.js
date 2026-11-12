import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createTransport } from 'nodemailer';
import { readFile, writeFile, rename, mkdir, chmod } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import {
	findCommunicationTemplate,
	renderCommunicationTemplate,
} from '../data/communication-templates.js';

// ─────────────────────────────────────────────────────────────────────────
// Controlled investor-letter audience and delivery service
//
// Two tracks only:
//   • private_506b — one-to-one private-placement introductions. No general
//     solicitation, no offering terms, only pre-existing substantive
//     relationships.
//   • reg_cf — confirmed investor-update subscribers. Pre-launch education
//     is permitted only as a non-offering update. Campaign-live, reminder
//     and closing copy require a qualified offering and a registered
//     intermediary recorded in the server environment.
//
// The audience and send log are stored in a 0600 JSON file on the API host.
// This is an operational register, not a marketing database. It is never
// exposed by a public read route. The public unsubscribe route is the only
// unauthenticated endpoint and it only accepts a signed token.
// ─────────────────────────────────────────────────────────────────────────

const STORE_PATH = fileURLToPath(new URL('../../storage/investor-letters/letters.json', import.meta.url));
const STORE_DIR = dirname(STORE_PATH);
const MAX_RECIPIENTS = 200;
const MAX_CONTACTS = 10000;
const MAX_SENDS_KEPT = 5000;
const MAX_AUDIT_KEPT = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRACKS = new Set(['private_506b', 'reg_cf']);
const CONTACT_STATUSES = new Set(['active', 'unsubscribed', 'suppressed', 'bounced']);
const RELATIONSHIP_BASES = new Set(['existing_substantive', 'existing_limited', 'inbound_request', 'other', 'not_applicable']);
const ELIGIBILITY = new Set(['verified_accredited', 'self_certified_accredited', 'not_yet_verified', 'not_applicable']);

const TRACK_TEMPLATES = Object.freeze({
	private_506b: [
		'fundraising.private-invite',
		'fundraising.private-follow-up',
	],
	reg_cf: [
		'fundraising.regcf-prelaunch-education',
		'fundraising.regcf-live',
		'fundraising.regcf-reminder',
		'fundraising.regcf-closing',
	],
});

const LIVE_REG_CF_TEMPLATES = new Set([
	'fundraising.regcf-live',
	'fundraising.regcf-reminder',
]);

export const INVESTOR_LETTER_TRACKS = Object.freeze([
	{
		id: 'private_506b',
		label: 'Private placement',
		regulation: 'Rule 506(b)',
		description: 'One-to-one private introductions to people with a pre-existing substantive relationship. No general solicitation and no offering terms in the email.',
		tone: 'red',
	},
	{
		id: 'reg_cf',
		label: 'Regulation CF',
		regulation: 'SEC Regulation CF',
		description: 'Confirmed investor-update subscribers. Pre-launch education is non-offering; campaign emails require SEC qualification and the registered intermediary.',
		tone: 'blue',
	},
]);

const smtp = (() => {
	const host = process.env.SMTP_HOST;
	const port = Number(process.env.SMTP_PORT || 587);
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !port || !user || !pass) return null;
	return createTransport({
		host,
		port,
		secure: port === 465,
		requireTLS: port === 587,
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 20000,
		auth: { user, pass },
	});
})();

const appUrl = String(process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, '');
const legalEmail = String(process.env.LEGAL_EMAIL || process.env.SUPPORT_EMAIL || 'legal@tradingbible.app').trim();
const fromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@tradingbible.app').trim();
const fromName = String(process.env.SMTP_FROM_NAME || 'TradingBible').trim();
const postalAddress = String(process.env.COMPANY_POSTAL_ADDRESS || '').trim();

function nowIso() {
	return new Date().toISOString();
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase().slice(0, 240);
}

function cleanText(value, max = 500) {
	return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value, max = 4000) {
	return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function isPlaceholder(value) {
	const text = String(value || '').trim().toLowerCase();
	if (!text) return true;
	return /^\[.*\]$/.test(text) || /^<.*>$/.test(text) || /\b(tbd|todo|placeholder|insert|example\.com)\b/.test(text);
}

function displayName(contact) {
	return cleanText(contact?.name, 120) || normalizeEmail(contact?.email).split('@')[0] || 'Investor';
}

function firstName(contact) {
	const name = displayName(contact);
	return name.split(/\s+/)[0] || 'there';
}

function normalizeTrack(value) {
	const track = String(value || '').toLowerCase();
	if (!TRACKS.has(track)) {
		const err = new Error('Choose the private Rule 506(b) track or the Regulation CF track.');
		err.status = 422;
		throw err;
	}
	return track;
}

function normalizeStatus(value, fallback = 'active') {
	const status = String(value || '').toLowerCase();
	return CONTACT_STATUSES.has(status) ? status : fallback;
}

function normalizeRelationship(value) {
	const relationship = String(value || '').toLowerCase();
	return RELATIONSHIP_BASES.has(relationship) ? relationship : 'other';
}

function normalizeEligibility(value) {
	const eligibility = String(value || '').toLowerCase();
	return ELIGIBILITY.has(eligibility) ? eligibility : 'not_yet_verified';
}

function bool(value) {
	return value === true || value === 'true' || value === 1 || value === '1';
}

function dateOnly(value) {
	const raw = String(value || '').trim();
	if (!raw) return '';
	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString();
}

function today() {
	return new Date().toISOString().slice(0, 10);
}

function campaignNumber() {
	const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
	return `IL-${stamp}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

function emptyStore() {
	return {
		version: 1,
		createdAt: nowIso(),
		updatedAt: nowIso(),
		contacts: [],
		campaigns: [],
		sends: [],
		audit: [],
	};
}

let cache = null;
let queue = Promise.resolve();

async function ensureStoreDir() {
	await mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
	try { await chmod(STORE_DIR, 0o700); } catch { /* best effort */ }
}

function normalizeStore(raw) {
	const base = emptyStore();
	if (!raw || typeof raw !== 'object') return base;
	return {
		...base,
		...raw,
		version: 1,
		contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
		campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
		sends: Array.isArray(raw.sends) ? raw.sends : [],
		audit: Array.isArray(raw.audit) ? raw.audit : [],
	};
}

async function loadStore() {
	if (cache) return cache;
	await ensureStoreDir();
	try {
		const text = await readFile(STORE_PATH, 'utf8');
		cache = normalizeStore(JSON.parse(text));
	} catch (err) {
		if (err?.code !== 'ENOENT') {
			logger.warn('[investor-letters] store read failed; starting a new controlled register', String(err?.message || err));
		}
		cache = emptyStore();
		await persist(cache);
	}
	// A process restart during an SMTP loop must never leave a campaign
	// looking like it is still sending. Keep the sent rows that were already
	// written and mark the campaign interrupted for admin review.
	let changed = false;
	for (const campaign of cache.campaigns) {
		if (campaign.status === 'sending') {
			campaign.status = 'interrupted';
			campaign.error = 'The API process restarted while this campaign was sending. Review the send log before retrying.';
			campaign.completedAt = nowIso();
			changed = true;
			cache.audit.push(auditEntry('system', 'campaign_interrupted', campaign.id, campaign.error));
		}
	}
	if (changed) await persist(cache);
	return cache;
}

async function persist(store) {
	await ensureStoreDir();
	store.updatedAt = nowIso();
	const temp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
	await chmod(temp, 0o600).catch(() => {});
	await rename(temp, STORE_PATH);
	await chmod(STORE_PATH, 0o600).catch(() => {});
	cache = store;
}

function withStore(mutator) {
	const run = queue.then(async () => {
		const store = await loadStore();
		const result = await mutator(store);
		if (store.sends.length > MAX_SENDS_KEPT) store.sends = store.sends.slice(-MAX_SENDS_KEPT);
		if (store.audit.length > MAX_AUDIT_KEPT) store.audit = store.audit.slice(-MAX_AUDIT_KEPT);
		await persist(store);
		return result;
	});
	queue = run.catch(() => {});
	return run;
}

function auditEntry(actor, action, target, detail = '') {
	return {
		id: randomUUID(),
		at: nowIso(),
		actor: cleanText(actor || 'admin', 200) || 'admin',
		action,
		target: String(target || ''),
		detail: cleanText(detail, 1000),
	};
}

function requireTemplate(templateId, track) {
	const template = findCommunicationTemplate(templateId);
	if (!template) {
		const err = new Error('Template not found.');
		err.status = 404;
		throw err;
	}
	if (!TRACK_TEMPLATES[track]?.includes(template.id)) {
		const err = new Error('That template does not belong to the selected investor-letter track.');
		err.status = 422;
		throw err;
	}
	return template;
}

function publicContact(row) {
	return {
		id: row.id,
		track: row.track,
		email: row.email,
		name: row.name || '',
		status: row.status,
		relationshipBasis: row.relationshipBasis,
		eligibility: row.eligibility,
		consent: Boolean(row.consent),
		consentAt: row.consentAt || null,
		consentSource: row.consentSource || '',
		source: row.source || '',
		notes: row.notes || '',
		externalId: row.externalId || null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		lastSentAt: row.lastSentAt || null,
		lastCampaignId: row.lastCampaignId || null,
		unsubscribedAt: row.unsubscribedAt || null,
	};
}

function publicCampaign(row) {
	return {
		id: row.id,
		number: row.number,
		name: row.name,
		track: row.track,
		templateId: row.templateId,
		status: row.status,
		recipientCount: row.recipientCount,
		sentCount: row.sentCount || 0,
		failedCount: row.failedCount || 0,
		subject: row.subject || '',
		variables: row.variables || {},
		legal: row.legal || {},
		error: row.error || '',
		createdBy: row.createdBy || '',
		createdAt: row.createdAt,
		startedAt: row.startedAt || null,
		completedAt: row.completedAt || null,
	};
}

function configSnapshot() {
	const regCfRaw = String(process.env.REG_CF_OFFERING_STATUS || '').trim().toLowerCase();
	const regCfStatus = ['prelaunch', 'qualified', 'closed'].includes(regCfRaw) ? regCfRaw : (regCfRaw ? 'unknown' : 'prelaunch');
	return {
		smtpConfigured: Boolean(smtp),
		postalAddressConfigured: Boolean(postalAddress),
		appUrl,
		legalEmail,
		regCfStatus,
		regCfIntermediary: cleanText(process.env.REG_CF_INTERMEDIARY, 200),
		regCfOfferingUrl: cleanText(process.env.REG_CF_OFFERING_URL, 500),
		unsubscribeSecretConfigured: String(process.env.INVESTOR_LETTERS_SECRET || '').trim().length >= 32,
		maxRecipients: MAX_RECIPIENTS,
		storeWritable: true,
	};
}

function templateSummary(template) {
	return {
		id: template.id,
		category: template.category,
		name: template.name,
		description: template.description,
		audience: template.audience,
		compliance: template.compliance,
		implementation: template.implementation,
		sendPolicy: template.sendPolicy,
		requiresCounsel: Boolean(template.requiresCounsel),
		variables: template.variables || [],
		subject: template.email?.subject || '',
		preheader: template.email?.preheader || '',
	};
}

function contactVars(contact, variables = {}) {
	return {
		...variables,
		firstName: firstName(contact),
		fullName: displayName(contact),
		email: contact.email,
		companyName: 'TradingBible Holdings, Inc.',
		brandName: 'TradingBible',
		legalEmail,
		appUrl,
	};
}

function campaignVariables(input, track, templateId) {
	const vars = input && typeof input === 'object' ? input : {};
	const next = {
		legalEmail,
		appUrl,
		callBookingUrl: cleanText(vars.callBookingUrl, 500) || `mailto:${legalEmail}`,
		senderName: cleanText(vars.senderName, 120),
		senderTitle: cleanText(vars.senderTitle, 160),
		campaignDeadline: cleanText(vars.campaignDeadline, 160),
	};
	if (track === 'private_506b') {
		if (!next.senderName || isPlaceholder(next.senderName)) {
			next.senderName = '';
		}
		if (!next.senderTitle || isPlaceholder(next.senderTitle)) {
			next.senderTitle = '';
		}
	}
	if (track === 'reg_cf') {
		next.intermediaryName = configSnapshot().regCfIntermediary;
		if (['fundraising.regcf-live', 'fundraising.regcf-reminder'].includes(templateId)) {
			next.offeringUrl = configSnapshot().regCfOfferingUrl;
		}
	}
	return next;
}

function evaluateCampaign({ track, template, contacts, variables, legal }) {
	const config = configSnapshot();
	const blockers = [];
	const warnings = [];
	const legalInput = legal && typeof legal === 'object' ? legal : {};
	const counselApproved = legalInput.counselApproved === true
		&& !isPlaceholder(legalInput.counselName)
		&& !isPlaceholder(legalInput.counselReference)
		&& Boolean(dateOnly(legalInput.counselApprovedAt));

	if (!smtp) blockers.push('SMTP is not configured on the API server. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
	if (!postalAddress) blockers.push('COMPANY_POSTAL_ADDRESS is not configured. A commercial email footer needs the company postal address.');
	if (!counselApproved) blockers.push('Record counsel approval: counsel name, approval reference and approval date are required.');
	if (!config.unsubscribeSecretConfigured) blockers.push('INVESTOR_LETTERS_SECRET must be a dedicated secret of at least 32 characters before a real investor letter can be sent.');
	if (!contacts.length) blockers.push('There are no active, consented recipients in this track.');

	if (track === 'private_506b') {
		if (legalInput.privateRelationship !== true) blockers.push('Confirm that every recipient has a pre-existing substantive relationship with the company.');
		if (legalInput.noGeneralSolicitation !== true) blockers.push('Confirm this is a one-to-one communication with no general solicitation and no forwarding.');
		if (!variables.senderName) blockers.push('Add the sender’s full name for the private letter sign-off.');
		if (!variables.senderTitle) blockers.push('Add the sender’s title for the private letter sign-off.');
		if (!variables.callBookingUrl) blockers.push('Add a reply or scheduling link for the private letter.');
		const invalid = contacts.filter((contact) => (
			contact.relationshipBasis !== 'existing_substantive'
			|| contact.consent !== true
			|| contact.status !== 'active'
		));
		if (invalid.length) blockers.push(`${invalid.length} private-placement recipient(s) are not marked as a pre-existing substantive relationship with consent.`);
	} else {
		if (legalInput.noOffer !== true) blockers.push('Confirm that pre-launch copy is educational only and makes no offer, solicitation, reservation or money request.');
		if (LIVE_REG_CF_TEMPLATES.has(template.id)) {
			if (legalInput.qualifiedOffering !== true) blockers.push('Confirm the offering statement has been qualified by the SEC and the campaign is open.');
			if (legalInput.registeredIntermediary !== true) blockers.push('Confirm the offering is being conducted through a FINRA-registered intermediary.');
			if (config.regCfStatus !== 'qualified') blockers.push('REG_CF_OFFERING_STATUS must be set to qualified before a campaign-live or reminder letter can be sent.');
			if (!config.regCfIntermediary) blockers.push('REG_CF_INTERMEDIARY must name the registered intermediary.');
			if (!config.regCfOfferingUrl) blockers.push('REG_CF_OFFERING_URL must point to the intermediary’s qualified offering page.');
			if (!variables.campaignDeadline) blockers.push('Add the actual campaign deadline from the qualified offering.');
		}
		if (template.id === 'fundraising.regcf-closing') {
			if (legalInput.qualifiedOffering !== true) blockers.push('Confirm this closing notice relates to a qualified Regulation CF campaign.');
			if (config.regCfStatus !== 'closed') blockers.push('REG_CF_OFFERING_STATUS must be set to closed before the campaign-closed letter can be sent.');
		}
		const invalid = contacts.filter((contact) => contact.consent !== true || contact.status !== 'active');
		if (invalid.length) blockers.push(`${invalid.length} Regulation CF recipient(s) do not have active, documented consent.`);
	}

	if (contacts.length > MAX_RECIPIENTS) blockers.push(`This sender is limited to ${MAX_RECIPIENTS} recipients per campaign. Split the audience or contact the operator.`);

	if (!config.postalAddressConfigured) warnings.push('The footer will show the postal-address warning until COMPANY_POSTAL_ADDRESS is set.');
	if (config.regCfStatus === 'unknown') warnings.push('REG_CF_OFFERING_STATUS is set to an unrecognised value. Only prelaunch, qualified and closed are accepted.');

	return {
		ok: blockers.length === 0,
		blockers,
		warnings,
		config,
		invalid: contacts
			.filter((contact) => contact.status !== 'active' || contact.consent !== true)
			.map((contact) => ({ id: contact.id, email: contact.email, status: contact.status })),
	};
}

function signingSecret() {
	return String(
		process.env.INVESTOR_LETTERS_SECRET
		|| process.env.SUPABASE_SERVICE_ROLE_KEY
		|| process.env.SMTP_PASS
		|| 'tradingbible-investor-letters-local',
	);
}

function signToken(payload) {
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const sig = createHmac('sha256', signingSecret()).update(body).digest('base64url');
	return `${body}.${sig}`;
}

function verifyToken(token) {
	const raw = String(token || '');
	const [body, sig] = raw.split('.');
	if (!body || !sig) return null;
	const expected = createHmac('sha256', signingSecret()).update(body).digest('base64url');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		if (!payload || typeof payload !== 'object') return null;
		return payload;
	} catch {
		return null;
	}
}

export function unsubscribeUrl(contact) {
	const token = signToken({
		v: 1,
		track: contact.track,
		id: contact.id,
		email: normalizeEmail(contact.email),
	});
	return `${appUrl}/api/investor-letters/unsubscribe?token=${encodeURIComponent(token)}`;
}

function sampleUnsubscribeUrl(track, email = 'admin@tradingbible.app') {
	const token = signToken({ v: 1, track, id: 'test', email: normalizeEmail(email), test: true });
	return `${appUrl}/api/investor-letters/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function markSubscriptionUnsubscribed(contact) {
	if (contact.track !== 'reg_cf') return;
	try {
		if (contact.externalId) {
			await supabaseRest(`/rest/v1/tb_investor_subscriptions?id=eq.${encodeURIComponent(contact.externalId)}`, {
				method: 'PATCH',
				body: { status: 'unsubscribed', unsubscribed_at: nowIso() },
				query: { select: 'id' },
			});
			return;
		}
		await supabaseRest('/rest/v1/tb_investor_subscriptions', {
			method: 'PATCH',
			body: { status: 'unsubscribed', unsubscribed_at: nowIso() },
			query: { email: `eq.${normalizeEmail(contact.email)}`, select: 'id' },
		});
	} catch (err) {
		logger.warn('[investor-letters] local unsubscribe saved; subscriber table update failed', String(err?.message || err));
	}
}

function parseAddressLine(line) {
	const raw = String(line || '').trim();
	if (!raw) return null;
	const angle = raw.match(/^(.*?)\s*<([^>]+)>/);
	if (angle) {
		return { name: cleanText(angle[1].replace(/^["']|["']$/g, ''), 120), email: normalizeEmail(angle[2]) };
	}
	const parts = raw.split(/[\t,;|]/).map((part) => part.trim()).filter(Boolean);
	const emailPart = parts.find((part) => EMAIL_RE.test(part));
	if (!emailPart) return { name: '', email: normalizeEmail(raw) };
	const others = parts.filter((part) => part !== emailPart);
	return { name: cleanText(others[0] || '', 120), email: normalizeEmail(emailPart) };
}

function normalizeContactInput(body, track) {
	const email = normalizeEmail(body?.email);
	if (!EMAIL_RE.test(email)) {
		const err = new Error('Enter a valid email address.');
		err.status = 422;
		throw err;
	}
	if (track === 'private_506b') {
		if (body?.consent !== true) {
			const err = new Error('Confirm the lawful basis to email this private-placement contact.');
			err.status = 422;
			throw err;
		}
		if (!cleanText(body?.consentSource, 300)) {
			const err = new Error('Add the source of the relationship or consent for this contact.');
			err.status = 422;
			throw err;
		}
	}
	if (track === 'reg_cf') {
		if (body?.consent !== true) {
			const err = new Error('Regulation CF recipients must have documented consent to receive investor updates.');
			err.status = 422;
			throw err;
		}
		if (!cleanText(body?.consentSource, 300)) {
			const err = new Error('Add the consent source (subscription form, signed event list, or documented request).');
			err.status = 422;
			throw err;
		}
	}
	return {
		email,
		name: cleanText(body?.name, 120),
		consent: true,
		consentAt: dateOnly(body?.consentAt) || nowIso(),
		consentSource: cleanText(body?.consentSource, 300),
		source: cleanText(body?.source, 160) || 'admin-entry',
		relationshipBasis: track === 'private_506b' ? normalizeRelationship(body?.relationshipBasis) : 'not_applicable',
		eligibility: track === 'private_506b' ? normalizeEligibility(body?.eligibility) : 'not_applicable',
		notes: cleanMultiline(body?.notes, 1000),
	};
}

export async function getInvestorLettersOverview() {
	const store = await loadStore();
	const config = configSnapshot();
	const contacts = store.contacts
		.slice()
		.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
		.map(publicContact);
	const campaigns = store.campaigns
		.slice()
		.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
		.slice(0, 40)
		.map((campaign) => {
			const sends = store.sends.filter((send) => send.campaignId === campaign.id);
			return {
				...publicCampaign(campaign),
				recentSends: sends.slice(-8).map((send) => ({
					email: send.email,
					status: send.status,
					error: send.error || '',
					sentAt: send.sentAt || null,
				})),
			};
		});
	const tracks = INVESTOR_LETTER_TRACKS.map((track) => {
		const rows = contacts.filter((contact) => contact.track === track.id);
		return {
			...track,
			total: rows.length,
			active: rows.filter((row) => row.status === 'active').length,
			unsubscribed: rows.filter((row) => row.status === 'unsubscribed').length,
			suppressed: rows.filter((row) => row.status === 'suppressed').length,
			consented: rows.filter((row) => row.consent && row.status === 'active').length,
			templates: TRACK_TEMPLATES[track.id].map((id) => templateSummary(findCommunicationTemplate(id))).filter(Boolean),
		};
	});
	return {
		ok: true,
		config,
		tracks,
		contacts,
		campaigns,
		audit: store.audit.slice(-25).reverse(),
		counts: {
			contacts: contacts.length,
			active: contacts.filter((contact) => contact.status === 'active').length,
			campaigns: store.campaigns.length,
			lettersSent: store.sends.filter((send) => send.status === 'sent').length,
			lettersFailed: store.sends.filter((send) => send.status === 'failed').length,
		},
		policy: {
			private: 'Rule 506(b): no general solicitation. Use only with a pre-existing substantive relationship, a lawful basis to email, no offering terms, and counsel approval of the exact copy and audience.',
			regCf: 'Regulation CF: pre-launch education must make no offer. Campaign-live, reminder and closing emails require SEC qualification, a FINRA-registered intermediary, the qualified offering page and counsel approval of the exact copy.',
			unsubscribe: 'Every commercial email includes a signed unsubscribe link and the company postal address. Suppressed and unsubscribed contacts are never selected again.',
		},
	};
}

export async function createContact(body, actor = 'admin') {
	const track = normalizeTrack(body?.track);
	const input = normalizeContactInput(body, track);
	return withStore((store) => {
		const existing = store.contacts.find((contact) => contact.track === track && contact.email === input.email);
		if (existing) {
			const err = new Error('This email is already in the selected investor-letter list.');
			err.status = 409;
			throw err;
		}
		if (store.contacts.length >= MAX_CONTACTS) {
			const err = new Error('The controlled contact register is full.');
			err.status = 409;
			throw err;
		}
		const row = {
			id: randomUUID(),
			track,
			...input,
			status: 'active',
			createdBy: String(actor || 'admin').slice(0, 200),
			createdAt: nowIso(),
			updatedAt: nowIso(),
		};
		store.contacts.push(row);
		store.audit.push(auditEntry(actor, 'contact_added', row.id, `${track} · ${row.email}`));
		return publicContact(row);
	});
}

export async function importContacts(body, actor = 'admin') {
	const track = normalizeTrack(body?.track);
	const lines = String(body?.emails || '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 1000);
	if (!lines.length) {
		const err = new Error('Paste at least one email address or name-and-email line.');
		err.status = 422;
		throw err;
	}
	if (body?.consent !== true) {
		const err = new Error('Confirm that every imported contact has documented consent and a lawful basis to receive this communication.');
		err.status = 422;
		throw err;
	}
	const source = cleanText(body?.consentSource, 300);
	if (!source) {
		const err = new Error('Add the consent source for the imported list.');
		err.status = 422;
		throw err;
	}
	const relationshipBasis = track === 'private_506b' ? normalizeRelationship(body?.relationshipBasis) : 'not_applicable';
	const eligibility = track === 'private_506b' ? normalizeEligibility(body?.eligibility) : 'not_applicable';
	const parsed = [];
	const invalid = [];
	const seen = new Set();
	for (const line of lines) {
		const item = parseAddressLine(line);
		if (!item || !EMAIL_RE.test(item.email)) {
			invalid.push(line.slice(0, 160));
			continue;
		}
		if (seen.has(item.email)) continue;
		seen.add(item.email);
		parsed.push(item);
	}
	if (!parsed.length) {
		const err = new Error('No valid email addresses were found in the pasted list.');
		err.status = 422;
		throw err;
	}
	return withStore((store) => {
		const added = [];
		const duplicates = [];
		for (const item of parsed) {
			const existing = store.contacts.find((contact) => contact.track === track && contact.email === item.email);
			if (existing) {
				duplicates.push(item.email);
				continue;
			}
			const row = {
				id: randomUUID(),
				track,
				email: item.email,
				name: item.name,
				consent: true,
				consentAt: nowIso(),
				consentSource: source,
				source: cleanText(body?.source, 160) || 'admin-import',
				relationshipBasis,
				eligibility,
				notes: cleanMultiline(body?.notes, 1000),
				status: 'active',
				createdBy: String(actor || 'admin').slice(0, 200),
				createdAt: nowIso(),
				updatedAt: nowIso(),
			};
			store.contacts.push(row);
			added.push(publicContact(row));
		}
		store.audit.push(auditEntry(actor, 'contacts_imported', `track:${track}`, `${added.length} added; ${duplicates.length} duplicate; ${invalid.length} invalid`));
		return {
			added: added.length,
			duplicates: duplicates.length,
			invalid: invalid.length,
			invalidLines: invalid.slice(0, 20),
			contacts: added,
		};
	});
}

export async function updateContact(id, body, actor = 'admin') {
	return withStore((store) => {
		const row = store.contacts.find((contact) => contact.id === String(id || ''));
		if (!row) {
			const err = new Error('Investor-letter contact not found.');
			err.status = 404;
			throw err;
		}
		if (body?.status !== undefined) {
			const nextStatus = String(body.status || '').toLowerCase();
			if (!CONTACT_STATUSES.has(nextStatus)) {
				const err = new Error('Unknown contact status.');
				err.status = 422;
				throw err;
			}
			row.status = nextStatus;
			if (nextStatus === 'unsubscribed') row.unsubscribedAt = nowIso();
		}
		if (body?.name !== undefined) row.name = cleanText(body.name, 120);
		if (body?.notes !== undefined) row.notes = cleanMultiline(body.notes, 1000);
		if (body?.relationshipBasis !== undefined && row.track === 'private_506b') row.relationshipBasis = normalizeRelationship(body.relationshipBasis);
		if (body?.eligibility !== undefined && row.track === 'private_506b') row.eligibility = normalizeEligibility(body.eligibility);
		if (body?.consentSource !== undefined) row.consentSource = cleanText(body.consentSource, 300);
		row.updatedAt = nowIso();
		store.audit.push(auditEntry(actor, 'contact_updated', row.id, `${row.email} · ${row.status}`));
		return publicContact(row);
	});
}

export async function syncRegCfSubscribers(actor = 'admin') {
	let rows;
	try {
		rows = await supabaseRest('/rest/v1/tb_investor_subscriptions', {
			query: {
				select: 'id,email,name,status,consent_at,confirmed_at,source,created_at',
				status: 'eq.confirmed',
				order: 'created_at.desc',
				limit: 2000,
			},
		});
	} catch (err) {
		const error = new Error('Confirmed investor subscriptions are unavailable. The investor-subscription table may not be provisioned.');
		error.status = 503;
		error.detail = String(err?.message || err);
		throw error;
	}
	const list = Array.isArray(rows) ? rows : [];
	return withStore((store) => {
		let added = 0;
		let updated = 0;
		let skipped = 0;
		for (const subscription of list) {
			const email = normalizeEmail(subscription.email);
			if (!EMAIL_RE.test(email)) { skipped += 1; continue; }
			const existing = store.contacts.find((contact) => contact.track === 'reg_cf' && contact.email === email);
			if (existing) {
				if (existing.status === 'unsubscribed' || existing.status === 'suppressed') { skipped += 1; continue; }
				existing.name = existing.name || cleanText(subscription.name, 120);
				existing.externalId = subscription.id || existing.externalId;
				existing.consent = true;
				existing.consentAt = dateOnly(subscription.confirmed_at || subscription.consent_at) || existing.consentAt;
				existing.consentSource = existing.consentSource || `investor subscription (${cleanText(subscription.source, 80) || 'site'})`;
				existing.source = existing.source || 'tb_investor_subscriptions';
				existing.updatedAt = nowIso();
				updated += 1;
				continue;
			}
			store.contacts.push({
				id: randomUUID(),
				track: 'reg_cf',
				email,
				name: cleanText(subscription.name, 120),
				status: 'active',
				relationshipBasis: 'not_applicable',
				eligibility: 'not_applicable',
				consent: true,
				consentAt: dateOnly(subscription.confirmed_at || subscription.consent_at) || nowIso(),
				consentSource: `investor subscription (${cleanText(subscription.source, 80) || 'site'})`,
				source: 'tb_investor_subscriptions',
				externalId: subscription.id || null,
				notes: '',
				createdBy: String(actor || 'admin').slice(0, 200),
				createdAt: nowIso(),
				updatedAt: nowIso(),
			});
			added += 1;
		}
		store.audit.push(auditEntry(actor, 'regcf_subscribers_synced', 'reg_cf', `${added} added; ${updated} updated; ${skipped} skipped`));
		return { ok: true, added, updated, skipped, sourceCount: list.length };
	});
}

export async function previewLetter({ track, templateId, variables, colorScheme = 'auto' }) {
	const normalizedTrack = normalizeTrack(track);
	const template = requireTemplate(templateId, normalizedTrack);
	const vars = campaignVariables(variables, normalizedTrack, template.id);
	const rendered = renderCommunicationTemplate(template.id, {
		channel: 'email',
		variables: {
			...vars,
			unsubscribeUrl: sampleUnsubscribeUrl(normalizedTrack),
			offeringUrl: vars.offeringUrl || (normalizedTrack === 'reg_cf' ? configSnapshot().regCfOfferingUrl : ''),
		},
		baseUrl: appUrl,
		colorScheme,
		commercial: true,
	});
	return {
		rendered,
		template: templateSummary(template),
		config: configSnapshot(),
	};
}

function buildCampaign({ track, template, variables, legal, contacts, actor, name }) {
	const legalInput = legal && typeof legal === 'object' ? legal : {};
	const subject = renderCommunicationTemplate(template.id, {
		channel: 'email',
		variables: {
			...campaignVariables(variables, track, template.id),
			firstName: 'Alex',
			unsubscribeUrl: sampleUnsubscribeUrl(track),
			offeringUrl: configSnapshot().regCfOfferingUrl,
		},
		baseUrl: appUrl,
		commercial: true,
	}).subject;
	return {
		id: randomUUID(),
		number: campaignNumber(),
		name: cleanText(name, 160) || `${template.name} · ${today()}`,
		track,
		templateId: template.id,
		status: 'prepared',
		recipientCount: contacts.length,
		sentCount: 0,
		failedCount: 0,
		subject,
		variables: campaignVariables(variables, track, template.id),
		legal: {
			counselApproved: legalInput.counselApproved === true,
			counselName: cleanText(legalInput.counselName, 160),
			counselReference: cleanText(legalInput.counselReference, 240),
			counselApprovedAt: dateOnly(legalInput.counselApprovedAt),
			privateRelationship: legalInput.privateRelationship === true,
			noGeneralSolicitation: legalInput.noGeneralSolicitation === true,
			noOffer: legalInput.noOffer === true,
			qualifiedOffering: legalInput.qualifiedOffering === true,
			registeredIntermediary: legalInput.registeredIntermediary === true,
			notes: cleanMultiline(legalInput.notes, 1000),
			recordedAt: nowIso(),
			recordedBy: String(actor || 'admin').slice(0, 200),
		},
		recipientEmails: contacts.map((contact) => contact.email),
		createdBy: String(actor || 'admin').slice(0, 200),
		createdAt: nowIso(),
		startedAt: null,
		completedAt: null,
		error: '',
	};
}

export async function createCampaign(body, actor = 'admin') {
	const track = normalizeTrack(body?.track);
	const template = requireTemplate(body?.templateId, track);
	const variables = campaignVariables(body?.variables, track, template.id);
	const store = await loadStore();
	const selected = Array.isArray(body?.recipientIds) && body.recipientIds.length
		? store.contacts.filter((contact) => body.recipientIds.includes(contact.id) && contact.track === track)
		: store.contacts.filter((contact) => contact.track === track && contact.status === 'active' && contact.consent === true);
	const validContacts = selected.filter((contact) => contact.status === 'active' && contact.consent === true);
	const evaluation = evaluateCampaign({
		track,
		template,
		contacts: selected,
		variables,
		legal: body?.legal,
	});
	if (!evaluation.ok) {
		const err = new Error('The campaign is not ready to prepare. Resolve the blockers below.');
		err.status = 422;
		err.details = {
			blockers: evaluation.blockers,
			warnings: evaluation.warnings,
			invalid: evaluation.invalid,
			config: evaluation.config,
		};
		throw err;
	}
	const campaign = buildCampaign({
		track,
		template,
		variables,
		legal: body?.legal,
		contacts: validContacts,
		actor,
		name: body?.name,
	});
	return withStore((draft) => {
		draft.campaigns.push(campaign);
		draft.audit.push(auditEntry(actor, 'campaign_prepared', campaign.id, `${campaign.number} · ${campaign.track} · ${campaign.recipientCount} recipients`));
		return publicCampaign(campaign);
	});
}

function sendHeaders(contact) {
	const url = unsubscribeUrl(contact);
	return {
		'List-Unsubscribe': `<${url}>`,
		'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		'X-TradingBible-Campaign': 'investor-letter',
	};
}

function textWithFooter(text, contact) {
	return `${String(text || '').trim()}\n\n---\nTradingBible Holdings, Inc.\n${postalAddress}\nUnsubscribe from investor updates: ${unsubscribeUrl(contact)}\n`;
}

async function sendOne({ campaign, contact, actor, test = false, testEmail = '' }) {
	const template = requireTemplate(campaign.templateId, campaign.track);
	const variables = contactVars(contact, campaign.variables);
	variables.unsubscribeUrl = unsubscribeUrl(contact);
	if (campaign.track === 'reg_cf') {
		variables.legalEmail = legalEmail;
		variables.intermediaryName = configSnapshot().regCfIntermediary;
		variables.offeringUrl = configSnapshot().regCfOfferingUrl;
	}
	const rendered = renderCommunicationTemplate(template.id, {
		channel: 'email',
		variables,
		baseUrl: appUrl,
		commercial: true,
	});
	if (rendered.blockedReason) throw new Error(rendered.blockedReason);
	const to = test ? testEmail : contact.email;
	const subject = test ? `[TEST — ADMIN ONLY] ${rendered.subject}` : rendered.subject;
	const text = test
		? `${rendered.text}\n\n---\nADMIN TEST SEND\nCampaign: ${campaign.number}\nRecipient: ${to}\nThis message was not sent to an investor.`
		: textWithFooter(rendered.text, contact);
	const headers = test
		? {
			'List-Unsubscribe': `<${sampleUnsubscribeUrl(campaign.track, testEmail)}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
			'X-TradingBible-Campaign': 'investor-letter',
			'X-TradingBible-Test': 'true',
		}
		: sendHeaders(contact);
	const info = await smtp.sendMail({
		from: `"${fromName}" <${fromEmail}>`,
		envelope: { from: process.env.SMTP_USER || fromEmail, to },
		to,
		replyTo: legalEmail,
		subject,
		html: rendered.html,
		text,
		headers,
	});
	logger.info('[investor-letters] sent', {
		campaign: campaign.number,
		template: campaign.templateId,
		to,
		test,
		actor,
		messageId: info?.messageId || null,
	});
	return info;
}

export async function testCampaign(id, actor = 'admin') {
	const store = await loadStore();
	const campaign = store.campaigns.find((row) => row.id === String(id || ''));
	if (!campaign) {
		const err = new Error('Campaign not found.');
		err.status = 404;
		throw err;
	}
	if (!smtp) {
		const err = new Error('SMTP is not configured on the API server. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
		err.status = 503;
		throw err;
	}
	const contact = store.contacts.find((row) => row.track === campaign.track && row.status === 'active' && row.consent === true);
	if (!contact) {
		const err = new Error('No active contact is available for the test variables.');
		err.status = 422;
		throw err;
	}
	const info = await sendOne({ campaign, contact, actor, test: true, testEmail: actor });
	return { ok: true, sent: true, to: actor, subject: campaign.subject, messageId: info?.messageId || null };
}

async function runCampaign(campaignId, actor) {
	const store = await loadStore();
	const campaign = store.campaigns.find((row) => row.id === campaignId);
	if (!campaign) return;
	const contacts = store.contacts.filter((contact) => (
		campaign.recipientEmails?.includes(contact.email)
		&& contact.track === campaign.track
		&& contact.status === 'active'
		&& contact.consent === true
	));
	let sent = 0;
	let failed = 0;
	for (const contact of contacts) {
		try {
			const info = await sendOne({ campaign, contact, actor });
			await withStore((draft) => {
				const row = draft.contacts.find((item) => item.id === contact.id);
				if (row) {
					row.lastSentAt = nowIso();
					row.lastCampaignId = campaign.id;
					row.updatedAt = nowIso();
				}
				const current = draft.campaigns.find((item) => item.id === campaign.id);
				if (current) {
					current.sentCount = (current.sentCount || 0) + 1;
				}
				draft.sends.push({
					id: randomUUID(),
					campaignId: campaign.id,
					contactId: contact.id,
					email: contact.email,
					status: 'sent',
					providerMessageId: info?.messageId || '',
					error: '',
					sentAt: nowIso(),
				});
			});
			sent += 1;
		} catch (err) {
			failed += 1;
			logger.warn('[investor-letters] send failed', {
				campaign: campaign.number,
				to: contact.email,
				error: String(err?.message || err),
			});
			await withStore((draft) => {
				const current = draft.campaigns.find((item) => item.id === campaign.id);
				if (current) current.failedCount = (current.failedCount || 0) + 1;
				draft.sends.push({
					id: randomUUID(),
					campaignId: campaign.id,
					contactId: contact.id,
					email: contact.email,
					status: 'failed',
					providerMessageId: '',
					error: String(err?.message || err).slice(0, 500),
					sentAt: nowIso(),
				});
			});
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	await withStore((draft) => {
		const current = draft.campaigns.find((item) => item.id === campaign.id);
		if (!current) return;
		current.status = failed === 0 ? 'sent' : (sent > 0 ? 'partial' : 'failed');
		current.completedAt = nowIso();
		current.sentCount = sent;
		current.failedCount = failed;
		current.error = failed ? `${failed} recipient(s) failed. Review the send log.` : '';
		draft.audit.push(auditEntry(actor, 'campaign_completed', campaign.id, `${campaign.number} · ${sent} sent · ${failed} failed`));
	});
}

export async function startCampaign(id, actor = 'admin', confirmation = '') {
	if (String(confirmation || '').trim().toUpperCase() !== 'SEND') {
		const err = new Error('Type SEND to confirm this investor-letter campaign.');
		err.status = 422;
		throw err;
	}
	const store = await loadStore();
	const campaign = store.campaigns.find((row) => row.id === String(id || ''));
	if (!campaign) {
		const err = new Error('Campaign not found.');
		err.status = 404;
		throw err;
	}
	if (!['prepared', 'failed'].includes(campaign.status)) {
		const err = new Error(`This campaign is in status “${campaign.status}” and cannot be started again. Prepare a fresh campaign so the audience and send log are re-verified.`);
		err.status = 409;
		throw err;
	}
	const delivered = store.sends.filter((row) => row.campaignId === campaign.id && row.status === 'sent').length;
	if (delivered > 0) {
		const err = new Error('This campaign already delivered at least one letter. It cannot be retried. Prepare a fresh campaign for the remaining recipients.');
		err.status = 409;
		throw err;
	}
	if (!smtp) {
		const err = new Error('SMTP is not configured on the API server. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.');
		err.status = 503;
		throw err;
	}
	const template = requireTemplate(campaign.templateId, campaign.track);
	const contacts = store.contacts.filter((contact) => campaign.recipientEmails?.includes(contact.email));
	if (contacts.length !== campaign.recipientCount) {
		const err = new Error('The recipient register changed after this campaign was prepared. Prepare a fresh campaign so the audience and count are re-verified.');
		err.status = 409;
		throw err;
	}
	const evaluation = evaluateCampaign({
		track: campaign.track,
		template,
		contacts,
		variables: campaign.variables,
		legal: campaign.legal,
	});
	if (!evaluation.ok) {
		const err = new Error('The campaign no longer satisfies the send gate. Prepare a fresh campaign after resolving the blockers.');
		err.status = 409;
		err.details = { blockers: evaluation.blockers, warnings: evaluation.warnings, invalid: evaluation.invalid };
		throw err;
	}
	await withStore((draft) => {
		const current = draft.campaigns.find((item) => item.id === campaign.id);
		if (!current) return;
		current.status = 'sending';
		current.startedAt = nowIso();
		current.completedAt = null;
		current.error = '';
		current.sentCount = 0;
		current.failedCount = 0;
		draft.audit.push(auditEntry(actor, 'campaign_started', campaign.id, `${campaign.number} · ${campaign.recipientCount} recipients`));
	});
	setTimeout(() => {
		runCampaign(campaign.id, actor).catch((err) => {
			logger.error('[investor-letters] campaign runner failed', String(err?.message || err));
		});
	}, 20);
	return { ok: true, started: true, campaign: publicCampaign((await loadStore()).campaigns.find((row) => row.id === campaign.id)) };
}

export async function unsubscribeInvestor(token) {
	const payload = verifyToken(token);
	if (!payload || !payload.email) {
		return { ok: false, valid: false, message: 'This unsubscribe link is invalid or has expired.' };
	}
	const email = normalizeEmail(payload.email);
	return withStore((store) => {
		const byId = store.contacts.find((contact) => contact.id === payload.id && contact.email === email);
		const byEmail = store.contacts.find((contact) => contact.track === payload.track && contact.email === email);
		const contact = byId || byEmail;
		if (!contact) {
			// Do not reveal whether the address was ever on the list.
			return { ok: true, valid: true, changed: false, email };
		}
		if (contact.status !== 'unsubscribed') {
			contact.status = 'unsubscribed';
			contact.unsubscribedAt = nowIso();
			contact.updatedAt = nowIso();
			store.audit.push(auditEntry('public-unsubscribe', 'contact_unsubscribed', contact.id, contact.email));
		}
		return { ok: true, valid: true, changed: true, email, contact: publicContact(contact) };
	}).then(async (result) => {
		if (result.contact) await markSubscriptionUnsubscribed(result.contact);
		return result;
	});
}

export function contactsCsv(contacts) {
	const header = [
		'track', 'email', 'name', 'status', 'relationship_basis', 'eligibility',
		'consent', 'consent_at', 'consent_source', 'source', 'last_sent_at', 'notes',
	];
	const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
	const lines = [header.join(',')];
	for (const contact of contacts) {
		lines.push([
			contact.track,
			contact.email,
			contact.name,
			contact.status,
			contact.relationshipBasis,
			contact.eligibility,
			contact.consent ? 'yes' : 'no',
			contact.consentAt,
			contact.consentSource,
			contact.source,
			contact.lastSentAt,
			contact.notes,
		].map(escape).join(','));
	}
	return `${lines.join('\n')}\n`;
}

export async function getInvestorLetterContactsCsv() {
	const store = await loadStore();
	return contactsCsv(store.contacts.map(publicContact));
}

export function unsubscribePage(message, ok = true) {
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light dark"/><title>${ok ? 'Unsubscribed' : 'Unsubscribe link'} — TradingBible</title>
<style>
:root{color-scheme:light dark}body{margin:0;background:#f4f1e8;color:#1b1b1b;font-family:Inter,Arial,sans-serif}
.card{max-width:560px;margin:12vh auto;background:#fffdf8;border:1px solid #ded3b8;border-radius:12px;padding:32px;box-shadow:0 20px 60px rgba(20,20,20,.08)}
.brand{font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a6a15;font-size:12px}
h1{font-family:Georgia,serif;font-size:26px;margin:14px 0 10px}p{line-height:1.65;color:#3f4652;font-size:15px}
a{color:#8a6a15}small{display:block;margin-top:24px;color:#6b7280;font-size:12px;line-height:1.6}
@media(prefers-color-scheme:dark){body{background:#080808;color:#f5edd8}.card{background:#12110d;border-color:#3b3424}h1{color:#f5edd8}p{color:#d6d0c2}small{color:#a8a08d}}
</style></head><body><div class="card"><div class="brand">TradingBible</div><h1>${ok ? 'You are unsubscribed' : 'Unsubscribe link'}</h1><p>${message}</p><p><a href="https://tradingbible.app/investor-relations">Investor relations</a></p><small>TradingBible Holdings, Inc. · This page does not change any shareholder record, subscription, investment or account.</small></div></body></html>`;
}

export { STORE_PATH, MAX_RECIPIENTS };
