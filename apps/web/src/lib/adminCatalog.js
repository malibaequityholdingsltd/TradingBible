// Canonical commercial and company facts used by the operator suite.
//
// The public product has two plans only: Free and TradingBible Premium.
// Pro / Elite / Professional / Teams remain here solely so historical rows can
// still be read and displayed honestly. They are never presented as current
// public plans and they must not be used to invent MRR.

import { PLANS } from '@/lib/mockData';

export const GOLD = '#d4af37';

export const PREMIUM_MONTHLY = 19.99;
export const PREMIUM_ANNUAL = 199;
export const PREMIUM_MONTHLY_EQUIVALENT = Number((PREMIUM_ANNUAL / 12).toFixed(2));
export const PREMIUM_ANNUAL_SAVING = Number((PREMIUM_MONTHLY * 12 - PREMIUM_ANNUAL).toFixed(2));

export const PUBLIC_PLANS = PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  annualPrice: plan.annualPrice ?? null,
  period: plan.period,
  annualPeriod: plan.annualPeriod ?? null,
  tagline: plan.tagline,
  features: plan.features,
}));

export const LEGACY_PLAN_ALIASES = {
  pro: { publicId: 'premium', label: 'Premium', monthly: PREMIUM_MONTHLY, tone: 'gold' },
  elite: { publicId: 'premium', label: 'Premium', monthly: PREMIUM_MONTHLY, tone: 'gold' },
  professional: { publicId: 'enterprise', label: 'Enterprise', monthly: null, enterprise: true, tone: 'violet' },
  teams: { publicId: 'enterprise', label: 'Enterprise', monthly: null, enterprise: true, tone: 'violet' },
};

// Compatibility map for screens that still index by raw plan. Enterprise
// rows return 0 because their contract value is not stored in the user row.
export const PLAN_PRICES = {
  free: 0,
  premium: PREMIUM_MONTHLY,
  pro: PREMIUM_MONTHLY,
  elite: PREMIUM_MONTHLY,
  professional: 0,
  teams: 0,
  enterprise: 0,
};

export const PLAN_COLORS = {
  none: '#6a665a',
  free: '#6a665a',
  premium: GOLD,
  pro: GOLD,
  elite: GOLD,
  professional: '#a855f7',
  teams: '#a855f7',
  enterprise: '#a855f7',
};

export const PAID_PLANS = ['premium', 'pro', 'elite', 'professional', 'teams'];
export const ENTERPRISE_PLAN_IDS = ['professional', 'teams'];
export const PUBLIC_PLAN_IDS = ['free', 'premium'];

export const ASSIGNABLE_PLANS = [
  { value: '', label: 'Free / no paid plan' },
  { value: 'free', label: 'Free account' },
  { value: 'premium', label: `Premium — $${PREMIUM_MONTHLY}/mo or $${PREMIUM_ANNUAL}/yr` },
  { value: 'professional', label: 'Enterprise — quoted separately' },
];

export const ACADEMY_TIERS = [
  { id: 'individual', name: 'Individual', price: 150, learners: 1 },
  { id: 'pro', name: 'Pro', price: 199, learners: 1, note: 'Commercial internal-training licence' },
  { id: 'family', name: 'Family', price: 299, learners: 4 },
  { id: 'teams', name: 'Teams', price: 499, learners: 10 },
];

export const ACADEMY_MINIMUM_PRICE = Math.min(...ACADEMY_TIERS.map((tier) => tier.price));

export const FUNDED_FACTS = {
  products: 16,
  maxAccount: 200000,
  maxSplit: 90,
  payoutDays: 14,
  standardSplit: 80,
};

export const COMPANY_FACTS = {
  brand: 'TradingBible',
  legalName: 'TradingBible Holdings, Inc.',
  formation: 'Delaware corporation',
  website: 'https://tradingbible.app',
  launchDate: '25 December 2026',
  launchDateIso: '2026-12-25',
  plans: [
    { name: 'Free account', price: '$0', billing: 'Forever' },
    { name: 'TradingBible Premium', price: `$${PREMIUM_MONTHLY}/month or $${PREMIUM_ANNUAL}/year`, billing: 'Card or USD wallet (monthly); card only (annual)' },
  ],
  academy: {
    paths: 17,
    courses: 76,
    lessons: 347,
    tiers: ACADEMY_TIERS,
    note: 'Academy tuition is separate from the platform subscription.',
  },
  funded: FUNDED_FACTS,
  tbc: {
    maxSupply: 100000000,
    issued: 0,
    saleEnabled: false,
    note: 'Proposed token. Not issued, not listed, not for sale.',
  },
  fundraising: {
    packetDocuments: 20,
    status: 'Private preparation only — no public offering is open.',
    gate: 'FUNDRAISING_EXECUTION_ENABLED is not enabled.',
  },
  communications: {
    templates: 45,
    channels: ['Email', 'SMS', 'In-app'],
    note: 'Admin test-send only. SMS remains design-only until a provider, consent records and opt-out handling exist.',
  },
  team: 'Company employees — not Academy staff.',
  support: 'support@tradingbible.app',
  legal: 'legal@tradingbible.app',
};

export function planKey(plan) {
  if (!plan || plan === 'trial') return null;
  return String(plan).toLowerCase();
}

export function isPaidPlan(plan) {
  return PAID_PLANS.includes(planKey(plan));
}

export function displayPlan(plan) {
  return planKey(plan) || 'none';
}

// Collapse historical account values into the current public commercial
// structure: Free, Premium, or Enterprise (quoted separately). No admin
// surface should present a retired plan name or a zero-count legacy row.
export function publicPlanKey(plan) {
  const key = planKey(plan);
  if (!key) return 'none';
  if (key === 'pro' || key === 'elite') return 'premium';
  if (key === 'professional' || key === 'teams') return 'enterprise';
  if (key === 'premium' || key === 'free' || key === 'enterprise') return key;
  return key;
}

export function planDisplayLabel(plan) {
  const key = publicPlanKey(plan);
  if (key === 'none') return 'Free / no paid plan';
  if (key === 'free') return 'Free';
  if (key === 'premium') return 'Premium';
  if (key === 'enterprise') return 'Enterprise';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function planTone(plan) {
  const key = publicPlanKey(plan);
  if (key === 'none' || key === 'free') return 'muted';
  if (key === 'premium') return 'gold';
  if (key === 'enterprise') return 'violet';
  return 'muted';
}

export function planMonthlyPrice(plan) {
  const key = planKey(plan);
  if (!key || key === 'free') return 0;
  if (key === 'premium' || key === 'pro' || key === 'elite') return PREMIUM_MONTHLY;
  // Enterprise contracts are quoted separately; the user row does not carry
  // a reliable contract value, so callers must exclude these from estimates.
  if (ENTERPRISE_PLAN_IDS.includes(key)) return null;
  return null;
}

export function normaliseBillingInterval(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'year' || raw === 'yearly' || raw === 'annual' || raw === 'annually') return 'year';
  return 'month';
}

export function subscriptionMonthlyValue(plan, interval = 'month') {
  const price = planMonthlyPrice(plan);
  if (price == null) return null;
  if (planKey(plan) === 'premium' && normaliseBillingInterval(interval) === 'year') {
    return PREMIUM_ANNUAL / 12;
  }
  return price;
}

export function estimatedMrr(users = []) {
  return users.reduce((sum, user) => {
    const value = subscriptionMonthlyValue(user.plan, user.billingInterval || user.billing_interval || user.interval);
    return sum + (value == null ? 0 : value);
  }, 0);
}

export function academyMinimumValue(learners = 0) {
  return Number(learners || 0) * ACADEMY_MINIMUM_PRICE;
}

export function formatUsd(value, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const { decimals = 0, compact = false } = options;
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  })}`;
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}
