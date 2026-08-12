import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';

const router = Router();

// TradingBible TV ad system.
// Ads live in `admin_integrations` (key = "ad:<slug>") with the campaign in the
// jsonb `config` column; `enabled` is the publish toggle. TV behaviour lives in
// `branding_settings` under key "tv_ads". No schema changes needed.

function slugify(raw) {
	return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'ad';
}

function cleanUrl(raw) {
	const value = String(raw || '').trim();
	if (!value) return '';
	return value.startsWith('http://') || value.startsWith('https://') ? value : '';
}

function sanitizeConfig(raw) {
	const c = raw && typeof raw === 'object' ? raw : {};
	return {
		title: String(c.title || '').trim().slice(0, 120),
		headline: String(c.headline || '').trim().slice(0, 300),
		imageUrl: cleanUrl(c.imageUrl),
		logoUrl: cleanUrl(c.logoUrl),
		linkUrl: cleanUrl(c.linkUrl),
		cta: String(c.cta || 'Learn more').trim().slice(0, 40),
		accent: String(c.accent || '#d4af37').slice(0, 9),
		durationSeconds: Math.max(4, Math.min(60, Number(c.durationSeconds) || 12)),
		snippet: String(c.snippet || '').slice(0, 12000),
		views: Number(c.views) || 0,
		clicks: Number(c.clicks) || 0,
		notes: String(c.notes || '').slice(0, 500),
	};
}

function publicAd(row) {
	const c = row?.config && typeof row.config === 'object' ? row.config : {};
	return {
		id: row.id,
		key: row.key,
		provider: row.provider || 'brand',
		title: c.title || '',
		headline: c.headline || '',
		imageUrl: c.imageUrl || '',
		logoUrl: c.logoUrl || '',
		linkUrl: c.linkUrl || '',
		cta: c.cta || 'Learn more',
		accent: c.accent || '#d4af37',
		durationSeconds: Math.max(4, Math.min(60, Number(c.durationSeconds) || 12)),
		snippet: c.snippet || '',
	};
}

async function getAuthedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const authUser = await getSupabaseUser(token);
	return authUser?.id ? authUser : null;
}

async function isAdmin(req) {
	try {
		const user = await getAuthedUser(req);
		if (!user) return false;
		const row = await supabase.getUserById(user.id);
		return row?.role === 'admin' || row?.user_role === 'admin';
	} catch {
		return false;
	}
}

// ── Public: feed for the TV widget (no auth required) ────────────
router.get('/', async (req, res) => {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': 'like.ad:%', enabled: 'eq.true', order: 'created.asc', limit: 100 },
		});
		const settingsRow = await supabaseRest('/rest/v1/branding_settings?key=eq.tv_ads', { query: { select: '*', limit: 1 } })
			.then((r) => r?.[0] || null).catch(() => null);

		const stored = settingsRow?.value && typeof settingsRow.value === 'object' ? settingsRow.value : {};
		const settings = {
			rotationSeconds: Math.max(4, Math.min(60, Number(stored.rotationSeconds) || 12)),
			autoOpenIntervalMinutes: Math.max(0, Number(stored.autoOpenIntervalMinutes) || 0),
			headerText: String(stored.headerText || 'TradingBible TV').slice(0, 60),
			footerText: String(stored.footerText || 'Advertise with TradingBible').slice(0, 120),
			advertiserEmail: String(stored.advertiserEmail || 'ads@tradingbible.app').slice(0, 120),
		};

		const ads = Array.isArray(rows) ? rows.filter((r) => String(r.key || '').startsWith('ad:')).map(publicAd) : [];
		return res.json({ settings, ads });
	} catch (err) {
		logger.error('ads list failed', String(err));
		return res.status(500).json({ error: 'failed to load ads' });
	}
});

// ── Public: view / click counters ────────────────────────────────
router.post('/:id/view', async (req, res) => {
	try {
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: 'id,config', limit: 1 } });
		const row = rows?.[0];
		if (!row) return res.status(404).json({ error: 'ad not found' });
		const config = sanitizeConfig({ ...(row.config || {}), views: (Number(row.config?.views) || 0) + 1 });
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', body: { config }, prefer: 'return=minimal' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('ad view failed', String(err));
		return res.status(500).json({ error: 'tracking failed' });
	}
});

router.post('/:id/click', async (req, res) => {
	try {
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: 'id,config', limit: 1 } });
		const row = rows?.[0];
		if (!row) return res.status(404).json({ error: 'ad not found' });
		const config = sanitizeConfig({ ...(row.config || {}), clicks: (Number(row.config?.clicks) || 0) + 1 });
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', body: { config }, prefer: 'return=minimal' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('ad click failed', String(err));
		return res.status(500).json({ error: 'tracking failed' });
	}
});

// ── Admin: list all (with stats) ─────────────────────────────────
router.get('/admin/list', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': 'like.ad:%', order: 'created.desc', limit: 500 },
		});
		const ads = (Array.isArray(rows) ? rows : []).map((r) => ({
			...r,
			config: sanitizeConfig(r.config),
		}));
		return res.json({ ads });
	} catch (err) {
		logger.error('admin ads list failed', String(err));
		return res.status(500).json({ error: 'failed to list ads' });
	}
});

// ── Admin: create ────────────────────────────────────────────────
router.post('/admin', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const body = req.body || {};
		const slug = slugify(body.slug || body.title);
		const config = sanitizeConfig(body.config || {});
		const row = await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: { key: `ad:${slug}`, provider: String(body.provider || 'brand').slice(0, 20), config, enabled: body.enabled !== false },
			prefer: 'return=representation',
		});
		return res.json({ ad: { ...row?.[0], config } });
	} catch (err) {
		logger.error('admin ad create failed', String(err));
		return res.status(500).json({ error: 'failed to create ad' });
	}
});

// ── Admin: update ────────────────────────────────────────────────
router.patch('/admin/:id', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: '*', limit: 1 } });
		const existing = rows?.[0];
		if (!existing) return res.status(404).json({ error: 'ad not found' });

		const patch = {};
		const body = req.body || {};
		if (body.config !== undefined) patch.config = sanitizeConfig({ ...(existing.config || {}), ...body.config });
		if (body.enabled !== undefined) patch.enabled = body.enabled !== false;
		if (body.provider !== undefined) patch.provider = String(body.provider).slice(0, 20);

		const updated = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation',
		});
		return res.json({ ad: { ...updated?.[0], config: patch.config || existing.config } });
	} catch (err) {
		logger.error('admin ad update failed', String(err));
		return res.status(500).json({ error: 'failed to update ad' });
	}
});

// ── Admin: delete ────────────────────────────────────────────────
router.delete('/admin/:id', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('admin ad delete failed', String(err));
		return res.status(500).json({ error: 'failed to delete ad' });
	}
});

// ── Admin: TV settings ───────────────────────────────────────────
router.put('/admin/settings', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const body = req.body || {};
		const value = {
			rotationSeconds: Math.max(4, Math.min(60, Number(body.rotationSeconds) || 12)),
			autoOpenIntervalMinutes: Math.max(0, Math.min(1440, Number(body.autoOpenIntervalMinutes) || 0)),
			headerText: String(body.headerText || 'TradingBible TV').slice(0, 60),
			footerText: String(body.footerText || 'Advertise with TradingBible').slice(0, 120),
			advertiserEmail: String(body.advertiserEmail || 'ads@tradingbible.app').slice(0, 120),
		};
		const existing = await supabaseRest('/rest/v1/branding_settings?key=eq.tv_ads', { query: { select: '*', limit: 1 } })
			.then((r) => r?.[0] || null).catch(() => null);
		if (existing) {
			await supabaseRest(`/rest/v1/branding_settings?key=eq.tv_ads`, { method: 'PATCH', body: { value } });
		} else {
			await supabaseRest('/rest/v1/branding_settings', { method: 'POST', body: { key: 'tv_ads', value } });
		}
		return res.json({ settings: value });
	} catch (err) {
		logger.error('admin tv settings failed', String(err));
		return res.status(500).json({ error: 'failed to save settings' });
	}
});

export default router;
