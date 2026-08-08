import React, { useMemo, useState } from 'react';
import {
  Wallet, CreditCard, ArrowDownToLine, ArrowUpFromLine, Send, ShoppingCart,
  Snowflake, Play, Plus, Trash2, RefreshCw, Download, ShieldCheck, Coins, ArrowLeftRight,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useWallet, CRYPTO_PRICES, CRYPTO_LIST } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';
const btnGold = 'flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60 min-h-[44px]';
const btnGhost = 'flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2.5 text-sm font-medium text-[#e9e7df] transition hover:border-[#d4af37]/60 min-h-[44px]';

const KIND_LABEL = {
  deposit: 'Deposit', withdrawal: 'Withdrawal', transfer: 'Transfer', buy: 'Buy', sell: 'Sell', card_purchase: 'Card purchase',
};

function ActionModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#d4af37]/20 bg-[#0c0c11] p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-[#f0ecdd]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const bank = useWallet();
  const { account, cards, txns, loading } = bank;
  const { toast } = useToast();
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const holdingsValue = useMemo(() => {
    if (!account?.holdings) return 0;
    return Object.entries(account.holdings).reduce((s, [k, v]) => s + v * (CRYPTO_PRICES[k] || 0), 0);
  }, [account]);
  const totalValue = (account?.balance || 0) + holdingsValue;

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); setModal(null); }
    catch (err) { toast({ variant: 'destructive', title: 'Action failed', description: err?.message || 'Try again.' }); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    const head = 'Date,Type,Asset,Amount,Fiat Value,Status,Counterparty';
    const body = txns.map((t) => [String(t.created).slice(0, 19), t.kind, t.asset, t.amount, t.fiatValue, t.status, t.counterparty].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tradingbible-wallet-statement.csv'; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <AppLayout title="Wallet"><div className="glass flex items-center justify-center gap-2 rounded-2xl py-20 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading your accounts…</div></AppLayout>;

  return (
    <AppLayout title="Wallet">
      {/* Balance hero */}
      <div className="glass gold-glow rounded-2xl p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Wallet className="h-4 w-4 text-[#d4af37]" /> Total portfolio value</div>
        <div className="mt-2 font-mono text-3xl font-bold text-[#f0ecdd] sm:text-4xl">{fmtMoney(totalValue)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-[10px] uppercase text-[#8a8577]">Available (USD)</div><div className="mt-1 font-mono text-sm font-semibold text-emerald-400">{fmtMoney(account?.balance || 0)}</div></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-[10px] uppercase text-[#8a8577]">Crypto holdings</div><div className="mt-1 font-mono text-sm font-semibold text-[#d4af37]">{fmtMoney(holdingsValue)}</div></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><div className="text-[10px] uppercase text-[#8a8577]">Reserved</div><div className="mt-1 font-mono text-sm font-semibold text-[#c9c4b4]">{fmtMoney(account?.reserved || 0)}</div></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <button className={btnGold} onClick={() => setModal('deposit')}><ArrowDownToLine className="h-4 w-4" /> Deposit</button>
          <button className={btnGhost} onClick={() => setModal('withdraw')}><ArrowUpFromLine className="h-4 w-4" /> Withdraw</button>
          <button className={btnGhost} onClick={() => setModal('buy')}><ShoppingCart className="h-4 w-4" /> Buy</button>
          <button className={btnGhost} onClick={() => setModal('sell')}><Coins className="h-4 w-4" /> Sell</button>
          <button className={btnGhost} onClick={() => setModal('send')}><Send className="h-4 w-4" /> Send</button>
        </div>
      </div>

      {/* Holdings */}
      <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><ArrowLeftRight className="h-4 w-4 text-[#d4af37]" /> Crypto wallet</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(account?.holdings || {}).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-sm font-semibold text-[#f0ecdd]">{k}</div>
              <div className="mt-1 font-mono text-xs text-[#c9c4b4]">{v.toFixed(4)}</div>
              <div className="font-mono text-xs text-[#8a8577]">{fmtMoney(v * (CRYPTO_PRICES[k] || 0))}</div>
            </div>
          ))}
          {Object.keys(account?.holdings || {}).length === 0 && <p className="text-sm text-[#8a8577]">No crypto yet — buy some to get started.</p>}
        </div>
      </div>

      {/* Cards */}
      <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><CreditCard className="h-4 w-4 text-[#d4af37]" /> Cards</h3>
          <button className={btnGold} onClick={() => setModal('card')}><Plus className="h-4 w-4" /> Issue card</button>
        </div>
        {cards.length === 0 ? (
          <p className="text-sm text-[#8a8577]">No cards yet. Issue a virtual or physical debit / credit card.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <div key={c.id} className={`relative overflow-hidden rounded-2xl p-5 ${c.status === 'frozen' ? 'opacity-60' : ''}`} style={{ background: 'linear-gradient(135deg,#1a1a22,#0d0d12)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#8a8577]">{c.cardKind} · {c.form}</div>
                    <div className="mt-1 text-sm font-medium text-[#f0ecdd]">{c.label || 'TradingBible Card'}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.status === 'active' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-blue-400/15 text-blue-300'}`}>{c.status}</span>
                </div>
                <div className="mt-6 font-mono text-lg tracking-widest text-[#e9e7df]">•••• •••• •••• {c.last4}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#8a8577]">
                  <span>Exp {c.expiry}</span>
                  <span>{c.network}</span>
                </div>
                <div className="mt-3 text-xs text-[#c9c4b4]">
                  {c.cardKind === 'credit'
                    ? <>Credit limit {fmtMoney(c.creditLimit || 0)} · Used {fmtMoney(c.creditUsed || 0)}</>
                    : <>Spending limit {fmtMoney(c.spendingLimit || 0)}</>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => bank.updateCard(c.id, { status: c.status === 'active' ? 'frozen' : 'active' })} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#d4af37]/25 py-2 text-xs text-[#e9e7df]">
                    {c.status === 'active' ? <><Snowflake className="h-3.5 w-3.5" /> Freeze</> : <><Play className="h-3.5 w-3.5" /> Unfreeze</>}
                  </button>
                  <button onClick={() => bank.removeCard(c.id)} className="grid place-items-center rounded-lg border border-red-500/25 px-3 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#f0ecdd]">Transaction history</h3>
          <button onClick={exportCsv} className={btnGhost}><Download className="h-4 w-4" /> Export</button>
        </div>
        {txns.length === 0 ? (
          <p className="text-sm text-[#8a8577]">No transactions yet.</p>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]">{['Date', 'Type', 'Asset', 'Amount', 'Value', 'Status', 'Counterparty'].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="py-2.5 pr-3 text-[#c9c4b4]">{String(t.created).slice(0, 10)}</td>
                    <td className="py-2.5 pr-3 text-[#f0ecdd]">{KIND_LABEL[t.kind] || t.kind}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#c9c4b4]">{t.asset}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#c9c4b4]">{Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#d4af37]">{fmtMoney(t.fiatValue || 0)}</td>
                    <td className="py-2.5 pr-3"><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">{t.status}</span></td>
                    <td className="py-2.5 pr-3 text-[#8a8577]">{t.counterparty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#8a8577]"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Balances and cards are secured to your account. Operated by MALIBA EQUITY HOLDINGS LTD.</div>

      {/* Modals */}
      {modal === 'deposit' && <AmountModal title="Deposit funds" cta="Deposit" busy={busy} onClose={() => setModal(null)} onSubmit={(amt) => run(() => bank.deposit(amt), 'Deposit completed')} />}
      {modal === 'withdraw' && <AmountModal title="Withdraw funds" cta="Withdraw" busy={busy} onClose={() => setModal(null)} onSubmit={(amt) => run(() => bank.withdraw(amt), 'Withdrawal completed')} />}
      {modal === 'buy' && <TradeModal title="Buy crypto" cta="Buy" busy={busy} account={account} mode="buy" onClose={() => setModal(null)} onSubmit={(asset, fiat) => run(() => bank.buy(asset, fiat), 'Purchase completed')} />}
      {modal === 'sell' && <TradeModal title="Sell crypto" cta="Sell" busy={busy} account={account} mode="sell" onClose={() => setModal(null)} onSubmit={(asset, qty) => run(() => bank.sell(asset, qty), 'Sale completed')} />}
      {modal === 'send' && <SendModal busy={busy} onClose={() => setModal(null)} onSubmit={(asset, qty, to) => run(() => bank.send(asset, qty, to), 'Transfer sent')} />}
      {modal === 'card' && <CardModal busy={busy} onClose={() => setModal(null)} onSubmit={(data) => run(() => bank.issueCard(data), 'Card issued')} />}
    </AppLayout>
  );
}

function AmountModal({ title, cta, busy, onClose, onSubmit }) {
  const [amt, setAmt] = useState('');
  return (
    <ActionModal title={title} onClose={onClose}>
      <label className="mb-1.5 block text-xs text-[#8a8577]">Amount (USD)</label>
      <input className={input} type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" />
      <button disabled={busy || !amt} className={`${btnGold} mt-4 w-full`} onClick={() => onSubmit(parseFloat(amt))}>{cta}</button>
    </ActionModal>
  );
}

function TradeModal({ title, cta, busy, account, mode, onClose, onSubmit }) {
  const [asset, setAsset] = useState('BTC');
  const [val, setVal] = useState('');
  const price = CRYPTO_PRICES[asset];
  const preview = mode === 'buy' ? (val ? (parseFloat(val) / price).toFixed(6) : '0') + ` ${asset}` : (val ? fmtMoneySafe(parseFloat(val) * price) : '$0');
  return (
    <ActionModal title={title} onClose={onClose}>
      <label className="mb-1.5 block text-xs text-[#8a8577]">Asset</label>
      <select className={input} value={asset} onChange={(e) => setAsset(e.target.value)}>{CRYPTO_LIST.map((c) => <option key={c} className="bg-[#0f0f14]">{c}</option>)}</select>
      <label className="mb-1.5 mt-3 block text-xs text-[#8a8577]">{mode === 'buy' ? 'Spend (USD)' : `Sell quantity (${asset})`}</label>
      <input className={input} type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0.00" />
      <p className="mt-2 text-xs text-[#8a8577]">Rate: {fmtMoneySafe(price)} · You {mode === 'buy' ? 'receive' : 'get'} {preview}</p>
      {mode === 'sell' && <p className="mt-1 text-xs text-[#8a8577]">Balance: {((account?.holdings || {})[asset] || 0).toFixed(6)} {asset}</p>}
      <button disabled={busy || !val} className={`${btnGold} mt-4 w-full`} onClick={() => onSubmit(asset, parseFloat(val))}>{cta}</button>
    </ActionModal>
  );
}

function SendModal({ busy, onClose, onSubmit }) {
  const [asset, setAsset] = useState('BTC');
  const [qty, setQty] = useState('');
  const [to, setTo] = useState('');
  return (
    <ActionModal title="Send crypto" onClose={onClose}>
      <label className="mb-1.5 block text-xs text-[#8a8577]">Asset</label>
      <select className={input} value={asset} onChange={(e) => setAsset(e.target.value)}>{CRYPTO_LIST.map((c) => <option key={c} className="bg-[#0f0f14]">{c}</option>)}</select>
      <label className="mb-1.5 mt-3 block text-xs text-[#8a8577]">Quantity</label>
      <input className={input} type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.00" />
      <label className="mb-1.5 mt-3 block text-xs text-[#8a8577]">Recipient (wallet address or @user)</label>
      <input className={input} value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… or @trader" />
      <button disabled={busy || !qty} className={`${btnGold} mt-4 w-full`} onClick={() => onSubmit(asset, parseFloat(qty), to)}>Send</button>
    </ActionModal>
  );
}

function CardModal({ busy, onClose, onSubmit }) {
  const [f, setF] = useState({ cardKind: 'debit', form: 'virtual', label: '', spendingLimit: 5000, creditLimit: 10000 });
  return (
    <ActionModal title="Issue a new card" onClose={onClose}>
      <label className="mb-1.5 block text-xs text-[#8a8577]">Card label</label>
      <input className={input} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="e.g. Daily spend" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="mb-1.5 block text-xs text-[#8a8577]">Type</label><select className={input} value={f.cardKind} onChange={(e) => setF({ ...f, cardKind: e.target.value })}><option value="debit" className="bg-[#0f0f14]">Debit</option><option value="credit" className="bg-[#0f0f14]">Credit</option></select></div>
        <div><label className="mb-1.5 block text-xs text-[#8a8577]">Form</label><select className={input} value={f.form} onChange={(e) => setF({ ...f, form: e.target.value })}><option value="virtual" className="bg-[#0f0f14]">Virtual</option><option value="physical" className="bg-[#0f0f14]">Physical</option></select></div>
      </div>
      {f.cardKind === 'credit' ? (
        <div className="mt-3"><label className="mb-1.5 block text-xs text-[#8a8577]">Credit limit (USD)</label><input className={input} type="number" value={f.creditLimit} onChange={(e) => setF({ ...f, creditLimit: parseFloat(e.target.value) || 0 })} /></div>
      ) : (
        <div className="mt-3"><label className="mb-1.5 block text-xs text-[#8a8577]">Spending limit (USD)</label><input className={input} type="number" value={f.spendingLimit} onChange={(e) => setF({ ...f, spendingLimit: parseFloat(e.target.value) || 0 })} /></div>
      )}
      <button disabled={busy} className={`${btnGold} mt-4 w-full`} onClick={() => onSubmit({ ...f, creditUsed: 0 })}>Issue card</button>
    </ActionModal>
  );
}

function fmtMoneySafe(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}
