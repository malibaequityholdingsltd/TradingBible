const PAID_PLANS = new Set(['pro', 'premium', 'elite', 'professional', 'teams']);

export function homeRouteForUser(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  const plan = String(user.plan || '').toLowerCase();
  const staff = user?.user_settings?.staff?.hired === true;
  return PAID_PLANS.has(plan) || staff ? '/app' : '/app/welcome';
}
