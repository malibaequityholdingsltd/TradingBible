// Strategy backtesting over OHLC series — pure functions.
// Strategies: sma_cross (fast/slow), rsi (oversold/overbought mean reversion).
// Costs: spread (per-unit) + commission per trade; position = fixed fraction.

export function sma(values, period) {
	const out = new Array(values.length).fill(null);
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
		if (i >= period) sum -= values[i - period];
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}

export function rsi(closes, period = 14) {
	const out = new Array(closes.length).fill(null);
	let gain = 0;
	let loss = 0;
	for (let i = 1; i < closes.length; i++) {
		const d = closes[i] - closes[i - 1];
		if (d > 0) gain += d;
		else loss -= d;
		if (i < period) continue;
		if (i > period) {
			const prevG = gain / period;
			const prevL = loss / period;
			const cur = closes[i] - closes[i - 1];
			gain = prevG * (period - 1) + Math.max(0, cur);
			loss = prevL * (period - 1) + Math.max(0, -cur);
		}
		const avgG = gain / period;
		const avgL = loss / period;
		out[i] = avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL);
	}
	return out;
}

export function runBacktest({ closes, strategy = 'sma_cross', params = {}, startBalance = 10000, riskFraction = 0.02, spread = 0, commission = 0 }) {
	if (!Array.isArray(closes) || closes.length < 30) {
		return { error: 'need at least 30 closes' };
	}
	const clean = closes.map(Number).filter((v) => Number.isFinite(v));
	if (clean.length < 30) return { error: 'need at least 30 numeric closes' };

	const signals = new Array(clean.length).fill(0); // +1 long, -1 flat/exit
	if (strategy === 'rsi') {
		const p = Number(params.period) || 14;
		const os = Number(params.oversold ?? 30);
		const ob = Number(params.overbought ?? 70);
		const r = rsi(clean, p);
		for (let i = 1; i < clean.length; i++) {
			if (r[i] === null || r[i - 1] === null) continue;
			if (r[i - 1] <= os && r[i] > os) signals[i] = 1;
			else if (r[i - 1] >= ob && r[i] < ob) signals[i] = -1;
		}
	} else {
		const fast = Number(params.fast ?? 10);
		const slow = Number(params.slow ?? 30);
		const sf = sma(clean, fast);
		const ss = sma(clean, slow);
		for (let i = 1; i < clean.length; i++) {
			if (sf[i] === null || ss[i] === null || sf[i - 1] === null || ss[i - 1] === null) continue;
			if (sf[i - 1] <= ss[i - 1] && sf[i] > ss[i]) signals[i] = 1;
			else if (sf[i - 1] >= ss[i - 1] && sf[i] < ss[i]) signals[i] = -1;
		}
	}

	let cash = startBalance;
	let units = 0;
	let entry = 0;
	let peak = startBalance;
	let maxDd = 0;
	const trades = [];
	const equity = [];

	for (let i = 0; i < clean.length; i++) {
		const px = clean[i];
		if (signals[i] === 1 && units === 0 && cash > 0) {
			const riskCash = cash * riskFraction;
			units = riskCash / px;
			entry = px + spread;
			cash -= units * entry + commission;
		} else if (signals[i] === -1 && units > 0) {
			const proceeds = units * (px - spread) - commission;
			const pnl = proceeds - units * entry;
			trades.push({ entry, exit: px, units, pnl: Math.round(pnl * 100) / 100, bars: i });
			cash += proceeds;
			units = 0;
		}
		const eq = cash + units * px;
		if (eq > peak) peak = eq;
		if (peak > 0) maxDd = Math.min(maxDd, ((eq - peak) / peak) * 100);
		equity.push({ i, equity: Math.round(eq * 100) / 100 });
	}
	// Mark to market at the end.
	if (units > 0) {
		const px = clean[clean.length - 1];
		const proceeds = units * (px - spread) - commission;
		trades.push({ entry, exit: px, units, pnl: Math.round((proceeds - units * entry) * 100) / 100, bars: clean.length - 1, open: true });
		cash = proceeds;
	}

	const wins = trades.filter((t) => t.pnl > 0);
	const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
	const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
	const ret = ((cash - startBalance) / startBalance) * 100;
	return {
		strategy,
		trades: trades.length,
		wins: wins.length,
		winRate: trades.length ? Math.round((wins.length / trades.length) * 1000) / 10 : 0,
		netPnl: Math.round((cash - startBalance) * 100) / 100,
		returnPct: Math.round(ret * 100) / 100,
		profitFactor: grossLoss ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin ? 99 : 0,
		maxDrawdownPct: Math.round(maxDd * 100) / 100,
		equity,
		lastTrades: trades.slice(-20),
	};
}
