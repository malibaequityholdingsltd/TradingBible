import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { getSupabaseUser } from '../utils/supabaseClient.js';
import { evaluateChallenge } from '../lib/challengeRules.js';

// ── Funded challenges ────────────────────────────────────────────
// Products live in `admin_integrations` (key `challenge:<slug>`, managed in
// Admin → Content). Buying debits the wallet ledger; evaluation runs over
// the user's journal trades since the attempt started. Passing attempts are
// paid out through the existing Stripe Connect rails (admin approves payout
// per attempt in Admin → Billing → Payouts).

const router = Router();

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

async function isAdmin(user) {
	if (!user) return false;
	try {
		const rows = await supabaseRest(`/rest/v1/users?id=eq.${user.id}&select=role`, { query: { select: 'role', limit: 1 } });
		return rows?.[0]?.role === 'admin';
	} catch { return false; }
}

function accountTypesFor(c) {
	const mode = String(c.mode || c.phase || 'two-step');
	if (mode === 'futures') {
		return [{ id: 'futures', label: 'Futures', leverage: String(c.leverage || 'Futures margin'), holding: 'Exchange hours + contract calendar', news: 'Unrestricted' }];
	}
	const levStd = String(c.leverageStandard || c.leverage || '1:100');
	const levSwing = String(c.leverageSwing || '1:30');
	const opts = String(c.accountTypeOptions || 'standard,swing').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
	const all = {
		standard: { id: 'standard', label: 'Standard', leverage: levStd, holding: 'Intraday only — NO overnight / NO weekend holding (flat by close)', news: 'News trading NOT ALLOWED' },
		swing: { id: 'swing', label: 'Swing', leverage: levSwing, holding: 'Overnight + weekend holding allowed', news: 'No news restrictions' },
	};
	const picked = opts.filter((o) => all[o]).map((o) => all[o]);
	return picked.length ? picked : [all.standard, all.swing];
}

function toProduct(row) {
	const c = row?.config || {};
	const feeStd = Number(c.feeStandard ?? c.fee) || 0;
	const feeSwing = Number(c.feeSwing ?? c.fee) || 0;
	return {
		key: String(row.key || '').replace(/^challenge:/, ''),
		name: c.name || row.key,
		description: c.description || '',
		fee: feeStd,
		fees: { standard: feeStd, swing: feeSwing },
		accountSize: Number(c.accountSize) || 100000,
		// Phase 1 (evaluated by the engine) + Phase 2 verification (displayed,
		// same risk rails, lower target) + funded terms (displayed).
		phase: String(c.phase || 'two-step'),
		mode: String(c.mode || c.phase || 'two-step'),
		leverage: String(c.leverage || '1:100'),
		platforms: String(c.platforms || 'MT5 · cTrader · TradingBible Terminal'),
		instruments: String(c.instruments || 'Forex · Metals · Indices · Crypto · Stocks'),
		maxContracts: Math.trunc(Number(c.maxContracts ?? 0)),
		refundableFee: c.refundableFee !== false,
		accountTypes: accountTypesFor(c),
		rules: {
			mode: String(c.mode || c.phase || 'two-step'),
			targetPct: Number(c.targetPct ?? 10),
			target2Pct: Number(c.target2Pct ?? 5),
			targetUsd: Number(c.targetUsd ?? 0),
			maxDrawdownPct: Number(c.maxDrawdownPct ?? 10),
			maxDdUsd: Number(c.maxDdUsd ?? 0),
			maxLossMode: String(c.maxLossMode || ((c.mode || c.phase) === 'two-step' ? 'static' : 'eod-trailing')),
			dailyLossPct: Number(c.dailyLossPct ?? (((c.mode || c.phase) === 'one-step') ? 3 : ((c.mode || c.phase) === 'futures' ? 0 : 5))),
			dailyLossUsd: Number(c.dailyLossUsd ?? 0),
			dailyEnforced: c.dailyEnforced !== false,
			minDays: Math.trunc(Number(c.minDays ?? 4)),
			bestDayMaxPct: Number(c.bestDayMaxPct ?? ((c.mode || c.phase) === 'one-step' ? 50 : 0)),
			consistencyMaxPct: Number(c.consistencyMaxPct ?? 0),
			consistencyBase: String(c.consistencyBase || 'total'),
		},
		funded: {
			profitSplitPct: Number(c.profitSplitPct ?? 80),
			maxSplitPct: Number(c.maxSplitPct ?? 90),
			payoutCycleDays: Math.trunc(Number(c.payoutCycleDays ?? 14)),
			scaling: String(c.scaling || 'Qualify every 4 months: +25% capital, up to $400K'),
		},
		enabled: row.enabled !== false,
	};
}

// ── Public: challenge catalog ────────────────────────────────────
router.get('/products', async (req, res) => {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': 'like.challenge:%', enabled: 'eq.true', order: 'created.asc', limit: 50 },
		});
		return res.json({ products: (rows || []).map(toProduct) });
	} catch (err) {
		logger.error('challenges products failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Buy a challenge (wallet debit → attempt) ─────────────────────
router.post('/buy', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const productKey = String(req.body?.productKey || '').trim();
	if (!productKey) return res.status(422).json({ error: 'product required' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': `eq.challenge:${productKey}`, limit: 1 },
		});
		const row = rows?.[0];
		if (!row || row.enabled === false) return res.status(404).json({ error: 'product not found' });
		const product = toProduct(row);
		const wantType = String(req.body?.accountType || '').trim().toLowerCase();
		const typeIds = (product.accountTypes || []).map((t) => t.id);
		const accountType = typeIds.includes(wantType) ? wantType : (typeIds[0] || 'standard');
		// One live seat per balance: a trader may hold 200K + 100K + 50K… at
		// once, but never two live attempts of the same balance. Rebuy of a
		// balance opens only after that contract breaches (failed) or pays.
		try {
			const mine = await supabaseRest('/rest/v1/challenge_attempts', {
				query: { select: 'product_key,status', owner: `eq.${user.id}`, limit: 100 },
			}).catch(() => []);
			const live = (mine || []).filter((a) => ['active', 'passed'].includes(String(a.status)));
			if (live.length) {
				const allProds = await supabaseRest('/rest/v1/admin_integrations', {
					query: { select: 'key,config', 'key': 'like.challenge:%', limit: 100 },
				}).catch(() => []);
				const sizeByKey = Object.fromEntries((allProds || []).map((r) => [
					String(r.key || '').replace(/^challenge:/, ''), Number(r.config?.accountSize) || 0,
				]));
				const mySize = Number(product.accountSize) || 0;
				const clash = live.some((a) => (sizeByKey[String(a.product_key)] || 0) === mySize && mySize > 0);
				if (clash) {
					return res.status(422).json({ error: `you already hold a live $${mySize.toLocaleString()} evaluation — one live seat per balance (rebuy opens if it breaches)` });
				}
			}
		} catch (err) {
			logger.warn('challenge duplicate-seat check failed open', String(err?.message || err));
		}
		const fee = accountType === 'swing' ? (product.fees?.swing ?? product.fee) : (product.fees?.standard ?? product.fee);
		// TBC-only settlement: USD list price, paid in TBC at the published rate.
		const { requireTbc } = await import('../utils/tbc-econ.js');
		let tbcFee;
		try {
			({ tbc: tbcFee } = await requireTbc(user.id, fee));
		} catch (e) {
			if (e?.code === 'insufficient_tbc') return res.status(422).json({ error: e.message });
			throw e;
		}

		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'pay', amount: -tbcFee, currency: 'TBC', status: 'completed', reference: `challenge:${productKey}:${accountType}`, counterparty: 'internal', asset: 'TBC', fiatValue: fee },
			prefer: 'return=representation',
		});
		let attempt;
		try {
			attempt = await supabaseRest('/rest/v1/challenge_attempts', {
				method: 'POST',
				body: { owner: user.id, product_key: productKey, product_name: `${product.name} · ${accountType}`, fee_paid: fee, status: 'active', account_type: accountType },
				prefer: 'return=representation',
			});
		} catch (e) {
			// Older DBs without the account_type column: retry bare.
			if (!/account_type|column/i.test(String(e?.message || e))) throw e;
			attempt = await supabaseRest('/rest/v1/challenge_attempts', {
				method: 'POST',
				body: { owner: user.id, product_key: productKey, product_name: product.name, fee_paid: product.fee, status: 'active' },
				prefer: 'return=representation',
			});
		}
		return res.json({ ok: true, attempt: attempt?.[0] || null, tbcCharged: tbcFee });
	} catch (err) {
		logger.error('challenge buy failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── My attempts ──────────────────────────────────────────────────
router.get('/my', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/challenge_attempts', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'created_at.desc', limit: 50 },
		});
		return res.json({ attempts: rows || [] });
	} catch (err) {
		logger.error('challenges my failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Evaluate an attempt over journal trades ──────────────────────
router.post('/evaluate/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${encodeURIComponent(req.params.id)}&owner=eq.${user.id}`, {
			query: { select: '*', limit: 1 },
		});
		const attempt = rows?.[0];
		if (!attempt) return res.status(404).json({ error: 'attempt not found' });
		if (attempt.status !== 'active') return res.json({ ok: true, attempt });

		const prodRows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.challenge:${attempt.product_key}`, limit: 1 },
		}).catch(() => []);
		const product = toProduct({ key: attempt.product_key, config: prodRows?.[0]?.config || {} });
		const trades = await supabaseRest('/rest/v1/trades', {
			query: { select: 'pnl,tradeDate', owner: `eq.${user.id}`, order: 'tradeDate.asc', limit: 5000 },
		}).catch(() => []);
		const since = new Date(attempt.started_at).getTime();
		const windowed = (trades || []).filter((t) => new Date(t.tradeDate).getTime() >= since);
		const result = evaluateChallenge({ startBalance: product.accountSize, rules: product.rules, trades: windowed });

		const status = result.failed ? 'failed' : result.status === 'passed' ? 'passed' : 'active';
		const updated = await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${attempt.id}`, {
			method: 'PATCH',
			body: { stats: result, status, decided_at: status === 'active' ? null : new Date().toISOString() },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, attempt: updated?.[0] || null, result });
	} catch (err) {
		logger.error('challenge evaluate failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Trader: request a payout on a passed attempt ────────────────
// Creates a pending payout_request ledger row. The desk approves via
// POST /admin/payout/:id, which transfers to the trader's connected
// bank, flips the request to completed and refunds the entry fee in
// TBC on the first payout.
router.post('/payout/request', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const attemptId = String(req.body?.attemptId || '').trim();
	if (!attemptId) return res.status(422).json({ error: 'attempt required' });
	try {
		const rows = await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${encodeURIComponent(attemptId)}&owner=eq.${user.id}`, {
			query: { select: '*', limit: 1 },
		});
		const attempt = rows?.[0];
		if (!attempt) return res.status(404).json({ error: 'attempt not found' });
		if (attempt.status === 'paid') return res.status(422).json({ error: 'already paid' });
		if (attempt.status !== 'passed') return res.status(422).json({ error: 'pass the evaluation first' });
		const txs = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: 'kind,status,reference', owner: `eq.${user.id}`, limit: 500 },
		}).catch(() => []);
		const dup = (txs || []).some((t) => t.kind === 'payout_request' && t.status === 'pending' && String(t.reference || '').startsWith(`payout_req:${attempt.id}:`));
		if (dup) return res.status(422).json({ error: 'payout already requested — the desk is reviewing it' });
		const prodRows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.challenge:${attempt.product_key}`, limit: 1 },
		}).catch(() => []);
		const payout = Number(prodRows?.[0]?.config?.payout) || 0;
		if (!(payout > 0)) return res.status(422).json({ error: 'payouts are not configured for this program yet' });
		const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
			query: { select: 'connect_account_id,connect_status', owner: `eq.${user.id}`, limit: 1 },
		}).catch(() => []);
		const rail = rails?.[0];
		if (!rail?.connect_account_id || rail.connect_status !== 'active') {
			return res.status(422).json({ error: 'connect your bank first (Wallet → Way out)' });
		}
		const created = await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'payout_request', amount: payout, currency: 'USD', status: 'pending', reference: `payout_req:${attempt.id}:${Date.now()}`, counterparty: 'trader_request', asset: 'USD', fiatValue: payout },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, request: created?.[0] || null, payout });
	} catch (err) {
		logger.error('challenge payout request failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Trader: payout + refund history ────────────────────────────
router.get('/payouts/my', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'created.desc', limit: 100 },
		}).catch(() => []);
		const payouts = (rows || []).filter((r) => ['payout', 'payout_request', 'refund'].includes(r.kind));
		return res.json({ payouts });
	} catch (err) {
		logger.error('challenges payouts failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: all attempts ──────────────────────────────────────────
router.get('/admin/all', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	try {
		const rows = await supabaseRest('/rest/v1/challenge_attempts', {
			query: { select: '*', order: 'created_at.desc', limit: 200 },
		});
		const owners = [...new Set((rows || []).map((r) => r.owner).filter(Boolean))];
		let emailById = {};
		if (owners.length) {
			const users = await supabaseRest('/rest/v1/users', {
				query: { select: 'id,email', id: `in.(${owners.map(encodeURIComponent).join(',')})`, limit: 200 },
			}).catch(() => []);
			emailById = Object.fromEntries((users || []).map((u) => [u.id, u.email]));
		}
		return res.json({ attempts: (rows || []).map((r) => ({ ...r, userEmail: emailById[r.owner] || null })) });
	} catch (err) {
		logger.error('challenges admin failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: pay pass reward via the trader's Connect account ──────
// Product carries `payout` (USD pass reward, set in Content → Challenges).
// Transfer goes platform → trader Connect account; ledger + attempt flip.
router.post('/admin/payout/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	const Stripe = (await import('stripe')).default;
	const key = process.env.STRIPE_SECRET_KEY || '';
	if (!key) return res.status(503).json({ error: 'Stripe not configured' });
	try {
		const rows = await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${encodeURIComponent(req.params.id)}`, {
			query: { select: '*', limit: 1 },
		});
		const attempt = rows?.[0];
		if (!attempt) return res.status(404).json({ error: 'attempt not found' });
		if (attempt.status !== 'passed') return res.status(422).json({ error: 'attempt has not passed' });
		const prodRows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.challenge:${attempt.product_key}`, limit: 1 },
		}).catch(() => []);
		const payout = Number(prodRows?.[0]?.config?.payout) || 0;
		if (!(payout > 0)) return res.status(422).json({ error: 'set a pass reward on the product first' });
		const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
			query: { select: 'connect_account_id,connect_status', owner: `eq.${attempt.owner}`, limit: 1 },
		}).catch(() => []);
		const rail = rails?.[0];
		if (!rail?.connect_account_id || rail.connect_status !== 'active') {
			return res.status(422).json({ error: 'trader bank not connected' });
		}
		// Same payout-fraud scan as wallet withdrawals (never on purchases).
		try {
			const { scanPayoutIdentity } = await import('../utils/payout-scan.js');
			const scan = await scanPayoutIdentity(attempt.owner);
			if (scan.suspended || scan.already) {
				return res.status(403).json({ error: 'account_suspended', message: 'Trader account is suspended pending an identity review.' });
			}
		} catch (err) {
			logger.warn('challenge payout scan hook failed open', String(err?.message || err));
		}
		const stripe = new Stripe(key);
		const transfer = await stripe.transfers.create({
			amount: Math.round(payout * 100),
			currency: 'usd',
			destination: rail.connect_account_id,
			description: `TradingBible Funded pass reward ${attempt.product_key}`.slice(0, 200),
		}, { idempotencyKey: `challenge_payout_${attempt.id}` });
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: attempt.owner, kind: 'payout', amount: payout, currency: 'USD', status: 'completed', reference: transfer.id, counterparty: 'stripe_connect', asset: 'USD', fiatValue: payout },
			prefer: 'return=representation',
		}).catch(() => {});
		await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${attempt.id}`, {
			method: 'PATCH', body: { status: 'paid', decided_at: new Date().toISOString() },
		});
		// Flip any pending payout requests for this attempt to completed.
		try {
			const txs = await supabaseRest('/rest/v1/bank_transactions', {
				query: { select: 'id,kind,status,reference', owner: `eq.${attempt.owner}`, limit: 500 },
			}).catch(() => []);
			const pending = (txs || []).filter((t) => t.kind === 'payout_request' && t.status === 'pending' && String(t.reference || '').startsWith(`payout_req:${attempt.id}:`));
			for (const p of pending) {
				await supabaseRest(`/rest/v1/bank_transactions?id=eq.${p.id}`, {
					method: 'PATCH', body: { status: 'completed' },
				}).catch(() => {});
			}
		} catch (err) {
			logger.warn('challenge payout request flip failed', String(err?.message || err));
		}
		// First payout refunds the entry fee in TBC (entry was paid in TBC).
		let refundTbc = 0;
		try {
			const feeUsd = Number(attempt.fee_paid) || 0;
			if (feeUsd > 0) {
				const txs = await supabaseRest('/rest/v1/bank_transactions', {
					query: { select: 'kind,reference', owner: `eq.${attempt.owner}`, limit: 500 },
				}).catch(() => []);
				const already = (txs || []).some((t) => t.kind === 'refund' && String(t.reference || '') === `fee_refund:${attempt.id}`);
				if (!already) {
					const { tbcForUsd } = await import('../utils/tbc-econ.js');
					const { tbc } = await tbcForUsd(feeUsd);
					refundTbc = tbc;
					await supabaseRest('/rest/v1/bank_transactions', {
						method: 'POST',
						body: { owner: attempt.owner, kind: 'refund', amount: tbc, currency: 'TBC', status: 'completed', reference: `fee_refund:${attempt.id}`, counterparty: 'internal', asset: 'TBC', fiatValue: feeUsd },
						prefer: 'return=representation',
					}).catch(() => {});
				}
			}
		} catch (err) {
			logger.warn('challenge fee refund failed', String(err?.message || err));
		}
		return res.json({ ok: true, transferId: transfer.id, payout, ...(refundTbc > 0 ? { feeRefundedTbc: refundTbc } : {}) });
	} catch (err) {
		logger.error('challenge payout failed', String(err));
		return res.status(502).json({ error: err?.message || 'payout failed' });
	}
});

export default router;
