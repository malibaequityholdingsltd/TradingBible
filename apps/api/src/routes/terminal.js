import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';

// ── TradingBible Terminal Premium: cloud workspaces ────────────────
// Authority split: live broker/prop account owns orders/positions/fills.
// This router owns SAVED WORK ONLY (layouts, versions, snapshots).

const router = Router();

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

function cleanLayout(body) {
	const l = (body && typeof body === 'object' && body.layout && typeof body.layout === 'object') ? body.layout : body;
	const out = {};
	if (l && typeof l === 'object') {
		for (const k of ['symbol', 'timeframe', 'chartType', 'centerTab', 'watchlist', 'features', 'orderflow', 'heatmap', 'replay', 'risk', 'name']) {
			if (l[k] !== undefined) out[k] = l[k];
		}
	}
	if (Array.isArray(out.watchlist)) out.watchlist = out.watchlist.filter((s) => typeof s === 'string').slice(0, 30);
	if (Array.isArray(out.features)) out.features = out.features.filter((s) => typeof s === 'string').slice(0, 20);
	return out;
}

router.get('/workspaces', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/terminal_workspaces', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'updated_at.desc', limit: 20 },
		}).catch(() => []);
		return res.json({ workspaces: rows || [] });
	} catch (err) {
		logger.error('terminal workspaces list failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.post('/workspaces', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const name = String(req.body?.name || 'My Desk').slice(0, 60);
	try {
		const rows = await supabaseRest('/rest/v1/terminal_workspaces', {
			method: 'POST',
			body: { owner: user.id, name, layout: cleanLayout(req.body) },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, workspace: rows?.[0] || null });
	} catch (err) {
		logger.error('terminal workspace save failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

router.post('/snapshots', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const symbol = String(req.body?.symbol || '').toUpperCase().slice(0, 20);
	const timeframe = String(req.body?.timeframe || '1h').slice(0, 10);
	try {
		const rows = await supabaseRest('/rest/v1/trade_snapshots', {
			method: 'POST',
			body: { owner: user.id, symbol, timeframe, state: cleanLayout(req.body) },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, snapshot: rows?.[0] || null });
	} catch (err) {
		logger.error('trade snapshot failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
