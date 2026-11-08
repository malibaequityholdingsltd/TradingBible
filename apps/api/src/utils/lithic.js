// Lithic card-issuing client. This is intentionally sandbox-only for now:
// production card issuance needs an approved programme, card products, KYC,
// cardholder terms and funding. A sandbox API key must never be treated as
// approval to issue a real card.
import { randomUUID } from 'node:crypto';

const SANDBOX_BASE = 'https://sandbox.lithic.com/v1';
const PRODUCTION_BASE = 'https://api.lithic.com/v1';

function apiKey() {
	return process.env.LITHIC_API_KEY || '';
}

function environment() {
	return String(process.env.LITHIC_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
		? 'production'
		: 'sandbox';
}

function sandboxIssuanceEnabled() {
	return Boolean(apiKey())
		&& environment() === 'sandbox'
		&& String(process.env.LITHIC_SANDBOX_ISSUANCE_ENABLED || '').toLowerCase() === 'true';
}

function baseUrl() {
	return environment() === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

function codedError(message, { status = 502, code = 'lithic_error', detail = null } = {}) {
	const err = new Error(message);
	err.status = status;
	err.code = code;
	err.detail = detail;
	return err;
}

async function lithicRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
	const key = apiKey();
	if (!key) throw codedError('Lithic is not configured', { status: 503, code: 'lithic_unconfigured' });

	const headers = { Accept: 'application/json', Authorization: key };
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

	const res = await fetch(`${baseUrl()}${path}`, {
		method,
		headers,
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
		signal: AbortSignal.timeout(15000),
	});
	const text = await res.text().catch(() => '');
	let data = null;
	try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
	if (!res.ok) {
		throw codedError(data?.message || `Lithic request failed (${res.status})`, {
			status: res.status === 401 || res.status === 403 ? 503 : 502,
			code: 'lithic_request_failed',
			detail: data,
		});
	}
	return data;
}

export function getLithicStatus() {
	return {
		provider: 'lithic',
		environment: environment(),
		configured: Boolean(apiKey()),
		sandboxIssuanceEnabled: sandboxIssuanceEnabled(),
		productionIssuanceEnabled: false,
	};
}

export async function createSandboxVirtualCard({ userId, memo }) {
	if (!sandboxIssuanceEnabled()) {
		throw codedError('Sandbox card issuance is not enabled', { status: 503, code: 'lithic_sandbox_disabled' });
	}
	if (environment() !== 'sandbox') {
		throw codedError('Only the Lithic sandbox is enabled', { status: 503, code: 'lithic_sandbox_only' });
	}
	return lithicRequest('/cards', {
		method: 'POST',
		idempotencyKey: randomUUID(),
		body: {
			type: 'VIRTUAL',
			memo: String(memo || 'TradingBible sandbox card').slice(0, 120),
			spend_limit: 0,
			spend_limit_duration: 'TRANSACTION',
			state: 'OPEN',
			tags: {
				environment: 'sandbox',
				product: 'tradingbible-wallet',
				user_id: String(userId || '').slice(0, 80),
			},
		},
	});
}

export async function closeSandboxCard(cardToken) {
	if (!apiKey()) throw codedError('Lithic is not configured', { status: 503, code: 'lithic_unconfigured' });
	if (environment() !== 'sandbox') {
		throw codedError('Only the Lithic sandbox is enabled', { status: 503, code: 'lithic_sandbox_only' });
	}
	if (!cardToken) throw codedError('Card token is required', { status: 422, code: 'lithic_card_token_required' });
	return lithicRequest(`/cards/${encodeURIComponent(cardToken)}`, {
		method: 'PATCH',
		body: { state: 'CLOSED' },
	});
}
