import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';
import { yahooQuote } from '../utils/yahoo.js';

// ── Paper trading (+ competitions) ───────────────────────────────
// CFD-style simulator: no margin calls, P&L settles to the paper balance
// on close with 0.05% slippage against the trader. Fills price at the
// live quote the trader sees (passed by the client, verified server-side
// for SL/TP settlement and one-tap live closes). Play money only —
// paper P&L never touches the real ledger or journal.

const router = Router();
const SLIPPAGE = 0.0005;
const START_BALANCE = 100000;

function missingTable(err) {
	const m = String(err?.message || err || '');
	return /404|not find|does not exist|PGRST|relation .* does not exist/i.test(m);
}

function setupRes(res, err) {
	if (missingTable(err)) {
		return res.status(503).json({ error: 'setup_required', detail: 'Paper-trading tables are missing — run APPLY_MISSING_TABLES.sql in the Supabase SQL editor once.' });
	}
	return null;
}

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

async function ownAccount(userId, accountId) {
	const rows = await supabaseRest(`/rest/v1/paper_accounts?id=eq.${encodeURIComponent(accountId)}&owner=eq.${userId}`, {
		query: { select: '*', limit: 1 },
	}).catch(() => []);
	return rows?.[0] || null;
}

// Server-side live quote: Binance (rotating hosts) for crypto, Yahoo for
// everything else. Used for one-tap closes and SL/TP settlement.
const BIN_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api.binance.us'];
const CRYPTO_QUOTE = {
	BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
	XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT',
	XAUUSD: 'PAXGUSDT',
};

async function liveQuote(symbol) {
	const sym = String(symbol || '').toUpperCase();
	const bin = CRYPTO_QUOTE[sym] || (/^[A-Z0-9]{2,10}USDT$/.test(sym) ? sym : null);
	if (bin) {
		for (const host of BIN_HOSTS) {
			try {
				const r = await fetch(`${host}/api/v3/ticker/price?symbol=${bin}`);
				if (!r.ok) continue;
				const j = await r.json();
				const p = Number(j?.price);
				if (p > 0) return { price: p, source: 'binance' };
			} catch { /* next host */ }
		}
	}
	try {
		const q = await yahooQuote(sym);
		if (q && q.price > 0) return { price: q.price, source: 'yahoo' };
	} catch { /* fall through */ }
	return null;
}

async function settleTrade(user, t, exitPrice, reason) {
	const dir = t.side === 'short' ? -1 : 1;
	const exit = exitPrice * (1 - SLIPPAGE * dir);
	const pnl = Math.round((exit - Number(t.entry)) * Number(t.qty) * dir * 100) / 100;
	const patch = { status: 'closed', exit: exitPrice, pnl, closed_at: new Date().toISOString() };
	if (reason) patch.close_reason = reason;
	try {
		await supabaseRest(`/rest/v1/paper_trades?id=eq.${t.id}`, { method: 'PATCH', body: patch });
	} catch {
		// Older DBs without the close_reason column: retry without it.
		delete patch.close_reason;
		await supabaseRest(`/rest/v1/paper_trades?id=eq.${t.id}`, { method: 'PATCH', body: patch });
	}
	const acc = await ownAccount(user.id, t.account_id);
	if (acc) {
		await supabaseRest(`/rest/v1/paper_accounts?id=eq.${acc.id}`, {
			method: 'PATCH', body: { balance: Math.round((Number(acc.balance) + pnl) * 100) / 100 },
		}).catch(() => {});
	}
	return pnl;
}

router.post('/accounts', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const name = String(req.body?.name || 'Paper').trim().slice(0, 40) || 'Paper';
	const contest = String(req.body?.contest || '').trim().slice(0, 40) || null;
	try {
		const rows = await supabaseRest('/rest/v1/paper_accounts', {
			method: 'POST',
			body: { owner: user.id, name, balance: START_BALANCE, contest },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, account: rows?.[0] || null });
	} catch (err) {
		return setupRes(res, err) || (() => { logger.error('paper account failed', String(err)); return res.status(500).json({ error: 'failed' }); })();
	}
});

router.get('/accounts', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const accounts = await supabaseRest('/rest/v1/paper_accounts', {
			query: { select: '*', owner: `eq.${user.id}`, order: 'created_at.desc', limit: 20 },
		}).catch(() => []);
		const out = [];
		for (const a of accounts || []) {
			const trades = await supabaseRest('/rest/v1/paper_trades', {
				query: { select: '*', account_id: `eq.${a.id}`, order: 'opened_at.desc', limit: 200 },
			}).catch(() => []);
			const closed = (trades || []).filter((t) => t.status === 'closed');
			const realized = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
			const wins = closed.filter((t) => Number(t.pnl) > 0).length;
			out.push({
				...a,
				realized: Math.round(realized * 100) / 100,
				closedCount: closed.length,
				winRate: closed.length ? Math.round((wins / closed.length) * 1000) / 10 : 0,
				open: (trades || []).filter((t) => t.status === 'open'),
				closed: closed.slice(0, 20),
			});
		}
		return res.json({ accounts: out });
	} catch (err) {
		return setupRes(res, err) || (() => { logger.error('paper accounts failed', String(err)); return res.status(500).json({ error: 'failed' }); })();
	}
});

router.delete('/accounts/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const a = await ownAccount(user.id, req.params.id);
		if (!a) return res.status(404).json({ error: 'account not found' });
		await supabaseRest(`/rest/v1/paper_trades?account_id=eq.${a.id}`, { method: 'DELETE' }).catch(() => {});
		await supabaseRest(`/rest/v1/paper_accounts?id=eq.${a.id}`, { method: 'DELETE' });
		return res.json({ ok: true });
	} catch (err) {
		logger.error('paper delete failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Reset an account to $100k (clears its trades) ────────────────
router.post('/reset/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const a = await ownAccount(user.id, req.params.id);
		if (!a) return res.status(404).json({ error: 'account not found' });
		await supabaseRest(`/rest/v1/paper_trades?account_id=eq.${a.id}`, { method: 'DELETE' }).catch(() => {});
		await supabaseRest(`/rest/v1/paper_accounts?id=eq.${a.id}`, {
			method: 'PATCH', body: { balance: START_BALANCE },
		});
		return res.json({ ok: true, balance: START_BALANCE });
	} catch (err) {
		return setupRes(res, err) || (() => { logger.error('paper reset failed', String(err)); return res.status(500).json({ error: 'failed' }); })();
	}
});

// ── Open a paper position at the displayed quote ─────────────────
router.post('/trade', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const accountId = String(req.body?.accountId || '');
	const symbol = String(req.body?.symbol || '').trim().toUpperCase().slice(0, 16);
	const side = String(req.body?.side || 'long').toLowerCase() === 'short' ? 'short' : 'long';
	const qty = Number(req.body?.qty || 0);
	const price = Number(req.body?.price || 0);
	const stop = req.body?.stop != null && req.body?.stop !== '' ? Number(req.body.stop) : null;
	const target = req.body?.target != null && req.body?.target !== '' ? Number(req.body.target) : null;
	if (!accountId || !symbol || !(qty > 0) || !(price > 0)) return res.status(422).json({ error: 'account, symbol, qty and price required' });
	if ((stop != null && !(stop > 0)) || (target != null && !(target > 0))) return res.status(422).json({ error: 'stop/target must be positive prices' });
	if (stop != null && ((side === 'long' && stop >= price) || (side === 'short' && stop <= price))) {
		return res.status(422).json({ error: 'stop must be below entry for longs, above for shorts' });
	}
	if (target != null && ((side === 'long' && target <= price) || (side === 'short' && target >= price))) {
		return res.status(422).json({ error: 'target must be above entry for longs, below for shorts' });
	}
	try {
		const a = await ownAccount(user.id, accountId);
		if (!a) return res.status(404).json({ error: 'account not found' });
		if (qty * price > Number(a.balance) * 10) return res.status(422).json({ error: 'position too large (10x cap)' });
		const payload = { owner: user.id, account_id: a.id, symbol, side, qty, entry: price, status: 'open' };
		if (stop != null) payload.stop = stop;
		if (target != null) payload.target = target;
		let rows;
		try {
			rows = await supabaseRest('/rest/v1/paper_trades', {
				method: 'POST', body: payload, prefer: 'return=representation',
			});
		} catch (e) {
			// Older DBs without stop/target columns: retry bare.
			if (!/stop|target|column/i.test(String(e?.message || e))) throw e;
			delete payload.stop; delete payload.target;
			rows = await supabaseRest('/rest/v1/paper_trades', {
				method: 'POST', body: payload, prefer: 'return=representation',
			});
		}
		return res.json({ ok: true, trade: rows?.[0] || null });
	} catch (err) {
		return setupRes(res, err) || (() => { logger.error('paper trade failed', String(err)); return res.status(500).json({ error: 'failed' }); })();
	}
});

function closeOne(user, t, price, reason) {
	return settleTrade(user, t, price, reason);
}

// ── Close at a given price (manual) ──────────────────────────────
router.post('/close', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const tradeId = String(req.body?.tradeId || '');
	const price = Number(req.body?.price || 0);
	if (!tradeId || !(price > 0)) return res.status(422).json({ error: 'trade + price required' });
	try {
		const rows = await supabaseRest(`/rest/v1/paper_trades?id=eq.${encodeURIComponent(tradeId)}&owner=eq.${user.id}`, {
			query: { select: '*', limit: 1 },
		}).catch(() => []);
		const t = rows?.[0];
		if (!t || t.status !== 'open') return res.status(404).json({ error: 'open trade not found' });
		const pnl = await closeOne(user, t, price, 'manual');
		return res.json({ ok: true, pnl });
	} catch (err) {
		logger.error('paper close failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Close at the current live quote (one tap, server-verified) ───
router.post('/close-live/:id', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest(`/rest/v1/paper_trades?id=eq.${encodeURIComponent(req.params.id)}&owner=eq.${user.id}`, {
			query: { select: '*', limit: 1 },
		}).catch(() => []);
		const t = rows?.[0];
		if (!t || t.status !== 'open') return res.status(404).json({ error: 'open trade not found' });
		const q = await liveQuote(t.symbol);
		if (!q) return res.status(502).json({ error: 'no live quote for this symbol right now' });
		const pnl = await closeOne(user, t, q.price, 'live');
		return res.json({ ok: true, pnl, price: q.price, source: q.source });
	} catch (err) {
		logger.error('paper close-live failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Settle SL/TP: close every open position whose stop or target the ─
// live quote has touched. One tap, honest fills at the stop/target level.
router.post('/settle', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const accounts = await supabaseRest('/rest/v1/paper_accounts', {
			query: { select: 'id', owner: `eq.${user.id}`, limit: 20 },
		}).catch(() => []);
		const ids = (accounts || []).map((a) => a.id);
		if (!ids.length) return res.json({ ok: true, settled: [] });
		const open = [];
		for (const id of ids) {
			const rows = await supabaseRest('/rest/v1/paper_trades', {
				query: { select: '*', account_id: `eq.${id}`, status: 'eq.open', limit: 200 },
			}).catch(() => []);
			open.push(...(rows || []).filter((t) => t.stop != null || t.target != null));
		}
		const bySym = [...new Set(open.map((t) => t.symbol))];
		const quotes = {};
		await Promise.all(bySym.map(async (s) => { quotes[s] = await liveQuote(s); }));
		const settled = [];
		for (const t of open) {
			const q = quotes[t.symbol];
			if (!q) continue;
			const stopHit = t.stop != null && ((t.side === 'long' && q.price <= Number(t.stop)) || (t.side === 'short' && q.price >= Number(t.stop)));
			const tpHit = t.target != null && ((t.side === 'long' && q.price >= Number(t.target)) || (t.side === 'short' && q.price <= Number(t.target)));
			if (stopHit) {
				const pnl = await closeOne(user, t, Number(t.stop), 'stop');
				settled.push({ id: t.id, symbol: t.symbol, reason: 'stop', pnl });
			} else if (tpHit) {
				const pnl = await closeOne(user, t, Number(t.target), 'target');
				settled.push({ id: t.id, symbol: t.symbol, reason: 'target', pnl });
			}
		}
		return res.json({ ok: true, settled });
	} catch (err) {
		return setupRes(res, err) || (() => { logger.error('paper settle failed', String(err)); return res.status(500).json({ error: 'failed' }); })();
	}
});

// ── Public: contest boards (paper P&L by contest tag) ────────────
router.get('/contests', async (req, res) => {
	try {
		const accounts = await supabaseRest('/rest/v1/paper_accounts', {
			query: { select: 'id,owner,name,balance,contest,created_at', order: 'created_at.desc', limit: 500 },
		}).catch(() => []);
		const boards = {};
		for (const a of accounts || []) {
			if (!a.contest) continue;
			(boards[a.contest] ??= []).push({ name: a.name, balance: Number(a.balance) || 0, pnl: Math.round((Number(a.balance) - START_BALANCE) * 100) / 100 });
		}
		for (const k of Object.keys(boards)) {
			boards[k].sort((x, y) => y.balance - x.balance);
			boards[k] = boards[k].slice(0, 50).map((r, i) => ({ rank: i + 1, ...r }));
		}
		return res.json({ contests: boards });
	} catch (err) {
		logger.error('paper contests failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
