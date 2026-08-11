// Supabase REST client for the API server (service-role + user-token calls).
// Replaces the former PocketBase data layer (no PocketBase runs in production).
import logger from './logger.js';

const BASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function supabaseConfigured() {
	return Boolean(BASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

async function request(path, { token, service = false, method = 'GET', body, prefer, query } = {}) {
	if (!BASE_URL || !ANON_KEY || (!service && !token)) {
		throw new Error('Supabase is not configured for the API. Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env');
	}
	const key = service ? SERVICE_ROLE_KEY : ANON_KEY;
	const auth = service ? SERVICE_ROLE_KEY : token;

	const headers = {
		apikey: key,
		Authorization: `Bearer ${auth}`,
		'Content-Type': 'application/json',
	};
	if (prefer) headers.Prefer = prefer;

	let url = `${BASE_URL}${path}`;
	if (query) {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.append(k, v);
		const qs = params.toString();
		if (qs) url += (url.includes('?') ? '&' : '?') + qs;
	}

	const res = await fetch(url, {
		method,
		headers,
		...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		logger.error(`Supabase ${method} ${path} failed: ${res.status} ${res.statusText}`, text.slice(0, 300));
		throw new Error(`Supabase ${method} request failed: ${res.status}`);
	}
	if (res.status === 204) return null;
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

// Validate a browser-issued Supabase JWT and return its user (GoTrue).
export async function getSupabaseUser(token) {
	if (!token || !BASE_URL || !ANON_KEY) return null;
	try {
		const res = await fetch(`${BASE_URL}/auth/v1/user`, {
			headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return null;
		const data = await res.json();
		return data?.id ? data : null;
	} catch {
		return null;
	}
}

// Low-level service-role access, used by modules that need raw REST calls
// (e.g. the AI chat history/image persistence).
export function supabaseRest(path, { method = 'GET', body, prefer, query } = {}) {
	return request(path, { service: true, method, body, prefer, query });
}

export const supabase = {
	// ── users ────────────────────────────────────────────────
	getUserById: (id) =>
		request(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { service: true, query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	getUserByEmail: (email) =>
		request(`/rest/v1/users?email=eq.${encodeURIComponent(email)}`, { service: true, query: { select: 'id,email,user_settings', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	findUserWithPasskey: (credId) =>
		request('/rest/v1/users', {
			service: true,
			query: { select: 'id,email,user_settings', user_settings: `cs.{"passkeys":[{"credId":"${credId}"}]}`, limit: 1 },
		}).then((rows) => rows?.[0] || null),
	getUserByCustomerId: (customerId) =>
		request(`/rest/v1/users?paddleCustomerId=eq.${encodeURIComponent(customerId)}`, { service: true, query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	updateUser: (id, patch) =>
		request(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
			service: true, method: 'PATCH', body: patch, prefer: 'return=representation',
		}).then((rows) => rows?.[0] || null),
	createEvent: (row) =>
		request('/rest/v1/billing_events', { service: true, method: 'POST', body: row, prefer: 'return=representation' })
			.then((rows) => rows?.[0] || null),

	// ── affiliates ───────────────────────────────────────────
	getAffiliateCodeByCode: (code) =>
		request(`/rest/v1/affiliate_codes?code=eq.${encodeURIComponent(code)}`, { service: true, query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	getAffiliateCodeByOwner: (ownerId) =>
		request(`/rest/v1/affiliate_codes?owner=eq.${encodeURIComponent(ownerId)}`, { service: true, query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	createAffiliateCode: (row) =>
		request('/rest/v1/affiliate_codes', { service: true, method: 'POST', body: row, prefer: 'return=representation' })
			.then((rows) => rows?.[0] || null),
	updateAffiliateCode: (id, patch) =>
		request(`/rest/v1/affiliate_codes?id=eq.${encodeURIComponent(id)}`, {
			service: true, method: 'PATCH', body: patch, prefer: 'return=representation',
		}).then((rows) => rows?.[0] || null),
	listAffiliateSignups: (codeId) =>
		request(`/rest/v1/affiliate_signups?codeId=eq.${encodeURIComponent(codeId)}`, {
			service: true, query: { select: '*', order: 'created.desc', limit: 100 },
		}),
	getAffiliateSignup: (code, email) =>
		request(`/rest/v1/affiliate_signups?code=eq.${encodeURIComponent(code)}&email=eq.${encodeURIComponent(email)}`, {
			service: true, query: { select: '*', limit: 1 },
		}).then((rows) => rows?.[0] || null),
	createAffiliateSignup: (row) =>
		request('/rest/v1/affiliate_signups', { service: true, method: 'POST', body: row, prefer: 'return=representation' })
			.then((rows) => rows?.[0] || null),
	claimAffiliateSignups: (codeId) =>
		request(`/rest/v1/affiliate_signups?codeId=eq.${encodeURIComponent(codeId)}&status=in.(signed_up,active)`, {
			service: true, method: 'PATCH', body: { status: 'pending_payout' }, prefer: 'return=representation',
		}),

	// ── auth / sessions ──────────────────────────────────────
	// Admin-generated magic link. GoTrue does NOT send an email for this; it
	// just mints the token so we can hand out a real session after webauthn.
	// With get_hashed_token:false the API returns a plaintext one-time OTP
	// ("email_otp") that the app can exchange through its standard login
	// path (supabase.auth.verifyOtp with type 'email').
	generateMagicLinkToken: async (email) => {
		const data = await request('/auth/v1/admin/generate_link', {
			service: true, method: 'POST',
			body: { type: 'magiclink', email, get_hashed_token: false },
		});
		return {
			otp: data?.email_otp || data?.otp || null,
			tokenHash: data?.hashed_token || null,
			actionLink: data?.action_link || null,
		};
	},
};