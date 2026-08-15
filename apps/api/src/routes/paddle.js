import { Router } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { supabase } from '../utils/supabaseClient.js';

const router = Router();

// ── Environment resolution: sandbox vs live ───────────────────────
// Manual override (PADDLE_ENV_OVERRIDE=sandbox|live) wins when set; otherwise
// NODE_ENV=production => live, everything else => sandbox.
function getPaddleEnv() {
	const override = (process.env.PADDLE_ENV_OVERRIDE || '').toLowerCase();
	if (override === 'sandbox' || override === 'live') return override;
	return process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';
}

function paddleApiBase(env) {
	return env === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
}

function paddleApiKey(env) {
	return env === 'live' ? process.env.PADDLE_LIVE_API_KEY : process.env.PADDLE_SANDBOX_API_KEY;
}

function paddleClientToken(env) {
	return env === 'live' ? process.env.PADDLE_LIVE_CLIENT_TOKEN : process.env.PADDLE_SANDBOX_CLIENT_TOKEN;
}

function paddleWebhookSecret(env) {
	return env === 'live' ? process.env.PADDLE_LIVE_WEBHOOK_SECRET : process.env.PADDLE_SANDBOX_WEBHOOK_SECRET;
}

// Plan tier -> Paddle price id (configured in apps/api/.env).
// Paddle keeps separate catalogs per environment; these price ids are used
// as-is for whichever environment is currently active.
const PRICE_MAP = {
	pro: process.env.PADDLE_PRICE_PRO,
	elite: process.env.PADDLE_PRICE_ELITE,
	professional: process.env.PADDLE_PRICE_PROFESSIONAL,
	// One-time lifetime price for the AI Academy (configured in apps/api/.env).
	academy: process.env.PADDLE_PRICE_ACADEMY,
};
const PLAN_BY_PRICE = () => {
	const out = {};
	for (const [plan, price] of Object.entries(PRICE_MAP)) if (price) out[price] = plan;
	return out;
};

// ── Helpers ──────────────────────────────────────────────────────

async function paddleApi(path, method = 'GET', body) {
	const env = getPaddleEnv();
	const key = paddleApiKey(env);
	if (!key) {
		throw new Error(
			`PADDLE_${env.toUpperCase()}_API_KEY is not set in apps/api/.env (active Paddle environment: ${env})`,
		);
	}
	const res = await fetch(`${paddleApiBase(env)}${path}`, {
		method,
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			`Paddle API ${method} ${path} failed: ${res.status} ${res.statusText} ${JSON.stringify(data?.error || {})}`,
		);
	}
	return data;
}

// Verify the caller's Supabase JWT and return their user record.
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
	return supabase.updateUser(userId, data);
}

// ── Config: expose safe client values for Paddle.js ──────────────
router.get('/config', (req, res) => {
	const env = getPaddleEnv();
	res.json({
		clientToken: paddleClientToken(env) || '',
		environment: env,
		prices: PRICE_MAP,
		configured: Boolean(paddleClientToken(env) && paddleApiKey(env)),
	});
});

// ── Create / retrieve a Paddle customer for the signed-in user ───
router.post('/customer', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });

	if (user.paddleCustomerId) {
		return res.json({ customerId: user.paddleCustomerId });
	}

	let customerId;
	try {
		const created = await paddleApi('/customers', 'POST', {
			email: user.email,
			name: user.name || user.username || undefined,
			custom_data: { user_id: user.id },
		});
		customerId = created?.data?.id;
	} catch (err) {
		// Paddle rejects duplicate emails — look the existing customer up instead.
		const list = await paddleApi(`/customers?email=${encodeURIComponent(user.email)}`);
		customerId = list?.data?.[0]?.id;
		if (!customerId) throw err;
	}

	await updateUser(user.id, { paddleCustomerId: customerId });
	res.json({ customerId });
});

// ── Get the signed-in user's subscription (live from Paddle) ─────
router.get('/subscription', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	if (!user.subscriptionId) return res.json({ subscription: null });

	const sub = await paddleApi(`/subscriptions/${user.subscriptionId}`);
	res.json({ subscription: sub?.data || null });
});

// ── Cancel: schedule at period end (default) or immediately ──────
router.post('/subscription/cancel', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });

	const immediate = req.body?.immediately === true;
	const result = await paddleApi(`/subscriptions/${user.subscriptionId}/cancel`, 'POST', {
		effective_from: immediate ? 'immediately' : 'next_billing_period',
	});
	await updateUser(user.id, { cancelScheduled: !immediate });
	res.json({ subscription: result?.data || null });
});

// ── Resume: remove a scheduled cancellation ──────────────────────
router.post('/subscription/resume', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });

	const result = await paddleApi(`/subscriptions/${user.subscriptionId}`, 'PATCH', {
		scheduled_change: null,
	});
	await updateUser(user.id, { cancelScheduled: false });
	res.json({ subscription: result?.data || null });
});

// ── Switch plan (upgrade / downgrade) with prorated billing ──────
router.post('/subscription/update', async (req, res) => {
	const user = await getAuthedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	if (!user.subscriptionId) return res.status(422).json({ error: 'no active subscription' });

	const { plan } = req.body ?? {};
	const priceId = PRICE_MAP[plan];
	if (!priceId) return res.status(422).json({ error: 'unknown or unconfigured plan' });

	const result = await paddleApi(`/subscriptions/${user.subscriptionId}`, 'PATCH', {
		items: [{ price_id: priceId, quantity: 1 }],
		proration_billing_mode: 'prorated_immediately',
	});
	res.json({ subscription: result?.data || null });
});

// ── Webhook receiver: verify signature + sync subscription state ──
function verifySignature(req) {
	const env = getPaddleEnv();
	const secret = paddleWebhookSecret(env);
	if (!secret) throw new Error(`PADDLE_${env.toUpperCase()}_WEBHOOK_SECRET is not set in apps/api/.env`);
	const header = req.headers['paddle-signature'];
	if (!header || !req.rawBody) return false;

	const parts = Object.fromEntries(
		String(header).split(';').map((kv) => kv.split('=')),
	);
	const ts = parts.ts;
	const h1 = parts.h1;
	if (!ts || !h1) return false;

	const signed = `${ts}:${req.rawBody.toString('utf8')}`;
	const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
	try {
		return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
	} catch {
		return false;
	}
}

async function findUser(customData, customerId) {
	const uid = customData?.user_id;
	if (uid) {
		try {
			return await supabase.getUserById(uid);
		} catch { /* fall through */ }
	}
	if (customerId) {
		try {
			return await supabase.getUserByCustomerId(customerId);
		} catch { /* not found */ }
	}
	return null;
}

async function recordEvent(userId, fields) {
	try {
		await supabase.createEvent({ owner: userId, ...fields });
	} catch (err) {
		logger.error('billing_events create failed', String(err));
	}
}

async function supabaseRestCreateAcademyPurchase(owner, row) {
	const { supabaseRest } = await import('../utils/supabaseClient.js');
	await supabaseRest('/rest/v1/academy_purchases', {
		method: 'POST',
		body: { owner, ...row, createdAt: new Date().toISOString() },
		prefer: 'return=representation',
	});
}

router.post('/webhook', async (req, res) => {
	if (!verifySignature(req)) {
		logger.warn('Paddle webhook signature verification failed');
		return res.status(401).json({ error: 'invalid signature' });
	}

	const event = req.body || {};
	const type = event.event_type;
	const data = event.data || {};
	logger.info(`Paddle webhook received: ${type}`);

	const priceMap = PLAN_BY_PRICE();

	try {
		if (type?.startsWith('subscription.')) {
			const user = await findUser(data.custom_data, data.customer_id);
			if (user) {
				const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
				const plan = priceMap[priceId];
				const periodEnd = data.current_billing_period?.ends_at || null;
				const cancelScheduled = data.scheduled_change?.action === 'cancel';

				const patch = {
					subscriptionId: data.id || user.subscriptionId,
					subscriptionStatus: data.status || '',
					subscriptionPriceId: priceId || '',
					currentPeriodEnd: periodEnd,
					cancelScheduled,
					paddleCustomerId: data.customer_id || user.paddleCustomerId,
				};
				if (type === 'subscription.canceled') {
					patch.plan = 'trial';
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
					occurredAt: event.occurred_at || new Date().toISOString(),
				});
			}
			} else if (type?.startsWith('transaction.')) {
				const user = await findUser(data.custom_data, data.customer_id);
				if (user) {
					const total = data.details?.totals?.grand_total;
					await recordEvent(user.id, {
						eventType: type,
						subscriptionId: data.subscription_id || '',
						transactionId: data.id || '',
						status: data.status || '',
						amount: total ? Number(total) / 100 : 0,
						currency: data.currency_code || '',
						invoiceUrl: data.invoice_id ? `${paddleApiBase(getPaddleEnv())}/transactions/${data.id}/invoice` : '',
						occurredAt: event.occurred_at || new Date().toISOString(),
					});
					if (type === 'transaction.payment_failed') {
						await updateUser(user.id, { subscriptionStatus: 'past_due' });
					}

					// Academy: one-time lifetime purchase (custom_data.intent='academy'
					// or the checkout used the configured academy price id).
					const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
					const isAcademy = data.custom_data?.intent === 'academy' || (PRICE_MAP.academy && priceId === PRICE_MAP.academy);
					if (isAcademy && type === 'transaction.completed' && data.status === 'completed') {
						await updateUser(user.id, {
							academyAccess: true,
							academyPurchasedAt: event.occurred_at || new Date().toISOString(),
						});
						try {
							const { supabase } = await import('../utils/supabaseClient.js');
							await supabaseRestCreateAcademyPurchase(user.id, {
								transactionId: data.id || '',
								amount: total ? Number(total) / 100 : 0,
								currency: data.currency_code || '',
								status: data.status || '',
							});
						} catch (err) {
							logger.error('academy purchase record failed', String(err));
						}
						logger.info(`Academy access granted to ${user.id}`);
					}
				}
			}
	} catch (err) {
		logger.error('Paddle webhook handling error', String(err));
	}

	// Always 200 quickly so Paddle does not retry a processed event.
	res.json({ received: true });
});

export default router;