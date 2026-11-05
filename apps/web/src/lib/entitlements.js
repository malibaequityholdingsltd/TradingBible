// Plan entitlements — single source of truth for who may access what.
//
// Tiers (ascending): pro < premium/elite < professional < teams.
// Premium is the public $19.99 plan; legacy tiers remain recognized for
// existing subscribers and enterprise contracts. Admins bypass every check.

export const PLAN_RANK = {
  pro: 1,
  premium: 2,
  elite: 2,
  professional: 3,
  teams: 4,
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
// Premium covers the core product including SI coach, reports and mistake
// detection. Professional/teams add enterprise API, integrations and
// white-label, which are quoted separately from the public subscription.
export const FEATURE_PLANS = {
  coach: 'elite',
  reports: 'elite',
  'api-docs': 'professional',
  integrations: 'professional',
  'api-keys': 'professional',
  branding: 'professional',
};

// Staff marker: hired employees carry user_settings.staff.hired (set by the
// hire endpoint, never by signup). Staff pass the subscriber floor so they
// can work without buying a plan; tier checks (elite/professional) still
// apply. Suspended users are blocked elsewhere regardless of this flag.
export function isStaffUser(user) {
  return user?.user_settings?.staff?.hired === true;
}

export function requiredPlanFor(feature) {
  return FEATURE_PLANS[feature] || null;
}
