// Dun & Bradstreet Direct+ client (company KYB / DUNS verification).
// Live calls need DNB_CLIENT_ID + DNB_CLIENT_SECRET (paid Direct+ contract).
// Without credentials every lookup falls back to a clearly-labeled sandbox
// stub so the verification flow is testable end-to-end before go-live.
import logger from '../utils/logger.js';

const API_BASE = (process.env.DNB_API_BASE || 'https://plus.dnb.com').replace(/\/+$/, '');
const CLIENT_ID = process.env.DNB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DNB_CLIENT_SECRET || '';

let tokenCache = { token: null, exp: 0 };

export function dnbConfigured() {
	return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function normalizeDuns(value) {
	return String(value || '').replace(/\D/g, '').slice(0, 9);
}

export function isValidDuns(value) {
	return /^[0-9]{9}$/.test(normalizeDuns(value));
}

async function getToken() {
	if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
	const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
	const res = await fetch(`${API_BASE}/v2/token`, {
		method: 'POST',
		headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ grant_type: 'client_credentials' }),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		logger.error('D&B token failed', res.status, text.slice(0, 200));
		throw new Error(`dnb_token_failed:${res.status}`);
	}
	const data = await res.json();
	if (!data?.access_token) throw new Error('dnb_token_empty');
	tokenCache = { token: data.access_token, exp: Date.now() + (Number(data.expiresIn || 86400) - 300) * 1000 };
	return tokenCache.token;
}

export function sandboxProfile(duns) {
	return {
		sandbox: true,
		duns: normalizeDuns(duns),
		primaryName: 'Sandbox Company (test data — not a real D&B record)',
		address: { street: '', city: '', country: 'US' },
		employeeCount: null,
		annualRevenue: null,
		industry: null,
		principals: [],
		failureScore: null,
		delinquencyScore: null,
		paydex: null,
		verificationNote: 'D&B Direct+ credentials are not configured. Wire DNB_CLIENT_ID / DNB_CLIENT_SECRET, then re-verify for a live record.',
	};
}

function parseProfile(duns, data, sandbox = false) {
	const org = data?.organization || {};
	const addr = org.primaryAddress || {};
	const principals = Array.isArray(org.currentPrincipals)
		? org.currentPrincipals.slice(0, 10).map((p) => ({
			name: p?.name?.fullName || [p?.name?.givenName, p?.name?.familyName].filter(Boolean).join(' ') || null,
			title: p?.jobTitle?.[0]?.title || p?.jobTitle?.[0]?.jobTitle || null,
		})).filter((p) => p.name)
		: [];
	const fin = org.financialStrengthInsight?.[0] || org.financialStrengthInsights?.[0] || {};
	const pay = org.paymentInsight?.[0] || {};
	return {
		sandbox,
		duns,
		primaryName: org.primaryName || null,
		address: {
			street: addr.streetAddress?.line1 || '',
			city: addr.addressLocality?.name || '',
			country: addr.addressCountry?.isoAlpha2Code || '',
		},
		employeeCount: org.numberOfEmployees?.[0]?.value ?? null,
		annualRevenue: org.annualRevenue?.[0]?.value ?? null,
		industry: org.industryCodes?.[0]?.description || null,
		principals,
		failureScore: fin.failureScore?.[0]?.score ?? fin.financialStrengthScore?.[0]?.score ?? null,
		delinquencyScore: fin.delinquencyScore?.[0]?.score ?? null,
		paydex: pay.paydexScore?.[0]?.score ?? null,
	};
}

export async function lookupCompany(duns) {
	const clean = normalizeDuns(duns);
	if (!isValidDuns(clean)) throw new Error('duns_invalid');
	if (!dnbConfigured()) {
		return { status: 'pending', profile: sandboxProfile(clean), reason: 'dnb_not_configured' };
	}
	try {
		const token = await getToken();
		const blocks = 'companyinfo_L2_v1,principalscontacts_L1_v1,financialstrengthinsight_L1_v1,paymentinsight_L2_v1';
		const res = await fetch(`${API_BASE}/v2/data/duns/${clean}?blockIDs=${blocks}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.status === 404) return { status: 'failed', profile: null, reason: 'duns_not_found' };
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			logger.error('D&B lookup failed', res.status, text.slice(0, 200));
			return { status: 'pending', profile: sandboxProfile(clean), reason: `dnb_error:${res.status}` };
		}
		const data = await res.json();
		return { status: 'verified', profile: parseProfile(clean, data), reason: null };
	} catch (err) {
		logger.error('D&B lookup error', String(err));
		return { status: 'pending', profile: sandboxProfile(clean), reason: 'dnb_unreachable' };
	}
}

// ── DUNS match: resolve a DUNS number from company name + location ──
// Direct+ CleanseMatch. Without credentials returns an empty sandbox list.
export async function matchDuns({ name, city, country }) {
	const q = String(name || '').trim();
	if (q.length < 2) throw new Error('match_name_required');
	if (!dnbConfigured()) {
		return { sandbox: true, candidates: [], reason: 'dnb_not_configured' };
	}
	try {
		const token = await getToken();
		const res = await fetch(`${API_BASE}/v2/data/match/cleansematch?blockIDs=companyinfo_L2_v1`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				organization: {
					primaryName: q,
					primaryAddress: {
						addressLocality: city ? { name: String(city) } : undefined,
						addressCountry: country ? { isoAlpha2Code: String(country).toUpperCase().slice(0, 2) } : undefined,
					},
				},
			}),
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			logger.error('D&B match failed', res.status, text.slice(0, 200));
			return { sandbox: false, candidates: [], reason: `dnb_error:${res.status}` };
		}
		const data = await res.json();
		const cands = Array.isArray(data?.matchCandidates) ? data.matchCandidates : [];
		return {
			sandbox: false,
			candidates: cands.slice(0, 5).map((c) => ({
				duns: c?.organization?.duns || null,
				name: c?.organization?.primaryName || null,
				city: c?.organization?.primaryAddress?.addressLocality?.name || null,
				country: c?.organization?.primaryAddress?.addressCountry?.isoAlpha2Code || null,
				matchScore: c?.matchQualityInformation?.matchGrade ?? null,
			})).filter((c) => c.duns),
			reason: null,
		};
	} catch (err) {
		logger.error('D&B match error', String(err));
		return { sandbox: true, candidates: [], reason: 'dnb_unreachable' };
	}
}
