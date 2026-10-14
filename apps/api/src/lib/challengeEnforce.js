// Hard-breach auto-enforcement for funded challenges.
// Called after broker sync imports, on challenge reads, and after manual
// evaluation: any ACTIVE attempt whose hard rails (daily loss, max loss)
// break is failed + locked immediately, the trader is notified, and the
// seat frees for rebuy. Later trades never count (evaluation only runs on
// active attempts).
//
// NOTE: live exchange positions cannot be flattened here — broker keys are
// read-only by policy, so the platform never holds trading permission.
// Enforcement locks the evaluation the moment the breach lands in the
// journal; traders must close their own broker orders at once.
import { supabaseRest } from '../utils/supabaseClient.js';
import logger from '../utils/logger.js';
import { evaluateChallenge, toProduct } from './challengeRules.js';

export async function notifyBreach(userId, productName, labels, title) {
	try {
		await supabaseRest('/rest/v1/notifications', {
			method: 'POST',
			body: {
				owner: userId, kind: 'breach',
				title: title || 'Evaluation breached — account locked',
				message: `${productName}: ${labels}. The seat is freed — rebuy opens a fresh evaluation. Close any live broker orders immediately.`,
				link: '/app/challenges', seen: false,
			},
		});
	} catch (err) {
		logger.warn('breach notify failed', String(err?.message || err));
	}
}

// ── Cross-account hedge detection ──────────────────────────────
// Same trader, same symbol, opposite sides, overlapping open windows on
// DIFFERENT accounts (different broker feed, or synced vs manual) =
// hedged risk-free farming. One hedge fails EVERY active attempt at once.
function normSymbol(s) {
	return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function tradeWindow(t) {
	const start = new Date(t.openedAt || t.tradeDate).getTime();
	if (Number.isNaN(start)) return null;
	const endRaw = new Date(t.closedAt || t.tradeDate).getTime();
	const end = Number.isNaN(endRaw) ? start + 60000 : Math.max(endRaw, start);
	return { start, end: t.closedAt ? end : end + 60000 };
}

export function findHedge(trades) {
	const rows = (trades || [])
		.map((t) => ({ t, sym: normSymbol(t.symbol), side: String(t.side || '').toLowerCase(), acct: t.broker || 'manual', w: tradeWindow(t) }))
		.filter((r) => r.sym && (r.side === 'buy' || r.side === 'sell') && r.w);
	for (let i = 0; i < rows.length; i++) {
		for (let j = i + 1; j < rows.length; j++) {
			const a = rows[i], b = rows[j];
			if (a.sym !== b.sym || a.side === b.side || a.acct === b.acct) continue;
			if (Math.max(a.w.start, b.w.start) <= Math.min(a.w.end, b.w.end)) {
				return { symbol: a.sym, accounts: [a.acct, b.acct] };
			}
		}
	}
	return null;
}


// ── Owned execution: each attempt trades a dedicated in-house paper
// account (paper_accounts.name = `challenge:{attemptId}`), so no outside
// broker is ever in the loop. Legacy attempts without one fall back to
// the journal window.
export async function attemptPaperAccount(userId, attemptId) {
	const rows = await supabaseRest('/rest/v1/paper_accounts', {
		query: { select: 'id,balance', owner: `eq.${userId}`, name: `eq.challenge:${attemptId}`, limit: 1 },
	}).catch(() => []);
	return rows?.[0] || null;
}

const mapPaperTrade = (t) => ({
	symbol: t.symbol,
	side: String(t.side || '').toLowerCase() === 'short' ? 'sell' : 'buy',
	pnl: t.pnl, tradeDate: t.closed_at,
	openedAt: t.opened_at, closedAt: t.closed_at,
	broker: 'TradingBible',
});

export async function getAttemptTrades(userId, attempt) {
	const acct = await attemptPaperAccount(userId, attempt.id);
	if (acct) {
		const rows = await supabaseRest('/rest/v1/paper_trades', {
			query: { select: 'symbol,side,pnl,opened_at,closed_at', account_id: `eq.${acct.id}`, status: 'eq.closed', order: 'closed_at.asc', limit: 5000 },
		}).catch(() => []);
		return (rows || []).map(mapPaperTrade);
	}
	const since = new Date(attempt.started_at).getTime();
	const trades = await supabaseRest('/rest/v1/trades', {
		query: { select: 'pnl,tradeDate,symbol,side,openedAt,closedAt,broker', owner: `eq.${userId}`, order: 'tradeDate.asc', limit: 5000 },
	}).catch(() => []);
	return (trades || []).filter((t) => txDate(t) >= since);
}

// Flatten every open in-house position the moment an attempt fails —
// nothing left running, ever. Only possible because execution is owned.
export async function flattenAttemptAccount(userId, attempt) {
	const acct = await attemptPaperAccount(userId, attempt.id);
	if (!acct) return { flattened: 0, owned: false };
	const open = await supabaseRest('/rest/v1/paper_trades', {
		query: { select: '*', account_id: `eq.${acct.id}`, status: 'eq.open', limit: 200 },
	}).catch(() => []);
	if (!open?.length) return { flattened: 0, owned: true };
	const { liveQuote, settleTrade } = await import('../routes/paper.js');
	let n = 0;
	for (const t of open) {
		try {
			const q = await liveQuote(t.symbol);
			if (!q) continue;
			await settleTrade({ id: userId }, t, q.price, 'breach');
			n++;
		} catch (err) { logger.warn('breach flatten failed', String(err?.message || err)); }
	}
	return { flattened: n, owned: true };
}

const txDate = (t) => new Date(t.tradeDate || t.closedAt || t.openedAt || t.created).getTime();

export async function enforceChallengesForUser(userId) {
	const out = { checked: 0, failed: [], hedged: false, flattened: 0 };
	try {
		const attempts = await supabaseRest('/rest/v1/challenge_attempts', {
			query: { select: '*', owner: `eq.${userId}`, status: 'eq.active', limit: 20 },
		}).catch(() => []);
		if (!attempts?.length) return out;
		const [journal, prodRows, paperAll] = await Promise.all([
			supabaseRest('/rest/v1/trades', {
				query: { select: 'pnl,tradeDate,symbol,side,openedAt,closedAt,broker', owner: `eq.${userId}`, order: 'tradeDate.asc', limit: 5000 },
			}).catch(() => []),
			supabaseRest('/rest/v1/admin_integrations', {
				query: { select: 'key,config', key: 'like.challenge:%', limit: 200 },
			}).catch(() => []),
			supabaseRest('/rest/v1/paper_trades', {
				query: { select: 'symbol,side,pnl,opened_at,closed_at,status,account_id', owner: `eq.${userId}`, order: 'closed_at.desc', limit: 5000 },
			}).catch(() => []),
		]);
		const products = {};
		for (const r of prodRows || []) products[String(r.key || '').replace(/^challenge:/, '')] = toProduct(r);
		const paperMapped = (paperAll || []).map((t) => ({ ...mapPaperTrade(t), status: t.status }));
		// Cross-account hedge: one offence fails EVERY active attempt.
		const earliest = Math.min(...attempts.map((a) => new Date(a.started_at).getTime()).filter((t) => !Number.isNaN(t)));
		const hedgePool = [
			...(journal || []).filter((t) => txDate(t) >= earliest),
			...paperMapped.filter((t) => t.status === 'open' || txDate(t) >= earliest),
		];
		const hedge = findHedge(hedgePool);
		const failAll = async (statsFor) => {
			for (const attempt of attempts) {
				const stats = await statsFor(attempt);
				const flat = await flattenAttemptAccount(userId, attempt).catch(() => ({ flattened: 0 }));
				out.flattened += flat.flattened || 0;
				await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${attempt.id}`, {
					method: 'PATCH',
					body: { stats, status: 'failed', decided_at: new Date().toISOString() },
				}).catch(() => {});
				out.failed.push(attempt.id);
			}
		};
		if (hedge) {
			const hedgeCheck = { id: 'hedge', soft: false, label: `Cross-account hedge: ${hedge.symbol} long + short across ${hedge.accounts.join(' / ')}`, pass: false };
			await failAll(async (attempt) => {
				const product = products[attempt.product_key];
				let result;
				try {
					result = evaluateChallenge({ startBalance: product?.accountSize || 100000, rules: product?.rules || {}, trades: await getAttemptTrades(userId, attempt) });
				} catch { result = { checks: [] }; }
				return { ...result, status: 'failed', failed: true, checks: [...(result.checks || []), hedgeCheck] };
			});
			out.hedged = hedge;
			await notifyBreach(userId, 'All active evaluations',
				`Cross-account hedge on ${hedge.symbol} (${hedge.accounts.join(' / ')}) — every active attempt failed`,
				'Hedging detected — all accounts locked');
			return out;
		}
		for (const attempt of attempts) {
			const product = products[attempt.product_key];
			if (!product) continue;
			const windowed = await getAttemptTrades(userId, attempt);
			let result;
			try {
				result = evaluateChallenge({ startBalance: product.accountSize, rules: product.rules, trades: windowed });
			} catch { continue; }
			out.checked++;
			if (!result.failed) continue;
			const labels = (result.checks || []).filter((c) => !c.pass && !c.soft).map((c) => c.label).join('; ') || 'hard rail breached';
			const flat = await flattenAttemptAccount(userId, attempt).catch(() => ({ flattened: 0 }));
			out.flattened += flat.flattened || 0;
			await supabaseRest(`/rest/v1/challenge_attempts?id=eq.${attempt.id}`, {
				method: 'PATCH',
				body: { stats: result, status: 'failed', decided_at: new Date().toISOString() },
			}).catch(() => {});
			await notifyBreach(userId, product.name || attempt.product_key,
				`${labels}${flat.flattened ? ` — ${flat.flattened} open position(s) auto-closed` : ''}`);
			out.failed.push(attempt.id);
		}
	} catch (err) {
		logger.warn('challenge auto-enforce failed', String(err?.message || err));
	}
	return out;
}

