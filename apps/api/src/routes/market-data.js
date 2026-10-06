// Live market data via Binance public API (no key required).
// Covers the full crypto registry (display names mirror quotes/candles).
const SYMBOL_MAP = {
	BTCUSDT: 'BTCUSD', ETHUSDT: 'ETHUSD', SOLUSDT: 'SOLUSD', BNBUSDT: 'BNBUSD',
	XRPUSDT: 'XRPUSD', ADAUSDT: 'ADAUSD', DOGEUSDT: 'DOGEUSD', AVAXUSDT: 'AVAXUSD',
	DOTUSDT: 'DOTUSD', LINKUSDT: 'LINKUSD', MATICUSDT: 'MATICUSD', LTCUSDT: 'LTCUSD',
	TRXUSDT: 'TRXUSD', ATOMUSDT: 'ATOMUSD', UNIUSDT: 'UNIUSD', NEARUSDT: 'NEARUSD',
	APTUSDT: 'APTUSD', FILUSDT: 'FILUSD', ICPUSDT: 'ICPUSD', ETCUSDT: 'ETCUSD',
	ARBUSDT: 'ARBUSD', OPUSDT: 'OPUSD', SUIUSDT: 'SUIUSD', SEIUSDT: 'SEIUSD',
	TIAUSDT: 'TIAUSD', ONDOUSDT: 'ONDOUSD', INJUSDT: 'INJUSD', STXUSDT: 'STXUSD',
	IMXUSDT: 'IMXUSD', HBARUSDT: 'HBARUSD', VETUSDT: 'VETUSD', ALGOUSDT: 'ALGOUSD',
	QNTUSDT: 'QNTUSD', GRTUSDT: 'GRTUSD', THETAUSDT: 'THETAUSD', EGLDUSDT: 'EGLDUSD',
	RUNEUSDT: 'RUNEUSD', KASUSDT: 'KASUSD', FETUSDT: 'FETUSD', RENDERUSDT: 'RENDERUSD',
	GALAUSDT: 'GALAUSD', SANDUSDT: 'SANDUSD', MANAUSDT: 'MANAUSD', AXSUSDT: 'AXSUSD',
	AAVEUSDT: 'AAVEUSD', MKRUSDT: 'MKRUSD', LDOUSDT: 'LDOUSD', ENAUSDT: 'ENAUSD',
	PENDLEUSDT: 'PENDLEUSD', JUPUSDT: 'JUPUSD', PYTHUSDT: 'PYTHUSD', WLDUSDT: 'WLDUSD',
	PEPEUSDT: 'PEPEUSD', SHIBUSDT: 'SHIBUSD', BONKUSDT: 'BONKUSD', WIFUSDT: 'WIFUSD',
	FLOKIUSDT: 'FLOKIUSD', JASMYUSDT: 'JASMYUSD', ORDIUSDT: 'ORDIUSD', BLURUSDT: 'BLURUSD',
};

const SYMBOLS = Object.keys(SYMBOL_MAP);

export default async (req, res) => {
	const query = encodeURIComponent(JSON.stringify(SYMBOLS));
	// api.binance.com is geo-blocked in some regions — try fallbacks before
	// giving up. Never 500 the ticker: frontend keeps previous values and
	// overlays live websocket ticks, so a degraded 200 beats a 500 spam loop.
	const hosts = [
		'https://api.binance.com',
		'https://data-api.binance.vision',
		'https://api.binance.us',
	];
	let lastError = null;
	for (const host of hosts) {
		try {
			const upstream = await fetch(`${host}/api/v3/ticker/24hr?symbols=${query}`);
			if (!upstream.ok) {
				lastError = new Error(`binance ticker failed: ${upstream.status} ${upstream.statusText}`);
				continue;
			}
			const data = await upstream.json();
			const tickers = data.map((t) => ({
				symbol: SYMBOL_MAP[t.symbol] || t.symbol,
				price: Number(t.lastPrice),
				changePercent: Number(t.priceChangePercent),
				high: Number(t.highPrice),
				low: Number(t.lowPrice),
			}));
			return res.json({ tickers });
		} catch (err) {
			lastError = err;
		}
	}
	// Degraded but honest: no fake prices — frontend keeps prior values.
	return res.json({ tickers: [], degraded: true, error: String(lastError?.message || 'feed unavailable') });
};
