// Series endpoints: /intraday, /daily, /weekly, /monthly.
// Single primary feed: Yahoo first for every symbol, Binance as automatic
// fallback for crypto, then Alpha Vantage (cached), then synthetic so the
// chart never renders empty.
import { avCandles, isRateLimited } from '../utils/alphaVantage.js';
import { yahooCandles } from '../utils/yahoo.js';
import { binanceSymbolFor, synthCandles } from './candles.js';

function makeHandler(defaultInterval) {
	return async (req, res) => {
		const symbol = String(req.query.symbol || 'BTCUSD').toUpperCase();
		const interval = String(req.query.interval || defaultInterval);
		let limit = parseInt(req.query.limit, 10) || 150;
		limit = Math.min(Math.max(limit, 20), 500);

		try {
			const yahoo = await yahooCandles(symbol, interval, limit).catch(() => null);
			if (yahoo && yahoo.length) {
				return res.json({ symbol, interval, source: 'yahoo', delayed: false, candles: yahoo });
			}
		} catch {
			// fall through to Binance / Alpha Vantage / synthetic
		}

		const bSymbol = binanceSymbolFor(symbol);
		if (bSymbol) {
			for (const host of ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api.binance.us']) {
				try {
					const upstream = await fetch(
						`${host}/api/v3/klines?symbol=${bSymbol}&interval=${interval}&limit=${limit}`,
					);
					if (!upstream.ok) continue;
					const rows = await upstream.json();
					const candles = rows.map((r) => ({
						time: r[0],
						open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5],
					}));
					if (candles.length) {
						return res.json({ symbol, interval, source: 'binance', delayed: false, candles });
					}
				} catch {
					// try next host, then fall through to Yahoo / synthetic
				}
			}
		}

		try {
			const yahoo = await yahooCandles(symbol, interval, limit).catch(() => null);
			if (yahoo && yahoo.length) {
				return res.json({ symbol, interval, source: 'yahoo', delayed: false, candles: yahoo });
			}
		} catch {
			// fall through to Alpha Vantage / synthetic
		}

		if (!isRateLimited()) {
			try {
				const candles = await avCandles(symbol, interval, limit);
				if (candles && candles.length) {
					return res.json({ symbol, interval, source: 'alphavantage', delayed: false, candles });
				}
			} catch {
				// fall through to synthetic
			}
		}

		return res.json({ symbol, interval, source: 'synthetic', delayed: true, candles: synthCandles(symbol, interval, limit) });
	};
}

export const intraday = makeHandler('5m');
export const daily = makeHandler('1d');
export const weekly = makeHandler('1w');
export const monthly = makeHandler('1M');