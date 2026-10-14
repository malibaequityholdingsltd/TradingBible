import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

// Company Bible — admin-curated A–Z truth. Mirrors COMPANY_DEFAULTS in
// apps/api/src/routes/admin.js. API merges stored config over these; the
// widget/page fall back here when offline or non-admin.
export const COMPANY_DEFAULTS = {
  identity: {
    name: 'TradingBible',
    shortName: 'TB',
    tagline: 'TradingBible',
    mission: 'Empower individuals with transparent, data-driven market intelligence, innovative technology, and world-class educational resources that support smarter financial decision-making.',
    vision: "Become one of the world's leading financial technology platforms by making professional trading intelligence accessible to every trader and investor.",
    voice: 'Professional, data-driven, educational — institutional quality without institutional gatekeeping.',
    responseSLA: 'Team responds within one business day.',
  },
  legal: {
    legalName: 'TradingBible LLC',
    form: 'Delaware limited liability company',
    formed: 'August 2026',
    naics: '511210',
    agent: 'Delaware Registered Agent, Inc.',
    duns: '14-997-6777',
    licenseNote: 'Delaware incorporation is NOT a brokerage license. No live client deposits until a licensed entity + banking + safeguarding are operational.',
    jurisdiction: 'England & Wales (Terms); U.S. retail forex $20M minimum adjusted net capital; Nigeria substance if managed from Nigeria.',
    liabilityCap: 'Greater of 12 months fees or USD 100.',
    dataController: 'TradingBible LLC',
  },
  holdings: {
    parent: 'TradingBible Holdings, Inc.',
    parentStatus: 'Proposed — not yet formed/listed.',
    ticker: 'TB',
    tickerStatus: 'Requested — not reserved/confirmed. Nasdaq Capital preferred; NYSE / NYSE American / NGX alternatives.',
    entities: 'TradingBible LLC (existing) + Holdings / Markets / Securities / Digital Assets / Technologies / Blockchain (all proposed — create only when needed).',
    coin: 'TBC',
    coinStatus: 'Proposed native coin, max 100,000,000, Cosmos SDK + CometBFT + Cosmos EVM baseline, fixed supply. TBC IS NOT TB equity — never advertise interchangeably.',
    control: 'Illustrative 100M fully diluted: founder 60M / private 15M / employee pool 10M / public 15M. One-share-one-vote default; authorized shares do not guarantee control.',
  },
  brand: {
    colors: 'Gold #d4af37 · light #f4e6a8 · dark #a67c1e · bg #0a0a0f · card #0f0f14 · text #f0ecdd · muted #8a8577 · dim #6a665a.',
    logo: 'Rounded dark square, gold border/chevron + dot. Bundled /logos/tradingbible-logo.png + CDN fallback. Favicon set.',
    typography: 'system-ui stack; ui-monospace for numbers.',
    emailShell: 'Dark #07070a/#0b0b10, gold border, TradingBible header, footer TradingBible LLC · tradingbible.app, tagline: Trade like the 1%. Journal like a fund.',
    socials: 'twitter.com/tradingbible · discord.gg/tradingbible · github.com/tradingbible (+ facebook/linkedin/instagram/youtube/tiktok @tradingbible in footer).',
  },
  contacts: {
    website: 'https://tradingbible.app',
    support: 'support@tradingbible.app',
    legal: 'legal@tradingbible.app',
    privacy: 'privacy@tradingbible.app',
    ads: 'ads@tradingbible.app',
  },
  leadership: {
    ceo: 'Malik Nlem — Founder & Chief Executive',
    vp: 'Victor Okechukwu — Vice President',
    quant: 'Maliba SI — Head of Quantitative Research',
    team: 'Operators, engineers, and quants from global markets and technology.',
    advisers: 'None engaged: Goldman Sachs / Morgan Stanley / J.P. Morgan / Jefferies / Chapel Hill Denham / Renaissance Capital (proposed only). Hire Delaware + U.S. securities + Nigerian counsel + tax + regulatory first.',
  },
  markets: {
    coverage: 'Crypto ~60 (Binance) · Forex ~40 · Commodities 20 incl. XAU/USD · Indices 6 (NQ/ES/DJI/SPX/RUT/VIX) + 20 sector ETFs + ~100 US stocks.',
    feeds: 'Binance klines (crypto) · Finnhub (US stocks) · Alpha Vantage cached (equities/forex, 25 req/day free) · synthetic fallback so charts never render empty.',
    categories: 'Forex · Gold XAU/USD · Bitcoin BTC/USD derivatives · Stocks & indices · Commodities (oil/silver+) · Crypto spot (BTC/ETH+). Regulated launch starts with a manageable set.',
    mt5: 'Retail MT5 app ≠ broker rights. Institutional broker-side rights required. Gateway MT_BRIDGE_URL=https://mt-bridge.tradingbible.app (dev only on Hostinger Ubuntu 24.04).',
    liquidity: 'RFQs: LMAPX / B2PRIME / oneZero. Start largely externally hedged. Risk engine: exposure, leverage, margin, stop-out, feed anomalies, slippage, hedging failures, outages, concentration.',
  },
  product: {
    version: '1.2.0 live.',
    stack: 'React 18 + Vite + Tailwind · Node + Express 5 · Supabase Postgres RLS · Paddle/Stripe · VPS Ubuntu + PM2 + Nginx + Lets Encrypt.',
    surfaces: 'Terminal Pro · journal · analytics · SI reports/coach (Elite+) · signals/indicators (14 built-ins) · risk tools · backtest/paper · challenges · broker sync · alerts/heatmaps/order-flow/calendar · community · academy/mentors/webinars · TV · wallet/billing · API/white-label (Professional) · TBC page · admin portal · 24-mission Pro-Guide.',
    terminal: 'Proprietary Terminal Pro + future Chart SDK (Charts by TradingBible) as licensable assets. Durable workspace storage — logout must not erase trades or saved analysis.',
    auth: 'Supabase GoTrue (OTP / magic links / WebAuthn passkeys) + branded Send-Email webhook hook.',
  },
  monetization: {
    plans: 'Pro $19.99/mo · Elite SI $49.99/mo (most popular) · Professional $99/mo. Stripe, no free trial, card required. 14-day money-back on first subscription.',
    lines: 'Subscriptions + TV ads + affiliate + challenge rails + academy + TBC activity + API/white-label licensing.',
    tractionNote: 'NO verified traction figures exist — users/subs/MRR/churn/waitlist/TBC all founder-to-confirm (template only). Projections illustrative (ARPU ~$36.89, 60/30/10 mix).',
    payouts: 'CFD withdrawals every 14 days to TBC wallet (80% standard → 90% scaling; 1-step fixed 90%). First funded payout refunds entry fee in TBC.',
  },
  compliance: {
    kyc: 'Passkeys · session management · KYC-gated profiles (frozen after verification) · suspend/close lifecycle · sanctions + SoF + monitoring + withdrawal approvals + reconciliation.',
    segregation: 'Separate operating money / regulatory capital / client funds / crypto assets. Client assets are never company funding.',
    filings: 'U.S.: restructuring + audited financials + Form S-1 + prospectus + SEC review + exchange application + underwriting/pricing. Nigeria: issuer eligibility + SEC registration + NGX admission. Delaware LLC cannot assume direct NGX Growth listing.',
    readiness: 'Cap table · 3-yr projections · audited accounts · licenses · risk disclosures · IP records · material contracts · cybersecurity · litigation · governance · use of proceeds. Costs: brokerage $720K–$2.09M · IPO prep $1.1M–$4M + %.',
  },
  roadmap: {
    phases: '01 Corporate/legal 2026–27 → 02 Licensing/capital 2027–28 → 03 Technology 2027–28 → 04 Controlled launch 2028–29 → 05 Revenue/governance 2028–30 → 06 IPO prep 2029–31+ → 07 Listing 2030–32+ → 08 Public-company expansion.',
    first90: 'Days 1–30: verify records/ownership/tax, appoint counsel, commission licensing + IPO feasibility. Days 31–60: plan/model/capital/architecture + MT5/liquidity RFQs. Days 61–90: jurisdiction shortlist + vendor quotes + prototype scope + funding/governance plan.',
    strategy: 'Regulated brokerage + proprietary tech (licensing/market-data/enterprise), not commissions alone. IPO is a milestone earned via performance, not a launch prerequisite.',
  },
};

export const COMPANY_SECTIONS = [
  { id: 'identity', label: 'Identity' },
  { id: 'legal', label: 'Legal' },
  { id: 'holdings', label: 'Holdings · TB / TBC' },
  { id: 'brand', label: 'Brand' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'markets', label: 'Markets & MT5' },
  { id: 'product', label: 'Product & Stack' },
  { id: 'monetization', label: 'Money' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'roadmap', label: 'Roadmap' },
];

const LS_KEY = 'tb:company-profile:v1';

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === 'object') return obj;
  } catch { /* ignore */ }
  return null;
}

function mergeOverDefaults(stored) {
  const merged = {};
  for (const k of Object.keys(COMPANY_DEFAULTS)) merged[k] = { ...COMPANY_DEFAULTS[k], ...((stored && stored[k]) || {}) };
  return merged;
}

function apiError(res, url, fallback) {
  return new Error(`${url} → ${res.status}${fallback ? ` (${fallback})` : ''}`);
}

// Load: API first (applies server merge + SI truth), direct Supabase row
// second, bundled defaults last. Never throws — returns source + detail.
export async function loadCompanyProfile() {
  try {
    if (!pb.authStore.token) throw new Error('no session token — sign in again');
    const res = await fetch(`${API_SERVER_URL}/admin/company`, {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw apiError(res, 'GET /admin/company', data.error || data.message);
    if (data?.profile) {
      const profile = mergeOverDefaults(data.profile);
      try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
      return { profile, stored: Boolean(data.stored), source: 'api', error: '' };
    }
    throw new Error('GET /admin/company → empty profile');
  } catch (apiErr) {
    // Fallback: read the same row direct (same table the API uses).
    try {
      const row = await pb.collection('admin_integrations').getFirstListItem('key = "company:profile"');
      const profile = mergeOverDefaults(row?.config);
      try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
      return { profile, stored: true, source: 'direct', error: `API: ${apiErr?.message || apiErr}` };
    } catch (directErr) {
      const isMissing = String(directErr?.message || '').includes('No matching record');
      return {
        profile: mergeOverDefaults(readLS()),
        stored: false,
        source: 'defaults',
        error: `API: ${apiErr?.message || apiErr}${isMissing ? ' · no stored row yet — first save creates it' : ` · direct: ${directErr?.message || directErr}`}`,
      };
    }
  }
}

// Save: API first, direct Supabase upsert second. Throws only when both fail.
export async function saveCompanyProfile(next) {
  const config = {};
  for (const k of Object.keys(COMPANY_DEFAULTS)) config[k] = (next && next[k] && typeof next[k] === 'object') ? next[k] : COMPANY_DEFAULTS[k];
  let apiErr = null;
  try {
    const res = await fetch(`${API_SERVER_URL}/admin/company`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw apiError(res, 'PUT /admin/company', data.error || data.message);
    const profile = mergeOverDefaults(data.profile || config);
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return { profile, source: 'api' };
  } catch (e) { apiErr = e; }
  // Fallback: upsert the row direct (admin RLS permits; create retries
  // without `owner` since admin_integrations has no owner column).
  try {
    let row = null;
    try { row = await pb.collection('admin_integrations').getFirstListItem('key = "company:profile"'); } catch { row = null; }
    if (row?.id) await pb.collection('admin_integrations').update(row.id, { config, enabled: true });
    else await pb.collection('admin_integrations').create({ key: 'company:profile', provider: 'admin', config, enabled: true });
    const profile = mergeOverDefaults(config);
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    return { profile, source: 'direct' };
  } catch (directErr) {
    throw new Error(`API: ${apiErr?.message || apiErr} · direct: ${directErr?.message || directErr}`);
  }
}

export function buildContextText(c) {
  const d = {};
  for (const k of Object.keys(COMPANY_DEFAULTS)) d[k] = { ...COMPANY_DEFAULTS[k], ...((c && c[k]) || {}) };
  const pick = (o) => Object.entries(o || {}).map(([k, v]) => `${k}: ${v}`).join(' | ');
  return [
    `Identity — ${pick(d.identity)}`,
    `Legal — ${pick(d.legal)}`,
    `Holdings — ${pick(d.holdings)}`,
    `Brand — ${pick(d.brand)}`,
    `Contacts — ${pick(d.contacts)}`,
    `Leadership — ${pick(d.leadership)}`,
    `Markets — ${pick(d.markets)}`,
    `Product — ${pick(d.product)}`,
    `Monetization — ${pick(d.monetization)}`,
    `Compliance — ${pick(d.compliance)}`,
    `Roadmap — ${pick(d.roadmap)}`,
  ].join('\n');
}

export function useCompanyProfile() {
  const [profile, setProfile] = useState(() => {
    const cached = readLS();
    if (cached) {
      const merged = {};
      for (const k of Object.keys(COMPANY_DEFAULTS)) merged[k] = { ...COMPANY_DEFAULTS[k], ...(cached[k] || {}) };
      return merged;
    }
    const fresh = {};
    for (const k of Object.keys(COMPANY_DEFAULTS)) fresh[k] = { ...COMPANY_DEFAULTS[k] };
    return fresh;
  });
  const [stored, setStored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('defaults');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await loadCompanyProfile();
    setProfile(result.profile);
    setStored(result.stored);
    setSource(result.source);
    setLoading(false);
    return result.profile;
  }, []);

  useEffect(() => { load(); }, [load]);

  return { profile, stored, loading, source, reload: load };
}
