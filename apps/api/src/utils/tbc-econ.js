// Shared TBC credit economy (single source of truth).
// Peg: 1 TBC = 1 KWD (Kuwaiti Dinar), always.
// USD floats against it via usdPerKwd (default 3.25, admin-overridable).
// TBC credits are platform utility credits (like airline miles): earned and
// spent inside TradingBible, recorded as ledger rows with asset='TBC'.
// Imported by the TBC routes AND by every pay point (challenges,
// marketplace, academy, affiliates) so all in-app settlement is TBC.
// Plans/subscriptions stay cash (USD) — exempt by policy.
import { supabaseRest } from './supabaseClient.js';

export const TBC_PEG = {
	kwdPerTbc: 1,
	tbcPerKwd: 1,
	defaultUsdPerKwd: Number(process.env.USD_PER_KWD || 3.25) || 3.25,
};

export async function tbcEcon() {
	const rows = await supabaseRest('/rest/v1/admin_integrations', {
		query: { select: 'config', 'key': 'eq.tbc:config', limit: 1 },
	}).catch(() => []);
	const c = rows?.[0]?.config || {};
	// 1 TBC = 1 KWD fixed. USD rate derives from USD-per-KWD.
	// Guard: USD-per-KWD must be a real KWD rate (≈3.25). A stored 1 (old 1:1
	// config) would fake 1 TBC = 1 USD — reject it and fall back to 3.25.
	let usdPerKwd = Number(c.usdPerKwd ?? c.usdPerKWD ?? process.env.USD_PER_KWD ?? TBC_PEG.defaultUsdPerKwd) || TBC_PEG.defaultUsdPerKwd;
	if (!(usdPerKwd >= 2 && usdPerKwd <= 5)) usdPerKwd = TBC_PEG.defaultUsdPerKwd;
	const tbcPerUsd = Math.round((1 / usdPerKwd) * 10000) / 10000;
	return {
		// Canonical peg
		peg: '1 TBC = 1 KWD',
		kwdPerTbc: 1,
		tbcPerKwd: 1,
		usdPerKwd,
		usdPerTbc: usdPerKwd,
		kwdPerUsd: Math.round((1 / usdPerKwd) * 10000) / 10000,
		// Legacy key kept for every existing consumer: TBC per $1
		tbcPerUsd,
		claimEnabled: c.claimEnabled === true || c.claimEnabled === 'true',
		claimMin: Number(c.claimMin ?? 100) || 100,
		note: String(c.note || ''),
	};
}

export async function tbcBalances(userId) {
	const rows = await supabaseRest('/rest/v1/bank_transactions', {
		query: { select: 'amount,asset,status', owner: `eq.${userId}`, limit: 5000 },
	}).catch(() => []);
	let usd = 0, tbc = 0;
	for (const r of rows || []) {
		if (r.status === 'failed') continue;
		if ((r.asset || 'USD') === 'TBC') tbc += Number(r.amount) || 0;
		else usd += Number(r.amount) || 0;
	}
	usd = Math.round(usd * 100) / 100;
	tbc = Math.round(tbc * 100) / 100;
	// KWD mirrors TBC 1:1 by peg
	return { usd, tbc, kwd: tbc };
}

// USD list price -> TBC settlement amount at the published KWD peg.
export async function tbcForUsd(usdAmount) {
	const econ = await tbcEcon().catch(() => ({ tbcPerUsd: 1 / TBC_PEG.defaultUsdPerKwd, usdPerKwd: TBC_PEG.defaultUsdPerKwd }));
	const rate = Number(econ.tbcPerUsd) || 1 / TBC_PEG.defaultUsdPerKwd;
	return { tbc: Math.round(Number(usdAmount) * rate * 100) / 100, rate, kwd: Math.round(Number(usdAmount) * rate * 100) / 100, usdPerKwd: econ.usdPerKwd };
}

// KWD price -> TBC is 1:1 by peg.
export function tbcForKwd(kwdAmount) {
	return { tbc: Math.round(Number(kwdAmount) * 100) / 100, rate: 1 };
}

export function usdForTbc(tbcAmount, usdPerKwd) {
	const r = Number(usdPerKwd) || TBC_PEG.defaultUsdPerKwd;
	return Math.round(Number(tbcAmount) * r * 100) / 100;
}

// Throws code 'insufficient_tbc' when the till can't cover a USD price.
export async function requireTbc(userId, usdAmount) {
	const { tbc, rate } = await tbcForUsd(usdAmount);
	const b = await tbcBalances(userId);
	if (b.tbc < tbc) {
		const err = new Error(`insufficient TBC — convert cash, swap crypto, buy or receive TBC first (needs ${tbc.toLocaleString()} TBC ≈ ${tbc.toLocaleString()} KWD)`);
		err.code = 'insufficient_tbc';
		throw err;
	}
	return { tbc, rate, balance: b.tbc };
}
