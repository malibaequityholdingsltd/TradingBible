import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { PROVIDERS } from '@/lib/brokerProviders';

const STRATEGIES = ['Breakout', 'Mean Reversion', 'Trend Follow', 'Scalping'];
const EMOTIONS = ['Confident', 'Calm', 'Disciplined', 'FOMO', 'Impatient'];

// No fabricated trades. Accounts start empty; balances and fills arrive
// only from a live, authenticated provider feed.
export function generateTrades() {
  return [];
}

async function api(path, opts = {}) {
  const token = pb.authStore?.token;
  const res = await fetch(`${API_SERVER_URL}/brokers${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Broker request failed (${res.status})`);
  return data;
}

export function providerIdForBroker(broker) {
  const name = String(broker?.id || broker?.name || '').toLowerCase();
  // Longest ids first; short ids (<=3 chars like xm/ig/cmc) require exact or
  // word-boundary match to avoid false positives ('ig' in 'signal').
  const ids = Object.keys(PROVIDERS).sort((a, b) => b.length - a.length);
  for (const id of ids) {
    if (id.length <= 3) {
      if (name === id || new RegExp(`(^|[^a-z])${id}([^a-z]|$)`).test(name)) return id;
    } else if (name === id || name.includes(id)) return id;
  }
  if (/oanda/.test(name)) return 'oanda';
  if (/coinbase/.test(name)) return 'coinbase';
  if (/ibkr|interactive/.test(name)) return 'ibkr';
  if (/alpaca/.test(name)) return 'alpaca';
  // Generic platform entries (MT4/MT5, cTrader) were removed from the registry —
  // only named brokers / prop firms are connectable. Unknown platform names
  // resolve to null (honest "unknown provider") instead of a fake bridge entry.
  if (/ctrader|ctid/.test(name)) return null;
  if (/exness|hfm|pepperstone|ic markets|ftmo|topstep|5ers|funded|apex/.test(name)) return null;
  if (/(^|[^a-z])xm([^a-z]|$)/.test(name)) return null;
  if (/(^|[^a-z])e8([^a-z]|$)/.test(name)) return null;
  if (/mt\s?5|mt5|mt\s?4|metatrader|dxtrade/.test(name)) return null;
  return null;
}

// Connect a broker or prop account. api_key providers with pasted credentials
// go through the encrypted vault + live test; everything else creates a
// PENDING account row (never fake-synced) until its real flow completes.
export async function connectBroker(broker, ownerId, kind = 'live', options = {}) {
  const now = new Date().toISOString();
  const providerId = providerIdForBroker(broker);
  const def = (providerId && PROVIDERS[providerId]) || null;
  const { apiKey, apiSecret, passphrase, label } = options || {};

  if (def?.method === 'api_key' && apiKey && apiSecret) {
    const out = await api('/connect', {
      method: 'POST',
      body: { provider: def.id, label: label || broker.name, apiKey, apiSecret, passphrase, permissions: ['read:account'] },
    });
    return out;
  }

  const accountRef = String(options.accountRef || '').trim()
    || (/crypto/i.test(broker.kind || '') ? 'API key required' : 'Bridge required');
  const existing = await pb.collection('broker_accounts').getFullList({
    filter: `owner = "${ownerId}" && broker = "${broker.name}" && accountKind = "${kind}"`,
    sort: '-created',
  });
  const row = {
    accountRef,
    status: 'pending',
    lastSync: now,
  };
  if (existing.length > 0) {
    return pb.collection('broker_accounts').update(existing[0].id, row);
  }
  return pb.collection('broker_accounts').create({
    broker: broker.name,
    tag: broker.tag,
    accountKind: kind,
    balance: 0,
    owner: ownerId,
    ...row,
  });
}

// Re-sync one account through its live provider (no-op honest result when
// the provider has no stored credentials yet).
export async function resyncBrokerAccount(id) {
  const acct = await pb.collection('broker_accounts').getOne(id).catch(() => null);
  const providerId = acct ? providerIdForBroker({ name: acct.broker }) : null;
  if (!providerId) {
    await pb.collection('broker_accounts').update(id, { status: 'pending', lastSync: new Date().toISOString() }).catch(() => {});
    return { ok: false, error: 'Unknown provider for this account.' };
  }
  const out = await api('/sync', { method: 'POST', body: { provider: providerId } });
  const r = (out.results || []).find((x) => x.provider === providerId);
  if (!r?.ok) {
    await pb.collection('broker_accounts').update(id, { status: 'error', lastSync: new Date().toISOString() }).catch(() => {});
    return { ok: false, error: r?.error || 'Sync failed.' };
  }
  return { ok: true, ...r };
}

export async function disconnectBroker(id) {
  try {
    await pb.collection('broker_accounts').getOne(id).then(async (acct) => {
      const providerId = providerIdForBroker({ name: acct?.broker });
      if (providerId) {
        const creds = await api(`/connections`).catch(() => ({ connections: [] }));
        const match = (creds.connections || []).find((c) => c.provider === providerId);
        if (match) await api(`/connections/${match.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }).catch(() => {});
  } finally {
    await pb.collection('broker_accounts').delete(id);
  }
}

// Sync every connected provider; returns live per-provider results.
export async function syncAllBrokers(ownerId) {
  void ownerId;
  const out = await api('/sync', { method: 'POST', body: {} }).catch((err) => ({ results: [], error: err?.message }));
  const results = out.results || [];
  const added = results.reduce((s, r) => s + (r.added || 0), 0);
  return { accounts: results.length, added, results, error: out.error };
}

export async function getBrokerProviders() {
  const local = Object.values(PROVIDERS);
  try {
    const out = await api('/providers');
    if (Array.isArray(out.providers) && out.providers.length) {
      // Merge: backend is source of truth for availability (methods/status),
      // but it carries no display fields (method/kind/website/blurb/setup).
      // Never replace the local registry wholesale — that blanks display fields
      // (method/kind/website/blurb/setup) and breaks the connect modal.
      const byId = new Map(out.providers.map((p) => [p.id, p]));
      return local.map((def) => {
        const remote = byId.get(def.id);
        if (!remote) return def;
        return { ...def, backendStatus: remote.status || null };
      });
    }
  } catch { /* fall through to static registry */ }
  return local;
}

export async function getBrokerHealth() {
  return api('/health').catch(() => ({ vault: false, binance: { ok: false } }));
}

export { STRATEGIES, EMOTIONS };
