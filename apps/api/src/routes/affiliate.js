import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser } from '../utils/supabaseClient.js';

const router = Router();

// TradingBible affiliate program — 15% recurring commission (per product settings).
export const COMMISSION_RATE = 0.10;

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
		const pending = signups
			.filter((s) => ['signed_up', 'active'].includes(s.status))
			.reduce((sum, s) => sum + Number(s.commission || 0), 0);
		const paid = signups
			.filter((s) => s.status === 'paid')
			.reduce((sum, s) => sum + Number(s.commission || 0), 0);

		return res.json({
			code: code.code,
			rate: code.commissionRate || COMMISSION_RATE,
			clicks: code.clicks || 0,
			signups: signups.length,
			pending,
			paid,
			referrals: signups.map((s) => ({
				id: s.id,
				email: s.email,
				plan: s.plan || null,
				commission: Number(s.commission || 0),
				status: s.status,
				created: s.created,
			})),
		});
	} catch (err) {
		logger.error('affiliate stats failed', String(err));
		return res.status(500).json({ error: 'stats failed' });
	}
});

// ── Claim payout: move earned commissions to pending payout ──────
router.post('/claim', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });

	try {
		const code = await supabase.getAffiliateCodeByOwner(user.id).catch(() => null);
		if (!code) return res.status(422).json({ error: 'no affiliate code' });
		const updated = await supabase.claimAffiliateSignups(code.id).catch(() => []);
		if (!updated || !updated.length) return res.status(422).json({ error: 'nothing to claim' });
		return res.json({ ok: true, claimed: updated.length });
	} catch (err) {
		logger.error('affiliate claim failed', String(err));
		return res.status(500).json({ error: 'claim failed' });
	}
});

export default router;