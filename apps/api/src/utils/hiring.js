import { randomBytes } from 'crypto';
import logger from './logger.js';
import { supabaseRest } from './supabaseClient.js';
import { deriveEmployeeNo } from './employeeNo.js';

// ── Employee auto-provisioning (hiring pipeline) ─────────────────────
// Shared by the admin one-click Hire endpoint and the public apply flow
// when a posting has auto_accept switched on.

const isCoachPosting = (posting) =>
	/coach|mentor|teacher|academy/i.test(`${posting?.title || ''} ${posting?.department || ''}`);

export function roleForPosting(posting) {
	return isCoachPosting(posting)
		? { role: 'teacher', accountType: 'teacher' }
		: { role: 'trader', accountType: 'trader' };
}

const cleanUsername = (name, email) => {
	const base = String(name || '').trim().split(/\s+/).join('').toLowerCase().replace(/[^a-z0-9]/g, '')
		|| String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'teammate';
	return base.slice(0, 30);
};

// Find-or-create the auth account, upsert the profile row with the staff
// role, send an invite email (best effort), and stage a DISABLED mentor row
// for coaches so they surface in Mentors the moment they set a price.
// Also stamps user_settings.staff (hired/title/arrangement/hiredAt) so
// route guards + requirePlan recognize employees — staff work without
// buying a plan. Existing settings (totp, suspensions) are read-merged,
// never clobbered. Offboarding = suspend the user (existing flow) or call
// the staff-revoke endpoint, which clears this flag.
// Returns { authId, created, tempPassword|null, role }. tempPassword is only
// ever returned to admin callers — never to the public apply flow.
export async function provisionEmployee({ name, email, posting, staffMeta }) {
	const cleanEmail = String(email || '').trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('valid email required');
	const cleanName = String(name || '').trim().slice(0, 120) || cleanEmail.split('@')[0];
	const { role, accountType } = roleForPosting(posting);

	// 1. Existing profile → existing login.
	const existing = await supabaseRest('/rest/v1/users', {
		query: { select: 'id,email', email: `eq.${cleanEmail}`, limit: 1 },
	}).catch(() => null);
	let authId = existing?.[0]?.id || null;
	let created = false;
	let tempPassword = null;

	// 2. No login yet → create one with a one-time temp password.
	if (!authId) {
		tempPassword = `TB-${randomBytes(6).toString('hex')}`;
		const createdRes = await supabaseRest('/auth/v1/admin/users', {
			method: 'POST',
			body: {
				email: cleanEmail,
				password: tempPassword,
				email_confirm: true,
				user_metadata: { first_name: cleanName.split(' ')[0], hired_for: posting?.title || '' },
			},
			prefer: 'return=representation',
		}).catch((err) => ({ __hireError: String(err) }));
		authId = createdRes?.id || createdRes?.user?.id || null;
		created = Boolean(authId) && !createdRes?.__hireError;
		// Auth account exists but never applied in-app (no profile row):
		// resolve its id through a magic link instead of failing. NOTE: the
		// REST wrapper throws generic status-only messages, so match 422.
		if (!authId && /422|already|exists|registered|duplicate|conflict|409/i.test(String(createdRes?.__hireError || ''))) {
			const link = await supabaseRest('/auth/v1/admin/generate_link', {
				method: 'POST',
				body: { type: 'magiclink', email: cleanEmail },
			}).catch((err) => { logger.error('hire: resolve existing user failed', String(err)); return null; });
			authId = link?.user?.id || link?.id || null;
			tempPassword = null; // they already have a way in — invite email covers it
		}
	}
	if (!authId) throw new Error('could not provision login');

	// 3. Profile row with the staff role (merge — never duplicate). NOTE:
	// users has no phone column — the applicant's phone stays on the
	// application row where the admin can always see it.
	const trialDays = Math.max(1, Math.min(90, Number(posting?.hiring?.trial_days ?? 14)));
	// Read-merge existing settings so totp/suspension/account flags survive.
	let baseSettings = {};
	try {
		const cur = await supabaseRest('/rest/v1/users', {
			query: { select: 'user_settings', id: `eq.${authId}`, limit: 1 },
		}).catch(() => null);
		if (cur?.[0]?.user_settings && typeof cur[0].user_settings === 'object') baseSettings = cur[0].user_settings;
	} catch { /* fresh row — start empty */ }
	const profileRow = {
		id: authId,
		email: cleanEmail,
		username: cleanUsername(cleanName, cleanEmail),
		name: cleanName,
		role,
		accountType,
		user_settings: {
			...baseSettings,
			staff: {
				...(baseSettings?.staff && typeof baseSettings.staff === 'object' ? baseSettings.staff : {}),
				hired: true,
				// Registered once and kept across re-hires; deterministic from
				// the application id (or the auth id where no application row
				// exists yet) so it matches the web-side fallback.
				employeeId: baseSettings?.staff?.employeeId || deriveEmployeeNo(staffMeta?.appId || authId),
				title: posting?.title || staffMeta?.title || null,
				arrangement: staffMeta?.arrangement || null,
				workCountry: staffMeta?.workCountry || null,
				workRegion: staffMeta?.workRegion || null,
				hiredAt: new Date().toISOString(),
			},
		},
	};
	try {
		await supabaseRest('/rest/v1/users', {
			method: 'POST',
			body: { ...profileRow, trial_ends_at: new Date(Date.now() + trialDays * 864e5).toISOString() },
			prefer: 'resolution=merge-duplicates',
			query: { select: 'id' },
		});
	} catch (err) {
		// trial_ends_at column added post-deploy: hire must never fail on it.
		if (/trial_ends_at/i.test(String(err))) {
			await supabaseRest('/rest/v1/users', {
				method: 'POST', body: profileRow, prefer: 'resolution=merge-duplicates', query: { select: 'id' },
			}).catch((e2) => logger.error('hire: profile upsert failed', String(e2)));
		} else logger.error('hire: profile upsert failed', String(err));
	}

	// 4. Invite email via Supabase mailer (best effort — the temp password
	// shown to the admin is the guaranteed fallback they can share manually).
	try {
		await supabaseRest('/auth/v1/admin/invite', { method: 'POST', body: { email: cleanEmail } });
	} catch (err) { logger.warn('hire: invite email failed', String(err)); }

	// 5. Coaches surface in Mentors once they set a price (staged disabled,
	// placeholder price 0 — never invent a rate they didn't choose).
	if (isCoachPosting(posting)) {
		try {
			const existingMentor = await supabaseRest('/rest/v1/mentors', {
				query: { select: 'owner', owner: `eq.${authId}`, limit: 1 },
			}).catch(() => null);
			if (!existingMentor?.[0]) {
				await supabaseRest('/rest/v1/mentors', {
					method: 'POST',
					body: {
						owner: authId,
						headline: `${cleanName} — Trading Coach`,
						topics: ['Forex', 'Mentorship'],
						price_usd: 0,
						enabled: false,
					},
					query: { select: 'owner' },
				});
			}
		} catch (err) { logger.error('hire: mentor staging failed', String(err)); }
	}

	return { authId, created, tempPassword, role };
}

// ── Application originality signals (heuristic flags, NOT proof) ─────
// Scores 0–100 + flag list. Displayed to the admin as review signals —
// never used to auto-reject, because heuristics can't prove AI use or
// lying. Proof of work (samples, trial task, probation) is the real gate.
const GENERIC_PHRASES = [
	'passionate', 'dynamic', 'self-starter', 'self starter', 'team player',
	'fast learner', 'quick learner', 'detail-oriented', 'detail oriented',
	'leverage', 'synergy', 'think outside the box', 'go-getter', 'go getter',
	'hard worker', 'hard-worker', 'proven track record', 'results-driven',
	'results driven', 'strong communicator', 'excellent communication skills',
];

export function scoreApplication({ coverLetter, posting }) {
	const text = String(coverLetter || '');
	const lower = text.toLowerCase();
	const words = lower.split(/\s+/).filter(Boolean);
	const flags = [];
	let score = 0;

	if (!text.trim()) {
		flags.push('empty-letter');
		return { risk_score: 65, risk_flags: flags };
	}
	if (text.length < 120) { score += 25; flags.push('too-short'); }
	if (text.length > 2500) { score += 10; flags.push('too-long'); }

	const genericHits = GENERIC_PHRASES.filter((p) => lower.includes(p));
	if (genericHits.length) {
		score += Math.min(40, genericHits.length * 8);
		flags.push(`generic-phrases(${genericHits.length})`);
	}

	const firstPerson = (lower.match(/\b(i|me|my|mine|i've|i'm|i'll)\b/g) || []).length;
	if (words.length > 40 && firstPerson / words.length < 0.01) { score += 15; flags.push('impersonal'); }

	// Verbatim 3-word chunks repeated 3+ times (template/AI padding tell).
	const grams = {};
	for (let i = 0; i + 3 <= words.length; i++) {
		const g = words.slice(i, i + 3).join(' ');
		grams[g] = (grams[g] || 0) + 1;
		if (grams[g] === 3) { score += 15; flags.push('repetitive'); break; }
	}

	if (text.length > 300 && !/\d/.test(text)) { score += 10; flags.push('no-specifics'); }
	const punct = (text.match(/[.!?]/g) || []).length;
	if (words.length > 60 && punct === 0) { score += 10; flags.push('unformatted'); }

	// Role-specific vocabulary lowers the score (floor 0).
	const titleWords = String(posting?.title || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
	if (titleWords.some((w) => lower.includes(w))) {
		score = Math.max(0, score - 10);
		flags.push('role-specific');
	}
	return { risk_score: Math.min(100, score), risk_flags: flags };
}

export function riskBand(score) {
	if (score >= 60) return 'high';
	if (score >= 30) return 'review';
	return 'low';
}

// ── Small shared gates ─────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
	'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com',
	'10minutemail.com', 'yopmail.com', 'trashmail.com', 'dispostable.com',
	'maildrop.cc', 'getnada.com', 'mohmal.com', 'sharklasers.com',
	'throwawaymail.com', 'fakeinbox.com', 'emailondeck.com', 'mintemail.com',
	'mytemp.email', 'tempail.com', 'tmail.ws', 'mailnesia.com',
]);

export function emailDomainBlocked(email) {
	const domain = String(email || '').split('@')[1]?.toLowerCase() || '';
	return DISPOSABLE_DOMAINS.has(domain);
}

export function extractUrls(text) {
	const out = [];
	const re = /https?:\/\/[^\s<>"]+/gi;
	let m;
	while ((m = re.exec(String(text || ''))) !== null) out.push(m[0].replace(/[).,;]+$/, ''));
	return [...new Set(out)].slice(0, 8);
}

// Best-effort reachability: true if at least one URL answers. Network
// failures resolve 'unverified' (never punish the applicant for our net).
export async function verifySampleUrls(urls) {
	if (!urls.length) return { samples_ok: false, samples_note: 'none' };
	const checks = await Promise.all(urls.map(async (u) => {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), 8000);
			const r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
			clearTimeout(timer);
			if (r.ok) return true;
			const ctrl2 = new AbortController();
			const timer2 = setTimeout(() => ctrl2.abort(), 8000);
			const r2 = await fetch(u, { method: 'GET', redirect: 'follow', signal: ctrl2.signal });
			clearTimeout(timer2);
			return r2.ok;
		} catch { return null; }
	}));
	if (checks.some((c) => c === true)) return { samples_ok: true, samples_note: 'verified' };
	if (checks.some((c) => c === null)) return { samples_ok: false, samples_note: 'unverified' };
	return { samples_ok: false, samples_note: 'unreachable' };
}
