// Live market data via Binance public API (no key required).
const SYMBOL_MAP = {
	BTCUSDT: 'BTCUSD',
	ETHUSDT: 'ETHUSD',
	SOLUSDT: 'SOLUSD',
	BNBUSDT: 'BNBUSD',
	XRPUSDT: 'XRPUSD',
	ADAUSDT: 'ADAUSD',
	DOGEUSDT: 'DOGEUSD',
	AVAXUSDT: 'AVAXUSD',
};

const SYMBOLS = Object.keys(SYMBOL_MAP);

export default async (req, res) => {
	const query = encodeURIComponent(JSON.stringify(SYMBOLS));
	const upstream = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${query}`);

	if (!upstream.ok) {
		throw new Error(`binance ticker failed: ${upstream.status} ${upstream.statusText}`);
	}

	const data = await upstream.json();

	const tickers = data.map((t) => ({
		symbol: SYMBOL_MAP[t.symbol] || t.symbol,
		price: Number(t.lastPrice),
		changePercent: Number(t.priceChangePercent),
		high: Number(t.highPrice),
		low: Number(t.lowPrice),
	}));

	res.json({ tickers });
};
