// Static reference constants for TradingBible (brand logos, plan definitions,
// market/experience/goal option lists, supported brokers & prop firms, money
// formatters). Contains NO market, account, or trade data — all live data
// comes from PocketBase and the live Finnhub/Binance feeds.

// Brand logo variants supplied for the pricing tiers.
const OFFICIAL_LOGO = 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png';
export const LOGOS = {
  goldWhite: OFFICIAL_LOGO,
  goldBlack: OFFICIAL_LOGO,
  whiteBlack: OFFICIAL_LOGO,
};

export const PLANS = [
  { id: 'trial', name: 'Free Trial', price: 0, period: '7 days', tagline: 'Full premium access', logo: LOGOS.whiteBlack,
    features: ['All Pro features', 'AI trade reviews', 'Broker sync (2 accounts)', 'No card required'], cta: 'Start Free Trial' },
  { id: 'pro', name: 'Pro', price: 19.99, period: 'mo', tagline: 'For serious retail traders', logo: LOGOS.goldBlack,
    features: ['Unlimited trades', 'Full analytics suite', 'AI trade scoring', '5 broker accounts', 'Trading calendar'], cta: 'Choose Pro' },
  { id: 'elite', name: 'Elite AI', price: 49.99, period: 'mo', highlight: true, tagline: 'AI-first performance', logo: LOGOS.goldWhite,
    features: ['Everything in Pro', 'AI Trading Coach chat', 'Daily & weekly AI reports', 'Mistake detection', '15 broker accounts', 'Priority AI queue'], cta: 'Choose Elite AI' },
  { id: 'professional', name: 'Professional', price: 99, period: 'mo', tagline: 'For funds & prop desks', logo: LOGOS.goldBlack,
    features: ['Everything in Elite', 'Unlimited broker accounts', 'Team seats', 'API & webhooks', 'White-glove onboarding', 'Dedicated success manager'], cta: 'Choose Professional' },
];

export const MARKETS = ['Forex', 'Stocks', 'Crypto', 'Futures'];
export const EXPERIENCE = ['Beginner', 'Intermediate', 'Professional'];
export const GOALS = ['Discipline', 'Risk management', 'Performance improvement'];

// authUrl points at the broker's real login / API-key / OAuth authorization page,
// authType describes how the connection is established once the user signs in there.
export const BROKERS = [
  { name: 'MetaTrader 4', tag: 'MT4', kind: 'Forex / CFD', color: '#4a90d9', authType: 'Account login', authUrl: 'https://www.metatrader4.com/en/trading-platform/web' },
  { name: 'MetaTrader 5', tag: 'MT5', kind: 'Multi-asset', color: '#4a90d9', authType: 'Account login', authUrl: 'https://www.metatrader5.com/en/terminal/help/start_advanced/login' },
  { name: 'cTrader', tag: 'cTrader', kind: 'Forex / CFD', color: '#e0533d', authType: 'OAuth 2.0', authUrl: 'https://openapi.ctrader.com/apps' },
  { name: 'DXtrade', tag: 'DX', kind: 'Multi-asset', color: '#5b8def', authType: 'Account login', authUrl: 'https://dx.trade/' },
  { name: 'Interactive Brokers', tag: 'IBKR', kind: 'Stocks / Futures', color: '#d4af37', authType: 'OAuth / Client Portal', authUrl: 'https://www.interactivebrokers.com/sso/Login' },
  { name: 'Binance', tag: 'BNB', kind: 'Crypto', color: '#f0b90b', authType: 'API key', authUrl: 'https://www.binance.com/en/my/settings/api-management' },
  { name: 'Bybit', tag: 'BYB', kind: 'Crypto', color: '#f7a600', authType: 'API key', authUrl: 'https://www.bybit.com/app/user/api-management' },
  { name: 'Coinbase', tag: 'CB', kind: 'Crypto', color: '#3b7bf0', authType: 'OAuth 2.0', authUrl: 'https://login.coinbase.com/signin' },
];

export const PROP_FIRMS = [
  { name: 'FTMO', tag: 'FTMO', kind: 'Funded / Challenge', color: '#0ab28a', authType: 'Account login', authUrl: 'https://trader.ftmo.com/' },
  { name: 'Funded', tag: 'FND', kind: 'Funded account', color: '#7c5cff', authType: 'Account login', authUrl: 'https://www.thefundedtrader.com/' },
  { name: 'Topstep', tag: 'TOP', kind: 'Futures funded', color: '#f0b90b', authType: 'Account login', authUrl: 'https://www.topstep.com/' },
  { name: 'E8 Markets', tag: 'E8', kind: 'Funded / Challenge', color: '#e0533d', authType: 'Account login', authUrl: 'https://e8markets.com/' },
  { name: 'Prop Firm X', tag: 'PFX', kind: 'Funded account', color: '#4a90d9', authType: 'Account login', authUrl: 'https://propfirmx.com/' },
  { name: 'MyForexFunds', tag: 'MFF', kind: 'Funded / Challenge', color: '#d4af37', authType: 'Account login', authUrl: 'https://myfundedfx.com/' },
];

export const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n) => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`;
