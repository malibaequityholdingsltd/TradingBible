import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2, Camera, Lock, Plus } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';
const check = 'flex items-center gap-2.5 rounded-xl border border-white/8 bg-black/30 px-3.5 py-2.5 text-sm text-[#c9c4b4] cursor-pointer transition hover:border-[#d4af37]/30';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

const EMPTY = { title: '', amountPerUser: '100', maxRecipients: '500', challengePassed: false, academy: false, minReferrals: '', minTrades: '', registeredBefore: '' };

export default function AdminAirdrops() {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/airdrops`, { headers: headers() });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setList(d.airdrops || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e?.preventDefault?.();
    if (!form.title.trim() || !(Number(form.amountPerUser) > 0)) {
      toast({ variant: 'destructive', title: 'Title + TBC per user required' });
      return;
    }
    setBusy('create');
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/airdrops`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          title: form.title.trim(),
          amountPerUser: Number(form.amountPerUser),
          maxRecipients: Number(form.maxRecipients) || 500,
          criteria: {
            challengePassed: form.challengePassed,
            academy: form.academy,
            minReferrals: Number(form.minReferrals) || 0,
            minTrades: Number(form.minTrades) || 0,
            registeredBefore: form.registeredBefore || undefined,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'create failed');
      toast({ title: 'Campaign drafted', description: 'Snapshot eligibility to open it.' });
      setForm(EMPTY);
      await load();
    } catch (err) { toast({ variant: 'destructive', title: 'Create failed', description: err.message }); }
    finally { setBusy(''); }
  };

  const snapshot = async (id) => {
    if (!window.confirm('Snapshot eligibility now? Matching users become recipients and the campaign opens.')) return;
    setBusy(`snap:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/airdrops/${id}/snapshot`, { method: 'POST', headers: headers() });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'snapshot failed');
      toast({ title: `Snapshot done — ${d.recipients} recipients (${d.added} new)` });
      await load();
    } catch (err) { toast({ variant: 'destructive', title: 'Snapshot failed', description: err.message }); }
    finally { setBusy(''); }
  };

  const close = async (id) => {
    if (!window.confirm('Close this campaign? No further claims.')) return;
    setBusy(`close:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/tbc/admin/airdrops/${id}/close`, { method: 'POST', headers: headers() });
      if (!res.ok) throw new Error('close failed');
      toast({ title: 'Campaign closed' });
      await load();
    } catch (err) { toast({ variant: 'destructive', title: 'Close failed', description: err.message }); }
    finally { setBusy(''); }
  };

  return (
    <AdminLayout title="Airdrops">
      <div className="tb-page !max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95 px-5 py-4 sm:px-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]"><Gift className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4af37]">TBC Airdrops</p>
            <h1 className="truncate text-xl font-extrabold text-[#f0ecdd] sm:text-2xl">Eligibility → snapshot → claim</h1>
          </div>
        </div>

        <Card className="mt-4 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-[#f0ecdd]"><Plus className="h-4 w-4 text-[#d4af37]" /> New campaign</div>
          <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Campaign title (e.g. Genesis traders)" />
            <div className="grid grid-cols-2 gap-3">
              <input className={`${input} font-mono`} type="number" min="1" value={form.amountPerUser} onChange={(e) => setForm({ ...form, amountPerUser: e.target.value })} placeholder="TBC per user" />
              <input className={`${input} font-mono`} type="number" min="1" value={form.maxRecipients} onChange={(e) => setForm({ ...form, maxRecipients: e.target.value })} placeholder="Max recipients" />
            </div>
            <label className={check}><input type="checkbox" checked={form.challengePassed} onChange={(e) => setForm({ ...form, challengePassed: e.target.checked })} className="h-4 w-4 accent-[#d4af37]" /> Passed a challenge</label>
            <label className={check}><input type="checkbox" checked={form.academy} onChange={(e) => setForm({ ...form, academy: e.target.checked })} className="h-4 w-4 accent-[#d4af37]" /> Owns Academy</label>
            <input className={`${input} font-mono`} type="number" min="0" value={form.minReferrals} onChange={(e) => setForm({ ...form, minReferrals: e.target.value })} placeholder="Min referrals (0 = any)" />
            <input className={`${input} font-mono`} type="number" min="0" value={form.minTrades} onChange={(e) => setForm({ ...form, minTrades: e.target.value })} placeholder="Min journaled trades (0 = any)" />
            <div className="sm:col-span-2">
              <input className={input} type="date" value={form.registeredBefore} onChange={(e) => setForm({ ...form, registeredBefore: e.target.value })} aria-label="Registered before" />
            </div>
            <div className="sm:col-span-2">
              <GoldButton disabled={busy === 'create'} className="!px-5 !py-2.5 !text-xs">{busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create draft'}</GoldButton>
            </div>
          </form>
        </Card>

        {loading ? (
          <p className="mt-4 text-sm text-[#8a8577]">Loading campaigns…</p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-[#8a8577]">No campaigns yet — draft the first above.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-bold text-[#f0ecdd]">{a.title}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${a.status === 'open' ? 'bg-emerald-400/15 text-emerald-400' : a.status === 'closed' ? 'bg-white/10 text-[#8a8577]' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>{a.status}</span>
                </div>
                <div className="mt-2 font-mono text-sm text-[#d4af37]">{Number(a.amountPerUser).toLocaleString()} TBC <span className="text-[#8a8577]">/ user</span></div>
                <div className="mt-1 font-mono text-[11px] text-[#8a8577]">{a.recipients} recipients · {a.claimed} claimed</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status !== 'closed' && (
                    <GoldButton disabled={busy === `snap:${a.id}`} onClick={() => snapshot(a.id)} className="!px-4 !py-2 !text-xs">
                      {busy === `snap:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Camera className="h-3.5 w-3.5" /> Snapshot{a.status === 'open' ? ' again' : ' & open'}</>}
                    </GoldButton>
                  )}
                  {a.status === 'open' && (
                    <GhostButton disabled={busy === `close:${a.id}`} onClick={() => close(a.id)} className="!px-4 !py-2 !text-xs"><Lock className="h-3.5 w-3.5" /> Close</GhostButton>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-[#6a665a]">Claims land as spendable TBC till credit instantly; the treasury claim rails carry them on-chain at token launch. Re-snapshotting only adds new recipients — claimed users are never double-counted.</p>
      </div>
    </AdminLayout>
  );
}
