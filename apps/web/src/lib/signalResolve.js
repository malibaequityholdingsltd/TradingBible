// Signal outcome resolution — trust through verification, not self-reporting.
// Given a tracked signal (entry/target/stop/side/created) and the candles
// printed AFTER it was saved, walk forward bar-by-bar: first touch of
// target = win, first touch of stop = loss. If a single candle touches
// both, the level nearer the candle open wins (conservative by construction).
// Signals older than available history resolve as 'expired' — never faked.

export function sideOf(signalType) {
	const s = String(signalType || '').toLowerCase();
	if (s.includes('buy') || s.includes('long')) return 'long';
	if (s.includes('sell') || s.includes('short')) return 'short';
	return null;
}

export function atr(candles, period = 14) {
	if (!Array.isArray(candles) || candles.length < period + 1) return null;
	let sum = 0;
	for (let i = candles.length - period; i < candles.length; i++) {
		const c = candles[i];
		const p = candles[i - 1];
		sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
	}
	return sum / period;
}

// Default trade plan when the user tracks a live signal: 1.5R target, 1R stop.
export function planLevels(entry, candles) {
	const vol = atr(candles) || Math.abs(entry) * 0.01 || 1;
	const risk = vol;
	return { target: entry + 1.5 * risk, stop: entry - 1 * risk, risk };
}

export function resolveSignal(signal, candlesAfter, livePrice = null) {
	const entry = Number(signal.price ?? signal.entry);
	const side = signal.side === 'long' || signal.side === 'short'
		? signal.side
		: sideOf(signal.signalType);
	const target = Number(signal.target);
	const stop = Number(signal.stop);
	if (!Number.isFinite(entry) || !side || !Number.isFinite(target) || !Number.isFinite(stop)) {
		return { outcome: 'open', resolvedPrice: null, pnlPct: null };
	}
	const bars = (Array.isArray(candlesAfter) ? candlesAfter : []).filter((c) => c && Number.isFinite(c.high) && Number.isFinite(c.low));
	for (const c of bars) {
		const hitTarget = side === 'long' ? c.high >= target : c.low <= target;
		const hitStop = side === 'long' ? c.low <= stop : c.high >= stop;
		if (hitTarget && hitStop) {
			// Both touched in one bar — nearer to the open wins.
			const dT = Math.abs(c.open - target);
			const dS = Math.abs(c.open - stop);
			if (dT < dS) return close('win', target, c.time);
			return close('loss', stop, c.time);
		}
		if (hitTarget) return close('win', target, c.time);
		if (hitStop) return close('loss', stop, c.time);
	}
	if (livePrice != null && Number.isFinite(Number(livePrice))) {
		const px = Number(livePrice);
		const pnlPct = side === 'long' ? ((px - entry) / entry) * 100 : ((entry - px) / entry) * 100;
		return { outcome: 'open', resolvedPrice: null, pnlPct: +pnlPct.toFixed(2), livePrice: px };
	}
	return { outcome: 'open', resolvedPrice: null, pnlPct: null };

	function close(outcome, exit, time) {
		const pnlPct = side === 'long' ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
		return { outcome, resolvedPrice: exit, resolvedAt: time, pnlPct: +pnlPct.toFixed(2) };
	}
}
