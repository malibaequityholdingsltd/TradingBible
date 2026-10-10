import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, EmptyState } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

export default function LeaderboardPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetch(`${API_SERVER_URL}/leaderboard`).then((r) => r.json()).catch(() => ({}));
      setRows(data.leaderboard || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const optIn = async () => {
    const name = window.prompt('Display name for the leaderboard:', '') || '';
    if (!name.trim()) return;
    try {
      const res = await fetch(`${API_SERVER_URL}/leaderboard/optin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim(), enabled: true }),
      });
      if (!res.ok) throw new Error('opt-in failed');
      toast({ title: 'You are on the board', description: 'Verified from your journaled trades (5+ needed to rank).' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Opt-in failed', description: e.message }); }
  };

  return (
    <AppLayout title="Leaderboard">
      <div className="tb-page">
        <PageHero
          kickerIcon={Trophy}
          kicker="Verified Leaderboard"
          title="Proof, not"
          accent="promises"
          subtitle="Ranked by realized journal P&L from opted-in traders. No screenshots, no claims — fills only."
          actions={<GoldButton onClick={optIn} className="!px-4 !py-2 !text-xs">Join the board</GoldButton>}
        />
        {loading ? (
          <p className="text-sm text-[#8a8577]">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Medal} title="No ranked traders yet" sub="Opt in and log 5+ trades to claim rank one." />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-white/5">
              {rows.map((r) => (
                <div key={`${r.rank}-${r.name}`} className="flex items-center gap-4 px-4 py-3">
                  <span className={`w-8 shrink-0 text-center font-mono text-lg font-extrabold ${r.rank <= 3 ? 'text-[#d4af37]' : 'text-[#6a665a]'}`}>{r.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#f0ecdd]">{r.name}</div>
                    <div className="text-xs text-[#8a8577]">{r.trades} trades · {r.winRate}% win</div>
                  </div>
                  <div className={`shrink-0 font-mono font-bold ${r.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.netPnl >= 0 ? '+' : ''}${r.netPnl.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
