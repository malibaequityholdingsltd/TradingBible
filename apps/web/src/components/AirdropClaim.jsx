import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcMoney } from '@/components/TbcSign';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

// Trader-facing airdrop allocations: claim TBC into the ledger.
// The on-chain leg reuses the treasury claim rails at token launch.
export default function AirdropClaim({ onChanged }) {
  const { toast } = useToast();
  const [drops, setDrops] = useState([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      if (!pb.authStore.token) return;
      const data = await fetch(`${API_SERVER_URL}/tbc/airdrops/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({}));
      setDrops(data.airdrops || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!drops.length) return null;

  const claim = async (id, title) => {
    setBusy(`claim:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/airdrops/claim`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'claim failed');
      toast({ title: `${title}: claimed ${data.claimed} TBC`, description: 'Spendable in your balance now. On-chain at token launch.' });
      await load();
      onChanged?.();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Claim failed', description: error.message });
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="wv-card" aria-labelledby="airdrop-title">
      <div className="wv-card-head">
        <div className="wv-asset-identity">
          <span className="wv-asset-icon wv-asset-icon--tbc"><Gift className="h-4 w-4" style={{ color: 'var(--at-gold)' }} /></span>
          <div>
            <h2 id="airdrop-title" className="wv-section-title">Airdrops</h2>
            <p className="wv-section-sub">Claimed credits enter your ledger immediately</p>
          </div>
        </div>
        <span className="wv-chip wv-chip--gold">{drops.length} allocation{drops.length === 1 ? '' : 's'}</span>
      </div>
      {drops.map((drop) => (
        <div key={drop.id} className="wv-airdrop-row">
          <div className="wv-airdrop-main">
            <div className="wv-airdrop-title">{drop.title}</div>
            <div className="wv-airdrop-amount"><TbcMoney amount={drop.amount} /></div>
          </div>
          {drop.claimed || drop.status !== 'open' ? (
            <span className={`wv-chip ${drop.claimed ? 'wv-chip--green' : ''}`}>{drop.claimed ? 'Claimed' : drop.status}</span>
          ) : (
            <button type="button" className="wv-btn wv-btn--secondary wv-btn--sm" disabled={busy === `claim:${drop.id}`} onClick={() => claim(drop.id, drop.title)}>
              {busy === `claim:${drop.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
              Claim TBC
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
