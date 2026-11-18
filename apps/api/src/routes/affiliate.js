import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';

const router = Router();

// TradingBible affiliate program — 10% commission on every eligible purchase
// made by a referred user. The public page, dashboard and backend must agree
// on this rate.
export const COMMISSION_RATE = 0.10;
const COMMISSION_EVENT = 'affiliate_commission';

function money(value) {
	return Math.round((Number(value) || 0) * 100) / 100;
}

function statusRank(status) {
	// A new purchase creates an active line even after an earlier payout, so
	// active/pending states must outrank the older paid line in the summary.
	return { signed_up: 0, paid: 1, active: 2, pending_payout: 3 }[status] || 0;
}

// Record one commission line for an eligible purchase. The original signup row
// stays as the referral record; each purchase gets its own line so a later
// payout can never include an amount that was already paid.
export async function awardAffiliateCommission({ userId, email, amount, currency, transactionId, plan, occurredAt } = {}) {
	const cleanEmail = String(email || '').trim().toLowerCase();
	const txId = String(transactionId || '').trim();
	const gross = Number(amount) || 0;
	if (!userId || !cleanEmail || !txId || gross <= 0) return null;

	const existing = await supabaseRest(
		`/rest/v1/billing_events?owner=eq.${encodeURIComponent(userId)}&eventType=eq.${COMMISSION_EVENT}&transactionId=eq.${encodeURIComponent(txId)}&status=in.(processing,recorded)&select=id&limit=1`,
	).catch(() => []);
	if (existing?.length) return { duplicate: true };

	const rows = await supabaseRest(
		`/rest/v1/affiliate_signups?email=eq.${encodeURIComponent(cleanEmail)}&order=created.desc&select=*&limit=1`,
	).catch(() => []);
	const signup = rows?.[0];
	if (!signup?.code) return null;

	const codeRow = await supabase.getAffiliateCodeByCode(signup.code).catch(() => null);
	if (codeRow?.owner && String(codeRow.owner) === String(userId)) return { selfReferral: true };
	const rate = Number(codeRow?.commissionRate) || COMMISSION_RATE;
	const commission = money(gross * rate);
	if (commission <= 0) return null;

	// Reserve the Stripe transaction first. If the ledger write below fails,
	// the reservation is marked failed so a webhook retry can try again.
	const marker = await supabaseRest('/rest/v1/billing_events', {
		method: 'POST',
		body: {
			owner: userId,
			eventType: COMMISSION_EVENT,
			transactionId: txId,
			status: 'processing',
			planName: String(plan || 'purchase').slice(0, 80),
			amount: commission,
			currency: String(currency || 'usd').slice(0, 8),
			occurredAt: occurredAt || new Date().toISOString(),
		},
		prefer: 'return=representation',
	}).then((created) => created?.[0] || null).catch(() => null);
	if (!marker?.id) return null;

	try {
		await supabaseRest('/rest/v1/affiliate_signups', {
			method: 'POST',
			body: {
				codeId: signup.codeId || null,
				code: signup.code,
				email: cleanEmail,
				status: 'active',
				commission,
			},
			prefer: 'return=representation',
		});
		await supabaseRest(`/rest/v1/billing_events?id=eq.${encodeURIComponent(marker.id)}`, {
			method: 'PATCH',
			body: { status: 'recorded' },
		}).catch(() => null);
		return { commission, rate, code: signup.code };
	} catch (err) {
		await supabaseRest(`/rest/v1/billing_events?id=eq.${encodeURIComponent(marker.id)}`, {
			method: 'PATCH',
			body: { status: 'failed' },
		}).catch(() => null);
		logger.error('affiliate commission credit failed', String(err));
		return null;
	}
}

function cleanCode(raw) {
	return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function generateCode(username) {
	const base = cleanCode(username || '').replace(/[^a-z0-9]/g, '') || 'trader';
	return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

async function getAuthedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const authUser = await getSupabaseUser(token);
	return authUser?.id ? authUser : null;
}

// ── Register: ensure the caller has their own referral code ──────
router.post('/register', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });

	try {
		let code = await supabase.getAffiliateCodeByOwner(user.id);
		if (!code) {
			let candidate = generateCode(user.email?.split('@')[0]);
			const existing = await supabase.getAffiliateCodeByCode(candidate).catch(() => null);
			if (existing) candidate = `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
			code = await supabase.createAffiliateCode({
				owner: user.id,
				code: candidate,
				clicks: 0,
				signups: 0,
				commissionRate: COMMISSION_RATE,
			});
		}
		return res.json({ code: code.code, rate: code.commissionRate || COMMISSION_RATE });
	} catch (err) {
		logger.error('affiliate register failed', String(err));
		return res.status(500).json({ error: 'register failed' });
	}
});

// ── Click tracking (public, fired by referral links) ─────────────
router.get('/track/click', async (req, res) => {
	const code = cleanCode(req.query.code);
	if (!code) return res.status(400).json({ error: 'missing code' });
	try {
		const row = await supabase.getAffiliateCodeByCode(code);
		if (row) {
			await supabase.updateAffiliateCode(row.id, { clicks: (row.clicks || 0) + 1 });
		}
		res.json({ ok: true });
	} catch (err) {
		logger.error('affiliate click track failed', String(err));
		res.status(500).json({ error: 'tracking failed' });
	}
});

// ── Signup tracking (public, fired after an OTP email is sent) ───
router.post('/track/signup', async (req, res) => {
	const code = cleanCode(req.body?.code);
	const email = String(req.body?.email || '').trim().toLowerCase();
	if (!code || !email) return res.status(400).json({ error: 'missing code or email' });

	try {
		const row = await supabase.getAffiliateCodeByCode(code);
		if (!row) return res.json({ ok: false, reason: 'unknown code' });

		const existing = await supabase.getAffiliateSignup(code, email).catch(() => null);
		if (existing) return res.json({ ok: true, duplicate: true });

		await supabase.createAffiliateSignup({
			codeId: row.id,
			code,
			email,
			status: 'signed_up',
			commission: 0,
		});
		await supabase.updateAffiliateCode(row.id, { signups: (row.signups || 0) + 1 });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('affiliate signup track failed', String(err));
		return res.status(500).json({ error: 'tracking failed' });
	}
});

// ── Stats (authed): the caller's code + referral performance ─────
router.get('/stats', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });

	try {
		let code = await supabase.getAffiliateCodeByOwner(user.id).catch(() => null);
		if (!code) {
			code = await supabase.createAffiliateCode({
				owner: user.id,
				code: generateCode(user.email?.split('@')[0]),
				clicks: 0,
				signups: 0,
				commissionRate: COMMISSION_RATE,
			});
		}

		const signups = await supabase.listAffiliateSignups(code.id).catch(() => []);
		const referrals = new Map();
		for (const signup of signups) {
			const key = String(signup.email || signup.id || '').trim().toLowerCase();
			if (!key) continue;
			const current = referrals.get(key) || {
				id: signup.id,
				email: signup.email,
				plan: null,
				commission: 0,
				status: signup.status || 'signed_up',
				created: signup.created,
			};
			current.commission = money(current.commission + Number(signup.commission || 0));
			if (statusRank(signup.status) > statusRank(current.status)) current.status = signup.status;
			referrals.set(key, current);
		}

		const pending = signups
			.filter((s) => ['signed_up', 'active', 'pending_payout'].includes(s.status))
			.reduce((sum, s) => sum + Number(s.commission || 0), 0);
		const paid = signups
			.filter((s) => s.status === 'paid')
			.reduce((sum, s) => sum + Number(s.commission || 0), 0);

		return res.json({
			code: code.code,
			rate: code.commissionRate || COMMISSION_RATE,
			clicks: code.clicks || 0,
			signups: referrals.size,
			pending: money(pending),
			paid: money(paid),
			referrals: [...referrals.values()].sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0)),
		});
	} catch (err) {
		logger.error('affiliate stats failed', String(err));
		return res.status(500).json({ error: 'stats failed' });
	}
});

// ── Claim payout: commissions are paid in TBC brand credits ────────
// Peg: 1 TBC = 1 KWD. USD-denominated commissions convert at the published
// TBC rate and land as ledger rows (asset='TBC'). TBC is the brand's money:
// spendable on challenges, signals and Academy, convertible, and
// claimable on-chain at token launch.
async function tbcRate() {
	const { tbcEcon } = await import('../utils/tbc-econ.js');
	const e = await tbcEcon().catch(() => ({ tbcPerUsd: 1 / 3.25 }));
	return Number(e.tbcPerUsd) || 1 / 3.25;
}

router.post('/claim', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });

	try {
		const code = await supabase.getAffiliateCodeByOwner(user.id).catch(() => null);
		if (!code) return res.status(422).json({ error: 'no affiliate code' });
		const updated = await supabase.claimAffiliateSignups(code.id).catch(() => []);
		if (!updated || !updated.length) return res.status(422).json({ error: 'nothing to claim' });
		const usd = money(updated.reduce((s, r) => s + (Number(r.commission) || 0), 0));
		const rate = await tbcRate().catch(() => 1);
		const tbc = money(usd * rate);
		const ids = updated.map((row) => row.id).filter(Boolean);
		const revert = async () => {
			const list = ids.map((id) => encodeURIComponent(id)).join(',');
			if (!list) return;
			await supabaseRest(`/rest/v1/affiliate_signups?id=in.(${list})`, {
				method: 'PATCH',
				body: { status: 'active' },
			}).catch(() => null);
		};
		if (tbc <= 0) {
			await revert();
			return res.status(422).json({ error: 'nothing to claim' });
		}
		try {
			const ledger = await supabaseRest('/rest/v1/bank_transactions', {
				method: 'POST',
				body: { owner: user.id, kind: 'affiliate_payout', amount: tbc, currency: 'TBC', status: 'completed', reference: `affiliate:${code.id}:${Date.now()}`, counterparty: 'tbc-economy', asset: 'TBC', fiatValue: usd },
				prefer: 'return=representation',
			});
			if (!ledger?.length) throw new Error('affiliate ledger write returned no row');
		} catch (err) {
			await revert();
			throw err;
		}
		await supabase.markAffiliateSignupsPaid(ids).catch((err) => {
			logger.error('affiliate payout marked paid failed', String(err));
			return [];
		});
		return res.json({ ok: true, claimed: updated.length, usd, tbc, rate });
	} catch (err) {
		logger.error('affiliate claim failed', String(err));
		return res.status(500).json({ error: 'claim failed' });
	}
});

export default router;