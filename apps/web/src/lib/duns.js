import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

function headers() {
	return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
	const res = await apiServerClient.fetch(path, {
		...options,
		headers: { ...headers(), ...(options.headers || {}) },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(body?.detail ? `${body?.error || `Request failed (${res.status})`} — ${body.detail}` : (body?.error || `Request failed (${res.status})`));
	}
	return body;
}

// ── DUNS verification (Dun & Bradstreet) ───────────────────────────
export const getDunsStatus = () => api('/duns/status');
export const verifyDuns = (dunsNumber) => api('/duns/verify', { method: 'POST', body: JSON.stringify({ dunsNumber }) });
export const getDunsCompany = (duns) => api(`/duns/company?duns=${encodeURIComponent(duns)}`);
