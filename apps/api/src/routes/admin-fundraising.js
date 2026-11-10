import { Router } from 'express';
import path from 'path';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
	findFundraisingDocument,
	fundraisingDocumentManifest,
	fundraisingDocumentRoot,
	fundraisingDocuments,
	fundraisingLibraryMeta,
	toAdminFundraisingDocument,
} from '../data/fundraising-documents.js';
import {
	docusignConfig,
	createEnvelope,
	sendEnvelope,
	getEnvelopeStatus,
} from '../services/docusign.js';
import {
	listExecutions,
	getExecution,
	saveRecipients,
	markEnvelopeCreated,
	updateProviderStatus,
	recordApproval,
} from '../services/fundraising-execution.js';
import { executedDocxPath, hasExecutedDocx } from '../services/fundraising-executed-docx.js';
import { renderCommunicationsMarkdown } from '../data/communication-templates.js';

const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9-]+$/;

const FUNDRAISING_EMAIL_BLURB = [
	'You are receiving a confidential controlled fundraising instrument for signature.',
	'Open the envelope and complete only the fields assigned to your capacity.',
	'Do not sign a field allocated to another party.',
	'This email does not contain funding instructions. Do not send funds until the document is countersigned and the funding instructions are independently verified.',
	'A completed signature is not by itself an SEC qualification, a regulatory approval, a closing or a funding confirmation.',
].join(' ');

function executionEnabled() {
	return String(process.env.FUNDRAISING_EXECUTION_ENABLED || '').toLowerCase() === 'true';
}

function assertExecutionEnabled() {
	if (executionEnabled()) return;
	const err = new Error('Fundraising DocuSign execution is locked. Set FUNDRAISING_EXECUTION_ENABLED=true only after board authorization and counsel review of the exact document version.');
	err.status = 409;
	err.code = 'fundraising_execution_disabled';
	throw err;
}

function executableDocument(slug) {
	if (!SLUG.test(String(slug || ''))) return null;
	return findFundraisingDocument(slug) || null;
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

function packetReadme() {
	return [
		'TRADINGBIBLE CONFIDENTIAL FUNDRAISING PACKET',
		'==========================================',
		'',
		`Issuer: ${fundraisingLibraryMeta.issuer}`,
		`Jurisdiction: ${fundraisingLibraryMeta.jurisdiction}`,
		`Version: ${fundraisingLibraryMeta.version}`,
		`Updated: ${fundraisingLibraryMeta.updated}`,
		'',
		'STATUS',
		'------',
		'All documents in this packet are drafts. They are not executed, filed, qualified, approved or effective. Nothing in this packet is an offer to sell or a solicitation of an offer to buy securities.',
		'',
		'Counsel must review the exact document version before any external use. Private-placement communications must remain one-to-one and limited to persons with a pre-existing relationship. Regulation CF communications must remain inside the qualified offering process and the registered intermediary\'s rules.',
		'',
		'The Form D worksheet is a preparation worksheet. Form D itself must be filed with the SEC through EDGAR. The Regulation CF readiness memorandum is not a Form C. The Form C preparation workbook is not an official SEC form.',
		'',
		'DOCUMENTS',
		'---------',
		...fundraisingDocuments.map((doc) => `${doc.number}  ${doc.title}`),
		'',
		'COMMUNICATIONS',
		'--------------',
		'Fundraising email, SMS and in-app copy is included in COMMUNICATIONS.md. SMS remains design-only until a provider, consent records and opt-out handling are in place.',
		'',
		'EXECUTION',
		'---------',
		'DocuSign execution is disabled unless FUNDRAISING_EXECUTION_ENABLED=true is set on the API server after board authorization and counsel review. A completed DocuSign envelope is evidence of signature, not a regulatory approval, closing or funding confirmation.',
		'',
	].join('\n');
}

router.get('/', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const executions = await listExecutions();
		const bySlug = new Map(executions.map((item) => [item.slug, item]));
		const documents = fundraisingDocuments.map((doc) => toAdminFundraisingDocument(doc, bySlug.get(doc.slug)));
		res.setHeader('Cache-Control', 'private, no-store');
		res.json({
			...fundraisingLibraryMeta,
			executionEnabled: executionEnabled(),
			documents,
		});
	} catch (err) {
		next(err);
	}
});

router.get('/packet.zip', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const executions = await listExecutions();
		const bySlug = new Map(executions.map((item) => [item.slug, item]));
		const zip = new JSZip();
		zip.file('README.txt', packetReadme());
		zip.file('COMMUNICATIONS.md', renderCommunicationsMarkdown({ fundraisingOnly: true }));
		zip.file('manifest.json', JSON.stringify({
			...fundraisingDocumentManifest,
			generatedAt: new Date().toISOString(),
			executionEnabled: executionEnabled(),
			executions: fundraisingDocuments.map((doc) => bySlug.get(doc.slug)).filter(Boolean),
		}, null, 2));
		for (const doc of fundraisingDocuments) {
			const docx = await readFile(path.join(fundraisingDocumentRoot, doc.docx));
			const pdf = await readFile(path.join(fundraisingDocumentRoot, doc.pdf));
			zip.file(`docx/${doc.number}-${doc.slug}.docx`, docx);
			zip.file(`pdf/${doc.number}-${doc.slug}.pdf`, pdf);
		}
		const buffer = await zip.generateAsync({
			type: 'nodebuffer',
			compression: 'DEFLATE',
			compressionOptions: { level: 6 },
		});
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Fundraising-Packet-2026-11.zip"');
		res.send(buffer);
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
			executionEnabled: executionEnabled(),
			executionLockReason: executionEnabled()
				? ''
				: 'Fundraising execution is locked. Set FUNDRAISING_EXECUTION_ENABLED=true only after board authorization and counsel review of the exact document version.',
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
		if (!doc) return res.status(404).json({ message: 'Document not found' });
		const executed = await hasExecutedDocx(doc.slug);
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('X-Fundraising-Document-State', executed ? 'executed' : 'source');
		const file = executed ? executedDocxPath(doc.slug) : path.join(fundraisingDocumentRoot, doc.docx);
		return res.download(file, `${doc.slug}-${executed ? 'executed' : 'readonly'}.docx`, { dotfiles: 'allow' }, (err) => {
			if (err && !res.headersSent) next(err);
		});
	} catch (err) {
		next(err);
	}
});

router.get('/:slug/pdf', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const doc = executableDocument(req.params.slug);
		if (!doc) return res.status(404).json({ message: 'Document not found' });
		res.setHeader('Cache-Control', 'private, no-store');
		return res.download(path.join(fundraisingDocumentRoot, doc.pdf), `${doc.slug}-source.pdf`, { dotfiles: 'allow' }, (err) => {
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
		assertExecutionEnabled();
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
			documentRoot: fundraisingDocumentRoot,
			emailSubjectPrefix: 'TradingBible Confidential',
			emailBlurb: FUNDRAISING_EMAIL_BLURB,
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
		assertExecutionEnabled();
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
