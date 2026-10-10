import { Router } from 'express';
import logger from '../utils/logger.js';
import { getSupabaseUser } from '../utils/supabaseClient.js';
import { runBacktest } from '../lib/backtest.js';

// ── Strategy backtesting ─────────────────────────────────────────
// POST /backtest/run { closes[], strategy, params, startBalance,
// riskFraction, spread, commission }. Pure compute over caller-supplied
// price history — no market-data keys required.

const router = Router();

router.post('/run', async (req, res) => {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return res.status(401).json({ error: 'unauthorized' });
	try {
		const user = await getSupabaseUser(token);
		if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
		const body = req.body || {};
		const closes = Array.isArray(body.closes) ? body.closes.slice(0, 5000) : [];
		const result = runBacktest({
			closes,
			strategy: String(body.strategy || 'sma_cross').slice(0, 20),
			params: body.params && typeof body.params === 'object' ? body.params : {},
			startBalance: Math.max(1, Math.min(100000000, Number(body.startBalance) || 10000)),
			riskFraction: Math.max(0.001, Math.min(1, Number(body.riskFraction) || 0.02)),
			spread: Math.max(0, Number(body.spread) || 0),
			commission: Math.max(0, Number(body.commission) || 0),
		});
		if (result.error) return res.status(422).json({ error: result.error });
		return res.json({ ok: true, result });
	} catch (err) {
		logger.error('backtest run failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
