import { createHash } from 'crypto';
import { mkdir, readFile, rename, writeFile, stat } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { tbcDocumentRoot } from '../data/tbc-documents.js';

// A completed DocuSign envelope is the authoritative signed instrument.
// The public library still has to remain a DOCX-only reading surface, so a
// completed envelope gets a DOCX execution record appended to the protected
// source. The record contains status and signer attestations pulled from
// DocuSign; it is deliberately not represented as the DocuSign certificate
// of completion itself.
const EXECUTED_DIR = path.join(tbcDocumentRoot, '.execution', 'executed');

export function executedDocxPath(slug) {
	return path.join(EXECUTED_DIR, `${slug}.docx`);
}

export async function hasExecutedDocx(slug) {
	try {
		const info = await stat(executedDocxPath(slug));
		return info.isFile() && info.size > 0;
	} catch {
		return false;
	}
}

const esc = (value) => String(value ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;');

const para = (text, { bold = false, size = 20, color = '222222', space = 120, breakBefore = false } = {}) => (
	`<w:p><w:pPr><w:spacing w:after="${space}"/>${breakBefore ? '<w:pageBreakBefore/>' : ''}</w:pPr>`
	+ `<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr>`
	+ `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
);

function certificateXml({ doc, execution, sourceSha256 }) {
	const completed = execution.completedAt || execution.lastSyncedAt || new Date().toISOString();
	const when = new Date(completed);
	const whenText = Number.isNaN(when.getTime()) ? completed : when.toUTCString();
	const signers = (execution.recipients || []).filter((recipient) => recipient.selected);
	return [
		para('EXECUTION RECORD', { bold: true, size: 36, color: '946C25', space: 80, breakBefore: true }),
		para(`${doc.number} — ${doc.title}`, { bold: true, size: 24, color: '111111', space: 60 }),
		para('This page is a DOCX reading record generated after DocuSign reported the envelope as completed. The DocuSign certificate of completion and the completed PDF held by DocuSign are the authoritative execution evidence.', { size: 18, color: '444444', space: 160 }),
		para(`Provider: DocuSign`, { size: 18, color: '444444', space: 40 }),
		para(`Envelope status: ${execution.providerStatus || execution.state || 'completed'}`, { size: 18, color: '444444', space: 40 }),
		para(`Completed: ${whenText}`, { size: 18, color: '444444', space: 40 }),
		para(`Source document SHA-256: ${sourceSha256}`, { size: 15, color: '555555', space: 180 }),
		para('SIGNERS', { bold: true, size: 22, color: '946C25', space: 80 }),
		...signers.flatMap((signer, index) => [
			para(`${index + 1}. ${signer.party || signer.label || 'Signer'}`, { bold: true, size: 19, color: '111111', space: 30 }),
			para(`Capacity: ${signer.capacity || 'Signer'}`, { size: 17, color: '444444', space: 20 }),
			para(`Status: ${signer.status || 'completed'}`, { size: 17, color: '444444', space: 40 }),
		]),
		para('This record does not itself enable a token sale, staking, governance, migration, brokerage or chain function. Those controls remain independently gated and require written legal, technical and security approval.', { size: 16, color: '666666', space: 80 }),
		para(`Generated ${new Date().toISOString()}`, { size: 14, color: '777777', space: 0 }),
	].join('');
}

export async function writeExecutedDocx(doc, execution) {
	const sourcePath = path.join(tbcDocumentRoot, doc.docxProtected || doc.docx);
	const source = await readFile(sourcePath);
	const sourceSha256 = createHash('sha256').update(source).digest('hex');
	const zip = await JSZip.loadAsync(source);
	const documentFile = zip.file('word/document.xml');
	if (!documentFile) throw new Error('DOCX source has no word/document.xml');
	const documentXml = await documentFile.async('string');
	if (!documentXml.includes('</w:body>')) throw new Error('DOCX source has an unexpected body structure');
	const cert = certificateXml({ doc, execution, sourceSha256 });
	const nextXml = documentXml.replace('</w:body>', `${cert}</w:body>`);
	zip.file('word/document.xml', nextXml);
	const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
	await mkdir(EXECUTED_DIR, { recursive: true, mode: 0o700 });
	const target = executedDocxPath(doc.slug);
	const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(tmp, out, { mode: 0o600 });
	await rename(tmp, target);
	return { path: target, sourceSha256, bytes: out.length };
}
