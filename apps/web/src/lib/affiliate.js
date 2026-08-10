import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';

function headers() {
	return { Authorization: pb.authStore.token, 'Content-Type': 'application/json' };
}

export async function registerAffiliate() {
	const res = await apiServerClient.fetch('/affiliate/register', { method: 'POST', headers: headers() });
	if (!res.ok) throw new Error('Could not create your affiliate code');
	return res.json();
}

export async function affiliateStats() {
	const res = await apiServerClient.fetch('/affiliate/stats', { headers: headers() });
	if (!res.ok) throw new Error('Could not load affiliate stats');
	return res.json();
}

export async function claimAffiliatePayout() {
	const res = await apiServerClient.fetch('/affiliate/claim', { method: 'POST', headers: headers() });
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || 'Claim failed');
	}
	return res.json();
}

// Public — fires when a referral link is loaded anywhere on the site.
export function trackAffiliateClick(code) {
	if (!code) return;
	try {
		fetch(`/hcgi/api/affiliate/track/click?code=${encodeURIComponent(code)}`, { method: 'GET' }).catch(() => {});
	} catch { /* non-blocking */ }
}

// Public — fires after a one-time code is sent to the referred email.
export function trackAffiliateSignup(code, email) {
	if (!code || !email) return;
	try {
		fetch('/hcgi/api/affiliate/track/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, email }),
		}).catch(() => {});
	} catch { /* non-blocking */ }
}

export const REF_KEY = 'tb_ref';

export function readRefFromUrl() {
	try {
		const ref = new URLSearchParams(window.location.search).get('ref');
		if (ref) {
			const clean = String(ref).trim().slice(0, 40);
			if (clean) localStorage.setItem(REF_KEY, clean);
			return clean;
		}
		return localStorage.getItem(REF_KEY) || '';
	} catch {
		return '';
	}
}