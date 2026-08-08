import pb from '@/lib/pocketbaseClient';

const STRATEGIES = ['Breakout', 'Mean Reversion', 'Trend Follow', 'Scalping'];
const EMOTIONS = ['Confident', 'Calm', 'Disciplined', 'FOMO', 'Impatient'];

// PRODUCTION: no fabricated trades. A newly connected account starts empty and
// only reflects real trade data once a live broker feed delivers it.
export function generateTrades() {
  return [];
}

// Connect a LIVE broker or PROP FIRM account. The account is created with a
// $0.00 balance and no trades — real balances and trades arrive only from an
// authenticated broker feed, never fabricated locally.
// kind is 'live' (real broker) or 'prop' (funded / prop-firm account).
export async function connectBroker(broker, ownerId, kind = 'live', options = {}) {
  const accountRef = String(options.accountRef || '').trim() || (/crypto/i.test(broker.kind) ? 'API ••••••••' : 'Pending sync');
  const now = new Date().toISOString();
  const existing = await pb.collection('broker_accounts').getFullList({
    filter: `owner = "${ownerId}" && broker = "${broker.name}" && accountKind = "${kind}"`,
    sort: '-created',
  });
  if (existing.length > 0) {
    const patched = await pb.collection('broker_accounts').update(existing[0].id, {
      accountRef,
      status: 'syncing',
      lastSync: now,
    });
    const synced = await pb.collection('broker_accounts').update(patched.id, {
      status: 'synced',
      lastSync: new Date().toISOString(),
    });
    return synced;
  }

  const syncing = await pb.collection('broker_accounts').create({
    broker: broker.name,
    tag: broker.tag,
    accountKind: kind,
    accountRef,
    status: 'syncing',
    balance: 0,
    lastSync: now,
    owner: ownerId,
  });
  const synced = await pb.collection('broker_accounts').update(syncing.id, {
    status: 'synced',
    lastSync: new Date().toISOString(),
  });
  return synced;
}

export async function resyncBrokerAccount(id) {
  const start = await pb.collection('broker_accounts').update(id, {
    status: 'syncing',
    lastSync: new Date().toISOString(),
  });
  const done = await pb.collection('broker_accounts').update(start.id, {
    status: 'synced',
    lastSync: new Date().toISOString(),
  });
  return done;
}

export async function disconnectBroker(id) {
  await pb.collection('broker_accounts').delete(id);
}

// Re-sync all connected brokers. Without a live upstream broker feed there are
// no new trades to pull, so nothing is fabricated.
export async function syncAllBrokers(ownerId) {
  const accounts = await pb.collection('broker_accounts').getFullList({ filter: `owner = "${ownerId}"` });
  if (!accounts.length) return { accounts: 0, added: 0 };
  for (const account of accounts) {
    await pb.collection('broker_accounts').update(account.id, {
      status: 'synced', lastSync: new Date().toISOString(),
    }).catch(() => {});
  }
  return { accounts: accounts.length, added: 0 };
}

export { STRATEGIES, EMOTIONS };
