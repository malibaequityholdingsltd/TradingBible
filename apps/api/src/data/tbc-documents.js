import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Files live outside the web bundle. Public summaries are streamed through a
// narrow read-only endpoint; the 26 corporate instruments are only reachable
// through the admin-authenticated route in routes/admin.js.
export const tbcDocumentRoot = fileURLToPath(new URL('../../storage/tbc-documents/', import.meta.url));

const manifest = JSON.parse(readFileSync(new URL('manifest.json', new URL('../../storage/tbc-documents/', import.meta.url)), 'utf8'));

export const tbcDocuments = Array.isArray(manifest.documents) ? manifest.documents : [];
export const publicTbcDocuments = tbcDocuments.filter((doc) => doc.visibility === 'public');
export const internalTbcDocuments = tbcDocuments.filter((doc) => doc.visibility === 'internal');

export function findTbcDocument(slug) {
	return tbcDocuments.find((doc) => doc.slug === slug) || null;
}

export function toPublicDocument(doc, execution = null) {
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

export function toAdminDocument(doc) {
	return {
		...toPublicDocument(doc),
		visibility: doc.visibility,
		classification: doc.classification,
		docxBytes: doc.docxBytes,
		downloadFormat: 'docx',
		readOnlyDownload: true,
		signers: Array.isArray(doc.signers) ? doc.signers : [],
	};
}
