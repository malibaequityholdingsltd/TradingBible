// Quotes for arbitrary symbols. Crypto pulls live Binance 24h stats, US
// stocks use Finnhub when keyed, everything else tradeable pulls live Yahoo
// Finance quotes (no key). Synthetic random-walk quotes are the last resort
// only — every quote carries its `source` so the UI can badge LIVE vs SIM.

const CRYPTO_MAP = {
	BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT', BNBUSD: 'BNBUSDT',
	XRPUSD: 'XRPUSDT', ADAUSD: 'ADAUSDT', DOGEUSD: 'DOGEUSDT', AVAXUSD: 'AVAXUSDT',
	DOTUSD: 'DOTUSDT', LINKUSD: 'LINKUSDT', MATICUSD: 'MATICUSDT', LTCUSD: 'LTCUSDT',
	TRXUSD: 'TRXUSDT', ATOMUSD: 'ATOMUSDT', UNIUSD: 'UNIUSDT', NEARUSD: 'NEARUSDT',
	APTUSD: 'APTUSDT', FILUSD: 'FILUSDT', ICPUSD: 'ICPUSDT', ETCUSD: 'ETCUSDT',
	ARBUSD: 'ARBUSDT', OPUSD: 'OPUSDT', SUIUSD: 'SUIUSDT', SEIUSD: 'SEIUSDT',
	TIAUSD: 'TIAUSDT', ONDOUSD: 'ONDOUSDT', INJUSD: 'INJUSDT', STXUSD: 'STXUSDT',
	IMXUSD: 'IMXUSDT', HBARUSD: 'HBARUSDT', VETUSD: 'VETUSDT', ALGOUSD: 'ALGOUSDT',
	QNTUSD: 'QNTUSDT', GRTUSD: 'GRTUSDT', THETAUSD: 'THETAUSDT', EGLDUSD: 'EGLDUSDT',
	RUNEUSD: 'RUNEUSDT', KASUSD: 'KASUSDT', FETUSD: 'FETUSDT', RENDERUSD: 'RENDERUSDT',
	GALAUSD: 'GALAUSDT', SANDUSD: 'SANDUSDT', MANAUSD: 'MANAUSDT', AXSUSD: 'AXSUSDT',
	AAVEUSD: 'AAVEUSDT', MKRUSD: 'MKRUSDT', LDOUSD: 'LDOUSDT', ENAUSD: 'ENAUSDT',
	PENDLEUSD: 'PENDLEUSDT', JUPUSD: 'JUPUSDT', PYTHUSD: 'PYTHUSDT', WLDUSD: 'WLDUSDT',
	PEPEUSD: 'PEPEUSDT', SHIBUSD: 'SHIBUSDT', BONKUSD: 'BONKUSDT', WIFUSD: 'WIFUSDT',
	FLOKIUSD: 'FLOKIUSDT', JASMYUSD: 'JASMYUSDT', ORDIUSD: 'ORDIUSDT', BLURUSD: 'BLURUSDT',
	// Real live gold price via PAX Gold (1 token = 1 fine troy oz of gold).
	XAUUSD: 'PAXGUSDT',
};

const BASE_PRICE = {
	AAPL: 224.5, MSFT: 428, GOOGL: 178, AMZN: 186, TSLA: 248, META: 512, NVDA: 128,
	JPM: 205, V: 276, WMT: 68, NFLX: 678, AMD: 158, INTC: 31, DIS: 98, ORCL: 142,
	AVGO: 240, LLY: 770, UNH: 510, AMAT: 180, MU: 105, LRCX: 85, KLAC: 700,
	ADI: 220, PANW: 380, NOW: 900, INTU: 640, AMGN: 270, GILD: 95, ISRG: 540,
	SYK: 360, BSX: 85, SHW: 350, APD: 300, NEE: 80, DUK: 115, AMT: 230,
	PLD: 125, EQIX: 800, MDLZ: 60, CL: 95, BKNG: 5200, RCL: 240, UAL: 85,
	DAL: 60, FDX: 275, UNP: 250, CSX: 33, MMM: 135, LOW: 225, TJX: 120,
	F: 11, GM: 55, MO: 55, ADP: 290, MSI: 440, NOC: 580, LMT: 600, RTX: 130,
	D: 60, EXC: 40, WM: 210, EMR: 115, ETN: 340, AFL: 110, PRU: 115,
	XLK: 230, XLF: 45, XLV: 155, XLE: 95, XLY: 210, XLI: 135, XLB: 95, XLU: 80,
	XLRE: 45, XLC: 95, XBI: 95, XOP: 140, XHB: 115, XRT: 78, KRE: 60, SMH: 250,
	XME: 60, XAR: 175, TAN: 45, JETS: 25,
	NQ: 19560, ES: 5460, SPX: 5460, DJI: 39800, RUT: 2200, VIX: 15,
	GBPJPY: 191.4, EURUSD: 1.084,
	GBPUSD: 1.271, USDJPY: 156.8, AUDUSD: 0.662, USDCAD: 1.368, USDCHF: 0.902,
	NZDUSD: 0.612, EURGBP: 0.853, EURJPY: 170.1, XAUUSD: 2340, XAGUSD: 30.4,
	WTIUSD: 78.5, BRENT: 82.9, NATGAS: 2.9, COPPER: 4.5, PLATINUM: 1010,
	PALLADIUM: 985, WHEAT: 592, CORN: 445,
	EURCHF: 0.95, EURAUD: 1.65, EURNZD: 1.78, EURCAD: 1.49, EURSEK: 11.8,
	EURNOK: 11.9, EURZAR: 19.7, EURMXN: 22.2, GBPAUD: 1.93, GBPCAD: 1.74,
	GBPNZD: 2.08, GBPCHF: 1.14, GBPZAR: 23.6, AUDCAD: 0.91, AUDNZD: 1.09,
	AUDCHF: 0.60, NZDCAD: 0.84, NZDCHF: 0.55, NZDJPY: 96.0, CADJPY: 114.5,
	CADCHF: 0.66, USDSGD: 1.35, USDHKD: 7.79, USDMXN: 20.5, USDZAR: 18.2,
	USDTRY: 34.0, USDSEK: 10.9, USDNOK: 11.1, AUDJPY: 103.8, CHFJPY: 173.9,
	SOYUSD: 1050, SUGARUSD: 22.5, COFFEEUSD: 245, COCOAUSD: 7200, COTTONUSD: 72,
	ALUMUSD: 2450, ZINCUSD: 2900, NICKELUSD: 16000, GASOLINEUSD: 2.1, HEATOILUSD: 2.4,
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
import { yahooQuote } from '../utils/yahoo.js';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Symbols Finnhub can quote live on the free tier (US equities). Forex,
// indices and commodities require a paid plan, so those stay synthetic.
const FINNHUB_STOCKS = new Set([
	'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT',
	'NFLX', 'AMD', 'INTC', 'DIS', 'ORCL', 'JNJ', 'PG', 'MA', 'HD', 'XOM',
	'BAC', 'KO', 'PEP', 'ADBE', 'CRM', 'CSCO', 'PFE', 'NKE', 'MCD', 'T',
	'VZ', 'ABBV', 'CVX', 'WFC', 'MRK', 'COST', 'TMO', 'ACN', 'DHR', 'LIN',
	'TXN', 'QCOM', 'HON', 'UPS', 'PM', 'IBM', 'GE', 'CAT', 'BA', 'GS',
	'AVGO', 'LLY', 'UNH', 'AMAT', 'MU', 'LRCX', 'KLAC', 'ADI', 'PANW',
	'NOW', 'INTU', 'AMGN', 'GILD', 'ISRG', 'SYK', 'BSX', 'SHW', 'APD',
	'NEE', 'DUK', 'AMT', 'PLD', 'EQIX', 'MDLZ', 'CL', 'BKNG', 'RCL',
	'UAL', 'DAL', 'FDX', 'UNP', 'CSX', 'MMM', 'LOW', 'TJX', 'F', 'GM',
	'MO', 'ADP', 'MSI', 'NOC', 'LMT', 'RTX', 'D', 'EXC', 'WM', 'EMR',
	'ETN', 'AFL', 'PRU',
	'XLK', 'XLF', 'XLV', 'XLE', 'XLY', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC',
	'XBI', 'XOP', 'XHB', 'XRT', 'KRE', 'SMH', 'XME', 'XAR', 'TAN', 'JETS',
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
	const raw = String(req.query.symbols || req.query.symbol || '').toUpperCase();
	// Canonicalize Binance-style names (BTCUSDT → BTCUSD, PAXGUSDT → XAUUSD).
	const rev = new Map(Object.entries(CRYPTO_MAP).map(([k, v]) => [v, k]));
	const symbols = raw
		.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 120)
		.map((s) => rev.get(s) ?? s);
	if (!symbols.length) return res.json({ quotes: [] });

	// Single primary feed: Yahoo Finance first for every symbol (crypto via
	// XXX-USD spot, forex via =X, metals/energy/index futures, US stocks).
	// Keyed Finnhub stays ahead of it for stocks when configured; Binance is
	// the automatic fallback for crypto only. Anything unresolved ends up
	// synthetic — always labelled with its `source`.
	const liveMap = {};
	const stockSymbols = symbols.filter((s) => !CRYPTO_MAP[s] && FINNHUB_STOCKS.has(s));
	if (stockSymbols.length) {
		const results = await Promise.all(stockSymbols.map((s) => finnhubQuote(s)));
		stockSymbols.forEach((s, i) => {
			if (results[i]) liveMap[s] = results[i];
		});
	}

	// Yahoo Finance (free, no key) for anything not already resolved live.
	const yahooPending = symbols.filter((s) => !liveMap[s]);
	if (yahooPending.length) {
		const yResults = await Promise.all(yahooPending.map((s) => yahooQuote(s).catch(() => null)));
		yahooPending.forEach((s, i) => {
			if (yResults[i]) liveMap[s] = yResults[i];
		});
	}

	// Live crypto fallback (Binance hosts rotate — api.binance.com is
	// geo-blocked in some regions, vision/us work there instead).
	const cryptoSymbols = symbols.filter((s) => CRYPTO_MAP[s] && !liveMap[s]);
	if (cryptoSymbols.length) {
		const binList = cryptoSymbols.map((s) => CRYPTO_MAP[s]);
		const q = encodeURIComponent(JSON.stringify(binList));
		const hosts = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api.binance.us'];
		const want = new Set(cryptoSymbols);
		for (const host of hosts) {
			try {
				const upstream = await fetch(`${host}/api/v3/ticker/24hr?symbols=${q}`);
				if (!upstream.ok) continue;
				const data = await upstream.json();
				const rev = Object.fromEntries(Object.entries(CRYPTO_MAP).map(([k, v]) => [v, k]));
				for (const t of data) {
					const sym = rev[t.symbol];
					if (sym && want.has(sym)) {
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
						want.delete(sym);
					}
				}
				if (!want.size) break;
			} catch {
				// try next host, else fall through to synthetic for crypto too
			}
		}
	}

	// Alpha Vantage as a backup source (cached 60s). Only queried for
	// symbols not already resolved above and while not rate limited, since the
	// free key is capped at 25 requests/day. Anything still unresolved ends
	// up synthetic — always labelled with its `source`.
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
