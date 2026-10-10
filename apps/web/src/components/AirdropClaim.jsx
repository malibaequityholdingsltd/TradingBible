import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { Card, GoldButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcMoney } from '@/components/TbcSign';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

// Trader-facing airdrop allocations: claim TBC into the till.
// On-chain leg reuses the treasury claim rails at token launch.
export default function AirdropClaim({ onChanged }) {
  const { toast } = useToast();
  const [drops, setDrops] = useState([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      if (!pb.authStore.token) return;
      const d = await fetch(`${API_SERVER_URL}/tbc/airdrops/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({}));
      setDrops(d.airdrops || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!drops.length) return null;

  const claim = async (id, title) => {
    setBusy(`claim:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/airdrops/claim`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'claim failed');
      toast({ title: `${title}: claimed ${d.claimed} TBC`, description: 'Spendable in your till now — on-chain at token launch.' });
      await load();
      onChanged?.();
    } catch (e) { toast({ variant: 'destructive', title: 'Claim failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <Card className="border-[#d4af37]/30 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]">
        <Gift className="h-4 w-4 text-[#d4af37]" /> Airdrops
        <span className="ml-auto rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{drops.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {drops.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-[#f0ecdd]">{a.title}</div>
              <div className="text-[#d4af37]"><TbcMoney amount={a.amount} /></div>
            </div>
            {a.claimed || a.status !== 'open' ? (
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${a.claimed ? 'bg-emerald-400/15 text-emerald-400' : 'bg-white/10 text-[#8a8577]'}`}>
                {a.claimed ? 'claimed' : a.status}
              </span>
            ) : (
              <GoldButton disabled={busy === `claim:${a.id}`} onClick={() => claim(a.id, a.title)} className="!px-4 !py-2 !text-xs">
                {busy === `claim:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Claim TBC'}
              </GoldButton>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
