import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';

// ── Ecosystem: tax export, leaderboard, broker referral links ────

const router = Router();

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

// ── Tax: realized-gains CSV over closed journal trades ────────────
// Assumption (labeled in the file): each journal row with a pnl is one
// closed trade. FIFO lots need open/close linkage the journal doesn't keep,
// so this is an accountant-ready starting point, not filing advice.
router.get('/tax/csv', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const year = Number(req.query?.year) || new Date().getFullYear();
	try {
		const trades = await supabaseRest('/rest/v1/trades', {
			query: { select: 'tradeDate,symbol,pnl,strategy', owner: `eq.${user.id}`, order: 'tradeDate.asc', limit: 5000 },
		}).catch(() => []);
		const rows = (trades || []).filter((t) => t.pnl !== null && t.pnl !== undefined && new Date(t.tradeDate).getFullYear() === year);
		const total = rows.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
		const wins = rows.filter((t) => Number(t.pnl) > 0).length;
		const lines = [
			'# TradingBible tax export — realized trade P&L. Estimates only; confirm with your accountant.',
			`# year,${year}`,
			`# trades,${rows.length},wins,${wins},net,${Math.round(total * 100) / 100}`,
			'date,symbol,strategy,pnl',
			...rows.map((t) => `${new Date(t.tradeDate).toISOString().slice(0, 10)},${t.symbol || ''},${t.strategy || ''},${Number(t.pnl) || 0}`),
		];
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="tradingbible-tax-${year}.csv"`);
		return res.send(lines.join('\n'));
	} catch (err) {
		logger.error('tax csv failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Leaderboard opt-in ───────────────────────────────────────────
router.post('/leaderboard/optin', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const display = String(req.body?.displayName || '').trim().slice(0, 24) || 'Trader';
		const enabled = req.body?.enabled !== false;
		await supabaseRest('/rest/v1/leaderboard_optins', {
			method: 'POST',
			body: { owner: user.id, display_name: display, enabled },
			prefer: 'return=representation,resolution=merge-duplicates',
		});
		return res.json({ ok: true, enabled });
	} catch (err) {
		logger.error('leaderboard optin failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

let lbCache = { ts: 0, rows: [] };
const LB_TTL = 10 * 60 * 1000;

// ── Public: verified leaderboard (opted-in traders, 5+ trades) ───
router.get('/leaderboard', async (req, res) => {
	try {
		if (Date.now() - lbCache.ts < LB_TTL && lbCache.rows.length) return res.json({ leaderboard: lbCache.rows, cached: true });
		const optins = await supabaseRest('/rest/v1/leaderboard_optins', {
			query: { select: 'owner,display_name', enabled: 'eq.true', limit: 200 },
		}).catch(() => []);
		const rows = [];
		for (const o of optins || []) {
			try {
				const trades = await supabaseRest('/rest/v1/trades', {
					query: { select: 'pnl', owner: `eq.${o.owner}`, limit: 2000 },
				}).catch(() => []);
				const pnls = (trades || []).map((t) => Number(t.pnl) || 0).filter((p) => p !== 0);
				if (pnls.length < 5) continue;
				const total = pnls.reduce((s, p) => s + p, 0);
				const wins = pnls.filter((p) => p > 0).length;
				rows.push({
					name: o.display_name || 'Trader',
					trades: pnls.length,
					winRate: Math.round((wins / pnls.length) * 1000) / 10,
					netPnl: Math.round(total * 100) / 100,
				});
			} catch { /* skip */ }
		}
		rows.sort((a, b) => b.netPnl - a.netPnl);
		const ranked = rows.slice(0, 100).map((r, i) => ({ rank: i + 1, ...r }));
		lbCache = { ts: Date.now(), rows: ranked };
		return res.json({ leaderboard: ranked, cached: false });
	} catch (err) {
		logger.error('leaderboard failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Public: broker referral links (admin-curated) ────────────────
router.get('/brokers/links', async (req, res) => {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config', 'key': 'like.brokerlink:%', enabled: 'eq.true', limit: 100 },
		}).catch(() => []);
		const links = {};
		for (const r of rows || []) {
			const id = r?.config?.provider || String(r.key || '').replace(/^brokerlink:/, '');
			const url = r?.config?.url || '';
			if (id && url) links[id] = url;
		}
		return res.json({ links });
	} catch (err) {
		logger.error('broker links failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
