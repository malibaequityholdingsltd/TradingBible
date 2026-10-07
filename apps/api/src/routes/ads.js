import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';

const router = Router();

// TradingBible TV ad system + live channel guide.
// Ads AND live channels live in `admin_integrations` (key = "ad:<slug>" or
// "channel:<slug>") with the payload in the jsonb `config` column; `enabled`
// is the publish toggle. TV behaviour lives in `branding_settings` under key
// "tv_ads". No schema changes needed.

function slugify(raw) {
	return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'ad';
}

function cleanUrl(raw) {
	const value = String(raw || '').trim();
	if (!value) return '';
	return value.startsWith('http://') || value.startsWith('https://') ? value : '';
}

function sanitizeChannel(raw) {
	const c = raw && typeof raw === 'object' ? raw : {};
	const plan = String(c.plan || 'pro').toLowerCase();
	return {
		title: String(c.title || '').trim().slice(0, 80),
		desk: String(c.desk || 'Live').trim().slice(0, 24),
		url: cleanUrl(c.url),
		embedUrl: cleanUrl(c.embedUrl),
		blurb: String(c.blurb || '').trim().slice(0, 160),
		isNew: c.isNew === true,
		plan: ['pro', 'elite', 'professional'].includes(plan) ? plan : 'pro',
	};
}

function publicChannel(row) {
	const c = sanitizeChannel(row?.config);
	return {
		id: row.id,
		key: row.key,
		title: c.title || 'Live channel',
		desk: c.desk,
		url: c.url,
		embedUrl: c.embedUrl,
		blurb: c.blurb,
		isNew: c.isNew,
		plan: c.plan,
	};
}

function sanitizeConfig(raw) {
	const c = raw && typeof raw === 'object' ? raw : {};
	// Per-language overrides: { hi: { title, headline, cta, snippet }, ... }.
	// Lets house/brand ads render translated copy while keeping one ad row.
	const LANGS = ['en', 'fr', 'es', 'pt', 'de', 'ar', 'zh', 'hi'];
	const i18n = {};
	if (c.i18n && typeof c.i18n === 'object') {
		for (const lng of LANGS) {
			const ov = c.i18n[lng];
			if (ov && typeof ov === 'object') {
				i18n[lng] = {
					...(ov.title ? { title: String(ov.title).trim().slice(0, 120) } : {}),
					...(ov.headline ? { headline: String(ov.headline).trim().slice(0, 300) } : {}),
					...(ov.cta ? { cta: String(ov.cta).trim().slice(0, 40) } : {}),
					...(ov.snippet ? { snippet: String(ov.snippet).slice(0, 12000) } : {}),
				};
			}
		}
	}
	const AD_TYPE_LIST = ['banner', 'video', 'native', 'interstitial', 'rewarded', 'sticky', 'app_open', 'amp', 'story'];
	const type = String(c.type || 'banner').trim().toLowerCase();
	const cleanList = (v, max = 20) => Array.isArray(v)
		? v.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 60)).slice(0, max)
		: [];
	const cleanJsonList = (v, max = 20) => Array.isArray(v) ? v.filter((r) => r && typeof r === 'object').slice(0, max) : [];
	const cleanPage = (p) => {
		const o = p && typeof p === 'object' ? p : {};
		return {
			...(o.title ? { title: String(o.title).slice(0, 120) } : {}),
			...(o.headline ? { headline: String(o.headline).slice(0, 300) } : {}),
			...(o.imageUrl ? { imageUrl: cleanUrl(o.imageUrl) } : {}),
			...(o.videoUrl ? { videoUrl: cleanUrl(o.videoUrl) } : {}),
			...(o.cta ? { cta: String(o.cta).slice(0, 40) } : {}),
			...(o.linkUrl ? { linkUrl: cleanUrl(o.linkUrl) } : {}),
		};
	};
	return {
		title: String(c.title || '').trim().slice(0, 120),
		headline: String(c.headline || '').trim().slice(0, 300),
		imageUrl: cleanUrl(c.imageUrl),
		videoUrl: cleanUrl(c.videoUrl),
		logoUrl: cleanUrl(c.logoUrl),
		linkUrl: cleanUrl(c.linkUrl),
		cta: String(c.cta || 'Learn more').trim().slice(0, 40),
		accent: String(c.accent || '#d4af37').slice(0, 9),
		durationSeconds: Math.max(4, Math.min(60, Number(c.durationSeconds) || 12)),
		snippet: String(c.snippet || '').slice(0, 12000),
		views: Number(c.views) || 0,
		clicks: Number(c.clicks) || 0,
		notes: String(c.notes || '').slice(0, 500),
		i18n,
		// ── Serving framework fields (placements, targeting, experiments) ──
		type: AD_TYPE_LIST.includes(type) ? type : 'banner',
		weight: Math.max(0, Number(c.weight ?? 1) || 0),
		priority: Math.trunc(Number(c.priority) || 0),
		placementIds: cleanList(c.placementIds),
		targeting: cleanJsonList(c.targeting),
		frequencyCaps: cleanJsonList(c.frequencyCaps, 10),
		dayparting: cleanJsonList(c.dayparting, 14),
		pages: cleanJsonList(c.pages, 10).map(cleanPage),
		vastXml: String(c.vastXml || '').slice(0, 100000),
		vmapXml: String(c.vmapXml || '').slice(0, 100000),
		storyDurationSeconds: Math.max(1, Math.min(30, Number(c.storyDurationSeconds) || 5)),
		ampWidth: Math.max(1, Math.min(2000, Math.trunc(Number(c.ampWidth) || 320))),
		ampHeight: Math.max(1, Math.min(2000, Math.trunc(Number(c.ampHeight) || 100))),
		ampSlot: String(c.ampSlot || '').trim().slice(0, 80),
		rewardAmount: String(c.rewardAmount || '').trim().slice(0, 24),
		startDate: String(c.startDate || '').trim().slice(0, 32),
		endDate: String(c.endDate || '').trim().slice(0, 32),
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
		videoUrl: c.videoUrl || '',
		logoUrl: c.logoUrl || '',
		linkUrl: c.linkUrl || '',
		cta: c.cta || 'Learn more',
		accent: c.accent || '#d4af37',
		durationSeconds: Math.max(4, Math.min(60, Number(c.durationSeconds) || 12)),
		snippet: c.snippet || '',
		i18n: c.i18n && typeof c.i18n === 'object' ? c.i18n : {},
		type: c.type || 'banner',
		weight: Number(c.weight ?? 1) || 0,
		priority: Math.trunc(Number(c.priority) || 0),
		placementIds: Array.isArray(c.placementIds) ? c.placementIds : [],
		targeting: Array.isArray(c.targeting) ? c.targeting : [],
		frequencyCaps: Array.isArray(c.frequencyCaps) ? c.frequencyCaps : [],
		dayparting: Array.isArray(c.dayparting) ? c.dayparting : [],
		pages: Array.isArray(c.pages) ? c.pages : [],
		vastXml: c.vastXml || '',
		vmapXml: c.vmapXml || '',
		storyDurationSeconds: c.storyDurationSeconds || 5,
		ampWidth: c.ampWidth || 320,
		ampHeight: c.ampHeight || 100,
		ampSlot: c.ampSlot || '',
		rewardAmount: c.rewardAmount || '',
		startDate: c.startDate || '',
		endDate: c.endDate || '',
	};
}

// Curated in-app placements (served to AdSlot clients). House ads with an
// empty placementIds list are eligible everywhere.
const AD_PLACEMENTS = [
	{ id: 'ph_dashboard_top', name: 'Dashboard Top Banner', type: 'header', allowedAdTypes: ['banner', 'amp'] },
	{ id: 'ph_academy_feed', name: 'Academy In-Feed', type: 'in_feed', allowedAdTypes: ['native', 'video', 'amp'] },
	{ id: 'ph_blog_feed', name: 'Blog In-Feed', type: 'in_feed', allowedAdTypes: ['native', 'video', 'amp'] },
	{ id: 'ph_story', name: 'Story Fullscreen', type: 'story', allowedAdTypes: ['story'] },
];

// ── Public: placement directory for AdSlot clients ───────────────
router.get('/placements', async (req, res) => {
	return res.json({ placements: AD_PLACEMENTS });
});

// ── Authed: experiment exposure / conversion ping (best effort) ───
// Powers the admin experiments report. Assignment stays client-side in
// localStorage; these pings only aggregate counts server-side.
router.post('/experiments/track', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const experimentId = String(req.body?.experimentId || '').trim().slice(0, 80);
	const variantId = String(req.body?.variantId || '').trim().slice(0, 80);
	const event = String(req.body?.event || '').trim();
	const metric = String(req.body?.metric || '').trim().slice(0, 80);
	if (!experimentId || !variantId) return res.status(422).json({ error: 'experiment + variant required' });
	if (event !== 'exposure' && event !== 'conversion') return res.status(422).json({ error: 'unknown event' });
	try {
		await supabase.createEvent?.({
			owner: user.id,
			eventType: `adexp.${event}`,
			status: experimentId,
			transactionId: variantId,
			planName: metric,
			amount: Number(req.body?.value || 1) || 1,
			currency: 'USD',
			occurredAt: new Date().toISOString(),
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('ad experiment track failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: experiment stats (exposures + conversions per variant) ──
router.get('/admin/experiments/stats', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const rows = await supabaseRest('/rest/v1/billing_events', {
			query: { select: 'eventType,status,transactionId,planName,amount', eventType: 'in.(adexp.exposure,adexp.conversion)', order: 'occurredAt.desc', limit: 5000 },
		});
		const experiments = {};
		for (const r of rows || []) {
			const expId = r.status || 'unknown';
			const varId = r.transactionId || 'unknown';
			const metric = r.planName || 'conversion';
			const exp = (experiments[expId] ??= { id: expId, variants: {} });
			const v = (exp.variants[varId] ??= { id: varId, exposures: 0, metrics: {} });
			if (r.eventType === 'adexp.exposure') v.exposures += 1;
			else v.metrics[metric] = (v.metrics[metric] || 0) + (Number(r.amount) || 1);
		}
		return res.json({ experiments: Object.values(experiments) });
	} catch (err) {
		logger.error('ad experiment stats failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

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
		const [adRows, channelRows] = await Promise.all([
			supabaseRest('/rest/v1/admin_integrations', {
				query: { select: '*', 'key': 'like.ad:%', enabled: 'eq.true', order: 'created.asc', limit: 100 },
			}),
			supabaseRest('/rest/v1/admin_integrations', {
				query: { select: '*', 'key': 'like.channel:%', enabled: 'eq.true', order: 'created.asc', limit: 100 },
			}).catch(() => []),
		]);
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

		const ads = Array.isArray(adRows) ? adRows.filter((r) => String(r.key || '').startsWith('ad:')).map(publicAd) : [];
		const channels = Array.isArray(channelRows)
			? channelRows.filter((r) => String(r.key || '').startsWith('channel:')).map(publicChannel).filter((c) => c.url)
			: [];
		return res.json({ settings, ads, channels });
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

// ── Admin: live channels list ────────────────────────────────────
router.get('/admin/channels/list', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': 'like.channel:%', order: 'created.desc', limit: 200 },
		});
		const channels = (Array.isArray(rows) ? rows : []).map((r) => ({
			id: r.id, key: r.key, provider: r.provider, enabled: r.enabled, created: r.created,
			config: sanitizeChannel(r.config),
		}));
		return res.json({ channels });
	} catch (err) {
		logger.error('admin channels list failed', String(err));
		return res.status(500).json({ error: 'failed to list channels' });
	}
});

// ── Admin: live channel create ───────────────────────────────────
router.post('/admin/channels', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const body = req.body || {};
		const slug = slugify(body.slug || body.title);
		const config = sanitizeChannel(body.config || {});
		if (!config.url) return res.status(422).json({ error: 'A valid https URL is required' });
		const row = await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: { key: `channel:${slug}`, provider: String(body.provider || 'custom').slice(0, 20), config, enabled: body.enabled !== false },
			prefer: 'return=representation',
		});
		return res.json({ channel: { ...row?.[0], config } });
	} catch (err) {
		logger.error('admin channel create failed', String(err));
		return res.status(500).json({ error: 'failed to create channel' });
	}
});

// ── Admin: live channel update ───────────────────────────────────
router.patch('/admin/channels/:id', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: '*', limit: 1 } });
		const existing = rows?.[0];
		if (!existing || !String(existing.key || '').startsWith('channel:')) {
			return res.status(404).json({ error: 'channel not found' });
		}
		const patch = {};
		const body = req.body || {};
		if (body.config !== undefined) patch.config = sanitizeChannel({ ...(existing.config || {}), ...body.config });
		if (body.enabled !== undefined) patch.enabled = body.enabled !== false;
		const updated = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation',
		});
		return res.json({ channel: { ...updated?.[0], config: patch.config || existing.config } });
	} catch (err) {
		logger.error('admin channel update failed', String(err));
		return res.status(500).json({ error: 'failed to update channel' });
	}
});

// ── Admin: live channel delete ───────────────────────────────────
router.delete('/admin/channels/:id', async (req, res) => {
	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
	try {
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('admin channel delete failed', String(err));
		return res.status(500).json({ error: 'failed to delete channel' });
	}
});

// ── Public: live-status probe ──────────────────────────────────────
// POST /ads/channels/live { channels: [{ id, url, embedUrl }] }
// Checks whether each YouTube channel/video is broadcasting RIGHT NOW by
// resolving the channel's /live redirect (lands on watch?v=… when live) or
// inspecting the video page for the live flag. No API key needed.
// Results are cached 180s keyed by channel set. States: true (live),
// false (off-air), null (unknown — page blocked, non-YouTube, or error).
// Never marks a channel off-air on fetch failure.
const liveCache = { key: '', at: 0, result: null };
const LIVE_TTL_MS = 300000;

function extractChannelId(url) {
	const m = String(url || '').match(/[?&]channel=(UC[A-Za-z0-9_-]{22})/);
	return m ? m[1] : null;
}

function extractVideoId(url) {
	const m = String(url || '').match(/\/embed\/([A-Za-z0-9_-]{11})/);
	return m ? m[1] : null;
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const YT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// YouTube serves stub pages to plain Node fetch (HTTP/1.1 bot fingerprint),
// so probes go through curl, which receives full pages. Failures and stubs
// resolve to live:null downstream — never a false off-air.
async function fetchText(url, timeoutMs = 8000) {
	try {
		const secs = Math.max(3, Math.ceil(timeoutMs / 1000));
		const { stdout } = await execFileAsync('curl', [
			'-sL', '--max-time', String(secs),
			'-A', YT_UA,
			'-H', 'Accept-Language: en-US,en;q=0.9',
			'-w', '\n__FINAL_URL__:%{url_effective}',
			url,
		], { maxBuffer: 16 * 1024 * 1024 });
		const out = String(stdout || '');
		const marker = out.lastIndexOf('\n__FINAL_URL__:');
		const finalUrl = marker >= 0 ? out.slice(marker + 15).trim() : url;
		const text = marker >= 0 ? out.slice(0, marker) : out;
		return { url: finalUrl || url, text };
	} catch {
		return { url, text: '' };
	}
}

// The only trustworthy "broadcasting right now" flag in YouTube's HTML is
// "isLiveNow":true on a video's watch page. Channel /live pages mix VOD,
// upcoming and live contexts, so a channel probe is always two-step:
//  1. fetch the channel /live page, collect candidate video ids
//  2. confirm via each candidate's watch page until one shows isLiveNow
// Anything inconclusive returns live:null — never a false off-air.
// The live broadcast is usually the FIRST video on the /live page, but
// premieres/trailers can precede it — check up to 5 candidates so a live
// desk is never misreported off-air.
function candidateVideoIds(html, max = 5) {
	const out = [];
	const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
	let m;
	while ((m = re.exec(html)) && out.length < max) {
		if (!out.includes(m[1])) out.push(m[1]);
	}
	return out;
}

async function watchIsLiveNow(videoId) {
	try {
		const { text } = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
		if (!text || text.length < 50000) return null;
		if (/"isLiveNow"\s*:\s*true/.test(text)) return true;
		if (/"isLiveNow"\s*:\s*false/.test(text)) return false;
		return null;
	} catch {
		return null;
	}
}

// Live video title via oEmbed (tiny JSON, no key): lets the guide show the
// CURRENT broadcast name and refresh it every poll — desks that open a new
// live with a different name update automatically.
async function liveVideoTitle(videoId) {
	try {
		const { text } = await fetchText(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, 6000);
		const clean = String(text || '').split('\n__FINAL_URL__:')[0].trim();
		const data = JSON.parse(clean);
		const t = String(data?.title || '').trim();
		return t ? t.slice(0, 90) : null;
	} catch {
		return null;
	}
}

async function probeChannel({ url, embedUrl }) {
	const target = String(embedUrl || url || '');
	try {
		const channelId = extractChannelId(target) || extractChannelId(url);
		// Preferred: YouTube Data API when a key is configured (set
		// YOUTUBE_API_KEY in the API env — reliable, no scraping).
		if (channelId && process.env.YOUTUBE_API_KEY) {
			try {
				const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${process.env.YOUTUBE_API_KEY}`;
				const ctrl = new AbortController();
				const timer = setTimeout(() => ctrl.abort(), 8000);
				const res = await fetch(apiUrl, { signal: ctrl.signal });
				clearTimeout(timer);
				if (res.ok) {
					const data = await res.json().catch(() => null);
					const vid = data?.items?.[0]?.id?.videoId;
					return vid ? { live: true, videoId: vid } : { live: false };
				}
			} catch { /* fall through to scraping */ }
		}
		if (channelId) {
			const { text } = await fetchText(`https://www.youtube.com/channel/${channelId}/live`);
			if (!text || text.length < 50000) return { live: null };
			const candidates = candidateVideoIds(text);
			if (!candidates.length) return { live: null };
			let sawFalse = false;
			for (const vid of candidates) {
				const flag = await watchIsLiveNow(vid);
				if (flag === true) return { live: true, videoId: vid };
				if (flag === false) sawFalse = true;
			}
			return sawFalse ? { live: false } : { live: null };
		}
		const videoId = extractVideoId(target);
		if (videoId) {
			const flag = await watchIsLiveNow(videoId);
			if (flag === true) return { live: true, videoId };
			if (flag === false) return { live: false };
			return { live: null };
		}
		return { live: null };
	} catch {
		return { live: null };
	}
}

router.post('/channels/live', async (req, res) => {
	try {
		const list = Array.isArray(req.body?.channels) ? req.body.channels.slice(0, 40) : [];
		const key = list.map((c) => String(c?.id || c?.url || '')).sort().join('|');
		const now = Date.now();
		if (liveCache.key === key && now - liveCache.at < LIVE_TTL_MS && liveCache.result) {
			return res.json({ ...liveCache.result, cached: true });
		}
		const states = {};
		await Promise.all(list.map(async (c) => {
			const id = String(c?.id || c?.url || 'unknown');
			states[id] = await probeChannel(c);
		}));
		// Attach the CURRENT broadcast name to every confirmed live desk —
		// guides refresh it each poll, so renames track automatically.
		await Promise.all(Object.entries(states).map(async ([id, st]) => {
			if (st?.live === true && st?.videoId && !st?.title) {
				const title = await liveVideoTitle(st.videoId);
				if (title) states[id] = { ...st, title };
			}
		}));
		const result = { states, checkedAt: new Date(now).toISOString(), cached: false };
		liveCache.key = key;
		liveCache.at = now;
		liveCache.result = result;
		return res.json(result);
	} catch (err) {
		logger.error('channels live probe failed', String(err));
		return res.status(500).json({ error: 'live check failed' });
	}
});

// ── Admin: TV settings ───────────────────────────────────────────
router.put('/admin/settings', async (req, res) => {	if (!(await isAdmin(req))) return res.status(403).json({ error: 'forbidden' });
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
