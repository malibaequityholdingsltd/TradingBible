import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Camera, Coins, Gift, Loader2, Lock, Plus, RefreshCw,
  Sparkles, TriangleAlert, Users,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPageBar, AtMetric, AtPanel, AtProgress,
  AtSectionHeading,
} from '@/components/AtelierUI';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const EMPTY = {
  title: '', amountPerUser: '100', maxRecipients: '500', challengePassed: false,
  academy: false, minReferrals: '', minTrades: '', registeredBefore: '',
};

const nf = (value) => Number(value || 0).toLocaleString();

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

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
    } catch { /* keep the last good list */ }
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

  const stats = useMemo(() => {
    const open = list.filter((a) => a.status === 'open').length;
    const recipients = list.reduce((sum, a) => sum + Number(a.recipients || 0), 0);
    const claimed = list.reduce((sum, a) => sum + Number(a.claimed || 0), 0);
    return { open, recipients, claimed, campaigns: list.length };
  }, [list]);

  return (
    <AdminLayout title="Airdrops">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          meta={[
            `${stats.campaigns} campaigns`,
            `${stats.open} open`,
            `${nf(stats.recipients)} recipients`,
            `${nf(stats.claimed)} credits claimed`,
          ]}
          actions={(
            <>
              <AtButton onClick={load} variant="quiet" icon={RefreshCw}>Refresh</AtButton>
              <AtButton to="/admin/tbc" variant="outline" icon={Coins}>TBC</AtButton>
            </>
          )}
        />

        <div className="mt-3">
          <AtAlert icon={TriangleAlert} tone="amber">
            Airdrops issue <b className="text-[var(--at-ink)]">platform credits</b> for eligible services. They do not mint, promise or deliver the proposed TBC token. On-chain claim rails are not active.
          </AtAlert>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AtMetric icon={Gift} label="Campaigns" value={stats.campaigns} note="Draft + open + closed" />
          <AtMetric icon={Sparkles} label="Open campaigns" value={stats.open} note={stats.open ? 'Accepting claims' : 'No campaign open'} tone={stats.open ? 'text-[var(--at-green)]' : ''} />
          <AtMetric icon={Users} label="Eligible recipients" value={nf(stats.recipients)} note="Across every campaign" />
          <AtMetric icon={Coins} label="Credits claimed" value={nf(stats.claimed)} note="Off-chain credit entries" tone="text-[var(--at-gold)]" />
        </div>

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0">
            <AtSectionHeading
              index="01"
              title="Campaign book"
              sub="Eligibility, snapshot state and claim progress in one view."
              action={<AtBadge tone="gold">{list.length} total</AtBadge>}
            />

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => <div key={n} className="at-card h-36 animate-pulse bg-[var(--at-soft)]" />)}
              </div>
            ) : list.length === 0 ? (
              <div className="at-card"><AtEmpty icon={Gift} title="No campaigns yet" sub="Draft the first campaign in the composer. It stays a draft until you snapshot eligibility." /></div>
            ) : (
              <div className="space-y-2">
                {list.map((a) => <CampaignCard key={a.id} campaign={a} busy={busy} onSnapshot={snapshot} onClose={close} />)}
              </div>
            )}
          </div>

          <aside className="xl:sticky xl:top-[92px]">
            <AtPanel
              eyebrow="Composer"
              title="Draft a campaign"
              sub="Eligibility is evaluated server-side at snapshot time."
              action={<AtBadge tone="amber">Draft first</AtBadge>}
            >
              <form onSubmit={create} className="space-y-3">
                <label className="block">
                  <span className="at-label">Campaign title</span>
                  <input className="at-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Genesis traders" />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="at-label">TBC per user</span>
                    <input className="at-input font-mono" type="number" min="1" value={form.amountPerUser} onChange={(e) => setForm({ ...form, amountPerUser: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="at-label">Max recipients</span>
                    <input className="at-input font-mono" type="number" min="1" value={form.maxRecipients} onChange={(e) => setForm({ ...form, maxRecipients: e.target.value })} />
                  </label>
                </div>

                <div>
                  <span className="at-label">Eligibility</span>
                  <div className="space-y-1.5">
                    <label className="at-check"><input type="checkbox" checked={form.challengePassed} onChange={(e) => setForm({ ...form, challengePassed: e.target.checked })} /> Passed a challenge</label>
                    <label className="at-check"><input type="checkbox" checked={form.academy} onChange={(e) => setForm({ ...form, academy: e.target.checked })} /> Owns Academy</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="at-label">Min referrals</span>
                    <input className="at-input font-mono" type="number" min="0" value={form.minReferrals} onChange={(e) => setForm({ ...form, minReferrals: e.target.value })} placeholder="0 = any" />
                  </label>
                  <label className="block">
                    <span className="at-label">Min trades</span>
                    <input className="at-input font-mono" type="number" min="0" value={form.minTrades} onChange={(e) => setForm({ ...form, minTrades: e.target.value })} placeholder="0 = any" />
                  </label>
                </div>

                <label className="block">
                  <span className="at-label">Registered before</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
                    <input className="at-input !pl-9" type="date" value={form.registeredBefore} onChange={(e) => setForm({ ...form, registeredBefore: e.target.value })} />
                  </div>
                </label>

                <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut)]">Maximum budget</span>
                    <span className="font-mono text-[11px] font-bold text-[var(--at-gold)]">
                      {nf(Number(form.amountPerUser) * (Number(form.maxRecipients) || 0))} TBC
                    </span>
                  </div>
                  <AtProgress className="mt-2" value={0} />
                  <p className="mt-2 text-[9px] leading-relaxed text-[var(--at-mut-2)]">Illustrative ceiling only. Credits are created on claim, within the platform ledger.</p>
                </div>

                <AtButton type="submit" disabled={busy === 'create'} variant="gold" icon={busy === 'create' ? Loader2 : Plus} className="w-full">
                  {busy === 'create' ? 'Creating draft…' : 'Create draft'}
                </AtButton>
              </form>
            </AtPanel>
          </aside>
        </div>

        <div className="mt-5">
          <AtAlert icon={Coins}>
            Claims land as spendable TBC credit instantly. The proposed token is not issued, and treasury claim rails are not active. Re-snapshotting only adds new recipients — claimed users are never double-counted.
          </AtAlert>
        </div>
      </div>
    </AdminLayout>
  );
}

function CampaignCard({ campaign: a, busy, onSnapshot, onClose }) {
  const recipients = Number(a.recipients || 0);
  const claimed = Number(a.claimed || 0);
  const pct = recipients ? Math.min(100, Math.round((claimed / recipients) * 100)) : 0;
  const statusTone = a.status === 'open' ? 'green' : a.status === 'closed' ? 'muted' : 'amber';
  const criteria = a.criteria || {};
  const tags = [
    criteria.challengePassed && 'Challenge passed',
    criteria.academy && 'Academy',
    Number(criteria.minReferrals) > 0 && `${criteria.minReferrals}+ referrals`,
    Number(criteria.minTrades) > 0 && `${criteria.minTrades}+ trades`,
    criteria.registeredBefore && `Before ${String(criteria.registeredBefore).slice(0, 10)}`,
  ].filter(Boolean);

  return (
    <article className="at-card at-card--hover overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AtBadge tone={statusTone}>{a.status || 'draft'}</AtBadge>
              <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{a.id}</span>
            </div>
            <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.025em] text-[var(--at-ink)]">{a.title}</h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-[15px] font-bold text-[var(--at-gold)]">{nf(a.amountPerUser)} <span className="text-[9px] font-medium text-[var(--at-mut)]">TBC / user</span></div>
            <div className="mt-0.5 text-[9px] text-[var(--at-mut-2)]">Campaign allocation</div>
          </div>
        </div>

        {tags.length > 0 && <div className="at-tag-row mt-3">{tags.map((tag) => <AtBadge key={tag} plain>{tag}</AtBadge>)}</div>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Recipients</div>
            <div className="mt-1 font-mono text-[13px] font-semibold text-[var(--at-ink)]">{nf(recipients)}</div>
          </div>
          <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Claimed</div>
            <div className="mt-1 font-mono text-[13px] font-semibold text-[var(--at-ink)]">{nf(claimed)}</div>
          </div>
          <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Ceiling</div>
            <div className="mt-1 font-mono text-[13px] font-semibold text-[var(--at-ink)]">{nf(Number(a.amountPerUser) * Number(a.maxRecipients || 0))}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[9px] text-[var(--at-mut)]">
            <span>Claim progress</span>
            <span className="font-mono text-[var(--at-ink-2)]">{pct}%</span>
          </div>
          <AtProgress value={pct} tone={pct >= 100 ? 'green' : 'gold'} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--at-line-soft)] pt-3">
          {a.status !== 'closed' && (
            <AtButton onClick={() => onSnapshot(a.id)} disabled={busy === `snap:${a.id}`} variant="gold" size="sm" icon={busy === `snap:${a.id}` ? Loader2 : Camera}>
              {a.status === 'open' ? 'Snapshot again' : 'Snapshot & open'}
            </AtButton>
          )}
          {a.status === 'open' && (
            <AtButton onClick={() => onClose(a.id)} disabled={busy === `close:${a.id}`} variant="quiet" size="sm" icon={Lock}>Close campaign</AtButton>
          )}
          {a.status === 'closed' && <span className="text-[9px] text-[var(--at-mut-2)]">Campaign closed. No further claims.</span>}
        </div>
      </div>
    </article>
  );
}
