// Payout-fraud scan — runs ONLY on withdraw / payout initiation, NEVER on
// deposits, plan purchases or any other payment intake.
//
// What it checks: whether the money that BOUGHT plans / funded accounts came
// from someone else's payment identity. Signals come from Stripe (the payer
// of record): the Stripe customer email / name behind the user's purchases
// versus the account email + KYC identity (auth metadata names).
//
// A POSITIVE mismatch suspends the account (user_settings.suspended) and the
// caller must abort the payout with 403 account_suspended. Missing data never
// convicts, and Stripe outages fail OPEN so legit payouts are never blocked
// by an API hiccup.
import Stripe from 'stripe';
import logger from './logger.js';
import { supabaseRest } from './supabaseClient.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 1));

// True only when BOTH names are present and share no name token at all
// ("John Smith" vs "Mike Ross"). Typos and reorderings share tokens.
function namesClash(a, b) {
	const ta = toks(a);
	const tb = toks(b);
	if (!ta.size || !tb.size) return false;
	for (const w of ta) if (tb.has(w)) return false;
	return true;
}

async function suspendUser(ownerId, detail) {
	try {
		const rows = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,user_settings', id: `eq.${ownerId}`, limit: 1 },
		}).catch(() => null);
		const cur = rows?.[0]?.user_settings && typeof rows[0].user_settings === 'object' ? rows[0].user_settings : {};
		const settings = {
			...cur,
			suspended: true,
			suspendedAt: new Date().toISOString(),
			suspendedReason: 'identity_mismatch',
			suspendedDetail: String(detail).slice(0, 300),
		};
		if (rows?.[0]) {
			await supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(ownerId)}`, {
				method: 'PATCH', body: { user_settings: settings },
			}).catch(() => null);
		} else {
			await supabaseRest('/rest/v1/users', {
				method: 'POST',
				body: { id: ownerId, user_settings: settings },
				prefer: 'return=representation,resolution=merge-duplicates',
			}).catch(() => null);
		}
	} catch (err) {
		logger.warn('suspend flag write failed', String(err?.message || err));
	}
	logger.warn(`account suspended ${ownerId}: ${detail}`);
	return { suspended: true, detail };
}

export async function scanPayoutIdentity(ownerId) {
	try {
		const rows = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,email,username,name,user_settings,subscriptionId', id: `eq.${ownerId}`, limit: 1 },
		}).catch(() => null);
		const profile = rows?.[0] || null;
		if (profile?.user_settings?.suspended) return { already: true };

		let authUser = null;
		try {
			authUser = await supabaseRest(`/auth/v1/admin/users/${encodeURIComponent(ownerId)}`, {}).catch(() => null);
		} catch { /* fall through */ }
		const accountEmail = norm(authUser?.email || profile?.email || '');
		const md = (authUser?.user_metadata && typeof authUser.user_metadata === 'object') ? authUser.user_metadata : {};
		const kycName = [md.first_name, md.last_name].filter(Boolean).join(' ') || profile?.name || '';

		const key = process.env.STRIPE_SECRET_KEY || '';
		if (!key) return { ok: true, skipped: 'no-stripe' };
		const stripe = new Stripe(key);

		// Stripe customers holding this account's email…
		const customers = new Map();
		if (accountEmail) {
			try {
				const list = await stripe.customers.list({ email: accountEmail, limit: 5 });
				for (const c of list.data || []) customers.set(c.id, c);
			} catch (err) {
				logger.warn('payout scan customers.list failed', String(err?.message || err));
				return { ok: true, skipped: 'stripe-error' };
			}
		}
		// …plus the customer behind the active subscription, if any.
		if (profile?.subscriptionId) {
			try {
				const sub = await stripe.subscriptions.retrieve(profile.subscriptionId);
				const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
				if (cid && !customers.has(cid)) {
					const c = await stripe.customers.retrieve(cid);
					if (c && !c.deleted) customers.set(c.id, c);
				}
			} catch { /* fall through — email list already covers most */ }
		}
		if (!customers.size) return { ok: true, skipped: 'no-customer' };

		for (const c of customers.values()) {
			const cEmail = norm(c.email || '');
			if (cEmail && accountEmail && cEmail !== accountEmail) {
				return suspendUser(ownerId, `plan/funded purchase paid by ${c.email} — account is ${authUser?.email || profile?.email}`);
			}
			if (namesClash(c.name, kycName)) {
				return suspendUser(ownerId, `payer name "${c.name}" does not match verified identity`);
			}
		}

		// Checkout sessions behind those customers (card/email used at pay time).
		for (const c of customers.values()) {
			let sessions = [];
			try {
				const s = await stripe.checkout.sessions.list({ customer: c.id, limit: 10 });
				sessions = s.data || [];
			} catch { continue; }
			for (const s of sessions) {
				const payEmail = norm(s.customer_details?.email || '');
				if (payEmail && accountEmail && payEmail !== accountEmail) {
					return suspendUser(ownerId, `purchase paid with ${s.customer_details.email} — account is ${authUser?.email || profile?.email}`);
				}
				if (namesClash(s.customer_details?.name, kycName)) {
					return suspendUser(ownerId, `purchase payer "${s.customer_details.name}" does not match verified identity`);
				}
			}
		}

		return { ok: true };
	} catch (err) {
		logger.warn('payout scan failed open', String(err?.message || err));
		return { ok: true, skipped: 'error' };
	}
}

export async function unsuspendUser(ownerId) {
	const rows = await supabaseRest('/rest/v1/users', {
		query: { select: 'id,user_settings', id: `eq.${ownerId}`, limit: 1 },
	}).catch(() => null);
	if (!rows?.[0]) return null;
	const cur = rows[0].user_settings && typeof rows[0].user_settings === 'object' ? rows[0].user_settings : {};
	const settings = { ...cur, suspended: false, unsuspendedAt: new Date().toISOString() };
	delete settings.suspendedReason;
	delete settings.suspendedDetail;
	await supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(ownerId)}`, {
		method: 'PATCH', body: { user_settings: settings },
	});
	return settings;
}
