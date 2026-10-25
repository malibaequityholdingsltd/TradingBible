import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { findTbcDocument, tbcDocuments, tbcDocumentRoot } from '../data/tbc-documents.js';
import { writeExecutedDocx } from './tbc-executed-docx.js';

// Durable execution register for the controlled legal instruments.
//
// It lives beside the source documents, outside the web bundle and outside
// git. A JSON file is deliberate: the API runs as one process and the record
// is small. It is NOT a substitute for an append-only, multi-party evidence
// store; replace this adapter before production execution.

const STORE_DIR = path.join(tbcDocumentRoot, '.execution');
const STORE_FILE = path.join(STORE_DIR, 'register.json');
const VERSION = 1;

let writeQueue = Promise.resolve();

const APPROVAL_STATES = new Set(['approved', 'cleared', 'licensed', 'live']);
const TERMINAL_FAILURES = new Set(['declined', 'voided']);

function emptyRegister() {
	return { version: VERSION, updatedAt: null, documents: {} };
}

async function readRegister() {
	try {
		const raw = await readFile(STORE_FILE, 'utf8');
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return emptyRegister();
		return {
			version: VERSION,
			updatedAt: parsed.updatedAt || null,
			documents: parsed.documents && typeof parsed.documents === 'object' ? parsed.documents : {},
		};
	} catch (err) {
		if (err?.code === 'ENOENT') return emptyRegister();
		throw err;
	}
}

async function writeRegister(register) {
	await mkdir(STORE_DIR, { recursive: true });
	const next = { ...register, version: VERSION, updatedAt: new Date().toISOString() };
	const tmp = `${STORE_FILE}.${process.pid}.${randomBytes(5).toString('hex')}.tmp`;
	await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
	await rename(tmp, STORE_FILE);
	return next;
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

	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const previous = new Map((existing.recipients || []).map((recipient) => [recipient.id, recipient]));
		const merged = defaultSignersFor(doc).map((fallback) => {
			const next = cleaned.find((recipient) => recipient.id === fallback.id);
			const current = previous.get(fallback.id) || {};
			return next ? { ...current, ...next } : { ...current, ...fallback };
		});
		register.documents[slug] = {
			...existing,
			recipients: merged,
			updatedAt: new Date().toISOString(),
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				{ at: new Date().toISOString(), type: 'workflow.saved', detail: `${merged.filter((r) => r.selected).length} signer(s) selected` },
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
	return result;
}

export async function markEnvelopeCreated(slug, { envelopeId, providerStatus, recipients, subject }) {
	const doc = findTbcDocument(slug);
	if (!doc) {
		const err = new Error('Document not found');
		err.status = 404;
		throw err;
	}
	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const now = new Date().toISOString();
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
				{ at: now, type: 'docusign.envelope.created', detail: `Envelope ${envelopeId} · ${providerStatus}` },
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
	return result;
}

export async function updateProviderStatus(slug, { providerStatus, recipients, completedAt, eventType = 'docusign.sync', detail = '' }) {
	const doc = findTbcDocument(slug);
	if (!doc) return null;
	let result;
	({ result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		const now = new Date().toISOString();
		const status = String(providerStatus || existing.providerStatus || '').toLowerCase();
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
				{ at: now, type: eventType, detail: detail || `Provider status: ${status || 'unknown'}` },
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	}));
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
	const { result } = await mutate((register) => {
		const existing = register.documents[slug] || {};
		if (normalized !== 'not_requested' && displayStateFor(existing) !== 'executed' && !APPROVAL_STATES.has(existing.approvalStatus)) {
			const err = new Error('DocuSign execution must be complete before an approval can be recorded.');
			err.status = 409;
			throw err;
		}
		const now = new Date().toISOString();
		register.documents[slug] = {
			...existing,
			approvalStatus: normalized,
			approvalNote: String(note || '').trim().slice(0, 2000),
			approvalBy: String(actor || '').slice(0, 200),
			approvalAt: normalized === 'not_requested' ? null : now,
			events: [
				...(Array.isArray(existing.events) ? existing.events : []),
				{ at: now, type: 'approval.recorded', detail: `${normalized}${note ? ` · ${String(note).slice(0, 180)}` : ''}` },
			].slice(-100),
		};
		return summarizeExecution(doc, register.documents[slug]);
	});
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
