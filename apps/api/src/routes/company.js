import { Router } from 'express';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

const router = Router();

async function assertCompany(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	const authUser = await getSupabaseUser(token);
	if (!authUser?.id) {
		const err = new Error('unauthorized');
		err.status = 401;
		throw err;
	}
	const profile = await supabase.getUserById(authUser.id).catch(() => null);
	const accountType = profile?.accountType || authUser.user_metadata?.accountType || 'individual';
	if (accountType !== 'company' && profile?.role !== 'admin') {
		const err = new Error('company account required');
		err.status = 403;
		throw err;
	}
	return authUser;
}

// ── GET /company/academy-interest — platform users showing academy
// interest (service-role; RLS never allows this client-side). Minimal
// public fields only: username + goal.
router.get('/academy-interest', supabaseAuth, async (req, res, next) => {
	try {
		await assertCompany(req);
		const rows = await supabaseRest('/rest/v1/users', {
			query: {
				select: 'username,goal',
				or: '(goal.ilike.*academy*,goal.ilike.*discipline*,goal.ilike.*learning*)',
				order: 'created_at.desc',
				limit: 200,
			},
		});
		res.json((rows || []).map((r) => ({
			username: r.username || 'user',
			goal: r.goal || null,
		})));
	} catch (err) { next(err); }
});

export default router;
