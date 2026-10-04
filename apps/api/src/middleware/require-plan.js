// Tier enforcement for paid API surfaces. Must run AFTER supabaseAuth
// (needs req.userId). Admins always pass. Everyone else needs a plan at or
// above the required tier ('pro' | 'elite' | 'professional').
// Fails closed: unknown/empty plans are rejected.

import { supabase } from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';

const RANK = { pro: 1, elite: 2, professional: 3 };

export const requirePlan = (minimum) => async (req, res, next) => {
	const need = RANK[String(minimum || '').toLowerCase()] || 0;
	if (need <= 0) return next();
	try {
		const user = await supabase.getUserById(req.userId);
		if (user?.role === 'admin') return next();
		const have = RANK[String(user?.plan || '').toLowerCase()] || 0;
		if (have >= need && have > 0) return next();
		return res.status(403).json({
			error: {
				message: `This feature requires the ${minimum} plan or higher. Upgrade to unlock it.`,
				code: 'plan_required',
				required: minimum,
			},
		});
	} catch (err) {
		logger.error('plan check failed', String(err?.message || err));
		return res.status(500).json({ error: { message: 'Could not verify subscription.' } });
	}
};
