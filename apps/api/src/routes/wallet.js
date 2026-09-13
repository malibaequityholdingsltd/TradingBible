import { Router } from 'express';
import Stripe from 'stripe';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { NETWORKS, isValidAddress, getBalance, withUsdValue } from '../utils/walletData.js';

const router = Router();
const MAX_TRACKERS = 20;

function getStripe() {
	const key = process.env.STRIPE_SECRET_KEY || '';
	if (!key) return null;
	return new Stripe(key);
}

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

async function getOrCreateBalance(owner, currency = 'USD') {
	const rows = await supabaseRest('/rest/v1/wallet_balances', {
		query: { select: '*', owner: `eq.${owner}`, currency: `eq.${currency}`, limit: 1 },
	}).catch(() => []);
	if (rows?.[0]) return rows[0];
	const created = await supabaseRest('/rest/v1/wallet_balances', {
		method: 'POST',
		body: { owner, currency, balance: 0 },
		prefer: 'return=representation',
	}).catch(() => []);
	return created?.[0] || { owner, currency, balance: 0 };
}

// ── List tracked wallets with live balances ─────────────────────
router.get('/', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/wallet_trackers', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'created.asc', limit: MAX_TRACKERS },
		});

		const results = await Promise.all(
			(rows || []).map(async (r) => {
				const conf = NETWORKS[r.network];
				const balance = await getBalance(r.network, r.address);
				const valued = conf ? await withUsdValue(balance, conf) : { ...balance, usdValue: 0 };
				return {
					id: r.id,
					label: r.label || conf?.label || r.network,
					network: r.network,
					address: r.address,
					currency: conf?.currency || '',
					...valued,
				};
			}),
		);

		const totalUsd = results.reduce((s, w) => s + (w.ok ? w.usdValue : 0), 0);
		return res.json({ wallets: results, totalUsd });
	} catch (err) {
		logger.error('wallet list failed', String(err));
		return res.status(500).json({ error: 'failed to load wallets' });
	}
});

// ── Add a tracked address ───────────────────────────────────────
router.post('/', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const body = req.body || {};
		const network = String(body.network || '');
		const address = String(body.address || '').trim();
		const label = String(body.label || '').trim().slice(0, 40);

		if (!NETWORKS[network]) return res.status(422).json({ error: 'unsupported network' });
		if (!isValidAddress(network, address)) return res.status(422).json({ error: 'invalid address for network' });

		const existing = await supabaseRest('/rest/v1/wallet_trackers', {
			query: { select: 'id', owner: `eq.${user.id}`, limit: 500 },
		});
		if ((existing || []).length >= MAX_TRACKERS) {
			return res.status(422).json({ error: `maximum of ${MAX_TRACKERS} tracked wallets` });
		}

		const row = await supabaseRest('/rest/v1/wallet_trackers', {
			method: 'POST',
			body: { owner: user.id, network, address, label },
			prefer: 'return=representation',
		});
		return res.json({ wallet: row?.[0] || null });
	} catch (err) {
		logger.error('wallet add failed', String(err));
		return res.status(500).json({ error: 'failed to add wallet' });
	}
});

// ── Remove a tracked address ────────────────────────────────────
router.delete('/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		await supabaseRest(`/rest/v1/wallet_trackers?id=eq.${encodeURIComponent(req.params.id)}&owner=eq.${user.id}`, { method: 'DELETE' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('wallet remove failed', String(err));
		return res.status(500).json({ error: 'failed to remove wallet' });
	}
});

// ── Ledger: balance + transactions ──────────────────────────────
router.get('/ledger/balance', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/wallet_balances', {
			query: { select: '*', owner: `eq.${user.id}` },
		});
		const balances = {};
		for (const r of rows || []) balances[r.currency] = Number(r.balance) || 0;
		if (!balances.USD) balances.USD = 0;
		return res.json({ balances });
	} catch (err) {
		logger.error('wallet balance failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.get('/ledger/transactions', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/wallet_transactions', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'created.desc', limit: 50 },
		});
		return res.json({ transactions: rows || [] });
	} catch (err) {
		logger.error('wallet tx list failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Deposit via Stripe (one-time $ amount) ──────────────────────
router.post('/deposit', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	const amount = Math.round(Number(req.body?.amount || 0) * 100);
	if (!amount || amount < 100 || amount > 10000000) return res.status(422).json({ error: 'amount must be 1-100000' });
	const origin = req.headers.origin || process.env.CORS_ORIGIN || 'https://tradingbible.app';
	// Create a Stripe Checkout Session for wallet funding (payment mode)
	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		customer_email: user.email,
		line_items: [{ price_data: { currency: 'usd', product_data: { name: 'TradingBible Wallet Funding' }, unit_amount: amount }, quantity: 1 }],
		success_url: `${origin}/app/wallet?deposit=success`,
		cancel_url: `${origin}/app/wallet?deposit=cancel`,
		client_reference_id: user.id,
		metadata: { user_id: user.id, intent: 'wallet_deposit', amount: String(amount) },
	});
	return res.json({ url: session.url, id: session.id });
});

// ── Simulate wallet deposit webhook completion (for local testing) ─
router.post('/deposit/confirm', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Number(req.body?.amount || 0);
	if (!amount || amount <= 0) return res.status(422).json({ error: 'invalid amount' });
	try {
		const bal = await getOrCreateBalance(user.id, 'USD');
		const next = (Number(bal.balance) || 0) + amount;
		await supabaseRest(`/rest/v1/wallet_balances?owner=eq.${user.id}&currency=eq.USD`, {
			method: 'PATCH',
			body: { balance: next, updated: new Date().toISOString() },
			prefer: 'return=representation',
		});
		await supabaseRest('/rest/v1/wallet_transactions', {
			method: 'POST',
			body: { owner: user.id, type: 'deposit', amount, currency: 'USD', status: 'completed', reference: req.body?.reference || '', meta: { source: 'manual' } },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, balance: next });
	} catch (err) {
		logger.error('wallet deposit confirm failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Withdraw (mock - creates pending transaction) ───────────────
router.post('/withdraw', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Number(req.body?.amount || 0);
	const address = String(req.body?.address || '').trim();
	if (!amount || amount <= 0) return res.status(422).json({ error: 'invalid amount' });
	if (!address) return res.status(422).json({ error: 'address required' });
	try {
		const bal = await getOrCreateBalance(user.id, 'USD');
		if ((Number(bal.balance) || 0) < amount) return res.status(422).json({ error: 'insufficient balance' });
		const next = (Number(bal.balance) || 0) - amount;
		await supabaseRest(`/rest/v1/wallet_balances?owner=eq.${user.id}&currency=eq.USD`, {
			method: 'PATCH',
			body: { balance: next, updated: new Date().toISOString() },
			prefer: 'return=representation',
		});
		await supabaseRest('/rest/v1/wallet_transactions', {
			method: 'POST',
			body: { owner: user.id, type: 'withdraw', amount: -amount, currency: 'USD', status: 'pending', reference: address, meta: { address } },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, balance: next });
	} catch (err) {
		logger.error('wallet withdraw failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Pay with wallet (for billing/academy) ───────────────────────
router.post('/pay', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const { intent, plan } = req.body || {};
	const isAcademy = intent === 'academy';
	const priceMap = { pro: 19.99, elite: 49.99, professional: 99, academy: 150 };
	const key = isAcademy ? 'academy' : plan;
	const amount = priceMap[key];
	if (!amount) return res.status(422).json({ error: 'unknown plan' });
	try {
		const bal = await getOrCreateBalance(user.id, 'USD');
		if ((Number(bal.balance) || 0) < amount) return res.status(422).json({ error: `insufficient wallet balance ($${Number(bal.balance).toFixed(2)} < $${amount})` });
		const next = (Number(bal.balance) || 0) - amount;
		await supabaseRest(`/rest/v1/wallet_balances?owner=eq.${user.id}&currency=eq.USD`, {
			method: 'PATCH',
			body: { balance: next, updated: new Date().toISOString() },
			prefer: 'return=representation',
		});
		const patch = {};
		if (isAcademy) { patch.academyAccess = true; patch.academyPurchasedAt = new Date().toISOString(); }
		else { patch.plan = key; patch.subscriptionStatus = 'active'; patch.currentPeriodEnd = new Date(Date.now() + 30*86400000).toISOString(); }
		// Try to persist plan/academy - ignore missing columns
		try { await supabaseRest(`/rest/v1/users?id=eq.${user.id}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }); } catch (e) { logger.warn('wallet pay user patch failed', String(e)); }
		await supabaseRest('/rest/v1/wallet_transactions', {
			method: 'POST',
			body: { owner: user.id, type: 'pay', amount: -amount, currency: 'USD', status: 'completed', reference: key, meta: { intent: key } },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, balance: next });
	} catch (err) {
		logger.error('wallet pay failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
