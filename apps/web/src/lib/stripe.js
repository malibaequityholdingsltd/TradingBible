import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

let stripePromise = null;
let cachedConfig = null;

export async function getStripeConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await apiServerClient.fetch('/stripe/config');
  if (!res.ok) throw new Error('Could not load Stripe config');
  cachedConfig = await res.json();
  return cachedConfig;
}

export async function getStripe() {
  if (stripePromise) return stripePromise;
  const config = await getStripeConfig();
  if (!config.publishableKey) throw new Error('Stripe is not configured yet. Add STRIPE_PUBLISHABLE_KEY to apps/api/.env');
  // Stripe.js is ~1.1 MB. Keep it out of the initial bundle and out of every
  // page that only needs the public config — load it at checkout time.
  const { loadStripe } = await import('@stripe/stripe-js');
  stripePromise = loadStripe(config.publishableKey);
  return stripePromise;
}

function authHeaders() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export async function openCheckout(plan) {
  const config = await getStripeConfig();
  const priceId = config.prices?.[plan];
  // Premium monthly/annual and Teams can fall back to fixed inline prices
  // on the API, so they remain sellable before dashboard price IDs exist.
  const hasInlinePrice = plan === 'teams' || plan === 'premium' || plan === 'premium_annual';
  if (!priceId && !hasInlinePrice) throw new Error('This plan is not available for checkout yet — missing STRIPE_PRICE_* in apps/api/.env');

  const res = await apiServerClient.fetch('/stripe/checkout-session', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not create checkout session');
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
  else throw new Error('No checkout URL returned');
}

const ACADEMY_TIERS = {
  individual: { intent: 'academy', priceKey: 'academy', label: 'Academy' },
  pro: { intent: 'academy_pro', priceKey: 'academyPro', label: 'Academy Pro' },
  family: { intent: 'academy_family', priceKey: 'academyFamily', label: 'Academy family' },
  team: { intent: 'academy_team', priceKey: 'academyTeam', label: 'Academy Teams' },
};

export async function openAcademyCheckout(tier = 'individual') {
  const spec = ACADEMY_TIERS[tier] || ACADEMY_TIERS.individual;
  const config = await getStripeConfig();
  const priceId = config.prices?.[spec.priceKey];
  // Pro and Teams have fixed inline prices on the API ($199 / $499), so they
  // remain sellable even before dedicated dashboard prices are created.
  const hasInlinePrice = tier === 'pro' || tier === 'team';
  if (!priceId && !hasInlinePrice) {
    throw new Error(`${spec.label} checkout is not configured yet — missing STRIPE_PRICE_ACADEMY in apps/api/.env`);
  }
  const res = await apiServerClient.fetch('/stripe/checkout-session', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ intent: spec.intent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Could not create ${spec.label} checkout session`);
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
  else throw new Error('No checkout URL returned');
}

export async function getSubscription() {
  const res = await apiServerClient.fetch('/stripe/subscription', { headers: authHeaders() });
  if (!res.ok) throw new Error('Could not load subscription');
  return (await res.json()).subscription;
}

export async function cancelSubscription(immediately = false) {
  const res = await apiServerClient.fetch('/stripe/subscription/cancel', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ immediately }),
  });
  if (!res.ok) throw new Error('Cancel failed');
  return (await res.json()).subscription;
}

export async function resumeSubscription() {
  const res = await apiServerClient.fetch('/stripe/subscription/resume', { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new Error('Resume failed');
  return (await res.json()).subscription;
}

export async function switchPlan(plan) {
  const res = await apiServerClient.fetch('/stripe/subscription/update', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Plan change failed');
  return (await res.json()).subscription;
}
