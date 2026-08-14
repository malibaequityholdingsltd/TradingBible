// OHLC candle data. Crypto symbols proxy Binance klines; everything else is
// generated as realistic synthetic OHLC seeded from the symbol so charts stay
// stable between refreshes but still animate a live last candle.

const CRYPTO_MAP = {
	BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
	XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT',
	// Real live gold price via PAX Gold (1 token = 1 fine troy oz of gold).
	XAUUSD: 'PAXGUSDT',
};

// Resolve a trading symbol to a Binance kline symbol (null when not crypto).
export function binanceSymbolFor(symbol) {
	if (CRYPTO_MAP[symbol]) return CRYPTO_MAP[symbol];
	if (/^[A-Z0-9]{2,10}USDT$/.test(symbol)) return symbol;
	return null;
}

import { avCandles, isRateLimited } from '../utils/alphaVantage.js';

const VALID_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

const INTERVAL_MS = {
	'1m': 60e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': 3600e3,
	'4h': 4 * 3600e3, '1d': 86400e3, '1w': 7 * 86400e3, '1M': 30 * 86400e3,
};

// Deterministic pseudo-random generator seeded from a string.
function mulberry32(seed) {
	let a = seed;
	return () => {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function seedFromSymbol(sym) {
	let h = 0;
	for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) | 0;
	return Math.abs(h) + 1;
}

const BASE_PRICE = {
	AAPL: 224.5, MSFT: 428, GOOGL: 178, AMZN: 186, TSLA: 248, META: 512, NVDA: 128,
	NQ: 19560, ES: 5460, SPX: 5460, DJI: 39800, GBPJPY: 191.4, EURUSD: 1.084,
	GBPUSD: 1.271, USDJPY: 156.8, AUDUSD: 0.662, USDCAD: 1.368, USDCHF: 0.902,
	NZDUSD: 0.612, XAUUSD: 2340, XAGUSD: 30.4, WTIUSD: 78.5, NATGAS: 2.9, COPPER: 4.5,
};
export function synthCandles(symbol, interval, limit) {
	const step = INTERVAL_MS[interval];
	const now = Date.now();
	const rand = mulberry32(seedFromSymbol(symbol + interval));
	let price = BASE_PRICE[symbol] || 100;
	const vol = price * 0.012;
	const candles = [];
	// Walk forward from oldest to newest.
	const start = now - step * limit;
	for (let i = 0; i < limit; i++) {
		const time = start + i * step;
		const drift = (rand() - 0.48) * vol;
		const open = price;
		const close = Math.max(0.01, open + drift);
		const high = Math.max(open, close) + rand() * vol * 0.6;
		const low = Math.min(open, close) - rand() * vol * 0.6;
		const volume = Math.round((rand() * 0.7 + 0.3) * price * 1000);
		candles.push({
			time,
			open: +open.toFixed(4), high: +high.toFixed(4),
			low: +low.toFixed(4), close: +close.toFixed(4), volume,
		});
		price = close;
	}
	return candles;
}

export default async (req, res) => {
	const symbol = String(req.query.symbol || 'BTCUSD').toUpperCase();
	const interval = String(req.query.interval || '1h');
	let limit = parseInt(req.query.limit, 10) || 150;
	limit = Math.min(Math.max(limit, 20), 500);

	if (!VALID_INTERVALS.includes(interval)) {
		return res.status(422).json({ error: `interval must be one of ${VALID_INTERVALS.join(', ')}` });
	}

	const binanceSymbol = binanceSymbolFor(symbol);
	if (binanceSymbol) {
		const upstream = await fetch(
			`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
		);
		if (!upstream.ok) {
			throw new Error(`binance klines failed: ${upstream.status} ${upstream.statusText}`);
		}
		const rows = await upstream.json();
		const candles = rows.map((r) => ({
			time: r[0],
			open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5],
		}));
		return res.json({ symbol, interval, source: 'binance', candles });
	}

	// Non-crypto: try Alpha Vantage for real OHLCV (cached), fall back to
	// synthetic candles when the symbol is unsupported or the key is throttled.
	if (!isRateLimited()) {
		try {
			const avRows = await avCandles(symbol, interval, limit);
			if (avRows && avRows.length) {
				return res.json({ symbol, interval, source: 'alphavantage', candles: avRows });
			}
		} catch {
			// fall through to synthetic
		}
	}

	return res.json({ symbol, interval, source: 'synthetic', candles: synthCandles(symbol, interval, limit) });
};
