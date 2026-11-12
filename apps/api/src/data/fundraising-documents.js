import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Confidential fundraising packet. Unlike the TBC and TB stock libraries,
// these documents have no public projection: every route is admin-only and
// every item is issued as an execution copy or a controlled company record.
export const fundraisingDocumentRoot = fileURLToPath(new URL('../../storage/fundraising-documents/', import.meta.url));

const manifest = JSON.parse(readFileSync(new URL('manifest.json', new URL('../../storage/fundraising-documents/', import.meta.url)), 'utf8'));

export const fundraisingDocumentManifest = manifest;
export const fundraisingDocuments = Array.isArray(manifest.documents) ? manifest.documents : [];

export const fundraisingLibraryMeta = {
	title: manifest.title || 'TradingBible confidential fundraising document packet',
	issuer: manifest.issuer || 'TradingBible Holdings, Inc.',
	jurisdiction: manifest.jurisdiction || 'Delaware, United States',
	updated: manifest.updated || 'November 2026',
	version: manifest.version || '1.0',
	notice: manifest.notice || 'Controlled fundraising execution packet. Not an offer, solicitation, filing, qualification or approval.',
};

export function findFundraisingDocument(slug) {
	return fundraisingDocuments.find((doc) => doc.slug === slug) || null;
}

export function toAdminFundraisingDocument(doc, execution = null) {
	if (!doc) return null;
	return {
		slug: doc.slug,
		number: doc.number,
		title: doc.title,
		subtitle: doc.subtitle,
		category: doc.category,
		track: doc.track,
		summary: doc.summary,
		status: doc.status,
		version: doc.version,
		visibility: doc.visibility,
		classification: doc.classification,
		signatureFields: doc.signatureFields,
		signatureStatus: execution && execution.state !== 'not_prepared' ? execution.label : doc.signatureStatus,
		execution: execution && execution.state !== 'not_prepared' ? execution : null,
		docxBytes: doc.docxBytes,
		pdfBytes: doc.pdfBytes,
		downloadFormat: 'docx',
		readOnlyDownload: true,
		counselReviewRequired: Boolean(doc.counselReviewRequired),
		signers: Array.isArray(doc.signers) ? doc.signers : [],
	};
}
