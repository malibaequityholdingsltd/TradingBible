import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';

// ── Signal marketplace + mentorship ──────────────────────────────
// Creators list signals with a price; subscribers pay monthly per creator
// (75% creator / 25% platform, settled in ledger rows). Mentorship works
// the same way per booking (85/15). Money never leaves the ledger.

const router = Router();
const CREATOR_SHARE = 0.75;
const MENTOR_SHARE = 0.85;
const PLATFORM_OWNER = 'platform';

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

async function ledgerBalance(owner) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: 'amount,asset,status', owner: `eq.${owner}`, limit: 5000 },
	}).catch(() => []);
	return (rows || []).reduce((s, r) => s + (r.status === 'failed' || (r.asset || 'USD') !== 'USD' ? 0 : (Number(r.amount) || 0)), 0);
}

async function ledger(owner, kind, amount, reference, asset, opts = {}) {
	await supabaseRest('/rest/v1/bank_transactions', {
		method: 'POST',
		body: { owner, kind, amount, currency: opts.currency || 'USD', status: 'completed', reference, counterparty: 'marketplace', asset, fiatValue: opts.fiatValue ?? Math.abs(Number(amount) || 0) },
		prefer: 'return=representation',
	});
}

async function displayNames(ids) {
	if (!ids.length) return {};
	try {
		const rows = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,username,name', id: `in.(${ids.map(encodeURIComponent).join(',')})`, limit: 200 },
		});
		return Object.fromEntries((rows || []).map((u) => [u.id, u.username || u.name || 'Trader']));
	} catch { return {}; }
}

// ── Creator price (per-creator monthly subscription, USD) ────────
router.post('/price', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const price = Math.max(0, Math.min(1000, Number(req.body?.price ?? 0)));
	try {
		await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: { key: `creatorprice:${user.id}`, provider: 'market', config: { price }, enabled: price > 0 },
			prefer: 'return=representation,resolution=merge-duplicates',
		});
		return res.json({ ok: true, price });
	} catch (err) {
		logger.error('market price failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── List / unlist own signal ─────────────────────────────────────
router.post('/list/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const price = Math.max(0, Math.min(1000, Number(req.body?.price ?? 0)));
	try {
		const rows = await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}&owner=eq.${user.id}`, {
			query: { select: 'id,meta', limit: 1 },
		});
		const sig = rows?.[0];
		if (!sig) return res.status(404).json({ error: 'signal not found' });
		const meta = { ...((sig.meta && typeof sig.meta === 'object') ? sig.meta : {}), marketplace: true, price };
		await supabaseRest(`/rest/v1/trading_signals?id=eq.${sig.id}`, { method: 'PATCH', body: { meta } });
		return res.json({ ok: true, price });
	} catch (err) {
		logger.error('market list failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.post('/unlist/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}&owner=eq.${user.id}`, {
			query: { select: 'id,meta', limit: 1 },
		});
		const sig = rows?.[0];
		if (!sig) return res.status(404).json({ error: 'signal not found' });
		const meta = { ...((sig.meta && typeof sig.meta === 'object') ? sig.meta : {}) };
		delete meta.marketplace;
		await supabaseRest(`/rest/v1/trading_signals?id=eq.${sig.id}`, { method: 'PATCH', body: { meta } });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('market unlist failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Marketplace feed (teasers; full detail for subscribers/owners) ─
router.get('/signals', async (req, res) => {
	const user = await authedUser(req);
	try {
		const [sigs, subs, prices] = await Promise.all([
			supabaseRest('/rest/v1/trading_signals', { query: { select: 'id,owner,symbol,side,entry,target,stop,status,created,meta', order: 'created.desc', limit: 200 } }).catch(() => []),
			user ? supabaseRest('/rest/v1/signal_subscriptions', { query: { select: 'creator', owner: `eq.${user.id}`, status: 'eq.active', limit: 100 } }).catch(() => []) : [],
			supabaseRest('/rest/v1/admin_integrations', { query: { select: 'key,config', 'key': 'like.creatorprice:%', enabled: 'eq.true', limit: 200 } }).catch(() => []),
		]);
		const listed = (sigs || []).filter((s) => s?.meta?.marketplace === true);
		const mySubs = new Set((subs || []).map((s) => s.creator));
		const priceBy = {};
		for (const p of prices || []) priceBy[String(p.key).replace(/^creatorprice:/, '')] = Number(p?.config?.price) || 0;
		const names = await displayNames([...new Set(listed.map((s) => s.owner))]);
	 return res.json({
			signals: listed.slice(0, 50).map((s) => {
				const mine = user && s.owner === user.id;
				const price = Number(s?.meta?.price ?? priceBy[s.owner] ?? 0);
				const unlocked = mine || mySubs.has(s.owner) || price <= 0;
				return {
					id: s.id, creator: names[s.owner] || 'Trader', creatorId: s.owner,
					symbol: s.symbol, side: s.side, status: s.status, created: s.created,
					price,
					subscribed: mySubs.has(s.owner),
					entry: unlocked ? s.entry : null,
					target: unlocked ? s.target : null,
					stop: unlocked ? s.stop : null,
				};
			}),
		});
	} catch (err) {
		logger.error('market feed failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Subscribe to a creator (wallet split 75/25) ──────────────────
router.post('/subscribe', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const creator = String(req.body?.creator || '').trim();
	if (!creator || creator === user.id) return res.status(422).json({ error: 'invalid creator' });
	try {
		const existing = await supabaseRest('/rest/v1/signal_subscriptions', {
			query: { select: 'id', owner: `eq.${user.id}`, creator: `eq.${creator}`, limit: 1 },
		}).catch(() => []);
		if (existing?.length) return res.json({ ok: true, already: true });
		const priceRows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.creatorprice:${creator}`, limit: 1 },
		}).catch(() => []);
		const price = Number(priceRows?.[0]?.config?.price) || 0;
		if (price <= 0) return res.status(422).json({ error: 'creator has no paid tier' });
		// TBC-only settlement: USD list price, split paid in TBC.
		const { requireTbc, tbcForUsd } = await import('../utils/tbc-econ.js');
		let tbcPrice;
		try {
			({ tbc: tbcPrice } = await requireTbc(user.id, price));
		} catch (e) {
			if (e?.code === 'insufficient_tbc') return res.status(422).json({ error: e.message });
			throw e;
		}
		const { tbc: tbcCreator } = await tbcForUsd(price * CREATOR_SHARE);
		const creatorCut = Math.round(tbcCreator * 100) / 100;
		const fee = Math.round((tbcPrice - creatorCut) * 100) / 100;
		await ledger(user.id, 'pay', -tbcPrice, `signals:${creator}`, 'TBC', { currency: 'TBC', fiatValue: price });
		await ledger(creator, 'signal_earn', creatorCut, `signals:${user.id}`, 'TBC', { currency: 'TBC', fiatValue: Math.round(price * CREATOR_SHARE * 100) / 100 });
		if (fee > 0) await ledger(PLATFORM_OWNER, 'fee', fee, `signals:${creator}`, 'TBC', { currency: 'TBC', fiatValue: Math.round((price - price * CREATOR_SHARE) * 100) / 100 });
		await supabaseRest('/rest/v1/signal_subscriptions', {
			method: 'POST',
			body: { owner: user.id, creator, price, platform_fee: fee, status: 'active' },
			prefer: 'return=representation',
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('market subscribe failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Mentors: register / list / book ───────────────────────────────
router.post('/mentors/register', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const headline = String(req.body?.headline || '').trim().slice(0, 120);
	const topics = Array.isArray(req.body?.topics) ? req.body.topics.filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 30)).slice(0, 8) : [];
	const price = Math.max(0, Math.min(5000, Number(req.body?.price ?? 0)));
	if (!headline || !price) return res.status(422).json({ error: 'headline + price required' });
	try {
		await supabaseRest('/rest/v1/mentors', {
			method: 'POST',
			body: { owner: user.id, headline, topics, price_usd: price, enabled: true },
			prefer: 'return=representation,resolution=merge-duplicates',
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('mentor register failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.get('/mentors', async (req, res) => {
	try {
		const rows = await supabaseRest('/rest/v1/mentors', {
			query: { select: '*', enabled: 'eq.true', order: 'created_at.desc', limit: 100 },
		}).catch(() => []);
		const names = await displayNames([...new Set((rows || []).map((r) => r.owner))]);
		return res.json({
			mentors: (rows || []).map((r) => ({
				owner: r.owner, name: names[r.owner] || 'Mentor',
				headline: r.headline, topics: r.topics || [], price: Number(r.price_usd) || 0,
			})),
		});
	} catch (err) {
		logger.error('mentors list failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.post('/mentors/book', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const mentor = String(req.body?.mentor || '').trim();
	const topic = String(req.body?.topic || '').trim().slice(0, 120);
	if (!mentor || mentor === user.id) return res.status(422).json({ error: 'invalid mentor' });
	try {
		const rows = await supabaseRest('/rest/v1/mentors', {
			query: { select: '*', owner: `eq.${mentor}`, enabled: 'eq.true', limit: 1 },
		}).catch(() => []);
		const m = rows?.[0];
		if (!m) return res.status(404).json({ error: 'mentor not available' });
		const price = Number(m.price_usd) || 0;
		// TBC-only settlement: USD list price, split paid in TBC.
		const { requireTbc, tbcForUsd } = await import('../utils/tbc-econ.js');
		let tbcPrice;
		try {
			({ tbc: tbcPrice } = await requireTbc(user.id, price));
		} catch (e) {
			if (e?.code === 'insufficient_tbc') return res.status(422).json({ error: e.message });
			throw e;
		}
		if (!(price > 0)) return res.status(422).json({ error: 'mentor has no price' });
		const { tbc: tbcMentor } = await tbcForUsd(price * MENTOR_SHARE);
		const mentorCut = Math.round(tbcMentor * 100) / 100;
		const fee = Math.round((tbcPrice - mentorCut) * 100) / 100;
		await ledger(user.id, 'pay', -tbcPrice, `mentor:${mentor}`, 'TBC', { currency: 'TBC', fiatValue: price });
		await ledger(mentor, 'mentor_earn', mentorCut, `mentor:${user.id}`, 'TBC', { currency: 'TBC', fiatValue: Math.round(price * MENTOR_SHARE * 100) / 100 });
		if (fee > 0) await ledger(PLATFORM_OWNER, 'fee', fee, `mentor:${mentor}`, 'TBC', { currency: 'TBC', fiatValue: Math.round((price - price * MENTOR_SHARE) * 100) / 100 });
		const session = await supabaseRest('/rest/v1/mentor_sessions', {
			method: 'POST',
			body: { owner: user.id, mentor, topic, price_usd: price, platform_fee: fee, status: 'booked', scheduled_for: req.body?.scheduledFor || null },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, session: session?.[0] || null });
	} catch (err) {
		logger.error('mentor book failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.get('/mentors/sessions', async (req, res) => {	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const [mine, teaching] = await Promise.all([
			supabaseRest('/rest/v1/mentor_sessions', { query: { select: '*', owner: `eq.${user.id}`, order: 'created_at.desc', limit: 50 } }).catch(() => []),
			supabaseRest('/rest/v1/mentor_sessions', { query: { select: '*', mentor: `eq.${user.id}`, order: 'created_at.desc', limit: 50 } }).catch(() => []),
		]);
		return res.json({ mine: mine || [], teaching: teaching || [] });
	} catch (err) {
		logger.error('mentor sessions failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Unsubscribe from a creator ───────────────────────────────────
router.post('/unsubscribe', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const creator = String(req.body?.creator || '').trim();
	if (!creator) return res.status(422).json({ error: 'creator required' });
	try {
		await supabaseRest(`/rest/v1/signal_subscriptions?owner=eq.${user.id}&creator=eq.${encodeURIComponent(creator)}`, {
			method: 'PATCH', body: { status: 'cancelled' },
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('market unsubscribe failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Complete a mentor session (either party) ─────────────────────
router.post('/mentors/complete', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const sessionId = String(req.body?.sessionId || '').trim();
	if (!sessionId) return res.status(422).json({ error: 'session required' });
	try {
		const rows = await supabaseRest(`/rest/v1/mentor_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
			query: { select: 'id,owner,mentor,status', limit: 1 },
		}).catch(() => []);
		const s = rows?.[0];
		if (!s || (s.owner !== user.id && s.mentor !== user.id)) return res.status(404).json({ error: 'session not found' });
		if (s.status !== 'booked') return res.json({ ok: true, already: true });
		await supabaseRest(`/rest/v1/mentor_sessions?id=eq.${s.id}`, {
			method: 'PATCH', body: { status: 'completed' },
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('mentor complete failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
