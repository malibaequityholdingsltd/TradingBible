// OHLC candle data. Crypto symbols proxy Binance klines (live); everything
// else tradeable pulls live Yahoo Finance OHLCV (no key), then Alpha Vantage
// (cached), then synthetic random-walk as the last resort so charts never
// render empty. Every response carries its `source`.

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

// Resolve a trading symbol to a Binance kline symbol (null when not crypto).
export function binanceSymbolFor(symbol) {
	if (CRYPTO_MAP[symbol]) return CRYPTO_MAP[symbol];
	if (/^[A-Z0-9]{2,10}USDT$/.test(symbol)) return symbol;
	return null;
}

import { avCandles, isRateLimited } from '../utils/alphaVantage.js';
import { yahooCandles } from '../utils/yahoo.js';

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
	JPM: 205, V: 276, WMT: 68, NFLX: 678, AMD: 158, INTC: 31, DIS: 98, ORCL: 142,
	CSCO: 48, PFE: 28, NKE: 76, MCD: 258, T: 19, VZ: 40, ABBV: 178, CVX: 156,
	WFC: 60, MRK: 128, COST: 848, TMO: 578, ACN: 328, DHR: 248, LIN: 438,
	TXN: 198, QCOM: 168, HON: 208, UPS: 138, PM: 102, IBM: 178, GE: 168,
	CAT: 338, BA: 178, GS: 458, JNJ: 148, PG: 168, MA: 458, HD: 348, XOM: 112,
	BAC: 40, KO: 63, PEP: 168,
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
	NZDUSD: 0.612, XAUUSD: 2340, XAGUSD: 30.4, WTIUSD: 78.5, NATGAS: 2.9, COPPER: 4.5,
	EURCHF: 0.95, EURAUD: 1.65, EURNZD: 1.78, EURCAD: 1.49, EURSEK: 11.8,
	EURNOK: 11.9, EURZAR: 19.7, EURMXN: 22.2, GBPAUD: 1.93, GBPCAD: 1.74,
	GBPNZD: 2.08, GBPCHF: 1.14, GBPZAR: 23.6, AUDCAD: 0.91, AUDNZD: 1.09,
	AUDCHF: 0.60, NZDCAD: 0.84, NZDCHF: 0.55, NZDJPY: 96.0, CADJPY: 114.5,
	CADCHF: 0.66, USDSGD: 1.35, USDHKD: 7.79, USDMXN: 20.5, USDZAR: 18.2,
	USDTRY: 34.0, USDSEK: 10.9, USDNOK: 11.1, AUDJPY: 103.8, CHFJPY: 173.9,
	EURGBP: 0.853, EURJPY: 170.1,
	SOYUSD: 1050, SUGARUSD: 22.5, COFFEEUSD: 245, COCOAUSD: 7200, COTTONUSD: 72,
	ALUMUSD: 2450, ZINCUSD: 2900, NICKELUSD: 16000, GASOLINEUSD: 2.1, HEATOILUSD: 2.4,
	BRENT: 82.9, PLATINUM: 1010, PALLADIUM: 985, WHEAT: 592, CORN: 445,
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
	// Single primary feed: Yahoo first for every symbol (crypto spot included),
	// Binance as automatic fallback for crypto, then Alpha Vantage, then
	// synthetic so charts never render empty.
	const yahooFirst = await yahooCandles(symbol, interval, limit).catch(() => null);
	if (yahooFirst && yahooFirst.length) {
		return res.json({ symbol, interval, source: 'yahoo', candles: yahooFirst });
	}
	if (binanceSymbol) {
		// Rotate Binance hosts — api.binance.com is geo-blocked in some regions.
		for (const host of ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api.binance.us']) {
			try {
				const upstream = await fetch(
					`${host}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
				);
				if (!upstream.ok) continue;
				const rows = await upstream.json();
				const candles = rows.map((r) => ({
					time: r[0],
					open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5],
				}));
				if (candles.length) return res.json({ symbol, interval, source: 'binance', candles });
			} catch {
				// try next host, then fall through to Yahoo / synthetic below —
				// charts must never render empty because one provider hiccuped
			}
		}
	}

	// Alpha Vantage next (cached), then synthetic so charts never render empty.
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
