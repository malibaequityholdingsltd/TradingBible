import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { getSupabaseUser } from '../utils/supabaseClient.js';
import { evaluateChallenge, toProduct } from '../lib/challengeRules.js';
import { enforceChallengesForUser, notifyBreach, getAttemptTrades, flattenAttemptAccount } from '../lib/challengeEnforce.js';

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
		// Owned execution: every attempt gets a dedicated in-house paper
		// account (no outside broker in the loop). Legacy fallback kept.
		const bought = attempt?.[0] || null;
		if (bought?.id) {
			await supabaseRest('/rest/v1/paper_accounts', {
				method: 'POST',
				body: { owner: user.id, name: `challenge:${bought.id}`, balance: product.accountSize, contest: productKey },
				prefer: 'return=representation',
			}).catch((e) => logger.warn('challenge paper account failed', String(e?.message || e)));
		}
		return res.json({ ok: true, attempt: bought, tbcCharged: tbcFee });
	} catch (err) {
		logger.error('challenge buy failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── My attempts (auto-enforces: breached actives fail + lock here) ──
router.get('/my', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		await enforceChallengesForUser(user.id).catch(() => {});
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
		const windowed = await getAttemptTrades(user.id, attempt);
		const result = evaluateChallenge({ startBalance: product.accountSize, rules: product.rules, trades: windowed });

		const status = result.failed ? 'failed' : result.status === 'passed' ? 'passed' : 'active';
		const updated = await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${attempt.id}`, {
			method: 'PATCH',
			body: { stats: result, status, decided_at: status === 'active' ? null : new Date().toISOString() },
			prefer: 'return=representation',
		});
		if (status === 'failed') {
			const labels = (result.checks || []).filter((c) => !c.pass && !c.soft).map((c) => c.label).join('; ') || 'hard rail breached';
			const flat = await flattenAttemptAccount(user.id, attempt).catch(() => ({ flattened: 0 }));
			await notifyBreach(user.id, product.name || attempt.product_key,
				`${labels}${flat.flattened ? ` — ${flat.flattened} open position(s) auto-closed` : ''}`).catch(() => {});
		}
		return res.json({ ok: true, attempt: updated?.[0] || null, result });
	} catch (err) {
		logger.error('challenge evaluate failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Trader: request a payout on a passed attempt ────────────────
// Creates a pending payout_request ledger row. The desk approves via
// POST /admin/payout/:id, which credits the reward in TBC to the
// trader's till, flips the request to completed and refunds the entry
// fee in TBC on the first payout. No bank connection needed.
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

// ── Admin: pay pass reward in TBC to the trader's till ──────────
// Product carries `payout` (USD pass reward, set in Content → Challenges).
// Reward is credited in TBC (converted at the live rate); ledger + attempt flip.
router.post('/admin/payout/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
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
		const prior = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: 'id', owner: `eq.${attempt.owner}`, kind: 'eq.payout', reference: `eq.payout:${attempt.id}`, limit: 1 },
		}).catch(() => []);
		if (prior?.length) return res.status(422).json({ error: 'already paid' });
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
		const { tbcForUsd } = await import('../utils/tbc-econ.js');
		const { tbc: payoutTbc } = await tbcForUsd(payout);
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: attempt.owner, kind: 'payout', amount: payoutTbc, currency: 'TBC', status: 'completed', reference: `payout:${attempt.id}`, counterparty: 'internal', asset: 'TBC', fiatValue: payout },
			prefer: 'return=representation',
		});
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
		return res.json({ ok: true, payoutTbc, payoutUsd: payout, ...(refundTbc > 0 ? { feeRefundedTbc: refundTbc } : {}) });
	} catch (err) {
		logger.error('challenge payout failed', String(err));
		return res.status(502).json({ error: err?.message || 'payout failed' });
	}
});

export default router;
