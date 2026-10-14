import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2, Camera, Lock, Plus } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const input = 'w-full rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-[#e9e7df] placeholder-[#6a665a] outline-none backdrop-blur-md transition focus:border-[#d4af37]/50 min-h-[38px] [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:text-[#1a1d21]';
const check = 'flex min-h-[38px] items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-[#c9c4b4] cursor-pointer backdrop-blur-md transition hover:border-[#d4af37]/30 [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:text-[#5b574a]';

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
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-white/10 bg-white/[0.02] px-4 py-3 backdrop-blur-md [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#d4af37]"><Gift className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">TBC Airdrops</p>
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#f0ecdd] [html.light_&]:text-[#1a1d21] sm:text-[20px]">Eligibility → snapshot → claim</h1>
          </div>
          <span className="shrink-0 rounded-[10px] border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] tabular-nums text-[#8a8577] [html.light_&]:border-black/[0.08] [html.light_&]:bg-black/[0.03]">{list.length} campaigns</span>
        </div>

        <Card className="mt-2.5 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.01em] text-[#f0ecdd] [html.light_&]:text-[#1a1d21]"><Plus className="h-3.5 w-3.5 text-[#d4af37]" /> New campaign</div>
          <form onSubmit={create} className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Campaign title (e.g. Genesis traders)" />
            <div className="grid grid-cols-2 gap-2">
              <input className={`${input} font-mono tabular-nums`} type="number" min="1" value={form.amountPerUser} onChange={(e) => setForm({ ...form, amountPerUser: e.target.value })} placeholder="TBC per user" />
              <input className={`${input} font-mono tabular-nums`} type="number" min="1" value={form.maxRecipients} onChange={(e) => setForm({ ...form, maxRecipients: e.target.value })} placeholder="Max recipients" />
            </div>
            <label className={check}><input type="checkbox" checked={form.challengePassed} onChange={(e) => setForm({ ...form, challengePassed: e.target.checked })} className="h-4 w-4 shrink-0 accent-[#d4af37]" /> Passed a challenge</label>
            <label className={check}><input type="checkbox" checked={form.academy} onChange={(e) => setForm({ ...form, academy: e.target.checked })} className="h-4 w-4 shrink-0 accent-[#d4af37]" /> Owns Academy</label>
            <input className={`${input} font-mono tabular-nums`} type="number" min="0" value={form.minReferrals} onChange={(e) => setForm({ ...form, minReferrals: e.target.value })} placeholder="Min referrals (0 = any)" />
            <input className={`${input} font-mono tabular-nums`} type="number" min="0" value={form.minTrades} onChange={(e) => setForm({ ...form, minTrades: e.target.value })} placeholder="Min journaled trades (0 = any)" />
            <div className="sm:col-span-2">
              <input className={`${input} tabular-nums`} type="date" value={form.registeredBefore} onChange={(e) => setForm({ ...form, registeredBefore: e.target.value })} aria-label="Registered before" />
            </div>
            <div className="sm:col-span-2">
              <GoldButton disabled={busy === 'create'} className="!px-4 !text-[13px]">{busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create draft'}</GoldButton>
            </div>
          </form>
        </Card>

        {loading ? (
          <Card className="mt-2.5 p-4"><p className="text-[13px] text-[#8a8577] [html.light_&]:text-[#6b675c]">Loading campaigns…</p></Card>
        ) : list.length === 0 ? (
          <Card className="mt-2.5 p-4"><p className="text-[13px] text-[#8a8577] [html.light_&]:text-[#6b675c]">No campaigns yet — draft the first above.</p></Card>
        ) : (
          <Card className="mt-2.5 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-white/10 bg-white/[0.02] backdrop-blur-md [html.light_&]:border-black/[0.08] [html.light_&]:bg-black/[0.02]">
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Campaign</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Per user</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Recipients</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Claimed</th>
                    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Status</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8577] [html.light_&]:text-[#6b675c]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.06] transition last:border-0 hover:bg-white/[0.02] [html.light_&]:border-black/[0.06]">
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-[13px] font-semibold tracking-[-0.01em] text-[#f0ecdd] [html.light_&]:text-[#1a1d21]">{a.title}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] tabular-nums text-[#d4af37] [html.light_&]:text-[#8a6d1b]">{Number(a.amountPerUser).toLocaleString()} TBC <span className="text-[#8a8577] [html.light_&]:text-[#6b675c]">/ user</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] tabular-nums text-[#e9e7df] [html.light_&]:text-[#1a1d21]">{a.recipients} <span className="font-sans text-[11px] text-[#8a8577] [html.light_&]:text-[#6b675c]">recipients</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] tabular-nums text-[#8a8577] [html.light_&]:text-[#6b675c]">{a.claimed} <span className="font-sans text-[11px]">claimed</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={`inline-flex shrink-0 items-center rounded-[10px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums ${a.status === 'open' ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-400' : a.status === 'closed' ? 'border-white/10 bg-white/[0.04] text-[#8a8577] [html.light_&]:border-black/[0.08] [html.light_&]:bg-black/[0.04]' : 'border-[#d4af37]/25 bg-[#d4af37]/[0.07] text-[#d4af37] [html.light_&]:text-[#8a6d1b]'}`}>{a.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {a.status !== 'closed' && (
                            <GoldButton disabled={busy === `snap:${a.id}`} onClick={() => snapshot(a.id)} className="!min-h-[32px] !px-3 !py-1.5 !text-xs">
                              {busy === `snap:${a.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Camera className="h-3.5 w-3.5" /> Snapshot{a.status === 'open' ? ' again' : ' & open'}</>}
                            </GoldButton>
                          )}
                          {a.status === 'open' && (
                            <GhostButton disabled={busy === `close:${a.id}`} onClick={() => close(a.id)} className="!min-h-[32px] !px-3 !py-1.5 !text-xs"><Lock className="h-3.5 w-3.5" /> Close</GhostButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="mt-2.5 rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-[#6a665a] backdrop-blur-md [html.light_&]:border-black/[0.08] [html.light_&]:bg-white [html.light_&]:text-[#5b574a]">Claims land as spendable TBC till credit instantly; the treasury claim rails carry them on-chain at token launch. Re-snapshotting only adds new recipients — claimed users are never double-counted.</p>
      </div>
    </AdminLayout>
  );
}
