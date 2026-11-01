import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';

// ── Signal marketplace ────────────────────────────────────────────
// Creators list signals with a price; subscribers pay monthly per creator
// (75% creator / 25% platform, settled in ledger rows). Money never leaves
// the ledger.

const router = Router();
const CREATOR_SHARE = 0.75;
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

export default router;
