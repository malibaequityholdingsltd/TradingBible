import { Router } from 'express';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import { findTbcDocument } from '../data/tbc-documents.js';
import {
	docusignConfig,
	createEnvelope,
	sendEnvelope,
	getEnvelopeStatus,
	verifyConnectSignature,
} from '../services/docusign.js';
import {
	listExecutions,
	getExecution,
	saveRecipients,
	markEnvelopeCreated,
	updateProviderStatus,
	recordApproval,
	findByEnvelopeId,
} from '../services/tbc-execution.js';
import {
	findByEnvelopeId as findTbByEnvelopeId,
	updateProviderStatus as updateTbProviderStatus,
} from '../services/tb-stock-execution.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9-]+$/;

function executableDocument(slug) {
	if (!SLUG.test(String(slug || ''))) return null;
	return findTbcDocument(slug) || null;
}

function assertSignerConfig(execution) {
	const selected = execution.recipients.filter((recipient) => recipient.selected);
	const missingRequired = execution.recipients.filter((recipient) => recipient.required && !recipient.selected);
	if (missingRequired.length) {
		const err = new Error(`Select every required signer: ${missingRequired.map((recipient) => recipient.party).join(', ')}`);
		err.status = 422;
		throw err;
	}
	if (!selected.length) {
		const err = new Error('Select at least one signer.');
		err.status = 422;
		throw err;
	}
	const invalid = selected.filter((recipient) => !recipient.name?.trim() || !EMAIL.test(recipient.email || ''));
	if (invalid.length) {
		const err = new Error(`Add a full name and valid email for: ${invalid.map((recipient) => recipient.party).join(', ')}`);
		err.status = 422;
		throw err;
	}
	return selected;
}

router.get('/executions', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const config = docusignConfig();
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({
			provider: 'docusign',
			configured: config.configured,
			environment: config.environment,
			sendOnCreate: config.sendOnCreate,
			missing: config.missing,
			documents: await listExecutions(),
		});
	} catch (err) {
		next(err);
	}
});

router.put('/:slug/workflow', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		if (!executableDocument(req.params.slug)) return res.status(404).json({ message: 'Document not found' });
		const execution = await saveRecipients(req.params.slug, req.body?.recipients);
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({ execution });
	} catch (err) {
		next(err);
	}
});

router.post('/:slug/send', supabaseAuth, async (req, res, next) => {
	try {
		const actor = await assertAdmin(req);
		const doc = executableDocument(req.params.slug);
		if (!doc) return res.status(404).json({ message: 'Document not found' });
		const config = docusignConfig();
		if (!config.configured) {
			return res.status(503).json({
				message: `DocuSign is not configured. Missing: ${config.missing.join(', ')}`,
				missing: config.missing,
			});
		}
		const execution = await getExecution(req.params.slug);
		if (!execution) return res.status(404).json({ message: 'Document not found' });
		if (execution.envelopeId && !['declined', 'voided'].includes(execution.providerStatus)) {
			return res.status(409).json({
				message: 'An envelope already exists for this document. Sync it rather than creating another.',
				envelopeId: execution.envelopeId,
			});
		}
		const selected = assertSignerConfig(execution);
		const sendNow = req.body?.draft === true ? false : config.sendOnCreate;
		const envelope = await createEnvelope({ doc, recipients: selected, sendNow });
		const saved = await markEnvelopeCreated(req.params.slug, {
			envelopeId: envelope.envelopeId,
			providerStatus: envelope.status,
			recipients: envelope.recipients,
			subject: envelope.subject,
		});
		res.status(201).json({
			execution: saved,
			draft: envelope.status === 'created',
			sentBy: actor.email || '',
		});
	} catch (err) {
		next(err);
	}
});

router.post('/:slug/submit', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		if (!executableDocument(req.params.slug)) return res.status(404).json({ message: 'Document not found' });
		const execution = await getExecution(req.params.slug);
		if (!execution?.envelopeId) return res.status(409).json({ message: 'Prepare the DocuSign envelope first.' });
		if (execution.providerStatus !== 'created') {
			return res.status(409).json({ message: 'This envelope is not a draft.' });
		}
		await sendEnvelope(execution.envelopeId);
		const saved = await updateProviderStatus(req.params.slug, {
			providerStatus: 'sent',
			eventType: 'docusign.envelope.sent',
			detail: 'Draft envelope released for signature',
		});
		res.json({ execution: saved });
	} catch (err) {
		next(err);
	}
});

router.post('/:slug/sync', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		if (!executableDocument(req.params.slug)) return res.status(404).json({ message: 'Document not found' });
		const execution = await getExecution(req.params.slug);
		if (!execution?.envelopeId) return res.status(409).json({ message: 'No DocuSign envelope has been prepared.' });
		const config = docusignConfig();
		if (!config.configured) {
			return res.status(503).json({
				message: `DocuSign is not configured. Missing: ${config.missing.join(', ')}`,
				missing: config.missing,
			});
		}
		const provider = await getEnvelopeStatus(execution.envelopeId);
		const saved = await updateProviderStatus(req.params.slug, {
			providerStatus: provider.status,
			recipients: provider.recipients,
			completedAt: provider.completedAt,
			eventType: 'docusign.sync',
			detail: `Pull from DocuSign · ${provider.status}`,
		});
		res.json({ execution: saved });
	} catch (err) {
		next(err);
	}
});

router.post('/:slug/approval', supabaseAuth, async (req, res, next) => {
	try {
		const actor = await assertAdmin(req);
		if (!executableDocument(req.params.slug)) return res.status(404).json({ message: 'Document not found' });
		const execution = await recordApproval(req.params.slug, {
			status: req.body?.status,
			note: req.body?.note,
			actor: actor.email || actor.id || 'admin',
		});
		res.json({ execution });
	} catch (err) {
		next(err);
	}
});

export async function docusignWebhook(req, res) {
	const signature = req.get('X-DocuSign-Signature-1') || req.get('X-DocuSign-Signature-2');
	if (!process.env.DOCUSIGN_CONNECT_HMAC_KEY) {
		return res.status(503).json({ message: 'DocuSign Connect verification is not configured.' });
	}
	if (!verifyConnectSignature(req.rawBody || Buffer.from(''), signature)) {
		return res.status(401).json({ message: 'Invalid DocuSign Connect signature.' });
	}
	const payload = req.body || {};
	const envelopeId = payload?.data?.envelopeId
		|| payload?.data?.envelopeSummary?.envelopeId
		|| payload?.envelopeId;
	if (!envelopeId) return res.status(202).json({ ok: true, ignored: 'no envelope id' });
	let record = await findByEnvelopeId(envelopeId);
	let updateRecord = updateProviderStatus;
	if (!record) {
		record = await findTbByEnvelopeId(envelopeId);
		updateRecord = updateTbProviderStatus;
	}
	if (!record) return res.status(202).json({ ok: true, ignored: 'unknown envelope' });

	const summary = payload?.data?.envelopeSummary || {};
	const status = String(summary.status || payload?.data?.status || '').toLowerCase();
	const signers = summary?.recipients?.signers || payload?.data?.recipients?.signers || [];
	const completedAtRaw = summary.completedDateTime || payload?.data?.completedDateTime || null;
	const completedAt = completedAtRaw && !Number.isNaN(new Date(completedAtRaw).getTime())
		? new Date(completedAtRaw).toISOString()
		: null;
	await updateRecord(record.slug, {
		providerStatus: status,
		recipients: signers.map((signer) => ({
			recipientId: String(signer.recipientId || ''),
			status: String(signer.status || '').toLowerCase(),
		})),
		completedAt,
		eventType: `docusign.${String(payload?.event || summary.status || 'connect').toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`,
		detail: `DocuSign Connect · ${status || 'unknown'}`,
	});
	return res.status(200).json({ ok: true });
}

export default router;
