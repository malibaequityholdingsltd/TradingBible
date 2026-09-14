import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Check, CreditCard, RefreshCw, XCircle, RotateCcw, ArrowUpRight, ShieldCheck, Receipt, AlertTriangle, Wallet } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PLANS, translatePlan } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { openCheckout, getSubscription, cancelSubscription, resumeSubscription, switchPlan, getStripeConfig } from '@/lib/stripe';
import { useWallet } from '@/hooks/useWallet';

function fmtDate(iso) {
  if (!iso) return '—';
  if (typeof iso === 'number') iso = new Date(iso * 1000).toISOString();
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
const money = (n, c = 'USD') => (n || n === 0) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n) : '—';

const STATUS_STYLE = {
  active: 'bg-emerald-500/15 text-emerald-400',
  trialing: 'bg-[#d4af37]/15 text-[#d4af37]',
  past_due: 'bg-red-500/15 text-red-400',
  canceled: 'bg-white/10 text-[#8a8577]',
  paused: 'bg-orange-500/15 text-orange-400',
};

export default function BillingPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const PAID = PLANS.filter((p) => p.id !== 'trial').map((p) => translatePlan(t, p));
  const [sub, setSub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [stripeEnv, setStripeEnv] = useState(null);
  const { ledger, payWithWallet } = useWallet();
  const walletBalance = ledger?.balances?.USD || 0;

  const currentPlan = user?.plan || 'trial';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getStripeConfig();
      setConfigured(Boolean(cfg?.configured));
      setStripeEnv(cfg?.environment || null);
    } catch { setConfigured(false); setStripeEnv(null); }
    try { setSub(await getSubscription()); } catch { setSub(null); }
    try {
      const items = await pb.collection('billing_events').getList(1, 20, { sort: '-created' });
      setEvents(items.items);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckout = async (plan) => {
    setBusy(plan);
    try {
      await openCheckout(plan);
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  const handleSwitch = async (plan) => {
    setBusy(plan);
    try {
      await switchPlan(plan);
      await updateProfile({ plan });
      toast({ title: t('c.done'), description: t('bill.switchTo', { name: plan }) });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  const handleCancel = async () => {
    setBusy('cancel');
    try {
      await cancelSubscription(false);
      toast({ title: t('c.done'), description: t('bill.cancelSub') });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  const handleResume = async () => {
    setBusy('resume');
    try {
      await resumeSubscription();
      toast({ title: t('c.done'), description: t('bill.resumeSub') });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  const handleWalletPay = async (plan) => {
    setBusy(`wallet-${plan}`);
    try {
      await payWithWallet(plan);
      toast({ title: t('bill.payWallet'), description: `${plan}` });
      await load();
      await updateProfile({ plan });
    } catch (err) {
      toast({ variant: 'destructive', title: t('bill.payWallet'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  const status = sub?.status || (currentPlan === 'trial' ? 'trialing' : null);
  const hasSub = Boolean(sub?.id);
  const isAdmin = user?.role === 'admin';
  const cancelScheduled = sub?.cancel_at_period_end || user?.cancelScheduled;
  const periodEnd = (sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null) || user?.currentPeriodEnd;

  return (
    <AppLayout title={t('nav.billing')}>
      <PageHeader
        icon={Crown}
        kicker={t('nav.billing')}
        description={t('bill.manage')}
        actions={stripeEnv && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${stripeEnv === 'live' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${stripeEnv === 'live' ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} />
            {stripeEnv === 'live' ? t('bill.stripeLive') : t('bill.stripeTest')}
            {stripeEnv !== 'live' && <span className="hidden font-normal text-[#8a8577] sm:inline">· {t('bill.testMode')}</span>}
          </span>
        )}
      />

      {isAdmin && !configured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
          <div className="text-sm text-[#c9c4b4]">
            <p className="font-medium text-[#f0ecdd]">Stripe — STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*</p>
            <p className="mt-1">dashboard.stripe.com → Developers → API keys & Webhooks → Prices.</p>
          </div>
        </div>
      )}

      {/* Wallet balance */}
      <div className="mb-4 glass rounded-2xl p-4 flex items-center justify-between">
        <div className="text-sm text-[#8a8577]">{t('bill.walletBalance')} <span className="font-mono font-bold text-[#f0ecdd]">{money(walletBalance)}</span> <span className="text-xs">· <a href="/app/wallet" className="text-[#d4af37] hover:underline">{t('bill.fundWallet')}</a></span></div>
        <div className="text-xs text-[#6a665a]">{t('bill.payInstant')}</div>
      </div>

      {/* Current subscription */}
      <div className="mb-6 glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Crown className="h-4 w-4 text-[#d4af37]" /> {t('bill.currentPlan')}</div>
            <div className="mt-2 text-2xl font-bold gold-text">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</div>
            {currentPlan === 'trial' && <div className="mt-1 text-xs text-[#8a8577]">{t('bill.trialMsg')}</div>}
            {status === 'trialing' && <div className="mt-1 text-xs text-[#d4af37]">{t('bill.trialActive')}</div>}
            <div className="mt-2 flex items-center gap-2">
              {status && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || 'bg-white/10 text-[#8a8577]'}`}>{status.replace('_', ' ')}</span>}
              {cancelScheduled && <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs text-red-400">{t('bill.cancelsOn', { date: fmtDate(periodEnd) })}</span>}
            </div>
          </div>
          <div className="text-right text-sm text-[#8a8577]">
            <div className="flex items-center justify-end gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> {t('bill.securedBy')}</div>
            {periodEnd && <div className="mt-2">{cancelScheduled ? t('bill.accessUntil') : t('bill.renews')} <span className="text-[#f0ecdd]">{fmtDate(periodEnd)}</span></div>}
          </div>
        </div>

        {hasSub && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-white/5 pt-5">
            {cancelScheduled ? (
              <button disabled={busy} onClick={handleResume} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">{busy === 'resume' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Resume subscription</button>
            ) : (
              <button disabled={busy} onClick={handleCancel} className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">{busy === 'cancel' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel subscription</button>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#8a8577]">{t('bill.plans')}</h3>
      <div className="grid max-w-2xl gap-4">
        {PAID.map((p) => {
          const isCurrent = currentPlan === p.id;
          const canSwitch = hasSub && !isCurrent;
          return (
            <div key={p.id} className={`relative flex flex-col rounded-2xl p-6 sm:flex-row sm:items-center sm:gap-6 ${p.highlight ? 'glass gold-glow' : 'glass'}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0f]">MOST POPULAR</div>}
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-semibold text-[#f0ecdd]">{p.name}</h4>
                <p className="mt-1 text-xs text-[#8a8577]">{p.tagline}</p>
                <div className="mt-2 flex items-end gap-1"><span className="text-3xl font-bold gold-text">${p.price}</span><span className="mb-1 text-sm text-[#8a8577]">/{p.period}</span></div>
                <ul className="mt-3 space-y-1.5 text-sm text-[#b3ae9e]">{p.features.slice(0, 5).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#d4af37]" />{f}</li>)}</ul>
              </div>
              <div className="mt-4 shrink-0 sm:mt-0 sm:w-44 space-y-2">
                {isCurrent ? (
                  <div className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 py-2.5 text-sm font-semibold text-emerald-400"><Check className="h-4 w-4" /> {t('bill.currentPlanBadge')}</div>
                ) : canSwitch ? (
                  <button disabled={busy} onClick={() => handleSwitch(p.id)} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/25 py-2.5 text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-60">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} {t('bill.switchTo', { name: p.name })}</button>
                ) : (
                  <>
                    <button disabled={busy} onClick={() => handleCheckout(p.id)} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t('bill.subscribe')}</button>
                    <button disabled={busy || walletBalance < p.price} onClick={() => handleWalletPay(p.id)} className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/20 py-2 text-xs font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-40">{busy === `wallet-${p.id}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />} {t('bill.payWallet')}</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing history */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[#8a8577]"><Receipt className="h-4 w-4" /> {t('bill.history')}</h3>
      <div className="glass rounded-2xl">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[#8a8577]">{t('c.loading')}</div>
        ) : events.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#8a8577]">{t('bill.noActivity')}</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="no-scrollbar hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">{[t('bill.hDate'), t('bill.hEvent'), t('bill.hPlan'), t('bill.hAmount'), t('bill.hStatus')].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-[#c9c4b4]">{fmtDate(ev.occurredAt || ev.created)}</td>
                      <td className="px-4 py-3 text-[#f0ecdd]">{ev.eventType?.replace(/[._]/g, ' ')}</td>
                      <td className="px-4 py-3 text-[#c9c4b4]">{ev.planName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[#c9c4b4]">{ev.amount ? money(ev.amount, ev.currency) : '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[ev.status] || 'bg-white/10 text-[#8a8577]'}`}>{ev.status || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile invoice cards */}
            <div className="divide-y divide-white/5 sm:hidden">
              {events.map((ev) => (
                <div key={ev.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#f0ecdd]">{ev.eventType?.replace(/[._]/g, ' ')}</div>
                      <div className="mt-0.5 truncate text-xs text-[#8a8577]">{ev.planName || '—'} · {fmtDate(ev.occurredAt || ev.created)}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[ev.status] || 'bg-white/10 text-[#8a8577]'}`}>{ev.status || '—'}</span>
                  </div>
                  <div className="mt-2 font-mono text-lg font-semibold text-[#f0ecdd]">{ev.amount ? money(ev.amount, ev.currency) : '—'}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
