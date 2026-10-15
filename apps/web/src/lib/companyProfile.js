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
    formation: 'August 10, 2026 — TradingBible LLC is the SOLE company. No second entity.',
    mission: 'Empower traders and investors through transparent, data-driven market intelligence, advanced financial technology, trading analytics, risk management, and accessible education.',
    vision: 'Establish TradingBible as a globally recognized financial technology ecosystem connecting professional trading tools, brokerage infrastructure, market intelligence, digital assets, and investment technology.',
    purpose: 'Develop, own, operate, license, and commercialize lawful fintech platforms, software, analytical tools, educational products, data services, and related businesses — subject to applicable licenses.',
    voice: 'Professional, precise, research-driven, globally accessible, transparent about financial risks.',
    responseSLA: 'Team responds within one business day.',
    officialDescription: 'TradingBible LLC is a Delaware-registered financial technology company developing an integrated ecosystem of professional trading intelligence, market analytics, financial education, and trading software. Website: https://tradingbible.app. Software and education do NOT constitute authorization to provide regulated brokerage, advisory, exchange, or custodial services.',
  },
  legal: {
    legalName: 'TradingBible LLC',
    form: 'Delaware limited liability company',
    formed: 'August 10, 2026 (Certificate of Formation)',
    ein: 'Issued — IRS EIN confirmation notice (CP575G).',
    duns: 'Reported as obtained — NOT independently verified here.',
    naics: '511210',
    agent: 'Delaware Registered Agent, Inc.',
    holdingCompany: 'NOT FORMED — TradingBible Holdings, Inc. is ON HOLD. No second EIN, corporation, or conversion needed to keep building.',
    licenseNote: 'Formation certificate, EIN, and D-U-N-S are business credentials — NONE is a brokerage license. No live client deposits until a licensed entity + banking + safeguarding exist.',
    jurisdiction: 'England & Wales (Terms); U.S. retail forex $20M minimum adjusted net capital; Nigeria substance if managed from Nigeria; brokerage structure decided with U.S. + Nigerian counsel BEFORE onboarding.',
    liabilityCap: 'Greater of 12 months fees or USD 100.',
    dataController: 'TradingBible LLC',
    franchiseTax: 'Delaware LLC: $300 annual tax, due June 1 (not the corporate franchise-tax regime).',
    records: 'Certificate of Formation, EIN notice, operating agreement, ownership records, registered-agent agreement, material contracts, accounting records, tax filings.',
    taxNote: 'Cross-border Nigeria/US adviser required. Foreign-owned U.S. disregarded LLC may owe Form 5472 + pro forma 1120 even with no U.S. tax liability.',
    fundraising: 'Distinguish issuing membership interests vs borrowing. NEVER advertise public shares or an IPO as already available.',
  },
  holdings: {
    status: 'ON HOLD — TradingBible LLC remains the official operating company. Holdings is a future option, not a current entity.',
    parent: 'TradingBible Holdings, Inc. — proposed only, NOT formed, no EIN, no conversion.',
    ticker: 'TB',
    tickerStatus: 'Proposed future ticker — NOT reserved, NOT approved. IPO is a long-term objective, not a guaranteed outcome.',
    divisions: 'Product divisions & strategic initiatives under ONE LLC (NOT subsidiaries, NOT incorporated): TradingBible Terminal · Intelligence (research/SI/signals/education) · Prop (challenges/analytics) · Developer (APIs/SDKs/white-label) · Brokerage (FUTURE, regulated) · Coin (proposed TBC). Separate entities only later for regulators/investors/tax/risk.',
    coin: 'TBC — TradingBible Coin (proposed native asset)',
    coinStatus: 'Max 100,000,000 TBC. Cosmos SDK + CometBFT + Cosmos EVM. No routine minting past max. $50K = testnet budget target (not proof of funding). 90-day public testnet observation planned; mainnet conditional on legal/technical/security approvals. Any sale/staking/yield/listing needs jurisdiction-specific legal analysis. TBC IS NOT equity — never interchangeable with stock.',
    control: 'No public shares exist. A future Delaware C-Corp may suit institutional investment later; do not create one now.',
  },
  brand: {
    colors: 'Signature gold · midnight black · light gold · ivory. Gold #d4af37 · light #f4e6a8 · dark #a67c1e · bg #0a0a0f · card #0f0f14 · text #f0ecdd · muted #8a8577 · dim #6a665a.',
    logo: 'Official TB logo + separate TBC token symbol (supplied by founder). Rounded dark square, gold border/chevron + dot. Bundled /logos/tradingbible-logo.png + CDN fallback. Favicon set.',
    typography: 'system-ui stack; ui-monospace for numbers.',
    voice: 'Professional, precise, research-driven, globally accessible, transparent about financial risks.',
    emailShell: 'Dark #07070a/#0b0b10, gold border, TradingBible header, footer TradingBible LLC · tradingbible.app, tagline: Trade like the 1%. Journal like a fund.',
    socials: 'twitter.com/tradingbible · discord.gg/tradingbible · github.com/tradingbible (+ facebook/linkedin/instagram/youtube/tiktok @tradingbible in footer).',
    attribution: '“Charts by TradingBible” / “Powered by TradingBible” only if the charting IP is genuinely ours and third-party market-data attribution is satisfied.',
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
    quant: 'Maliba SI — Head of Quantitative Research (platform SI research function)',
    team: 'Operators, engineers, and quants from global markets and technology.',
    confirmNote: 'Titles from the company profile — CONFIRM before publishing as formal officer appointments.',
    advisers: 'None engaged: Goldman Sachs / Morgan Stanley / J.P. Morgan / Jefferies / Chapel Hill Denham / Renaissance Capital (proposed only). Hire Delaware + U.S. securities + Nigerian counsel + tax + regulatory first.',
  },
  markets: {
    coverage: 'Metals XAU/USD + silver · Crypto BTC/USD, ETH, SOL+ · Forex EUR/USD, GBP/USD, USD/JPY+ · U.S. (+eventually other) equities · S&P 500 / Nasdaq indices+ · Crude, natgas, copper, agriculturals · Sector + broad-market ETFs. Gold + Bitcoin are signature markets.',
    feeds: 'Binance klines (crypto) · Finnhub (US stocks) · Alpha Vantage cached (equities/forex, 25 req/day free) · synthetic fallback so charts never render empty. SYNTHETIC DATA MUST NEVER BE REPRESENTED AS REAL OR EXECUTABLE PRICES.',
    dataStandard: 'Institutional order flow needs licensed exchange-grade data: timestamps, provenance, venue-specific depth.',
    categories: 'Forex · Gold · Bitcoin derivatives · Stocks & indices · Commodities · Crypto spot. Regulated launch starts with a manageable set.',
    mt5: 'MT_BRIDGE_URL=https://bridge.tradingbible.app (PROPOSED — not deployed, needs domain/TLS/backend) · MT_BRIDGE_TOKEN = securely-generated server secret in a secrets manager, NEVER in client apps. A custom bridge grants NO MT5 server rights and NO brokerage authorization (needs commercial MT5 arrangements).',
    liquidity: 'Evaluate institutional liquidity, FIX connectivity, broker back-office, risk engines, MT5 broker availability. Start largely externally hedged.',
  },
  product: {
    version: '1.2.0 live (documented scope — not an independent audit).',
    stack: 'React 18 + Vite + Tailwind · Node + Express 5 · Supabase Postgres RLS · Paddle/Stripe · VPS Ubuntu + PM2 + Nginx + Lets Encrypt.',
    surfaces: 'Terminal Pro · journal · analytics · SI reports/coach (Elite+) · signals/indicators · risk tools · backtest/paper · challenges/prop analytics · broker sync · alerts/heatmaps/order-flow · community · academy/mentors/webinars · TV · wallet/billing · API/white-label (Professional) · TBC page · admin portal · 24-mission Pro-Guide.',
    terminal: 'Proprietary Terminal Pro + future Chart SDK as licensable assets. A charting terminal is NOT an exchange or broker — execution, custody, data redistribution, client accounts need separate agreements + authorization.',
    persistence: 'Auto-save drawings, annotations, watchlists, layouts, journal entries, prop-firm activity across sessions. Broker/prop sync must be permission-based with provider integrations.',
    auth: 'Supabase GoTrue (OTP / magic links / WebAuthn passkeys) + branded Send-Email webhook hook. RBAC, RLS, hardware-backed admin auth, key rotation, audit logs, backups, DR, pen-tests, incident response as we scale.',
  },
  monetization: {
    plans: 'Pro $19.99/mo (journal/analytics/risk) · Elite SI $49.99/mo (SI reports/coaching/integrations) · Professional $99/mo (API/webhooks/white-label). Documented prices — not verified checkout prices. Stripe, no free trial, card required. 14-day money-back on first subscription.',
    lines: 'Subscriptions + developer licensing + chart widgets + institutional software + ads + education/mentorship + affiliates + eligible prop-firm services. Future brokerage commissions/spreads/fees ONLY after legal + regulatory clearance.',
    tractionNote: 'NO verified revenue, profit, valuation, MRR, customer, or growth figures supplied — all pending confirmation, never estimated as achievements. (ARPU ~$36.89 illustrative only.)',
    payouts: 'CFD withdrawals every 14 days to TBC wallet (80% standard → 90% scaling; 1-step fixed 90%). First funded payout refunds entry fee in TBC.',
  },
  compliance: {
    kyc: 'Passkeys · session management · KYC-gated profiles (frozen after verification) · suspend/close lifecycle · AML/KYC, sanctions screening, SoF, transaction monitoring, withdrawal approvals, reconciliation, complaint handling.',
    segregation: 'Separate operating money / regulatory capital / client funds / crypto assets. Client assets are never company funding.',
    credentials: 'Certificate + EIN + D-U-N-S are credentials, NOT licenses. Brokerage legal structure decided with counsel BEFORE onboarding or deposits.',
    filings: 'U.S.: restructuring + audited financials + Form S-1 + prospectus + SEC review + exchange application + underwriting/pricing. Nigeria: issuer eligibility + SEC registration + NGX admission. Delaware LLC cannot assume direct NGX Growth listing.',
    readiness: 'Cap table · 3-yr projections · audited accounts · licenses · risk disclosures · IP records · material contracts · cybersecurity · litigation · governance · use of proceeds. Costs: brokerage $720K–$2.09M · IPO prep $1.1M–$4M + %.',
  },
  roadmap: {
    phases: '1 LLC formation Completed → 2 IRS EIN Completed → 3 D-U-N-S Reported obtained → 4 Platform verification Requires current audit → 5 Revenue validation Figures pending → 6 Proprietary terminal Expansion roadmap → 7 Brokerage licensing Planned → 8 TBC testnet/mainnet Planned → 9 Institutional financing Future → 10 Restructuring/IPO Long-term.',
    first90: 'Days 1–30: verify records/ownership/tax, appoint counsel, commission licensing + IPO feasibility. Days 31–60: plan/model/capital/architecture + MT5/liquidity RFQs. Days 61–90: jurisdiction shortlist + vendor quotes + prototype scope + funding/governance plan.',
    nextPriorities: 'Verify operational + financial records · meet tax/compliance (Delaware $300/yr Jun 1; 5472/1120 if applicable) · strengthen proprietary tech · decide which regulated line to pursue first.',
    strategy: 'Regulated brokerage + proprietary tech (licensing/market-data/enterprise), not commissions alone. IPO is a milestone earned via performance, not a launch prerequisite. Blueprint is a working master plan — verify all claims before banks/regulators/investors.',
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
