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
