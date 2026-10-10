import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlaskConical, Loader2, Plus, Trash2, Trophy, Crosshair, RotateCcw, Zap, History, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, GhostButton, EmptyState, Note } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import { useQuotes } from '@/hooks/useQuotes';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';
const lab = 'mb-1.5 block text-xs font-semibold text-[#8a8577]';
const money = (n) => `${Number(n || 0) < 0 ? '-' : ''}$${Math.abs(Number(n || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

function upl(t, price) {
  if (price == null) return null;
  const dir = t.side === 'short' ? -1 : 1;
  return (price - Number(t.entry)) * Number(t.qty) * dir;
}

export default function PaperPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [contests, setContests] = useState({});
  const [needsSetup, setNeedsSetup] = useState(false);
  const [name, setName] = useState('Paper');
  const [contest, setContest] = useState('');
  const [trade, setTrade] = useState({ accountId: '', symbol: 'BTCUSD', side: 'long', qty: '0.1', price: '', stop: '', target: '' });
  const [busy, setBusy] = useState('');

  const openSyms = useMemo(() => {
    const s = new Set();
    (accounts || []).forEach((a) => (a.open || []).forEach((t) => s.add(t.symbol)));
    if (trade.symbol.trim()) s.add(trade.symbol.trim().toUpperCase());
    return [...s];
  }, [accounts, trade.symbol]);
  const { quotes } = useQuotes(openSyms, { refreshMs: 15000 });

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/paper/accounts`, { headers: headers() }).then((r) => r.json()).catch(() => ({}))
          : {},
        fetch(`${API_SERVER_URL}/paper/contests`).then((r) => r.json()).catch(() => ({})),
      ]);
      if (a.error === 'setup_required') setNeedsSetup(true);
      setAccounts(a.accounts || []);
      setContests(c.contests || {});
      if (!trade.accountId && (a.accounts || []).length) setTrade((t) => ({ ...t, accountId: a.accounts[0].id }));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const api = async (path, body, method = 'POST') => {
    const res = await fetch(`${API_SERVER_URL}${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === 'setup_required') setNeedsSetup(true);
      throw new Error(data.detail || data.error || 'request failed');
    }
    return data;
  };

  const createAccount = async () => {
    setBusy('new');
    try {
      await api('/paper/accounts', { name: name.trim() || 'Paper', contest: contest.trim() || undefined });
      setName('Paper'); setContest('');
      toast({ title: 'Paper account created', description: '$100,000 virtual. Fills at live quoted prices.' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Create failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const resetAccount = async (id) => {
    if (!window.confirm('Reset this account to $100,000? All its paper trades will be cleared.')) return;
    setBusy(`reset:${id}`);
    try {
      await api(`/paper/reset/${id}`);
      toast({ title: 'Account reset to $100,000' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Reset failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const useLivePrice = () => {
    const sym = trade.symbol.trim().toUpperCase();
    const q = quotes[sym]?.price;
    if (q != null) setTrade((t) => ({ ...t, price: String(q) }));
    else toast({ variant: 'destructive', title: 'No live quote yet', description: 'Wait a moment or type the price.' });
  };

  const openTrade = async () => {
    const qty = Number(trade.qty);
    const price = Number(trade.price);
    if (!trade.accountId || !trade.symbol.trim() || !(qty > 0) || !(price > 0)) { toast({ variant: 'destructive', title: 'Account, symbol, qty and price required' }); return; }
    setBusy('trade');
    try {
      const data = await api('/paper/trade', {
        ...trade, symbol: trade.symbol.trim().toUpperCase(), qty, price,
        stop: trade.stop === '' ? undefined : Number(trade.stop),
        target: trade.target === '' ? undefined : Number(trade.target),
      });
      if (data.trade && (trade.stop !== '' || trade.target !== '')) {
        const hasLevels = data.trade.stop != null || data.trade.target != null;
        if (!hasLevels) toast({ title: 'Note: stop/target need the DB update', description: 'Run APPLY_MISSING_TABLES.sql, then SL/TP will attach.' });
      }
      toast({ title: `${trade.side.toUpperCase()} ${qty} ${trade.symbol} @ ${price}` });
      setTrade((t) => ({ ...t, price: '', stop: '', target: '' }));
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Trade failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const closeLive = async (id) => {
    setBusy(`close:${id}`);
    try {
      const data = await api(`/paper/close-live/${id}`);
      toast({ title: `Closed at live ${data.price} (${data.source}): ${data.pnl >= 0 ? '+' : ''}$${data.pnl}` });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Close failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const closeManual = async (id) => {
    const px = Number(window.prompt('Close at what price?', '') || '');
    if (!(px > 0)) return;
    setBusy(`close:${id}`);
    try {
      const data = await api('/paper/close', { tradeId: id, price: px });
      toast({ title: `Closed: ${data.pnl >= 0 ? '+' : ''}$${data.pnl}` });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Close failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const settleAll = async () => {
    setBusy('settle');
    try {
      const data = await api('/paper/settle');
      const n = (data.settled || []).length;
      toast({ title: n ? `Settled ${n} position${n > 1 ? 's' : ''} at stop/target` : 'Nothing to settle — no stops or targets touched' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Settle failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const removeAccount = async (id) => {
    if (!window.confirm('Delete this paper account and all its trades?')) return;
    try {
      await fetch(`${API_SERVER_URL}/paper/accounts/${id}`, { method: 'DELETE', headers: headers() });
      await load();
    } catch { /* ignore */ }
  };

  const totals = useMemo(() => {
    let realized = 0, wins = 0, n = 0, open = 0;
    (accounts || []).forEach((a) => {
      realized += Number(a.realized) || 0;
      (a.closed || []).forEach((t) => { n++; if (Number(t.pnl) > 0) wins++; });
      open += (a.open || []).length;
    });
    return { realized, winRate: n ? Math.round((wins / n) * 1000) / 10 : 0, n, open };
  }, [accounts]);

  return (
    <AppLayout title="Paper Trading">
      <div className="tb-page">
        <PageHero
          kickerIcon={FlaskConical}
          kicker="Paper Trading"
          title="Reps without"
          accent="the risk"
          subtitle="$100,000 virtual per account. Live-quote entries, stop-loss and take-profit that settle themselves, one-tap live closes, and contest boards."
          stats={[
            { label: 'Realized P&L', value: `${totals.realized >= 0 ? '+' : ''}$${totals.realized.toLocaleString()}`, color: totals.realized >= 0 ? '#34d399' : '#e06666' },
            { label: 'Win rate', value: `${totals.winRate}%` },
            { label: 'Open', value: totals.open },
          ]}
          actions={totals.open > 0 ? <GoldButton onClick={settleAll} disabled={busy === 'settle'} className="!px-4 !py-2 !text-xs"><Zap className="h-4 w-4" /> {busy === 'settle' ? 'Settling…' : 'Settle stops/targets at live'}</GoldButton> : null}
        />

        {needsSetup && (
          <Card className="border-[#d4af37]/40 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
              <div className="min-w-0">
                <div className="font-semibold text-[#f0ecdd]">One-time database setup needed</div>
                <p className="mt-1 text-sm leading-relaxed text-[#8a8577]">
                  Paper trading needs its tables. Open Supabase → SQL editor → paste and run
                  <span className="font-mono text-[#d4af37]"> APPLY_MISSING_TABLES.sql </span>
                  from the project root (it also creates challenges, mentors, leaderboard and wallet-rail tables). Reload this page after.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="flex flex-wrap items-end gap-3 p-4 sm:p-5">
          <div className="min-w-[140px] flex-1">
            <div className={lab}>Account name</div>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Paper" />
          </div>
          <div className="min-w-[140px] flex-1">
            <div className={lab}>Contest tag (optional)</div>
            <input className={input} value={contest} onChange={(e) => setContest(e.target.value)} placeholder="e.g. october-cup" />
          </div>
          <GoldButton disabled={busy === 'new'} onClick={createAccount} className="!px-4 !py-2 !text-xs">
            {busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> $100k account</>}
          </GoldButton>
        </Card>

        {accounts.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No paper accounts" sub="Create one above to start simulating at live prices." />
        ) : (
          accounts.map((a) => {
            const liveUnrealized = (a.open || []).reduce((s, t) => s + (upl(t, quotes[t.symbol]?.price) ?? 0), 0);
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[#f0ecdd]">{a.name}</span>
                    {a.contest && <span className="ml-2 rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-[11px] font-bold text-[#d4af37]">🏆 {a.contest}</span>}
                    <div className="mt-0.5 font-mono text-xs text-[#8a8577]">
                      Realized {money(a.realized)} · {a.closedCount ?? 0} closed · {a.winRate ?? 0}% win
                      {liveUnrealized !== 0 && (
                        <span className={liveUnrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}> · Open {money(liveUnrealized)} live</span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#f0ecdd]">${Number(a.balance).toLocaleString()}</span>
                  <GhostButton onClick={() => resetAccount(a.id)} disabled={busy === `reset:${a.id}`} className="!min-h-[40px] !px-3 !py-1.5 !text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </GhostButton>
                  <button onClick={() => removeAccount(a.id)} className="grid h-10 w-10 place-items-center rounded-xl text-[#6a665a] hover:text-red-400" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
                {(a.open || []).length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {a.open.map((t) => {
                      const lp = quotes[t.symbol]?.price;
                      const u = upl(t, lp);
                      return (
                        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 font-mono text-xs">
                          <span className={`font-bold ${t.side === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>{t.side.toUpperCase()}</span>
                          <span className="text-[#f0ecdd]">{t.qty} {t.symbol} @ {t.entry}</span>
                          {(t.stop != null || t.target != null) && (
                            <span className="text-[#8a8577]">SL {t.stop ?? '—'} · TP {t.target ?? '—'}</span>
                          )}
                          <span className={`font-bold ${u == null ? 'text-[#6a665a]' : u >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {u == null ? (lp == null ? 'live…' : '') : `${u >= 0 ? '+' : ''}$${u.toFixed(2)} live`}
                          </span>
                          <span className="ml-auto flex gap-1.5">
                            <button onClick={() => closeLive(t.id)} disabled={busy === `close:${t.id}`} className="rounded-lg bg-[#d4af37]/15 px-2.5 py-1.5 font-sans text-[11px] font-bold text-[#d4af37] disabled:opacity-50">
                              {busy === `close:${t.id}` ? '…' : 'Close @ live'}
                            </button>
                            <button onClick={() => closeManual(t.id)} disabled={busy === `close:${t.id}`} className="rounded-lg border border-white/10 px-2.5 py-1.5 font-sans text-[11px] text-[#8a8577] disabled:opacity-50">Manual</button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(a.closed || []).length > 0 && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#8a8577] hover:text-[#e9e7df]">
                      <History className="h-3.5 w-3.5" /> Closed history ({a.closed.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {a.closed.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5 font-mono text-[11px]">
                          <span className="text-[#8a8577]">{t.side.toUpperCase()}</span>
                          <span className="text-[#c9c4b4]">{t.qty} {t.symbol} · {t.entry} → {t.exit ?? '—'}</span>
                          {t.close_reason && <span className="rounded bg-white/5 px-1.5 text-[#6a665a]">{t.close_reason}</span>}
                          <span className={`ml-auto font-bold ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Number(t.pnl) >= 0 ? '+' : ''}${Number(t.pnl || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </Card>
            );
          })
        )}

        {accounts.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#f0ecdd]">New paper trade</h3>
            <p className="mt-0.5 text-xs text-[#8a8577]">Pull the live quote, set stop/target — settlement and one-tap closes fill at live prices with 0.05% slippage.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><div className={lab}>Account</div>
                <select className={input} value={trade.accountId} onChange={(e) => setTrade({ ...trade, accountId: e.target.value })}>
                  {accounts.map((a) => <option key={a.id} value={a.id} className="bg-[#0f0f14]">{a.name}</option>)}
                </select>
              </div>
              <div><div className={lab}>Symbol</div>
                <input className={input} value={trade.symbol} onChange={(e) => setTrade({ ...trade, symbol: e.target.value })} placeholder="BTCUSD" />
              </div>
              <div><div className={lab}>Side</div>
                <select className={input} value={trade.side} onChange={(e) => setTrade({ ...trade, side: e.target.value })}>
                  <option value="long" className="bg-[#0f0f14]">Long</option>
                  <option value="short" className="bg-[#0f0f14]">Short</option>
                </select>
              </div>
              <div><div className={lab}>Qty</div>
                <input className={input} type="number" min="0" value={trade.qty} onChange={(e) => setTrade({ ...trade, qty: e.target.value })} placeholder="Qty" />
              </div>
              <div><div className={lab}>Entry price</div>
                <div className="flex gap-1.5">
                  <input className={`${input} min-w-0 flex-1`} type="number" min="0" value={trade.price} onChange={(e) => setTrade({ ...trade, price: e.target.value })} placeholder="Live price" />
                  <button onClick={useLivePrice} title="Fill live quote" className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-[#d4af37]/30 text-[#d4af37]"><Crosshair className="h-4 w-4" /></button>
                </div>
              </div>
              <div><div className={lab}>Stop-loss (optional)</div>
                <input className={input} type="number" min="0" value={trade.stop} onChange={(e) => setTrade({ ...trade, stop: e.target.value })} placeholder="SL" />
              </div>
              <div><div className={lab}>Take-profit (optional)</div>
                <input className={input} type="number" min="0" value={trade.target} onChange={(e) => setTrade({ ...trade, target: e.target.value })} placeholder="TP" />
              </div>
              <div className="flex items-end">
                <GoldButton disabled={busy === 'trade'} onClick={openTrade} className="w-full !px-4 !py-2 !text-xs">{busy === 'trade' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open position'}</GoldButton>
              </div>
            </div>
          </Card>
        )}

        {Object.keys(contests).length > 0 && (
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Trophy className="h-4 w-4 text-[#d4af37]" /> Contests</h3>
            {Object.entries(contests).map(([tag, board]) => (
              <div key={tag} className="mt-3">
                <div className="font-mono text-xs font-bold text-[#d4af37]">#{tag}</div>
                {board.map((r) => (
                  <div key={`${r.rank}-${r.name}`} className="flex justify-between border-b border-white/5 py-1.5 font-mono text-xs">
                    <span className="text-[#c9c4b4]">{r.rank}. {r.name}</span>
                    <span className={r.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{r.pnl >= 0 ? '+' : ''}${r.pnl.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        <Note icon={FlaskConical}>
          Simulator only — paper fills never touch your wallet, journal, or challenges. Stops and targets settle against the same live feeds as your charts.
        </Note>
      </div>
    </AppLayout>
  );
}
