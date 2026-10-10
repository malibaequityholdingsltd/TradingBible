import { Router } from 'express';
import Stripe from 'stripe';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { NETWORKS, isValidAddress, getBalance, withUsdValue } from '../utils/walletData.js';

// ── Full wallet: internal USD ledger + external address tracker ─────
// The ledger reuses the pre-existing `bank_transactions` table (no extra
// migration needed): kind ∈ {deposit, withdraw, withdraw_crypto, pay, swap},
// signed amount, currency, status, reference, counterparty (address/source),
// asset (plan intent for pay rows, else USD), fiatValue (abs amount).
// Balance = sum of non-failed rows. External tracking stays read-only
// (wallet_trackers + public chain data); TradingBible never custodies crypto
// (swaps are non-custodial: the user signs in their own wallet).
// Real-money movement:
// - Deposits: Stripe Checkout → platform Stripe account → webhook credits
//   the ledger. The webhook is the ONLY deposit credit path.
// - Bank withdrawals: Stripe Connect transfer to the user's own onboarded
//   Express account, gated on passed Stripe Identity KYC.
// - Per-user Connect/KYC state lives in `wallet_money_rails`
//   (see supabase/migrations/20261006000002_wallet_money_rails.sql).

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

async function addLedgerTx({ owner, kind, amount, status = 'completed', reference = '', counterparty = '', asset = 'USD', fiatValue = null, currency = null }) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		method: 'POST',
		body: {
			owner, kind, amount, currency: currency || (asset === 'TBC' ? 'TBC' : 'USD'), status, reference,
			counterparty, asset, fiatValue: fiatValue ?? Math.abs(Number(amount) || 0),
		},
		prefer: 'return=representation',
	});
	return rows?.[0] || null;
}

async function getLedgerBalance(owner) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: 'amount,asset,status', owner: `eq.${owner}`, limit: 5000 },
	}).catch(() => []);
	// USD spendable balance counts USD rows only — TBC credits live separately.
	return (rows || []).reduce((s, r) => s + (r.status === 'failed' || (r.asset || 'USD') !== 'USD' ? 0 : (Number(r.amount) || 0)), 0);
}

async function getLedgerBalances(owner) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: 'amount,asset,status', owner: `eq.${owner}`, limit: 5000 },
	}).catch(() => []);
	let usd = 0, tbc = 0;
	for (const r of rows || []) {
		if (r.status === 'failed') continue;
		if ((r.asset || 'USD') === 'TBC') tbc += Number(r.amount) || 0;
		else usd += Number(r.amount) || 0;
	}
	usd = Math.round(usd * 100) / 100;
	tbc = Math.round(tbc * 100) / 100;
	return { USD: usd, TBC: tbc, KWD: tbc };
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
		const balances = await getLedgerBalances(user.id);
		return res.json({ balances });
	} catch (err) {
		logger.error('wallet balance failed', String(err));
		return res.json({ balances: { USD: 0, TBC: 0, KWD: 0 } });
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

// ── Withdraw (real money: Stripe Connect transfer, KYC-gated) ──────
async function getRails(owner) {
	const rows = await supabaseRest('/rest/v1/wallet_money_rails', {
		query: { select: '*', owner: `eq.${owner}`, limit: 1 },
	}).catch(() => null);
	return rows?.[0] || null;
}

async function saveRails(owner, patch) {
	const body = { owner, ...patch, updated_at: new Date().toISOString() };
	const rows = await supabaseRest('/rest/v1/wallet_money_rails', {
		method: 'POST',
		body,
		prefer: 'return=representation,resolution=merge-duplicates',
	});
	return rows?.[0] || null;
}

function isMissingTable(err) {
	const m = String(err?.message || err || '');
	return /404|not find|does not exist|PGRST|relation .* does not exist/i.test(m);
}

function setupRequired(res) {
	return res.status(503).json({ error: 'setup_required', detail: 'Money-rail tables are missing — run APPLY_MISSING_TABLES.sql in the Supabase SQL editor once.' });
}

function appOrigin(req) {
	return req.headers.origin || process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tradingbible.app';
}

// ── Money-rail status (Connect + KYC + provider availability) ──────
router.get('/rails', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rails = await getRails(user.id);
		return res.json({
			connect: {
				status: rails?.connect_status || 'none', // none|onboarding|restricted|active
				accountId: rails?.connect_account_id || null,
			},
			kyc: {
				status: rails?.kyc_status || 'none', // none|pending|verified|failed
				verifiedAt: rails?.kyc_verified_at || null,
			},
			providers: {
				stripe: Boolean(getStripe()),
				swap: Boolean(process.env.ZEROX_API_KEY),
				onramp: Boolean(process.env.TRANSAK_API_KEY),
				tbcPay: Boolean((process.env.TBC_CONTRACT_BASE || process.env.TBC_CONTRACT_ETHEREUM) && process.env.TBC_TREASURY_ADDRESS),
			},
			withdrawMin: 5,
		});
	} catch (err) {
		logger.error('wallet rails failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Stripe Connect: onboard the user as a payout recipient ──────────
// Creates (or reuses) an Express account, then returns an onboarding link.
// The user completes bank details + Stripe KYC on Stripe's hosted flow;
// GET /connect/status (below) picks up the result on return.
router.post('/connect/onboard', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	const country = String(req.body?.country || 'US').trim().toUpperCase().slice(0, 2);
	try {
		let rails = await getRails(user.id);
		let accountId = rails?.connect_account_id || null;
		if (accountId) {
			try { await stripe.accounts.retrieve(accountId); }
			catch { accountId = null; } // stale id (e.g. deleted in dashboard) → recreate
		}
		if (!accountId) {
			const account = await stripe.accounts.create({
				type: 'express',
				email: user.email || undefined,
				country,
				capabilities: { transfers: { requested: true } },
				metadata: { user_id: user.id },
			});
			accountId = account.id;
		}
		await saveRails(user.id, { connect_account_id: accountId, connect_status: 'onboarding' });
		const origin = appOrigin(req);
		const link = await stripe.accountLinks.create({
			account: accountId,
			refresh_url: `${origin}/app/wallet?connect=refresh`,
			return_url: `${origin}/app/wallet?connect=return`,
			type: 'account_onboarding',
		});
		return res.json({ url: link.url, accountId });
	} catch (err) {
		if (isMissingTable(err)) return setupRequired(res);
		logger.warn('connect onboard failed', String(err?.message || err));
		return res.status(502).json({ error: err?.message || 'Could not start bank setup' });
	}
});

// ── Stripe Connect: refresh + report recipient status ───────────────
router.get('/connect/status', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	try {
		const rails = await getRails(user.id);
		const accountId = rails?.connect_account_id || null;
		if (!accountId) return res.json({ status: 'none', accountId: null });
		const account = await stripe.accounts.retrieve(accountId);
		const status = account.payouts_enabled && account.details_submitted
			? 'active'
			: account.details_submitted ? 'restricted' : 'onboarding';
		await saveRails(user.id, { connect_status: status });
		return res.json({
			status,
			accountId,
			payoutsEnabled: Boolean(account.payouts_enabled),
			detailsSubmitted: Boolean(account.details_submitted),
		});
	} catch (err) {
		logger.warn('connect status failed', String(err?.message || err));
		return res.status(502).json({ error: 'Could not check bank setup status' });
	}
});

// ── Stripe Identity: start KYC verification ────────────────────────
router.post('/kyc/session', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	try {
		const origin = appOrigin(req);
		const session = await stripe.identity.verificationSessions.create({
			type: 'document',
			metadata: { user_id: user.id },
			return_url: `${origin}/app/wallet?kyc=return`,
		});
		await saveRails(user.id, { kyc_status: 'pending', kyc_session_id: session.id });
		return res.json({ url: session.url, sessionId: session.id });
	} catch (err) {
		if (isMissingTable(err)) return setupRequired(res);
		logger.warn('kyc session failed', String(err?.message || err));
		return res.status(502).json({ error: err?.message || 'Could not start identity verification' });
	}
});

// ── Stripe Identity: refresh + report KYC status ───────────────────
router.get('/kyc/status', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	try {
		const rails = await getRails(user.id);
		if (rails?.kyc_status === 'verified') {
			return res.json({ status: 'verified', verifiedAt: rails.kyc_verified_at || null });
		}
		if (!rails?.kyc_session_id) return res.json({ status: rails?.kyc_status || 'none' });
		const session = await stripe.identity.verificationSessions.retrieve(rails.kyc_session_id);
		const status = session.status === 'verified' ? 'verified'
			: session.status === 'requires_input' ? 'failed' : 'pending';
		const patch = { kyc_status: status };
		if (status === 'verified') patch.kyc_verified_at = new Date().toISOString();
		await saveRails(user.id, patch);
		return res.json({ status });
	} catch (err) {
		logger.warn('kyc status failed', String(err?.message || err));
		return res.status(502).json({ error: 'Could not check verification status' });
	}
});

// ── Withdraw to the user's own bank via Stripe Connect ────────────
// Gates: passed Identity KYC + an active Connect recipient account.
// Money moves platform → user's Connect account (transfer); Stripe pays it
// out to the user's bank on its standard schedule. The ledger row is the
// source of truth: created as `processing`, flipped to `completed` (with the
// transfer id) or `failed` (which restores the balance, since failed rows
// don't count). Transfers carry an idempotency key per ledger row, plus a
// 2-minute same-amount duplicate guard against double clicks.
router.post('/withdraw', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Number(req.body?.amount || 0);
	if (!amount || amount <= 0) return res.status(422).json({ error: 'invalid amount' });
	if (amount < 5) return res.status(422).json({ error: 'minimum withdraw $5' });
	const stripe = getStripe();
	if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
	try {
		const balance = await getLedgerBalance(user.id);
		if (balance < amount) return res.status(422).json({ error: 'insufficient balance' });

		const rails = await getRails(user.id);
		if (rails?.kyc_status !== 'verified') {
			return res.status(403).json({ error: 'kyc_required', message: 'Verify your identity before the first withdrawal.' });
		}

		// Payout-fraud scan — withdrawals ONLY (never on deposits/payments).
		// A positive identity mismatch suspends the account and aborts here.
		try {
			const { scanPayoutIdentity } = await import('../utils/payout-scan.js');
			const scan = await scanPayoutIdentity(user.id);
			if (scan.suspended || scan.already) {
				return res.status(403).json({ error: 'account_suspended', message: 'This account is suspended pending an identity review. Contact live support.' });
			}
		} catch (err) {
			logger.warn('withdraw scan hook failed open', String(err?.message || err));
		}
		const accountId = rails?.connect_account_id || null;
		if (!accountId || rails?.connect_status !== 'active') {
			let live = null;
			if (accountId) {
				try {
					const account = await stripe.accounts.retrieve(accountId);
					const status = account.payouts_enabled && account.details_submitted
						? 'active' : account.details_submitted ? 'restricted' : 'onboarding';
					await saveRails(user.id, { connect_status: status });
					live = status;
				} catch { /* fall through to connect_required */ }
			}
			if (live !== 'active') {
				return res.status(403).json({ error: 'connect_required', message: 'Connect your bank account before withdrawing.' });
			}
		}

		// Double-click guard: same owner + amount already processing in the last 2 minutes.
		const since = new Date(Date.now() - 120000).toISOString();
		const recent = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: 'id,amount,created', owner: `eq.${user.id}`, kind: 'eq.withdraw', status: 'eq.processing', created: `gte.${since}`, limit: 10 },
		}).catch(() => []);
		if ((recent || []).some((r) => Math.abs(Number(r.amount) || 0) === amount)) {
			return res.status(409).json({ error: 'duplicate', message: 'A withdrawal for this amount is already processing.' });
		}

		// Platform must actually hold the funds to transfer them.
		const sbal = await stripe.balance.retrieve();
		const avail = (sbal.available?.find((b) => b.currency === 'usd')?.amount || 0) / 100;
		if (avail < amount) {
			return res.status(502).json({ error: 'liquidity', message: 'Payouts are temporarily unavailable. Please try again later.' });
		}

		const tx = await addLedgerTx({
			owner: user.id, kind: 'withdraw',
			amount: -amount, status: 'processing', reference: '', counterparty: 'stripe_connect', asset: 'USD',
		});

		try {
			const transfer = await stripe.transfers.create({
				amount: Math.round(amount * 100),
				currency: 'usd',
				destination: accountId,
				description: `TradingBible wallet withdrawal ${tx?.id || ''}`.slice(0, 200),
			}, { idempotencyKey: `wallet_withdraw_${tx?.id || `${user.id}_${Date.now()}`}` });
			if (tx?.id) {
				await supabaseRest(`/rest/v1/bank_transactions?id=eq.${encodeURIComponent(tx.id)}`, {
					method: 'PATCH', body: { status: 'completed', reference: transfer.id },
				}).catch(() => {});
			}
			logger.info(`Connect transfer ${transfer.id} $${amount} to ${accountId} for ${user.id}`);
			try { await supabase.createEvent?.({ owner: user.id, eventType: 'wallet.withdraw', status: 'completed', amount: -amount, currency: 'USD', occurredAt: new Date().toISOString() }); } catch {}
			return res.json({ ok: true, balance: await getLedgerBalance(user.id), withdrawal: { ...toLedgerTx(tx), status: 'completed', reference: transfer.id }, transferId: transfer.id, status: 'completed' });
		} catch (e) {
			if (tx?.id) {
				await supabaseRest(`/rest/v1/bank_transactions?id=eq.${encodeURIComponent(tx.id)}`, {
					method: 'PATCH', body: { status: 'failed', reference: String(e?.message || 'transfer failed').slice(0, 200) },
				}).catch(() => {});
			}
			logger.warn('Connect transfer failed, withdrawal marked failed', String(e?.message || e));
			return res.status(502).json({ error: 'transfer_failed', message: e?.message || 'The payout failed and your balance was restored.' });
		}
	} catch (err) {
		logger.error('wallet withdraw failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Non-custodial swaps (user signs in their own wallet) ─────────
// The server only fetches aggregator quotes and records intents — it never
// holds keys or submits transactions. Verify token addresses against the
// 0x docs / chain explorers before enabling new chains in production.
const NATIVE_SENTINEL = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const SWAP_TOKENS = {
	1: { name: 'Ethereum', tokens: [
		{ symbol: 'ETH', address: NATIVE_SENTINEL, decimals: 18 },
		{ symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
		{ symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
		{ symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
		{ symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
		{ symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeF7C193bc2C599', decimals: 8 },
		{ symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
		{ symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
		{ symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33', decimals: 18 },
		{ symbol: 'PEPE', address: '0x6982508145454Ce325dDbE39758Bffffff', decimals: 18 },
		{ symbol: 'SHIB', address: '0x95aD61b0a150d79219dcF64E1E6Cc01f0B64', decimals: 18 },
	] },
	8453: { name: 'Base', tokens: [
		{ symbol: 'ETH', address: NATIVE_SENTINEL, decimals: 18 },
		{ symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
		{ symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
		{ symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5fd9fd0df8c474', decimals: 8 },
		{ symbol: 'DAI', address: '0x50c5725949A6F0c72A7348a6C343568fC5Db0378ff', decimals: 18 },
	] },
};

// Public RPCs for on-chain reads (decimals lookups + receipt verification).
const CHAIN_RPCS = {
	1: ['https://ethereum.publicnode.com', 'https://eth.llamarpc.com'],
	8453: ['https://mainnet.base.org'],
};
const DECIMALS_RPCS = CHAIN_RPCS;
const decimalsCache = new Map(); // `${chainId}:${addr}` -> decimals

async function getTokenDecimals(chainId, address) {
	const key = `${chainId}:${address.toLowerCase()}`;
	if (decimalsCache.has(key)) return decimalsCache.get(key);
	const rpcs = DECIMALS_RPCS[chainId] || [];
	for (const rpc of rpcs) {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), 8000);
			const r = await fetch(rpc, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: address, data: '0x313ce567' }, 'latest'] }),
				signal: ctrl.signal,
			}).finally(() => clearTimeout(timer));
			const j = await r.json().catch(() => null);
			const raw = j?.result;
			if (typeof raw === 'string' && /^0x[0-9a-fA-F]+$/.test(raw)) {
				const dec = parseInt(raw, 16);
				if (Number.isInteger(dec) && dec >= 0 && dec <= 36) {
					decimalsCache.set(key, dec);
					return dec;
				}
			}
		} catch { /* try next RPC */ }
	}
	return null;
}

function isHexAddress(s) {
	return /^0x[0-9a-fA-F]{40}$/.test(String(s || '').trim());
}

async function resolveSwapToken(chainId, ref) {
	const found = findSwapToken(chainId, ref);
	if (found) return { ...found, custom: false };
	// Custom token: any valid contract address, decimals read on-chain.
	const needle = String(ref || '').trim();
	if (!isHexAddress(needle)) return null;
	const decimals = await getTokenDecimals(chainId, needle);
	if (decimals === null) return { error: 'decimals' };
	return { symbol: `${needle.slice(0, 6)}…${needle.slice(-4)}`, address: needle, decimals, custom: true };
}

function findSwapToken(chainId, ref) {
	const chain = SWAP_TOKENS[chainId];
	if (!chain) return null;
	const needle = String(ref || '').trim();
	return chain.tokens.find((t) => t.symbol.toLowerCase() === needle.toLowerCase() || t.address.toLowerCase() === needle.toLowerCase()) || null;
}

// Brand rule: every swap ends in TBC — any coin in, TBC out.
function isTbcSwapBuy(chainId, t) {
	if (!t || t.error) return false;
	if (String(t.symbol).toUpperCase() === 'TBC') return true;
	const c = { 1: process.env.TBC_CONTRACT_ETHEREUM || '', 8453: process.env.TBC_CONTRACT_BASE || '' }[chainId] || '';
	return Boolean(c) && String(t.address).toLowerCase() === c.toLowerCase();
}

// TBC joins the swap list the moment its contract is configured.
if (process.env.TBC_CONTRACT_ETHEREUM && /^0x[0-9a-fA-F]{40}$/.test(process.env.TBC_CONTRACT_ETHEREUM)) {
	SWAP_TOKENS[1].tokens.push({ symbol: 'TBC', address: process.env.TBC_CONTRACT_ETHEREUM, decimals: 18 });
}
if (process.env.TBC_CONTRACT_BASE && /^0x[0-9a-fA-F]{40}$/.test(process.env.TBC_CONTRACT_BASE)) {
	SWAP_TOKENS[8453].tokens.push({ symbol: 'TBC', address: process.env.TBC_CONTRACT_BASE, decimals: 18 });
}

function toBaseUnits(human, decimals) {
	const [whole = '0', frac = ''] = String(human).split('.');
	const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
	return (BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')).toString();
}

function fromBaseUnits(base, decimals) {
	const s = String(base).padStart(decimals + 1, '0');
	const head = s.slice(0, -decimals) || '0';
	const tail = s.slice(-decimals).replace(/0+$/, '');
	return tail ? `${head}.${tail}` : head;
}

router.get('/swap/tokens', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const chains = Object.entries(SWAP_TOKENS).map(([chainId, c]) => ({ chainId: Number(chainId), name: c.name, tokens: c.tokens }));
	return res.json({ chains, provider: process.env.ZEROX_API_KEY ? '0x' : 'unconfigured' });
});

// Live aggregator quote (0x). Returns unsigned tx payload for the user's
// own wallet to sign — nothing executes server-side.
router.post('/swap/quote', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const apiKey = process.env.ZEROX_API_KEY || '';
	if (!apiKey) return res.status(503).json({ error: 'swap_unavailable', message: 'Swaps are not enabled yet.' });
	const chainId = Number(req.body?.chainId || 1);
	const sell = await resolveSwapToken(chainId, req.body?.sell);
	const buy = await resolveSwapToken(chainId, req.body?.buy);
	const taker = String(req.body?.taker || '').trim();
	const sellAmountHuman = Number(req.body?.sellAmount || 0);
	if (!sell || !buy) return res.status(422).json({ error: 'unsupported token pair' });
	if (sell.error === 'decimals' || buy.error === 'decimals') {
		return res.status(422).json({ error: 'unknown_token', message: 'Could not read that token contract. Check the address and chain.' });
	}
	if (sell.address.toLowerCase() === buy.address.toLowerCase()) return res.status(422).json({ error: 'identical tokens' });
	if (!isTbcSwapBuy(chainId, buy)) return res.status(422).json({ error: 'tbc_only', message: 'Swaps end in TBC — pick TBC as the token you receive.' });
	if (!sellAmountHuman || sellAmountHuman <= 0) return res.status(422).json({ error: 'invalid sell amount' });
	if (!/^0x[0-9a-fA-F]{40}$/.test(taker)) return res.status(422).json({ error: 'invalid wallet address' });
	try {
		const params = new URLSearchParams({
			chainId: String(chainId),
			sellToken: sell.address,
			buyToken: buy.address,
			sellAmount: toBaseUnits(sellAmountHuman, sell.decimals),
			taker,
			slippageBps: '100',
		});
		const r = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${params}`, {
			headers: { '0x-api-key': apiKey, '0x-version': 'v2' },
		});
		const q = await r.json().catch(() => ({}));
		const tx = q?.transaction || q;
		if (!r.ok || !q?.buyAmount || !tx?.to || !tx?.data) {
			return res.status(502).json({ error: 'quote_failed', message: q?.reason || q?.message || q?.details?.[0]?.message || 'No route for this pair right now.' });
		}
		return res.json({
			sell: sell.symbol, buy: buy.symbol, chainId,
			sellTokenAddress: sell.address,
			sellDecimals: sell.decimals,
			sellAmount: String(sellAmountHuman),
			buyAmount: fromBaseUnits(q.buyAmount, buy.decimals),
			price: q.price || null,
			estimatedGas: q.estimatedGas || tx.gas || null,
			allowanceTarget: q.allowanceTarget || null,
			allowance: q.issues?.allowance || null,
			tx: { to: tx.to, data: tx.data, value: tx.value || '0', gas: tx.gas || q.estimatedGas || null },
		});
	} catch (err) {
		logger.warn('swap quote failed', String(err?.message || err));
		return res.status(502).json({ error: 'quote_failed' });
	}
});

// Record a swap intent before the user signs (pending → completed on confirm).
router.post('/swap/intent', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const chainId = Number(req.body?.chainId || 1);
	const sell = await resolveSwapToken(chainId, req.body?.sell);
	const buy = await resolveSwapToken(chainId, req.body?.buy);
	const taker = String(req.body?.taker || '').trim();
	const sellAmount = Number(req.body?.sellAmount || 0);
	const buyAmount = String(req.body?.buyAmount || '').slice(0, 64);
	if (!sell || !buy || sell.error || buy.error || !sellAmount || sellAmount <= 0) return res.status(422).json({ error: 'invalid swap intent' });
	if (!isTbcSwapBuy(chainId, buy)) return res.status(422).json({ error: 'tbc_only', message: 'Swaps end in TBC — pick TBC as the token you receive.' });
	if (!/^0x[0-9a-fA-F]{40}$/.test(taker)) return res.status(422).json({ error: 'invalid wallet address' });
	try {
		const tx = await addLedgerTx({
			owner: user.id, kind: 'swap', amount: 0, status: 'pending',
			reference: `chain:${chainId} sell:${sellAmount} ${sell.symbol} est:${buyAmount || '?'} ${buy.symbol}`,
			counterparty: taker, asset: `${sell.symbol}>${buy.symbol}`,
		});
		return res.json({ ok: true, intent: toLedgerTx(tx) });
	} catch (err) {
		logger.error('swap intent failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// Verify a user-submitted swap tx against chain state. Strict checks:
// receipt exists (mined) + status success + sender is the intent's taker.
// Best-effort: a buy-token Transfer into the taker (proves the swap leg).
async function verifySwapReceipt(chainId, txHash, taker, buyRef) {
	const rpcs = CHAIN_RPCS[chainId] || [];
	let receipt = null;
	for (const rpc of rpcs) {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), 10000);
			const r = await fetch(rpc, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [txHash] }),
				signal: ctrl.signal,
			}).finally(() => clearTimeout(timer));
			const j = await r.json().catch(() => null);
			if (j?.result) { receipt = j.result; break; }
		} catch { /* try next RPC */ }
	}
	if (!receipt) return { ok: false, reason: 'not_mined', message: 'Transaction not found yet — wait for it to mine, then confirm again.' };
	if (receipt.status !== '0x1') return { ok: false, reason: 'tx_failed', message: 'Transaction failed on-chain. No swap happened.' };
	if (String(receipt.from || '').toLowerCase() !== String(taker || '').toLowerCase()) {
		return { ok: false, reason: 'sender_mismatch', message: 'That transaction was not sent by your quote address.' };
	}
	// Buy-leg proof: Transfer event of the buy token into the taker.
	try {
		const buy = buyRef ? await resolveSwapToken(chainId, buyRef) : null;
		const buyAddr = buy && !buy.error ? String(buy.address).toLowerCase() : null;
		if (buyAddr && Array.isArray(receipt.logs)) {
			const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df288'.toLowerCase();
			const takerTopic = '0x000000000000000000000000' + String(taker).toLowerCase().slice(2);
			const hit = receipt.logs.some((l) =>
				String(l.address || '').toLowerCase() === buyAddr &&
				Array.isArray(l.topics) && l.topics.length >= 3 &&
				String(l.topics[0] || '').toLowerCase() === TRANSFER &&
				String(l.topics[2] || '').toLowerCase() === takerTopic &&
				BigInt(String(l.data || '0x0')) > 0n,
			);
			if (hit) return { ok: true, level: 'full' };
			return { ok: true, level: 'basic', note: 'no buy-leg Transfer found; sender + success verified' };
		}
	} catch { /* fall through to basic */ }
	return { ok: true, level: 'basic' };
}

// Confirm a user-signed swap with its on-chain tx hash (non-custodial proof).
router.post('/swap/confirm', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const intentId = String(req.body?.intentId || '').trim();
	const txHash = String(req.body?.txHash || '').trim();
	if (!intentId) return res.status(422).json({ error: 'intent required' });
	if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return res.status(422).json({ error: 'invalid transaction hash' });
	try {
		const existing = await supabaseRest(`/rest/v1/bank_transactions?id=eq.${encodeURIComponent(intentId)}&owner=eq.${user.id}`, {
			query: { select: 'id,reference,counterparty,asset,status', limit: 1 },
		});
		const intent = existing?.[0];
		if (!intent) return res.status(404).json({ error: 'intent not found' });
		if (intent.status === 'completed') return res.json({ ok: true, already: true });
		const chainMatch = String(intent.reference || '').match(/chain:(\d+)/);
		const chainId = Number(req.body?.chainId || chainMatch?.[1] || 1);
		// Buy symbol is the right half of asset `SELL>BUY`.
		const buyRef = String(intent.asset || '').split('>').slice(1).join('>').trim() || null;
		const check = await verifySwapReceipt(chainId, txHash, intent.counterparty, buyRef);
		if (!check.ok) {
			if (check.reason === 'tx_failed') {
				await supabaseRest(`/rest/v1/bank_transactions?id=eq.${encodeURIComponent(intentId)}&owner=eq.${user.id}`, {
					method: 'PATCH', body: { status: 'failed', reference: txHash },
				}).catch(() => {});
			}
			return res.status(422).json({ error: check.reason, message: check.message });
		}
		const rows = await supabaseRest(`/rest/v1/bank_transactions?id=eq.${encodeURIComponent(intentId)}&owner=eq.${user.id}`, {
			method: 'PATCH', body: { status: 'completed', reference: txHash }, prefer: 'return=representation',
		});
		if (!rows?.[0]) return res.status(404).json({ error: 'intent not found' });
		if (check.level === 'basic') logger.info(`swap ${intentId} confirmed at basic level (${check.note || 'unresolved buy token'})`);
		return res.json({ ok: true, swap: toLedgerTx(rows[0]), verification: check.level });
	} catch (err) {
		logger.error('swap confirm failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Fiat → crypto on-ramp (Transak widget, non-custodial) ──────────
// Returns a hosted widget URL prefilled with the user's own wallet address.
// Purchase + KYC happen with Transak; crypto lands in the user's wallet,
// so nothing touches the TradingBible ledger.
router.post('/onramp/order', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const apiKey = process.env.TRANSAK_API_KEY || '';
	if (!apiKey) return res.status(503).json({ error: 'onramp_unavailable', message: 'Card-to-crypto is not enabled yet.' });
	const walletAddress = String(req.body?.walletAddress || '').trim();
	const currency = String(req.body?.currency || 'USDC').trim().toUpperCase().slice(0, 12);
	const network = String(req.body?.network || 'ethereum').trim().toLowerCase().slice(0, 24);
	const fiatAmount = Number(req.body?.fiatAmount || 0);
	const fiatCurrency = String(req.body?.fiatCurrency || 'USD').trim().toUpperCase().slice(0, 4);
	if (!walletAddress || walletAddress.length > 128) return res.status(422).json({ error: 'wallet address required' });
	if (fiatAmount && (fiatAmount < 5 || fiatAmount > 50000)) return res.status(422).json({ error: 'amount must be 5-50000' });
	try {
		const env = String(process.env.TRANSAK_ENV || 'staging').toLowerCase() === 'production' ? 'PRODUCTION' : 'STAGING';
		const base = env === 'PRODUCTION' ? 'https://global.transak.com' : 'https://global-stg.transak.com';
		const params = new URLSearchParams({
			apiKey, environment: env, walletAddress,
			cryptoCurrencyCode: currency, network,
			fiatCurrency, redirectURL: `${appOrigin(req)}/app/wallet?onramp=return`,
			partnerOrderId: `tb_${user.id}_${Date.now()}`,
		});
		if (fiatAmount) params.set('fiatAmount', String(fiatAmount));
		return res.json({ url: `${base}/?${params.toString()}`, environment: env });
	} catch (err) {
		logger.error('onramp order failed', String(err));
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
			query: { select: '*', kind: 'in.(withdraw,withdraw_crypto,swap)', order: 'created.desc', limit: 100 },
		});
		const txs = (rows || []).map(toLedgerTx).filter(Boolean);
		// Attach owner email + rail status for the admin queue (best effort).
		try {
			const owners = [...new Set((rows || []).map((r) => r.owner).filter(Boolean))];
			if (owners.length) {
				const users = await supabaseRest('/rest/v1/users', {
					query: { select: 'id,email', id: `in.(${owners.map((o) => encodeURIComponent(o)).join(',')})`, limit: 200 },
				}).catch(() => []);
				const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
					query: { select: 'owner,connect_status,kyc_status', owner: `in.(${owners.map((o) => encodeURIComponent(o)).join(',')})`, limit: 200 },
				}).catch(() => []);
				const emailById = Object.fromEntries((users || []).map((u) => [u.id, u.email]));
				const railByOwner = Object.fromEntries((rails || []).map((r) => [r.owner, r]));
				for (const t of txs) {
					const ownerRow = (rows || []).find((r) => r.id === t.id);
					const owner = ownerRow?.owner || null;
					t.userEmail = (owner && emailById[owner]) || null;
					const rail = (owner && railByOwner[owner]) || null;
					t.connectStatus = rail?.connect_status || null;
					t.kycStatus = rail?.kyc_status || null;
				}
			}
		} catch { /* enrichment is optional */ }
		return res.json({ withdrawals: txs });
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
	// TBC payments activate with the on-chain payment verifier (treasury +
	// market price, post token launch). Until then, fail loudly — never
	// silently take fiat for unissued tokens.
	if (intent === 'tbc' || plan === 'tbc') {
		return res.status(503).json({ error: 'tbc_unavailable', message: 'TBC payments open at token launch.' });
	}
	const isAcademy = intent === 'academy';
	const priceMap = { pro: 19.99, elite: 49.99, professional: 99, academy: 150 };
	const key = isAcademy ? 'academy' : plan;
	const amount = priceMap[key];
	if (!amount) return res.status(422).json({ error: 'unknown plan' });
	try {
		// Plans settle in cash (exempt). Academy settles in TBC like
		// everything else inside the app.
		let tbcAmount = 0;
		if (isAcademy) {
			const { requireTbc } = await import('../utils/tbc-econ.js');
			try {
				({ tbc: tbcAmount } = await requireTbc(user.id, amount));
			} catch (e) {
				if (e?.code === 'insufficient_tbc') return res.status(422).json({ error: e.message });
				throw e;
			}
		} else {
			const balance = await getLedgerBalance(user.id);
			if (balance < amount) return res.status(422).json({ error: `insufficient wallet balance ($${balance.toFixed(2)} < $${amount})` });
		}
		const patch = {};
		if (isAcademy) { patch.academyAccess = true; patch.academyPurchasedAt = new Date().toISOString(); }
		else { patch.plan = key; patch.subscriptionStatus = 'active'; patch.currentPeriodEnd = new Date(Date.now() + 30*86400000).toISOString(); }
		// Try to persist plan/academy - ignore missing columns
		try { await supabaseRest(`/rest/v1/users?id=eq.${user.id}`, { method: 'PATCH', body: patch, prefer: 'return=representation' }); } catch (e) { logger.warn('wallet pay user patch failed', String(e)); }
		await addLedgerTx({
			owner: user.id, kind: 'pay', amount: isAcademy ? -tbcAmount : -amount, status: 'completed',
			reference: key, counterparty: 'internal', asset: isAcademy ? 'TBC' : key,
			fiatValue: isAcademy ? amount : undefined,
		});
		return res.json({ ok: true, balance: await getLedgerBalance(user.id), ...(isAcademy ? { tbcCharged: tbcAmount, kwdCharged: tbcAmount, peg: '1 TBC = 1 KWD' } : {}) });
	} catch (err) {
		logger.error('wallet pay failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
