import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let paddlePromise = null;
let cachedConfig = null;

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Paddle) return resolve(window.Paddle);
    const existing = document.querySelector(`script[src="${PADDLE_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = PADDLE_JS;
    s.async = true;
    s.onload = () => resolve(window.Paddle);
    s.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(s);
  });
}

export async function getPaddleConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await apiServerClient.fetch('/paddle/config');
  if (!res.ok) throw new Error('Could not load billing config');
  cachedConfig = await res.json();
  return cachedConfig;
}

export async function initPaddle(onEvent) {
  if (paddlePromise) return paddlePromise;
  paddlePromise = (async () => {
    const config = await getPaddleConfig();
    if (!config.clientToken) throw new Error('Paddle is not configured yet.');
    const Paddle = await loadScript();
    Paddle.Environment.set(config.environment === 'production' ? 'production' : 'sandbox');
    Paddle.Initialize({
      token: config.clientToken,
      eventCallback: (e) => { if (onEvent) onEvent(e); },
    });
    return Paddle;
  })();
  return paddlePromise;
}

function authHeaders() {
  return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

// Ensure the signed-in user has a Paddle customer, then open the checkout overlay.
export async function openCheckout(plan, onEvent) {
  const config = await getPaddleConfig();
  const priceId = config.prices?.[plan];
  if (!priceId) throw new Error('This plan is not available for checkout yet.');

  const Paddle = await initPaddle(onEvent);

  let customerId;
  try {
    const res = await apiServerClient.fetch('/paddle/customer', { method: 'POST', headers: authHeaders() });
    if (res.ok) customerId = (await res.json()).customerId;
  } catch { /* fall back to email-based checkout */ }

  const user = pb.authStore.record;
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(customerId ? { customer: { id: customerId } } : user?.email ? { customer: { email: user.email } } : {}),
    customData: { user_id: user?.id },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      successUrl: `${window.location.origin}/app/billing`,
    },
  });
}

export async function getSubscription() {
  const res = await apiServerClient.fetch('/paddle/subscription', { headers: authHeaders() });
  if (!res.ok) throw new Error('Could not load subscription');
  return (await res.json()).subscription;
}

export async function cancelSubscription(immediately = false) {
  const res = await apiServerClient.fetch('/paddle/subscription/cancel', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ immediately }),
  });
  if (!res.ok) throw new Error('Cancel failed');
  return (await res.json()).subscription;
}

export async function resumeSubscription() {
  const res = await apiServerClient.fetch('/paddle/subscription/resume', { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new Error('Resume failed');
  return (await res.json()).subscription;
}

export async function switchPlan(plan) {
  const res = await apiServerClient.fetch('/paddle/subscription/update', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error('Plan change failed');
  return (await res.json()).subscription;
}
