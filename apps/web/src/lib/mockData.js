// Static reference constants for TradingBible (brand logos, plan definitions,
// market/experience/goal option lists, supported brokers & prop firms, money
// formatters). Contains NO market, account, or trade data — all live data
// comes from Supabase and the live Binance/Finnhub/Alpha Vantage feeds.

import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

// Brand logo variants supplied for the pricing tiers.
export const LOGOS = {
  goldWhite: TRADINGBIBLE_LOGO,
  goldBlack: TRADINGBIBLE_LOGO,
  whiteBlack: TRADINGBIBLE_LOGO,
};

export const PLANS = [
  { id: 'pro', name: 'Pro', price: 19.99, period: 'mo', tagline: 'For serious retail traders', logo: LOGOS.goldBlack,
    features: ['Unlimited trades', 'Full analytics suite', 'SI trade scoring', '5 broker accounts', 'Trading calendar'], cta: 'Choose Pro' },
  { id: 'elite', name: 'Elite SI', price: 49.99, period: 'mo', highlight: true, tagline: 'SI-first performance', logo: LOGOS.goldWhite,
    features: ['Everything in Pro', 'SI Trading Coach chat', 'Daily & weekly SI reports', 'Mistake detection', '15 broker accounts', 'Priority SI queue'], cta: 'Choose Elite SI' },
  { id: 'professional', name: 'Professional', price: 99, period: 'mo', tagline: 'For funds & prop desks', logo: LOGOS.goldBlack,
    features: ['Everything in Elite', 'Unlimited broker accounts', 'Team seats', 'API & webhooks', 'White-label branding', 'White-glove onboarding', 'Dedicated success manager'], cta: 'Choose Professional' },
];

const PLAN_I18N_KEY = { pro: 'pro', elite: 'elite', professional: 'prof' };

// Localized view of a plan: names, taglines, periods, CTAs and feature lists
// come from the i18n dictionary so pricing renders in the active language.
// Pass the `t` function from useI18n().
export function translatePlan(t, plan) {
  const k = (plan.id === 'trial' ? 'pro' : (PLAN_I18N_KEY[plan.id] || plan.id));
  const features = [];
  for (let i = 1; i <= 6; i += 1) {
    const key = `plan.${k}.f${i}`;
    const v = t(key);
    if (!v || v === key) break;
    features.push(v);
  }
  return {
    ...plan,
    name: t(`plan.${k}.name`),
    tagline: t(`plan.${k}.tag`),
    period: t(`plan.${k}.period`),
    cta: t(`plan.${k}.cta`),
    features: features.length ? features : plan.features,
  };
}

export const MARKETS = ['Forex', 'Stocks', 'Crypto', 'Futures'];
export const EXPERIENCE = ['Beginner', 'Intermediate', 'Professional'];
export const GOALS = ['Discipline', 'Risk management', 'Performance improvement'];

// =============================================================================
// BROKER & PROP FIRM REGISTRY — Single source of truth with local logos
// DEMO ACCOUNTS BLOCKED — Only live/funded accounts can connect
// =============================================================================

export const CONNECTION_TYPES = {
  API_KEY: 'api_key',
  OAUTH: 'oauth',
  MT5_BRIDGE: 'mt5_bridge',
  ACCOUNT_LOGIN: 'account_login',
  PASSPHRASE: 'passphrase',
};

export const BROKER_KINDS = {
  LIVE: 'live',
  PROP: 'prop',
};

// Adapter interface for broker connections
export function createAdapter(config) {
  const { type, ...adapterConfig } = config;
  return {
    type,
    connect: async (credentials) => {
      switch (type) {
        case CONNECTION_TYPES.API_KEY:
          return connectApiKey(adapterConfig, credentials);
        case CONNECTION_TYPES.OAUTH:
          return connectOAuth(adapterConfig, credentials);
        case CONNECTION_TYPES.MT5_BRIDGE:
          return connectMt5Bridge(adapterConfig, credentials);
        case CONNECTION_TYPES.ACCOUNT_LOGIN:
          return connectAccountLogin(adapterConfig, credentials);
        case CONNECTION_TYPES.PASSPHRASE:
          return connectPassphrase(adapterConfig, credentials);
        default:
          throw new Error(`Unknown connection type: ${type}`);
      }
    },
    validate: (credentials) => validateCredentials(type, credentials),
  };
}

async function connectApiKey(config, credentials) {
  const { apiKey, apiSecret, passphrase } = credentials;
  if (!apiKey || !apiSecret) throw new Error('API key and secret required');
  return { success: true, method: 'api_key', passphrase: passphrase || null };
}

async function connectOAuth(config, credentials) {
  return { success: true, method: 'oauth', redirectUrl: config.authUrl };
}

async function connectMt5Bridge(config, credentials) {
  const { accountNumber, password, server, passphrase } = credentials;
  if (!accountNumber || !password || !server) throw new Error('MT5 account number, password, and server required');
  return { success: true, method: 'mt5_bridge', passphrase: passphrase || null };
}

async function connectAccountLogin(config, credentials) {
  const { email, password, passphrase } = credentials;
  if (!email || !password) throw new Error('Email and password required');
  return { success: true, method: 'account_login', passphrase: passphrase || null };
}

async function connectPassphrase(config, credentials) {
  const { passphrase } = credentials;
  if (!passphrase) throw new Error('Passphrase required');
  return { success: true, method: 'passphrase' };
}

function validateCredentials(type, credentials) {
  switch (type) {
    case CONNECTION_TYPES.API_KEY:
      return !!(credentials.apiKey && credentials.apiSecret);
    case CONNECTION_TYPES.OAUTH:
      return true;
    case CONNECTION_TYPES.MT5_BRIDGE:
      return !!(credentials.accountNumber && credentials.password && credentials.server);
    case CONNECTION_TYPES.ACCOUNT_LOGIN:
      return !!(credentials.email && credentials.password);
    case CONNECTION_TYPES.PASSPHRASE:
      return !!credentials.passphrase;
    default:
      return false;
  }
}

export const BROKER_REGISTRY = [
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    tag: 'IBKR',
    kind: 'Stocks / Futures',
    color: '#d4af37',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['IBKR', 'Interactive Brokers', 'InteractiveBrokers'],
    authType: 'OAuth / Client Portal',
    authUrl: 'https://www.interactivebrokers.com/sso/Login',
    adapterConfig: { clientIdEnv: 'IBKR_CLIENT_ID', clientSecretEnv: 'IBKR_CLIENT_SECRET' },
    logo: '/logos/brokers/interactivebrokers.svg',
    envVars: ['IBKR_CLIENT_ID', 'IBKR_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'binance',
    name: 'Binance',
    tag: 'BNB',
    kind: 'Crypto',
    color: '#f0b90b',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['Binance', 'BNB'],
    authType: 'API key',
    authUrl: 'https://www.binance.com/en/my/settings/api-management',
    adapterConfig: { apiKeyEnv: 'BINANCE_API_KEY', apiSecretEnv: 'BINANCE_API_SECRET' },
    logo: '/logos/brokers/binance.svg',
    envVars: ['BINANCE_API_KEY', 'BINANCE_API_SECRET'],
    status: 'implemented',
  },
  {
    id: 'bybit',
    name: 'Bybit',
    tag: 'BYB',
    kind: 'Crypto',
    color: '#f7a600',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['Bybit', 'BYB'],
    authType: 'API key',
    authUrl: 'https://www.bybit.com/app/user/api-management',
    adapterConfig: { apiKeyEnv: 'BYBIT_API_KEY', apiSecretEnv: 'BYBIT_API_SECRET', passphraseEnv: 'BYBIT_PASSPHRASE' },
    logo: '/logos/brokers/bybit.svg',
    envVars: ['BYBIT_API_KEY', 'BYBIT_API_SECRET', 'BYBIT_PASSPHRASE'],
    status: 'needed',
    supportsPassphrase: true,
  },
  {
    id: 'okx',
    name: 'OKX',
    tag: 'OKX',
    kind: 'Crypto',
    color: '#0e7490',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['OKX', 'Okx', 'okx'],
    authType: 'API key',
    authUrl: 'https://www.okx.com/account/my-api',
    adapterConfig: { apiKeyEnv: 'OKX_API_KEY', apiSecretEnv: 'OKX_API_SECRET', passphraseEnv: 'OKX_PASSPHRASE' },
    logo: '/logos/brokers/okx.svg',
    envVars: ['OKX_API_KEY', 'OKX_API_SECRET', 'OKX_PASSPHRASE'],
    status: 'needed',
    supportsPassphrase: true,
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    tag: 'CB',
    kind: 'Crypto',
    color: '#3b7bf0',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['Coinbase', 'CB'],
    authType: 'OAuth 2.0',
    authUrl: 'https://login.coinbase.com/signin',
    adapterConfig: { clientIdEnv: 'COINBASE_CLIENT_ID', clientSecretEnv: 'COINBASE_CLIENT_SECRET' },
    logo: '/logos/brokers/coinbase.svg',
    envVars: ['COINBASE_CLIENT_ID', 'COINBASE_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    tag: 'KRKN',
    kind: 'Crypto',
    color: '#3b7bf0',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['Kraken', 'KRKN'],
    authType: 'API key',
    authUrl: 'https://pro.kraken.com/settings/api',
    adapterConfig: { apiKeyEnv: 'KRAKEN_API_KEY', apiSecretEnv: 'KRAKEN_API_SECRET' },
    logo: '/logos/brokers/kraken.svg',
    envVars: ['KRAKEN_API_KEY', 'KRAKEN_API_SECRET'],
    status: 'needed',
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    tag: 'KUCOIN',
    kind: 'Crypto',
    color: '#f7a600',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['KuCoin', 'Kucoin'],
    authType: 'API key',
    authUrl: 'https://www.kucoin.com/account/api',
    adapterConfig: { apiKeyEnv: 'KUCOIN_API_KEY', apiSecretEnv: 'KUCOIN_API_SECRET', passphraseEnv: 'KUCOIN_PASSPHRASE' },
    logo: '/logos/brokers/kucoin.svg',
    envVars: ['KUCOIN_API_KEY', 'KUCOIN_API_SECRET', 'KUCOIN_PASSPHRASE'],
    status: 'needed',
    supportsPassphrase: true,
  },
  {
    id: 'exness',
    name: 'Exness',
    tag: 'EXN',
    kind: 'Forex / CFD',
    color: '#00c851',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['Exness'],
    authType: 'API key / MT5 Bridge',
    authUrl: 'https://my.exness.com/',
    adapterConfig: { apiKeyEnv: 'EXNESS_API_KEY', apiSecretEnv: 'EXNESS_API_SECRET', bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN' },
    logo: '/logos/brokers/exness.svg',
    envVars: ['EXNESS_API_KEY', 'EXNESS_API_SECRET', 'MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN'],
    status: 'needed',
  },
  {
    id: 'hfm',
    name: 'HFM',
    tag: 'HFM',
    kind: 'Forex / CFD',
    color: '#d42e12',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['HFM', 'HotForex'],
    authType: 'MT5 Bridge / Account login',
    authUrl: 'https://my.hfm.com/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN' },
    logo: '/logos/brokers/hfm.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN'],
    status: 'needed',
  },
  {
    id: 'pepperstone',
    name: 'Pepperstone',
    tag: 'PEP',
    kind: 'Forex / CFD',
    color: '#0066cc',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['Pepperstone'],
    authType: 'MT5 Bridge / cTrader',
    authUrl: 'https://pepperstone.com/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN', clientIdEnv: 'CTRADER_CLIENT_ID', clientSecretEnv: 'CTRADER_CLIENT_SECRET' },
    logo: '/logos/brokers/pepperstone.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN', 'CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'icmarkets',
    name: 'IC Markets',
    tag: 'ICM',
    kind: 'Forex / CFD',
    color: '#0047ab',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['IC Markets', 'ICMarkets'],
    authType: 'MT5 Bridge / cTrader',
    authUrl: 'https://www.icmarkets.com/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN', clientIdEnv: 'CTRADER_CLIENT_ID', clientSecretEnv: 'CTRADER_CLIENT_SECRET' },
    logo: '/logos/brokers/icmarkets.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN', 'CTRADER_CLIENT_ID', 'CTRADER_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'xm',
    name: 'XM',
    tag: 'XM',
    kind: 'Forex / CFD',
    color: '#0033a0',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['XM', 'XM Global'],
    authType: 'MT5 Bridge / Account login',
    authUrl: 'https://www.xm.com/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN' },
    logo: '/logos/brokers/xm.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN'],
    status: 'needed',
  },
  {
    id: 'avatrade',
    name: 'AvaTrade',
    tag: 'AVA',
    kind: 'Forex / CFD',
    color: '#0066cc',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['AvaTrade'],
    authType: 'MT5 Bridge / Account login',
    authUrl: 'https://www.avatrade.com/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN' },
    logo: '/logos/brokers/avatrade.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN'],
    status: 'needed',
  },
  {
    id: 'easymarkets',
    name: 'easyMarkets',
    tag: 'EM',
    kind: 'Forex / CFD',
    color: '#3b82f6',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.MT5_BRIDGE,
    aliases: ['easyMarkets', 'easy-markets'],
    authType: 'MT5 Bridge / Account login',
    authUrl: 'https://www.easy-markets.com/int/en-za/',
    adapterConfig: { bridgeUrlEnv: 'MT_BRIDGE_URL', bridgeTokenEnv: 'MT_BRIDGE_TOKEN' },
    logo: '/logos/brokers/easy-markets.svg',
    envVars: ['MT_BRIDGE_URL', 'MT_BRIDGE_TOKEN'],
    status: 'needed',
  },
  {
    id: 'deriv',
    name: 'Deriv',
    tag: 'DRV',
    kind: 'Forex / CFD',
    color: '#ff444f',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.API_KEY,
    aliases: ['Deriv'],
    authType: 'API token',
    authUrl: 'https://deriv.com/',
    adapterConfig: { apiKeyEnv: 'DERIV_API_TOKEN' },
    logo: '/logos/brokers/deriv.svg',
    envVars: ['DERIV_API_TOKEN'],
    status: 'needed',
  },
  {
    id: 'tradier',
    name: 'Tradier',
    tag: 'TRD',
    kind: 'Stocks / Futures',
    color: '#0066cc',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['Tradier'],
    authType: 'OAuth 2.0',
    authUrl: 'https://www.tradier.com/',
    adapterConfig: { clientIdEnv: 'TRADIER_CLIENT_ID', clientSecretEnv: 'TRADIER_CLIENT_SECRET' },
    logo: '/logos/brokers/tradier.svg',
    envVars: ['TRADIER_CLIENT_ID', 'TRADIER_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'tastytrade',
    name: 'tastytrade',
    tag: 'TT',
    kind: 'Stocks / Futures',
    color: '#00cc66',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['tastytrade', 'Tastytrade'],
    authType: 'OAuth 2.0',
    authUrl: 'https://www.tastytrade.com/',
    adapterConfig: { clientIdEnv: 'TASTYTRADE_CLIENT_ID', clientSecretEnv: 'TASTYTRADE_CLIENT_SECRET' },
    logo: '/logos/brokers/tastytrade.svg',
    envVars: ['TASTYTRADE_CLIENT_ID', 'TASTYTRADE_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'tradeStation',
    name: 'TradeStation',
    tag: 'TS',
    kind: 'Stocks / Futures',
    color: '#0066cc',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['TradeStation'],
    authType: 'OAuth 2.0',
    authUrl: 'https://www.tradestation.com/',
    adapterConfig: { clientIdEnv: 'TRADESTATION_CLIENT_ID', clientSecretEnv: 'TRADESTATION_CLIENT_SECRET' },
    logo: '/logos/brokers/tradestation.svg',
    envVars: ['TRADESTATION_CLIENT_ID', 'TRADESTATION_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    tag: 'SCHW',
    kind: 'Stocks / Futures',
    color: '#003366',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['Schwab', 'Charles Schwab'],
    authType: 'OAuth 2.0',
    authUrl: 'https://www.schwab.com/',
    adapterConfig: { clientIdEnv: 'SCHWAB_CLIENT_ID', clientSecretEnv: 'SCHWAB_CLIENT_SECRET' },
    logo: '/logos/brokers/schwab.svg',
    envVars: ['SCHWAB_CLIENT_ID', 'SCHWAB_CLIENT_SECRET'],
    status: 'needed',
  },
  {
    id: 'alpaca',
    name: 'Alpaca',
    tag: 'ALP',
    kind: 'Stocks / Futures',
    color: '#00cc66',
    type: BROKER_KINDS.LIVE,
    connectionType: CONNECTION_TYPES.OAUTH,
    aliases: ['Alpaca'],
    authType: 'OAuth 2.0',
    authUrl: 'https://alpaca.markets/',
    adapterConfig: { clientIdEnv: 'ALPACA_CLIENT_ID', clientSecretEnv: 'ALPACA_CLIENT_SECRET' },
    logo: '/logos/brokers/alpaca.svg',
    envVars: ['ALPACA_CLIENT_ID', 'ALPACA_CLIENT_SECRET'],
    status: 'needed',
  },
];

export const PROP_FIRM_REGISTRY = [
  {
    id: 'tbfunded',
    name: 'TradingBible Funded',
    tag: 'TBF',
    kind: 'Funded / Challenge',
    color: '#d4af37',
    type: BROKER_KINDS.PROP,
    connectionType: 'native',
    aliases: ['TradingBible Funded', 'TBF', 'TradingBible'],
    authType: 'Challenge account',
    authUrl: '/app/challenges',
    adapterConfig: {},
    logo: '/icons/favicon.svg',
    envVars: [],
    status: 'live',
  },
];

// Utility functions
export function getAllProviders() {
  return [...BROKER_REGISTRY, ...PROP_FIRM_REGISTRY];
}

export function getProviderById(id) {
  return getAllProviders().find((p) => p.id === id);
}

export function getProviderByAlias(alias) {
  const normalized = alias.toLowerCase();
  return getAllProviders().find((p) =>
    p.aliases.some((a) => a.toLowerCase() === normalized)
  );
}

export function getProvidersByType(type) {
  return getAllProviders().filter((p) => p.type === type);
}

export function getLiveBrokers() {
  return BROKER_REGISTRY;
}

export function getPropFirms() {
  return PROP_FIRM_REGISTRY;
}

export function getTotalProviderCount() {
  return getAllProviders().length;
}

// Backward compatibility - flat arrays for components like GlobalSearch
export const BROKERS = BROKER_REGISTRY.map((b) => ({
  name: b.name,
  tag: b.tag,
  kind: b.kind,
  color: b.color,
  authType: b.authType,
  authUrl: b.authUrl,
}));

export const PROP_FIRMS = PROP_FIRM_REGISTRY.map((p) => ({
  name: p.name,
  tag: p.tag,
  kind: p.kind,
  color: p.color,
  authType: p.authType,
  authUrl: p.authUrl,
}));

export const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n) => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`;