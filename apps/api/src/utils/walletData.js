// Read-only balance lookups for tracked wallets. TradingBible never holds
// funds — these helpers only read public blockchain state (no API keys):
// Bitcoin → mempool.space; EVM native + USDC/USDT → public RPCs (eth_call);
// Solana → public RPC. USD rates come from Binance (30s cache).
import logger from './logger.js';

export const NETWORKS = {
	bitcoin: { chain: 'btc', label: 'Bitcoin', currency: 'BTC', priceSymbol: 'BTCUSD', decimals: 8 },
	ethereum: { chain: 'evm', label: 'Ethereum', currency: 'ETH', priceSymbol: 'ETHUSD', decimals: 18, rpc: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'] },
	'usdc-ethereum': { chain: 'evm', label: 'USDC · Ethereum', currency: 'USDC', decimals: 6, rpc: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'], token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
	'usdt-ethereum': { chain: 'evm', label: 'USDT · Ethereum', currency: 'USDT', decimals: 6, rpc: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'], token: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
	'usdc-base': { chain: 'evm', label: 'USDC · Base', currency: 'USDC', decimals: 6, rpc: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'], token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
	'usdc-polygon': { chain: 'evm', label: 'USDC · Polygon', currency: 'USDC', decimals: 6, rpc: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'], token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
	solana: { chain: 'sol', label: 'Solana', currency: 'SOL', priceSymbol: 'SOLUSD', decimals: 9, rpc: ['https://api.mainnet-beta.solana.com', 'https://solana-rpc.publicnode.com'] },
};

export function isValidAddress(network, address) {
	const a = String(address || '').trim();
	switch (network) {
		case 'bitcoin':
			return /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a);
		case 'ethereum':
		case 'usdc-ethereum':
		case 'usdt-ethereum':
		case 'usdc-base':
		case 'usdc-polygon':
			return /^0x[a-fA-F0-9]{40}$/.test(a);
		case 'solana':
			return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
		default:
			return false;
	}
}

async function rpcCall(rpcs, body) {
	let lastErr;
	for (const rpc of rpcs) {
		try {
			const res = await fetch(rpc, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }),
				signal: AbortSignal.timeout(10000),
			});
			if (!res.ok) throw new Error(`http ${res.status}`);
			const data = await res.json();
			if (data.error) throw new Error(data.error.message || 'rpc error');
			return data.result;
		} catch (err) {
			lastErr = err;
		}
	}
	throw lastErr || new Error('all RPCs failed');
}

function toNumber(hex) {
	return Number(BigInt(hex));
}

// Balance cache (10s) — public endpoints rate-limit aggressively.
const balanceCache = new Map();
const PRICE_TTL = 30 * 1000;
const BALANCE_TTL = 10 * 1000;
let prices = {};
let pricesAt = 0;

async function usdRates() {
	if (Date.now() - pricesAt < PRICE_TTL) return prices;
	const next = {};
	const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
	const q = encodeURIComponent(JSON.stringify(symbols));
	try {
		const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${q}`, { signal: AbortSignal.timeout(8000) });
		if (res.ok) {
			const rows = await res.json();
			for (const r of rows) next[r.symbol] = Number(r.price) || 0;
		}
	} catch (err) {
		logger.error('binance rates failed', err.message);
	}
	// Fallback: CoinGecko (keyless, 5-10s TTL rates are fine at 30s cache).
	if (!next.BTCUSDT) {
		try {
			const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd', { signal: AbortSignal.timeout(8000) });
			if (res.ok) {
				const d = await res.json();
				next.BTCUSDT = d.bitcoin?.usd || 0;
				next.ETHUSDT = d.ethereum?.usd || 0;
				next.SOLUSDT = d.solana?.usd || 0;
			}
		} catch (err) {
			logger.error('coingecko rates failed', err.message);
		}
	}
	if (Object.keys(next).length) {
		prices = next;
		pricesAt = Date.now();
	}
	return prices;
}

export async function getBalance(network, address) {
	const conf = NETWORKS[network];
	if (!conf) return { ok: false, error: 'unsupported network' };

	const cacheKey = `${network}:${address}`;
	const cached = balanceCache.get(cacheKey);
	if (cached && cached.expires > Date.now()) return cached.value;

	let result;
	try {
		if (conf.chain === 'btc') {
			const res = await fetch(`https://mempool.space/api/address/${address}`, { signal: AbortSignal.timeout(12000) }).catch(() => null);
			if (!res?.ok) {
				const alt = await fetch(`https://blockstream.info/api/address/${address}`, { signal: AbortSignal.timeout(12000) });
				if (!alt.ok) throw new Error(`btc api http ${alt.status}`);
				const d = await alt.json();
				const c = d.chain_stats || {};
				const m = d.mempool_stats || {};
				result = { ok: true, amount: ((c.funded_txo_sum || 0) - (c.spent_txo_sum || 0) + (m.funded_txo_sum || 0) - (m.spent_txo_sum || 0)) / 1e8 };
			} else {
				const d = await res.json();
				const confirmed = (d.chain_stats?.funded_txo_sum || 0) - (d.chain_stats?.spent_txo_sum || 0);
				const unconfirmed = (d.mempool_stats?.funded_txo_sum || 0) - (d.mempool_stats?.spent_txo_sum || 0);
				result = { ok: true, amount: (confirmed + unconfirmed) / 1e8 };
			}
		} else if (conf.chain === 'sol') {
			const res = await rpcCall(conf.rpc, { method: 'getBalance', params: [address] });
			result = { ok: true, amount: toNumber(res.value) / 10 ** conf.decimals };
		} else if (conf.token) {
			const padded = address.toLowerCase().slice(2).padStart(64, '0');
			const res = await rpcCall(conf.rpc, {
				method: 'eth_call',
				params: [{ to: conf.token, data: `0x70a08231000000000000000000000000${padded}` }, 'latest'],
			});
			result = { ok: true, amount: toNumber(res) / 10 ** conf.decimals };
		} else {
			const res = await rpcCall(conf.rpc, { method: 'eth_getBalance', params: [address, 'latest'] });
			result = { ok: true, amount: toNumber(res) / 10 ** conf.decimals };
		}
	} catch (err) {
		logger.error(`wallet balance failed ${network} ${address}`, err.message);
		result = { ok: false, error: err.message };
	}

	balanceCache.set(cacheKey, { value: result, expires: Date.now() + BALANCE_TTL });
	return result;
}

// Attach a USD value to a balance (stablecoins = 1 USD).
export async function withUsdValue(balance, conf) {
	if (!balance.ok) return { ...balance, usdValue: 0 };
	if (['USDC', 'USDT'].includes(conf.currency)) {
		return { ...balance, usdValue: balance.amount };
	}
	const rates = await usdRates();
	const rate = rates[`${conf.priceSymbol.replace(/USD$/, 'USDT')}`] || 0;
	return { ...balance, usdValue: balance.amount * rate };
}

export const NETWORKS_LIST = Object.entries(NETWORKS).map(([id, n]) => ({ id, ...n }));
