import { Router } from 'express';
import path from 'path';
import { findTbcDocument, publicTbcDocuments, tbcDocumentManifest, tbcDocumentRoot, toPublicDocument } from '../data/tbc-documents.js';
import { getPublicExecution } from '../services/tbc-execution.js';

const router = Router();
const SLUG = /^[a-z0-9-]+$/;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

router.get('/', async (_req, res, next) => {
	try {
		const documents = await Promise.all(publicTbcDocuments.map(async (doc) => (
			toPublicDocument(doc, await getPublicExecution(doc.slug))
		)));
		res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
		res.json({
			issuer: tbcDocumentManifest.issuer || 'TradingBible Holdings, Inc.',
			operator: tbcDocumentManifest.operator || 'TradingBible Holdings, Inc.',
			jurisdiction: tbcDocumentManifest.jurisdiction || 'Delaware, United States',
			updated: tbcDocumentManifest.updated || 'November 2026',
			notice: 'TBC is at proposal stage. These documents are not an offer, solicitation, or evidence of a live token sale. Public reading copies are served in the in-app reader only; executed copies and signatory details remain in the private vault.',
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
		res.setHeader('Cache-Control', 'private, no-store');
		res.setHeader('X-TBC-Document-State', 'public-reading-copy');
		res.setHeader('X-Robots-Tag', 'noindex');
		res.sendFile(path.join(tbcDocumentRoot, doc.docx), {
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
