import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import Stripe from 'stripe';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { supabase, getSupabaseUser, supabaseRest } from '../utils/supabaseClient.js';
import { provisionEmployee } from '../utils/hiring.js';
import { mergeStaffCard, staffCardFromApplication, withStaffCard } from '../utils/staffCard.js';
import { tbcBalances as balances } from '../utils/tbc-econ.js';
import { TBC_META, tbcContracts } from './tbc.js';
import { supabaseAuth } from '../middleware/supabase-auth.js';

let API_VERSION = '1.1.0';
try {
	API_VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version || API_VERSION;
} catch { /* keep default */ }

const BOOT_TS = Date.now();

const router = Router();

function isAdminEmail(email) {
	const value = String(email || '').toLowerCase();
	return /@tradingbible\.net$/.test(value) || value === 'malibaequityholdingsltd@outlook.com' || value === 'tradingbible@hotmail.com';
}

async function assertAdmin(req) {
	const token = req.headers.authorization?.split(' ')?.[1];
	const user = await getSupabaseUser(token);
	if (!user) {
		const err = new Error('Your session has expired. Please sign in again.');
		err.status = 401;
		throw err;
	}
	const profile = await supabase.getUserById(user.id);
	if (profile?.role === 'admin' || isAdminEmail(user.email)) {
		return user;
	}
	const err = new Error('Admin access required.');
	err.status = 403;
	throw err;
}

// GET /api/admin/users — full user list via service role (RLS bypass).
// Browser `useUsers` falls back here when the `users` table is RLS-blocked.
// Auth users are the source of truth for who has signed up; `users`-table
// rows add profile data (role, plan, settings) where present.
router.get('/users', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const [rows, authUsers] = await Promise.all([
			supabaseRestListUsers(),
			supabaseRestListAuthUsers(),
		]);
		const byEmail = new Map(rows.map((u) => [String(u.email).toLowerCase(), u]));
		const byId = new Map(rows.map((u) => [String(u.id), u]));
		const merged = new Map();
		for (const au of authUsers) {
			const p = byId.get(String(au.id)) || byEmail.get(String(au.email).toLowerCase());
			merged.set(au.id, {
				id: au.id,
				email: au.email,
				username: p?.username || au.user_metadata?.username || (au.email || '').split('@')[0],
				name: p?.name || au.user_metadata?.name || p?.username || (au.email || '').split('@')[0],
				role: p?.role || au.user_metadata?.role || 'user',
				plan: p?.plan || au.user_metadata?.plan || null,
				accountType: p?.accountType || au.user_metadata?.accountType || 'individual',
				user_settings: p?.user_settings || null,
				paddleCustomerId: p?.paddleCustomerId || null,
				created_at: au.created_at || p?.created_at,
				confirmed: Boolean(au.email_confirmed_at || au.confirmed_at || au.last_sign_in_at),
			});
		}
		for (const u of rows) {
			if (!merged.has(u.id)) {
				merged.set(u.id, {
					id: u.id,
					email: u.email,
					username: u.username || (u.email || '').split('@')[0],
					name: u.name || u.username || (u.email || '').split('@')[0],
					role: u.role || 'user',
					plan: u.plan || null,
					accountType: u.accountType || 'individual',
					user_settings: u.user_settings || null,
					paddleCustomerId: u.paddleCustomerId || null,
					created_at: u.created_at,
					confirmed: true,
				});
			}
		}
		const users = [...merged.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
		res.json(users);
	} catch (err) {
		next(err);
	}
});

// PATCH /api/admin/users/:id — suspend / unsuspend (identity-review gate).
// Body: { suspended: boolean, reason?: string }
router.patch('/users/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const id = String(req.params.id || '').trim();
		if (!id) return res.status(422).json({ error: 'user id required' });
		const suspended = req.body?.suspended !== false;
		if (suspended) {
			const reason = String(req.body?.reason || 'manual review').slice(0, 300);
			const { supabaseRest: rest } = await import('../utils/supabaseClient.js');
			const rows = await rest('/rest/v1/users', {
				query: { select: 'id,user_settings', id: `eq.${id}`, limit: 1 },
			}).catch(() => null);
			const cur = rows?.[0]?.user_settings && typeof rows[0].user_settings === 'object' ? rows[0].user_settings : {};
			const settings = { ...cur, suspended: true, suspendedAt: new Date().toISOString(), suspendedReason: 'manual', suspendedDetail: reason };
			if (rows?.[0]) {
				await rest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { user_settings: settings } });
			} else {
				await rest('/rest/v1/users', { method: 'POST', body: { id, user_settings: settings }, prefer: 'return=representation,resolution=merge-duplicates' });
			}
			logger.warn(`account suspended manually ${id}: ${reason}`);
			return res.json({ ok: true, suspended: true });
		}
		const { unsuspendUser } = await import('../utils/payout-scan.js');
		await unsuspendUser(id);
		logger.warn(`account unsuspended manually ${id}`);
		return res.json({ ok: true, suspended: false });
	} catch (err) {
		next(err);
	}
});

async function supabaseRestListUsers() {
	return supabaseRest('/rest/v1/users', {
		query: { select: '*', order: 'created_at.desc', limit: 5000 },
	});
}

async function supabaseRestListAuthUsers() {
	try {
		const data = await supabaseRest('/auth/v1/admin/users', { query: { per_page: 1000 } });
		return Array.isArray(data) ? data : (data?.users || []);
	} catch {
		return [];
	}
}

// ── Trading signals ────────────────────────────────────────────────
// `trading_signals` rows are owner-scoped under RLS, so all admin reads,
// writes and deletes go through the service role here.

router.get('/signals', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/trading_signals', {
			query: { select: '*', order: 'created.desc', limit: 1000 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/signals', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const body = req.body || {};
		const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
		const meta = { ...(body.meta && typeof body.meta === 'object' ? body.meta : {}) };
		if (body.timeframe) meta.timeframe = String(body.timeframe).trim().slice(0, 10);
		if (body.signalType) meta.signalType = String(body.signalType).trim().slice(0, 40);
		if (body.strength) meta.strength = String(body.strength).trim().slice(0, 20);
		if (body.reason) meta.reason = String(body.reason).trim().slice(0, 2000);
		const row = {
			owner: admin.id,
			symbol: String(body.symbol || '').trim().toUpperCase().slice(0, 12) || 'BTCUSD',
			side: String(body.side || 'long').trim().toLowerCase().slice(0, 6),
			entry: num(body.entry),
			target: num(body.target),
			stop: num(body.stop),
			status: ['published', 'draft', 'rejected'].includes(body.status) ? body.status : 'published',
			source: 'admin',
			meta: Object.keys(meta).length ? meta : null,
			created: new Date().toISOString(),
		};
		const created = await supabaseRest('/rest/v1/trading_signals', {
			method: 'POST', body: row, prefer: 'return=representation', query: { select: '*' },
		});
		res.status(201).json(created?.[0] || row);
	} catch (err) { next(err); }
});

router.patch('/signals/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		if (req.body) {
			if ('status' in req.body && ['published', 'draft', 'rejected'].includes(req.body.status)) patch.status = req.body.status;
			if ('side' in req.body) patch.side = String(req.body.side).trim().toLowerCase().slice(0, 6);
			if ('symbol' in req.body) patch.symbol = String(req.body.symbol).trim().toUpperCase().slice(0, 12);
			const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
			if ('entry' in req.body) patch.entry = num(req.body.entry);
			if ('target' in req.body) patch.target = num(req.body.target);
			if ('stop' in req.body) patch.stop = num(req.body.stop);
			if ('meta' in req.body && req.body.meta && typeof req.body.meta === 'object') patch.meta = req.body.meta;
		}
		const updated = await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/signals/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/trading_signals?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Community forum ────────────────────────────────────────────────
// Reads are public (community is shared), but moderation writes and
// deletes go through the service role to avoid RLS ownership checks.

router.get('/forum', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const [threads, replies] = await Promise.all([
			supabaseRest('/rest/v1/forum_threads', { query: { select: '*', order: 'created.desc', limit: 2000 } }),
			supabaseRest('/rest/v1/forum_replies', { query: { select: '*', limit: 5000 } }),
		]);
		res.json({ threads: threads || [], replies: replies || [] });
	} catch (err) { next(err); }
});

router.patch('/forum/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		const allowed = ['pinned', 'locked'];
		for (const key of allowed) {
			if (req.body && key in req.body) patch[key] = Boolean(req.body[key]);
		}
		await supabaseRest(`/rest/v1/forum_threads?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation',
		});
		res.json({ id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/forum/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const id = req.params.id;
		await supabaseRest(`/rest/v1/forum_replies?thread=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
		await supabaseRest(`/rest/v1/forum_threads?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

router.delete('/forum-replies/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/forum_replies?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Mentors ──────────────────────────────────────────────────────────
// Mentor directory oversight. Profiles are created by users via
// POST /market/mentors/register; admins can enable/disable or edit them.

router.get('/mentors', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/mentors', {
			query: { select: '*', order: 'created_at.desc', limit: 1000 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.patch('/mentors/:owner', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		if (req.body) {
			if ('enabled' in req.body) patch.enabled = Boolean(req.body.enabled);
			if ('headline' in req.body) patch.headline = String(req.body.headline || '').slice(0, 140);
			if ('price_usd' in req.body) {
				const n = Number(req.body.price_usd);
				if (!Number.isNaN(n) && n >= 0) patch.price_usd = n;
			}
			if ('topics' in req.body && Array.isArray(req.body.topics)) {
				patch.topics = req.body.topics.map((t) => String(t).slice(0, 40)).slice(0, 12);
			}
		}
		const updated = await supabaseRest(`/rest/v1/mentors?owner=eq.${encodeURIComponent(req.params.owner)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { owner: req.params.owner, ...patch });
	} catch (err) { next(err); }
});

router.get('/mentors/sessions', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/mentor_sessions', {
			query: { select: '*', order: 'created_at.desc', limit: 1000 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

// ── Wallet overview (read-only) ──────────────────────────────────────
// Platform-wide money-movement oversight. No transfer/withdraw powers:
// all value movement stays in user-scoped /wallet routes + billing refunds.

router.get('/wallet/overview', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const [trackers, rails, txns, crypto, ledger] = await Promise.all([
			supabaseRest('/rest/v1/wallet_trackers', { query: { select: 'id,network,created', order: 'created.desc', limit: 1000 } }),
			supabaseRest('/rest/v1/wallet_money_rails', { query: { select: 'connect_status,kyc_status', limit: 1000 } }),
			supabaseRest('/rest/v1/bank_transactions', { query: { select: '*', order: 'created.desc', limit: 25 } }),
			supabaseRest('/rest/v1/crypto_accounts', { query: { select: 'id', limit: 1000 } }),
			supabaseRest('/rest/v1/bank_transactions', { query: { select: 'kind,amount,currency,asset,status,created', order: 'created.desc', limit: 5000 } }),
		]);
		const byStatus = {};
		for (const t of txns || []) byStatus[t.status || 'unknown'] = (byStatus[t.status || 'unknown'] || 0) + 1;
		const OUTFLOW_KINDS = new Set(['withdraw', 'withdraw_crypto', 'pay', 'transfer_out', 'swap']);
		const isTbcRow = (t) => String(t.currency || '').toUpperCase() === 'TBC' || String(t.asset || '').toUpperCase() === 'TBC';
		const sums = { inUsd: 0, outUsd: 0, inTbc: 0, outTbc: 0, inUsd30d: 0, outUsd30d: 0, inTbc30d: 0, outTbc30d: 0, pendingUsd: 0, issuedTbc: 0, circulatingTbc: 0 };
		const cutoff = Date.now() - 30 * 864e5;
		for (const t of ledger || []) {
			const amt = Math.abs(Number(t.amount) || 0);
			const isTbc = isTbcRow(t);
			const out = OUTFLOW_KINDS.has(t.kind);
			const recent = new Date(t.created).getTime() >= cutoff;
			if (['pending', 'processing'].includes(String(t.status)) && !isTbc) sums.pendingUsd += amt;
			if (isTbc) {
				if (!out) sums.issuedTbc += amt;
				sums.circulatingTbc += out ? -amt : amt;
				sums[out ? 'outTbc' : 'inTbc'] += amt;
				if (recent) sums[out ? 'outTbc30d' : 'inTbc30d'] += amt;
			} else {
				sums[out ? 'outUsd' : 'inUsd'] += amt;
				if (recent) sums[out ? 'outUsd30d' : 'inUsd30d'] += amt;
			}
		}
		const maxSupply = Number(TBC_META.maxSupply) || 100000000;
		const contracts = tbcContracts();
		const tbcSupply = {
			maxSupply,
			issuedTbc: Math.round(sums.issuedTbc * 100) / 100,
			circulatingTbc: Math.round(sums.circulatingTbc * 100) / 100,
			remainingTbc: Math.round((maxSupply - sums.issuedTbc) * 100) / 100,
			onChainDeployed: Object.values(contracts).some(Boolean),
			allocation: TBC_META.allocation,
		};
		res.json({
			trackedWallets: (trackers || []).length,
			railsOnboarded: (rails || []).filter((r) => r.connect_status && r.connect_status !== 'none').length,
			kycVerified: (rails || []).filter((r) => r.kyc_status === 'verified').length,
			cryptoAccounts: (crypto || []).length,
			recentTransactions: txns || [],
			transactionsByStatus: byStatus,
			money: sums,
			tbcSupply,
		});
	} catch (err) { next(err); }
});

// ── Generic admin_integrations CRUD (courses, calendar events, etc.) ──
// Content lives in `admin_integrations` under prefixed keys:
//   course:*   — academy course catalog
//   cal_event:* — curated economic calendar events
//   copy:*     — site-copy overrides (see GET /admin/content-copy below)
// The `config` jsonb holds the payload; `enabled` is the publish toggle.

function slugify(raw) {
	return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
}

router.get('/content/:prefix', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const prefix = String(req.params.prefix || '').replace(/[^a-z_-]/gi, '').slice(0, 20);
		if (!prefix) return res.status(400).json({ error: 'invalid prefix' });
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', 'key': `like.${prefix}:%`, order: 'created.desc', limit: 500 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/content/:prefix', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const prefix = String(req.params.prefix || '').replace(/[^a-z_-]/gi, '').slice(0, 20);
		if (!prefix) return res.status(400).json({ error: 'invalid prefix' });
		const body = req.body || {};
		const slug = slugify(body.slug || body.title);
		const row = await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST',
			body: {
				key: `${prefix}:${slug}`,
				provider: String(body.provider || 'admin').slice(0, 20),
				config: body.config && typeof body.config === 'object' ? body.config : {},
				enabled: body.enabled !== false,
			},
			prefer: 'return=representation',
			query: { select: '*' },
		});
		res.status(201).json(row?.[0] || { id: admin.id });
	} catch (err) { next(err); }
});

router.patch('/content/:prefix/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { query: { select: '*', limit: 1 } });
		const existing = rows?.[0];
		if (!existing) return res.status(404).json({ error: 'item not found' });
		const patch = {};
		const body = req.body || {};
		if (body.config !== undefined && body.config && typeof body.config === 'object') patch.config = { ...(existing.config || {}), ...body.config };
		if (body.enabled !== undefined) patch.enabled = body.enabled !== false;
		const updated = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, ...patch });
	} catch (err) { next(err); }
});

router.delete('/content/:prefix/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Public: site-copy overrides (no auth — marketing copy is public) ─
// Admin-curated i18n key → value pairs. The web app merges these over its
// built-in English strings so admins can rewrite page copy without code.
// Rows live under `copy:*` keys with config { key (i18n key), value }.
router.get('/content-copy', async (req, res, next) => {
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config', 'key': 'like.copy:%', enabled: 'eq.true', order: 'created.desc', limit: 200 },
		});
		const overrides = {};
		for (const r of rows || []) {
			const k = r?.config?.key || String(r?.key || '').replace(/^copy:/, '');
			const v = r?.config?.value;
			if (k && typeof v === 'string' && v && !(k in overrides)) overrides[k] = v;
		}
		res.json({ overrides });
	} catch (err) { next(err); }
});

// ── Company Bible (admin-only, A–Z, nothing hidden) ───────────────
// Single source of truth for every company/brand fact admins see in the
// Company widget + /admin/company page. Stored as one row in
// `admin_integrations` (key `company:profile`, config = full JSON object)
// so no migration is needed. GET returns stored config merged over
// COMPANY_DEFAULTS; PUT replaces the stored config wholesale.
export const COMPANY_DEFAULTS = {
	identity: {
		name: 'TradingBible',
		shortName: 'TB',
		tagline: 'TradingBible',
		formation: 'August 10, 2026 — TradingBible LLC is the SOLE company. No second entity.',
		mission: 'Empower traders and investors through transparent, data-driven market intelligence, advanced financial technology, trading analytics, risk management, and accessible education.',
		vision: 'Establish TradingBible as a globally recognized financial technology ecosystem connecting professional trading tools, brokerage infrastructure, market intelligence, digital assets, and investment technology.',
		purpose: 'Develop, own, operate, license, and commercialize lawful fintech platforms, software, analytical tools, educational products, data services, and related businesses — subject to applicable licenses.',
		voice: 'Professional, precise, research-driven, globally accessible, transparent about financial risks.',
		responseSLA: 'Team responds within one business day.',
		officialDescription: 'TradingBible LLC is a Delaware-registered financial technology company developing an integrated ecosystem of professional trading intelligence, market analytics, financial education, and trading software. Website: https://tradingbible.app. Software and education do NOT constitute authorization to provide regulated brokerage, advisory, exchange, or custodial services.',
	},
	legal: {
		legalName: 'TradingBible LLC',
		form: 'Delaware limited liability company',
		formed: 'August 10, 2026 (Certificate of Formation)',
		ein: 'Issued — IRS EIN confirmation notice (CP575G).',
		duns: 'D-U-N-S 14-997-6777 — VERIFIED.',
		naics: '511210',
		agent: 'Delaware Registered Agent, Inc.',
		holdingCompany: 'NOT FORMED — TradingBible Holdings, Inc. is ON HOLD. No second EIN, corporation, or conversion needed to keep building.',
		licenseNote: 'Formation certificate, EIN, and D-U-N-S are business credentials — NONE is a brokerage license. No live client deposits until a licensed entity + banking + safeguarding exist.',
		jurisdiction: 'England & Wales (Terms); U.S. retail forex $20M minimum adjusted net capital; Nigeria substance if managed from Nigeria; brokerage structure decided with U.S. + Nigerian counsel BEFORE onboarding.',
		liabilityCap: 'Greater of 12 months fees or USD 100.',
		dataController: 'TradingBible LLC',
		franchiseTax: 'Delaware LLC: $300 annual tax, due June 1 (not the corporate franchise-tax regime).',
		records: 'Certificate of Formation, EIN notice, operating agreement, ownership records, registered-agent agreement, material contracts, accounting records, tax filings.',
		taxNote: 'Cross-border Nigeria/US adviser required. Foreign-owned U.S. disregarded LLC may owe Form 5472 + pro forma 1120 even with no U.S. tax liability.',
		fundraising: 'Distinguish issuing membership interests vs borrowing. NEVER advertise public shares or an IPO as already available.',
	},
	holdings: {
		status: 'ON HOLD — TradingBible LLC remains the official operating company. Holdings is a future option, not a current entity.',
		parent: 'TradingBible Holdings, Inc. — proposed only, NOT formed, no EIN, no conversion.',
		ticker: 'TB',
		tickerStatus: 'Proposed future ticker — NOT reserved, NOT approved. IPO is a long-term objective, not a guaranteed outcome.',
		divisions: 'Product divisions & strategic initiatives under ONE LLC (NOT subsidiaries, NOT incorporated): TradingBible Terminal · Intelligence (research/SI/signals/education) · Prop (challenges/analytics) · Developer (APIs/SDKs/white-label) · Brokerage (FUTURE, regulated) · Coin (proposed TBC). Separate entities only later for regulators/investors/tax/risk.',
		coin: 'TBC — TradingBible Coin (proposed native asset)',
		coinStatus: 'Max 100,000,000 TBC. Cosmos SDK + CometBFT + Cosmos EVM. No routine minting past max. $50K = testnet budget target (not proof of funding). 90-day public testnet observation planned; mainnet conditional on legal/technical/security approvals. Any sale/staking/yield/listing needs jurisdiction-specific legal analysis. TBC IS NOT equity — never interchangeable with stock.',
		control: 'No public shares exist. A future Delaware C-Corp may suit institutional investment later; do not create one now.',
	},
	brand: {
		colors: 'Signature gold · midnight black · light gold · ivory. Gold #d4af37 · light #f4e6a8 · dark #a67c1e · bg #0a0a0f · card #0f0f14 · text #f0ecdd · muted #8a8577 · dim #6a665a.',
		logo: 'Official TB logo + separate TBC token symbol (supplied by founder). Rounded dark square, gold border/chevron + dot. Bundled /logos/tradingbible-logo.png + CDN fallback. Favicon set.',
		typography: 'system-ui stack; ui-monospace for numbers.',
		voice: 'Professional, precise, research-driven, globally accessible, transparent about financial risks.',
		emailShell: 'Dark #07070a/#0b0b10, gold border, TradingBible header, footer TradingBible LLC · tradingbible.app, tagline: Trade like the 1%. Journal like a fund.',
		socials: 'twitter.com/tradingbible · discord.gg/tradingbible · github.com/tradingbible (+ facebook/linkedin/instagram/youtube/tiktok @tradingbible in footer).',
		attribution: '“Charts by TradingBible” / “Powered by TradingBible” only if the charting IP is genuinely ours and third-party market-data attribution is satisfied.',
	},
	contacts: {
		website: 'https://tradingbible.app',
		support: 'support@tradingbible.app',
		legal: 'legal@tradingbible.app',
		privacy: 'privacy@tradingbible.app',
		ads: 'ads@tradingbible.app',
	},
	leadership: {
		ceo: 'Malik Nlem — Founder & Chief Executive',
		vp: 'Victor Okechukwu — Vice President',
		quant: 'Maliba SI — Head of Quantitative Research (platform SI research function)',
		team: 'Operators, engineers, and quants from global markets and technology.',
		confirmNote: 'Titles from the company profile — CONFIRM before publishing as formal officer appointments.',
		advisers: 'None engaged: Goldman Sachs / Morgan Stanley / J.P. Morgan / Jefferies / Chapel Hill Denham / Renaissance Capital (proposed only). Hire Delaware + U.S. securities + Nigerian counsel + tax + regulatory first.',
	},
	markets: {
		coverage: 'Metals XAU/USD + silver · Crypto BTC/USD, ETH, SOL+ · Forex EUR/USD, GBP/USD, USD/JPY+ · U.S. (+eventually other) equities · S&P 500 / Nasdaq indices+ · Crude, natgas, copper, agriculturals · Sector + broad-market ETFs. Gold + Bitcoin are signature markets.',
		feeds: 'Binance klines (crypto) · Finnhub (US stocks) · Alpha Vantage cached (equities/forex, 25 req/day free) · synthetic fallback so charts never render empty. SYNTHETIC DATA MUST NEVER BE REPRESENTED AS REAL OR EXECUTABLE PRICES.',
		dataStandard: 'Institutional order flow needs licensed exchange-grade data: timestamps, provenance, venue-specific depth.',
		categories: 'Forex · Gold · Bitcoin derivatives · Stocks & indices · Commodities · Crypto spot. Regulated launch starts with a manageable set.',
		mt5: 'MT_BRIDGE_URL=https://bridge.tradingbible.app (PROPOSED — not deployed, needs domain/TLS/backend) · MT_BRIDGE_TOKEN = securely-generated server secret in a secrets manager, NEVER in client apps. A custom bridge grants NO MT5 server rights and NO brokerage authorization (needs commercial MT5 arrangements).',
		liquidity: 'Evaluate institutional liquidity, FIX connectivity, broker back-office, risk engines, MT5 broker availability. Start largely externally hedged.',
	},
	product: {
		version: '1.2.0 live (documented scope — not an independent audit).',
		stack: 'React 18 + Vite + Tailwind · Node + Express 5 · Supabase Postgres RLS · Paddle/Stripe · VPS Ubuntu + PM2 + Nginx + Lets Encrypt.',
		surfaces: 'Terminal Pro · journal · analytics · SI reports/coach (Elite+) · signals/indicators · risk tools · backtest/paper · challenges/prop analytics · broker sync · alerts/heatmaps/order-flow · community · academy/mentors/webinars · TV · wallet/billing · API/white-label (Professional) · TBC page · admin portal · 24-mission Pro-Guide.',
		terminal: 'Proprietary Terminal Pro + future Chart SDK as licensable assets. A charting terminal is NOT an exchange or broker — execution, custody, data redistribution, client accounts need separate agreements + authorization.',
		persistence: 'Auto-save drawings, annotations, watchlists, layouts, journal entries, prop-firm activity across sessions. Broker/prop sync must be permission-based with provider integrations.',
		auth: 'Supabase GoTrue (OTP / magic links / WebAuthn passkeys) + branded Send-Email webhook hook. RBAC, RLS, hardware-backed admin auth, key rotation, audit logs, backups, DR, pen-tests, incident response as we scale.',
	},
	monetization: {
		plans: 'Pro $19.99/mo (journal/analytics/risk) · Elite SI $49.99/mo (SI reports/coaching/integrations) · Professional $99/mo (API/webhooks/white-label). VERIFIED current checkout prices. Stripe, no free trial, card required. 14-day money-back on first subscription.',
		lines: 'Subscriptions + developer licensing + chart widgets + institutional software + ads + education/mentorship + affiliates + eligible prop-firm services. Future brokerage commissions/spreads/fees ONLY after legal + regulatory clearance.',
		tractionNote: 'NO verified revenue, profit, valuation, MRR, customer, or growth figures supplied — all pending confirmation, never estimated as achievements. (ARPU ~$36.89 illustrative only.)',
		payouts: 'CFD withdrawals every 14 days to TBC wallet (80% standard → 90% scaling; 1-step fixed 90%). First funded payout refunds entry fee in TBC.',
	},
	compliance: {
		kyc: 'Passkeys · session management · KYC-gated profiles (frozen after verification) · suspend/close lifecycle · AML/KYC, sanctions screening, SoF, transaction monitoring, withdrawal approvals, reconciliation, complaint handling.',
		segregation: 'Separate operating money / regulatory capital / client funds / crypto assets. Client assets are never company funding.',
		credentials: 'Certificate + EIN + D-U-N-S are credentials, NOT licenses. Brokerage legal structure decided with counsel BEFORE onboarding or deposits.',
		filings: 'U.S.: restructuring + audited financials + Form S-1 + prospectus + SEC review + exchange application + underwriting/pricing. Nigeria: issuer eligibility + SEC registration + NGX admission. Delaware LLC cannot assume direct NGX Growth listing.',
		readiness: 'Cap table · 3-yr projections · audited accounts · licenses · risk disclosures · IP records · material contracts · cybersecurity · litigation · governance · use of proceeds. Costs: brokerage $720K–$2.09M · IPO prep $1.1M–$4M + %.',
	},
	roadmap: {
		phases: '1 LLC formation Completed → 2 IRS EIN Completed → 3 D-U-N-S Reported obtained → 4 Platform verification Requires current audit → 5 Revenue validation Figures pending → 6 Proprietary terminal Expansion roadmap → 7 Brokerage licensing Planned → 8 TBC testnet/mainnet Planned → 9 Institutional financing Future → 10 Restructuring/IPO Long-term.',
		first90: 'Days 1–30: verify records/ownership/tax, appoint counsel, commission licensing + IPO feasibility. Days 31–60: plan/model/capital/architecture + MT5/liquidity RFQs. Days 61–90: jurisdiction shortlist + vendor quotes + prototype scope + funding/governance plan.',
		nextPriorities: 'Verify operational + financial records · meet tax/compliance (Delaware $300/yr Jun 1; 5472/1120 if applicable) · strengthen proprietary tech · decide which regulated line to pursue first.',
		strategy: 'Regulated brokerage + proprietary tech (licensing/market-data/enterprise), not commissions alone. IPO is a milestone earned via performance, not a launch prerequisite. Blueprint is a working master plan — verify all claims before banks/regulators/investors.',
	},
};

export function companyContextText(c) {
	const d = { ...COMPANY_DEFAULTS, ...(c || {}) };
	const pick = (o) => Object.entries(o || {}).map(([k, v]) => `${k}: ${v}`).join(' | ');
	return [
		`Identity — ${pick(d.identity)}`,
		`Legal — ${pick(d.legal)}`,
		`Holdings — ${pick(d.holdings)}`,
		`Brand — ${pick(d.brand)}`,
		`Contacts — ${pick(d.contacts)}`,
		`Leadership — ${pick(d.leadership)}`,
		`Markets — ${pick(d.markets)}`,
		`Product — ${pick(d.product)}`,
		`Monetization — ${pick(d.monetization)}`,
		`Compliance — ${pick(d.compliance)}`,
		`Roadmap — ${pick(d.roadmap)}`,
	].join('\n');
}

router.get('/company', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: '*', key: 'eq.company:profile', limit: 1 },
		}).catch(() => []);
		const stored = rows?.[0]?.config && typeof rows[0].config === 'object' ? rows[0].config : {};
		const merged = {};
		for (const k of Object.keys(COMPANY_DEFAULTS)) merged[k] = { ...COMPANY_DEFAULTS[k], ...(stored[k] || {}) };
		res.json({ defaults: COMPANY_DEFAULTS, profile: merged, stored: Boolean(rows?.[0]), updated: rows?.[0]?.updated || null });
	} catch (err) { next(err); }
});

router.put('/company', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const body = req.body && typeof req.body === 'object' ? req.body : {};
		const config = {};
		for (const k of Object.keys(COMPANY_DEFAULTS)) {
			if (body[k] && typeof body[k] === 'object') config[k] = body[k];
			else config[k] = COMPANY_DEFAULTS[k];
		}
		const existing = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'id', key: 'eq.company:profile', limit: 1 },
		}).catch(() => []);
		let row;
		if (existing?.[0]?.id) {
			const updated = await supabaseRest(`/rest/v1/admin_integrations?id=eq.${encodeURIComponent(existing[0].id)}`, {
				method: 'PATCH', body: { config, enabled: true }, prefer: 'return=representation', query: { select: '*' },
			});
			row = updated?.[0];
		} else {
			const created = await supabaseRest('/rest/v1/admin_integrations', {
				method: 'POST',
				body: { key: 'company:profile', provider: 'admin', config, enabled: true },
				prefer: 'return=representation', query: { select: '*' },
			});
			row = created?.[0];
		}
		res.json({ ok: true, profile: config, updated: row?.updated || null });
	} catch (err) { next(err); }
});

// ── System health ────────────────────────────────────────────────
// Live service checks for the admin dashboard (replaces hardcoded ok).
router.get('/health', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const checks = {
			supabase: false,
			smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
			stripe: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY),
			paddle: Boolean(process.env.PADDLE_LIVE_API_KEY || process.env.PADDLE_SANDBOX_API_KEY),
			dnb: Boolean(process.env.DNB_CLIENT_ID && process.env.DNB_CLIENT_SECRET),
			alphaVantage: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
			finnhub: Boolean(process.env.FINNHUB_API_KEY),
			market: false,
		};
		try {
			const ping = await supabaseRest('/auth/v1/admin/users', { query: { per_page: 1 } });
			checks.supabase = ping !== undefined;
		} catch { checks.supabase = false; }
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 4000);
			const r = await fetch('https://api.binance.com/api/v3/ping', { signal: ctrl.signal }).catch(() => null);
			checks.market = Boolean(r && r.ok);
			clearTimeout(t);
		} catch { checks.market = false; }
		res.json({
			status: checks.supabase ? 'ok' : 'degraded',
			version: API_VERSION,
			uptimeSec: Math.floor((Date.now() - BOOT_TS) / 1000),
			checks,
		});
	} catch (err) { next(err); }
});

// ── Recent API logs (in-memory ring buffer) ──────────────────────
router.get('/logs', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		res.json(logger.recent(req.query?.limit));
	} catch (err) { next(err); }
});

async function getBillingSummary() {
	const stripe = stripeClient();
	if (!stripe) return { configured: false };
	const priceToPlan = {};
	for (const [plan, price] of Object.entries(BILLING_PRICE_MAP())) if (price) priceToPlan[price] = plan;
	let mrrCents = 0;
	let activeCount = 0;
	const byPlan = {};
	let startingAfter;
	for (let page = 0; page < 10; page++) {
		const list = await stripe.subscriptions.list({ status: 'active', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
		for (const sub of list.data || []) {
			activeCount++;
			for (const item of sub.items?.data || []) {
				const plan = priceToPlan[item.price?.id] || 'other';
				const amt = (item.price?.unit_amount || 0) * (item.quantity || 1);
				const monthly = item.price?.recurring?.interval === 'year' ? Math.round(amt / 12) : amt;
				mrrCents += monthly;
				byPlan[plan] = (byPlan[plan] || 0) + monthly;
			}
		}
		if (!list.has_more) break;
		startingAfter = list.data?.[list.data.length - 1]?.id;
	}
	return { configured: true, mrr: mrrCents / 100, activeCount, byPlanCents: byPlan, currency: 'usd' };
}

// ── Billing summary from live Stripe data ────────────────────────
function stripeClient() {
	const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SANDBOX_SECRET_KEY || '';
	if (!key) return null;
	return new Stripe(key);
}

const BILLING_PRICE_MAP = () => ({
	pro: process.env.STRIPE_PRICE_PRO || '',
	elite: process.env.STRIPE_PRICE_ELITE || '',
	professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
});

router.get('/billing/summary', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		res.json(await getBillingSummary());
	} catch (err) { next(err); }
});

// Recent Stripe payments for a user (for admin refunds).
router.get('/billing/payments', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const userId = String(req.query?.userId || '').trim();
		if (!userId) return res.status(400).json({ error: 'userId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const profile = await supabase.getUserById(userId);
		const customerId = profile?.stripeCustomerId;
		if (!customerId) return res.json({ payments: [] });
		const list = await stripe.paymentIntents.list({ customer: customerId, limit: 10 });
		res.json({
			payments: (list.data || []).map((pi) => ({
				id: pi.id, amount: (pi.amount || 0) / 100, currency: pi.currency,
				status: pi.status, created: pi.created ? new Date(pi.created * 1000).toISOString() : null,
			})),
		});
	} catch (err) { next(err); }
});

// Cancel a user's active Stripe subscriptions at period end.
router.post('/billing/cancel', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const userId = String(req.body?.userId || '').trim();
		if (!userId) return res.status(400).json({ error: 'userId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const profile = await supabase.getUserById(userId);
		const customerId = profile?.stripeCustomerId;
		if (!customerId) return res.status(404).json({ error: 'no stripe customer for user' });
		const list = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 20 });
		const canceled = [];
		for (const sub of list.data || []) {
			if (!sub.cancel_at_period_end) await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
			canceled.push(sub.id);
		}
		res.json({ canceled });
	} catch (err) { next(err); }
});

// Refund a Stripe payment intent / charge.
router.post('/billing/refund', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const pi = String(req.body?.paymentIntentId || '').trim();
		if (!pi) return res.status(400).json({ error: 'paymentIntentId required' });
		const stripe = stripeClient();
		if (!stripe) return res.status(503).json({ error: 'stripe not configured' });
		const amount = Number(req.body?.amount);
		const refund = await stripe.refunds.create({
			payment_intent: pi,
			...(Number.isFinite(amount) && amount > 0 ? { amount: Math.round(amount * 100) } : {}),
		});
		res.json({ id: refund.id, amount: (refund.amount || 0) / 100, status: refund.status });
	} catch (err) { next(err); }
});

// ── D&B financial statements (CSV downloads) ─────────────────────
// Draft Balance Sheet + Income Statement from platform records, for D&B
// upload (D-U-N-S 14-997-6777). D&B accepts csv ≤ 10 MB. These are
// UNaudited summaries — have your accountant finalize before submitting.
const DUNS_NUMBER = '14-997-6777';
const COMPANY_LEGAL = 'TradingBible LLC';

function parseStatementPeriod(query) {
	const to = query?.to ? new Date(`${String(query.to).slice(0, 10)}T23:59:59Z`) : new Date();
	const from = query?.from ? new Date(`${String(query.from).slice(0, 10)}T00:00:00Z`) : new Date(Date.UTC(2026, 7, 1));
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
		const err = new Error('invalid from/to (use YYYY-MM-DD)');
		err.status = 400;
		throw err;
	}
	return { from, to };
}

function csvCell(v) {
	const s = String(v ?? '');
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sendStatementCsv(res, filename, rows) {
	res.setHeader('Content-Type', 'text/csv; charset=utf-8');
	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.send(`${rows.map((r) => r.map(csvCell).join(',')).join('\n')}\n`);
}

async function collectLedgerRecords(from, to) {
	const [charges, refunds, bankTxns, billingEvents] = await Promise.all([
		(async () => {
			const stripe = stripeClient();
			if (!stripe) return { gross: 0, count: 0, configured: false };
			let gross = 0, count = 0, startingAfter;
			const gte = Math.floor(from.getTime() / 1000), lte = Math.floor(to.getTime() / 1000);
			for (let page = 0; page < 20; page++) {
				const list = await stripe.charges.list({ created: { gte, lte }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
				for (const c of list.data || []) {
					if (c.status === 'succeeded' && (c.currency || '').toLowerCase() === 'usd') { gross += (c.amount || 0) / 100; count++; }
				}
				if (!list.has_more) break;
				startingAfter = list.data?.[list.data.length - 1]?.id;
			}
			return { gross, count, configured: true };
		})(),
		(async () => {
			const stripe = stripeClient();
			if (!stripe) return 0;
			let total = 0, startingAfter;
			const gte = Math.floor(from.getTime() / 1000), lte = Math.floor(to.getTime() / 1000);
			for (let page = 0; page < 20; page++) {
				const list = await stripe.refunds.list({ created: { gte, lte }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
				for (const r of list.data || []) total += (r.amount || 0) / 100;
				if (!list.has_more) break;
				startingAfter = list.data?.[list.data.length - 1]?.id;
			}
			return total;
		})(),
		supabaseRest('/rest/v1/bank_transactions', { query: { select: 'kind,amount,currency,asset,status,created', order: 'created.desc', limit: 5000 } }).catch(() => []),
		supabaseRest('/rest/v1/billing_events', { query: { select: 'eventType,planName,amount,currency,status,occurredAt', order: 'occurredAt.desc', limit: 5000 } }).catch(() => []),
	]);
	const inRange = (d) => { const t = new Date(d).getTime(); return !Number.isNaN(t) && t >= from.getTime() && t <= to.getTime(); };
	const txns = (bankTxns || []).filter((t) => inRange(t.created));
	const events = (billingEvents || []).filter((e) => inRange(e.occurredAt || e.created));
	const usd = (rows) => rows.filter((t) => String(t.currency || 'USD').toUpperCase() === 'USD' && String(t.asset || 'USD').toUpperCase() !== 'TBC');
	const tbc = (rows) => rows.filter((t) => String(t.currency || '').toUpperCase() === 'TBC' || String(t.asset || '').toUpperCase() === 'TBC');
	const sumAbs = (rows) => rows.reduce((n, t) => n + Math.abs(Number(t.amount) || 0), 0);
	const OUTFLOW_KINDS = new Set(['withdraw', 'withdraw_crypto', 'pay', 'transfer_out', 'swap']);
	const usdTx = usd(txns), tbcTx = tbc(txns);
	return {
		stripe: charges, refunds,
		outflowsUsd: sumAbs(usdTx.filter((t) => OUTFLOW_KINDS.has(t.kind))),
		inflowsUsd: sumAbs(usdTx.filter((t) => !OUTFLOW_KINDS.has(t.kind))),
		outflowsTbc: sumAbs(tbcTx.filter((t) => OUTFLOW_KINDS.has(t.kind))),
		pendingUsd: sumAbs(usdTx.filter((t) => ['pending', 'processing'].includes(String(t.status)))),
		txnCount: txns.length, eventCount: events.length,
	};
}

// GET /api/admin/financials/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/financials/income-statement', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const { from, to } = parseStatementPeriod(req.query);
		const r = await collectLedgerRecords(from, to);
		const f = (d) => d.toISOString().slice(0, 10);
		const gross = r.stripe.gross, refunds = r.refunds;
		const feesEst = r.stripe.configured ? gross * 0.029 + r.stripe.count * 0.3 : 0;
		const net = gross - refunds - feesEst - r.outflowsUsd + r.inflowsUsd;
		sendStatementCsv(res, `tradingbible-income-statement-${f(from)}-${f(to)}.csv`, [
			['TradingBible LLC — Income Statement (DRAFT, platform records, unaudited)'],
			['D-U-N-S', DUNS_NUMBER],
			['Period', `${f(from)} to ${f(to)}`],
			['Generated (UTC)', new Date().toISOString()],
			[],
			['Section', 'Line', 'Amount (USD)', 'Source / notes'],
			['Revenue', 'Subscription revenue (Stripe succeeded charges)', gross.toFixed(2), r.stripe.configured ? `${r.stripe.count} charges` : 'Stripe not configured — 0'],
			['Revenue', 'Other platform inflows (bank ledger)', r.inflowsUsd.toFixed(2), `${r.txnCount} ledger txns in period`],
			['Revenue', 'TOTAL REVENUE', (gross + r.inflowsUsd).toFixed(2), ''],
			['Deductions', 'Refunds issued', refunds.toFixed(2), 'Stripe refunds'],
			['Deductions', 'Processing fees (ESTIMATE 2.9% + $0.30/txn)', feesEst.toFixed(2), 'Estimate only — confirm in Stripe dashboard'],
			['Expenses', 'Platform outflows paid (withdrawals, payouts, purchases)', r.outflowsUsd.toFixed(2), 'bank ledger, completed + pending'],
			['Expenses', `TBC-denominated outflows (memo, in TBC)`, r.outflowsTbc.toFixed(2), 'Not converted — settle TBC/USD rate with accountant'],
			['Total', 'NET INCOME, platform records (DRAFT)', net.toFixed(2), 'Have accountant finalize before D&B upload'],
			[],
			['Disclaimer', 'Draft from platform records only. Excludes payroll, contractors, infrastructure, marketing, taxes, and non-USD activity. Not audited.'],
		]);
	} catch (err) { next(err); }
});

// GET /api/admin/financials/balance-sheet?asof=YYYY-MM-DD
router.get('/financials/balance-sheet', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const asof = req.query?.asof ? new Date(`${String(req.query.asof).slice(0, 10)}T23:59:59Z`) : new Date();
		if (Number.isNaN(asof.getTime())) { const e = new Error('invalid asof (use YYYY-MM-DD)'); e.status = 400; throw e; }
		const from = new Date(Date.UTC(2026, 7, 1));
		const r = await collectLedgerRecords(from, asof);
		const f = (d) => d.toISOString().slice(0, 10);
		let mrr = 0, subs = 0;
		try {
			const s = await getBillingSummary();
			if (s?.configured) { mrr = Number(s.mrr) || 0; subs = Number(s.activeCount) || 0; }
		} catch { /* MRR stays 0 */ }
		const cash = r.stripe.gross - r.refunds - r.outflowsUsd + r.inflowsUsd;
		const pending = r.pendingUsd;
		const assets = cash + mrr;
		const equity = assets - pending;
		sendStatementCsv(res, `tradingbible-balance-sheet-${f(asof)}.csv`, [
			['TradingBible LLC — Balance Sheet (DRAFT, platform records, unaudited)'],
			['D-U-N-S', DUNS_NUMBER],
			['As of', f(asof)],
			['Generated (UTC)', new Date().toISOString()],
			[],
			['Section', 'Line', 'Amount (USD)', 'Source / notes'],
			['Assets', 'Cash collected, net of refunds and recorded outflows (since 2026-08-01)', cash.toFixed(2), 'Stripe + bank ledger'],
			['Assets', 'Active subscription MRR (receivables proxy, 1 month)', mrr.toFixed(2), `${subs} active subscribers`],
			['Assets', 'TOTAL ASSETS', assets.toFixed(2), ''],
			['Liabilities', 'Pending payouts / withdrawals', pending.toFixed(2), 'bank ledger pending + processing'],
			['Liabilities', 'TOTAL LIABILITIES', pending.toFixed(2), 'Excludes taxes, payables, debt — accountant to add'],
			['Equity', "Owner's equity / retained (plug — accountant to finalize)", equity.toFixed(2), 'Assets minus liabilities'],
			[],
			['Disclaimer', 'Draft from platform records only. Not audited. Excludes bank balances, Stripe unsettled funds, TBC treasury, fixed assets, taxes, and debt.'],
		]);
	} catch (err) { next(err); }
});

// ── Real integration connectivity tests ──────────────────────────
router.post('/integrations/test', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const kind = String(req.body?.kind || '').toLowerCase();
		if (kind === 'smtp') {
			const host = String(req.body?.host || '').trim();
			const port = Number(req.body?.port) || 587;
			if (!host) return res.status(400).json({ ok: false, error: 'host required' });
			const tx = createTransport({
				host, port, secure: port === 465,
				auth: req.body?.user ? { user: String(req.body.user), pass: String(req.body?.pass || '') } : undefined,
				connectionTimeout: 8000,
			});
			await tx.verify();
			return res.json({ ok: true, detail: 'SMTP handshake verified' });
		}
		if (kind === 'url') {
			const url = String(req.body?.url || '').trim();
			if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: 'http(s) url required' });
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 8000);
			try {
				const r = await fetch(url, { method: 'GET', signal: ctrl.signal });
				return res.json({ ok: r.ok, detail: `HTTP ${r.status}` });
			} finally { clearTimeout(t); }
		}
		if (kind === 'supabase') {
			const url = String(req.body?.url || '').replace(/\/+$/, '');
			const key = String(req.body?.key || '');
			if (!url || !key) return res.status(400).json({ ok: false, error: 'url + key required' });
			const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
			return res.json({ ok: r.ok, detail: `Auth health HTTP ${r.status}` });
		}
		if (kind === 'stripe') {
			const key = String(req.body?.key || '');
			if (!key) return res.status(400).json({ ok: false, error: 'secret key required' });
			const s = new Stripe(key);
			const bal = await s.balance.retrieve();
			return res.json({ ok: true, detail: `balance reachable (${(bal?.available?.[0]?.currency || '').toUpperCase()})` });
		}
		if (kind === 'alpha_vantage') {
			const key = process.env.ALPHA_VANTAGE_API_KEY || '';
			if (!key) return res.json({ ok: false, error: 'ALPHA_VANTAGE_API_KEY not set on server' });
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 10000);
			try {
				const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(key)}`, { signal: ctrl.signal });
				const j = await r.json().catch(() => ({}));
				const q = j?.['Global Quote']?.['05. price'];
				return res.json(q ? { ok: true, detail: `GLOBAL_QUOTE live (IBM $${q})` } : { ok: false, error: 'no quote returned (rate limit?)' });
			} finally { clearTimeout(t); }
		}
		if (kind === 'finnhub') {
			const key = process.env.FINNHUB_API_KEY || '';
			if (!key) return res.json({ ok: false, error: 'FINNHUB_API_KEY not set on server' });
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 10000);
			try {
				const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}`, { signal: ctrl.signal });
				const j = await r.json().catch(() => ({}));
				return res.json(j?.c ? { ok: true, detail: `quote live (AAPL $${j.c})` } : { ok: false, error: 'no quote returned' });
			} finally { clearTimeout(t); }
		}
		if (kind === 'binance') {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), 8000);
			try {
				const r = await fetch('https://api.binance.com/api/v3/ping', { signal: ctrl.signal });
				return res.json(r.ok ? { ok: true, detail: 'public market data reachable (no key needed)' } : { ok: false, error: `HTTP ${r.status}` });
			} finally { clearTimeout(t); }
		}
		return res.status(400).json({ ok: false, error: 'unknown kind (smtp|url|supabase|stripe|alpha_vantage|finnhub|binance)' });
	} catch (err) {
		return res.json({ ok: false, error: String(err?.message || err).slice(0, 200) });
	}
});

// ── Server-side API keys (sha256, verifiable, revocable) ─────────
const sha256 = (v) => createHash('sha256').update(String(v)).digest('hex');

router.get('/api-keys', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/admin_api_keys', { query: { select: '*', order: 'created.desc', limit: 500 } });
		res.json((rows || []).map((r) => ({
			id: r.id, name: r.name, enabled: r.enabled !== false,
			created: r.created, lastUsedAt: r.lastUsedAt || r.lastusedat || null,
			usageCount: r.usageCount ?? r.usagecount ?? 0,
			permissions: r.permissions || [], assignedTo: r.assignedTo || r.assignedto || null,
			expiresAt: r.expiresAt || r.expiresat || null,
			hint: String(r.keyhash || '').slice(0, 6),
		})));
	} catch (err) { next(err); }
});

router.post('/api-keys', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const name = String(req.body?.name || 'Untitled key').trim().slice(0, 60);
		const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String).slice(0, 20) : [];
		const assignedTo = String(req.body?.assignedTo || '').trim().slice(0, 120) || null;
		const expiresAt = req.body?.expiresAt ? new Date(String(req.body.expiresAt)).toISOString() : null;
		const plain = `tb_live_${randomBytes(24).toString('hex')}`;
		const created = await supabaseRest('/rest/v1/admin_api_keys', {
			method: 'POST',
			body: { owner: admin.id, name, keyhash: sha256(plain), enabled: true, permissions, assignedTo, expiresAt, usageCount: 0 },
			prefer: 'return=representation', query: { select: '*' },
		});
		const row = created?.[0] || {};
		res.status(201).json({ id: row.id, name, key: plain, hint: sha256(plain).slice(0, 6) });
	} catch (err) { next(err); }
});

router.post('/api-keys/verify', async (req, res) => {
	try {
		const key = String(req.body?.key || '');
		if (!key) return res.status(400).json({ valid: false });
		const rows = await supabaseRest('/rest/v1/admin_api_keys', {
			query: { select: '*', keyhash: `eq.${sha256(key)}`, limit: 1 },
		});
		const row = rows?.[0];
		if (!row) return res.json({ valid: false, reason: 'unknown' });
		if (row.enabled === false) return res.json({ valid: false, reason: 'revoked' });
		const exp = row.expiresAt || row.expiresat;
		if (exp && new Date(exp).getTime() < Date.now()) return res.json({ valid: false, reason: 'expired' });
		const usage = Number(row.usageCount ?? row.usagecount ?? 0) + 1;
		await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(row.id)}`, {
			method: 'PATCH', body: { lastUsedAt: new Date().toISOString(), usageCount: usage },
		}).catch(() => {});
		res.json({ valid: true, name: row.name, permissions: row.permissions || [] });
	} catch {
		res.status(500).json({ valid: false });
	}
});

router.patch('/api-keys/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const updated = await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { enabled: req.body?.enabled !== false },
			prefer: 'return=representation', query: { select: 'id,enabled' },
		});
		res.json(updated?.[0] || { id: req.params.id });
	} catch (err) { next(err); }
});

router.delete('/api-keys/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/admin_api_keys?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

// ── Jobs board management (postings + applications) ──────────────
router.get('/jobs/postings', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/job_postings', {
			query: { select: '*', order: 'created.desc', limit: 200 },
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/jobs/postings', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const title = String(req.body?.title || '').trim().slice(0, 120);
		if (!title) return res.status(400).json({ error: 'title required' });
		const created = await supabaseRest('/rest/v1/job_postings', {
			method: 'POST',
			body: {
				title,
				department: String(req.body?.department || 'Academy').slice(0, 60),
				employmentType: String(req.body?.employmentType || 'full-time').slice(0, 40),
				location: String(req.body?.location || 'Remote').slice(0, 80),
				description: String(req.body?.description || '').slice(0, 8000),
				requirements: String(req.body?.requirements || '').slice(0, 4000),
				status: req.body?.status === 'closed' ? 'closed' : 'open',
			},
			prefer: 'return=representation', query: { select: '*' },
		});
		res.status(201).json(created?.[0] || {});
	} catch (err) { next(err); }
});

router.patch('/jobs/postings/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const patch = {};
		for (const k of ['title', 'department', 'employmentType', 'location', 'description', 'requirements']) {
			if (req.body?.[k] !== undefined) patch[k] = String(req.body[k]).slice(0, 8000);
		}
		if (req.body?.status !== undefined) patch.status = req.body.status === 'closed' ? 'closed' : 'open';
		if (req.body?.auto_accept !== undefined) patch.auto_accept = req.body.auto_accept === true;
		if (req.body?.hiring !== undefined && typeof req.body.hiring === 'object' && req.body.hiring !== null) {
			// Merge over the stored config: partial edits (e.g. just the
			// deadline) must never wipe salary, screening, or trial setups.
			let stored = {};
			try {
				const cur = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, {
					query: { select: 'hiring', limit: 1 },
				});
				if (cur?.[0]?.hiring && typeof cur[0].hiring === 'object') stored = cur[0].hiring;
			} catch { /* column missing → fresh object; fallback below saves rest */ }
			const merged = { ...stored, ...req.body.hiring };
			const closesRaw = String(merged.closes_at ?? '').trim();
			const closesAt = closesRaw && !Number.isNaN(Date.parse(closesRaw)) ? new Date(closesRaw).toISOString() : null;
			const freqRaw = String(merged.salary_freq || 'monthly').toLowerCase();
			patch.hiring = {
				screening: Array.isArray(merged.screening) ? merged.screening.slice(0, 8).map((q) => ({ q: String(q?.q || q || '').slice(0, 280), required: q?.required !== false })) : [],
				samples_required: merged.samples_required === true,
				trial_task: String(merged.trial_task || '').slice(0, 2000),
				trial_days: Math.max(1, Math.min(90, Number(merged.trial_days) || 14)),
				salary_tbc: Math.max(0, Math.round((Number(merged.salary_tbc) || 0) * 100) / 100),
				salary_freq: ['weekly', 'monthly'].includes(freqRaw) ? freqRaw : 'monthly',
				closes_at: closesAt,
			};
		}
		let updated;
		try {
			updated = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, {
				method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
			});
		} catch (err) {
			// Column added after deploy via Table Editor: if it is still
			// missing, save everything else instead of failing the edit.
			if (/auto_accept|hiring/i.test(String(err))) {
				delete patch.auto_accept;
				delete patch.hiring;
				updated = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, {
					method: 'PATCH', body: patch, prefer: 'return=representation', query: { select: '*' },
				});
			} else throw err;
		}
		res.json(updated?.[0] || { id: req.params.id });
	} catch (err) { next(err); }
});

// ── POST /admin/jobs/applications/:id/hire — accept + auto-provision ──
// Creates (or upgrades) the login, assigns the staff role, stages a mentor
// row for coaches, sends the invite email. The temp password is returned
// ONLY here (admin eyes) — never through the public apply flow.
router.post('/jobs/applications/:id/hire', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const apps = await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(req.params.id)}`, {
			query: { select: '*', limit: 1 },
		});
		const app = apps?.[0];
		if (!app) return res.status(404).json({ error: 'application not found' });
		if (app.status === 'hired') return res.json({ hired: true, already: true, email: app.email });
		// ── Compliance-first hiring gate (global workforce policy) ──
		// No one starts work until the lawful hiring structure is confirmed:
		// work country + region, arrangement (direct/EOR/contractor/
		// subsidiary/PEO), localized agreement, IP assignment, payroll
		// readiness, and manager approval. Stored on the application row
		// (best-effort: older DBs without the column still enforce the gate).
		const ARRANGEMENTS = ['direct', 'eor', 'contractor', 'subsidiary', 'peo'];
		const comp = req.body?.compliance && typeof req.body.compliance === 'object' ? req.body.compliance : {};
		const missing = [];
		if (!String(comp.workCountry || '').trim()) missing.push('work country');
		if (!String(comp.workRegion || '').trim()) missing.push('work state/region');
		if (!ARRANGEMENTS.includes(String(comp.arrangement || '').toLowerCase())) missing.push('hiring arrangement (direct, EOR, contractor, subsidiary, or PEO)');
		if (comp.agreementSigned !== true) missing.push('localized employment agreement signed');
		if (comp.ipAssigned !== true) missing.push('IP assignment + confidentiality confirmed');
		if (comp.payrollReady !== true) missing.push('payroll registration / EOR coverage confirmed');
		if (comp.managerApproved !== true) missing.push('manager approval to hire');
		if (missing.length) {
			return res.status(422).json({ error: `compliance gate: confirm ${missing.join('; ')} before hiring`, missing });
		}
		const compliance = {
			workCountry: String(comp.workCountry).trim().slice(0, 80),
			workRegion: String(comp.workRegion).trim().slice(0, 80),
			arrangement: String(comp.arrangement).toLowerCase(),
			agreementSigned: true, ipAssigned: true, payrollReady: true, managerApproved: true,
			note: String(comp.note || '').slice(0, 500),
			confirmedAt: new Date().toISOString(),
		};
		try {
			await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(req.params.id)}`, {
				method: 'PATCH', body: { compliance }, query: { select: 'id' },
			});
		} catch (err) {
			// Older DBs without the compliance column: enforce the gate from
			// the request body and continue. Run APPLY_HIRING_COMPLIANCE.sql
			// once to persist compliance per application.
			if (!/compliance|column/i.test(String(err?.message || err))) throw err;
			logger.warn('hiring compliance column missing, gate enforced from request only');
		}
		// Collection window: how many BSD candidates are in the pool and
		// whether the window is still open (admin may still hire early).
		let poolSize = 0;
		try {
			const pool = await supabaseRest('/rest/v1/job_applications', {
				query: { select: 'id', jobId: `eq.${encodeURIComponent(app.jobId || '')}`, limit: 500 },
			});
			poolSize = (pool || []).length;
		} catch { /* advisory only */ }
		// Posting joined in code (not via FK embed) so hiring works even if
		// the jobId relation was never created in the dashboard.
		let posting = {};
		if (app.jobId) {
			try {
				const posts = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(app.jobId)}`, {
					query: { select: 'id,title,department,hiring', limit: 1 },
				});
				if (posts?.[0]) posting = posts[0];
			} catch {
				const posts = await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(app.jobId)}`, {
					query: { select: 'id,title,department', limit: 1 },
				}).catch(() => null);
				if (posts?.[0]) posting = posts[0];
			}
		}
		const result = await provisionEmployee({
			name: app.name, email: app.email, posting,
			staffMeta: {
				appId: app.id || req.params.id,
				title: posting?.title || null,
				arrangement: compliance.arrangement,
				workCountry: compliance.workCountry,
				workRegion: compliance.workRegion,
			},
		});
		const updated = await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { status: 'hired' }, prefer: 'return=representation', query: { select: '*' },
		});
		const closesAt = posting?.hiring && typeof posting.hiring === 'object' ? posting.hiring.closes_at || null : null;
		res.json({
			hired: true,
			email: app.email,
			role: result.role,
			loginCreated: result.created,
			tempPassword: result.tempPassword,
			application: updated?.[0] || { id: req.params.id, status: 'hired' },
			poolSize,
			closesAt,
			windowOpen: closesAt ? Date.now() < Date.parse(closesAt) : false,
		});
	} catch (err) { next(err); }
});

// ── Probation review queue ─────────────────────────────────────────
// Every hire starts on probation (trial_ends_at, default 14 days — per
// posting trial_days). Confirm graduates them to full employee.
router.get('/jobs/trials', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,email,username,name,role,trial_ends_at', trial_ends_at: 'not.is.null', order: 'trial_ends_at.asc', limit: 200 },
		}).catch((err) => {
			if (/trial_ends_at/i.test(String(err))) return [];
			throw err;
		});
		res.json(rows || []);
	} catch (err) { next(err); }
});

router.post('/jobs/trials/:id/confirm', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const updated = await supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { trial_ends_at: null }, prefer: 'return=representation', query: { select: 'id,email' },
		});
		res.json({ confirmed: true, user: updated?.[0] || { id: req.params.id } });
	} catch (err) { next(err); }
});

// ── TBC payroll (staff paid in TBC only) ─────────────────────────────
// Salaries are denominated in TBC (1 TBC = 1 KWD). The admin funds payroll
// from their own TBC balance (convert cash → TBC in the wallet first).
// Employees cash out themselves: TBC → USD convert, then bank withdrawal.
// GET returns the payroll roster (hired applications + posting salaries);
// POST executes one run and reports per-person results (never partial-silent).
router.get('/jobs/payroll', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const apps = await supabaseRest('/rest/v1/job_applications', {
			query: { select: 'id,name,email,status,jobId,created,checks', status: 'eq.hired', order: 'created.asc', limit: 500 },
		}).catch(() => []);
		const ids = [...new Set((apps || []).map((a) => a.jobId).filter(Boolean))];
		let hiringById = {};
		if (ids.length) {
			const posts = await supabaseRest('/rest/v1/job_postings', {
				query: { select: 'id,title,department,hiring', id: `in.(${ids.map((x) => encodeURIComponent(x)).join(',')})`, limit: 200 },
			}).catch(() => null);
			for (const q of posts || []) hiringById[q.id] = { title: q.title, department: q.department || null, hiring: q.hiring && typeof q.hiring === 'object' ? q.hiring : {} };
		}
		// Merge the staff card profile (photo, company email, employee number,
		// department, ...) stored on users.user_settings.staff at hire time or
		// via the ID-card editor. Matched by email; missing profile is fine.
		const emails = [...new Set((apps || []).map((a) => String(a.email || '').trim().toLowerCase()).filter(Boolean))];
		const staffByEmail = {};
		if (emails.length) {
			const users = await supabaseRest('/rest/v1/users', {
				query: { select: 'id,email,name,user_settings', email: `in.(${emails.join(',')})`, limit: 500 },
			}).catch(() => []);
			for (const u of users || []) {
				const s = u.user_settings && typeof u.user_settings === 'object' && u.user_settings.staff && typeof u.user_settings.staff === 'object' ? u.user_settings.staff : {};
				staffByEmail[String(u.email || '').trim().toLowerCase()] = { userId: u.id, profileName: u.name || null, ...s };
			}
		}
		res.json((apps || []).map((a) => {
			const userStaff = staffByEmail[String(a.email || '').trim().toLowerCase()] || {};
			// Newer cards may exist only on the application (staff hired
			// before login provisioning, or an invite never accepted).
			const s = mergeStaffCard(userStaff, staffCardFromApplication(a));
			return {
				id: a.id, appId: a.id,
				name: s.profileName || a.name, email: a.email,
				// Manual overrides (set in the ID-card editor) win over the
				// posting defaults.
				title: s.title || hiringById[a.jobId]?.title || 'Opening',
				salary_tbc: Number(hiringById[a.jobId]?.hiring?.salary_tbc) || 0,
				salary_freq: hiringById[a.jobId]?.hiring?.salary_freq || 'monthly',
				hiredAt: s.hiredAt || a.created || null,
				userId: s.userId || null,
				photoUrl: s.photoUrl || null,
				workEmail: s.workEmail || null,
				employeeId: s.employeeId || null,
				department: s.department || hiringById[a.jobId]?.department || null,
				phone: s.phone || null,
				location: s.location || null,
				bio: s.bio || null,
				skills: Array.isArray(s.skills) ? s.skills : [],
				socials: s.socials && typeof s.socials === 'object' ? s.socials : null,
				emergencyContact: s.emergencyContact && typeof s.emergencyContact === 'object' ? s.emergencyContact : null,
				verified: Boolean(s.verified),
			};
		}));
	} catch (err) { next(err); }
});

router.get('/jobs/payroll/history', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/bank_transactions', {
			query: { select: 'owner,amount,created,reference', kind: 'eq.tbc_receive', reference: 'like.payroll:%', order: 'created.desc', limit: 2000 },
		}).catch(() => []);
		const byOwner = {};
		for (const t of rows || []) {
			const o = byOwner[t.owner] || (byOwner[t.owner] = { owner: t.owner, totalPaidTbc: 0, runs: 0, lastPaidAt: null, periods: [] });
			o.totalPaidTbc += Number(t.amount) || 0;
			o.runs++;
			if (!o.lastPaidAt || String(t.created) > String(o.lastPaidAt)) o.lastPaidAt = t.created;
			const period = String(t.reference || '').replace(/^payroll:/, '');
			if (period && !o.periods.includes(period)) o.periods.push(period);
		}
		res.json(Object.values(byOwner));
	} catch (err) { next(err); }
});

router.post('/jobs/payroll', supabaseAuth, async (req, res, next) => {
	try {
		const admin = await assertAdmin(req);
		const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];
		const clean = payments
			.map((x) => ({ email: String(x?.email || '').trim().toLowerCase(), tbc: Math.round((Number(x?.tbc) || 0) * 100) / 100 }))
			.filter((x) => x.email.includes('@') && x.tbc > 0)
			.slice(0, 200);
		if (!clean.length) return res.status(422).json({ error: 'no valid payments' });
		const total = Math.round(clean.reduce((n, x) => n + x.tbc, 0) * 100) / 100;
		const fund = await balances(admin.id).catch(() => ({ tbc: 0 }));
		if ((fund?.tbc || 0) < total) {
			return res.status(422).json({ error: `insufficient TBC — run needs ${total}, balance has ${Math.round((fund?.tbc || 0) * 100) / 100}. Convert cash → TBC first.` });
		}
		const note = String(req.body?.note || '').slice(0, 60) || new Date().toISOString().slice(0, 7);
		const results = [];
		for (const x of clean) {
			try {
				const peers = await supabaseRest('/rest/v1/users', {
					query: { select: 'id,email', email: `eq.${x.email}`, limit: 1 }, // RAW: URLSearchParams encodes
				}).catch(() => []);
				if (!peers?.[0]) throw new Error('no member with that email');
				await supabaseRest('/rest/v1/bank_transactions', {
					method: 'POST',
					body: { owner: admin.id, kind: 'tbc_send', amount: -x.tbc, currency: 'TBC', status: 'completed', reference: `payroll:${note}`, counterparty: 'member', asset: 'TBC', fiatValue: 0 },
					prefer: 'return=representation',
				});
				await supabaseRest('/rest/v1/bank_transactions', {
					method: 'POST',
					body: { owner: peers[0].id, kind: 'tbc_receive', amount: x.tbc, currency: 'TBC', status: 'completed', reference: `payroll:${note}`, counterparty: 'member', asset: 'TBC', fiatValue: 0 },
					prefer: 'return=representation',
				});
				results.push({ email: x.email, tbc: x.tbc, ok: true });
			} catch (err) { results.push({ email: x.email, tbc: x.tbc, ok: false, error: String(err?.message || err).slice(0, 120) }); }
		}
		res.json({ run: note, total, paid: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
	} catch (err) { next(err); }
});

// ── PATCH /admin/jobs/staff/:id/card — edit ID-card profile fields ─────
// Everything card-specific (photo, company email, employee number,
// department, phone, location, bio, title, skills, socials, emergency
// contact) is mirrored to job_applications.checks.staffCard and, when a
// login exists, users.user_settings.staff; the display name is written to
// job_applications.name + users.name. Read-merged so totp/passkeys/
// suspensions and the hiring metadata written by provisionEmployee always
// survive the edit. `:id` = application id. Staff who have not signed in
// yet can still have a complete card.
router.patch('/jobs/staff/:id/card', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const apps = await supabaseRest('/rest/v1/job_applications', {
			query: { select: 'id,email,checks', id: `eq.${encodeURIComponent(req.params.id)}`, limit: 1 },
		}).catch(() => []);
		const app = apps?.[0];
		if (!app) return res.status(404).json({ error: 'application not found' });
		const users = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,user_settings', email: `eq.${app.email}`, limit: 1 },
		}).catch(() => []);
		// No users row is normal for staff hired before login provisioning (or
		// who never accepted the invite). The card profile is still saved on
		// the application so the admin can finish the credential now.
		const user = users?.[0] || null;
		const base = user?.user_settings && typeof user.user_settings === 'object' ? user.user_settings : {};
		const userStaff = base.staff && typeof base.staff === 'object' ? base.staff : {};
		const cur = mergeStaffCard(userStaff, staffCardFromApplication(app));
		const body = req.body && typeof req.body === 'object' ? req.body : {};
		const next = { ...cur };
		// Display name lives on the profile + application rows (used by the
		// payroll roster, the admin portal and the public bio), not settings.
		if ('name' in body && String(body.name || '').trim()) {
			const cleanName = String(body.name).trim().slice(0, 120);
			if (user) {
				await supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
					method: 'PATCH', body: { name: cleanName }, query: { select: 'id' },
				}).catch((err) => logger.warn('staff card: profile name update failed', String(err)));
			}
			await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(app.id)}`, {
				method: 'PATCH', body: { name: cleanName }, query: { select: 'id' },
			}).catch((err) => logger.warn('staff card: application name update failed', String(err)));
		}
		for (const k of ['photoUrl', 'workEmail', 'employeeId', 'department', 'phone', 'location', 'title']) {
			if (!(k in body)) continue;
			const v = body[k];
			if (v === null || v === '') { next[k] = null; continue; }
			// Photos may be pasted URLs or canvas-resized data URLs from the
			// card editor — the resize keeps them well under the cap.
			next[k] = String(v).slice(0, k === 'photoUrl' ? 300000 : 300);
		}
		if ('bio' in body) next.bio = body.bio === null || body.bio === '' ? null : String(body.bio).slice(0, 2000);
		if ('verified' in body) next.verified = Boolean(body.verified);
		if ('skills' in body) {
			const arr = Array.isArray(body.skills) ? body.skills : String(body.skills || '').split(',');
			next.skills = arr.map((x) => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
		}
		if ('socials' in body) {
			const soc = body.socials;
			const mapped = soc && typeof soc === 'object'
				? Object.fromEntries(Object.entries(soc).slice(0, 8)
					.map(([kk, vv]) => [String(kk).slice(0, 40), String(vv).trim().slice(0, 300)])
					.filter(([, vv]) => vv))
				: {};
			next.socials = Object.keys(mapped).length ? mapped : null;
		}
		if ('emergencyContact' in body) {
			const ec = body.emergencyContact && typeof body.emergencyContact === 'object' ? body.emergencyContact : {};
			const ecName = String(ec.name || '').trim().slice(0, 80);
			const ecPhone = String(ec.phone || '').trim().slice(0, 40);
			next.emergencyContact = ecName || ecPhone ? { name: ecName, phone: ecPhone } : null;
		}
		next.updatedAt = new Date().toISOString();

		// Per-application copy: works even when there is no users row. This is
		// also what the public profile and payroll roster read as a fallback.
		const appChecks = withStaffCard(app.checks, next);
		try {
			await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(app.id)}`, {
				method: 'PATCH',
				body: { checks: appChecks },
				prefer: 'return=representation',
				query: { select: 'id' },
			});
		} catch (err) {
			// Older project without the checks column: a linked user can still
			// be saved through user_settings.
			logger.warn('staff card: application checks update failed', String(err));
			if (!user) throw err;
		}

		if (user) {
			await supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
				method: 'PATCH',
				body: { user_settings: { ...base, staff: next } },
				prefer: 'return=representation',
				query: { select: 'id' },
			}).catch((err) => logger.warn('staff card: profile settings update failed', String(err)));
		}
		res.json({ ok: true, staff: next, linked: Boolean(user) });
	} catch (err) { next(err); }
});

router.delete('/jobs/postings/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		await supabaseRest(`/rest/v1/job_postings?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'DELETE' });
		res.status(204).end();
	} catch (err) { next(err); }
});

router.get('/jobs/applications', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const rows = await supabaseRest('/rest/v1/job_applications', {
			query: { select: '*', order: 'created.desc', limit: 500 },
		});
		// Join posting titles in code (FK-embed independent, see hire above).
		const ids = [...new Set((rows || []).map((a) => a.jobId).filter(Boolean))];
		let titleById = {};
		if (ids.length) {
			const posts = await supabaseRest('/rest/v1/job_postings', {
				query: { select: 'id,title', id: `in.(${ids.map((x) => encodeURIComponent(x)).join(',')})`, limit: 500 },
			}).catch(() => null);
			for (const q of posts || []) titleById[q.id] = q.title;
		}
		res.json((rows || []).map((a) => ({ ...a, job_postings: a.jobId && titleById[a.jobId] ? { title: titleById[a.jobId] } : null })));
	} catch (err) { next(err); }
});

router.patch('/jobs/applications/:id', supabaseAuth, async (req, res, next) => {
	try {
		await assertAdmin(req);
		const status = String(req.body?.status || '');
		if (!['new', 'reviewing', 'shortlisted', 'trial_task', 'rejected', 'hired'].includes(status)) {
			return res.status(400).json({ error: 'invalid status' });
		}
		const updated = await supabaseRest(`/rest/v1/job_applications?id=eq.${encodeURIComponent(req.params.id)}`, {
			method: 'PATCH', body: { status }, prefer: 'return=representation', query: { select: '*' },
		});
		res.json(updated?.[0] || { id: req.params.id, status });
	} catch (err) { next(err); }
});

export default router;
