// Quotes for arbitrary symbols. Crypto pulls live Binance 24h stats; every
// other symbol is generated deterministically from a base price so quotes stay
// coherent across refreshes while the last value drifts "live".

const CRYPTO_MAP = {
	BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
	XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT',
	DOTUSD: 'DOTUSDT', LINKUSD: 'LINKUSDT', MATICUSD: 'MATICUSDT', LTCUSD: 'LTCUSDT',
	TRXUSD: 'TRXUSDT', ATOMUSD: 'ATOMUSDT', UNIUSD: 'UNIUSDT', NEARUSD: 'NEARUSDT',
	// Real live gold price via PAX Gold (1 token = 1 fine troy oz of gold).
	XAUUSD: 'PAXGUSDT',
};

const BASE_PRICE = {
	AAPL: 224.5, MSFT: 428, GOOGL: 178, AMZN: 186, TSLA: 248, META: 512, NVDA: 128,
	JPM: 205, V: 276, WMT: 68, NFLX: 678, AMD: 158, INTC: 31, DIS: 98, ORCL: 142,
	NQ: 19560, ES: 5460, SPX: 5460, DJI: 39800, GBPJPY: 191.4, EURUSD: 1.084,
	GBPUSD: 1.271, USDJPY: 156.8, AUDUSD: 0.662, USDCAD: 1.368, USDCHF: 0.902,
	NZDUSD: 0.612, EURGBP: 0.853, EURJPY: 170.1, XAUUSD: 2340, XAGUSD: 30.4,
	WTIUSD: 78.5, BRENT: 82.9, NATGAS: 2.9, COPPER: 4.5, PLATINUM: 1010,
};

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
	// bucket per 5-minute window so quotes move over time
	const bucket = Math.floor(Date.now() / 300000);
	return Math.abs(h ^ bucket) + 1;
}

function synthQuote(symbol) {
	const base = BASE_PRICE[symbol] || 100;
	const rand = mulberry32(seedFromSymbol(symbol));
	const changePercent = +((rand() - 0.5) * 5).toFixed(2);
	const price = +(base * (1 + changePercent / 100)).toFixed(base < 10 ? 4 : 2);
	const high = +(price * (1 + rand() * 0.02)).toFixed(base < 10 ? 4 : 2);
	const low = +(price * (1 - rand() * 0.02)).toFixed(base < 10 ? 4 : 2);
	const volume = Math.round((rand() * 0.7 + 0.3) * base * 100000);
	return {
		symbol,
		price,
		changePercent,
		change: +(price - base).toFixed(base < 10 ? 4 : 2),
		high,
		low,
		volume,
		source: 'synthetic',
	};
}

import { avQuote, isRateLimited } from '../utils/alphaVantage.js';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Symbols Finnhub can quote live on the free tier (US equities). Forex,
// indices and commodities require a paid plan, so those stay synthetic.
const FINNHUB_STOCKS = new Set([
	'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT',
	'NFLX', 'AMD', 'INTC', 'DIS', 'ORCL',
]);

async function finnhubQuote(symbol) {
	if (!FINNHUB_API_KEY) return null;
	try {
		const upstream = await fetch(
			`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
		);
		if (!upstream.ok) return null;
		const d = await upstream.json();
		if (!d || typeof d.c !== 'number' || d.c === 0) return null;
		return {
			symbol,
			price: d.c,
			changePercent: Number((d.dp ?? 0).toFixed(2)),
			change: Number((d.d ?? 0).toFixed(2)),
			high: d.h,
			low: d.l,
			volume: 0,
			source: 'finnhub',
		};
	} catch {
		return null;
	}
}

export default async (req, res) => {
	const raw = String(req.query.symbols || '').toUpperCase();
	// Canonicalize Binance-style names (BTCUSDT → BTCUSD, PAXGUSDT → XAUUSD).
	const rev = new Map(Object.entries(CRYPTO_MAP).map(([k, v]) => [v, k]));
	const symbols = raw
		.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60)
		.map((s) => rev.get(s) ?? s);
	if (!symbols.length) return res.json({ quotes: [] });

	// Live crypto batch
	const cryptoSymbols = symbols.filter((s) => CRYPTO_MAP[s]);
	const liveMap = {};
	if (cryptoSymbols.length) {
		try {
			const binList = cryptoSymbols.map((s) => CRYPTO_MAP[s]);
			const q = encodeURIComponent(JSON.stringify(binList));
			const upstream = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`);
			if (upstream.ok) {
				const data = await upstream.json();
				const rev = Object.fromEntries(Object.entries(CRYPTO_MAP).map(([k, v]) => [v, k]));
				for (const t of data) {
					const sym = rev[t.symbol];
					if (sym) {
						liveMap[sym] = {
							symbol: sym,
							price: Number(t.lastPrice),
							changePercent: Number(t.priceChangePercent),
							change: Number(t.priceChange),
							high: Number(t.highPrice),
							low: Number(t.lowPrice),
							volume: Number(t.quoteVolume),
							source: 'binance',
						};
					}
				}
			}
		} catch {
			// fall through to synthetic for crypto too
		}
	}

	// Live stock batch via Finnhub (parallel, one call per symbol)
	const stockSymbols = symbols.filter((s) => !CRYPTO_MAP[s] && FINNHUB_STOCKS.has(s));
	if (stockSymbols.length) {
		const results = await Promise.all(stockSymbols.map((s) => finnhubQuote(s)));
		stockSymbols.forEach((s, i) => {
			if (results[i]) liveMap[s] = results[i];
		});
	}

	// Alpha Vantage as the primary source (cached 60s). Only queried for
	// symbols not already resolved above and while not rate limited, since the
	// free key is capped at 25 requests/day. Anything it can't serve falls
	// back to Binance/Finnhub live data or a synthetic quote.
	if (!isRateLimited()) {
		const pending = symbols.filter((s) => !liveMap[s]);
		const avResults = await Promise.all(pending.map((s) => avQuote(s).catch(() => null)));
		pending.forEach((s, i) => {
			if (avResults[i]) liveMap[s] = avResults[i];
		});
	}

	const quotes = symbols.map((s) => liveMap[s] || synthQuote(s));
	const delayed = quotes.some((q) => q.source === 'synthetic') && isRateLimited();
	res.json({ quotes, delayed });
};
