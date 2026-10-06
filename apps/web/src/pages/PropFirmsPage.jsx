import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cable, CheckCircle2, Pencil, RefreshCw, ShieldCheck, Trash2, X, Search, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { PageHero, Card, Stat, StatGrid, EmptyState, GoldButton } from '@/components/ui-kit';
import { PROP_FIRM_REGISTRY } from '@/lib/mockData';

const FIRMS = [...PROP_FIRM_REGISTRY.map((f) => f.name), 'Other'];

// Default challenge rules per firm (% of account size). Balances and P&L are
// never typed in — they arrive from the synced feed only (MT5 bridge).
const FIRM_PRESETS = {
  'FTMO': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'FundedNext': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'Topstep': { dailyPct: 3, maxPct: 6, targetPct: 6 },
  'E8 Markets': { dailyPct: 5, maxPct: 10, targetPct: 8 },
  'Apex Trader Funding': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'The5ers': { dailyPct: 4, maxPct: 10, targetPct: 12 },
  'Funding Pips': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'FunderPro': { dailyPct: 4, maxPct: 10, targetPct: 10 },
  'Alpha Capital Group': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'MyFundedFX (see successor)': { dailyPct: 5, maxPct: 10, targetPct: 10 },
  'MyForexFunds': { dailyPct: 5, maxPct: 12, targetPct: 10 },
  'Other': { dailyPct: 5, maxPct: 10, targetPct: 10 },
};
const money = (n) => (n || n === 0) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) : '-';
const pctOf = (value, limit) => {
  if (!limit) return 0;
  return Math.min(100, Math.max(0, (Number(value) || 0) / Number(limit) * 100));
};

function computeStatus(a) {
  if ((a.syncStatus || 'pending') !== 'synced') return { key: 'pending', label: 'PENDING', cls: 'bg-[#d4af37]/15 text-[#d4af37]' };
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
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-[#8a8577]">{label}</span>
        <span className="shrink-0 font-mono text-[#c9c4b4]">{money(value)} <span className="text-[#5f5b50]">/ {money(limit)}</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const numCls = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#f0ecdd] outline-none transition focus:border-[#d4af37]/60';

function firmMeta(name) {
  return PROP_FIRM_REGISTRY.find((f) => f.name === name) || null;
}

function AccountForm({ initial, onSave, onCancel, manualAllowed, presetFirm }) {
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
    firm: initial?.firm || presetFirm || FIRMS[0],
    accountLogin: initial?.accountLogin || '',
    server: initial?.server || '',
    accountSize: initial?.accountSize ?? 100000,
    dailyLossLimit: initial?.dailyLossLimit ?? 5000,
    maxDrawdown: initial?.maxDrawdown ?? 10000,
    profitTarget: initial?.profitTarget ?? 10000,
    ...(manualAllowed ? {
      balance: initial?.balance ?? 0,
      equity: initial?.equity ?? 0,
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

  const [showCustom, setShowCustom] = useState(false);
  const meta = firmMeta(f.firm);

  const submit = async (e) => {
    e.preventDefault();
    if (!String(f.accountLogin || '').trim()) {
      toast({ variant: 'destructive', title: t('pf.loginReq'), description: 'Add the MT5 login so the bridge can map fills — never the master password.' });
      return;
    }
    setBusy(true);
    try {
      // Balances and live P&L are never typed in — they start at 0 / pending
      // and update only from the MT5 bridge feed (Resync). Manual entry stays
      // disabled unless an admin explicitly allows it.
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
        payload.balance = 0;
        payload.equity = 0;
        payload.currentDailyLoss = 0;
        payload.currentDrawdown = 0;
        payload.currentProfit = 0;
        payload.syncStatus = 'pending';
        payload.lastSync = new Date().toISOString();
      } else if (manualAllowed) {
        payload.balance = Number(f.balance) || 0;
        payload.equity = Number(f.equity) || 0;
        payload.currentDailyLoss = Number(f.currentDailyLoss) || 0;
        payload.currentDrawdown = Number(f.currentDrawdown) || 0;
        payload.currentProfit = Number(f.currentProfit) || 0;
      }
      await onSave(payload);
      toast({ title: initial ? t('pf.editConn') : t('pf.connect'), description: `${f.firm} saved — sync coming soon` });
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="tb-card space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Cable className="h-4 w-4 shrink-0 text-[#d4af37]" /> <span className="truncate">{initial ? t('pf.editConn') : `Connect ${f.firm}`}</span></h3>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-full p-1.5 text-[#8a8577] transition hover:bg-white/5" aria-label={t('c.close')}><X className="h-4 w-4" /></button>}
      </div>
      {meta && (
        <div className="text-xs text-[#8a8577]">
          Connection: <span className="text-[#c9c4b4]">MetaTrader 5 bridge</span> <span className="text-[#5f5b50]">({meta.integration || 'MT4_MT5'} via {meta.via})</span>
        </div>
      )}
      <p className="text-xs leading-relaxed text-[#8a8577]">Enter the MT5 login for this challenge — rule limits are set from {f.firm} rules automatically. Balances sync automatically once prop sync goes live — never typed in.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.firm')}</label>
          <select value={f.firm} onChange={(e) => applyFirm(e.target.value)} className={numCls}>
            {FIRMS.map((firm) => <option key={firm} value={firm}>{firm}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.accSize')}</label>
          <input type="number" min="0" value={f.accountSize} onChange={(e) => applySize(e.target.value)} className={numCls} />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.loginReq')}</label>
          <input type="text" value={f.accountLogin} onChange={setText('accountLogin')} placeholder="e.g. 8124451 (login only, no password)" className={numCls} />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.server')}</label>
          <input type="text" value={f.server} onChange={setText('server')} placeholder="e.g. FTMO-Server" className={numCls} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#c9c4b4]">Daily loss <span className="font-mono text-[#f0ecdd]">{money(f.dailyLossLimit)}</span></span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#c9c4b4]">Max drawdown <span className="font-mono text-[#f0ecdd]">{money(f.maxDrawdown)}</span></span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-[#c9c4b4]">Target <span className="font-mono text-[#f0ecdd]">{money(f.profitTarget)}</span></span>
        <button type="button" onClick={() => setShowCustom((s) => !s)} className="text-[11px] text-[#d4af37] hover:underline">{showCustom ? 'Hide custom limits' : 'Customize limits'}</button>
      </div>
      {showCustom && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.dailyLimit')}</label>
            <input type="number" min="0" value={f.dailyLossLimit} onChange={set('dailyLossLimit')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.maxDd')}</label>
            <input type="number" min="0" value={f.maxDrawdown} onChange={set('maxDrawdown')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.target')}</label>
            <input type="number" min="0" value={f.profitTarget} onChange={set('profitTarget')} className={numCls} />
          </div>
        </div>
      )}
      {manualAllowed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.balanceManual')}</label>
            <input type="number" min="0" value={f.balance} onChange={set('balance')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.equityManual')}</label>
            <input type="number" min="0" value={f.equity} onChange={set('equity')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.lossManual')}</label>
            <input type="number" min="0" value={f.currentDailyLoss} onChange={set('currentDailyLoss')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.ddManual')}</label>
            <input type="number" min="0" value={f.currentDrawdown} onChange={set('currentDrawdown')} className={numCls} />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-[#8a8577]">{t('pf.profitManual')}</label>
            <input type="number" value={f.currentProfit} onChange={set('currentProfit')} className={numCls} />
          </div>
        </div>
      )}
      <GoldButton disabled={busy}>
        {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {initial ? t('c.save') : 'Connect'}
      </GoldButton>
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
  const [presetFirm, setPresetFirm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');

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
      // Honest pending: balances stay 0 until the MT5 bridge feed confirms.
      const rec = await pb.collection('prop_firm_accounts').create({ owner: user.id, ...data });
      setAccounts((p) => [rec, ...p]);
      setAdding(false);
      setPresetFirm(null);
    }
  };

  const resync = async (id) => {
    setBusyId(id);
    try {
      await pb.collection('prop_firm_accounts').update(id, { syncStatus: 'syncing', lastSync: new Date().toISOString() });
      // No bridge credentials yet → stay pending honestly, never fake 'synced'.
      const rec = await pb.collection('prop_firm_accounts').update(id, {
        syncStatus: 'pending', lastSync: new Date().toISOString(),
      });
      setAccounts((p) => p.map((a) => (a.id === id ? rec : a)));
      toast({ title: 'Saved', description: 'Auto-sync will pick this account up once prop sync goes live.' });
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

  const visibleAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => `${a.firm} ${a.accountLogin} ${a.server}`.toLowerCase().includes(q));
  }, [accounts, query]);

const visibleFirms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROP_FIRM_REGISTRY;
    return PROP_FIRM_REGISTRY.filter((f) => `${f.name} ${f.kind} ${f.notes || ''}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <AppLayout title={t('nav.propfirms')}>
      <div className="tb-page">
        <PageHero
          kickerIcon={ShieldCheck}
          kicker="MT5 bridge • no password collection"
          title={t('nav.propfirms')}
          subtitle="Track every challenge in one place — limits, drawdown and targets update automatically once prop sync goes live."
        />

        {dangerAccounts.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.08] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-red-300">{dangerAccounts.length} account{dangerAccounts.length > 1 ? 's' : ''} near the daily-loss or drawdown limit.</p>
              <p className="mt-0.5 text-[#c9c4b4]">Reduce risk now or halt trading on {dangerAccounts.map((a) => a.firm).join(', ')}.</p>
            </div>
          </div>
        )}

        <StatGrid cols={4}>
          <Stat label={t('pf.funded')} value={accounts.length} />
          <Stat label={t('pf.capital')} value={money(accounts.reduce((s, a) => s + Number(a.accountSize || 0), 0))} />
          <Stat label={t('pf.atRisk')} value={dangerAccounts.length} tone={dangerAccounts.length ? 'text-red-400' : 'text-emerald-400'} />
          <Stat label={t('pf.compliance')} value={accounts.length ? `${Math.round(((accounts.length - dangerAccounts.length) / accounts.length) * 100)}%` : '—'} tone="text-emerald-400" />
        </StatGrid>

        <div className="tb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8577]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prop firm — FTMO, Topstep, The5ers…" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
          </div>
          {!adding && !editing && <GoldButton onClick={() => { setPresetFirm(null); setAdding(true); }} className="!min-h-[42px]"><Cable className="h-4 w-4" /> {t('pf.connect')}</GoldButton>}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Trophy className="h-4 w-4" /></span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">Prop directory</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{visibleFirms.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleFirms.map((f) => {
              const acct = accounts.find((c) => String(c.firm || '').toLowerCase() === String(f.name).toLowerCase());
              const on = acct?.syncStatus === 'synced';
              const pending = acct && acct?.syncStatus !== 'synced';
              return (
                <div key={f.id} className="tb-card tb-card-hover flex flex-col p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {f.logo ? (
                        <img src={f.logo} alt={f.name} className="h-11 w-11 rounded-xl object-contain" />
                      ) : (
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: `${f.color}22`, color: f.color }}>{f.tag}</div>
                      )}
                      {acct && (
                        <span title={on ? 'Connected' : 'Pending'} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0f0f14] ${on ? 'bg-emerald-400' : 'bg-[#d4af37] animate-pulse'}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-[#f0ecdd]">{f.name}</div>
                      <div className="truncate text-xs text-[#8a8577]">{f.kind} • {f.authType}</div>
                    </div>
                    {acct && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
                        {on ? 'Connected' : (acct.syncStatus || 'Pending')}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-[#8a8577]">{f.notes || f.blurb || 'Live sync available.'}</p>
                  {acct ? (
                    <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate font-mono text-lg font-semibold text-[#f0ecdd]">{money(acct.balance || 0)}</div>
                        <div className="shrink-0 text-[11px] text-[#8a8577]">Last sync: {acct.lastSync ? new Date(acct.lastSync).toLocaleString() : '—'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button disabled={busyId === `resync:${acct.id}`} onClick={() => resync(acct.id)} className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-[#d4af37]/30 px-2 py-2 text-xs text-[#e9e7df] transition hover:bg-[#d4af37]/[0.06] disabled:opacity-60">
                          <RefreshCw className="h-3.5 w-3.5" /> Resync
                        </button>
                        <button disabled={busyId === `disconnect:${acct.id}`} onClick={() => remove(acct.id)} className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-red-500/35 px-2 py-2 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">
                          Disconnect
                        </button>
                      </div>
                      {pending && <div className="text-[11px] text-[#d4af37]">Pending — coming soon.</div>}
                    </div>
                  ) : (
                    <GoldButton onClick={() => { setPresetFirm(f.name); setAdding(true); setEditing(null); }} className="mt-3 w-full !rounded-lg !py-2.5 !text-sm !font-medium">
                      <Cable className="h-4 w-4" /> Connect
                    </GoldButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(adding || editing) && (
          <div>
            <AccountForm initial={editing} presetFirm={presetFirm} onSave={save} manualAllowed={manualAllowed} onCancel={() => { setAdding(false); setEditing(null); setPresetFirm(null); }} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><ShieldCheck className="h-4 w-4 text-[#d4af37]" /> {t('pf.accounts')} ({visibleAccounts.length})</div>
        </div>

        {loading ? (
          <div className="tb-card grid place-items-center py-16 text-sm text-[#8a8577]">{t('pf.loadingAcc')}</div>
        ) : visibleAccounts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t('pf.noAccounts')}
            sub="Connect via MT5 bridge above — balances appear only after the first live sync. Nothing is typed in."
            action={<GoldButton onClick={() => setAdding(true)}><Cable className="h-4 w-4" /> {t('pf.connectFirst')}</GoldButton>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleAccounts.map((a) => {
              const st = computeStatus(a);
              const meta = firmMeta(a.firm);
              return (
                <Card hover key={a.id} className="p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="relative shrink-0">
                        {meta?.logo ? (
                          <img src={meta.logo} alt={a.firm} className="h-11 w-11 rounded-xl object-contain" />
                        ) : (
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: `${meta?.color || '#d4af37'}22`, color: meta?.color || '#d4af37' }}>{(a.firm || '?').slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-[#f0ecdd]">{a.firm}</h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${st.cls}`}>{st.label}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#8a8577]">Login <span className="font-mono text-[#e9e7df]">{a.accountLogin || '—'}</span> • {a.server || 'no server'}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button onClick={() => resync(a.id)} disabled={busyId === a.id} className="rounded-full p-2 text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" title={t('pf.resync')}>{busyId === a.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
                      <button onClick={() => { setEditing(a); setAdding(false); }} className="rounded-full p-2 text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" title={t('pf.editConn')}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(a.id)} disabled={busyId === a.id} className="rounded-full p-2 text-[#8a8577] transition hover:bg-red-500/10 hover:text-red-400" title={t('c.remove')}>{busyId === a.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div className="truncate text-2xl font-bold gold-text">{money(a.accountSize)}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a8577]">
                      <span>{t('pf.balance')} <span className="font-mono text-[#e9e7df]">{a.syncStatus === 'synced' ? money(a.balance) : '— pending feed'}</span></span>
                      <span>{t('pf.equity')} <span className="font-mono text-[#e9e7df]">{a.syncStatus === 'synced' ? money(a.equity) : '— pending feed'}</span></span>
                      {a.syncStatus === 'syncing'
                        ? <span className="text-[#d4af37]">{t('pf.syncing')}</span>
                        : a.syncStatus === 'synced'
                          ? <span className="text-emerald-400">{t('pf.synced')}{a.lastSync ? ` · ${new Date(a.lastSync).toLocaleDateString()}` : ''}</span>
                            : <span className="text-[#d4af37]">Pending</span>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Meter label="Daily loss" value={a.currentDailyLoss} limit={a.dailyLossLimit} />
                    <Meter label="Max drawdown" value={a.currentDrawdown} limit={a.maxDrawdown} />
                    <Meter label="Profit target" value={a.currentProfit} limit={a.profitTarget} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
