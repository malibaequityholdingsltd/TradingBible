import { Router } from 'express';
import Stripe from 'stripe';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { NETWORKS, isValidAddress, getBalance, withUsdValue } from '../utils/walletData.js';

// ── Full wallet: internal USD ledger + external address tracker ─────
// The ledger reuses the pre-existing `bank_transactions` table (no extra
// migration needed): kind ∈ {deposit, withdraw, withdraw_crypto, pay},
// signed amount, currency, status, reference, counterparty (address/source),
// asset (plan intent for pay rows, else USD), fiatValue (abs amount).
// Balance = sum of non-failed rows. External tracking stays read-only
// (wallet_trackers + public chain data); TradingBible never custodies crypto.

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

// ── Ledger helpers (bank_transactions) ──────────────────────────
function toLedgerTx(r) {
	if (!r) return null;
	return {
		id: r.id,
		type: r.kind,
		amount: Number(r.amount) || 0,
		currency: r.currency || 'USD',
		status: r.status || 'completed',
		reference: r.reference || '',
		created: r.created,
		asset: r.asset || null,
		counterparty: r.counterparty || null,
		fiatValue: r.fiatValue ?? null,
	};
}

async function addLedgerTx({ owner, kind, amount, status = 'completed', reference = '', counterparty = '', asset = 'USD', fiatValue = null }) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		method: 'POST',
		body: {
			owner, kind, amount, currency: 'USD', status, reference,
			counterparty, asset, fiatValue: fiatValue ?? Math.abs(Number(amount) || 0),
		},
		prefer: 'return=representation',
	});
	return rows?.[0] || null;
}

async function getLedgerBalance(owner) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: 'amount,status', owner: `eq.${owner}`, limit: 5000 },
	}).catch(() => []);
	return (rows || []).reduce((s, r) => s + (r.status === 'failed' ? 0 : (Number(r.amount) || 0)), 0);
}

async function listLedgerTx(owner, limit = 50) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: '*', owner: `eq.${owner}`, order: 'created.desc', limit },
	});
	return (rows || []).map(toLedgerTx).filter(Boolean);
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
		const balance = await getLedgerBalance(user.id);
		return res.json({ balances: { USD: balance } });
	} catch (err) {
		logger.error('wallet balance failed', String(err));
		return res.json({ balances: { USD: 0 } });
	}
});

router.get('/ledger/transactions', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		return res.json({ transactions: await listLedgerTx(user.id) });
	} catch (err) {
		logger.error('wallet tx list failed', String(err));
		return res.json({ transactions: [] });
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
	try {
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
	} catch (err) {
		logger.warn('wallet deposit session failed', String(err?.message || err));
		return res.status(502).json({ error: err?.message || 'Could not create deposit session' });
	}
});

// ── Manual deposit credit (admin / local testing) ───────────────
router.post('/deposit/confirm', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Number(req.body?.amount || 0);
	if (!amount || amount <= 0) return res.status(422).json({ error: 'invalid amount' });
	try {
		await addLedgerTx({
			owner: user.id, kind: 'deposit', amount, status: 'completed',
			reference: req.body?.reference || '', counterparty: 'manual', asset: 'USD',
		});
		return res.json({ ok: true, balance: await getLedgerBalance(user.id) });
	} catch (err) {
		logger.error('wallet deposit confirm failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Withdraw (real: ledger debit + Stripe payout when possible, else pending for admin) ─
router.post('/withdraw', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Number(req.body?.amount || 0);
	const address = String(req.body?.address || '').trim();
	const method = String(req.body?.method || 'bank').trim(); // bank | crypto
	if (!amount || amount <= 0) return res.status(422).json({ error: 'invalid amount' });
	if (!address) return res.status(422).json({ error: 'address required' });
	if (amount < 5) return res.status(422).json({ error: 'minimum withdraw $5' });
	try {
		const balance = await getLedgerBalance(user.id);
		if (balance < amount) return res.status(422).json({ error: 'insufficient balance' });

		// Try real Stripe payout for fiat (requires Stripe balance)
		let stripePayoutId = null;
		let status = 'pending';
		const stripe = getStripe();
		if (stripe && method === 'bank') {
			try {
				// Check Stripe balance first
				const sbal = await stripe.balance.retrieve();
				const avail = (sbal.available?.find(b => b.currency === 'usd')?.amount || 0) / 100;
				if (avail >= amount) {
					const payout = await stripe.payouts.create({ amount: Math.round(amount * 100), currency: 'usd', method: 'standard' });
					stripePayoutId = payout.id;
					status = payout.status === 'pending' ? 'pending' : 'completed';
					logger.info(`Stripe payout ${payout.id} $${amount} for ${user.id}`);
				} else {
					logger.warn(`Stripe balance insufficient $${avail} for withdraw $${amount}, keeping pending for admin`);
				}
			} catch (e) {
				logger.warn('Stripe payout failed, keeping pending', String(e));
			}
		}

		const tx = await addLedgerTx({
			owner: user.id, kind: method === 'crypto' ? 'withdraw_crypto' : 'withdraw',
			amount: -amount, status, reference: stripePayoutId || address,
			counterparty: address, asset: 'USD',
		});

		// Audit to billing_events for admin visibility
		try { await supabase.createEvent?.({ owner: user.id, eventType: 'wallet.withdraw', status, amount: -amount, currency: 'USD', occurredAt: new Date().toISOString() }); } catch {}

		return res.json({ ok: true, balance: await getLedgerBalance(user.id), withdrawal: toLedgerTx(tx), stripePayoutId, status });
	} catch (err) {
		logger.error('wallet withdraw failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: list withdrawals ─────────────────────────────────────
router.get('/admin/withdrawals', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	// Simple admin check via users table
	try {
		const me = await supabaseRest(`/rest/v1/users?id=eq.${user.id}&select=role`, { query: { select: 'role', limit: 1 } });
		if (me?.[0]?.role !== 'admin') return res.status(403).json({ error: 'admin only' });
		const rows = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: '*', kind: 'in.(withdraw,withdraw_crypto)', order: 'created.desc', limit: 100 },
		});
		return res.json({ withdrawals: (rows || []).map(toLedgerTx).filter(Boolean) });
	} catch (err) {
		logger.error('admin withdrawals failed', String(err));
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
		const balance = await getLedgerBalance(user.id);
		if (balance < amount) return res.status(422).json({ error: `insufficient wallet balance ($${balance.toFixed(2)} < $${amount})` });
		const patch = {};
		if (isAcademy) { patch.academyAccess = true; patch.academyPurchasedAt = new Date().toISOString(); }
		else { patch.plan = key; patch.subscriptionStatus = 'active'; patch.currentPeriodEnd = new Date(Date.now() + 30*86400000).toISOString(); }
		// Try to persist plan/academy - ignore missing columns
		try { await supabaseRest(`/rest/v1/users?id=eq.${user.id}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }); } catch (e) { logger.warn('wallet pay user patch failed', String(e)); }
		await addLedgerTx({
			owner: user.id, kind: 'pay', amount: -amount, status: 'completed',
			reference: key, counterparty: 'internal', asset: key,
		});
		return res.json({ ok: true, balance: await getLedgerBalance(user.id) });
	} catch (err) {
		logger.error('wallet pay failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
