import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import Stripe from 'stripe';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

let API_VERSION = '1.1.0';
try {
	API_VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version || API_VERSION;
} catch { /* keep default */ }

const BOOT_TS = Date.now();

const router = Router();

function isAdminEmail(email) {
	const value = String(email || '').toLowerCase();
	return /@tradingbible\.app$/.test(value) || value === 'malibaequityholdingsltd@outlook.com';
}

async function assertAdmin(req) {
	const token = req.headers.authorization?.split(' ')?.[1];
	const user = await getSupabaseUser(token);
	if (!user) {
		const err = new Error('Your session has expired. Please sign in again.');
		err.status = 401;
		throw err;
	}
	const profile = await supabase.getUserById(user.id);
	if (profile?.role === 'admin' || isAdminEmail(user.email)) {
		return user;
	}
	const err = new Error('Admin access required.');
	err.status = 403;
	throw err;
}

// GET /api/admin/users — full user list via service role (RLS bypass).
// Browser `useUsers` falls back here when the `users` table is RLS-blocked.
// Auth users are the source of truth for who has signed up; `users`-table
// rows add profile data (role, plan, settings) where present.
router.get('/users', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const [rows, authUsers] = await Promise.all([
			supabaseRestListUsers(),
			supabaseRestListAuthUsers(),
		]);
		const byEmail = new Map(rows.map((u) => [String(u.email).toLowerCase(), u]));
		const byId = new Map(rows.map((u) => [String(u.id), u]));
		const merged = new Map();
		for (const au of authUsers) {
			const p = byId.get(String(au.id)) || byEmail.get(String(au.email).toLowerCase());
			merged.set(au.id, {
				id: au.id,
				email: au.email,
				username: p?.username || au.user_metadata?.username || (au.email || '').split('@')[0],
				name: p?.name || au.user_metadata?.name || p?.username || (au.email || '').split('@')[0],
				role: p?.role || au.user_metadata?.role || 'user',
				plan: p?.plan || au.user_metadata?.plan || null,
				accountType: p?.accountType || au.user_metadata?.accountType || 'individual',
				user_settings: p?.user_settings || null,
				paddleCustomerId: p?.paddleCustomerId || null,
				created_at: au.created_at || p?.created_at,
				confirmed: Boolean(au.email_confirmed_at || au.confirmed_at || au.last_sign_in_at),
			});
		}
		for (const u of rows) {
			if (!merged.has(u.id)) {
				merged.set(u.id, {
					id: u.id,
					email: u.email,
					username: u.username || (u.email || '').split('@')[0],
					name: u.name || u.username || (u.email || '').split('@')[0],
					role: u.role || 'user',
					plan: u.plan || null,
					accountType: u.accountType || 'individual',
					user_settings: u.user_settings || null,
					paddleCustomerId: u.paddleCustomerId || null,
					created_at: u.created_at,
					confirmed: true,
				});
			}
		}
		const users = [...merged.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
		res.json(users);
	} catch (err) {
		next(err);
	}
});

async function supabaseRestListUsers() {
	return supabaseRest('/rest/v1/users', {
		query: { select: '*', order: 'created_at.desc', limit: 5000 },
	});
}

async function supabaseRestListAuthUsers() {
	try {
		const data = await supabaseRest('/auth/v1/admin/users', { query: { per_page: 1000 } });
		return Array.isArray(data) ? data : (data?.users || []);
	} catch {
		return [];
	}
}

// ── Trading signals ────────────────────────────────────────────────
// `trading_signals` rows are owner-scoped under RLS, so all admin reads,
// writes and deletes go through the service role here.

router.get('/signals', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/trading_signals', {
			query: { select: '*', order: 'created.desc', limit: 1000 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/signals', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const body = req.body || {};
		const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
		const meta = { ...(body.meta && typeof body.meta === 'object' ? body.meta : {}) };
		if (body.timeframe) meta.timeframe = String(body.timeframe).trim().slice(0, 10);
		if (body.signalType) meta.signalType = String(body.signalType).trim().slice(0, 40);
		if (body.strength) meta.strength = String(body.strength).trim().slice(0, 20);
		if (body.reason) meta.reason = String(body.reason).trim().slice(0, 2000);
		const row = {
			owner: admin.id,
			symbol: String(body.symbol || '').trim().toUpperCase().slice(0, 12) || 'BTCUSD',
			side: String(body.side || 'long').trim().toLowerCase().slice(0, 6),
			entry: num(body.entry),
			target: num(body.target),
			stop: num(body.stop),
			status: ['published', 'draft', 'rejected'].includes(body.status) ? body.status : 'published',
			source: 'admin',
			meta: Object.keys(meta).length ? meta : null,
			created: new Date().toISOString(),
		};
		const created = await supabaseRest('/rest/v1/trading_signals', {
			method: 'POST', body: row, prefer: 'return=representation', query: { select: '*' },
		});
		res.status(201).json(created?.[0] || row);
	} catch (err) { next(err); }
});

router.patch('/signals/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		if (req.body) {
			if ('status' in req.body && ['published', 'draft', 'rejected'].includes(req.body.status)) patch.status = req.body.status;
			if ('side' in req.body) patch.side = String(req.body.side).trim().toLowerCase().slice(0, 6);
			if ('symbol' in req.body) patch.symbol = String(req.body.symbol).trim().toUpperCase().slice(0, 12);
			const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
			if ('entry' in req.body) patch.entry = num(req.body.entry);
			if ('target' in req.body) patch.target = num(req.body.target);
			if ('stop' in req.body) patch.stop = num(req.body.stop);
			if ('meta' in req.body && req.body.meta && typeof req.body.meta === 'object') patch.meta = req.body.meta;
		}
		const updated = await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/signals/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Community forum ────────────────────────────────────────────────
// Reads are public (community is shared), but moderation writes and
// deletes go through the service role to avoid RLS ownership checks.

router.get('/forum', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const [threads, replies] = await Promise.all([
			supabaseRest('/rest/v1/forum_threads', { query: { select: '*', order: 'created.desc', limit: 2000 } }),
			supabaseRest('/rest/v1/forum_replies', { query: { select: '*', limit: 5000 } }),
		]);
		res.json({ threads: threads || [], replies: replies || [] });
	} catch (err) { next(err); }
});

router.patch('/forum/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		const allowed = ['pinned', 'locked'];
		for (const key of allowed) {
			if (req.body && key in req.body) patch[key] = Boolean(req.body[key]);
		}
		await supabaseRest(`/rest/v1/forum_threads?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation',
		});
		res.json({ id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/forum/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const id = req.params.id;
		await supabaseRest(`/rest/v1/forum_replies?thread=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
		await supabaseRest(`/rest/v1/forum_threads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

router.delete('/forum-replies/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/forum_replies?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Generic admin_integrations CRUD (courses, calendar events, etc.) ──
// Content lives in `admin_integrations` under prefixed keys:
//   course:*   — academy course catalog
//   cal_event:* — curated economic calendar events
//   copy:*     — site-copy overrides (see GET /admin/content-copy below)
// The `config` jsonb holds the payload; `enabled` is the publish toggle.

function slugify(raw) {
	return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
}

router.get('/content/:prefix', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const prefix = String(req.params.prefix || '').replace(/[^a-z_-]/gi, '').slice(0, 20);
		if (!prefix) return res.status(400).json({ error: 'invalid prefix' });
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': `like.${prefix}:%`, order: 'created.desc', limit: 500 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/content/:prefix', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const prefix = String(req.params.prefix || '').replace(/[^a-z_-]/gi, '').slice(0, 20);
		if (!prefix) return res.status(400).json({ error: 'invalid prefix' });
		const body = req.body || {};
		const slug = slugify(body.slug || body.title);
		const row = await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: {
				key: `${prefix}:${slug}`,
				provider: String(body.provider || 'admin').slice(0, 20),
				config: body.config && typeof body.config === 'object' ? body.config : {},
				enabled: body.enabled !== false,
			},
			prefer: 'return=representation',
			query: { select: '*' },
		});
		res.status(201).json(row?.[0] || { id: admin.id });
	} catch (err) { next(err); }
});

router.patch('/content/:prefix/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: '*', limit: 1 } });
		const existing = rows?.[0];
		if (!existing) return res.status(404).json({ error: 'item not found' });
		const patch = {};
		const body = req.body || {};
		if (body.config !== undefined && body.config && typeof body.config === 'object') patch.config = { ...(existing.config || {}), ...body.config };
		if (body.enabled !== undefined) patch.enabled = body.enabled !== false;
		const updated = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/content/:prefix/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Public: site-copy overrides (no auth — marketing copy is public) ─
// Admin-curated i18n key → value pairs. The web app merges these over its
// built-in English strings so admins can rewrite page copy without code.
// Rows live under `copy:*` keys with config { key (i18n key), value }.
router.get('/content-copy', async (req, res, next) => {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config', 'key': 'like.copy:%', enabled: 'eq.true', order: 'created.desc', limit: 200 },
		});
		const overrides = {};
		for (const r of rows || []) {
			const k = r?.config?.key || String(r?.key || '').replace(/^copy:/, '');
			const v = r?.config?.value;
			if (k && typeof v === 'string' && v && !(k in overrides)) overrides[k] = v;
		}
		res.json({ overrides });
	} catch (err) { next(err); }
});

// ── System health ────────────────────────────────────────────────
// Live service checks for the admin dashboard (replaces hardcoded ok).
router.get('/health', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const checks = {
			supabase: false,
			smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
			stripe: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY),
			paddle: Boolean(process.env.PADDLE_LIVE_API_KEY || process.env.PADDLE_SANDBOX_API_KEY),
			dnb: Boolean(process.env.DNB_CLIENT_ID && process.env.DNB_CLIENT_SECRET),
		};
		try {
			const ping = await supabaseRest('/auth/v1/admin/users', { query: { per_page: 1 } });
			checks.supabase = ping !== undefined;
		} catch { checks.supabase = false; }
		res.json({
			status: checks.supabase ? 'ok' : 'degraded',
			version: API_VERSION,
			uptimeSec: Math.floor((Date.now() - BOOT_TS) / 1000),
			checks,
		});
	} catch (err) { next(err); }
});

// ── Recent API logs (in-memory ring buffer) ──────────────────────
router.get('/logs', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		res.json(logger.recent(req.query?.limit));
	} catch (err) { next(err); }
});

// ── Billing summary from live Stripe data ────────────────────────
function stripeClient() {
	const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY || '';
	if (!key) return null;
	return new Stripe(key);
}

const BILLING_PRICE_MAP = () => ({
	pro: process.env.STRIPE_PRICE_PRO || '',
	elite: process.env.STRIPE_PRICE_ELITE || '',
	professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
});

router.get('/billing/summary', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const stripe = stripeClient();
		if (!stripe) return res.json({ configured: false });
		const priceToPlan = {};
		for (const [plan, price] of Object.entries(BILLING_PRICE_MAP())) if (price) priceToPlan[price] = plan;
		let mrrCents = 0;
		let activeCount = 0;
		const byPlan = {};
		let startingAfter;
		for (let page = 0; page < 10; page++) {
			const list = await stripe.subscriptions.list({ status: 'active', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
			for (const sub of list.data || []) {
				activeCount++;
				for (const item of sub.items?.data || []) {
					const plan = priceToPlan[item.price?.id] || 'other';
					const amt = (item.price?.unit_amount || 0) * (item.quantity || 1);
					const monthly = item.price?.recurring?.interval === 'year' ? Math.round(amt / 12) : amt;
					mrrCents += monthly;
					byPlan[plan] = (byPlan[plan] || 0) + monthly;
				}
			}
			if (!list.has_more) break;
			startingAfter = list.data?.[list.data.length - 1]?.id;
		}
		res.json({ configured: true, mrr: mrrCents / 100, activeCount, byPlanCents: byPlan, currency: 'usd' });
	} catch (err) { next(err); }
});

// Recent Stripe payments for a user (for admin refunds).
router.get('/billing/payments', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const userId = String(req.query?.userId || '').trim();
		if (!userId) return res.status(400).json({ error: 'userId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const profile = await supabase.getUserById(userId);
		const customerId = profile?.stripeCustomerId;
		if (!customerId) return res.json({ payments: [] });
		const list = await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
		res.json({
			payments: (list.data || []).map((pi) => ({
				id: pi.id, amount: (pi.amount || 0) / 100, currency: pi.currency,
				status: pi.status, created: pi.created ? new Date(pi.created * 1000).toISOString() : null,
			})),
		});
	} catch (err) { next(err); }
});

// Cancel a user's active Stripe subscriptions at period end.
router.post('/billing/cancel', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const userId = String(req.body?.userId || '').trim();
		if (!userId) return res.status(400).json({ error: 'userId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const profile = await supabase.getUserById(userId);
		const customerId = profile?.stripeCustomerId;
		if (!customerId) return res.status(404).json({ error: 'no stripe customer for user' });
		const list = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 20 });
		const canceled = [];
		for (const sub of list.data || []) {
			if (!sub.cancel_at_period_end) await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
			canceled.push(sub.id);
		}
		res.json({ canceled });
	} catch (err) { next(err); }
});

// Refund a Stripe payment intent / charge.
router.post('/billing/refund', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const pi = String(req.body?.paymentIntentId || '').trim();
		if (!pi) return res.status(400).json({ error: 'paymentIntentId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const amount = Number(req.body?.amount);
		const refund = await stripe.refunds.create({
			payment_intent: pi,
			...(Number.isFinite(amount) && amount > 0 ? { amount: Math.round(amount * 100) } : {}),
		});
		res.json({ id: refund.id, amount: (refund.amount || 0) / 100, status: refund.status });
	} catch (err) { next(err); }
});

// ── Real integration connectivity tests ──────────────────────────
router.post('/integrations/test', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const kind = String(req.body?.kind || '').toLowerCase();
		if (kind === 'smtp') {
			const host = String(req.body?.host || '').trim();
			const port = Number(req.body?.port) || 587;
			if (!host) return res.status(400).json({ ok: false, error: 'host required' });
			const tx = createTransport({
				host, port, secure: port === 465,
				auth: req.body?.user ? { user: String(req.body.user), pass: String(req.body?.pass || '') } : undefined,
				connectionTimeout: 8000,
			});
			await tx.verify();
			return res.json({ ok: true, detail: 'SMTP handshake verified' });
		}
		if (kind === 'url') {
			const url = String(req.body?.url || '').trim();
			if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: 'http(s) url required' });
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 8000);
			try {
				const r = await fetch(url, { method: 'GET', signal: ctrl.signal });
				return res.json({ ok: r.ok, detail: `HTTP ${r.status}` });
			} finally { clearTimeout(t); }
		}
		if (kind === 'supabase') {
			const url = String(req.body?.url || '').replace(/\/+$/, '');
			const key = String(req.body?.key || '');
			if (!url || !key) return res.status(400).json({ ok: false, error: 'url + key required' });
			const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
			return res.json({ ok: r.ok, detail: `Auth health HTTP ${r.status}` });
		}
		if (kind === 'stripe') {
			const key = String(req.body?.key || '');
			if (!key) return res.status(400).json({ ok: false, error: 'secret key required' });
			const s = new Stripe(key);
			const bal = await s.balance.retrieve();
			return res.json({ ok: true, detail: `balance reachable (${(bal?.available?.[0]?.currency || '').toUpperCase()})` });
		}
		return res.status(400).json({ ok: false, error: 'unknown kind (smtp|url|supabase|stripe)' });
	} catch (err) {
		return res.json({ ok: false, error: String(err?.message || err).slice(0, 200) });
	}
});

// ── Server-side API keys (sha256, verifiable, revocable) ─────────
const sha256 = (v) => createHash('sha256').update(String(v)).digest('hex');

router.get('/api-keys', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/admin_api_keys', { query: { select: '*', order: 'created.desc', limit: 500 } });
		res.json((rows || []).map((r) => ({
			id: r.id, name: r.name, enabled: r.enabled !== false,
			created: r.created, lastUsedAt: r.lastUsedAt || r.lastusedat || null,
			usageCount: r.usageCount ?? r.usagecount ?? 0,
			permissions: r.permissions || [], assignedTo: r.assignedTo || r.assignedto || null,
			expiresAt: r.expiresAt || r.expiresat || null,
			hint: String(r.keyhash || '').slice(0, 6),
		})));
	} catch (err) { next(err); }
});

router.post('/api-keys', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const name = String(req.body?.name || 'Untitled key').trim().slice(0, 60);
		const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String).slice(0, 20) : [];
		const assignedTo = String(req.body?.assignedTo || '').trim().slice(0, 120) || null;
		const expiresAt = req.body?.expiresAt ? new Date(String(req.body.expiresAt)).toISOString() : null;
		const plain = `tb_live_${randomBytes(24).toString('hex')}`;
		const created = await supabaseRest('/rest/v1/admin_api_keys', {
			method: 'POST',
			body: { owner: admin.id, name, keyhash: sha256(plain), enabled: true, permissions, assignedTo, expiresAt, usageCount: 0 },
			prefer: 'return=representation', query: { select: '*' },
		});
		const row = created?.[0] || {};
		res.status(201).json({ id: row.id, name, key: plain, hint: sha256(plain).slice(0, 6) });
	} catch (err) { next(err); }
});

router.post('/api-keys/verify', async (req, res) => {
	try {
		const key = String(req.body?.key || '');
		if (!key) return res.status(400).json({ valid: false });
		const rows = await supabaseRest('/rest/v1/admin_api_keys', {
			query: { select: '*', keyhash: `eq.${sha256(key)}`, limit: 1 },
		});
		const row = rows?.[0];
		if (!row) return res.json({ valid: false, reason: 'unknown' });
		if (row.enabled === false) return res.json({ valid: false, reason: 'revoked' });
		const exp = row.expiresAt || row.expiresat;
		if (exp && new Date(exp).getTime() < Date.now()) return res.json({ valid: false, reason: 'expired' });
		const usage = Number(row.usageCount ?? row.usagecount ?? 0) + 1;
		await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(row.id)}`, {
			method: 'PATCH', body: { lastUsedAt: new Date().toISOString(), usageCount: usage },
		}).catch(() => {});
		res.json({ valid: true, name: row.name, permissions: row.permissions || [] });
	} catch {
		res.status(500).json({ valid: false });
	}
});

router.patch('/api-keys/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const updated = await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { enabled: req.body?.enabled !== false },
			prefer: 'return=representation', query: { select: 'id,enabled' },
		});
		res.json(updated?.[0] || { id: req.params.id });
	} catch (err) { next(err); }
});

router.delete('/api-keys/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Jobs board management (postings + applications) ──────────────
router.get('/jobs/postings', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/job_postings', {
			query: { select: '*', order: 'created.desc', limit: 200 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/jobs/postings', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const title = String(req.body?.title || '').trim().slice(0, 120);
		if (!title) return res.status(400).json({ error: 'title required' });
		const created = await supabaseRest('/rest/v1/job_postings', {
			method: 'POST',
			body: {
				title,
				department: String(req.body?.department || 'Academy').slice(0, 60),
				employmentType: String(req.body?.employmentType || 'full-time').slice(0, 40),
				location: String(req.body?.location || 'Remote').slice(0, 80),
				description: String(req.body?.description || '').slice(0, 8000),
				requirements: String(req.body?.requirements || '').slice(0, 4000),
				status: req.body?.status === 'closed' ? 'closed' : 'open',
			},
			prefer: 'return=representation', query: { select: '*' },
		});
		res.status(201).json(created?.[0] || {});
	} catch (err) { next(err); }
});

router.patch('/jobs/postings/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		for (const k of ['title', 'department', 'employmentType', 'location', 'description', 'requirements']) {
			if (req.body?.[k] !== undefined) patch[k] = String(req.body[k]).slice(0, 8000);
		}
		if (req.body?.status !== undefined) patch.status = req.body.status === 'closed' ? 'closed' : 'open';
		const updated = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id });
	} catch (err) { next(err); }
});

router.delete('/jobs/postings/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

router.get('/jobs/applications', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/job_applications', {
			query: { select: '*,job_postings(title)', order: 'created.desc', limit: 500 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.patch('/jobs/applications/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const status = String(req.body?.status || '');
		if (!['new', 'reviewing', 'shortlisted', 'rejected', 'hired'].includes(status)) {
			return res.status(400).json({ error: 'invalid status' });
		}
		const updated = await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { status }, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, status });
	} catch (err) { next(err); }
});

export default router;
