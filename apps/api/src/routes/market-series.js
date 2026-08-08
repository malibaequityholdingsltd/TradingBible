// Alpha Vantage series endpoints: /intraday, /daily, /weekly, /monthly.
// Each returns real OHLCV candles (cached) with a graceful fallback flag when
// the free key (25 req/day) is throttled or the symbol is unsupported.
import { avCandles, isRateLimited } from '../utils/alphaVantage.js';

function makeHandler(defaultInterval) {
	return async (req, res) => {
		const symbol = String(req.query.symbol || 'AAPL').toUpperCase();
		const interval = String(req.query.interval || defaultInterval);
		let limit = parseInt(req.query.limit, 10) || 150;
		limit = Math.min(Math.max(limit, 20), 500);

		if (isRateLimited()) {
			return res.json({ symbol, interval, source: 'alphavantage', delayed: true, candles: [] });
		}

		const candles = await avCandles(symbol, interval, limit);
		if (!candles || !candles.length) {
			return res.json({ symbol, interval, source: 'alphavantage', delayed: true, candles: [] });
		}
		return res.json({ symbol, interval, source: 'alphavantage', delayed: false, candles });
	};
}

export const intraday = makeHandler('5m');
export const daily = makeHandler('1d');
export const weekly = makeHandler('1w');
export const monthly = makeHandler('1M');
