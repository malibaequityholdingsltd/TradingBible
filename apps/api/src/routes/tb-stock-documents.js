import { Router } from 'express';
import path from 'path';
import {
	findTbStockDocument,
	publicTbStockDocuments,
	tbStockDocumentRoot,
	tbStockLibraryMeta,
	toPublicTbStockDocument,
} from '../data/tb-stock-documents.js';
import { getExecution, getPublicExecution } from '../services/tb-stock-execution.js';
import { executedDocxPath, hasExecutedDocx, writeExecutedDocx } from '../services/tb-stock-executed-docx.js';

const router = Router();
const SLUG = /^[a-z0-9-]+$/;

function publicDoc(slug, res) {
	if (!SLUG.test(String(slug || ''))) {
		res.status(404).json({ error: 'Document not found' });
		return null;
	}
	const doc = findTbStockDocument(slug);
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
	return { path: path.join(tbStockDocumentRoot, doc.docxProtected || doc.docx), executed: false };
}

router.get('/', async (_req, res, next) => {
	try {
		const documents = await Promise.all(publicTbStockDocuments.map(async (doc) => (
			toPublicTbStockDocument(doc, await getPublicExecution(doc.slug))
		)));
		res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
		res.json({
			...tbStockLibraryMeta,
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
		res.json({ document: toPublicTbStockDocument(doc, await getPublicExecution(doc.slug)) });
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
		res.setHeader('X-TB-Stock-Document-State', served.executed ? 'executed' : 'source');
		res.download(served.path, `${doc.slug}-${served.executed ? 'executed' : 'readonly'}.docx`, { dotfiles: 'allow' }, (err) => {
			if (err && !res.headersSent) next(err);
		});
	} catch (err) {
		next(err);
	}
});

export default router;
