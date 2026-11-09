import { Router } from 'express';
import path from 'path';
import {
	findTbStockDocument,
	publicTbStockDocuments,
	tbStockDocumentRoot,
	tbStockLibraryMeta,
	toPublicTbStockDocument,
} from '../data/tb-stock-documents.js';
import { getPublicExecution } from '../services/tb-stock-execution.js';

const router = Router();
const SLUG = /^[a-z0-9-]+$/;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('X-TB-Stock-Document-State', 'public-reading-copy');
		res.setHeader('X-Robots-Tag', 'noindex');
		res.sendFile(path.join(tbStockDocumentRoot, doc.docx), {
			dotfiles: 'allow',
			headers: {
				'Content-Type': DOCX_MIME,
				'Content-Disposition': `inline; filename="${doc.slug}-reading-copy.docx"`,
			},
		}, (err) => {
			if (err && !res.headersSent) next(err);
		});
	} catch (err) {
		next(err);
	}
});

export default router;
