import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';

// Loads the user's connected accounts (live brokers + prop firms) and the
// crypto-bank account, and exposes the three separate balances used across
// the dashboard and profile. All balances are 0 until real accounts connect.
export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [crypto, setCrypto] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid || !user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const items = await pb.collection('broker_accounts').getFullList({
        filter: `owner = "${user.id}"`,
        sort: '-created',
      });
      setAccounts(items);
    } catch {
      setAccounts([]);
    }
    try {
      const acc = await pb.collection('crypto_accounts').getFirstListItem(`owner = "${user?.id}"`);
      setCrypto(acc);
    } catch {
      setCrypto(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const live = accounts.filter((a) => (a.accountKind || 'live') === 'live');
  const prop = accounts.filter((a) => a.accountKind === 'prop');
  const sum = (arr) => arr.reduce((s, a) => s + (a.balance || 0), 0);

  return {
    loading,
    live,
    prop,
    liveTotal: sum(live),
    propTotal: sum(prop),
    cryptoTotal: crypto?.balance || 0,
    reload: load,
  };
}

export default useAccounts;
