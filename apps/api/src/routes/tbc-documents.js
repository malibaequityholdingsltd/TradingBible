import { Router } from 'express';
import path from 'path';
import { findTbcDocument, publicTbcDocuments, tbcDocumentRoot, toPublicDocument } from '../data/tbc-documents.js';
import { getExecution, getPublicExecution } from '../services/tbc-execution.js';
import { executedDocxPath, hasExecutedDocx, writeExecutedDocx } from '../services/tbc-executed-docx.js';

const router = Router();
const SLUG = /^[a-z0-9-]+$/;

function publicDoc(slug, res) {
	if (!SLUG.test(String(slug || ''))) {
		res.status(404).json({ error: 'Document not found' });
		return null;
	}
	const doc = findTbcDocument(slug);
	if (!doc || doc.visibility !== 'public') {
		res.status(404).json({ error: 'Document not found' });
		return null;
	}
	return doc;
}

async function docxFor(doc) {
	const execution = await getExecution(doc.slug);
	if (execution?.state === 'executed') {
		if (!(await hasExecutedDocx(doc.slug))) {
			try { await writeExecutedDocx(doc, execution); } catch { /* serve the source below */ }
		}
		if (await hasExecutedDocx(doc.slug)) return { path: executedDocxPath(doc.slug), executed: true };
	}
	return { path: path.join(tbcDocumentRoot, doc.docxProtected || doc.docx), executed: false };
}

router.get('/', async (_req, res, next) => {
	try {
		const documents = await Promise.all(publicTbcDocuments.map(async (doc) => (
			toPublicDocument(doc, await getPublicExecution(doc.slug))
		)));
		res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
		res.json({
			issuer: 'TradingBible LLC',
			jurisdiction: 'Delaware, United States',
			updated: 'October 2026',
			notice: 'TBC is at proposal stage. These documents are not an offer, solicitation, or evidence of a live token sale. Once an instrument is executed, the library serves the execution-record DOCX automatically.',
			documents,
		});
	} catch (err) {
		next(err);
	}
});

router.get('/:slug', async (req, res, next) => {
	try {
		const doc = publicDoc(req.params.slug, res);
		if (!doc) return;
		res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
		res.json({ document: toPublicDocument(doc, await getPublicExecution(doc.slug)) });
	} catch (err) {
		next(err);
	}
});

router.get('/:slug/docx', async (req, res, next) => {
	try {
		const doc = publicDoc(req.params.slug, res);
		if (!doc) return;
		const served = await docxFor(doc);
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('X-TBC-Document-State', served.executed ? 'executed' : 'source');
		res.download(served.path, `${doc.slug}-${served.executed ? 'executed' : 'readonly'}.docx`, { dotfiles: 'allow' }, (err) => {
			if (err && !res.headersSent) next(err);
		});
	} catch (err) {
		next(err);
	}
});

export default router;
