// GET /indicator?symbol=BTCUSDT&interval=1h
// Fetches OHLCV from Binance, computes SMA/RSI/MACD/Bollinger/Stochastic/ATR/ADX
// and returns an aggregated buy/sell/neutral signal with a confidence score.
// Includes an in-memory cache to reduce upstream API calls.

import { generateSignal } from '../lib/indicators.js';

const VALID_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w'];
const CACHE_TTL_MS = 30_000;
const cache = new Map();

// Accept both Binance-style (BTCUSDT) and app-style (BTCUSD) symbols.
function normalizeSymbol(raw) {
	let s = String(raw || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
	if (!s.endsWith('USDT') && s.endsWith('USD')) s = `${s.slice(0, -3)}USDT`;
	return s;
}

export default async (req, res) => {
	const symbol = normalizeSymbol(req.query.symbol);
	const interval = String(req.query.interval || '1h');

	if (!VALID_INTERVALS.includes(interval)) {
		return res.status(422).json({ error: `interval must be one of ${VALID_INTERVALS.join(', ')}` });
	}

	const cacheKey = `${symbol}:${interval}`;
	const cached = cache.get(cacheKey);
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
		return res.json({ ...cached.payload, cached: true });
	}

	let rows;
	try {
		const upstream = await fetch(
			`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`,
		);
		if (!upstream.ok) {
			return res.status(502).json({ error: `Binance request failed: ${upstream.status}`, symbol, interval });
		}
		rows = await upstream.json();
	} catch (err) {
		return res.status(502).json({ error: 'Failed to reach Binance API', detail: err?.message });
	}

	if (!Array.isArray(rows) || rows.length < 30) {
		return res.status(422).json({ error: 'Not enough candle data for the requested symbol/interval', symbol, interval });
	}

	const candles = rows.map((r) => ({
		time: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5],
	}));

	const signal = generateSignal(candles);
	const payload = {
		symbol,
		interval,
		source: 'binance',
		updatedAt: new Date().toISOString(),
		lastClose: signal.price,
		signal: signal.action,
		...signal,
	};

	cache.set(cacheKey, { at: Date.now(), payload });
	return res.json(payload);
};
