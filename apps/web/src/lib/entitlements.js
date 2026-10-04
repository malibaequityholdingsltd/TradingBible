// Plan entitlements — single source of truth for who may access what.
//
// Tiers (ascending): pro ($19.99) < elite ($49.99) < professional ($99).
// Admins bypass every check. Users with no plan rank 0.

export const PLAN_RANK = {
  pro: 1,
  elite: 2,
  professional: 3,
};

export function planRank(plan) {
  return PLAN_RANK[String(plan || '').toLowerCase()] || 0;
}

export function isAdminUser(user) {
  return user?.role === 'admin';
}

// True when the user's plan meets or exceeds the required tier.
// Admins always pass. Unknown/empty plans fail closed.
export function meetsPlan(user, required) {
  if (isAdminUser(user)) return true;
  const need = PLAN_RANK[String(required || '').toLowerCase()] || 0;
  if (need <= 0) return true;
  return planRank(user?.plan) >= need;
}

// Minimum tier per gated feature, mirroring the pricing page:
// Pro = journal/analytics/scoring; Elite adds SI coach + SI reports +
// mistake detection; Professional adds API, integrations, white-label.
export const FEATURE_PLANS = {
  coach: 'elite',
  reports: 'elite',
  'api-docs': 'professional',
  integrations: 'professional',
  'api-keys': 'professional',
  branding: 'professional',
};

export function requiredPlanFor(feature) {
  return FEATURE_PLANS[feature] || null;
}
