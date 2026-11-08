// TradingBible Capital — proposed hedge fund / asset-management division.
// This file is public copy only. It must never carry an AUM figure, return,
// track record, fund registration, auditor, administrator or prime-broker
// claim until an approved evidence record exists.

export const FUND_ENTITY = {
  name: 'TradingBible Capital',
  owner: 'TradingBible Holdings, Inc.',
  status: 'In formation',
  fundVehicle: 'No fund vehicle formed',
  investorAccess: 'Closed — no solicitation',
  aum: 'Not disclosed',
  trackRecord: 'Not available',
  regulator: 'No investment-adviser registration or exemption confirmed',
  contact: 'support@tradingbible.app',
};

export const FUND_STATUS = [
  {
    label: 'Legal entity',
    value: 'Parent only',
    note: 'TradingBible Holdings, Inc. owns the platform. A separate fund entity has not been formed.',
    tone: 'amber',
  },
  {
    label: 'Fund vehicle',
    value: 'None',
    note: 'No LP/GP, feeder, master fund, series or collective investment vehicle exists.',
    tone: 'red',
  },
  {
    label: 'Outside capital',
    value: 'Not accepted',
    note: 'No subscription, capital call, custody account or investor money is accepted.',
    tone: 'red',
  },
  {
    label: 'Track record',
    value: 'Not published',
    note: 'No audited or verified return series, AUM, Sharpe, drawdown or attribution is presented.',
    tone: 'amber',
  },
];

export const FUND_STRATEGIES = [
  {
    title: 'Global macro & FX',
    body: 'A discretionary and rules-assisted mandate around rates, inflation, central-bank policy, currency carry, intervention and event risk.',
    tags: ['FX', 'Rates', 'Macro'],
  },
  {
    title: 'Systematic futures & trend',
    body: 'A multi-market trend and volatility-targeting research sleeve across index, rate, FX, energy and metal futures.',
    tags: ['Futures', 'Trend', 'Vol targeting'],
  },
  {
    title: 'Digital assets relative value',
    body: 'Market-neutral research around basis, funding, liquidity and cross-venue dislocations — not directional token exposure.',
    tags: ['Basis', 'Funding', 'Market neutral'],
  },
  {
    title: 'Multi-asset risk overlay',
    body: 'One portfolio-level risk budget across correlation regimes, drawdown, liquidity, counterparty and execution risk.',
    tags: ['Risk', 'Correlation', 'Liquidity'],
  },
];

export const FUND_OPERATING_MODEL = [
  {
    title: 'Investment committee',
    body: 'Mandate, position limits, strategy allocation and escalation. Committee charter and named members are not yet adopted.',
    status: 'To be adopted',
    tone: 'amber',
  },
  {
    title: 'Risk & drawdown',
    body: 'Pre-trade limits, stress tests, liquidity buckets, exposure caps and a documented de-risking playbook.',
    status: 'Designed',
    tone: 'blue',
  },
  {
    title: 'Execution & TCA',
    body: 'OMS/EMS controls, broker and venue selection, best-execution review and transaction-cost analysis.',
    status: 'Designed',
    tone: 'blue',
  },
  {
    title: 'Fund administration',
    body: 'Independent NAV, investor register, capital accounts, fee accruals and reconciliation. No administrator is engaged.',
    status: 'Not engaged',
    tone: 'red',
  },
  {
    title: 'Custody & prime brokerage',
    body: 'Segregated custody and prime-broker arrangements are required before any outside capital is accepted.',
    status: 'Not engaged',
    tone: 'red',
  },
  {
    title: 'Compliance & AML',
    body: 'Investment-adviser analysis, AML/KYC, sanctions screening, marketing rules, code of ethics and record retention.',
    status: 'Draft only',
    tone: 'amber',
  },
];

export const FUND_READINESS = [
  ['Fund entity and jurisdiction', 'Pending', 'A separate fund vehicle, jurisdiction and tax analysis must be approved before any subscription.'],
  ['Investment-adviser registration or exemption', 'Pending', 'Securities counsel must confirm the applicable registration, exemption and marketing route.'],
  ['Private placement memorandum', 'Not drafted', 'No PPM, subscription agreement, limited partnership agreement or risk disclosure is published.'],
  ['Independent auditor', 'Not engaged', 'No audit engagement, audited financials or verified performance series exists.'],
  ['Fund administrator and NAV', 'Not engaged', 'No independent NAV, capital-account or investor-register process is live.'],
  ['Prime broker and custodian', 'Not engaged', 'No prime-brokerage, custody, segregation or reconciliation arrangement is in place.'],
  ['AML/KYC and investor onboarding', 'Designed', 'The platform has identity and support rails, but no fund-specific onboarding or eligibility process is live.'],
  ['Compliance manual and code of ethics', 'Draft only', 'Policies must be adopted, tested and evidenced before launch.'],
  ['Insurance and business continuity', 'Pending', 'Fund-level insurance, disaster recovery and operational-resilience review are not complete.'],
  ['Seed capital and track record', 'Not available', 'No seed commitment, live track record or verified attribution is presented.'],
  ['Regulatory and marketing review', 'Pending', 'No jurisdiction has cleared the fund, the offering or the marketing materials.'],
  ['Platform infrastructure', 'Built', 'The TradingBible platform, ledger, reporting and support surfaces already exist.'],
];

export const FUND_GOVERNANCE = [
  {
    title: 'Separate legal stack',
    body: 'TradingBible Holdings, Inc. owns and operates the platform. Any future fund must be a separate entity with its own governing documents, accounts and investor records.',
  },
  {
    title: 'No commingling',
    body: 'Platform operating cash, member wallet balances, TBC credits and any future fund capital must remain separate. No client or investor money is accepted today.',
  },
  {
    title: 'TBC is not a fund interest',
    body: 'TBC is a proposed in-app digital asset, not equity, a share class, a fund unit or a claim on any future fund.',
  },
  {
    title: 'Prop desk is separate',
    body: 'TradingBible Funded is an evaluation and prop-desk product. It is not a hedge fund, a pooled vehicle or an investment in TradingBible Capital.',
  },
  {
    title: 'Evidence before performance',
    body: 'No return, AUM, Sharpe, drawdown or attribution figure is published without an approved source record and a clear audit status.',
  },
  {
    title: 'Conflicts and related parties',
    body: 'Related-party transactions, allocation policies, personal trading and conflicts rules must be adopted before any outside capital is managed.',
  },
];

export const FUND_FAQ = [
  {
    q: 'Is TradingBible Capital an open hedge fund?',
    a: 'No. It is a proposed asset-management division. No fund vehicle has been formed, no investor is being solicited and no outside capital is managed.',
  },
  {
    q: 'Can I invest or request an allocation?',
    a: 'No. There is no offering, subscription flow, capital call or allocation. A future offering would require a separate legal process, approved disclosure and the applicable registrations or exemptions.',
  },
  {
    q: 'Do you publish AUM or performance?',
    a: 'No. There is no verified track record, audited return series or AUM figure. The platform does not invent one.',
  },
  {
    q: 'Is TradingBible Funded the same as the fund?',
    a: 'No. TradingBible Funded is a prop-desk evaluation product. It is separate from any future fund vehicle, capital pool or investor offering.',
  },
  {
    q: 'Is TBC a fund interest?',
    a: 'No. TBC is a proposed in-app digital asset, not equity, a fund unit, a share class or a claim on fund assets.',
  },
  {
    q: 'What must happen before the fund can open?',
    a: 'Entity formation, investment-adviser analysis, fund documents, independent administration, audit, custody, prime brokerage, AML/KYC, compliance, insurance, seed capital and regulatory review. Those gates are listed on this page and remain open.',
  },
  {
    q: 'Where are the fund documents?',
    a: 'No approved fund document is published. When a document is approved, it will appear here with its version, approval status and source record.',
  },
  {
    q: 'How do I contact the team?',
    a: 'Use the contact page and select “Fund inquiry”. Do not send original signed documents, passwords, private keys or full bank details.',
  },
];

export const FUND_DOCUMENTS = [
  { title: 'Private placement memorandum', status: 'Not drafted' },
  { title: 'Limited partnership agreement', status: 'Not drafted' },
  { title: 'Subscription agreement', status: 'Not drafted' },
  { title: 'Investment management agreement', status: 'Not drafted' },
  { title: 'Risk disclosure and offering supplement', status: 'Not drafted' },
  { title: 'Compliance manual and code of ethics', status: 'Draft only' },
];
