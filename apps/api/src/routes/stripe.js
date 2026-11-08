import { Router } from 'express';
import Stripe from 'stripe';
import logger from '../utils/logger.js';
import { supabase, supabaseRest } from '../utils/supabaseClient.js';
import { familyPassTransactionId, generateFamilyCode, generateTeamCode, normalizeFamilyCode } from '../utils/academy-family.js';

const router = Router();

// ── Stripe client (test vs live via key prefix) ──────────────────
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY || '';
  if (!key) return null;
  return new Stripe(key);
}

function getStripeEnv() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY || '';
  if (!key) return 'unconfigured';
  return key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : 'live';
}

function getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_SANDBOX_PUBLISHABLE_KEY || '';
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SANDBOX_WEBHOOK_SECRET || '';
}

const ACADEMY_FAMILY_PRICE_ID = process.env.STRIPE_PRICE_ACADEMY_FAMILY || 'price_1UVq0gETv6zJp2esYqK9qDUs';

// Fixed one-time Academy tiers. Pro and Teams use inline Stripe price data
// when no dashboard price is configured, so the price stays exactly $199 and
// $499 without inventing a price ID or touching the production env file.
const ACADEMY_PRO_PRICE = { amount: 19900, name: 'TradingBible Academy Pro' };
const ACADEMY_TEAM_PRICE = { amount: 49900, name: 'TradingBible Academy Teams' };
const PLATFORM_TEAMS_PRICE = { amount: 19900, name: 'TradingBible Teams', recurring: { interval: 'month' } };
const PLATFORM_PREMIUM_MONTHLY_PRICE = { amount: 1999, name: 'TradingBible Premium', recurring: { interval: 'month' } };
const PLATFORM_PREMIUM_ANNUAL_PRICE = { amount: 19900, name: 'TradingBible Premium Annual', recurring: { interval: 'year' } };

const PRICE_MAP = {
  premium: process.env.STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_PRO || '',
  premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  elite: process.env.STRIPE_PRICE_ELITE || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  teams: process.env.STRIPE_PRICE_TEAMS || '',
  academy: process.env.STRIPE_PRICE_ACADEMY || '',
  academyPro: process.env.STRIPE_PRICE_ACADEMY_PRO || '',
  academyFamily: ACADEMY_FAMILY_PRICE_ID,
  academyTeam: process.env.STRIPE_PRICE_ACADEMY_TEAM || '',
};

const PLAN_PRICE_SPECS = {
  teams: PLATFORM_TEAMS_PRICE,
  premium: PLATFORM_PREMIUM_MONTHLY_PRICE,
  premium_annual: PLATFORM_PREMIUM_ANNUAL_PRICE,
};

// Annual Premium is a billing interval, not a separate entitlement tier.
const PLAN_ALIAS = { premium_annual: 'premium' };
function canonicalPlan(plan) {
  return PLAN_ALIAS[String(plan || '').toLowerCase()] || String(plan || '').toLowerCase();
}

async function resolveSubscriptionPrice(stripe, plan) {
  if (PRICE_MAP[plan]) return PRICE_MAP[plan];
  const spec = PLAN_PRICE_SPECS[plan];
  if (!spec) return '';
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: spec.amount,
    recurring: spec.recurring,
    product_data: { name: spec.name },
  });
  PRICE_MAP[plan] = price.id;
  return price.id;
}

// Stripe SDK errors are user-safe (declined card, unknown price, canceled
// subscription) — surface them as JSON instead of a generic 500.
function sendStripeError(res, err) {
  const status = err?.statusCode >= 400 && err?.statusCode < 500 ? err.statusCode : 502;
  logger.warn('Stripe request failed', String(err?.message || err));
  return res.status(status).json({ error: err?.message || 'Payment provider request failed' });
}

const PLAN_BY_PRICE = () => {
  const out = {};
  for (const [plan, price] of Object.entries(PRICE_MAP)) if (price) out[price] = canonicalPlan(plan);
  return out;
};

async function getAuthedUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const { getSupabaseUser } = await import('../utils/supabaseClient.js');
    const authUser = await getSupabaseUser(token);
    if (!authUser?.id) return null;
    const record = await supabase.getUserById(authUser.id).catch(() => null);
    const meta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      email: authUser.email,
      name: record?.name || meta.name || null,
      username: record?.username || meta.username || authUser.email?.split('@')[0] || null,
      ...record,
    };
  } catch {
    return null;
  }
}

async function updateUser(userId, data) {
  try {
    return await supabase.updateUser(userId, data);
  } catch (err) {
    // Fallback if stripeCustomerId column not yet migrated (42703) - retry without that column
    if (String(err).includes('stripeCustomerId') || String(err).includes('42703') || String(err).includes('does not exist')) {
      const { stripeCustomerId, ...rest } = data;
      if (Object.keys(rest).length) {
        logger.warn('stripeCustomerId column missing, retrying update without it');
        return supabase.updateUser(userId, rest);
      }
    }
    throw err;
  }
}

async function findUser(metadata, customerId) {
  const uid = metadata?.user_id || metadata?.userId;
  if (uid) {
    try { return await supabase.getUserById(uid); } catch { /* fall through */ }
  }
  if (customerId) {
    try {
      const row = await supabase.getUserByCustomerId(customerId);
      if (row) return row;
    } catch { /* not found */ }
    try {
      const { supabaseRest } = await import('../utils/supabaseClient.js');
      const rows = await supabaseRest(`/rest/v1/users?stripeCustomerId=eq.${encodeURIComponent(customerId)}`, { query: { select: '*', limit: 1 } });
      if (rows?.[0]) return rows[0];
    } catch (err) {
      // column missing -> ignore, rely on paddleCustomerId fallback already tried
      if (!String(err).includes('42703') && !String(err).includes('does not exist')) logger.warn('findUser stripeCustomerId lookup failed', String(err));
    }
  }
  return null;
}

async function recordEvent(userId, fields) {
  try { await supabase.createEvent({ owner: userId, ...fields }); } catch (err) { logger.error('billing_events create failed', String(err)); }
}

// ── Config ──────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  const publishableKey = getPublishableKey();
  const stripe = getStripe();
  res.json({
    publishableKey,
    environment: getStripeEnv(),
    prices: PRICE_MAP,
    configured: Boolean(stripe && publishableKey),
  });
});

// ── Create / retrieve Stripe customer ───────────────────────────
router.post('/customer', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in apps/api/.env' });

  // reuse existing stripeCustomerId if present, else paddleCustomerId fallback check
  const existingId = user.stripeCustomerId || user.paddleCustomerId;
  if (existingId) {
    try {
      const c = await stripe.customers.retrieve(existingId);
      if (c && !c.deleted) return res.json({ customerId: existingId });
    } catch { /* recreate */ }
  }

  // create new stripe customer
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || user.username || undefined,
      metadata: { user_id: user.id },
    });
    await updateUser(user.id, { stripeCustomerId: customer.id });
    res.json({ customerId: customer.id });
  } catch (err) { return sendStripeError(res, err); }
});

// ── Create Checkout Session ─────────────────────────────────────
router.post('/checkout-session', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in apps/api/.env' });

  const { plan, intent } = req.body ?? {};
  const isTeamPass = intent === 'academy_team' || plan === 'academy_team';
  const isProPass = intent === 'academy_pro' || plan === 'academy_pro';
  const isFamily = intent === 'academy_family' || plan === 'academy_family';
  const isAcademy = isTeamPass || isProPass || isFamily || intent === 'academy' || plan === 'academy';
  const isPlatformTeams = plan === 'teams';
  const isPlatformPremium = plan === 'premium' || plan === 'premium_annual';
  const academyKey = isTeamPass ? 'academyTeam' : isProPass ? 'academyPro' : isFamily ? 'academyFamily' : 'academy';
  const academySpec = isTeamPass ? ACADEMY_TEAM_PRICE : isProPass ? ACADEMY_PRO_PRICE : null;
  const platformSpec = isPlatformTeams ? PLATFORM_TEAMS_PRICE : isPlatformPremium ? PLAN_PRICE_SPECS[plan] : null;
  const priceId = isAcademy ? PRICE_MAP[academyKey] : PRICE_MAP[plan];
  if (!priceId && !academySpec && !platformSpec) return res.status(422).json({ error: 'unknown or unconfigured plan' });
  const groupCode = isFamily || isTeamPass ? (isTeamPass ? generateTeamCode() : generateFamilyCode()) : null;

  // ensure customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    try {
      const c = await stripe.customers.create({ email: user.email, name: user.name || undefined, metadata: { user_id: user.id } });
      customerId = c.id;
      await updateUser(user.id, { stripeCustomerId: customerId });
    } catch (e) { logger.error('stripe customer create failed', String(e)); }
  }

  const origin = req.headers.origin || process.env.CORS_ORIGIN || 'https://tradingbible.app';
  try {
    if (isAcademy) {
      const metadata = {
        user_id: user.id,
        intent: isTeamPass ? 'academy_team' : isProPass ? 'academy_pro' : isFamily ? 'academy_family' : 'academy',
      };
      if (groupCode) {
        metadata.family_code = groupCode;
        metadata.seats = isTeamPass ? '10' : '4';
      }
      const lineItem = priceId
        ? { price: priceId, quantity: 1 }
        : {
            price_data: {
              currency: 'usd',
              unit_amount: academySpec.amount,
              product_data: { name: academySpec.name },
            },
            quantity: 1,
          };
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        // Managed Payments is enabled by default on some Stripe accounts and
        // rejects inline price_data without a product tax code. The platform
        // does not use Managed Payments, so opt out per session instead of
        // inventing a tax code or blocking checkout.
        managed_payments: { enabled: false },
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        line_items: [lineItem],
        success_url: `${origin}/app/academy?checkout=success${isFamily ? '&family=1' : isTeamPass ? '&team=1' : isProPass ? '&pro=1' : ''}`,
        cancel_url: `${origin}/app/academy?checkout=cancel`,
        client_reference_id: user.id,
        metadata,
      });
      return res.json({ url: session.url, id: session.id });
    }
    // No free trial: every checkout charges immediately. New subscribers
    // must complete a paid checkout (card collected + charged now).
    const subscriptionPrice = priceId || (platformSpec ? null : await resolveSubscriptionPrice(stripe, plan));
    if (!subscriptionPrice && !platformSpec) return res.status(422).json({ error: 'unknown or unconfigured plan' });
    const lineItem = subscriptionPrice
      ? { price: subscriptionPrice, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            unit_amount: platformSpec.amount,
            recurring: platformSpec.recurring,
            product_data: { name: platformSpec.name },
          },
          quantity: 1,
        };
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      managed_payments: { enabled: false },
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [lineItem],
      success_url: `${origin}/app/billing?checkout=success${isPlatformTeams ? '&teams=1' : ''}`,
      cancel_url: `${origin}/app/billing?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: canonicalPlan(plan) || 'teams' },
      subscription_data: {
        metadata: { user_id: user.id, plan: canonicalPlan(plan) || 'teams' },
      },
    });
    res.json({ url: session.url, id: session.id });
  } catch (err) { return sendStripeError(res, err); }
});

// ── Get subscription ────────────────────────────────────────────
router.get('/subscription', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!user.subscriptionId) return res.json({ subscription: null });
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
    res.json({ subscription: sub });
  } catch {
    res.json({ subscription: null });
  }
});

// ── Cancel (at period end) ──────────────────────────────────────
router.post('/subscription/cancel', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const immediate = req.body?.immediately === true;
  try {
    let sub;
    if (immediate) {
      sub = await stripe.subscriptions.cancel(user.subscriptionId);
      await updateUser(user.id, { subscriptionStatus: 'canceled', cancelScheduled: false });
    } else {
      sub = await stripe.subscriptions.update(user.subscriptionId, { cancel_at_period_end: true });
      await updateUser(user.id, { cancelScheduled: true });
    }
    res.json({ subscription: sub });
  } catch (err) { return sendStripeError(res, err); }
});

// ── Resume ──────────────────────────────────────────────────────
router.post('/subscription/resume', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const sub = await stripe.subscriptions.update(user.subscriptionId, { cancel_at_period_end: false });
    await updateUser(user.id, { cancelScheduled: false });
    res.json({ subscription: sub });
  } catch (err) { return sendStripeError(res, err); }
});

// ── Switch plan ─────────────────────────────────────────────────
router.post('/subscription/update', async (req, res) => {
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });
  const { plan } = req.body ?? {};
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const priceId = await resolveSubscriptionPrice(stripe, plan);
    if (!priceId) return res.status(422).json({ error: 'unknown or unconfigured plan' });
    const targetPlan = canonicalPlan(plan);
    const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return res.status(422).json({ error: 'no subscription item' });
    const updated = await stripe.subscriptions.update(user.subscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: { ...(sub.metadata || {}), user_id: user.id, plan: targetPlan },
    });
    res.json({ subscription: updated });
  } catch (err) { return sendStripeError(res, err); }
});

// ── Webhook ─────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) {
    logger.warn('Stripe webhook called but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing');
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  const sig = req.headers['stripe-signature'];
  if (!sig || !req.rawBody) return res.status(400).json({ error: 'missing signature' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', String(err));
    return res.status(400).json({ error: 'invalid signature' });
  }

  const type = event.type;
  const data = event.data.object;
  logger.info(`Stripe webhook received: ${type}`);
  const priceMap = PLAN_BY_PRICE();

  try {
    if (type.startsWith('customer.subscription.')) {
      const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id;
      const user = await findUser(data.metadata, customerId);
      if (user) {
        const priceId = data.items?.data?.[0]?.price?.id || data.plan?.id || '';
        const plan = priceMap[priceId] || data.metadata?.plan || '';
        const periodEnd = data.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : null;
        const cancelScheduled = Boolean(data.cancel_at_period_end);
        const patch = {
          subscriptionId: data.id || user.subscriptionId,
          subscriptionStatus: data.status || '',
          subscriptionPriceId: priceId || '',
          currentPeriodEnd: periodEnd,
          cancelScheduled,
          stripeCustomerId: customerId || user.stripeCustomerId,
        };
        if (type === 'customer.subscription.deleted') {
          patch.plan = null;
          patch.subscriptionStatus = 'canceled';
        } else if (plan && (data.status === 'active' || data.status === 'trialing')) {
          patch.plan = plan;
        }
        await updateUser(user.id, patch);
        await recordEvent(user.id, {
          eventType: type,
          subscriptionId: data.id || '',
          status: data.status || '',
          planName: plan || '',
          occurredAt: new Date(event.created * 1000).toISOString(),
        });
      }
    } else if (type.startsWith('checkout.session.completed')) {
      const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id;
      const intent = data.metadata?.intent;
      if (intent === 'academy' || intent === 'academy_family' || intent === 'academy_pro' || intent === 'academy_team') {
        const user = await findUser(data.metadata, customerId);
        if (user) {
          const purchasedAt = new Date(event.created * 1000).toISOString();
          await updateUser(user.id, { academyAccess: true, academyPurchasedAt: purchasedAt, stripeCustomerId: customerId });
          if (intent === 'academy_family' || intent === 'academy_team') {
            const isTeam = intent === 'academy_team';
            const code = normalizeFamilyCode(data.metadata?.family_code) || (isTeam ? generateTeamCode() : generateFamilyCode());
            const tx = familyPassTransactionId(code);
            try {
              const existing = await supabaseRest(
                `/rest/v1/academy_purchases?owner=eq.${encodeURIComponent(user.id)}&transactionId=eq.${encodeURIComponent(tx)}&select=id&limit=1`,
              );
              if (!existing?.length) {
                await supabaseRest('/rest/v1/academy_purchases', {
                  method: 'POST',
                  body: {
                    owner: user.id,
                    transactionId: tx,
                    amount: data.amount_total != null ? data.amount_total / 100 : (isTeam ? 499 : 299),
                    currency: data.currency || 'usd',
                    status: 'family_owner',
                    createdAt: purchasedAt,
                  },
                  prefer: 'return=representation',
                });
              }
            } catch (familyErr) {
              logger.error('academy group pass record failed', String(familyErr));
            }
            await recordEvent(user.id, { eventType: type, planName: isTeam ? 'academy_team' : 'academy_family', status: data.payment_status || 'paid', occurredAt: purchasedAt });
          } else if (intent === 'academy_pro') {
            const tx = `academy_pro:${data.id || user.id}`;
            try {
              const existing = await supabaseRest(
                `/rest/v1/academy_purchases?owner=eq.${encodeURIComponent(user.id)}&transactionId=eq.${encodeURIComponent(tx)}&select=id&limit=1`,
              );
              if (!existing?.length) {
                await supabaseRest('/rest/v1/academy_purchases', {
                  method: 'POST',
                  body: {
                    owner: user.id,
                    transactionId: tx,
                    amount: data.amount_total != null ? data.amount_total / 100 : 199,
                    currency: data.currency || 'usd',
                    status: 'pro',
                    createdAt: purchasedAt,
                  },
                  prefer: 'return=representation',
                });
              }
            } catch (proErr) {
              logger.error('academy pro purchase record failed', String(proErr));
            }
            await recordEvent(user.id, { eventType: type, planName: 'academy_pro', status: data.payment_status || 'paid', occurredAt: purchasedAt });
          } else {
            await recordEvent(user.id, { eventType: type, planName: 'academy', status: data.payment_status || 'paid', occurredAt: purchasedAt });
          }
        }
      } else if (intent === 'wallet_deposit') {
        const user = await findUser(data.metadata, customerId);
        const amount = Number(data.metadata?.amount || 0) / 100;
        if (user && amount > 0) {
          try {
            const { supabaseRest } = await import('../utils/supabaseClient.js');
            await supabaseRest('/rest/v1/bank_transactions', {
              method: 'POST',
              body: {
                owner: user.id, kind: 'deposit', amount, currency: 'USD',
                status: 'completed', reference: data.id, counterparty: 'stripe',
                asset: 'USD', fiatValue: amount,
              },
              prefer: 'return=representation',
            });
            logger.info(`wallet deposit credited ${amount} to ${user.id}`);
          } catch (e) { logger.error('wallet deposit webhook failed', String(e)); }
        }
      } else {
        const subscriptionId = typeof data.subscription === 'string' ? data.subscription : data.subscription?.id;
        const user = await findUser(data.metadata, customerId);
        if (user && subscriptionId) {
          await updateUser(user.id, { subscriptionId, stripeCustomerId: customerId });
        }
      }
    } else if (type.startsWith('invoice.')) {
      const customerId = typeof data.customer === 'string' ? data.customer : data.customer?.id;
      const user = await findUser(data.metadata || data.subscription_details?.metadata, customerId);
      if (user) {
        await recordEvent(user.id, {
          eventType: type,
          subscriptionId: typeof data.subscription === 'string' ? data.subscription : data.subscription || '',
          transactionId: data.id || '',
          status: data.status || '',
          amount: data.amount_paid != null ? data.amount_paid / 100 : data.amount_due != null ? data.amount_due / 100 : 0,
          currency: data.currency || '',
          invoiceUrl: data.hosted_invoice_url || data.invoice_pdf || '',
          occurredAt: new Date(event.created * 1000).toISOString(),
        });
        if (type === 'invoice.payment_failed') await updateUser(user.id, { subscriptionStatus: 'past_due' });
      }
    } else if (type.startsWith('identity.verification_session.')) {
      // Wallet KYC: mirror verification outcome into wallet_money_rails.
      const uid = data.metadata?.user_id || data.metadata?.userId || null;
      if (uid) {
        try {
          const { supabaseRest } = await import('../utils/supabaseClient.js');
          const status = type === 'identity.verification_session.verified' ? 'verified'
            : type === 'identity.verification_session.requires_input' ? 'failed' : 'pending';
          const patch = { kyc_status: status, kyc_session_id: data.id || null, updated_at: new Date().toISOString() };
          if (status === 'verified') patch.kyc_verified_at = new Date().toISOString();
          await supabaseRest('/rest/v1/wallet_money_rails', {
            method: 'POST', body: { owner: uid, ...patch }, prefer: 'return=representation,resolution=merge-duplicates',
          });
          logger.info(`wallet kyc ${status} for ${uid}`);
        } catch (e) { logger.error('wallet kyc webhook failed', String(e)); }
      }
    }
  } catch (err) {
    logger.error('Stripe webhook handling error', String(err));
  }
  res.json({ received: true });
});

export default router;
