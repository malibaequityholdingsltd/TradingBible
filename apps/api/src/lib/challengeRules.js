// Funded-challenge evaluation — pure functions over journal trades.
// Supports three product lines (all percentages relative to start balance
// unless an absolute USD amount is given):
//   two-step : 10% target → 5% verification, 5% daily, 10% static max, 4+ days
//   one-step : 10% target, 3% daily, 10% EOD-trailing max (locks at start),
//              Best-Day gate (best day ≤ 50% of positive-days profit)
//   futures  : $ targets, EOD-trailing $ max (locks at start), optional hard
//              $ daily, consistency gate (best day ≤ 40/50% of total profit),
//              max contracts (displayed; enforced at order time, not here)
// Breach rails (daily/max) FAIL the attempt. Target/days/consistency gates
// keep it ACTIVE ("keep trading") — matching how real desks treat them.

export function evaluateChallenge({ startBalance = 100000, rules = {}, trades = [] }) {
	const mode = String(rules.mode || 'two-step');
	const target = Number(rules.targetPct ?? (mode === 'futures' ? 0 : 10));
	const targetUsd = Number(rules.targetUsd ?? 0);
	const maxDD = Number(rules.maxDrawdownPct ?? 10);
	const maxDdUsd = Number(rules.maxDdUsd ?? 0);
	const maxLossMode = String(rules.maxLossMode || (mode === 'one-step' || mode === 'futures' ? 'eod-trailing' : 'static'));
	const dailyMax = Number(rules.dailyLossPct ?? (mode === 'one-step' ? 3 : 5));
	const dailyLossUsd = Number(rules.dailyLossUsd ?? 0);
	const dailyEnforced = rules.dailyEnforced !== false;
	const minDays = Math.trunc(Number(rules.minDays ?? 4));
	const bestDayMax = Number(rules.bestDayMaxPct ?? (mode === 'one-step' ? 50 : 0));
	const consistencyMax = Number(rules.consistencyMaxPct ?? 0);
	const consistencyBase = String(rules.consistencyBase || 'total');

	const chrono = [...trades]
		.filter((t) => t && Number.isFinite(Number(t.pnl)))
		.sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));

	let eq = startBalance;
	let peak = startBalance;
	let maxDdPct = 0;
	let maxDdAbs = 0;
	const byDay = new Map();
	for (const t of chrono) {
		const pnl = Number(t.pnl) || 0;
		eq += pnl;
		if (eq > peak) peak = eq;
		const ddPct = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
		if (ddPct > maxDdPct) maxDdPct = ddPct;
		const ddAbs = peak - eq;
		if (ddAbs > maxDdAbs) maxDdAbs = ddAbs;
		const day = String(new Date(t.tradeDate).toISOString().slice(0, 10));
		byDay.set(day, (byDay.get(day) || 0) + pnl);
	}

	let worstDayPct = 0;
	let worstDayAbs = 0;
	let bestDay = 0;
	let positiveSum = 0;
	for (const [, dpnl] of byDay) {
		const lossPct = startBalance > 0 ? (-Math.min(0, dpnl) / startBalance) * 100 : 0;
		if (lossPct > worstDayPct) worstDayPct = lossPct;
		const lossAbs = -Math.min(0, dpnl);
		if (lossAbs > worstDayAbs) worstDayAbs = lossAbs;
		if (dpnl > bestDay) bestDay = dpnl;
		if (dpnl > 0) positiveSum += dpnl;
	}

	const profitPct = startBalance > 0 ? ((eq - startBalance) / startBalance) * 100 : 0;
	const profitAbs = eq - startBalance;
	const days = byDay.size;

	const checks = [];
	if (targetUsd > 0) {
		checks.push({ id: 'target', label: `Profit target $${targetUsd.toLocaleString()}`, value: profitAbs, pass: profitAbs >= targetUsd });
	} else {
		checks.push({ id: 'target', label: `Profit target ${target}%`, value: profitPct, pass: profitPct >= target });
	}
	if (maxDdUsd > 0) {
		checks.push({ id: 'maxdd', label: `Max drawdown ≤ $${maxDdUsd.toLocaleString()} (EOD-trailing, locks at start)`, value: maxDdAbs, pass: maxDdAbs <= maxDdUsd });
	} else if (maxLossMode === 'eod-trailing') {
		checks.push({ id: 'maxdd', label: `Max loss ≤ ${maxDD}% (EOD-trailing, locks at start)`, value: maxDdPct, pass: maxDdPct <= maxDD });
	} else {
		checks.push({ id: 'maxdd', label: `Max loss ≤ ${maxDD}% (static)`, value: maxDdPct, pass: maxDdPct <= maxDD });
	}
	if (dailyEnforced) {
		if (dailyLossUsd > 0) {
			checks.push({ id: 'daily', label: `Worst day loss ≤ $${dailyLossUsd.toLocaleString()}`, value: worstDayAbs, pass: worstDayAbs <= dailyLossUsd });
		} else {
			checks.push({ id: 'daily', label: `Worst day loss ≤ ${dailyMax}%`, value: worstDayPct, pass: worstDayPct <= dailyMax });
		}
	}
	checks.push({ id: 'days', label: `Min ${minDays} trading days`, value: days, pass: days >= minDays });

	// Soft gates: never fail, just keep the attempt active ("keep trading").
	let softOpen = false;
	if (bestDayMax > 0 && positiveSum > 0) {
		const share = (bestDay / positiveSum) * 100;
		const pass = share <= bestDayMax;
		if (!pass) softOpen = true;
		checks.push({ id: 'bestday', soft: true, label: `Best day ≤ ${bestDayMax}% of winning days`, value: share, pass });
	}
	if (consistencyMax > 0 && profitAbs > 0) {
		const base = consistencyBase === 'positive' ? positiveSum : profitAbs;
		const share = base > 0 ? (bestDay / base) * 100 : 0;
		const pass = share <= consistencyMax;
		if (!pass) softOpen = true;
		checks.push({ id: 'consistency', soft: true, label: `Best day ≤ ${consistencyMax}% of ${consistencyBase === 'positive' ? 'winning days' : 'total profit'}`, value: share, pass });
	}

	const hard = checks.filter((c) => !c.soft);
	const hardPass = hard.every((c) => c.pass);
	const breached = chrono.length > 0 && hard.some((c) => !c.pass && (c.id === 'maxdd' || c.id === 'daily'));
	const passed = chrono.length > 0 && hardPass && !softOpen;
	const r2 = (n) => Math.round(n * 100) / 100;
	return {
		mode,
		equity: r2(eq),
		profitPct: r2(profitPct),
		profitAbs: r2(profitAbs),
		maxDdPct: r2(maxDdPct),
		maxDdAbs: r2(maxDdAbs),
		worstDayPct: r2(worstDayPct),
		worstDayAbs: r2(worstDayAbs),
		bestDay: r2(bestDay),
		days,
		trades: chrono.length,
		checks: checks.map((c) => ({ ...c, value: typeof c.value === 'number' ? r2(c.value) : c.value })),
		status: chrono.length === 0 ? 'active' : breached ? 'failed' : passed ? 'passed' : 'active',
		failed: breached,
	};
}

export function defaultRules(mode = 'two-step') {
	if (mode === 'one-step') {
		return { mode: 'one-step', targetPct: 10, maxDrawdownPct: 10, maxLossMode: 'eod-trailing', dailyLossPct: 3, minDays: 4, bestDayMaxPct: 50 };
	}
	if (mode === 'futures') {
		return { mode: 'futures', targetUsd: 6000, maxDdUsd: 3500, maxLossMode: 'eod-trailing', dailyLossUsd: 0, dailyEnforced: true, minDays: 4, consistencyMaxPct: 40, consistencyBase: 'total' };
	}
	return { mode: 'two-step', targetPct: 10, target2Pct: 5, maxDrawdownPct: 10, maxLossMode: 'static', dailyLossPct: 5, minDays: 4 };
}

export function accountTypesFor(c) {
	const mode = String(c.mode || c.phase || 'two-step');
	if (mode === 'futures') {
		return [{ id: 'futures', label: 'Futures', leverage: String(c.leverage || 'Futures margin'), holding: 'Exchange hours + contract calendar', news: 'Unrestricted' }];
	}
	const levStd = String(c.leverageStandard || c.leverage || '1:100');
	const levSwing = String(c.leverageSwing || '1:30');
	const opts = String(c.accountTypeOptions || 'standard,swing').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
	const all = {
		standard: { id: 'standard', label: 'Standard', leverage: levStd, holding: 'Intraday only — NO overnight / NO weekend holding (flat by close)', news: 'News trading NOT ALLOWED' },
		swing: { id: 'swing', label: 'Swing', leverage: levSwing, holding: 'Overnight + weekend holding allowed', news: 'No news restrictions' },
	};
	const picked = opts.filter((o) => all[o]).map((o) => all[o]);
	return picked.length ? picked : [all.standard, all.swing];
}

export function toProduct(row) {
	const c = row?.config || {};
	const feeStd = Number(c.feeStandard ?? c.fee) || 0;
	const feeSwing = Number(c.feeSwing ?? c.fee) || 0;
	return {
		key: String(row.key || '').replace(/^challenge:/, ''),
		name: c.name || row.key,
		description: c.description || '',
		fee: feeStd,
		fees: { standard: feeStd, swing: feeSwing },
		accountSize: Number(c.accountSize) || 100000,
		phase: String(c.phase || 'two-step'),
		mode: String(c.mode || c.phase || 'two-step'),
		leverage: String(c.leverage || '1:100'),
		platforms: String(c.platforms || 'MT5 · cTrader · TradingBible Terminal'),
		instruments: String(c.instruments || 'Forex · Metals · Indices · Crypto · Stocks'),
		maxContracts: Math.trunc(Number(c.maxContracts ?? 0)),
		refundableFee: c.refundableFee !== false,
		accountTypes: accountTypesFor(c),
		rules: {
			mode: String(c.mode || c.phase || 'two-step'),
			targetPct: Number(c.targetPct ?? 10),
			target2Pct: Number(c.target2Pct ?? 5),
			targetUsd: Number(c.targetUsd ?? 0),
			maxDrawdownPct: Number(c.maxDrawdownPct ?? 10),
			maxDdUsd: Number(c.maxDdUsd ?? 0),
			maxLossMode: String(c.maxLossMode || ((c.mode || c.phase) === 'two-step' ? 'static' : 'eod-trailing')),
			dailyLossPct: Number(c.dailyLossPct ?? (((c.mode || c.phase) === 'one-step') ? 3 : ((c.mode || c.phase) === 'futures' ? 0 : 5))),
			dailyLossUsd: Number(c.dailyLossUsd ?? 0),
			dailyEnforced: c.dailyEnforced !== false,
			minDays: Math.trunc(Number(c.minDays ?? 4)),
			bestDayMaxPct: Number(c.bestDayMaxPct ?? ((c.mode || c.phase) === 'one-step' ? 50 : 0)),
			consistencyMaxPct: Number(c.consistencyMaxPct ?? 0),
			consistencyBase: String(c.consistencyBase || 'total'),
		},
		funded: {
			profitSplitPct: Number(c.profitSplitPct ?? 80),
			maxSplitPct: Number(c.maxSplitPct ?? 90),
			payoutCycleDays: Math.trunc(Number(c.payoutCycleDays ?? 14)),
			scaling: String(c.scaling || 'Qualify every 4 months: +25% capital, up to $400K'),
		},
		enabled: row.enabled !== false,
	};
}
