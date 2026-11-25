// Order-flow proxy: recent Binance depth + aggregated trades.
//
// Browsers in some regions cannot open Binance WebSockets (the terminal's
// preferred 100ms feed), so the desk falls back to this short-poll endpoint.
// It is read-only market data and never touches accounts or execution.

import { binanceSymbolFor } from './candles.js';
import { fetchTimeout } from '../utils/fetchTimeout.js';

// data-api is the reliable public mirror for market data. The main API host
// is geo-blocked in some regions and binance.us rejects non-US locations, so
// try the mirror first and keep short timeouts for the fallbacks.
const HOSTS = [
	{ base: 'https://data-api.binance.vision', timeoutMs: 9000 },
	{ base: 'https://api.binance.com', timeoutMs: 2500 },
	{ base: 'https://api.binance.us', timeoutMs: 2500 },
];

const CACHE_MS = 1200;
const cache = new Map();

function mapLevels(levels) {
	return (Array.isArray(levels) ? levels : [])
		.map(([price, qty]) => [Number(price), Number(qty)])
		.filter(([price, qty]) => Number.isFinite(price) && Number.isFinite(qty) && price > 0 && qty > 0);
}

function mapTrades(rows) {
	return (Array.isArray(rows) ? rows : [])
		.map((row) => ({
			id: Number(row.a),
			price: Number(row.p),
			qty: Number(row.q),
			side: row.m ? 'sell' : 'buy',
			ts: Number(row.T) || Date.now(),
		}))
		.filter((trade) => Number.isFinite(trade.id) && Number.isFinite(trade.price) && Number.isFinite(trade.qty));
}

async function binanceGet(path) {
	let lastError = null;
	for (const host of HOSTS) {
		try {
			const res = await fetchTimeout(`${host.base}${path}`, { timeoutMs: host.timeoutMs });
			if (!res.ok) throw new Error(`http ${res.status}`);
			return await res.json();
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError || new Error('all binance hosts failed');
}

export default async (req, res) => {
	const symbol = String(req.query.symbol || 'BTCUSD').toUpperCase();
	// XAUUSD maps to PAXG for candles, but PAXG's book is not spot gold.
	// Do not relabel a token book as XAU order flow.
	const pair = symbol === 'XAUUSD' ? null : binanceSymbolFor(symbol);
	if (!pair) {
		return res.status(422).json({
			error: 'order flow needs a crypto market with a public Binance book',
			symbol,
		});
	}

	const hit = cache.get(symbol);
	if (hit && Date.now() - hit.at < CACHE_MS) return res.json(hit.payload);

	try {
		// Sequential: parallel depth + trades doubled the requests to the
		// mirror and made the first (uncached) poll intermittently time out.
		const depth = await binanceGet(`/api/v3/depth?symbol=${pair}&limit=20`);
		const trades = await binanceGet(`/api/v3/aggTrades?symbol=${pair}&limit=200`);
		const bids = mapLevels(depth?.bids);
		const asks = mapLevels(depth?.asks);
		if (!bids.length || !asks.length) throw new Error('empty book');

		const payload = {
			symbol,
			pair,
			source: 'binance',
			ts: Date.now(),
			depth: { bids, asks, ts: Date.now() },
			trades: mapTrades(trades),
		};
		cache.set(symbol, { at: Date.now(), payload });
		if (cache.size > 100) cache.delete(cache.keys().next().value);
		return res.json(payload);
	} catch {
		return res.status(503).json({ error: 'order-flow upstream unavailable', symbol });
	}
};
