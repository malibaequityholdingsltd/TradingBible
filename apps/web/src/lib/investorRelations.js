// TB investor relations — shared public copy and presentation helpers.
// The issuer is pre-IPO. Nothing in this file is a market quote, an offer,
// an allocation, a regulatory approval or a promise that a listing will occur.

export const TB_ISSUER = {
  currentEntity: 'TradingBible LLC',
  proposedIssuer: 'TradingBible, Inc.',
  structure: 'Proposed Delaware C-Corporation',
  jurisdiction: 'Delaware, United States',
  ticker: 'TB',
  tickerStatus: 'Proposed — not reserved or approved',
  exchange: 'Nasdaq',
  exchangeStatus: 'Target only — no listing application or approval',
  listingStatus: 'Pre-IPO — not publicly traded',
  price: 'Not available',
  marketCap: 'Not available',
  volume: 'Not available',
  shareTrading: 'Not active',
  fiscalYear: 'Calendar year',
  irEmail: 'support@tradingbible.app',
  updated: 'October 2026',
  website: 'https://tradingbible.app',
};

export const TB_DISCLOSURE =
  'TB is a proposed future ticker for a company that is not publicly traded. These pages are an investor-relations information centre, not an offer to sell or a solicitation to buy securities. No share price, market capitalisation, trading volume, listing approval or regulatory approval exists or is implied. Forward-looking statements are subject to material risks and may change.';

export const TB_NAV = [
  { to: '/stock/TB', label: 'TB Stock', end: true },
  { to: '/investors', label: 'Investor Home', end: true },
  { to: '/investors/financials', label: 'Financials' },
  { to: '/investors/governance', label: 'Governance' },
  { to: '/investors/ipo', label: 'IPO Readiness' },
  { to: '/investors/news', label: 'News' },
  { to: '/investors/documents', label: 'Documents' },
  { to: '/investors/shareholders', label: 'Shareholders' },
  { to: '/investors/contact', label: 'Contact' },
];

export const TB_STATUS_CARDS = [
  { label: 'Proposed ticker', value: 'TB', note: 'Not reserved or approved', tone: 'gold' },
  { label: 'Listing status', value: 'Pre-IPO', note: 'Not publicly traded', tone: 'amber' },
  { label: 'Share price', value: '—', note: 'No public market', tone: '' },
  { label: 'Market cap', value: '—', note: 'Not applicable', tone: '' },
];

export const TB_PILLARS = [
  {
    number: '01',
    title: 'A single, verified investor record',
    body: 'Public disclosures, financial reporting and the shareholder register are separated by design. Public readers see approved material only; verified shareholders see their own records and nothing else.',
  },
  {
    number: '02',
    title: 'Approval before publication',
    body: 'Financial reports and disclosure documents require a named approver, a source note and a publication event. The platform does not invent missing figures or auto-approve regulatory milestones.',
  },
  {
    number: '03',
    title: 'Evidence before equity',
    body: 'Equity positions are recorded only against an executed corporate record and an approving authority. This platform does not mint shares, move certificates or connect to a transfer agent.',
  },
  {
    number: '04',
    title: 'TB is not TBC',
    body: 'TB represents proposed equity in TradingBible, Inc. TBC is a separate proposed blockchain asset with its own supply and risk profile. No TBC balance is equity, and no TB share is a TBC allocation.',
  },
];

export const TB_SEPARATION = [
  { label: 'Instrument', tb: 'Proposed common equity', tbc: 'Proposed blockchain asset' },
  { label: 'Represents ownership', tb: 'Potential equity interest, subject to issuance', tbc: 'No equity or ownership in TradingBible' },
  { label: 'Supply', tb: 'Set by authorized share capital', tbc: 'Proposed 100,000,000 TBC' },
  { label: 'Current execution', tb: 'No share sale or trading', tbc: 'No token sale or transfer' },
  { label: 'Valuation', tb: 'Not published', tbc: 'No public valuation' },
  { label: 'Public market', tb: 'None — pre-IPO', tbc: 'No active market' },
  { label: 'Records', tb: 'Private equity register and audit trail', tbc: 'Separate TBC execution and ledger records' },
];

export const TB_LEADERSHIP = [
  {
    name: 'Malik Nlem',
    role: 'Founder & Chief Executive Manager',
    focus: 'Strategy, capital formation and corporate development.',
    note: 'Serving in the current LLC structure.',
  },
  {
    name: 'TradingBible leadership',
    role: 'Operating and product functions',
    focus: 'Platform engineering, market education, research and member operations.',
    note: 'Team profiles are published on the About page.',
  },
];

export const TB_GOVERNANCE = [
  {
    title: 'Current structure',
    body: 'TradingBible LLC is the current operating entity. TradingBible, Inc. is a proposed Delaware C-Corporation and has not been presented as formed.',
    status: 'Current',
    tone: 'gold',
  },
  {
    title: 'Board and committees',
    body: 'Board composition, independence determinations and committee charters will be published only after they are adopted and approved.',
    status: 'To be adopted',
    tone: 'amber',
  },
  {
    title: 'Disclosure controls',
    body: 'Every public report is reviewable, attributable and retained. The platform records who approved a report, when it was published and which source record it came from.',
    status: 'In build',
    tone: 'blue',
  },
  {
    title: 'Shareholder records',
    body: 'Access requires an authenticated request, identity verification and an explicit administrator approval. Shareholders see only their own verified positions and voting records.',
    status: 'Controlled',
    tone: 'green',
  },
  {
    title: 'Related-party and insider policy',
    body: 'Related-party transactions, insider trading restrictions and conflicts policies will be adopted before a public listing. No policy is represented as adopted until it appears in the document library.',
    status: 'To be adopted',
    tone: 'amber',
  },
  {
    title: 'Transfer agent and registrar',
    body: 'A qualified transfer agent has not been engaged. This platform is a private evidence and access system, not a transfer agent or official share register.',
    status: 'Not engaged',
    tone: 'amber',
  },
];

export const TB_IR_POLICY = [
  'Publish approved information only. A status label is not evidence of completion.',
  'Never publish a share price, market capitalisation, volume, order book or listing claim without a live listed security and licensed data.',
  'Finance figures must come from an identified accounting record, carry an auditor status and show the approving authority.',
  'IPO milestones are complete only when a named evidence record is attached. The platform rejects completion without evidence.',
  'Shareholder identity, ownership and voting records stay private. No public page exposes an individual holding.',
  'TB equity and TBC records remain separate in data, display, permissions and reporting.',
  'An investor assistant may explain approved public information only. It must refuse invented figures, confidential records, forecasts, guarantees and investment recommendations.',
];

export const TB_FAQ = [
  {
    q: 'Is TB publicly traded?',
    a: 'No. TB is a proposed future ticker. The company is pre-IPO, no shares are offered or traded through this website, and no exchange listing or regulatory approval has been granted.',
  },
  {
    q: 'Can I buy TB shares?',
    a: 'No. There is no public market, broker connection, order book or purchase flow. Any future offering would require a separate legal process, approved disclosure and the applicable registrations or exemptions.',
  },
  {
    q: 'Is TB the same as TBC?',
    a: 'No. TB is proposed equity. TBC is a separate proposed blockchain asset. TBC does not represent shares, equity, dividends or ownership in TradingBible, Inc. Supply, balances and risk are kept separate.',
  },
  {
    q: 'What stage is the IPO process at?',
    a: 'Preparation only. The readiness dashboard lists the workstreams that must be completed. It does not imply that an application has been filed, that an underwriter has been engaged or that Nasdaq has approved anything.',
  },
  {
    q: 'How can existing shareholders access their records?',
    a: 'Sign in, request access from the shareholder portal and complete identity verification. An administrator must approve the request before any position, certificate or voting record becomes visible. The portal is read-only and does not execute transfers.',
  },
  {
    q: 'Where do financial numbers come from?',
    a: 'Only from an approved financial report with an identified source note and auditor status. If no approved report is published, the site shows an empty state rather than estimated, annualised or fabricated figures.',
  },
  {
    q: 'How do I receive investor updates?',
    a: 'Use the subscription form. You will receive a confirmation email and can unsubscribe at any time. An update subscription does not create a shareholder relationship or provide access to private records.',
  },
  {
    q: 'Who do I contact?',
    a: 'Email support@tradingbible.app or use the investor relations contact form. Do not send original signed documents, passwords, private keys or full bank details through the form.',
  },
];

export const TB_REPORTING_PRINCIPLES = [
  'Report on a calendar-year basis unless an adopted fiscal year is disclosed.',
  'Label every report as unaudited, reviewed or audited. Never upgrade an auditor status without an engagement and a report.',
  'Show the period, currency, source record and approval date alongside the figures.',
  'Publish corrections and restatements in the same library as the original report, with version history.',
  'Do not present annualised runs, projections or pre-revenue proxies as reported results.',
];

export const TB_IPO_PHASES = [
  { id: 'Corporate', label: 'Corporate conversion', note: 'Entity, charter, board and governance foundation.' },
  { id: 'Governance', label: 'Governance & controls', note: 'Board independence, committees and disclosure controls.' },
  { id: 'Financial reporting', label: 'Financial reporting', note: 'Audited statements and accounting systems.' },
  { id: 'Equity', label: 'Equity & registry', note: 'Cap-table reconciliation and a qualified transfer agent.' },
  { id: 'Regulatory', label: 'Regulatory', note: 'Securities counsel, registration and disclosure review.' },
  { id: 'Transaction', label: 'Transaction', note: 'Underwriters, diligence and roadshow preparation.' },
  { id: 'Exchange', label: 'Exchange', note: 'Eligibility assessment and final listing review.' },
];

export const TB_DOC_CATEGORIES = [
  'Corporate',
  'Governance',
  'Financial',
  'IPO',
  'Shareholder',
  'Policy',
  'Risk',
  'Other',
];

export function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDate(value, fallback = 'Not published') {
  if (!value) return fallback;
  const raw = String(value);
  // Date-only records are calendar dates, not UTC instants. Parsing them as
  // local midnight keeps a recorded issue or meeting date from shifting a day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function milestoneTone(status) {
  return status === 'complete' ? 'green' : status === 'in_progress' ? 'blue' : status === 'blocked' ? 'red' : 'muted';
}

export function milestoneLabel(status) {
  return ({
    complete: 'Complete',
    in_progress: 'In progress',
    blocked: 'Blocked',
    not_started: 'Not started',
  })[status] || 'Not started';
}
