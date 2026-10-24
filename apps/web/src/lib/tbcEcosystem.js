// TBC ecosystem — shared public and in-app source of truth.
// Phase 1 is deliberately an information + account-management product:
// no token is issued, no sale is open, and no regulated function is active.
// These figures are the corrected October 2026 working scenario, not an
// adopted allocation or a representation of circulating supply.

export const TBC_PROPOSAL = {
  name: 'TradingBible Coin',
  ticker: 'TBC',
  entity: 'TradingBible LLC',
  jurisdiction: 'Delaware, United States',
  supply: 100_000_000,
  supplyLabel: '100,000,000 TBC',
  decimals: 18,
  phase: 'Phase 1 — information & account management',
  status: 'Proposal stage',
  issuance: 'No token issued',
  sale: 'Sale disabled',
  network: 'Base evaluation → proposed TradingBible Chain',
  updated: 'October 2026',
  notice:
    'TBC is a proposed digital asset. These materials are a development proposal, not an offer, solicitation, investment recommendation, or evidence that token issuance, a public sale, staking, governance or a blockchain is operational.',
};

export const TBC_ALLOCATION = [
  {
    key: 'ecosystem',
    label: 'Ecosystem & development',
    pct: 30,
    amount: '30,000,000',
    color: '#d4af37',
    note: 'Ecosystem programmes, integration work and development funding. Subject to documented approvals.',
  },
  {
    key: 'community',
    label: 'Community incentives',
    pct: 20,
    amount: '20,000,000',
    color: '#38bdf8',
    note: 'Participation, education and contribution rewards. Campaign rules must be published before use.',
  },
  {
    key: 'public',
    label: 'Public distribution',
    pct: 20,
    amount: '20,000,000',
    color: '#f472b6',
    note: 'Potential eligible-purchaser distribution only after legal, compliance and technical clearance.',
  },
  {
    key: 'treasury',
    label: 'Treasury & reserves',
    pct: 15,
    amount: '15,000,000',
    color: '#34d399',
    note: 'Proposed treasury reserve with dual approval, segregation and periodic reporting controls.',
  },
  {
    key: 'team',
    label: 'Team & contributors',
    pct: 10,
    amount: '10,000,000',
    color: '#a855f7',
    note: 'Proposed 12-month cliff followed by 36 months of monthly vesting.',
  },
  {
    key: 'liquidity',
    label: 'Liquidity provisioning',
    pct: 5,
    amount: '5,000,000',
    color: '#f59e0b',
    note: 'Only if a lawful venue and market structure are approved; not a promise of listing or liquidity.',
  },
];

export const TBC_SUPPLY_LIFECYCLE = [
  { label: 'Proposed maximum supply', value: '100,000,000 TBC', status: 'Proposal' },
  { label: 'Issued supply', value: '0 TBC', status: 'Not issued' },
  { label: 'Circulating supply', value: 'Not applicable', status: 'Not measured' },
  { label: 'Locked / vesting', value: 'No schedules recorded', status: 'Not active' },
  { label: 'Treasury holdings', value: 'Not configured', status: 'Not active' },
  { label: 'Burned', value: '0 TBC', status: 'No token' },
];

export const TBC_ROADMAP = [
  {
    phase: '01',
    title: 'Foundation and product design',
    short: 'Public information, proposal tokenomics, design system, account experience and document control.',
    status: 'in-progress',
    gate: 'Phase 1 build',
  },
  {
    phase: '02',
    title: 'Compliance and internal systems',
    short: 'Jurisdiction rules, KYC workflows, treasury ledger, approvals, audit events and payment-provider evaluation.',
    status: 'planned',
    gate: 'Counsel + control evidence',
  },
  {
    phase: '03',
    title: 'Base token and private testing',
    short: 'Testnet token, wallet integration, vesting contracts, indexing, security tests and supply reconciliation.',
    status: 'planned',
    gate: 'Technical readiness',
  },
  {
    phase: '04',
    title: 'Authorized token distribution',
    short: 'Only if legally permitted: activate approved purchaser eligibility, payments, allocation, delivery and refunds.',
    status: 'gated',
    gate: 'Legal + payment + launch authorization',
  },
  {
    phase: '05',
    title: 'Utility and ecosystem integration',
    short: 'Enable validated TBC payment utilities, developer services and other delivered functions.',
    status: 'gated',
    gate: 'Delivered service + pricing evidence',
  },
  {
    phase: '06',
    title: 'TradingBible Chain developer testnet',
    short: 'Prototype chain, nodes, explorer, validator tools, native economics and reproducible demonstrations.',
    status: 'planned',
    gate: '$50K testnet work packages',
  },
  {
    phase: '07',
    title: 'Independent audits and public testnet',
    short: 'Security findings, fixes, public testing, economics review, operator participation and observation period.',
    status: 'planned',
    gate: 'Independent audit',
  },
  {
    phase: '08',
    title: 'Gated mainnet and migration',
    short: 'Launch only after legal, technical, operational and security approvals; migrate without duplicate supply.',
    status: 'gated',
    gate: 'All launch gates',
  },
];

export const TBC_MODULES = [
  { id: 'website', title: 'TBC public website', detail: 'Token overview, utility, roadmap, whitepaper, FAQs and risks.', status: 'ready', route: '/tbc' },
  { id: 'dashboard', title: 'TBC dashboard', detail: 'Holdings, balances, activity, eligibility and status.', status: 'phase-one', route: '/app/tbc' },
  { id: 'wallet', title: 'Wallet', detail: 'Non-custodial addresses, supported networks and transaction history.', status: 'phase-one', route: '/app/tbc/wallet' },
  { id: 'purchase', title: 'Token purchase', detail: 'Price, quote, KYC, checkout, payment, allocation and receipt.', status: 'gated', route: '/app/tbc/buy' },
  { id: 'tokenomics', title: 'Tokenomics', detail: '100M proposal, allocation, vesting and supply lifecycle.', status: 'phase-one', route: '/tbc/tokenomics' },
  { id: 'vesting', title: 'Vesting portal', detail: 'Schedules, cliffs, unlock calendar and claimable amounts.', status: 'gated', route: '/app/tbc/vesting' },
  { id: 'staking', title: 'Staking', detail: 'Pools, lock periods, reward rules, unstaking and history.', status: 'gated', route: '/app/tbc/staking' },
  { id: 'governance', title: 'Governance', detail: 'Proposals, discussion, voting, delegation and execution records.', status: 'gated', route: '/app/tbc/governance' },
  { id: 'utility', title: 'TBC utility center', detail: 'Eligible services, TBC payments, benefits and usage history.', status: 'planned', route: '/tbc/utility' },
  { id: 'chain', title: 'TradingBible Chain', detail: 'Network overview, validators, explorer and status.', status: 'planned', route: '/chain' },
  { id: 'migration', title: 'Migration portal', detail: 'Base-to-chain conversion, locking, finality and reconciliation.', status: 'gated', route: '/app/tbc/migrate' },
  { id: 'developers', title: 'Developer platform', detail: 'API keys, SDKs, webhooks, sandbox and documentation.', status: 'planned', route: '/developers/tbc' },
  { id: 'compliance', title: 'Compliance portal', detail: 'Identity checks, country eligibility, screening and cases.', status: 'gated', route: '/tbc/compliance' },
  { id: 'support', title: 'Support center', detail: 'Refund requests, complaints, disputes and help articles.', status: 'phase-one', route: '/app/tbc/support' },
  { id: 'admin', title: 'Admin control center', detail: 'Issuance, permissions, treasury, approvals and audit records.', status: 'phase-one', route: '/admin/tbc' },
];

export const TBC_UTILITIES = [
  {
    icon: 'terminal',
    title: 'Trading tools & subscriptions',
    body: 'A proposed TBC payment option for eligible premium tools, analytics, terminal features and educational products, always with the actual fiat-equivalent price, conversion quote, fees and refund terms.',
    status: 'Review',
  },
  {
    icon: 'radar',
    title: 'Market intelligence',
    body: 'Potential utility across order flow, heatmaps, indicators, backtesting, trade journal, trading coach and research reports. These are services, never promised investment returns.',
    status: 'Proposal',
  },
  {
    icon: 'code',
    title: 'Developer & enterprise services',
    body: 'Potential TBC settlement for API usage, developer tooling, white-label chart services, data access and platform integrations, subject to delivery, licensing and capacity.',
    status: 'Proposal',
  },
  {
    icon: 'network',
    title: 'Network fees & staking',
    body: 'If TradingBible Chain launches, TBC could serve as its native fee and staking asset. Governance and validator participation remain planned until delivered and independently reviewed.',
    status: 'Planned',
  },
];

export const TBC_UTILITY_LEDGER_FIELDS = [
  'Service name',
  'Service owner',
  'Availability',
  'Jurisdiction',
  'Pricing method',
  'Contract address (if applicable)',
  'Production-test evidence',
];

export const TBC_PURCHASE_STEPS = [
  { n: '01', title: 'Create account', body: 'Email, passkey and account security.', status: 'available' },
  { n: '02', title: 'Verify eligibility', body: 'Identity, location, sanctions and purchaser category.', status: 'gated' },
  { n: '03', title: 'Review offering', body: 'Whitepaper, risks, terms, fees and pricing.', status: 'ready' },
  { n: '04', title: 'Choose payment', body: 'Approved card, bank or digital-asset method only.', status: 'gated' },
  { n: '05', title: 'Confirm order', body: 'Accepted terms, quote and order reference.', status: 'gated' },
  { n: '06', title: 'Settle and allocate', body: 'Payment reconciliation and compliance approval.', status: 'gated' },
  { n: '07', title: 'Receive TBC', body: 'Verified wallet delivery or agreed custody arrangement.', status: 'gated' },
  { n: '08', title: 'Receipt and support', body: 'Transaction record, complaint and refund channel.', status: 'support-only' },
];

export const TBC_PURCHASE_CONTROLS = [
  'Approved payment methods and signed provider contracts',
  'Custody model, wallet controller and key-management evidence',
  'Jurisdiction gating, KYC vendor and sanctions controls',
  'Final refund triggers, time limits and consumer-law review',
  'End-to-end payment, delivery and reconciliation testing',
  'Written legal clearance and launch authorization',
];

export const TBC_JURISDICTIONS = [
  { market: 'United States', approach: 'Securities offering, federal/state financial regulation and purchaser classification.', status: 'Not cleared' },
  { market: 'Nigeria', approach: 'SEC and other applicable digital-asset, payments and marketing requirements.', status: 'Not cleared' },
  { market: 'European Economic Area', approach: 'MiCA and relevant national requirements.', status: 'Not cleared' },
  { market: 'United Kingdom', approach: 'Financial promotions and cryptoasset requirements.', status: 'Not cleared' },
  { market: 'Canada', approach: 'Provincial securities and dealer/custody requirements.', status: 'Not cleared' },
  { market: 'Other countries', approach: 'Country-by-country review before onboarding.', status: 'Not cleared' },
];

export const TBC_ELIGIBILITY_SIGNALS = [
  'Declared residence and verified identity documents',
  'Payment origin and beneficiary checks',
  'IP and geolocation signals (never the sole decision)',
  'Wallet screening and ongoing sanctions checks',
  'Purchaser classification and source-of-funds evidence',
  'Dated jurisdiction decision with counsel and go-live authorization',
];

export const TBC_SEPARATION = {
  software: [
    'Trading terminal, charts, indicators and research',
    'Trade journal, analytics and education',
    'Order flow, heatmaps and market data',
    'TBC utility and token services',
    'TBC credit and token distribution records',
    'APIs, developer tools and integrations',
  ],
  brokerage: [
    'Trade execution and order routing',
    'Customer trading accounts',
    'Brokerage margin and leverage',
    'Client-money custody and safeguarding',
    'Brokerage deposit and withdrawal ledger',
    'Regulated broker account onboarding',
  ],
  rule:
    'A TBC balance must never be represented as a brokerage deposit, margin balance or protected trading account balance unless a separately lawful product supports that treatment.',
};

export const TBC_STAKING = {
  status: 'Future — subject to chain review',
  parameters: [
    ['Unbonding', '21 days'],
    ['Max commission', '10%'],
    ['Min self-bond', '100,000 TBC'],
    ['Active set', '21 validators'],
    ['Subsidy cap', '8% APR illustrative'],
  ],
  pools: [
    { name: 'Foundation validators', status: 'Planned', note: 'No delegation or rewards are live.' },
    { name: 'Community validators', status: 'Planned', note: 'Operator onboarding is not open.' },
    { name: 'Testnet observations', status: 'Preview', note: 'Local preview only; no real funds.' },
  ],
};

export const TBC_GOVERNANCE = {
  status: 'Future — no vote is open',
  scope: [
    'Selected ecosystem parameters and service priorities',
    'Validator or chain parameters if the network launches',
    'Treasury reporting standards, subject to reserved powers',
  ],
  reserved: [
    'Token issuance and supply changes',
    'Legal, regulatory and listing decisions',
    'Treasury transfers below approved control thresholds',
    'Any action requiring a licensed entity or professional approval',
  ],
  agenda: [
    { id: 'TBC-GOV-001', title: 'Ratify the initial allocation scenario', status: 'Draft', note: 'Requires counsel and management approval; no vote is open.' },
    { id: 'TBC-GOV-002', title: 'Validator onboarding parameters', status: 'Draft', note: 'Depends on developer testnet results.' },
    { id: 'TBC-GOV-003', title: 'Treasury reporting standard', status: 'Draft', note: 'Requires controls and independent review.' },
  ],
};

export const TBC_MIGRATION = {
  status: 'Planned',
  source: 'Base (potential initial deployment)',
  target: 'TradingBible Chain (proposed)',
  rule: 'One canonical supply accounting model. A user must never be able to spend a TBC unit on Base and simultaneously spend a corresponding newly issued unit on TradingBible Chain.',
  gates: [
    'Independent contract and bridge review',
    'Supply reconciliation and liability proofs',
    'Finality, replay and failed-migration recovery tests',
    'Legal and operational launch authorization',
  ],
};

export const TBC_RISKS = [
  { title: 'Regulatory classification and licensing', level: 'High', body: 'Digital assets, payments, custody and any brokerage activity may require registrations, licences or exemptions that do not yet exist. No jurisdiction has cleared a sale.' },
  { title: 'Token utility and adoption', level: 'High', body: 'TBC may not achieve sufficient utility or demand. Planned services may change, be delayed or never launch.' },
  { title: 'Liquidity and transferability', level: 'High', body: 'No listing, market maker, transferability or redemption right is promised. A token could be illiquid or non-transferable.' },
  { title: 'Technology and smart contracts', level: 'High', body: 'Contracts, wallets, bridges and chain software can contain defects, be exploited, or fail under load. Independent audits are a gate, not a guarantee.' },
  { title: 'Custody and key management', level: 'High', body: 'Self-custody mistakes can be irreversible. Any future custody arrangement requires documented control, reconciliation and liability allocation.' },
  { title: 'Payments and refunds', level: 'Medium', body: 'Card, bank and digital-asset payments can fail, be reversed, or create sanctions and consumer-law obligations. Refund paths must be tested before activation.' },
  { title: 'Conflicts and market conduct', level: 'Medium', body: 'Issuer, treasury, market-data and potential brokerage roles create conflicts. Separate controls and disclosures are required.' },
  { title: 'Data protection and privacy', level: 'Medium', body: 'KYC, location and wallet screening involve personal data. Retention, access and cross-border transfer rules apply.' },
  { title: 'Brokerage separation', level: 'High', body: 'Token activity is not brokerage activity. Commingling TBC balances with client money or implying insured/protected status is prohibited.' },
  { title: 'Third-party dependency', level: 'Medium', body: 'Providers, chains, data vendors and validators may fail or change terms. Continuity and exit plans are required.' },
];

export const TBC_FAQS = [
  { q: 'Is TBC live?', a: 'No. TBC is a proposed digital asset. No token has been issued, no public sale is open, and staking, governance and TradingBible Chain are not operational.' },
  { q: 'Can I buy TBC now?', a: 'No. The purchase journey is designed and displayed, but payment collection is disabled until legal, compliance, custody, payment and security gates are satisfied.' },
  { q: 'What is the maximum supply?', a: 'The proposed maximum supply is 100,000,000 TBC. The 30/20/20/15/10/5 allocation is a corrected working scenario, not an adopted distribution.' },
  { q: 'What is the difference between TBC credits and the proposed token?', a: 'TBC credits are the existing off-chain platform accounting unit used for eligible in-app services. The proposed TBC token is a separate digital asset that has not been issued. The app labels each balance separately.' },
  { q: 'Is staking available?', a: 'No live staking is available. The staking screen is an illustrative testnet preview; no real funds, rewards or validator participation are active.' },
  { q: 'Is TBC a brokerage account or deposit?', a: 'No. TBC is separate from any brokerage activity. A TBC balance is not a brokerage deposit, margin balance or protected client-money balance.' },
  { q: 'Which countries are eligible?', a: 'None have been cleared. The United States, Nigeria, the EEA, the UK, Canada and other markets remain under assessment.' },
  { q: 'Where are the legal documents?', a: 'The five public summaries are available in the TBC document library. The 26 corporate and governance instruments are maintained in the controlled admin legal vault because they contain confidential issuer information.' },
];

export const TBC_SUPPORT_CATEGORIES = [
  'Account access',
  'TBC credits',
  'Proposed TBC token',
  'Eligibility or legal question',
  'Security or suspicious activity',
  'Other',
];

export const TBC_CHAIN = {
  name: 'TradingBible Chain',
  symbol: 'TBC',
  status: 'Planned — developer testnet not open',
  framework: 'Cosmos SDK + CometBFT + Cosmos EVM baseline (proposed)',
  supply: '100,000,000 TBC proposed maximum',
  nativeUse: 'Network fees and staking (planned)',
  explorer: 'No public explorer is live',
  notes: [
    'The chain is an evaluation path, not a launched network.',
    'Base may be used for an initial deployment if lawful and technically ready.',
    'Migration requires one canonical supply ledger and independent bridge review.',
    'No validator, block, transaction or TVL figure on this page is live chain data.',
  ],
  validators: [
    ['Consensus', 'CometBFT (proposed)'],
    ['Active set', '21 validators (proposed)'],
    ['Unbonding', '21 days (proposed)'],
    ['Slashing', 'Double-sign and downtime rules subject to review'],
    ['Governance', 'Planned; reserved powers remain with the issuer'],
    ['RPC / explorer', 'Not available'],
  ],
};

export const TBC_DEVELOPER_ENDPOINTS = [
  { method: 'GET', path: '/tbc', desc: 'Public TBC registry and activation status.', auth: 'Public' },
  { method: 'GET', path: '/tbc/econ', desc: 'Platform credit configuration and rate.', auth: 'Public' },
  { method: 'GET', path: '/tbc/ecosystem', desc: 'Phase, proposed supply, feature gates and document counts.', auth: 'Public' },
  { method: 'GET', path: '/tbc/documents', desc: 'Public TBC summary document metadata.', auth: 'Public' },
  { method: 'GET', path: '/tbc/documents/:slug/file', desc: 'Public summary PDF (inline).', auth: 'Public' },
  { method: 'GET', path: '/tbc/account', desc: 'Credits, activity, eligibility and proposed-token status for the signed-in user.', auth: 'Bearer' },
  { method: 'POST', path: '/tbc/support', desc: 'Open a support request routed to the TBC admin queue.', auth: 'Bearer' },
];

export const TBC_STATUS_TONES = {
  ready: { label: 'Available', className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400' },
  'phase-one': { label: 'Phase 1', className: 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]' },
  gated: { label: 'Gated', className: 'border-amber-400/25 bg-amber-400/10 text-amber-400' },
  planned: { label: 'Planned', className: 'border-sky-400/25 bg-sky-400/10 text-sky-400' },
  future: { label: 'Future', className: 'border-white/10 bg-white/5 text-[#8a8577]' },
  'in-progress': { label: 'In progress', className: 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]' },
  available: { label: 'Available', className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400' },
  'support-only': { label: 'Support open', className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400' },
};
