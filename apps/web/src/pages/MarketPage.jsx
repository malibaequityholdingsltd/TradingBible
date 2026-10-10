import React, { useCallback, useEffect, useState } from 'react';
import { Store, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, GhostButton, EmptyState } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcMoney } from '@/components/TbcSign';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 min-h-[44px]';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

export default function MarketPage() {
  const { toast } = useToast();
  const [signals, setSignals] = useState([]);
  const [price, setPrice] = useState('29');
  const [busy, setBusy] = useState('');
  const [tbcPerUsd, setTbcPerUsd] = useState(1 / 3.25);
  const tbcFor = (usd) => Math.round(Number(usd || 0) * tbcPerUsd * 100) / 100;

  const load = useCallback(async () => {
    try {
      const data = await fetch(`${API_SERVER_URL}/market/signals`, { headers: headers() }).then((r) => r.json()).catch(() => ({}));
      setSignals(data.signals || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).then((e) => {
      const rt = Number(e?.tbcPerUsd);
      if (rt > 0.15 && rt < 0.6) setTbcPerUsd(rt); // 1 TBC = 1 KWD — reject 1:1
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) setTbcPerUsd(1 / Number(e.usdPerKwd));
    }).catch(() => {});
  }, []);

  const setMyPrice = async () => {
    const n = Number(price);
    if (!(n >= 0)) { toast({ variant: 'destructive', title: 'Enter a monthly price (0 = free tier off)' }); return; }
    setBusy('price');
    try {
      const res = await fetch(`${API_SERVER_URL}/market/price`, { method: 'POST', headers: headers(), body: JSON.stringify({ price: n }) });
      if (!res.ok) throw new Error('failed');
      toast({ title: n > 0 ? `Your signals cost $${n}/mo` : 'Paid tier off' });
    } catch (e) { toast({ variant: 'destructive', title: 'Price failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const unsubscribe = async (creatorId, creator) => {
    if (!window.confirm(`Cancel your subscription to ${creator}?`)) return;
    setBusy(`sub:${creatorId}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/market/unsubscribe`, { method: 'POST', headers: headers(), body: JSON.stringify({ creator: creatorId }) });
      if (!res.ok) throw new Error('unsubscribe failed');
      toast({ title: 'Subscription cancelled' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Cancel failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const subscribe = async (creatorId, creator, amount) => {
    if (!window.confirm(`Subscribe to ${creator} for ${tbcFor(amount).toLocaleString()} TBC/mo ($${amount} list)? 75% goes to the creator. Paid in TBC only — convert, swap, buy or receive TBC first.`)) return;
    setBusy(`sub:${creatorId}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/market/subscribe`, { method: 'POST', headers: headers(), body: JSON.stringify({ creator: creatorId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'subscribe failed');
      toast({ title: data.already ? 'Already subscribed' : 'Subscribed', description: 'Full entries unlocked.' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Subscribe failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <AppLayout title="Signal Market">
      <div className="tb-page">
        <PageHero
          kickerIcon={Store}
          kicker="Signal Market"
          title="Buy edge from"
          accent="proven traders"
          subtitle="Creators list signals with a monthly price, settled in TBC. Subscribers unlock full entries. Creators keep 75%."
        />
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1 text-sm text-[#c9c4b4]">Sell your own signals — set a monthly price (USD list, settled in TBC from subscriber tills).</div>
          <input className={`${input} !w-32`} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$/mo" />
          <GoldButton disabled={busy === 'price'} onClick={setMyPrice} className="!px-3 !py-2 !text-xs">{busy === 'price' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set my price'}</GoldButton>
        </Card>
        {signals.length === 0 ? (
          <EmptyState icon={Store} title="No listed signals yet" sub="Be the first creator to list one from the Signals page." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {signals.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#f0ecdd]">{s.symbol}</span>
                  <span className={`flex items-center gap-1 text-xs font-bold ${s.side === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.side === 'long' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{s.side}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[#8a8577]">by {s.creator} · {s.created ? new Date(s.created).toLocaleDateString() : ''}</div>
                {s.subscribed || s.entry !== null ? (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                      <div><div className="text-[#6a665a]">Entry</div><div className="text-[#f0ecdd]">{s.entry ?? '—'}</div></div>
                      <div><div className="text-[#6a665a]">Target</div><div className="text-emerald-400">{s.target ?? '—'}</div></div>
                      <div><div className="text-[#6a665a]">Stop</div><div className="text-red-400">{s.stop ?? '—'}</div></div>
                    </div>
                    {s.subscribed && (
                      <button onClick={() => unsubscribe(s.creatorId, s.creator)} className="mt-2 text-[11px] text-[#6a665a] hover:text-red-400 hover:underline">Cancel subscription</button>
                    )}
                  </>
                ) : (
                  <div className="mt-3 rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-3 text-center">
                    <div className="text-[#d4af37]"><TbcMoney amount={tbcFor(s.price)} /></div>
                    <div className="font-mono text-[11px] text-[#8a8577]">${s.price}/mo list · TBC only</div>
                    <GhostButton disabled={busy === `sub:${s.creatorId}`} onClick={() => subscribe(s.creatorId, s.creator, s.price)} className="mt-2 !px-3 !py-1.5 !text-xs">
                      {busy === `sub:${s.creatorId}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unlock entries'}
                    </GhostButton>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
