// Provider registry — how each broker / prop firm actually connects.
// NEVER collect broker passwords or scrape login pages.
// method: api_key (paste read-only keys, live-tested before storing),
//         oauth (official authorization flow on the provider site),
//         bridge (MT5 bridge required — MT_BRIDGE_URL + MT_BRIDGE_TOKEN),
//         verify_first (API availability must be verified before implementation).
// officialWebsite vs clientLogin vs apiDocs are stored separately —
// our app never automates the login page, it uses the official auth/API flow.
// propVia / integration: how prop-firm accounts reach us (most ride broker rails).
export const PROVIDERS = {
  binance: {
    id: 'binance', name: 'Binance', kind: 'Crypto', method: 'api_key', category: 'crypto',
    website: 'https://www.binance.com', clientLogin: 'https://www.binance.com/en/login',
    apiDocs: 'https://developers.binance.com/docs/binance-spot-api-docs', color: '#f0b90b',
    blurb: 'Spot balances + fills synced live. Read-only keys, no withdrawals.',
    setup: 'Binance → API Management → create a read-only Spot key (no withdrawals). Read-only by default.',
  },
  bybit: {
    id: 'bybit', name: 'Bybit', kind: 'Crypto', method: 'api_key', category: 'crypto',
    website: 'https://www.bybit.com/', clientLogin: 'https://www.bybit.com/login',
    apiDocs: 'https://bybit-exchange.github.io/docs/v5/intro', color: '#f7a600',
    blurb: 'Spot balances + fills synced live. Read-only keys, no withdrawals.',
    setup: 'Bybit → API Management → create a key with Read-Only permission (no withdrawals).',
  },
  okx: {
    id: 'okx', name: 'OKX', kind: 'Crypto', method: 'api_key', category: 'crypto',
    needsPassphrase: true,
    website: 'https://www.okx.com/', clientLogin: 'https://www.okx.com/account/login',
    apiDocs: 'https://www.okx.com/docs-v5/en/', color: '#0e7490',
    blurb: 'Balances + fills synced live. Read-only key + passphrase, no trading.',
    setup: 'OKX → API → create a read-only key (no trade, no withdraw) and save the passphrase. All three are required.',
  },
  kraken: {
    id: 'kraken', name: 'Kraken', kind: 'Crypto', method: 'api_key', category: 'crypto',
    website: 'https://www.kraken.com/', clientLogin: 'https://pro.kraken.com/login',
    apiDocs: 'https://docs.kraken.com/rest/', color: '#3b7bf0',
    blurb: 'Spot balances + fills synced live. Read-only keys, no withdrawals.',
    setup: 'Kraken → Security → API → Generate New Key with read-only permissions.',
  },
  kucoin: {
    id: 'kucoin', name: 'KuCoin', kind: 'Crypto', method: 'api_key', category: 'crypto',
    needsPassphrase: true,
    website: 'https://www.kucoin.com/', clientLogin: 'https://www.kucoin.com/login',
    apiDocs: 'https://www.kucoin.com/docs/', color: '#f7a600',
    blurb: 'Spot + futures balances & fills. Read-only key + passphrase required.',
    setup: 'KuCoin → API Management → create read-only key (no trade/withdraw) and save passphrase.',
  },
  tradingview: {
    id: 'tradingview', name: 'TradingView', kind: 'Multi-asset', method: 'oauth', category: 'multi',
    website: 'https://www.tradingview.com/', clientLogin: 'https://www.tradingview.com/signin/',
    apiDocs: 'https://www.tradingview.com/broker-connections/', color: '#2962FF',
    blurb: 'OAuth broker connections via TradingView.',
    setup: 'Needs an OAuth app registration first.',
  },
  exness: {
    id: 'exness', name: 'Exness', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.exness.com/', clientLogin: 'https://my.exness.com/accounts/sign-in',
    apiDocs: 'https://get.exness.help/hc/en-us/articles/27866287512476-Exness-API', color: '#ffcf33',
    blurb: 'Official Exness API is region-limited — connect today via MT5 bridge.',
    setup: 'Use your Exness MT5 trading login (not the Personal Area password) once bridge sync opens.',
  },
  hfm: {
    id: 'hfm', name: 'HFM', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.hfm.com/', clientLogin: 'https://my.hfm.com/',
    apiDocs: 'https://www.hfm.com/int/en/trading-tools', color: '#e0533d',
    blurb: 'Trading accounts live on MT4/MT5 — connect through the bridge.',
    setup: 'Your myHF client-area login is different from the MT4/MT5 trading login — use the trading login (investor/read-only where supported).',
  },
  easymarkets: {
    id: 'easymarkets', name: 'easyMarkets', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.easy-markets.com/int/en-za/', clientLogin: 'https://www.easy-markets.com/int/en-za/',
    apiDocs: 'https://www.easy-markets.com/int/en-za/', color: '#3b82f6',
    blurb: 'API availability must be verified before implementation.',
    setup: 'Connection path under review — available once its supported method is confirmed.',
  },
  deriv: {
    id: 'deriv', name: 'Deriv', kind: 'Forex / CFD', method: 'api_key', category: 'forex_cfd',
    website: 'https://deriv.com/', clientLogin: 'https://app.deriv.com/',
    apiDocs: 'https://developers.deriv.com/', color: '#ff444f',
    blurb: 'API token sync (paste a read-only token).',
    setup: 'Create a read-only API token in Deriv account settings, then paste it here.',
  },
  fxcm: {
    id: 'fxcm', name: 'FXCM', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.fxcm.com/', clientLogin: 'https://www.fxcm.com/login/',
    apiDocs: 'https://www.fxcm.com/uk/algorithmic-trading/', color: '#7c5cff',
    blurb: 'FXCM API / trading platforms.',
    setup: 'Use your FXCM MT trading login once bridge sync opens.',
  },
  xm: {
    id: 'xm', name: 'XM', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.xm.com/', clientLogin: 'https://my.xm.com/login',
    apiDocs: 'https://www.xm.com/mt5', color: '#5b8def',
    blurb: 'MT4/MT5 accounts via the bridge.',
    setup: 'Your XM member-area login is different from the MT4/MT5 trading login — use the trading login.',
  },
  pepperstone: {
    id: 'pepperstone', name: 'Pepperstone', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://pepperstone.com/', clientLogin: 'https://secure.pepperstone.com/',
    apiDocs: 'https://pepperstone.com/trading-platforms/', color: '#4a90d9',
    blurb: 'MT4/MT5/cTrader via the bridge.',
    setup: 'Use your Pepperstone MT trading login, not the Secure Client Area login.',
  },
  icmarkets: {
    id: 'icmarkets', name: 'IC Markets', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.icmarkets.com/', clientLogin: 'https://secure.icmarkets.com/',
    apiDocs: 'https://www.icmarkets.com/blog/technology/', color: '#34d399',
    blurb: 'MT4/MT5/cTrader via the bridge.',
    setup: 'Use your IC Markets MT trading login, not the Secure Client Area login.',
  },
  avatrade: {
    id: 'avatrade', name: 'AvaTrade', kind: 'Forex / CFD', method: 'bridge', category: 'forex_cfd',
    website: 'https://www.avatrade.com/', clientLogin: 'https://www.avatrade.com/my-account/login',
    apiDocs: 'https://www.avatrade.com/trading-platforms/api-trading', color: '#f7a600',
    blurb: 'API / platform integrations.',
    setup: 'Use your AvaTrade MT trading login once bridge sync opens.',
  },
  ibkr: {
    id: 'ibkr', name: 'Interactive Brokers', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://www.interactivebrokers.com/', clientLogin: 'https://www.interactivebrokers.com/sso/Login',
    apiDocs: 'https://www.interactivebrokers.com/docs/web-api/introduction', color: '#d4af37',
    blurb: 'Client Portal / Web API OAuth — portfolio, positions, executions.',
    setup: 'Needs an OAuth app registration first. Granular trading permissions; read-only by default.',
  },
  alpaca: {
    id: 'alpaca', name: 'Alpaca', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://alpaca.markets/', clientLogin: 'https://app.alpaca.markets/login',
    apiDocs: 'https://docs.alpaca.markets/docs/using-oauth2-and-trading-api', color: '#7c5cff',
    blurb: 'OAuth 2.0 sign-in — approve on Alpaca, never type brokerage password here.',
    setup: 'Needs an OAuth app registration first. User authorizes on Alpaca.',
  },
  schwab: {
    id: 'schwab', name: 'Charles Schwab', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://www.schwab.com/', clientLogin: 'https://client.schwab.com/Login/SignOn/CustomerCenterLoginView',
    apiDocs: 'https://developer.schwab.com/', color: '#3b82f6',
    blurb: 'Schwab Trader API OAuth.',
    setup: 'Needs an OAuth app registration first.',
  },
  tradier: {
    id: 'tradier', name: 'Tradier', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://tradier.com/', clientLogin: 'https://dash.tradier.com/login',
    apiDocs: 'https://documentation.tradier.com/brokerage-api/overview', color: '#0ab28a',
    blurb: 'Tradier Brokerage API.',
    setup: 'Needs an OAuth app registration first.',
  },
  tastytrade: {
    id: 'tastytrade', name: 'tastytrade', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://tastytrade.com/', clientLogin: 'https://manage.tastytrade.com/login',
    apiDocs: 'https://tastytrade.com/api/', color: '#e0533d',
    blurb: 'tastytrade API.',
    setup: 'Needs an OAuth app registration first.',
  },
  tradestation: {
    id: 'tradestation', name: 'TradeStation', kind: 'Stocks', method: 'oauth', category: 'stocks',
    website: 'https://www.tradestation.com/', clientLogin: 'https://clientcenter.tradestation.com/',
    apiDocs: 'https://api.tradestation.com/', color: '#5b8def',
    blurb: 'TradeStation WebAPI.',
    setup: 'Needs an OAuth app registration first.',
  },
  coinbase: {
    id: 'coinbase', name: 'Coinbase', kind: 'Crypto', method: 'oauth', category: 'crypto',
    website: 'https://www.coinbase.com/', clientLogin: 'https://login.coinbase.com/signin',
    apiDocs: 'https://docs.cdp.coinbase.com/', color: '#0052ff',
    blurb: 'OAuth sign-in — never type exchange credentials here.',
    setup: 'Needs an OAuth app registration first. Until then this provider stays unavailable.',
  },
};

export const PROP_FIRMS = [
  { id: 'tbfunded', name: 'TradingBible Funded', via: 'Native', method: 'native', integration: 'NATIVE', website: '/app/funded', clientLogin: '/app/challenges', color: '#d4af37', blurb: 'Our own evaluations — pass on real fills, trade firm capital.' },
];

export const PROVIDER_LIST = Object.values(PROVIDERS);

// Official brand-logo lookup domains (logo resolved via Clearbit, then Google
// favicons, then initials fallback in <ProviderLogo /> — no hotlinked assets
// bundled, nothing to maintain when brands refresh their marks).
const LOGO_DOMAINS = {
  binance: 'binance.com', bybit: 'bybit.com', okx: 'okx.com', exness: 'exness.com', hfm: 'hfm.com',
  easymarkets: 'easy-markets.com',
  deriv: 'deriv.com', fxcm: 'fxcm.com',
  pepperstone: 'pepperstone.com', icmarkets: 'icmarkets.com', xm: 'xm.com',
  avatrade: 'avatrade.com', ibkr: 'interactivebrokers.com', alpaca: 'alpaca.markets',
  schwab: 'schwab.com', tradier: 'tradier.com', tastytrade: 'tastytrade.com',
  tradestation: 'tradestation.com', coinbase: 'coinbase.com',
};
for (const [id, def] of Object.entries(PROVIDERS)) {
  if (LOGO_DOMAINS[id]) def.logoDomain = LOGO_DOMAINS[id];
}
for (const f of PROP_FIRMS) {
  if (LOGO_DOMAINS[f.id]) f.logoDomain = LOGO_DOMAINS[f.id];
}
