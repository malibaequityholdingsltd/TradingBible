import { Router } from 'express';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';
import { getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { vaultConfigured, encryptSecret, decryptSecret } from '../utils/vault.js';

// ── Broker connections: encrypted credential vault + live adapters ──
// Secrets are AES-256-GCM encrypted server-side and NEVER leave the API.
// Clients only ever see metadata (provider, label, status, health).

const router = Router();

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token).catch(() => null);
	return user?.id ? user : null;
}

// ── Provider registry (mirrors apps/web/src/lib/brokerProviders.js) ──
// NEVER collect broker passwords or scrape login pages.
// Each provider connects via its official API / OAuth / trading protocol
// or an approved MT5 bridge. officialWebsite vs clientLoginUrl vs
// developerApiUrl are stored separately — we never automate login pages.
export const PROVIDERS = {
	binance: {
		id: 'binance', name: 'Binance', category: 'crypto', auth: ['api_key'],
		methods: ['api_key'], officialWebsite: 'https://www.binance.com',
		clientLoginUrl: 'https://www.binance.com/en/login',
		developerApiUrl: 'https://developers.binance.com/docs/binance-spot-api-docs',
		docs: 'Binance → API Management → create read-only key (enable Spot reading, no withdrawals). Read-only by default.',
	},
	bybit: {
		id: 'bybit', name: 'Bybit', category: 'crypto', auth: ['api_key'],
		methods: ['api_key'], officialWebsite: 'https://www.bybit.com',
		clientLoginUrl: 'https://www.bybit.com/login',
		developerApiUrl: 'https://bybit-exchange.github.io/docs/v5/intro',
		docs: 'Bybit → API Management → create a read-only key (Read-Only permission, no withdrawals). Read-only by default.',
	},
	okx: {
		id: 'okx', name: 'OKX', category: 'crypto', auth: ['api_key', 'passphrase'],
		methods: ['api_key'], officialWebsite: 'https://www.okx.com',
		clientLoginUrl: 'https://www.okx.com/account/login',
		developerApiUrl: 'https://www.okx.com/docs-v5/en/',
		docs: 'OKX → API → create a read-only key (no trade, no withdraw) and note the passphrase. Key + secret + passphrase required.',
		needsPassphrase: true,
	},
	exness: {
		id: 'exness', name: 'Exness', category: 'forex_cfd', auth: ['api', 'mt5'],
		methods: ['bridge'], officialWebsite: 'https://www.exness.com/',
		clientLoginUrl: 'https://my.exness.com/accounts/sign-in',
		developerApiUrl: 'https://get.exness.help/hc/en-us/articles/27866287512476-Exness-API',
		docs: 'Official Exness API is region-limited; connect today via Exness MT5 through the bridge. Set MT_BRIDGE_URL + MT_BRIDGE_TOKEN. Read-only first.',
		status: 'needs_bridge',
	},
	hfm: {
		id: 'hfm', name: 'HFM', category: 'forex_cfd', auth: ['mt5', 'mt4'],
		methods: ['bridge'], officialWebsite: 'https://www.hfm.com/',
		clientLoginUrl: 'https://my.hfm.com/',
		developerApiUrl: 'https://www.hfm.com/int/en/trading-tools',
		docs: 'myHF client account ≠ MT4/MT5 trading account. Trading accounts connect via MT5 bridge. Set MT_BRIDGE_URL + MT_BRIDGE_TOKEN.',
		status: 'needs_bridge',
	},
	easymarkets: {
		id: 'easymarkets', name: 'easyMarkets', category: 'forex_cfd', auth: ['api_or_supported_platform'],
		methods: ['bridge'], officialWebsite: 'https://www.easy-markets.com/int/en-za/',
		clientLoginUrl: 'https://www.easy-markets.com/int/en-za/',
		developerApiUrl: 'https://www.easy-markets.com/int/en-za/',
		docs: 'Verify broker/platform API availability before implementation. Bridge path until direct API verified.',
		status: 'verify_first',
	},
	deriv: {
		id: 'deriv', name: 'Deriv', category: 'forex_cfd', auth: ['api_key'],
		methods: ['api_key'], officialWebsite: 'https://deriv.com/',
		clientLoginUrl: 'https://app.deriv.com/',
		developerApiUrl: 'https://developers.deriv.com/',
		docs: 'Read-only API token from Deriv account settings.',
		status: 'manual',
	},
	fxcm: {
		id: 'fxcm', name: 'FXCM', category: 'forex_cfd', auth: ['api'],
		methods: ['bridge'], officialWebsite: 'https://www.fxcm.com/',
		clientLoginUrl: 'https://www.fxcm.com/login/',
		developerApiUrl: 'https://www.fxcm.com/uk/algorithmic-trading/',
		docs: 'FXCM API / trading platforms. Bridge path until direct adapter lands.',
		status: 'needs_bridge',
	},
	pepperstone: {
		id: 'pepperstone', name: 'Pepperstone', category: 'forex_cfd', auth: ['mt5', 'ctrader'],
		methods: ['bridge'], officialWebsite: 'https://pepperstone.com/',
		clientLoginUrl: 'https://secure.pepperstone.com/',
		developerApiUrl: 'https://pepperstone.com/trading-platforms/',
		docs: 'MT4/MT5/cTrader via the bridge. Set MT_BRIDGE_URL + MT_BRIDGE_TOKEN.',
		status: 'needs_bridge',
	},
	icmarkets: {
		id: 'icmarkets', name: 'IC Markets', category: 'forex_cfd', auth: ['mt5', 'ctrader'],
		methods: ['bridge'], officialWebsite: 'https://www.icmarkets.com/',
		clientLoginUrl: 'https://secure.icmarkets.com/',
		developerApiUrl: 'https://www.icmarkets.com/blog/technology/',
		docs: 'MT4/MT5/cTrader via the bridge. Set MT_BRIDGE_URL + MT_BRIDGE_TOKEN.',
		status: 'needs_bridge',
	},
	xm: {
		id: 'xm', name: 'XM', category: 'forex_cfd', auth: ['mt5', 'mt4'],
		methods: ['bridge'], officialWebsite: 'https://www.xm.com/',
		clientLoginUrl: 'https://my.xm.com/login',
		developerApiUrl: 'https://www.xm.com/mt5',
		docs: 'MT4/MT5 accounts via the bridge. Set MT_BRIDGE_URL + MT_BRIDGE_TOKEN.',
		status: 'needs_bridge',
	},
	avatrade: {
		id: 'avatrade', name: 'AvaTrade', category: 'forex_cfd', auth: ['api'],
		methods: ['bridge'], officialWebsite: 'https://www.avatrade.com/',
		clientLoginUrl: 'https://www.avatrade.com/my-account/login',
		developerApiUrl: 'https://www.avatrade.com/trading-platforms/api-trading',
		docs: 'API / platform integrations. Bridge path until direct adapter lands.',
		status: 'needs_bridge',
	},
	ibkr: {
		id: 'ibkr', name: 'Interactive Brokers', category: 'stocks', auth: ['oauth', 'client_portal'],
		methods: ['oauth'], officialWebsite: 'https://www.interactivebrokers.com/',
		clientLoginUrl: 'https://www.interactivebrokers.com/sso/Login',
		developerApiUrl: 'https://www.interactivebrokers.com/docs/web-api/introduction',
		docs: 'Client Portal / Web API OAuth — register OAuth app before connecting. Granular trading permissions.',
		status: 'needs_app',
	},
	alpaca: {
		id: 'alpaca', name: 'Alpaca', category: 'stocks', auth: ['oauth2'],
		methods: ['oauth'], officialWebsite: 'https://alpaca.markets/',
		clientLoginUrl: 'https://app.alpaca.markets/login',
		developerApiUrl: 'https://docs.alpaca.markets/docs/using-oauth2-and-trading-api',
		docs: 'OAuth 2.0 — user authorizes on Alpaca, never types brokerage password here.',
		status: 'needs_app',
	},
	schwab: {
		id: 'schwab', name: 'Charles Schwab', category: 'stocks', auth: ['oauth2'],
		methods: ['oauth'], officialWebsite: 'https://www.schwab.com/',
		clientLoginUrl: 'https://client.schwab.com/Login/SignOn/CustomerCenterLoginView',
		developerApiUrl: 'https://developer.schwab.com/',
		docs: 'Schwab Trader API OAuth. Register app first.',
		status: 'needs_app',
	},
	tradier: {
		id: 'tradier', name: 'Tradier', category: 'stocks', auth: ['oauth2'],
		methods: ['oauth'], officialWebsite: 'https://tradier.com/',
		clientLoginUrl: 'https://dash.tradier.com/login',
		developerApiUrl: 'https://documentation.tradier.com/brokerage-api/overview',
		docs: 'Tradier Brokerage API OAuth. Register app first.',
		status: 'needs_app',
	},
	tastytrade: {
		id: 'tastytrade', name: 'tastytrade', category: 'stocks', auth: ['oauth2'],
		methods: ['oauth'], officialWebsite: 'https://tastytrade.com/',
		clientLoginUrl: 'https://manage.tastytrade.com/login',
		developerApiUrl: 'https://tastytrade.com/api/',
		docs: 'tastytrade API OAuth. Register app first.',
		status: 'needs_app',
	},
	tradestation: {
		id: 'tradestation', name: 'TradeStation', category: 'stocks', auth: ['oauth2'],
		methods: ['oauth'], officialWebsite: 'https://www.tradestation.com/',
		clientLoginUrl: 'https://clientcenter.tradestation.com/',
		developerApiUrl: 'https://api.tradestation.com/',
		docs: 'TradeStation WebAPI OAuth. Register app first.',
		status: 'needs_app',
	},
	coinbase: {
		id: 'coinbase', name: 'Coinbase', category: 'crypto', auth: ['oauth'],
		methods: ['oauth'], officialWebsite: 'https://www.coinbase.com/',
		clientLoginUrl: 'https://login.coinbase.com/signin',
		developerApiUrl: 'https://docs.cdp.coinbase.com/',
		docs: 'OAuth app registration required — connect here once credentials exist.',
		status: 'needs_app',
	},
};

const PROVIDER_ALIASES = {
	binance: 'binance', bybit: 'bybit', okx: 'okx', okex: 'okx',
	exness: 'exness', hfm: 'hfm',
	easymarkets: 'easymarkets', 'easy markets': 'easymarkets', 'easy-markets': 'easymarkets',
	deriv: 'deriv', 'deriv.com': 'deriv', fxcm: 'fxcm',
	pepperstone: 'pepperstone', 'ic markets': 'icmarkets', icmarkets: 'icmarkets',
	xm: 'xm', avatrade: 'avatrade', ava: 'avatrade',
	coinbase: 'coinbase', schwab: 'schwab', 'charles schwab': 'schwab',
	tradier: 'tradier', tastytrade: 'tastytrade', tasty: 'tastytrade',
	tradestation: 'tradestation',
	'interactive brokers': 'ibkr', ibkr: 'ibkr',
	alpaca: 'alpaca',
	ftmo: null, topstep: null, 'the5ers': null, fundednext: null, apex: null, e8: null,
	fundingpips: null, funderpro: null, alpha: null,
};

export function providerIdForAccount(account) {
	const name = String(account?.broker || account?.provider || '').toLowerCase();
	// Longest aliases first so 'ic markets' beats 'cmc'-style shorts.
	// Short aliases (<=3 chars) require exact or word-boundary match to avoid
	// false positives ('ig' in 'signal', 'xm' in 'max', 'cmc' in random text).
	const sorted = Object.entries(PROVIDER_ALIASES).sort((a, b) => b[0].length - a[0].length);
	for (const [alias, id] of sorted) {
		if (!id) continue;
		if (alias.length <= 3) {
			if (name === alias || new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`).test(name)) return id;
		} else if (name.includes(alias)) return id;
	}
	return null;
}

// ── Binance adapter (HMAC REST) ──
function binanceSign(query, secret) {
	return crypto.createHmac('sha256', secret).update(query).digest('hex');
}

async function binanceRequest(path, { key, secret, params = {}, method = 'GET' } = {}) {
	const qs = new URLSearchParams({ ...params, timestamp: Date.now(), recvWindow: 10000 });
	const query = qs.toString();
	const url = `https://api.binance.com${path}?${query}&signature=${binanceSign(query, secret)}`;
	const started = Date.now();
	const res = await fetch(url, { method, headers: { 'X-MBX-APIKEY': key } });
	const latency = Date.now() - started;
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error(data?.msg || `Binance request failed (${res.status})`);
		err.status = res.status;
		err.latencyMs = latency;
		throw err;
	}
	return { data, latencyMs: latency };
}

async function binanceTest(creds) {
	const { data, latencyMs } = await binanceRequest('/api/v3/account', creds);
	const balances = (data?.balances || []).filter((b) => Number(b.free) > 0 || Number(b.locked) > 0);
	return {
		ok: true,
		latencyMs,
		permissions: {
			account: true, positions: true, orders: true, history: true,
			trading: data?.canTrade === true,
		},
		assets: balances.length,
	};
}

async function binancePrices() {
	const res = await fetch('https://api.binance.com/api/v3/ticker/price');
	if (!res.ok) throw new Error(`price feed failed (${res.status})`);
	const list = await res.json().catch(() => []);
	const map = {};
	for (const t of list || []) map[t.symbol] = Number(t.price) || 0;
	return map;
}

function toAppSymbol(binanceSymbol) {
	if (binanceSymbol.endsWith('USDT')) return `${binanceSymbol.slice(0, -4)}USD`;
	return binanceSymbol;
}

async function binanceSync({ creds, ownerId, supabaseWrite }) {
	// Account + balances
	const { data: account, latencyMs } = await binanceRequest('/api/v3/account', creds);
	const prices = await binancePrices().catch(() => ({}));
	let usdValue = 0;
	const assets = [];
	for (const b of account?.balances || []) {
		const total = Number(b.free) + Number(b.locked);
		if (!(total > 0)) continue;
		const asset = String(b.asset);
		let usd = 0;
		if (['USDT', 'USDC', 'FDUSD', 'BUSD', 'USD'].includes(asset)) usd = total;
		else if (prices[`${asset}USDT`]) usd = total * prices[`${asset}USDT`];
		usdValue += usd;
		assets.push({ asset, total, usd });
	}
	// Recent spot fills → journal trades (dedupe by brokerTradeId)
	const symbols = [...new Set(assets.map((a) => a.asset)
		.filter((a) => !['USDT', 'USDC', 'FDUSD', 'BUSD', 'USD'].includes(a))
		.map((a) => `${a}USDT`))].slice(0, 10);
	const fills = [];
	for (const symbol of symbols) {
		try {
			const { data } = await binanceRequest('/sapi/v1/myTrades', { ...creds, params: { symbol, limit: 20 } });
			for (const f of data || []) fills.push({ ...f, symbol });
		} catch (err) {
			logger.warn('binance myTrades failed', symbol, String(err?.message || err));
		}
	}
	const trades = fills.map((f) => ({
		owner: ownerId,
		symbol: toAppSymbol(f.symbol),
		market: 'crypto',
		strategy: 'Broker import',
		broker: 'Binance',
		brokerTradeId: `binance:${f.id}`,
		side: f.isBuyer ? 'buy' : 'sell',
		quantity: Number(f.qty) || 0,
		price: Number(f.price) || 0,
		quoteQty: Number(f.quoteQty) || 0,
		pnl: 0,
		commission: Number(f.commission) || 0,
		tradeDate: new Date(f.time).toISOString(),
	})).filter((t) => t.quantity > 0);
	const added = await supabaseWrite(trades);
	return { balance: usdValue, assets: assets.length, trades: trades.length, added, latencyMs };
}

// ── Bybit adapter (v5 HMAC REST) ──
function bybitSign(timestamp, apiKey, recvWindow, queryString, secret) {
	return crypto.createHmac('sha256', secret).update(timestamp + apiKey + recvWindow + queryString).digest('hex');
}

async function bybitRequest(path, { key, secret, params = {} } = {}) {
	const timestamp = String(Date.now());
	const recvWindow = '10000';
	const qs = new URLSearchParams(params).toString();
	const url = `https://api.bybit.com${path}${qs ? `?${qs}` : ''}`;
	const started = Date.now();
	const res = await fetch(url, {
		headers: {
			'X-BAPI-API-KEY': key,
			'X-BAPI-TIMESTAMP': timestamp,
			'X-BAPI-SIGN': bybitSign(timestamp, key, recvWindow, qs, secret),
			'X-BAPI-RECV-WINDOW': recvWindow,
		},
	});
	const latency = Date.now() - started;
	const data = await res.json().catch(() => ({}));
	if (!res.ok || (data?.retCode !== undefined && data.retCode !== 0)) {
		const err = new Error(data?.retMsg || `Bybit request failed (${res.status})`);
		err.status = res.status;
		err.latencyMs = latency;
		throw err;
	}
	return { data, latencyMs: latency };
}

async function bybitTest(creds) {
	const { data, latencyMs } = await bybitRequest('/v5/account/wallet-balance', { ...creds, params: { accountType: 'UNIFIED' } });
	const coins = data?.result?.list?.[0]?.coin || [];
	const nonZero = coins.filter((c) => Number(c.equity) > 0);
	return {
		ok: true,
		latencyMs,
		permissions: { account: true, positions: true, orders: true, history: true, trading: false },
		assets: nonZero.length,
	};
}

async function bybitSync({ creds, ownerId, supabaseWrite }) {
	const { data, latencyMs } = await bybitRequest('/v5/account/wallet-balance', { ...creds, params: { accountType: 'UNIFIED' } });
	const info = data?.result?.list?.[0] || {};
	const balance = Number(info.totalEquity) || 0;
	const coins = (info.coin || []).filter((c) => Number(c.equity) > 0);
	let fills = [];
	try {
		const out = await bybitRequest('/v5/execution/list', { ...creds, params: { category: 'spot', limit: '50' } });
		fills = out.data?.result?.list || [];
	} catch (err) {
		logger.warn('bybit executions failed', String(err?.message || err));
	}
	const trades = fills.map((f) => ({
		owner: ownerId,
		symbol: toAppSymbol(String(f.symbol || '')),
		market: 'crypto',
		strategy: 'Broker import',
		broker: 'Bybit',
		brokerTradeId: `bybit:${f.execId}`,
		side: String(f.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy',
		quantity: Number(f.execQty) || 0,
		price: Number(f.execPrice) || 0,
		quoteQty: Number(f.execValue) || 0,
		pnl: 0,
		commission: Number(f.execFee) || 0,
		tradeDate: new Date(Number(f.execTime)).toISOString(),
	})).filter((t) => t.quantity > 0);
	const added = await supabaseWrite(trades);
	return { balance, assets: coins.length, trades: trades.length, added, latencyMs };
}

// ── OKX adapter (v5 HMAC REST, key + secret + passphrase) ──
function okxSign(timestamp, method, path, body, secret) {
	return crypto.createHmac('sha256', secret).update(timestamp + method + path + (body || '')).digest('base64');
}

async function okxRequest(path, { key, secret, passphrase, params = {}, method = 'GET', body = null } = {}) {
	if (!passphrase) throw new Error('OKX passphrase is required.');
	const qs = new URLSearchParams(params).toString();
	const fullPath = qs ? `${path}?${qs}` : path;
	const timestamp = new Date().toISOString();
	const bodyStr = body ? JSON.stringify(body) : '';
	const started = Date.now();
	const res = await fetch(`https://www.okx.com${fullPath}`, {
		method,
		headers: {
			'OK-ACCESS-KEY': key,
			'OK-ACCESS-SIGN': okxSign(timestamp, method, fullPath, bodyStr, secret),
			'OK-ACCESS-TIMESTAMP': timestamp,
			'OK-ACCESS-PASSPHRASE': passphrase,
			'Content-Type': 'application/json',
		},
		body: body ? bodyStr : undefined,
	});
	const latency = Date.now() - started;
	const data = await res.json().catch(() => ({}));
	if (!res.ok || data?.code !== '0') {
		const err = new Error(data?.msg || `OKX request failed (${res.status})`);
		err.status = res.status;
		err.latencyMs = latency;
		throw err;
	}
	return { data, latencyMs: latency };
}

function okxToAppSymbol(instId) {
	return toAppSymbol(String(instId || '').replace(/-/g, ''));
}

async function okxTest(creds) {
	const { data, latencyMs } = await okxRequest('/api/v5/account/balance', creds);
	const details = data?.data?.[0]?.details || [];
	return {
		ok: true,
		latencyMs,
		permissions: { account: true, positions: true, orders: true, history: true, trading: false },
		assets: details.filter((d) => Number(d.eq) > 0).length,
	};
}

async function okxSync({ creds, ownerId, supabaseWrite }) {
	const { data, latencyMs } = await okxRequest('/api/v5/account/balance', creds);
	const info = data?.data?.[0] || {};
	const balance = Number(info.totalEq) || 0;
	const assets = (info.details || []).filter((d) => Number(d.eq) > 0).length;
	let fills = [];
	try {
		const out = await okxRequest('/api/v5/trade/fills-history', { ...creds, params: { instType: 'SPOT', limit: '100' } });
		fills = out.data?.data || [];
	} catch (err) {
		logger.warn('okx fills-history failed', String(err?.message || err));
	}
	const trades = fills.map((f) => ({
		owner: ownerId,
		symbol: okxToAppSymbol(f.instId),
		market: 'crypto',
		strategy: 'Broker import',
		broker: 'OKX',
		brokerTradeId: `okx:${f.billId || f.tradeId}`,
		side: String(f.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy',
		quantity: Number(f.fillSz) || 0,
		price: Number(f.fillPx) || 0,
		quoteQty: (Number(f.fillSz) || 0) * (Number(f.fillPx) || 0),
		pnl: 0,
		commission: Math.abs(Number(f.fee) || 0),
		tradeDate: new Date(Number(f.ts)).toISOString(),
	})).filter((t) => t.quantity > 0);
	const added = await supabaseWrite(trades);
	return { balance, assets, trades: trades.length, added, latencyMs };
}

const ADAPTERS = {
	binance: { test: binanceTest, sync: binanceSync },
	bybit: { test: bybitTest, sync: bybitSync },
	okx: { test: okxTest, sync: okxSync },
};

// ── Supabase helpers (service role) ──
async function listCredentials(ownerId) {
	return supabaseRest(`/rest/v1/broker_credentials?owner=eq.${ownerId}&select=id,provider,label,auth_type,permissions,status,last_sync_at,last_error,latency_ms,created_at&order=created.desc`, {});
}

async function getCredential(ownerId, provider) {
	const rows = await supabaseRest(
		`/rest/v1/broker_credentials?owner=eq.${ownerId}&provider=eq.${provider}&select=*&order=created.desc&limit=1`, {},
	);
	return (rows || [])[0] || null;
}

// ── Routes ──
router.get('/providers', (req, res) => {
	res.json({ providers: Object.values(PROVIDERS) });
});

router.get('/health', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	let binance = { ok: false };
	try {
		const t = Date.now();
		const r = await fetch('https://api.binance.com/api/v3/ping');
		binance = { ok: r.ok, latencyMs: Date.now() - t };
	} catch { binance = { ok: false }; }
	res.json({ vault: vaultConfigured(), binance });
});

router.get('/connections', async (req, res, next) => {
	try {
		const user = await authedUser(req);
		if (!user) return res.status(401).json({ error: 'unauthorized' });
		const rows = await listCredentials(user.id).catch(() => []);
	 res.json({
		 connections: (rows || []).map((r) => ({
			 id: r.id, provider: r.provider, label: r.label,
			 status: r.status, permissions: r.permissions || [],
			 lastSyncAt: r.last_sync_at, lastError: r.last_error,
			 latencyMs: r.latency_ms, createdAt: r.created_at,
		 })),
	 });
	} catch (err) { next(err); }
});

router.post('/connect', async (req, res, next) => {
	try {
		const user = await authedUser(req);
		if (!user) return res.status(401).json({ error: 'unauthorized' });
		if (!vaultConfigured()) return res.status(503).json({ error: 'Credential vault is not configured (VAULT_ENCRYPTION_KEY).' });
		const { provider, label, apiKey, apiSecret, passphrase, permissions } = req.body || {};
		const def = PROVIDERS[provider];
		if (!def) return res.status(400).json({ error: 'Unknown provider.' });
		if (!def.methods.includes('api_key')) {
			return res.status(400).json({ error: `${def.name} needs ${def.methods.join('/')} — ${def.docs}` });
		}
		if (!apiKey || !apiSecret) return res.status(400).json({ error: 'API key and secret are required.' });
		if (def.needsPassphrase && !passphrase) return res.status(400).json({ error: 'API passphrase is required for OKX.' });
		const adapter = ADAPTERS[provider];
		if (!adapter) return res.status(400).json({ error: `${def.name} adapter is not implemented yet.` });
		// Live-test before storing anything.
		let probe;
		try {
			probe = await adapter.test({ key: String(apiKey), secret: String(apiSecret), passphrase: passphrase ? String(passphrase) : undefined });
		} catch (err) {
			return res.status(400).json({ error: `Connection test failed: ${err?.message || err}` });
		}
		const payload = JSON.stringify({ key: String(apiKey), secret: String(apiSecret), ...(passphrase ? { passphrase: String(passphrase) } : {}) });
		const created = await supabaseRest('/rest/v1/broker_credentials', {
			method: 'POST',
			body: {
				owner: user.id, provider, label: String(label || def.name).slice(0, 80),
				auth_type: 'api_key', secret_enc: encryptSecret(payload),
				secret_hint: `…${String(apiKey).slice(-4)}`,
				permissions: Array.isArray(permissions) && permissions.length ? permissions : ['read:account'],
				status: 'connected',
			},
		});
		const row = Array.isArray(created) ? created[0] : created;
	 res.json({
		 ok: true,
		 connection: row ? { id: row.id, provider, label: row.label, status: 'connected', permissions: row.permissions } : null,
		 probe: { latencyMs: probe.latencyMs, trading: probe.permissions.trading, assets: probe.assets },
	 });
	} catch (err) { next(err); }
});

router.post('/sync', async (req, res, next) => {
	try {
		const user = await authedUser(req);
		if (!user) return res.status(401).json({ error: 'unauthorized' });
	 const { provider } = req.body || {};
		const creds = provider
			? [await getCredential(user.id, provider)].filter(Boolean)
			: await listCredentials(user.id).catch(() => []);
		const results = [];
		for (const cred of creds) {
			const adapter = ADAPTERS[cred.provider];
			if (!adapter) {
				results.push({ provider: cred.provider, ok: false, error: 'No adapter for this provider yet.' });
				continue;
			}
			try {
				const secrets = JSON.parse(decryptSecret(cred.secret_enc));
				const summary = await adapter.sync({
					creds: secrets,
					ownerId: user.id,
					supabaseWrite: async (trades) => {
						if (!trades.length) return 0;
						const ids = [...new Set(trades.map((t) => t.brokerTradeId))];
						const existing = await supabaseRest(
							`/rest/v1/trades?owner=eq.${user.id}&brokerTradeId=in.(${ids.map(encodeURIComponent).join(',')})&select=brokerTradeId`, {},
						).catch(() => []);
						const seen = new Set((existing || []).map((r) => r.brokerTradeId));
						const fresh = trades.filter((t) => !seen.has(t.brokerTradeId));
						if (!fresh.length) return 0;
						await supabaseRest('/rest/v1/trades', { method: 'POST', body: fresh });
						return fresh.length;
					},
				});
				await supabaseRest(`/rest/v1/broker_credentials?id=eq.${cred.id}`, {
					method: 'PATCH',
					body: { status: 'connected', last_sync_at: new Date().toISOString(), last_error: null, latency_ms: summary.latencyMs ?? null },
				}).catch(() => {});
				const brokerName = PROVIDERS[cred.provider]?.name || cred.provider;
				const accountPatch = {
					accountRef: `API ••${(cred.secret_hint || '').slice(-4)}`,
					status: 'synced', balance: summary.balance, lastSync: new Date().toISOString(),
				};
				const existing = await supabaseRest(
					`/rest/v1/broker_accounts?owner=eq.${user.id}&broker=eq.${encodeURIComponent(brokerName)}&select=id&limit=1`, {},
				).catch(() => []);
				if (existing && existing[0]?.id) {
					await supabaseRest(`/rest/v1/broker_accounts?id=eq.${existing[0].id}`, { method: 'PATCH', body: accountPatch }).catch(() => {});
				} else {
					await supabaseRest('/rest/v1/broker_accounts', {
						method: 'POST',
						body: { owner: user.id, broker: brokerName, tag: cred.provider, accountKind: 'live', ...accountPatch },
					}).catch(() => {});
				}
				results.push({ provider: cred.provider, ok: true, ...summary });
			} catch (err) {
				const message = String(err?.message || err);
				await supabaseRest(`/rest/v1/broker_credentials?id=eq.${cred.id}`, {
					method: 'PATCH', body: { status: 'error', last_error: message.slice(0, 300) },
				}).catch(() => {});
				results.push({ provider: cred.provider, ok: false, error: message });
			}
		}
		res.json({ results });
	} catch (err) { next(err); }
});

router.delete('/connections/:id', async (req, res, next) => {
	try {
		const user = await authedUser(req);
		if (!user) return res.status(401).json({ error: 'unauthorized' });
		await supabaseRest(`/rest/v1/broker_credentials?id=eq.${req.params.id}&owner=eq.${user.id}`, { method: 'DELETE' });
		res.json({ ok: true });
	} catch (err) { next(err); }
});

export default router;
