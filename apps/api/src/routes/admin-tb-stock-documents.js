import { Router } from 'express';
import path from 'path';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
	findTbStockDocument,
	publicTbStockDocuments,
	tbStockDocumentRoot,
	toAdminTbStockDocument,
} from '../data/tb-stock-documents.js';
import {
	listExecutions,
	getExecution,
	saveRecipients,
	markEnvelopeCreated,
	updateProviderStatus,
	recordApproval,
} from '../services/tb-stock-execution.js';
import {
	docusignConfig,
	createEnvelope,
	sendEnvelope,
	getEnvelopeStatus,
} from '../services/docusign.js';
import { executedDocxPath, hasExecutedDocx } from '../services/tb-stock-executed-docx.js';

const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9-]+$/;

const TB_EMAIL_BLURB = [
	'You are receiving a controlled TradingBible TB stock preparation instrument for signature.',
	'Open the envelope and complete only the fields assigned to your capacity.',
	'Do not sign a field allocated to another party.',
	'A completed signature is not by itself an SEC registration, exchange approval, listing, or authorization to issue or sell shares.',
].join(' ');

function executableDocument(slug) {
	if (!SLUG.test(String(slug || ''))) return null;
	return findTbStockDocument(slug) || null;
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

router.get('/', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const documents = publicTbStockDocuments.map(toAdminTbStockDocument);
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({
			issuer: 'TradingBible LLC',
			proposedIssuer: 'TradingBible, Inc.',
			ticker: 'TB',
			jurisdiction: 'Delaware, United States',
			updated: 'October 2026',
			notice: 'Signature-ready TB stock preparation instruments. DocuSign execution does not authorize an IPO, listing, offering, share issuance, or transfer.',
			documents,
		});
	} catch (err) {
		next(err);
	}
});

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

router.get('/:slug/docx', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const doc = executableDocument(req.params.slug);
		if (!doc) return res.status(404).json({ error: 'Document not found' });
		const executed = await hasExecutedDocx(doc.slug);
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('X-TB-Stock-Document-State', executed ? 'executed' : 'source');
		const file = executed ? executedDocxPath(doc.slug) : path.join(tbStockDocumentRoot, doc.docxProtected || doc.docx);
		return res.download(file, `${doc.slug}-${executed ? 'executed' : 'readonly'}.docx`, { dotfiles: 'allow' }, (err) => {
			if (err && !res.headersSent) next(err);
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
		const envelope = await createEnvelope({
			doc,
			recipients: selected,
			sendNow,
			documentRoot: tbStockDocumentRoot,
			emailSubjectPrefix: 'TradingBible TB Stock',
			emailBlurb: TB_EMAIL_BLURB,
		});
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

export default router;
