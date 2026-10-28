import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// TB stock instruments live outside the public web bundle. The DOCX reader
// copies and PDFs used only for DocuSign anchoring are served through a narrow
// public endpoint; the signer register and execution state remain admin-only.
export const tbStockDocumentRoot = fileURLToPath(new URL('../../storage/tb-stock-documents/', import.meta.url));

const manifest = JSON.parse(readFileSync(new URL('manifest.json', new URL('../../storage/tb-stock-documents/', import.meta.url)), 'utf8'));

export const tbStockDocuments = Array.isArray(manifest.documents) ? manifest.documents : [];
export const publicTbStockDocuments = tbStockDocuments.filter((doc) => doc.visibility === 'public');
export const tbStockLibraryMeta = {
	title: manifest.title || 'TradingBible TB stock document library',
	issuer: manifest.issuer || 'TradingBible LLC',
	proposedIssuer: manifest.proposedIssuer || 'TradingBible, Inc.',
	ticker: manifest.ticker || 'TB',
	tickerStatus: manifest.tickerStatus || 'Proposed — not reserved or approved',
	jurisdiction: manifest.jurisdiction || 'Delaware, United States',
	updated: manifest.updated || 'October 2026',
	notice: manifest.notice || 'TB is a proposed future ticker. These instruments are not an offer, listing approval, or evidence of a public market.',
};

export function findTbStockDocument(slug) {
	return tbStockDocuments.find((doc) => doc.slug === slug) || null;
}

export function toPublicTbStockDocument(doc, execution = null) {
	if (!doc) return null;
	return {
		slug: doc.slug,
		number: doc.number,
		title: doc.title,
		subtitle: doc.subtitle,
		category: doc.category,
		summary: doc.summary,
		status: doc.status,
		version: doc.version,
		signatureFields: doc.signatureFields,
		signatureStatus: execution && execution.state !== 'not_prepared' ? execution.label : doc.signatureStatus,
		execution: execution && execution.state !== 'not_prepared' ? execution : null,
		docxBytes: doc.docxBytes,
		downloadFormat: 'docx',
		readOnlyDownload: true,
	};
}

export function toAdminTbStockDocument(doc) {
	return {
		...toPublicTbStockDocument(doc),
		visibility: doc.visibility,
		classification: doc.classification,
		docxBytes: doc.docxBytes,
		downloadFormat: 'docx',
		readOnlyDownload: true,
		signers: Array.isArray(doc.signers) ? doc.signers : [],
	};
}
