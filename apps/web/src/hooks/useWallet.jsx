import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/hooks/useAuth';

const rk = () => `cb-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Approximate spot prices for fiat<->crypto conversion (demo terminal).
export const CRYPTO_PRICES = {
  BTC: 64200, ETH: 3350, SOL: 172, BNB: 585, XRP: 0.62, USDC: 1, USDT: 1, ADA: 0.58,
};
export const CRYPTO_LIST = Object.keys(CRYPTO_PRICES);

export function useWallet() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [cards, setCards] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const ensureAccount = useCallback(async () => {
    if (!user?.id) return null;
    try {
      return await pb.collection('crypto_accounts').getFirstListItem(`owner = "${user.id}"`);
    } catch {
      return pb.collection('crypto_accounts').create({
        owner: user.id, balance: 0, reserved: 0, currency: 'USD',
        holdings: {},
      }, { requestKey: rk() });
    }
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const acc = await ensureAccount();
      setAccount(acc);
      const [c, t] = await Promise.all([
        pb.collection('bank_cards').getFullList({ filter: `owner = "${user.id}"`, sort: '-created' }),
        pb.collection('bank_transactions').getFullList({ filter: `owner = "${user.id}"`, sort: '-created' }),
      ]);
      setCards(c);
      setTxns(t);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user?.id, ensureAccount]);

  useEffect(() => { load(); }, [load]);

  const patchAccount = async (data) => {
    const rec = await pb.collection('crypto_accounts').update(account.id, data, { requestKey: rk() });
    setAccount(rec);
    return rec;
  };

  const logTx = async (tx) => {
    const rec = await pb.collection('bank_transactions').create(
      { owner: user.id, status: 'completed', ...tx }, { requestKey: rk() });
    setTxns((p) => [rec, ...p]);
    return rec;
  };

  const issueCard = async (data) => {
    const rec = await pb.collection('bank_cards').create({
      owner: user.id, status: 'active', network: 'Visa',
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      expiry: `${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/29`,
      ...data,
    }, { requestKey: rk() });
    setCards((p) => [rec, ...p]);
    return rec;
  };

  const updateCard = async (id, data) => {
    const rec = await pb.collection('bank_cards').update(id, data, { requestKey: rk() });
    setCards((p) => p.map((c) => (c.id === id ? rec : c)));
    return rec;
  };

  const removeCard = async (id) => {
    await pb.collection('bank_cards').delete(id);
    setCards((p) => p.filter((c) => c.id !== id));
  };

  const deposit = async (amount) => {
    await patchAccount({ balance: (account.balance || 0) + amount });
    return logTx({ kind: 'deposit', asset: 'USD', amount, fiatValue: amount, counterparty: 'Bank transfer' });
  };

  const withdraw = async (amount) => {
    if (amount > (account.balance || 0)) throw new Error('Insufficient available balance');
    await patchAccount({ balance: account.balance - amount });
    return logTx({ kind: 'withdrawal', asset: 'USD', amount, fiatValue: amount, counterparty: 'External bank' });
  };

  const buy = async (asset, fiat) => {
    if (fiat > (account.balance || 0)) throw new Error('Insufficient balance');
    const qty = fiat / CRYPTO_PRICES[asset];
    const holdings = { ...(account.holdings || {}) };
    holdings[asset] = (holdings[asset] || 0) + qty;
    await patchAccount({ balance: account.balance - fiat, holdings });
    return logTx({ kind: 'buy', asset, amount: qty, fiatValue: fiat, counterparty: 'TradingBible Exchange' });
  };

  const sell = async (asset, qty) => {
    const have = (account.holdings || {})[asset] || 0;
    if (qty > have) throw new Error(`Insufficient ${asset}`);
    const fiat = qty * CRYPTO_PRICES[asset];
    const holdings = { ...(account.holdings || {}) };
    holdings[asset] = have - qty;
    await patchAccount({ balance: account.balance + fiat, holdings });
    return logTx({ kind: 'sell', asset, amount: qty, fiatValue: fiat, counterparty: 'TradingBible Exchange' });
  };

  const send = async (asset, qty, counterparty) => {
    const have = (account.holdings || {})[asset] || 0;
    if (qty > have) throw new Error(`Insufficient ${asset}`);
    const holdings = { ...(account.holdings || {}) };
    holdings[asset] = have - qty;
    await patchAccount({ holdings });
    return logTx({ kind: 'transfer', asset, amount: qty, fiatValue: qty * (CRYPTO_PRICES[asset] || 0), counterparty: counterparty || 'External wallet' });
  };

  return { account, cards, txns, loading, reload: load, issueCard, updateCard, removeCard, deposit, withdraw, buy, sell, send };
}
