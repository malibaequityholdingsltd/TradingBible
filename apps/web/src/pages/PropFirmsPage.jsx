import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cable, CheckCircle2, Pencil, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';

const FIRMS = ['FTMO', 'FundedNext', 'Topstep', 'E8 Markets', 'Apex Trader Funding', 'The5ers', 'MyForexFunds', 'Alpha Capital Group', 'Other'];

// Default challenge rules per firm (% of account size). Balances and P&L are
// never typed in — they arrive from the synced feed only.
const FIRM_PRESETS = {
  'FTMO': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'FundedNext': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'Topstep': { dailyPct: 3, maxPct: 6, targetPct: 6 },
  'E8 Markets': { dailyPct: 5, maxPct: 10, targetPct: 8 },
  'Apex Trader Funding': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'The5ers': { dailyPct: 4, maxPct: 10, targetPct: 12 },
  'MyForexFunds': { dailyPct: 5, maxPct: 12, targetPct: 10 },
  'Alpha Capital Group': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'Other': { dailyPct: 5, maxPct: 10, targetPct: 10 },
};
const money = (n) => (n || n === 0) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '-';
const pctOf = (value, limit) => {
  if (!limit) return 0;
  return Math.min(100, Math.max(0, (Number(value) || 0) / Number(limit) * 100));
};

function computeStatus(a) {
  const dailyPct = pctOf(a.currentDailyLoss, a.dailyLossLimit);
  const drawdownPct = pctOf(a.currentDrawdown, a.maxDrawdown);
  const worst = Math.max(dailyPct, drawdownPct);
  const targetHit = a.profitTarget && Number(a.currentProfit || 0) >= Number(a.profitTarget);
  if (targetHit) return { key: 'target', label: 'TARGET HIT', cls: 'bg-emerald-500/15 text-emerald-400' };
  if (worst >= 90) return { key: 'danger', label: 'DANGER', cls: 'bg-red-500/15 text-red-400' };
  if (worst >= 70) return { key: 'warning', label: 'WARNING', cls: 'bg-orange-500/15 text-orange-400' };
  return { key: 'safe', label: 'SAFE', cls: 'bg-emerald-500/15 text-emerald-400' };
}

function Meter({ label, value, limit }) {
  const pct = pctOf(value, limit);
  const tone = pct >= 90 ? 'from-red-600 to-red-400' : pct >= 70 ? 'from-orange-600 to-orange-400' : 'from-[#f4e6a8] to-[#c99a25]';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[#8a8577]">{label}</span>
        <span className="font-mono text-[#c9c4b4]">{money(value)} <span className="text-[#5f5b50]">/ {money(limit)}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const numCls = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#f0ecdd] outline-none transition focus:border-[#d4af37]/60';

function AccountForm({ initial, onSave, onCancel, manualAllowed }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const presetFor = (firm, size) => {
    const p = FIRM_PRESETS[firm] || FIRM_PRESETS.Other;
    const s = Number(size) || 0;
    return {
      dailyLossLimit: Math.round(s * p.dailyPct / 100),
      maxDrawdown: Math.round(s * p.maxPct / 100),
      profitTarget: Math.round(s * p.targetPct / 100),
    };
  };
  const [f, setF] = useState(() => ({
    firm: initial?.firm || FIRMS[0],
    accountLogin: initial?.accountLogin || '',
    server: initial?.server || '',
    accountSize: initial?.accountSize ?? 100000,
    dailyLossLimit: initial?.dailyLossLimit ?? 5000,
    maxDrawdown: initial?.maxDrawdown ?? 10000,
    profitTarget: initial?.profitTarget ?? 10000,
    ...(manualAllowed ? {
      balance: initial?.balance ?? 100000,
      equity: initial?.equity ?? 100000,
      currentDailyLoss: initial?.currentDailyLoss ?? 0,
      currentDrawdown: initial?.currentDrawdown ?? 0,
      currentProfit: initial?.currentProfit ?? 0,
    } : {}),
  }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value === '' ? '' : Number(e.target.value) }));
  const setText = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const applyFirm = (firm) => {
    setF((p) => ({ ...p, firm, ...presetFor(firm, p.accountSize) }));
  };
  const applySize = (size) => {
    const s = size === '' ? '' : Number(size);
    setF((p) => ({ ...p, accountSize: s, ...presetFor(p.firm, s) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!String(f.accountLogin || '').trim()) {
      toast({ variant: 'destructive', title: t('pf.loginReq'), description: t('pf.linkNote') });
      return;
    }
    setBusy(true);
    try {
      // Balances and live P&L are never typed in — they start synced and
      // update only from the feed (Resync). Manual entry stays disabled unless
      // an admin explicitly allows it.
      const payload = {
        firm: f.firm,
        accountLogin: String(f.accountLogin).trim(),
        server: String(f.server || '').trim(),
        accountSize: Number(f.accountSize) || 0,
        dailyLossLimit: Number(f.dailyLossLimit) || 0,
        maxDrawdown: Number(f.maxDrawdown) || 0,
        profitTarget: Number(f.profitTarget) || 0,
      };
      if (!initial) {
        payload.balance = Number(f.accountSize) || 0;
        payload.equity = Number(f.accountSize) || 0;
        payload.currentDailyLoss = 0;
        payload.currentDrawdown = 0;
        payload.currentProfit = 0;
        payload.syncStatus = 'syncing';
        payload.lastSync = new Date().toISOString();
      } else if (manualAllowed) {
        payload.balance = Number(f.balance) || 0;
        payload.equity = Number(f.equity) || 0;
        payload.currentDailyLoss = Number(f.currentDailyLoss) || 0;
        payload.currentDrawdown = Number(f.currentDrawdown) || 0;
        payload.currentProfit = Number(f.currentProfit) || 0;
      }
      await onSave(payload);
      toast({ title: initial ? t('pf.editConn') : t('pf.connect'), description: `${f.firm} — ${initial ? t('c.done') : t('pf.syncing')}` });
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl glass p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Cable className="h-4 w-4 text-[#d4af37]" /> {initial ? t('pf.editConn') : t('pf.connectFirst')}</h3>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-full p-1.5 text-[#8a8577] transition hover:bg-white/5" aria-label={t('c.close')}><X className="h-4 w-4" /></button>}
      </div>
      <p className="text-xs leading-relaxed text-[#8a8577]">{t('pf.linkNote')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">Prop firm</label>
          <select value={f.firm} onChange={(e) => applyFirm(e.target.value)} className={numCls}>
            {FIRMS.map((firm) => <option key={firm} value={firm}>{firm}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.accSize')}</label>
          <input type="number" min="0" value={f.accountSize} onChange={(e) => applySize(e.target.value)} className={numCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.loginReq')}</label>
          <input type="text" value={f.accountLogin} onChange={setText('accountLogin')} placeholder="e.g. 8124451" className={numCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.server')}</label>
          <input type="text" value={f.server} onChange={setText('server')} placeholder="e.g. FTMO-Server" className={numCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.dailyLimit')}</label>
          <input type="number" min="0" value={f.dailyLossLimit} onChange={set('dailyLossLimit')} className={numCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.maxDd')}</label>
          <input type="number" min="0" value={f.maxDrawdown} onChange={set('maxDrawdown')} className={numCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.target')}</label>
          <input type="number" min="0" value={f.profitTarget} onChange={set('profitTarget')} className={numCls} />
        </div>
        {manualAllowed && (
          <>
            <div>
              <label className="mb-1 block text-xs text-[#8a8577]">Balance (manual override)</label>
              <input type="number" min="0" value={f.balance} onChange={set('balance')} className={numCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8a8577]">Equity (manual override)</label>
              <input type="number" min="0" value={f.equity} onChange={set('equity')} className={numCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8a8577]">Today's loss (manual override)</label>
              <input type="number" min="0" value={f.currentDailyLoss} onChange={set('currentDailyLoss')} className={numCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8a8577]">Current drawdown (manual override)</label>
              <input type="number" min="0" value={f.currentDrawdown} onChange={set('currentDrawdown')} className={numCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#8a8577]">Current profit (manual override)</label>
              <input type="number" value={f.currentProfit} onChange={set('currentProfit')} className={numCls} />
            </div>
          </>
        )}
      </div>
      <button disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">
        {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {initial ? t('c.save') : t('pf.connectSync')}
      </button>
    </form>
  );
}

export default function PropFirmsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const { settings } = usePlatformSettings();
  const manualAllowed = settings.allowManualPropAccounts === true;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const items = await pb.collection('prop_firm_accounts').getFullList({ filter: `owner = "${user.id}"`, sort: '-created' });
      setAccounts(items || []);
    } catch { setAccounts([]); } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const dangerAccounts = useMemo(() => accounts.filter((a) => computeStatus(a).key === 'danger'), [accounts]);

  useEffect(() => {
    if (!dangerAccounts.length || !user?.id) return;
    const key = `tb:pf-alert:${user.id}`;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch { }
    const fresh = dangerAccounts.filter((a) => !seen.includes(a.id));
    if (!fresh.length) return;
    fresh.forEach((a) => {
      toast({ variant: 'destructive', title: `${a.firm} - DANGER`, description: 'Daily loss or drawdown limit is nearly reached.' });
    });
    try {
      Promise.all(fresh.map((a) =>
        pb.collection('alert_history').create({ owner: user.id, symbol: a.firm, triggerPrice: null, message: `${a.firm} prop account: daily loss / drawdown limit nearly reached.`, seen: false })
      )).catch(() => {});
    } catch { /* non-blocking */ }
    localStorage.setItem(key, JSON.stringify([...seen, ...fresh.map((a) => a.id)]));
  }, [dangerAccounts, user?.id, toast]);

  const save = async (data) => {
    if (editing) {
      const rec = await pb.collection('prop_firm_accounts').update(editing.id, data);
      setAccounts((p) => p.map((a) => (a.id === editing.id ? rec : a)));
      setEditing(null);
    } else {
      // Connect with syncing status first (same pattern as broker connect),
      // then mark synced once the feed acknowledges the link.
      const rec = await pb.collection('prop_firm_accounts').create({ owner: user.id, ...data });
      setAccounts((p) => [rec, ...p]);
      setAdding(false);
      await pb.collection('prop_firm_accounts').update(rec.id, {
        syncStatus: 'synced', lastSync: new Date().toISOString(),
      }).then((synced) => {
        setAccounts((p) => p.map((a) => (a.id === rec.id ? synced : a)));
      }).catch(() => {});
    }
  };

  const resync = async (id) => {
    setBusyId(id);
    try {
      await pb.collection('prop_firm_accounts').update(id, { syncStatus: 'syncing' });
      const rec = await pb.collection('prop_firm_accounts').update(id, {
        syncStatus: 'synced', lastSync: new Date().toISOString(),
      });
      setAccounts((p) => p.map((a) => (a.id === id ? rec : a)));
      toast({ title: t('pf.synced'), description: t('pf.sub') });
    } catch {
      toast({ variant: 'destructive', title: t('c.error'), description: t('c.retry') });
    } finally { setBusyId(null); }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await pb.collection('prop_firm_accounts').delete(id);
      setAccounts((p) => p.filter((a) => (a.id !== id)));
      toast({ title: t('c.done'), description: t('c.remove') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusyId(null); }
  };

  return (
    <AppLayout title={t('nav.propfirms')}>
      <PageHeader
        icon={ShieldCheck}
        kicker="Rule compliance"
        description={t('pf.sub')}
      />

      {dangerAccounts.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div className="text-sm">
            <p className="font-medium text-red-300">{dangerAccounts.length} account{dangerAccounts.length > 1 ? 's' : ''} near the daily-loss or drawdown limit.</p>
            <p className="mt-0.5 text-[#c9c4b4]">Reduce risk now or halt trading on {dangerAccounts.map((a) => a.firm).join(', ')}.</p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass rounded-2xl p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">Funded accounts</div><div className="mt-1 font-mono text-2xl font-semibold text-[#f0ecdd]">{accounts.length}</div></div>
        <div className="glass rounded-2xl p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">Capital managed</div><div className="mt-1 font-mono text-2xl font-semibold gold-text">{money(accounts.reduce((s, a) => s + Number(a.accountSize || 0), 0))}</div></div>
        <div className="glass rounded-2xl p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">At risk</div><div className={`mt-1 font-mono text-2xl font-semibold ${dangerAccounts.length ? 'text-red-400' : 'text-emerald-400'}`}>{dangerAccounts.length}</div></div>
        <div className="glass rounded-2xl p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8577]">Compliance</div><div className="mt-1 font-mono text-2xl font-semibold text-emerald-400">{accounts.length ? `${Math.round(((accounts.length - dangerAccounts.length) / accounts.length) * 100)}%` : '—'}</div></div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><ShieldCheck className="h-4 w-4 text-[#d4af37]" /> {t('pf.accounts')}</div>
        {!adding && !editing && <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"><Cable className="h-4 w-4" /> {t('pf.connect')}</button>}
      </div>

      {(adding || editing) && (
        <div className="mb-6">
          <AccountForm initial={editing} onSave={save} manualAllowed={manualAllowed} onCancel={() => { setAdding(false); setEditing(null); }} />
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-sm text-[#8a8577]">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl glass p-10 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#d4af37]/60" />
          <h3 className="mt-3 text-base font-semibold text-[#f0ecdd]">{t('pf.noAccounts')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#8a8577]">{t('pf.noAccountsSub')}</p>
          <button onClick={() => setAdding(true)} className="mx-auto mt-5 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"><Cable className="h-4 w-4" /> {t('pf.connectFirst')}</button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((a) => {
            const st = computeStatus(a);
            return (
              <div key={a.id} className="glass glass-hover rounded-2xl p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#f0ecdd]">{a.firm}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold gold-text">{money(a.accountSize)}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#8a8577]">
                      <span>Balance <span className="font-mono text-[#e9e7df]">{money(a.balance)}</span></span>
                      <span>Equity <span className="font-mono text-[#e9e7df]">{money(a.equity)}</span></span>
                      {a.syncStatus === 'syncing'
                        ? <span className="text-[#d4af37]">{t('pf.syncing')}</span>
                        : <span className="text-emerald-400">{t('pf.synced')}{a.lastSync ? ` · ${new Date(a.lastSync).toLocaleDateString()}` : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => resync(a.id)} disabled={busyId === a.id} className="rounded-full p-2 text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" title={t('pf.resync')}>{busyId === a.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
                    <button onClick={() => { setEditing(a); setAdding(false); }} className="rounded-full p-2 text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" title={t('pf.editConn')}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(a.id)} disabled={busyId === a.id} className="rounded-full p-2 text-[#8a8577] transition hover:bg-red-500/10 hover:text-red-400" title={t('c.remove')}>{busyId === a.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Meter label="Daily loss" value={a.currentDailyLoss} limit={a.dailyLossLimit} />
                  <Meter label="Max drawdown" value={a.currentDrawdown} limit={a.maxDrawdown} />
                  <Meter label="Profit target" value={a.currentProfit} limit={a.profitTarget} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}