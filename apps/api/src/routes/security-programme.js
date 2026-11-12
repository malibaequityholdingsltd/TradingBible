import { Router } from 'express';
import { readFile } from 'fs/promises';
import { supabaseAuth } from '../middleware/supabase-auth.js';
import { assertAdmin } from './admin.js';
import {
  createAccessReview,
  createSecurityIncident,
  createSecurityRisk,
  createSecurityTraining,
  createSecurityVendor,
  getSecurityAudit,
  getSecurityOverview,
  getSecurityRegisterCsv,
  securityDocumentFor,
  updateSecurityAcceptance,
  updateSecurityControl,
  updateSecurityIncident,
  updateSecurityRisk,
  updateSecurityVendor,
} from '../services/security-programme.js';

const router = Router();

function actorOf(user) {
  return String(user?.email || user?.id || 'admin');
}

function sendError(res, err, fallbackStatus = 500) {
  return res.status(Number(err?.status) || fallbackStatus).json({
    ok: false,
    message: err?.message || 'Security programme request failed.',
  });
}

router.get('/admin/overview', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(await getSecurityOverview());
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/admin/controls/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateSecurityControl(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/admin/risks', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await createSecurityRisk(req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/admin/risks/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateSecurityRisk(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/admin/incidents', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await createSecurityIncident(req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/admin/incidents/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateSecurityIncident(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/admin/vendors', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await createSecurityVendor(req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/admin/vendors/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateSecurityVendor(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.patch('/admin/acceptance/:id', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await updateSecurityAcceptance(req.params.id, req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/admin/training', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await createSecurityTraining(req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/admin/access-reviews', supabaseAuth, async (req, res) => {
  try {
    const actor = await assertAdmin(req);
    const result = await createAccessReview(req.body, actorOf(actor));
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/admin/register.csv', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    const csv = await getSecurityRegisterCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="TradingBible-Security-Register.csv"');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(csv);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/admin/audit', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.json({ ok: true, audit: await getSecurityAudit() });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/admin/documents/:id', supabaseAuth, async (req, res) => {
  try {
    await assertAdmin(req);
    const doc = securityDocumentFor(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Security document not found.' });
    let buffer;
    try {
      buffer = await readFile(doc.path);
    } catch {
      return res.status(404).json({ ok: false, message: 'This controlled document has not been built on the API host.' });
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(buffer);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
