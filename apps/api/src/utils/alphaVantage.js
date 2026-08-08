// Alpha Vantage market-data helpers with in-memory caching + rate-limit
// handling. The free key allows only 25 requests/day, so every response is
// cached aggressively and callers MUST provide a fallback for when Alpha
// Vantage is unavailable or throttled.
import logger from './logger.js';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE = 'https://www.alphavantage.co/query';

// Simple TTL cache keyed by the fully-qualified request URL (minus the key).
const cache = new Map();

// Once the daily limit is hit, stop calling upstream until this timestamp.
let rateLimitedUntil = 0;

export function isRateLimited() {
	return Date.now() < rateLimitedUntil;
}

function getCache(key) {
	const hit = cache.get(key);
	if (hit && hit.expires > Date.now()) return hit.value;
	return null;
}

function setCache(key, value, ttlMs) {
	cache.set(key, { value, expires: Date.now() + ttlMs });
}

// Fetch an Alpha Vantage function with caching. Returns the parsed JSON, or
// null when unavailable (missing key, rate limited, upstream error, or the
// documented "Information"/"Note" throttle envelopes). Callers fall back.
export async function avFetch(params, ttlMs) {
	if (!API_KEY) return null;

	const usp = new URLSearchParams(params);
	const cacheKey = usp.toString();

	const cached = getCache(cacheKey);
	if (cached) return cached;

	if (isRateLimited()) return null;

	usp.set('apikey', API_KEY);

	let res;
	try {
		res = await fetch(`${BASE}?${usp.toString()}`);
	} catch (err) {
		logger.error(`alpha vantage fetch failed: ${err.message}`);
		return null;
	}

	if (!res.ok) {
		logger.error(`alpha vantage http ${res.status} ${res.statusText}`);
		return null;
	}

	const data = await res.json();

	// Alpha Vantage signals throttling / errors inside a 200 body.
	if (data && (data.Information || data.Note)) {
		// Back off for an hour when we hit the daily/per-minute cap.
		rateLimitedUntil = Date.now() + 60 * 60 * 1000;
		logger.error('alpha vantage rate limited — backing off 1h');
		return null;
	}
	if (data && data['Error Message']) {
		logger.error(`alpha vantage error: ${data['Error Message']}`);
		return null;
	}

	setCache(cacheKey, data, ttlMs);
	return data;
}

// TTL presets (per the task spec).
export const TTL = {
	QUOTE: 60 * 1000, // 60s
	INTRADAY: 5 * 60 * 1000, // 5m
	DAILY: 60 * 60 * 1000, // 1h
};

// Symbol classification --------------------------------------------------
const CRYPTO = {
	BTCUSD: 'BTC', ETHUSD: 'ETH', SOLUSD: 'SOL', XRPUSD: 'XRP', BNBUSD: 'BNB',
	ADAUSD: 'ADA', DOGEUSD: 'DOGE', AVAXUSD: 'AVAX', DOTUSD: 'DOT', LTCUSD: 'LTC',
	LINKUSD: 'LINK', TRXUSD: 'TRX', ATOMUSD: 'ATOM', UNIUSD: 'UNI', NEARUSD: 'NEAR',
	MATICUSD: 'MATIC',
};

// Forex pairs Alpha Vantage understands as from/to currency codes.
const FOREX = {
	EURUSD: ['EUR', 'USD'], GBPUSD: ['GBP', 'USD'], USDJPY: ['USD', 'JPY'],
	JPYUSD: ['JPY', 'USD'], AUDUSD: ['AUD', 'USD'], USDCAD: ['USD', 'CAD'],
	USDCHF: ['USD', 'CHF'], NZDUSD: ['NZD', 'USD'], EURGBP: ['EUR', 'GBP'],
	EURJPY: ['EUR', 'JPY'], GBPJPY: ['GBP', 'JPY'],
	XAUUSD: ['XAU', 'USD'], XAGUSD: ['XAG', 'USD'],
};

export function classify(symbol) {
	if (CRYPTO[symbol]) return { kind: 'crypto', code: CRYPTO[symbol] };
	if (FOREX[symbol]) return { kind: 'forex', from: FOREX[symbol][0], to: FOREX[symbol][1] };
	// Plain equities (AAPL, MSFT, ...). Futures/indices (NQ, ES) aren't
	// supported by Alpha Vantage and fall through to the caller's fallback.
	if (/^[A-Z]{1,5}$/.test(symbol)) return { kind: 'stock', code: symbol };
	return { kind: 'unsupported' };
}

// Real-time quote via Alpha Vantage. Returns a normalized quote or null.
export async function avQuote(symbol) {
	const c = classify(symbol);

	if (c.kind === 'stock') {
		const data = await avFetch({ function: 'GLOBAL_QUOTE', symbol: c.code }, TTL.QUOTE);
		const q = data && data['Global Quote'];
		if (!q || !q['05. price']) return null;
		const price = Number(q['05. price']);
		return {
			symbol,
			price,
			changePercent: Number(String(q['10. change percent'] || '0').replace('%', '')),
			change: Number(q['09. change'] || 0),
			high: Number(q['03. high'] || price),
			low: Number(q['04. low'] || price),
			volume: Number(q['06. volume'] || 0),
			source: 'alphavantage',
		};
	}

	if (c.kind === 'crypto' || c.kind === 'forex') {
		const from = c.kind === 'crypto' ? c.code : c.from;
		const to = c.kind === 'crypto' ? 'USD' : c.to;
		const data = await avFetch(
			{ function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: to },
			TTL.QUOTE,
		);
		const r = data && data['Realtime Currency Exchange Rate'];
		if (!r || !r['5. Exchange Rate']) return null;
		const price = Number(r['5. Exchange Rate']);
		const bid = Number(r['8. Bid Price'] || price);
		const ask = Number(r['9. Ask Price'] || price);
		return {
			symbol,
			price,
			changePercent: 0,
			change: 0,
			high: Math.max(price, ask),
			low: Math.min(price, bid),
			volume: 0,
			source: 'alphavantage',
		};
	}

	return null;
}

// Map our timeframe strings to Alpha Vantage series functions/intervals.
const AV_INTRADAY = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1h': '60min' };

function parseSeries(obj) {
	// Find the "* Time Series *" key regardless of exact wording.
	const key = Object.keys(obj || {}).find((k) => /Time Series|Digital Currency/i.test(k));
	if (!key) return null;
	const series = obj[key];
	const rows = Object.entries(series).map(([ts, v]) => {
		const open = Number(v['1. open'] ?? v['1a. open (USD)']);
		const high = Number(v['2. high'] ?? v['2a. high (USD)']);
		const low = Number(v['3. low'] ?? v['3a. low (USD)']);
		const close = Number(v['4. close'] ?? v['4a. close (USD)']);
		const volume = Number(v['5. volume'] ?? v['6. volume'] ?? 0);
		return { time: new Date(ts.replace(' ', 'T') + 'Z').getTime(), open, high, low, close, volume };
	});
	return rows.sort((a, b) => a.time - b.time);
}

// Real OHLCV candles via Alpha Vantage. interval is one of our timeframe
// strings. Returns an ascending array of candles or null (caller falls back).
export async function avCandles(symbol, interval, limit) {
	const c = classify(symbol);
	let params;
	let ttl = TTL.DAILY;

	if (AV_INTRADAY[interval]) {
		ttl = TTL.INTRADAY;
		if (c.kind === 'stock') {
			params = { function: 'TIME_SERIES_INTRADAY', symbol: c.code, interval: AV_INTRADAY[interval], outputsize: 'compact' };
		} else if (c.kind === 'forex') {
			params = { function: 'FX_INTRADAY', from_symbol: c.from, to_symbol: c.to, interval: AV_INTRADAY[interval], outputsize: 'compact' };
		} else if (c.kind === 'crypto') {
			params = { function: 'CRYPTO_INTRADAY', symbol: c.code, market: 'USD', interval: AV_INTRADAY[interval], outputsize: 'compact' };
		} else return null;
	} else {
		// Daily / weekly / monthly (1d, 4h→daily, 1w, 1M).
		const bucket = interval === '1w' ? 'WEEKLY' : interval === '1M' ? 'MONTHLY' : 'DAILY';
		if (c.kind === 'stock') {
			params = bucket === 'DAILY'
				? { function: 'TIME_SERIES_DAILY', symbol: c.code, outputsize: 'compact' }
				: { function: `TIME_SERIES_${bucket}`, symbol: c.code };
		} else if (c.kind === 'forex') {
			params = { function: `FX_${bucket}`, from_symbol: c.from, to_symbol: c.to, outputsize: 'compact' };
		} else if (c.kind === 'crypto') {
			params = { function: `DIGITAL_CURRENCY_${bucket}`, symbol: c.code, market: 'USD' };
		} else return null;
	}

	const data = await avFetch(params, ttl);
	const rows = data && parseSeries(data);
	if (!rows || !rows.length) return null;
	return rows.slice(-limit);
}
