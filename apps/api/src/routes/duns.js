import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser } from '../utils/supabaseClient.js';
import { normalizeDuns, isValidDuns, lookupCompany, matchDuns } from '../api/duns.js';

const router = Router();

async function getAuthedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const authUser = await getSupabaseUser(token);
	return authUser?.id ? authUser : null;
}

function publicState(row) {
	const profile = row?.dunsProfile || row?.dunsprofile || null;
	return {
		dunsNumber: row?.dunsNumber || row?.dunsnumber || null,
		dunsStatus: row?.dunsStatus || row?.dunsstatus || 'unverified',
		dunsVerifiedAt: row?.dunsVerifiedAt || row?.dunsverifiedat || null,
		companyName: profile?.primaryName || null,
		sandbox: Boolean(profile?.sandbox),
		profile: profile ? {
			primaryName: profile.primaryName || null,
			city: profile.address?.city || null,
			country: profile.address?.country || null,
			employeeCount: profile.employeeCount ?? null,
			annualRevenue: profile.annualRevenue ?? null,
			industry: profile.industry || null,
			principals: Array.isArray(profile.principals) ? profile.principals.slice(0, 5) : [],
			failureScore: profile.failureScore ?? null,
			delinquencyScore: profile.delinquencyScore ?? null,
			paydex: profile.paydex ?? null,
			sandbox: Boolean(profile.sandbox),
		} : null,
	};
}

// ── GET /duns/status — current verification state for the signed-in user
router.get('/status', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const row = await supabase.getUserById(user.id);
		res.json(publicState(row));
	} catch (err) {
		logger.error('duns status failed', String(err));
		res.status(500).json({ error: 'status failed' });
	}
});

// ── POST /duns/verify { dunsNumber } — store + verify a 9-digit DUNS number
router.post('/verify', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const duns = normalizeDuns(req.body?.dunsNumber);
	if (!isValidDuns(duns)) return res.status(400).json({ error: 'duns_invalid', detail: 'DUNS number must be exactly 9 digits.' });
	try {
		const result = await lookupCompany(duns);
		await supabase.updateUser(user.id, {
			dunsNumber: duns,
			dunsStatus: result.status,
			dunsVerifiedAt: result.status === 'verified' ? new Date().toISOString() : null,
			dunsProfile: result.profile,
		});
		res.json({ dunsNumber: duns, dunsStatus: result.status, reason: result.reason || null, sandbox: Boolean(result.profile?.sandbox) });
	} catch (err) {
		logger.error('duns verify failed', String(err));
		res.status(500).json({ error: 'verify failed' });
	}
});

// ── GET /duns/company?duns=123456789 — fetch a D&B profile (live or sandbox)
router.get('/company', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const duns = normalizeDuns(req.query?.duns);
	if (!isValidDuns(duns)) return res.status(400).json({ error: 'duns_invalid' });
	try {
		const result = await lookupCompany(duns);
		res.json({ dunsNumber: duns, dunsStatus: result.status, profile: result.profile, reason: result.reason || null });
	} catch (err) {
		logger.error('duns company failed', String(err));
		res.status(500).json({ error: 'lookup failed' });
	}
});

// ── GET /duns/match?name=&city=&country= — resolve DUNS from company name
router.get('/match', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const result = await matchDuns({ name: req.query?.name, city: req.query?.city, country: req.query?.country });
		res.json(result);
	} catch (err) {
		if (String(err?.message) === 'match_name_required') return res.status(400).json({ error: 'match_name_required' });
		logger.error('duns match failed', String(err));
		res.status(500).json({ error: 'match failed' });
	}
});

export default router;
