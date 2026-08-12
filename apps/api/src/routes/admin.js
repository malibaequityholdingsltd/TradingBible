import { Router } from 'express';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

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
				plan: p?.plan || 'trial',
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
					plan: u.plan || 'trial',
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

export default router;
