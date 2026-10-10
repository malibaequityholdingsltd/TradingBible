// Yahoo Finance chart API — free, no key required. Covers stocks, ETFs,
// forex (SYM=X), metals/energy futures (GC=F, SI=F, CL=F…), and index
// futures (^GSPC, NQ=F…). Used for live quotes + intraday candles for every
// symbol Binance doesn't serve. Responses cached briefly; anything failing
// returns null so callers fall back to synthetic instead of 500ing.

// Minimal UA: Yahoo throttles full browser fingerprints (429) but serves
// a plain UA reliably. Rotate hosts so one throttled host can't blind us.
const UA = { 'User-Agent': 'Mozilla/5.0' };

const cache = new Map();
function getCache(key) {
	const hit = cache.get(key);
	if (hit && hit.expires > Date.now()) return hit.value;
	cache.delete(key);
	return null;
}
function setCache(key, value, ttlMs) {
	if (cache.size > 500) cache.clear();
	cache.set(key, { value, expires: Date.now() + ttlMs });
}

// Explicit mappings first; generic 6-letter forex pairs fall through to =X.
const YAHOO_MAP = {
	XAUUSD: 'GC=F', XAGUSD: 'SI=F', WTIUSD: 'CL=F', BRENT: 'BZ=F',
	NATGAS: 'NG=F', COPPER: 'HG=F', PLATINUM: 'PL=F', PALLADIUM: 'PA=F',
	WHEAT: 'ZW=F', CORN: 'ZC=F', SOYUSD: 'ZS=F', SUGARUSD: 'SB=F',
	COFFEEUSD: 'KC=F', COCOAUSD: 'CC=F', COTTONUSD: 'CT=F',
	ALUMUSD: 'ALI=F', ZINCUSD: 'ZNC=F', NICKELUSD: 'NI=F',
	GASOLINEUSD: 'RB=F', HEATOILUSD: 'HO=F',
	NQ: 'NQ=F', ES: 'ES=F', SPX: '^GSPC', DJI: '^DJI', RUT: '^RUT', VIX: '^VIX',
	// Broker CFD aliases for the same underlyings (spot metals have no Yahoo
	// quote — XAUUSD=X/XAGUSD=X don't exist — so metals use futures).
	NAS100: 'NQ=F', US100: 'NQ=F', USTEC: 'NQ=F', NDX: '^NDX',
	US500: 'ES=F', SPX500: 'ES=F', SP500: '^GSPC',
	US30: 'YM=F', DJ30: '^DJI',
	GER40: '^GDAXI', DE40: '^GDAXI', UK100: '^FTSE', FRA40: '^FCHI',
	ESP35: '^IBEX', EUSTX50: '^STOXX50E', JPN225: '^N225', AUS200: '^AXJO',
	HK50: '^HSI', US2000: '^RUT',
};

export function yahooSymbolFor(symbol) {
	if (!symbol) return null;
	if (YAHOO_MAP[symbol]) return YAHOO_MAP[symbol];
	// Crypto spot (BTCUSD -> BTC-USD): Yahoo is the single primary source
	// for every symbol — one feed, no mixed providers. Binance stays as
	// automatic fallback for crypto only.
	if (/^[A-Z0-9]{2,12}USD$/.test(symbol)) {
		const base = symbol.slice(0, -3);
		if (['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'MATIC', 'LTC', 'TRX', 'ATOM', 'UNI', 'NEAR', 'APT', 'FIL', 'ICP', 'ETC', 'ARB', 'OP', 'SUI', 'SEI', 'TIA', 'ONDO', 'INJ', 'STX', 'IMX', 'HBAR', 'VET', 'ALGO', 'QNT', 'GRT', 'THETA', 'EGLD', 'RUNE', 'KAS', 'FET', 'RENDER', 'GALA', 'SAND', 'MANA', 'AXS', 'AAVE', 'MKR', 'LDO', 'ENA', 'PENDLE', 'JUP', 'PYTH', 'WLD', 'PEPE', 'SHIB', 'BONK', 'WIF', 'FLOKI', 'JASMY', 'ORDI', 'BLUR'].includes(base)) return `${base}-USD`;
	}
	// Generic spot forex: EURUSD -> EURUSD=X
	if (/^[A-Z]{6}$/.test(symbol)) return `${symbol}=X`;
	// US stocks / ETFs pass through unchanged.
	if (/^[A-Z]{1,5}$/.test(symbol)) return symbol;
	return null;
}

const HOSTS = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com'];

async function fetchChart(ySym, interval, range) {
	const cached = getCache(`y:${ySym}:${interval}:${range}`);
	if (cached) return cached;
	for (const host of HOSTS) {
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 9000);
			const res = await fetch(
				`${host}/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${interval}&range=${range}`,
				{ headers: UA, signal: ctrl.signal },
			).finally(() => clearTimeout(t));
			if (!res.ok) continue;
			const j = await res.json();
			const result = j?.chart?.result?.[0];
			if (!result) continue;
			setCache(`y:${ySym}:${interval}:${range}`, result, 45000);
			return result;
		} catch {
			// try next host
		}
	}
	return null;
}

function toQuote(symbol, result) {
	const meta = result?.meta;
	const price = Number(meta?.regularMarketPrice);
	if (!Number.isFinite(price) || price <= 0) return null;
	const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
	const change = Number.isFinite(prev) && prev > 0 ? price - prev : 0;
	const changePercent = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : 0;
	return {
		symbol,
		price,
		changePercent: Math.round(changePercent * 100) / 100,
		change: Math.round(change * 10000) / 10000,
		high: Number(meta?.regularMarketDayHigh) || price,
		low: Number(meta?.regularMarketDayLow) || price,
		volume: Number(meta?.regularMarketVolume) || 0,
		source: 'yahoo',
	};
}

export async function yahooQuote(symbol) {
	const ySym = yahooSymbolFor(symbol);
	if (!ySym) return null;
	const result = await fetchChart(ySym, '5m', '1d');
	if (!result) return null;
	return toQuote(symbol, result);
}

// Period-over-period % change from real history (heatmap). 1d is served by
// the daily quote itself, so this covers the other heatmap periods only.
// Cached per period: intraday windows refresh in minutes, long windows in hours.
const PERIOD_HIST = {
	'1h': ['60m', '1d', 2, 120000],
	'4h': ['60m', '5d', 4, 300000],
	'1w': ['1d', '1mo', 7, 900000],
	'1M': ['1d', '3mo', 30, 3600000],
	'1Y': ['1wk', '2y', 52, 21600000],
};

export async function yahooPeriodChange(ySym, period) {
	if (period === '1d') return null;
	const spec = PERIOD_HIST[period];
	if (!spec || !ySym) return null;
	const [interval, range, points, ttl] = spec;
	const key = `ypc:${ySym}:${period}`;
	const hit = getCache(key);
	if (hit != null) return hit;
	const result = await fetchChart(ySym, interval, range);
	const closes = result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
	if (closes.length < 2) return null;
	const win = closes.slice(-points);
	const first = win[0];
	const last = win[win.length - 1];
	if (!first) return null;
	const pct = +(((last - first) / first) * 100).toFixed(2);
	setCache(key, pct, ttl);
	return pct;
}
const CANDLE_PLAN = {
	'1m': ['1m', '1d', 1], '5m': ['5m', '5d', 1], '15m': ['15m', '1mo', 1],
	'30m': ['30m', '1mo', 1], '1h': ['60m', '3mo', 1], '4h': ['60m', '3mo', 4],
	'1d': ['1d', '1y', 1], '1w': ['1wk', '2y', 1], '1M': ['1mo', 'max', 1],
};

export async function yahooCandles(symbol, interval, limit) {
	const ySym = yahooSymbolFor(symbol);
	const plan = CANDLE_PLAN[interval];
	if (!ySym || !plan) return null;
	const [yInt, range, group] = plan;
	const result = await fetchChart(ySym, yInt, range);
	const ts = result?.timestamp;
	const q = result?.indicators?.quote?.[0];
	if (!ts || !q || !ts.length) return null;
	const rows = [];
	for (let i = 0; i < ts.length; i++) {
		const c = Number(q.close?.[i]);
		if (!Number.isFinite(c)) continue;
		rows.push({
			time: ts[i] * 1000,
			open: Number(q.open?.[i] ?? c),
			high: Number(q.high?.[i] ?? c),
			low: Number(q.low?.[i] ?? c),
			close: c,
			volume: Number(q.volume?.[i]) || 0,
		});
	}
	if (!rows.length) return null;
	if (group > 1) {
		// Aggregate hourly bars into 4h bars.
		const out = [];
		for (let i = 0; i < rows.length; i += group) {
			const chunk = rows.slice(i, i + group);
			out.push({
				time: chunk[0].time,
				open: chunk[0].open,
				high: Math.max(...chunk.map((r) => r.high)),
				low: Math.min(...chunk.map((r) => r.low)),
				close: chunk[chunk.length - 1].close,
				volume: chunk.reduce((s, r) => s + r.volume, 0),
			});
		}
		return out.slice(-limit);
	}
	return rows.slice(-limit);
}
