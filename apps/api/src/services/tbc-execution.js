import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { findTbcDocument, tbcDocuments, tbcDocumentRoot } from '../data/tbc-documents.js';
import { writeExecutedDocx } from './tbc-executed-docx.js';
import { supabaseConfigured, supabaseRest } from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';

// Durable execution register. Production uses Supabase (service-role only);
// the JSON register remains as a local-development / outage fallback.
//
// The current-state row lives in public.tbc_execution_records and every new
// workflow event is appended to public.tbc_execution_events. The event table
// is append-only and keeps a SHA-256 chain over each document's event stream.
const STORE_DIR = path.join(tbcDocumentRoot, '.execution');
const STORE_FILE = path.join(STORE_DIR, 'register.json');
const VERSION = 1;

let writeQueue = Promise.resolve();

const APPROVAL_STATES = new Set(['approved', 'cleared', 'licensed', 'live']);
const TERMINAL_FAILURES = new Set(['declined', 'voided']);

function emptyRegister() {
	return { version: VERSION, updatedAt: null, documents: {} };
}

function readRegisterFile() {
	return readFile(STORE_FILE, 'utf8')
		.then((raw) => {
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object') return emptyRegister();
			return {
				version: VERSION,
				updatedAt: parsed.updatedAt || null,
				documents: parsed.documents && typeof parsed.documents === 'object' ? parsed.documents : {},
			};
		})
		.catch((err) => {
			if (err?.code === 'ENOENT') return emptyRegister();
			throw err;
		});
}

async function writeRegisterFile(register) {
	await mkdir(STORE_DIR, { recursive: true });
	const next = { ...register, version: VERSION, updatedAt: new Date().toISOString() };
	const tmp = `${STORE_FILE}.${process.pid}.${randomBytes(5).toString('hex')}.tmp`;
	await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
	await rename(tmp, STORE_FILE);
	return next;
}

function executionFromRow(row) {
	const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
	return {
		...payload,
		provider: row.provider || payload.provider || 'docusign',
		envelopeId: row.envelope_id || payload.envelopeId || '',
		providerStatus: row.provider_status || payload.providerStatus || '',
		approvalStatus: row.approval_status || payload.approvalStatus || 'not_requested',
		approvalNote: row.approval_note || payload.approvalNote || '',
		approvalBy: row.approval_by || payload.approvalBy || '',
		approvalAt: row.approval_at || payload.approvalAt || null,
		completedAt: row.completed_at || payload.completedAt || null,
		lastSyncedAt: row.last_synced_at || payload.lastSyncedAt || null,
		createdAt: payload.createdAt || row.created_at || null,
		recipients: Array.isArray(payload.recipients) ? payload.recipients : [],
		events: Array.isArray(payload.events) ? payload.events : [],
	};
}

function rowFromExecution(slug, execution) {
	const doc = findTbcDocument(slug);
	return {
		slug,
		document_number: doc?.number || execution.number || slug,
		visibility: doc?.visibility || execution.visibility || 'internal',
		envelope_id: execution.envelopeId || null,
		provider: execution.provider || 'docusign',
		provider_status: execution.providerStatus || null,
		approval_status: execution.approvalStatus || 'not_requested',
		approval_note: execution.approvalNote || null,
		approval_by: execution.approvalBy || null,
		approval_at: execution.approvalAt || null,
		completed_at: execution.completedAt || null,
		last_synced_at: execution.lastSyncedAt || null,
		payload: execution,
		updated_at: new Date().toISOString(),
	};
}

function useDatabase() {
	return supabaseConfigured();
}

async function readRegister() {
	if (!useDatabase()) return readRegisterFile();
	const rows = await supabaseRest('/rest/v1/tbc_execution_records', {
		query: { select: '*', order: 'updated_at.asc', limit: 1000 },
	});
	const documents = {};
	let updatedAt = null;
	for (const row of Array.isArray(rows) ? rows : []) {
		if (!row?.slug) continue;
		documents[row.slug] = executionFromRow(row);
		if (row.updated_at && (!updatedAt || row.updated_at > updatedAt)) updatedAt = row.updated_at;
	}
	return { version: VERSION, updatedAt, documents };
}

async function writeRegister(register) {
	if (!useDatabase()) return writeRegisterFile(register);
	const docs = Object.entries(register.documents || {});
	if (!docs.length) return { ...register, version: VERSION, updatedAt: new Date().toISOString() };
	const rows = docs.map(([slug, execution]) => rowFromExecution(slug, execution));
	await supabaseRest('/rest/v1/tbc_execution_records', {
		method: 'POST',
		body: rows,
		prefer: 'resolution=merge-duplicates,return=representation',
		query: { on_conflict: 'slug' },
	});
	return { ...register, version: VERSION, updatedAt: new Date().toISOString() };
}

async function mutate(fn) {
	const task = writeQueue.then(async () => {
		const register = await readRegister();
		const result = await fn(register);
		const saved = await writeRegister(register);
		return { register: saved, result };
	});
	writeQueue = task.catch(() => {});
	return task;
}

function eventHash({ slug, seq, event, prevHash, createdAt }) {
	return createHash('sha256')
		.update(JSON.stringify({
			slug,
			seq,
			eventType: event.type,
			actor: event.actor || null,
			detail: event.detail || null,
			payload: event.payload || {},
			prevHash: prevHash || null,
			createdAt,
		}))
		.digest('hex');
}

async function persistEvent(slug, event) {
	if (!useDatabase() || !event?.type) return;
	try {
		const rows = await supabaseRest('/rest/v1/tbc_execution_events', {
			query: { select: 'seq,event_type,created_at,hash', slug: `eq.${slug}`, order: 'seq.desc', limit: 20 },
		});
		const recent = Array.isArray(rows) ? rows : [];
		const eventAt = Date.parse(event.at || '');
		const duplicate = recent.some((row) => {
			if (row.event_type !== event.type) return false;
			const rowAt = Date.parse(row.created_at || '');
			return Number.isFinite(eventAt) && Number.isFinite(rowAt) && Math.abs(rowAt - eventAt) < 1000;
		});
		if (duplicate) return;
		const previous = recent[0] || null;
		const seq = (Number(previous?.seq) || 0) + 1;
		const createdAt = event.at || new Date().toISOString();
		const hash = eventHash({ slug, seq, event, prevHash: previous?.hash || null, createdAt });
		await supabaseRest('/rest/v1/tbc_execution_events', {
			method: 'POST',
			body: {
				slug,
				seq,
				event_type: event.type,
				actor: event.actor || null,
				detail: event.detail || null,
				payload: event.payload || {},
				prev_hash: previous?.hash || null,
				hash,
				created_at: createdAt,
			},
			prefer: 'return=minimal',
		});
	} catch (err) {
		// The current-state row is authoritative for the admin UI. An evidence
		// append failure is logged and must not roll back a signature workflow.
		logger.error('[tbc] execution event append failed', slug, String(err?.message || err));
	}
}

function defaultSignersFor(doc) {
	return (doc?.signers || []).map((signer) => ({
		id: signer.id,
		required: Boolean(signer.required),
		selected: Boolean(signer.required),
		name: '',
		email: '',
	}));
}

function normalizeRecipientRecord(doc, execution) {
	const stored = new Map(
		(Array.isArray(execution?.recipients) ? execution.recipients : [])
			.map((recipient) => [String(recipient.id || ''), recipient]),
	);
	return (doc?.signers || []).map((signer) => {
		const record = stored.get(signer.id) || {};
		return {
			id: signer.id,
			label: signer.label,
			anchor: signer.anchor || signer.label,
			tabOffsetsPx: signer.tabOffsetsPx || null,
			fieldAnchors: signer.fieldAnchors || null,
			party: signer.party,
			capacity: signer.capacity,
			required: Boolean(signer.required),
			selected: record.selected === undefined ? Boolean(signer.required) : Boolean(record.selected),
			name: String(record.name || ''),
			email: String(record.email || ''),
			routingOrder: Number(record.routingOrder) > 0 ? Number(record.routingOrder) : Number(signer.id.replace(/\D/g, '')) || 1,
			status: String(record.status || ''),
			recipientId: record.recipientId ? String(record.recipientId) : '',
		};
	});
}

export function displayStateFor(execution = {}) {
	if (APPROVAL_STATES.has(execution.approvalStatus)) return execution.approvalStatus;
	const provider = String(execution.providerStatus || '').toLowerCase();
	if (provider === 'completed' || execution.completedAt) return 'executed';
	if (provider === 'declined') return 'declined';
	if (provider === 'voided') return 'voided';
	if (provider === 'delivered') return 'delivered';
	if (provider === 'sent') return 'awaiting_signatures';
	if (execution.envelopeId) return 'prepared';
	return 'not_prepared';
}

export function displayLabelFor(state) {
	return {
		not_prepared: 'Not prepared',
		prepared: 'Prepared · draft',
		awaiting_signatures: 'Awaiting signatures',
		delivered: 'Viewed · awaiting signature',
		executed: 'Executed · approval pending',
		declined: 'Declined',
		voided: 'Voided',
		approved: 'Approved',
		cleared: 'Cleared',
		licensed: 'Licensed',
		live: 'Live',
	}[state] || 'Not prepared';
}

export function summarizeExecution(doc, execution = {}) {
	const recipients = normalizeRecipientRecord(doc, execution);
	const state = displayStateFor(execution);
	const signed = recipients.filter((recipient) => String(recipient.status).toLowerCase() === 'completed').length;
	const selected = recipients.filter((recipient) => recipient.selected).length;
	const missingEmails = recipients.filter((recipient) => recipient.selected && (!recipient.email || !recipient.name));
	return {
		slug: doc.slug,
		number: doc.number,
		visibility: doc.visibility || 'internal',
		state,
		title: doc.title,
		category: doc.category,
		status: state,
		label: displayLabelFor(state),
		provider: execution.provider || 'docusign',
		providerStatus: execution.providerStatus || '',
		envelopeId: execution.envelopeId || '',
		createdAt: execution.createdAt || null,
		sentAt: execution.sentAt || null,
		completedAt: execution.completedAt || null,
		lastSyncedAt: execution.lastSyncedAt || null,
		approvalStatus: execution.approvalStatus || 'not_requested',
		approvalNote: execution.approvalNote || '',
		approvalBy: execution.approvalBy || '',
		approvalAt: execution.approvalAt || null,
		recipients,
		selected,
		signed,
		missingEmails: missingEmails.map((recipient) => recipient.id),
		events: Array.isArray(execution.events) ? execution.events.slice(-20) : [],
	};
}

export async function listExecutions() {
	const register = await readRegister();
	return tbcDocuments.map((doc) => summarizeExecution(doc, register.documents[doc.slug] || {}));
}

export async function getExecution(slug) {
	const doc = findTbcDocument(slug);
	if (!doc) return null;
	const register = await readRegister();
	return summarizeExecution(doc, register.documents[slug] || {});
}

// Public-safe projection: no emails, no internal notes, no envelope identifiers.
export function publicExecutionSummary(execution) {
	if (!execution) return null;
	const signed = ['executed', 'approved', 'cleared', 'licensed', 'live'].includes(execution.state);
	return {
		state: execution.state,
		label: execution.label,
		signed,
		completedAt: execution.completedAt || null,
		lastSyncedAt: execution.lastSyncedAt || null,
		signers: (execution.recipients || []).map((recipient) => ({
			party: recipient.party || recipient.label,
			capacity: recipient.capacity || '',
			status: recipient.status || '',
		})),
	};
}

export async function getPublicExecution(slug) {
	const execution = await getExecution(slug);
	return publicExecutionSummary(execution);
}

export async function saveRecipients(slug, recipients) {
	const doc = findTbcDocument(slug);
	if (!doc) {
		const err = new Error('Document not found');
		err.status = 404;
		throw err;
	}
	const allowed = new Map((doc.signers || []).map((signer) => [String(signer.id), signer]));
	const cleaned = (Array.isArray(recipients) ? recipients : [])
		.filter((recipient) => allowed.has(String(recipient?.id || '')))
		.map((recipient) => ({
			id: String(recipient.id),
			selected: Boolean(recipient.selected),
			name: String(recipient.name || '').trim().slice(0, 160),
			email: String(recipient.email || '').trim().toLowerCase().slice(0, 254),
			routingOrder: Math.max(1, Math.min(99, Number(recipient.routingOrder) || 1)),
		}));

	let appendedEvent = null;
	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const previous = new Map((existing.recipients || []).map((recipient) => [recipient.id, recipient]));
		const merged = defaultSignersFor(doc).map((fallback) => {
			const next = cleaned.find((recipient) => recipient.id === fallback.id);
			const current = previous.get(fallback.id) || {};
			return next ? { ...current, ...next } : { ...current, ...fallback };
		});
		appendedEvent = { at: new Date().toISOString(), type: 'workflow.saved', detail: `${merged.filter((r) => r.selected).length} signer(s) selected` };
		register.documents[slug] = {
			...existing,
			recipients: merged,
			updatedAt: new Date().toISOString(),
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				appendedEvent,
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
	await persistEvent(slug, appendedEvent);
	return result;
}

export async function markEnvelopeCreated(slug, { envelopeId, providerStatus, recipients, subject }) {
	const doc = findTbcDocument(slug);
	if (!doc) {
		const err = new Error('Document not found');
		err.status = 404;
		throw err;
	}
	let appendedEvent = null;
	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const now = new Date().toISOString();
		appendedEvent = { at: now, type: 'docusign.envelope.created', detail: `Envelope ${envelopeId} · ${providerStatus}` };
		register.documents[slug] = {
			...existing,
			provider: 'docusign',
			envelopeId,
			providerStatus,
			subject: String(subject || '').slice(0, 300),
			createdAt: existing.createdAt || now,
			sentAt: providerStatus === 'sent' ? now : existing.sentAt || null,
			lastSyncedAt: now,
			recipients: (existing.recipients || []).map((recipient) => {
				const sent = recipients.find((item) => item.id === recipient.id);
				return sent ? { ...recipient, recipientId: sent.recipientId, status: sent.status || 'sent' } : recipient;
			}),
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				appendedEvent,
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
	await persistEvent(slug, appendedEvent);
	return result;
}

export async function updateProviderStatus(slug, { providerStatus, recipients, completedAt, eventType = 'docusign.sync', detail = '' }) {
	const doc = findTbcDocument(slug);
	if (!doc) return null;
	let appendedEvent = null;
	let result;
	({ result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const now = new Date().toISOString();
		const status = String(providerStatus || existing.providerStatus || '').toLowerCase();
		appendedEvent = { at: now, type: eventType, detail: detail || `Provider status: ${status || 'unknown'}` };
		register.documents[slug] = {
			...existing,
			provider: 'docusign',
			providerStatus: status,
			completedAt: status === 'completed' ? (completedAt || existing.completedAt || now) : existing.completedAt || null,
			lastSyncedAt: now,
			recipients: (existing.recipients || []).map((recipient) => {
				const next = (recipients || []).find((item) => item.id === recipient.id || item.recipientId === recipient.recipientId);
				return next ? { ...recipient, status: String(next.status || recipient.status || '').toLowerCase() } : recipient;
			}),
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				appendedEvent,
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	}));
	await persistEvent(slug, appendedEvent);
	if (result?.state === 'executed') {
		try {
			await writeExecutedDocx(doc, result);
		} catch (err) {
			// The DocuSign status is still authoritative; a failed local render
			// must not roll back the envelope state. The route can retry later.
			console.error('[tbc] executed DOCX render failed', doc.slug, String(err));
		}
	}
	return result;
}

export async function recordApproval(slug, { status, note, actor }) {
	const normalized = String(status || '').toLowerCase();
	if (!APPROVAL_STATES.has(normalized) && normalized !== 'not_requested') {
		const err = new Error('Unknown approval state');
		err.status = 422;
		throw err;
	}
	const doc = findTbcDocument(slug);
	if (!doc) {
		const err = new Error('Document not found');
		err.status = 404;
		throw err;
	}
	let appendedEvent = null;
	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		if (normalized !== 'not_requested' && displayStateFor(existing) !== 'executed' && !APPROVAL_STATES.has(existing.approvalStatus)) {
			const err = new Error('DocuSign execution must be complete before an approval can be recorded.');
			err.status = 409;
			throw err;
		}
		const now = new Date().toISOString();
		appendedEvent = { at: now, type: 'approval.recorded', detail: `${normalized}${note ? ` · ${String(note).slice(0, 180)}` : ''}` };
		register.documents[slug] = {
			...existing,
			approvalStatus: normalized,
			approvalNote: String(note || '').trim().slice(0, 2000),
			approvalBy: String(actor || '').slice(0, 200),
			approvalAt: normalized === 'not_requested' ? null : now,
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				appendedEvent,
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
	await persistEvent(slug, appendedEvent);
	return result;
}

export async function findByEnvelopeId(envelopeId) {
	const register = await readRegister();
	const entry = Object.entries(register.documents).find(([, execution]) => execution?.envelopeId === envelopeId);
	if (!entry) return null;
	const [slug] = entry;
	const doc = findTbcDocument(slug);
	if (!doc) return null;
	return { slug, doc, execution: summarizeExecution(doc, entry[1]) };
}

export function isFailureState(value) {
	return TERMINAL_FAILURES.has(String(value || '').toLowerCase());
}
