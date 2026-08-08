// Pure-JS technical indicator calculations from OHLCV candle arrays.
// No external dependencies — works on Node's built-in Math.

export function sma(values, period) {
	if (values.length < period) return null;
	const slice = values.slice(-period);
	return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values, period) {
	if (values.length < period) return null;
	const k = 2 / (period + 1);
	let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
	for (let i = period; i < values.length; i++) {
		prev = values[i] * k + prev * (1 - k);
	}
	return prev;
}

// Returns the full EMA series (aligned to the input, undefined before warm-up).
function emaSeries(values, period) {
	const out = [];
	const k = 2 / (period + 1);
	let prev;
	for (let i = 0; i < values.length; i++) {
		if (i < period - 1) { out.push(undefined); continue; }
		if (i === period - 1) {
			prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
		} else {
			prev = values[i] * k + prev * (1 - k);
		}
		out.push(prev);
	}
	return out;
}

export function rsi(closes, period = 14) {
	if (closes.length < period + 1) return null;
	let gains = 0;
	let losses = 0;
	for (let i = closes.length - period; i < closes.length; i++) {
		const diff = closes[i] - closes[i - 1];
		if (diff >= 0) gains += diff; else losses -= diff;
	}
	const avgGain = gains / period;
	const avgLoss = losses / period;
	if (avgLoss === 0) return 100;
	const rs = avgGain / avgLoss;
	return 100 - 100 / (1 + rs);
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
	if (closes.length < slow + signal) return null;
	const fastS = emaSeries(closes, fast);
	const slowS = emaSeries(closes, slow);
	const macdLine = closes.map((_, i) =>
		fastS[i] !== undefined && slowS[i] !== undefined ? fastS[i] - slowS[i] : undefined,
	);
	const valid = macdLine.filter((v) => v !== undefined);
	const signalLine = ema(valid, signal);
	const macdVal = valid[valid.length - 1];
	return { macd: macdVal, signal: signalLine, histogram: macdVal - signalLine };
}

export function bollinger(closes, period = 20, mult = 2) {
	if (closes.length < period) return null;
	const slice = closes.slice(-period);
	const mid = slice.reduce((a, b) => a + b, 0) / period;
	const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
	const sd = Math.sqrt(variance);
	return { upper: mid + mult * sd, middle: mid, lower: mid - mult * sd };
}

export function stochastic(candles, period = 14) {
	if (candles.length < period) return null;
	const slice = candles.slice(-period);
	const high = Math.max(...slice.map((c) => c.high));
	const low = Math.min(...slice.map((c) => c.low));
	const close = candles[candles.length - 1].close;
	if (high === low) return 50;
	return ((close - low) / (high - low)) * 100;
}

export function atr(candles, period = 14) {
	if (candles.length < period + 1) return null;
	const trs = [];
	for (let i = candles.length - period; i < candles.length; i++) {
		const c = candles[i];
		const prevClose = candles[i - 1].close;
		trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
	}
	return trs.reduce((a, b) => a + b, 0) / period;
}

export function adx(candles, period = 14) {
	if (candles.length < period * 2) return null;
	let plusDM = 0;
	let minusDM = 0;
	let trSum = 0;
	for (let i = candles.length - period; i < candles.length; i++) {
		const up = candles[i].high - candles[i - 1].high;
		const down = candles[i - 1].low - candles[i].low;
		if (up > down && up > 0) plusDM += up;
		if (down > up && down > 0) minusDM += down;
		const c = candles[i];
		const prevClose = candles[i - 1].close;
		trSum += Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
	}
	if (trSum === 0) return 0;
	const plusDI = (plusDM / trSum) * 100;
	const minusDI = (minusDM / trSum) * 100;
	const dx = (Math.abs(plusDI - minusDI) / Math.max(plusDI + minusDI, 1e-9)) * 100;
	return dx;
}

// Ichimoku Cloud: conversion (tenkan), base (kijun) and leading spans.
export function ichimoku(candles, conv = 9, base = 26, spanB = 52) {
	if (candles.length < spanB) return null;
	const hh = (n) => Math.max(...candles.slice(-n).map((c) => c.high));
	const ll = (n) => Math.min(...candles.slice(-n).map((c) => c.low));
	const tenkan = (hh(conv) + ll(conv)) / 2;
	const kijun = (hh(base) + ll(base)) / 2;
	const senkouA = (tenkan + kijun) / 2;
	const senkouB = (hh(spanB) + ll(spanB)) / 2;
	return { tenkan, kijun, senkouA, senkouB };
}

// On-Balance Volume.
export function obv(candles) {
	if (candles.length < 2) return null;
	let value = 0;
	for (let i = 1; i < candles.length; i++) {
		if (candles[i].close > candles[i - 1].close) value += candles[i].volume;
		else if (candles[i].close < candles[i - 1].close) value -= candles[i].volume;
	}
	return value;
}

// Volume Rate of Change (percentage).
export function vroc(candles, period = 14) {
	if (candles.length < period + 1) return null;
	const cur = candles[candles.length - 1].volume;
	const past = candles[candles.length - 1 - period].volume;
	if (past === 0) return null;
	return ((cur - past) / past) * 100;
}

// Aggregate all indicators into a single buy/sell/neutral signal + confidence.
export function generateSignal(candles) {
	const closes = candles.map((c) => c.close);
	const price = closes[closes.length - 1];

	const smaVal = sma(closes, 20);
	const rsiVal = rsi(closes, 14);
	const macdVal = macd(closes);
	const bb = bollinger(closes, 20, 2);
	const stochVal = stochastic(candles, 14);
	const atrVal = atr(candles, 14);
	const adxVal = adx(candles, 14);
	const ichi = ichimoku(candles);
	const obvVal = obv(candles);
	const vrocVal = vroc(candles, 14);

	let bull = 0;
	let bear = 0;
	const reasons = [];

	if (smaVal != null) {
		if (price > smaVal) { bull++; reasons.push('Price above SMA20'); }
		else { bear++; reasons.push('Price below SMA20'); }
	}
	if (rsiVal != null) {
		if (rsiVal < 30) { bull++; reasons.push(`RSI oversold (${rsiVal.toFixed(1)})`); }
		else if (rsiVal > 70) { bear++; reasons.push(`RSI overbought (${rsiVal.toFixed(1)})`); }
	}
	if (macdVal != null) {
		if (macdVal.histogram > 0) { bull++; reasons.push('MACD bullish'); }
		else { bear++; reasons.push('MACD bearish'); }
	}
	if (bb != null) {
		if (price <= bb.lower) { bull++; reasons.push('At/below lower Bollinger band'); }
		else if (price >= bb.upper) { bear++; reasons.push('At/above upper Bollinger band'); }
	}
	if (stochVal != null) {
		if (stochVal < 20) { bull++; reasons.push('Stochastic oversold'); }
		else if (stochVal > 80) { bear++; reasons.push('Stochastic overbought'); }
	}
	if (ichi != null) {
		const cloudTop = Math.max(ichi.senkouA, ichi.senkouB);
		const cloudBottom = Math.min(ichi.senkouA, ichi.senkouB);
		if (price > cloudTop) { bull++; reasons.push('Price above Ichimoku cloud'); }
		else if (price < cloudBottom) { bear++; reasons.push('Price below Ichimoku cloud'); }
	}
	if (vrocVal != null) {
		if (vrocVal > 20) { reasons.push(`Volume expanding (VROC ${vrocVal.toFixed(1)}%)`); }
	}

	const total = bull + bear;
	let action = 'neutral';
	let confidence = 0;
	if (total > 0) {
		if (bull > bear) { action = 'buy'; confidence = Math.round((bull / total) * 100); }
		else if (bear > bull) { action = 'sell'; confidence = Math.round((bear / total) * 100); }
		else { action = 'neutral'; confidence = 50; }
	}
	// ADX strengthens or weakens confidence (trend strength).
	if (adxVal != null && action !== 'neutral') {
		const trendFactor = Math.min(adxVal / 50, 1);
		confidence = Math.round(confidence * (0.6 + 0.4 * trendFactor));
	}

	return {
		action,
		confidence,
		price,
		indicators: {
			sma20: smaVal != null ? +smaVal.toFixed(4) : null,
			rsi14: rsiVal != null ? +rsiVal.toFixed(2) : null,
			macd: macdVal ? { macd: +macdVal.macd.toFixed(4), signal: +macdVal.signal.toFixed(4), histogram: +macdVal.histogram.toFixed(4) } : null,
			bollinger: bb ? { upper: +bb.upper.toFixed(4), middle: +bb.middle.toFixed(4), lower: +bb.lower.toFixed(4) } : null,
			stochastic: stochVal != null ? +stochVal.toFixed(2) : null,
			atr14: atrVal != null ? +atrVal.toFixed(4) : null,
			adx14: adxVal != null ? +adxVal.toFixed(2) : null,
			ichimoku: ichi ? { tenkan: +ichi.tenkan.toFixed(4), kijun: +ichi.kijun.toFixed(4), senkouA: +ichi.senkouA.toFixed(4), senkouB: +ichi.senkouB.toFixed(4) } : null,
			obv: obvVal != null ? +obvVal.toFixed(2) : null,
			vroc14: vrocVal != null ? +vrocVal.toFixed(2) : null,
		},
		reasons,
	};
}
