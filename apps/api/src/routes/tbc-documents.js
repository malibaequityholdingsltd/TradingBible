import { Router } from 'express';
import path from 'path';
import { findTbcDocument, publicTbcDocuments, tbcDocumentRoot, toPublicDocument } from '../data/tbc-documents.js';

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

function sendPdf(req, res, next, doc) {
	const file = path.join(tbcDocumentRoot, doc.pdf);
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="${doc.slug}.pdf"`);
	res.setHeader('Cache-Control', 'public, max-age=3600');
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.sendFile(file, (err) => {
		if (err && !res.headersSent) next(err);
	});
}

router.get('/', (_req, res) => {
	res.setHeader('Cache-Control', 'public, max-age=300');
	res.json({
		issuer: 'TradingBible LLC',
		jurisdiction: 'Delaware, United States',
		updated: 'October 2026',
		notice: 'TBC is at proposal stage. These documents are not an offer, solicitation, or evidence of a live token sale.',
		documents: publicTbcDocuments.map(toPublicDocument),
	});
});

router.get('/:slug', (req, res) => {
	const doc = publicDoc(req.params.slug, res);
	if (!doc) return;
	res.setHeader('Cache-Control', 'public, max-age=300');
	res.json({ document: toPublicDocument(doc) });
});

router.get('/:slug/file', (req, res, next) => {
	const doc = publicDoc(req.params.slug, res);
	if (!doc) return;
	sendPdf(req, res, next, doc);
});

router.get('/:slug/docx', (req, res, next) => {
	const doc = publicDoc(req.params.slug, res);
	if (!doc) return;
	res.download(path.join(tbcDocumentRoot, doc.docx), `${doc.slug}.docx`, (err) => {
		if (err && !res.headersSent) next(err);
	});
});

export default router;
