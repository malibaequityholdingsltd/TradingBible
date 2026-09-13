import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { loadStripe } from '@stripe/stripe-js';

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
  stripePromise = loadStripe(config.publishableKey);
  return stripePromise;
}

function authHeaders() {
  return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

export async function openCheckout(plan) {
  const config = await getStripeConfig();
  const priceId = config.prices?.[plan];
  if (!priceId) throw new Error('This plan is not available for checkout yet — missing STRIPE_PRICE_* in apps/api/.env');

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

export async function openAcademyCheckout() {
  const config = await getStripeConfig();
  const priceId = config.prices?.academy;
  if (!priceId) throw new Error('Academy checkout is not configured yet — missing STRIPE_PRICE_ACADEMY in apps/api/.env');
  const res = await apiServerClient.fetch('/stripe/checkout-session', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ intent: 'academy' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not create Academy checkout session');
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
