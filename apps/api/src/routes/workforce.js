import { Router } from 'express';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
  documentPathFor,
  getDocumentManifest,
  getEmployeeFile,
  getWorkforceAudit,
  getWorkforceOverview,
  getWorkforceRegisterCsv,
  updateEmployeeFile,
  updateEmployerItem,
  updatePolicy,
} from '../services/workforce.js';

const router = Router();

function actorOf(user) {
  return String(user?.email || user?.id || 'admin');
}

function sendError(res, err, fallbackStatus = 500) {
  const status = Number(err?.status) || fallbackStatus;
  return res.status(status).json({
    ok: false,
    message: err?.message || 'Workforce request failed.',
    ...(err?.details ? { details: err.details } : {}),
  });
}

router.get('/admin/overview', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(await getWorkforceOverview());
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/employees/:email', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(await getEmployeeFile(req.params.email));
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.patch('/admin/employees/:email', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateEmployeeFile(req.params.email, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.patch('/admin/employer/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateEmployerItem(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.patch('/admin/policies/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updatePolicy(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/register.csv', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    const csv = await getWorkforceRegisterCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Workforce-Register.csv"');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(csv);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/audit', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json({ ok: true, audit: await getWorkforceAudit() });
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/documents', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(await getDocumentManifest());
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/documents/:id/:format', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    const target = documentPathFor(req.params.id, req.params.format);
    if (!target) return res.status(404).json({ ok: false, message: 'Workforce document not found.' });
    let buffer;
    try {
      buffer = await readFile(target.path);
    } catch {
      return res.status(404).json({ ok: false, message: 'This document has not been built yet. Run the workforce document build.' });
    }
    const contentType = target.format === 'pdf'
      ? 'application/pdf'
      : target.format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/markdown; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${target.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(buffer);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

router.get('/admin/pack.zip', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    const manifest = await getDocumentManifest();
    if (!manifest.available || !manifest.documents?.length) {
      return res.status(404).json({
        ok: false,
        message: 'The workforce document pack has not been built. Run `node scripts/build-workforce-documents.mjs` on the API host.',
      });
    }
    const zip = new JSZip();
    zip.file('README.txt', [
      'TradingBible Holdings, Inc. — Workforce document pack',
      '',
      'These documents are controlled templates and reference materials. They are not evidence that counsel, a board, an insurer, a payroll provider or a regulator has approved them.',
      'Record adoption, approval references and local addenda in the Workforce compliance register before treating a document as operative.',
      '',
      'Do not store identity documents, medical records, bank details or tax identifiers in this pack.',
      '',
      `Built: ${manifest.builtAt || 'unknown'}`,
    ].join('\n'));
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    for (const doc of manifest.documents) {
      for (const format of ['docx', 'pdf', 'md']) {
        const target = documentPathFor(doc.id, format);
        if (!target) continue;
        try {
          const buffer = await readFile(target.path);
          zip.file(`${format}/${target.filename}`, buffer);
        } catch {
          // A missing optional format does not block the rest of the pack.
        }
      }
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Workforce-Document-Pack.zip"');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(buffer);
  } catch (err) {
    sendError(res, err, err?.status || 500);
  }
});

export default router;
