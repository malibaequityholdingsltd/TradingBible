import { Router } from 'express';
import logger from '../utils/logger.js';
import { supabaseRest, getSupabaseUser } from '../utils/supabaseClient.js';
import { tbcEcon, tbcBalances as balances } from '../utils/tbc-econ.js';

const router = Router();

// ── TradingBible Coin (TBC) registry ─────────────────────────────
// Fixed-supply (100M) ecosystem utility token. Contract addresses come from
// env once deployed; every consumer (tracking, swaps, pay) activates only
// when its address is configured — until then the token is display-only.
export const TBC_META = {
	name: 'TradingBible Coin',
	ticker: 'TBC',
	logo: 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png',
	maxSupply: '100000000',
	decimals: 18,
	model: 'Fixed-supply ecosystem utility token',
	allocation: [
		{ label: 'Community & Ecosystem', pct: 40, amount: '40,000,000' },
		{ label: 'Treasury', pct: 20, amount: '20,000,000' },
		{ label: 'Founders & Team (vested)', pct: 15, amount: '15,000,000' },
		{ label: 'Development & Technology', pct: 10, amount: '10,000,000' },
		{ label: 'Liquidity & Market Infrastructure', pct: 10, amount: '10,000,000' },
		{ label: 'Partnerships & Growth', pct: 5, amount: '5,000,000' },
	],
};

export function tbcContracts() {
	return {
		ethereum: process.env.TBC_CONTRACT_ETHEREUM || '',
		base: process.env.TBC_CONTRACT_BASE || '',
		solana: process.env.TBC_CONTRACT_SOLANA || '',
	};
}

export function tbcStatus() {
	const c = tbcContracts();
	const deployed = Object.values(c).some(Boolean);
	return {
		...TBC_META,
		contracts: c,
		deployed,
		tracking: deployed,
		swaps: deployed && Boolean(process.env.ZEROX_API_KEY),
		payments: deployed && Boolean(process.env.TBC_TREASURY_ADDRESS),
		onramp: deployed,
	};
}

// ── Public: registry + activation status ─────────────────────────
router.get('/', async (req, res) => {
	try {
		return res.json({ ...tbcStatus(), econ: await tbcEcon().catch(() => null) });
	} catch (err) {
		logger.error('tbc registry failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Brand-credit economy (real, off-chain, ledger-backed) ──────────
// Peg: 1 TBC = 1 KWD, always. USD floats via usdPerKwd (default 3.25).
// TBC credits are platform utility credits (like airline miles): earned and
// spent inside TradingBible, recorded as ledger rows with asset='TBC'.
// They are NOT on-chain tokens and NOT an investment.
// On-chain TBC (fixed 100M ERC-20) activates separately at token launch;
// credits become claimable then via /claim (treasury-settled queue).
// Shared via utils/tbc-econ.js so every pay point settles the same way.

async function authedUser(req) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
	if (!token) return null;
	const user = await getSupabaseUser(token);
	return user?.id ? user : null;
}

// ── Public: economy config (rate, claim status) ────────────────────
router.get('/econ', async (req, res) => {
	try {
		return res.json(await tbcEcon());
	} catch (err) {
		logger.error('tbc econ failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── My TBC credit balance ──────────────────────────────────────────
router.get('/balance', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const b = await balances(user.id);
		const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
			query: { select: 'tbc_address,tbc_native_address', owner: `eq.${user.id}`, limit: 1 },
		}).catch(() => []);
		return res.json({ tbc: b.tbc, usd: b.usd, saved: rails?.[0]?.tbc_address || null, savedNative: rails?.[0]?.tbc_native_address || null });
	} catch (err) {
		logger.error('tbc balance failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Convert between USD balance and TBC credits ──────────────────
// Peg: 1 TBC = 1 KWD. USD converts at usdPerKwd (default 3.25).
// direction 'toTBC' (default): USD → TBC. 'toUSD': TBC → USD spendable
// (then withdraw to bank as usual). Same published rate both ways, no
// spread — TBC is the brand's money, not a trade against the user.
// NOTE: Convert (in-app ledger, instant, no gas) is NOT Swap (on-chain DEX
// in your own wallet via 0x). Convert turns cash into spendable TBC;
// Swap trades crypto-to-crypto self-custody.
router.post('/convert', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const direction = String(req.body?.direction || 'toTBC') === 'toUSD' ? 'toUSD' : 'toTBC';
	const rawAmount = Math.round((Number(req.body?.usdAmount ?? req.body?.amount) || 0) * 100) / 100;
	if (!(rawAmount > 0)) return res.status(422).json({ error: 'amount required' });
	try {
		const econ = await tbcEcon();
		const b = await balances(user.id);
		if (direction === 'toTBC') {
			if (b.usd < rawAmount) return res.status(422).json({ error: 'insufficient USD balance — fund your wallet first' });
			const tbcAmount = Math.round(rawAmount * econ.tbcPerUsd * 100) / 100;
			await supabaseRest('/rest/v1/bank_transactions', {
				method: 'POST',
				body: { owner: user.id, kind: 'tbc_convert', amount: -rawAmount, currency: 'USD', status: 'completed', reference: `tbc-buy@${econ.tbcPerUsd}`, counterparty: 'tbc-economy', asset: 'USD', fiatValue: rawAmount },
				prefer: 'return=representation',
			});
			await supabaseRest('/rest/v1/bank_transactions', {
				method: 'POST',
				body: { owner: user.id, kind: 'tbc_convert', amount: tbcAmount, currency: 'TBC', status: 'completed', reference: `tbc-buy@${econ.tbcPerUsd}`, counterparty: 'tbc-economy', asset: 'TBC', fiatValue: rawAmount },
				prefer: 'return=representation',
			});
			const after = await balances(user.id);
			return res.json({ ok: true, direction, converted: { usd: rawAmount, tbc: tbcAmount, kwd: tbcAmount, rate: econ.tbcPerUsd, peg: '1 TBC = 1 KWD' }, balances: after });
		}
		const tbcIn = rawAmount;
		if (b.tbc < tbcIn) return res.status(422).json({ error: 'insufficient TBC credits' });
		const usdOut = Math.round((tbcIn / econ.tbcPerUsd) * 100) / 100;
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'tbc_convert', amount: -tbcIn, currency: 'TBC', status: 'completed', reference: `tbc-sell@${econ.tbcPerUsd}`, counterparty: 'tbc-economy', asset: 'TBC', fiatValue: usdOut },
			prefer: 'return=representation',
		});
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'tbc_convert', amount: usdOut, currency: 'USD', status: 'completed', reference: `tbc-sell@${econ.tbcPerUsd}`, counterparty: 'tbc-economy', asset: 'USD', fiatValue: usdOut },
			prefer: 'return=representation',
		});
		const after = await balances(user.id);
		return res.json({ ok: true, direction, converted: { tbc: tbcIn, kwd: tbcIn, usd: usdOut, rate: econ.tbcPerUsd, peg: '1 TBC = 1 KWD' }, balances: after });
	} catch (err) {
		logger.error('tbc convert failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Send TBC to another member by email (in-app transfer) ─────────
// Real ledger movement both sides: sender debited, recipient credited.
// On-chain sending stays in the user's own wallet (we never hold keys).
router.post('/send', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Math.round((Number(req.body?.amount) || 0) * 100) / 100;
	const toEmail = String(req.body?.toEmail || '').trim().toLowerCase();
	if (!(amount > 0)) return res.status(422).json({ error: 'amount required' });
	if (!toEmail || !toEmail.includes('@')) return res.status(422).json({ error: 'recipient email required' });
	try {
		const peers = await supabaseRest('/rest/v1/users', {
			query: { select: 'id,email', email: `eq.${encodeURIComponent(toEmail)}`, limit: 1 },
		}).catch(() => []);
		const peer = peers?.[0];
		if (!peer) return res.status(404).json({ error: 'no member with that email' });
		if (peer.id === user.id) return res.status(422).json({ error: 'you cannot send to yourself' });
		const b = await balances(user.id);
		if (b.tbc < amount) return res.status(422).json({ error: 'insufficient TBC credits' });
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'tbc_send', amount: -amount, currency: 'TBC', status: 'completed', reference: `to:${toEmail}`, counterparty: 'member', asset: 'TBC', fiatValue: 0 },
			prefer: 'return=representation',
		});
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: peer.id, kind: 'tbc_receive', amount, currency: 'TBC', status: 'completed', reference: `from:${user.email || user.id}`, counterparty: 'member', asset: 'TBC', fiatValue: 0 },
			prefer: 'return=representation',
		});
		const after = await balances(user.id);
		return res.json({ ok: true, sent: { to: toEmail, tbc: amount }, balances: after });
	} catch (err) {
		logger.error('tbc send failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Personal TBC receiving addresses (user's own wallets) ──────────
// EVM `0x…` for ERC-20/WTBC flows today; native `tbc1…` (bech32, verified)
// for chain staking and claims once the network is live. Either may be
// saved on its own; both are shown in context where each one is used.
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

router.post('/address', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const address = String(req.body?.address || '').trim();
	const nativeAddress = String(req.body?.nativeAddress || '').trim();
	if (!address && !nativeAddress) return res.status(422).json({ error: 'an address is required' });
	if (address && !ADDR_RE.test(address)) return res.status(422).json({ error: 'a valid 0x Ethereum address is required' });
	if (nativeAddress) {
		const { isTbcAddress } = await import('../utils/bech32.js');
		if (!isTbcAddress(nativeAddress)) return res.status(422).json({ error: 'a valid tbc1 native address is required' });
	}
	try {
		const body = { owner: user.id, updated_at: new Date().toISOString() };
		if (address) body.tbc_address = address;
		if (nativeAddress) body.tbc_native_address = nativeAddress;
		await supabaseRest('/rest/v1/wallet_money_rails', {
			method: 'POST', body,
			prefer: 'return=representation,resolution=merge-duplicates',
		});
		return res.json({ ok: true, address: address || undefined, nativeAddress: nativeAddress || undefined });
	} catch (err) {
		const m = String(err?.message || err);
		if (/404|does not exist|PGRST|column/i.test(m)) return res.status(503).json({ error: 'setup_required', detail: 'Run deploy/APPLY_TBC_NATIVE_ADDRESS.sql once.' });
		logger.error('tbc address failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── On-chain TBC balance for any address (public RPC, cached) ─────
const RPC = {
	ethereum: 'https://eth.llamarpc.com',
	base: 'https://mainnet.base.org',
};
const rpcCache = new Map();

async function onchainBalance(chain, contract, address) {
	const key = `${chain}:${contract}:${address}`;
	const hit = rpcCache.get(key);
	if (hit && hit.expires > Date.now()) return hit.value;
	const padded = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
	try {
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), 9000);
		const r = await fetch(RPC[chain], {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: contract, data: `0x70a08231${padded}` }, 'latest'] }),
			signal: ctrl.signal,
		}).finally(() => clearTimeout(t));
		if (!r.ok) return null;
		const j = await r.json();
		const hex = j?.result;
		if (!hex || hex === '0x') return null;
		const val = Number(BigInt(hex)) / 1e18;
		if (rpcCache.size > 500) rpcCache.clear();
		rpcCache.set(key, { value: val, expires: Date.now() + 60000 });
		return val;
	} catch {
		return null;
	}
}

router.get('/onchain/:address', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const address = String(req.params.address || '').trim();
	if (!ADDR_RE.test(address)) return res.status(422).json({ error: 'invalid address' });
	try {
		const c = tbcContracts();
		const out = {};
		for (const chain of ['ethereum', 'base']) {
			if (!c[chain]) { out[chain] = { deployed: false, balance: 0 }; continue; }
			const bal = await onchainBalance(chain, c[chain], address);
			out[chain] = { deployed: true, contract: c[chain], balance: bal ?? 0, unchecked: bal === null };
		}
		const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
			query: { select: 'tbc_address,tbc_native_address', owner: `eq.${user.id}`, limit: 1 },
		}).catch(() => []);
		return res.json({ address, chains: out, saved: rails?.[0]?.tbc_address || null, savedNative: rails?.[0]?.tbc_native_address || null, launched: Object.values(c).some(Boolean) });
	} catch (err) {
		logger.error('tbc onchain failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Claim credits → on-chain TBC (treasury-settled queue) ──────────
// Disabled until the admin enables claims with a funded treasury. When live:
// credits are debited immediately and the claim queues as `processing` for
// treasury settlement — no fake chain transfers, ever.
router.post('/claim', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const amount = Math.round((Number(req.body?.amount) || 0) * 100) / 100;
	if (!(amount > 0)) return res.status(422).json({ error: 'amount required' });
	try {
		const econ = await tbcEcon();
		const c = tbcContracts();
		const treasury = process.env.TBC_TREASURY_ADDRESS || '';
		if (!econ.claimEnabled || !treasury || !Object.values(c).some(Boolean)) {
			return res.status(503).json({ error: 'claim_unavailable', detail: 'On-chain claims open at token launch. Your credits are safe and keep their value in-app until then.' });
		}
		if (amount < econ.claimMin) return res.status(422).json({ error: `minimum claim is ${econ.claimMin} TBC` });
		const rails = await supabaseRest('/rest/v1/wallet_money_rails', {
			query: { select: 'tbc_address', owner: `eq.${user.id}`, limit: 1 },
		}).catch(() => []);
		const to = rails?.[0]?.tbc_address || '';
		if (!ADDR_RE.test(to)) return res.status(422).json({ error: 'set your personal TBC address first' });
		const b = await balances(user.id);
		if (b.tbc < amount) return res.status(422).json({ error: 'insufficient TBC credits' });
		const rows = await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'tbc_claim', amount: -amount, currency: 'TBC', status: 'processing', reference: to, counterparty: 'tbc-treasury', asset: 'TBC', fiatValue: 0 },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, claim: rows?.[0] || null });
	} catch (err) {
		logger.error('tbc claim failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

async function isAdmin(user) {
	if (!user) return false;
	try {
		const rows = await supabaseRest(`/rest/v1/users?id=eq.${user.id}&select=role`, { query: { select: 'role', limit: 1 } });
		return rows?.[0]?.role === 'admin';
	} catch { return false; }
}

// ── Airdrops: TBC credit campaigns (eligibility → snapshot → claim) ─
// Campaigns live in admin_integrations (key `airdrop:<slug>`):
// { title, amountPerUser, status: draft|open|closed, criteria,
//   recipients: [userIds], claimed: [userIds], createdAt }.
// Claims land as completed TBC credit rows (spendable till); the existing
// /claim treasury rails carry them on-chain at token launch.
function airdropSlug(title) {
	return String(title || 'drop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `drop-${Date.now().toString(36)}`;
}

function airdropView(key, config) {
	const c = config || {};
	return {
		id: String(key || '').replace(/^airdrop:/, ''),
		title: c.title || 'Airdrop',
		amountPerUser: Number(c.amountPerUser) || 0,
		status: c.status || 'draft',
		criteria: c.criteria || {},
		maxRecipients: Math.trunc(Number(c.maxRecipients) || 500),
		recipients: (c.recipients || []).length,
		claimed: (c.claimed || []).length,
		createdAt: c.createdAt || null,
	};
}

async function airdropEligible(criteria = {}) {
	const needPass = !!criteria.challengePassed;
	const needAcad = !!criteria.academy;
	const minRef = Math.trunc(Number(criteria.minReferrals) || 0);
	const minTr = Math.trunc(Number(criteria.minTrades) || 0);
	const before = criteria.registeredBefore ? new Date(criteria.registeredBefore).getTime() : 0;
	const cap = Math.trunc(Number(criteria.maxRecipients) || 500);
	const users = await supabaseRest('/rest/v1/users', {
		query: { select: 'id,academyAccess,created_at,created', limit: 1000 },
	}).catch(() => []);
	let passers = null, refs = null, tradeCounts = null;
	if (needPass) {
		const rows = await supabaseRest('/rest/v1/challenge_attempts', {
			query: { select: 'owner,status', limit: 2000 },
		}).catch(() => []);
		passers = new Set((rows || []).filter((r) => ['passed', 'paid'].includes(String(r.status))).map((r) => r.owner));
	}
	if (minRef > 0) {
		const rows = await supabaseRest('/rest/v1/affiliate_codes', {
			query: { select: 'owner,signups', limit: 1000 },
		}).catch(() => []);
		refs = new Set((rows || []).filter((r) => (Number(r.signups) || 0) >= minRef).map((r) => r.owner));
	}
	if (minTr > 0) {
		const rows = await supabaseRest('/rest/v1/trades', {
			query: { select: 'owner', limit: 5000 },
		}).catch(() => []);
		const counts = {};
		for (const r of rows || []) counts[r.owner] = (counts[r.owner] || 0) + 1;
		tradeCounts = counts;
	}
	const out = [];
	for (const u of users || []) {
		if (!u?.id) continue;
		if (needPass && !passers.has(u.id)) continue;
		if (needAcad && !u.academyAccess) continue;
		if (minRef > 0 && !refs.has(u.id)) continue;
		if (minTr > 0 && (tradeCounts[u.id] || 0) < minTr) continue;
		if (before > 0) {
			const c = new Date(u.created_at || u.created || 0).getTime();
			if (!c || c >= before) continue;
		}
		out.push(u.id);
		if (out.length >= cap) break;
	}
	return out;
}

// ── Admin: list campaigns ──────────────────────────────────────
router.get('/admin/airdrops', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config,created', 'key': 'like.airdrop:%', order: 'created.desc', limit: 50 },
		}).catch(() => []);
		return res.json({ airdrops: (rows || []).map((r) => airdropView(r.key, r.config)) });
	} catch (err) {
		logger.error('airdrops admin list failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: create campaign (draft) ─────────────────────────────
router.post('/admin/airdrops', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	const title = String(req.body?.title || '').trim().slice(0, 80);
	const amountPerUser = Math.round((Number(req.body?.amountPerUser) || 0) * 100) / 100;
	if (!title || !(amountPerUser > 0)) return res.status(422).json({ error: 'title + amount per user required' });
	try {
		const id = `${airdropSlug(title)}-${Date.now().toString(36)}`;
		const config = {
			title, amountPerUser, status: 'draft',
			criteria: req.body?.criteria || {},
			maxRecipients: Math.trunc(Number(req.body?.maxRecipients) || 500),
			recipients: [], claimed: [], createdAt: new Date().toISOString(),
		};
		await supabaseRest('/rest/v1/admin_integrations', {
			method: 'POST', body: { key: `airdrop:${id}`, config, enabled: true },
			prefer: 'return=representation',
		});
		return res.json({ ok: true, airdrop: { id, ...config, recipients: 0, claimed: 0 } });
	} catch (err) {
		logger.error('airdrop create failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: snapshot eligibility → open ─────────────────────────
router.post('/admin/airdrops/:id/snapshot', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.airdrop:${req.params.id}`, limit: 1 },
		});
		const config = rows?.[0]?.config;
		if (!config) return res.status(404).json({ error: 'campaign not found' });
		const found = await airdropEligible({ ...(config.criteria || {}), maxRecipients: config.maxRecipients });
		const have = new Set(config.recipients || []);
		const fresh = found.filter((id) => !have.has(id));
		const recipients = [...have, ...fresh].slice(0, Math.trunc(Number(config.maxRecipients) || 500));
		const next = { ...config, recipients, status: 'open' };
		await supabaseRest(`/rest/v1/admin_integrations?key=eq.${encodeURIComponent(`airdrop:${req.params.id}`)}`, {
			method: 'PATCH', body: { config: next },
		});
		return res.json({ ok: true, eligible: found.length, added: fresh.length, recipients: recipients.length });
	} catch (err) {
		logger.error('airdrop snapshot failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Admin: close campaign ──────────────────────────────────────
router.post('/admin/airdrops/:id/close', async (req, res) => {
	const user = await authedUser(req);
	if (!user || !(await isAdmin(user))) return res.status(403).json({ error: 'admin only' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.airdrop:${req.params.id}`, limit: 1 },
		});
		const config = rows?.[0]?.config;
		if (!config) return res.status(404).json({ error: 'campaign not found' });
		const next = { ...config, status: 'closed' };
		await supabaseRest(`/rest/v1/admin_integrations?key=eq.${encodeURIComponent(`airdrop:${req.params.id}`)}`, {
			method: 'PATCH', body: { config: next },
		});
		return res.json({ ok: true });
	} catch (err) {
		logger.error('airdrop close failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Trader: my allocations ─────────────────────────────────────
router.get('/airdrops/my', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'key,config', 'key': 'like.airdrop:%', limit: 50 },
		}).catch(() => []);
		const mine = [];
		for (const r of rows || []) {
			const c = r.config || {};
			if (!(c.recipients || []).includes(user.id)) continue;
			mine.push({
				id: String(r.key || '').replace(/^airdrop:/, ''),
				title: c.title || 'Airdrop',
				amount: Number(c.amountPerUser) || 0,
				status: c.status || 'draft',
				claimed: (c.claimed || []).includes(user.id),
			});
		}
		return res.json({ airdrops: mine });
	} catch (err) {
		logger.error('airdrops my failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

// ── Trader: claim allocation into the till ─────────────────────
// Credits land spendable immediately; the existing /claim treasury rails
// carry them on-chain at token launch.
router.post('/airdrops/claim', async (req, res) => {
	const user = await authedUser(req);
	if (!user) return res.status(401).json({ error: 'unauthorized' });
	const id = String(req.body?.id || '').trim();
	if (!id) return res.status(422).json({ error: 'campaign required' });
	try {
		const rows = await supabaseRest('/rest/v1/admin_integrations', {
			query: { select: 'config', 'key': `eq.airdrop:${id}`, limit: 1 },
		});
		const config = rows?.[0]?.config;
		if (!config) return res.status(404).json({ error: 'campaign not found' });
		if (config.status !== 'open') return res.status(422).json({ error: 'campaign is not open' });
		if (!(config.recipients || []).includes(user.id)) return res.status(403).json({ error: 'not eligible' });
		if ((config.claimed || []).includes(user.id)) return res.status(422).json({ error: 'already claimed' });
		const amount = Number(config.amountPerUser) || 0;
		if (!(amount > 0)) return res.status(422).json({ error: 'nothing to claim' });
		const next = { ...config, claimed: [...(config.claimed || []), user.id] };
		await supabaseRest(`/rest/v1/admin_integrations?key=eq.${encodeURIComponent(`airdrop:${id}`)}`, {
			method: 'PATCH', body: { config: next },
		});
		await supabaseRest('/rest/v1/bank_transactions', {
			method: 'POST',
			body: { owner: user.id, kind: 'airdrop', amount, currency: 'TBC', status: 'completed', reference: `airdrop:${id}`, counterparty: 'airdrop', asset: 'TBC', fiatValue: 0 },
			prefer: 'return=representation',
		});
		const after = await balances(user.id);
		return res.json({ ok: true, claimed: amount, balances: after });
	} catch (err) {
		logger.error('airdrop claim failed', String(err));
		return res.status(500).json({ error: 'failed' });
	}
});

export default router;
