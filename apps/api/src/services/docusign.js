import { createHmac, createSign, timingSafeEqual } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { tbcDocumentRoot } from '../data/tbc-documents.js';

// DocuSign eSignature REST integration.
//
// The integration is opt-in. Nothing is sent and no status becomes executable
// unless every DOCUSIGN_* credential below is present on the API server.
// Recipient tabs are anchored to the signer's unique execution block in the
// controlled PDF, so one signer can never sign another party's capacity.

const AUTH_SERVER = String(process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
const BASE_URL = String(process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi').replace(/\/$/, '');
const API_VERSION = 'v2.1';

let tokenCache = { value: '', expiresAt: 0 };

export function docusignConfig() {
	const missing = [];
	if (!process.env.DOCUSIGN_INTEGRATION_KEY) missing.push('DOCUSIGN_INTEGRATION_KEY');
	if (!process.env.DOCUSIGN_USER_ID) missing.push('DOCUSIGN_USER_ID');
	if (!process.env.DOCUSIGN_ACCOUNT_ID) missing.push('DOCUSIGN_ACCOUNT_ID');
	if (!process.env.DOCUSIGN_PRIVATE_KEY) missing.push('DOCUSIGN_PRIVATE_KEY');
	if (!process.env.DOCUSIGN_CONNECT_HMAC_KEY) missing.push('DOCUSIGN_CONNECT_HMAC_KEY');
	return {
		configured: missing.length === 0,
		missing,
		environment: /demo/i.test(AUTH_SERVER) || /demo/i.test(BASE_URL) ? 'demo' : 'production',
		sendOnCreate: String(process.env.DOCUSIGN_SEND_ON_CREATE || 'true').toLowerCase() !== 'false',
	};
}

function base64url(input) {
	return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function privateKeyPem() {
	let key = String(process.env.DOCUSIGN_PRIVATE_KEY || '').trim();
	if (!key) throw new Error('DOCUSIGN_PRIVATE_KEY is not configured');
	if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
	if (!key.includes('BEGIN')) {
		try { key = Buffer.from(key, 'base64').toString('utf8'); } catch { /* fall through */ }
	}
	if (!key.includes('BEGIN')) throw new Error('DOCUSIGN_PRIVATE_KEY must be a PEM or base64-encoded PEM private key');
	return key;
}

async function accessToken() {
	if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.value;
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT' };
	const payload = {
		iss: process.env.DOCUSIGN_INTEGRATION_KEY,
		sub: process.env.DOCUSIGN_USER_ID,
		aud: AUTH_SERVER,
		iat: now,
		exp: now + 3600,
		scope: 'signature impersonation',
	};
	const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
	const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKeyPem(), 'base64')
		.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
	const assertion = `${unsigned}.${signature}`;

	const res = await fetch(`https://${AUTH_SERVER}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.access_token) {
		const reason = data?.error_description || data?.error || `HTTP ${res.status}`;
		throw new Error(`DocuSign authorization failed: ${reason}`);
	}
	tokenCache = {
		value: data.access_token,
		expiresAt: Date.now() + Math.max(600, Number(data.expires_in) || 3600) * 1000,
	};
	return tokenCache.value;
}

async function dsFetch(pathname, options = {}) {
	const token = await accessToken();
	const res = await fetch(`${BASE_URL}/${API_VERSION}/accounts/${encodeURIComponent(process.env.DOCUSIGN_ACCOUNT_ID)}${pathname}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...(options.headers || {}),
		},
	});
	const text = await res.text();
	let data = {};
	try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
	if (!res.ok) {
		const reason = data?.message || data?.errorCode || `HTTP ${res.status}`;
		const err = new Error(`DocuSign request failed: ${reason}`);
		err.status = res.status >= 500 ? 502 : 400;
		err.details = data;
		throw err;
	}
	return data;
}

function anchorTabsFor(signer) {
	// Use the longest unique, single-line portion of the signer's execution
	// label. Full labels wrap in the PDF; a wrapped anchorString would either
	// fail or place every tab in the wrong block.
	const anchor = String(signer.anchor || signer.label || '').trim();
	if (!anchor) throw new Error(`Signer ${signer.id} has no execution-block anchor`);
	const offsets = signer.tabOffsetsPx || {};
	const y = {
		signature: Number.isFinite(Number(offsets.signature)) ? Number(offsets.signature) : 15,
		printedName: Number.isFinite(Number(offsets.printedName)) ? Number(offsets.printedName) : 46,
		title: Number.isFinite(Number(offsets.title)) ? Number(offsets.title) : 76,
		date: Number.isFinite(Number(offsets.date)) ? Number(offsets.date) : 106,
	};
	const base = {
		anchorString: anchor,
		anchorUnits: 'pixels',
		anchorXOffset: '-2',
		anchorMatchWholeWord: 'false',
		anchorCaseSensitive: 'false',
		anchorIgnoreIfNotPresent: 'false',
		documentId: '1',
		recipientId: String(signer.recipientId),
	};
	return {
		signHereTabs: [{
			...base,
			anchorYOffset: String(y.signature),
			tabLabel: `${signer.party} — signature`,
			width: '180',
			height: '24',
		}],
		textTabs: [
			{
				...base,
				anchorYOffset: String(y.printedName),
				tabLabel: 'Printed name',
				width: '210',
				height: '18',
				required: 'true',
			},
			{
				...base,
				anchorYOffset: String(y.title),
				tabLabel: 'Title / firm / capacity',
				width: '240',
				height: '18',
				required: 'true',
			},
		],
		dateSignedTabs: [{
			...base,
			anchorYOffset: String(y.date),
			tabLabel: 'Date signed',
			width: '120',
			height: '18',
		}],
	};
}

function fieldTabsFor(signer, recipientId) {
	// Public summaries carry a two-column execution block. Each tab is
	// anchored to a unique line in that signer's own block, so one party can
	// never acquire a field that belongs to the other. The offsets are
	// measured in PDF pixels from the start of the anchor line.
	const fields = signer.fieldAnchors || {};
	const baseFor = (field) => {
		const spec = fields[field] || {};
		return {
			anchorString: String(spec.anchor || signer.anchor || signer.label || '').trim(),
			anchorUnits: 'pixels',
			anchorXOffset: String(spec.xOffset ?? '-2'),
			anchorYOffset: String(spec.yOffset ?? '0'),
			anchorMatchWholeWord: 'false',
			anchorCaseSensitive: 'false',
			anchorIgnoreIfNotPresent: 'false',
			documentId: '1',
			recipientId: String(recipientId),
		};
	};
	const dims = (field, fallbackWidth, fallbackHeight) => ({
		width: String(fields[field]?.width || fallbackWidth),
		height: String(fields[field]?.height || fallbackHeight),
	});
	return {
		signHereTabs: [{
			...baseFor('signature'),
			tabLabel: `${signer.party} — signature`,
			...dims('signature', 180, 24),
		}],
		textTabs: [
			{
				...baseFor('printedName'),
				tabLabel: 'Printed name',
				...dims('printedName', 210, 18),
				required: 'true',
			},
			{
				...baseFor('title'),
				tabLabel: 'Title / firm / capacity',
				...dims('title', 240, 18),
				required: 'true',
			},
		],
		dateSignedTabs: [{
			...baseFor('date'),
			tabLabel: 'Date signed',
			...dims('date', 120, 18),
		}],
	};
}

export async function createEnvelope({ doc, recipients, sendNow = docusignConfig().sendOnCreate }) {
	const config = docusignConfig();
	if (!config.configured) {
		const err = new Error(`DocuSign is not configured: ${config.missing.join(', ')}`);
		err.status = 503;
		err.missing = config.missing;
		throw err;
	}
	if (!recipients?.length) {
		const err = new Error('No selected signers with a name and email address.');
		err.status = 422;
		throw err;
	}
	const pdfPath = path.join(tbcDocumentRoot, doc.pdf);
	const pdf = await readFile(pdfPath);

	const signers = recipients.map((recipient, index) => {
		const recipientId = String(index + 1);
		return {
			recipientId,
			email: recipient.email,
			name: recipient.name,
			routingOrder: String(recipient.routingOrder || index + 1),
			roleName: recipient.capacity || recipient.party || 'Signer',
			tabs: recipient.fieldAnchors ? fieldTabsFor(recipient, recipientId) : anchorTabsFor({ ...recipient, recipientId }),
		};
	});
	const subject = `TradingBible · ${doc.number} ${doc.title} — signature required`;
	const body = {
		emailSubject: subject,
		emailBlurb: [
			'You are receiving a controlled TradingBible LLC instrument for signature.',
			'Open the envelope and complete only the fields assigned to your capacity.',
			'Do not sign a field allocated to another party.',
			'A completed signature is not by itself a regulatory approval, license or clearance.',
		].join(' '),
		documents: [{
			documentId: '1',
			name: `${doc.number} — ${doc.title}.pdf`,
			fileExtension: 'pdf',
			documentBase64: pdf.toString('base64'),
		}],
		recipients: { signers },
		status: sendNow ? 'sent' : 'created',
	};
	const created = await dsFetch('/envelopes', {
		method: 'POST',
		body: JSON.stringify(body),
	});
	logger.info('DocuSign envelope prepared', { slug: doc.slug, envelopeId: created.envelopeId, status: created.status });
	return {
		envelopeId: created.envelopeId,
		status: String(created.status || body.status).toLowerCase(),
		uri: created.uri || '',
		recipients: signers.map((signer) => ({
			id: recipients[Number(signer.recipientId) - 1]?.id,
			recipientId: signer.recipientId,
			status: created.status === 'sent' ? 'sent' : 'created',
		})),
		subject,
	};
}

export async function sendEnvelope(envelopeId) {
	const result = await dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}`, {
		method: 'PUT',
		body: JSON.stringify({ status: 'sent' }),
	});
	logger.info('DocuSign envelope sent', { envelopeId });
	return { status: String(result?.status || 'sent').toLowerCase() };
}

export async function getEnvelopeStatus(envelopeId) {
	const [summary, recipientData] = await Promise.all([
		dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}`),
		dsFetch(`/envelopes/${encodeURIComponent(envelopeId)}/recipients`).catch(() => null),
	]);
	const signers = recipientData?.signers || [];
	return {
		status: String(summary?.status || '').toLowerCase(),
		completedAt: summary?.completedDateTime || null,
		recipients: signers.map((signer) => ({
			recipientId: String(signer.recipientId || ''),
			email: signer.email || '',
			name: signer.name || '',
			status: String(signer.status || '').toLowerCase(),
		})),
	};
}

export function verifyConnectSignature(rawBody, signatureHeader) {
	const key = String(process.env.DOCUSIGN_CONNECT_HMAC_KEY || '');
	if (!key || !signatureHeader) return false;
	const expected = createHmac('sha256', key).update(rawBody).digest('base64');
	const provided = String(signatureHeader).trim();
	const a = Buffer.from(expected);
	const b = Buffer.from(provided);
	return a.length === b.length && timingSafeEqual(a, b);
}
