import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Check, CreditCard, RefreshCw, XCircle, RotateCcw, ArrowUpRight, ShieldCheck, Receipt, AlertTriangle, Wallet } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, EmptyState, GhostButton, GoldButton, Note, PageHero, SectionHead } from '@/components/ui-kit';
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
  past_due: 'bg-red-500/15 text-red-400',
  canceled: 'bg-white/10 text-[#8a8577]',
  paused: 'bg-orange-500/15 text-orange-400',
};

export default function BillingPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const PAID = PLANS.map((p) => translatePlan(t, p));
  const [sub, setSub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [stripeEnv, setStripeEnv] = useState(null);
  const { ledger, payWithWallet } = useWallet();
  const walletBalance = ledger?.balances?.USD || 0;

  const currentPlan = user?.plan || null;

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

  const status = sub?.status || null;
  const hasSub = Boolean(sub?.id);
  const isAdmin = user?.role === 'admin';
  const cancelScheduled = sub?.cancel_at_period_end || user?.cancelScheduled;
  const periodEnd = (sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null) || user?.currentPeriodEnd;

  return (
    <AppLayout title={t('nav.billing')}>
      <div className="tb-page">
      <section className="tb-hero overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#d4af37]/15 blur-[100px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]">
              <Crown className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-[#f0ecdd] sm:text-2xl">{t('nav.billing')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#8a8577] sm:text-sm">{t('bill.manage')}</p>
            </div>
          </div>
          {stripeEnv && (
            <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${stripeEnv === 'live' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${stripeEnv === 'live' ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} />
              {stripeEnv === 'live' ? t('bill.stripeLive') : t('bill.stripeTest')}
              {stripeEnv !== 'live' && <span className="hidden font-normal text-[#8a8577] sm:inline">· {t('bill.testMode')}</span>}
            </span>
          )}
        </div>
      </section>

      {isAdmin && !configured && (
        <Note icon={AlertTriangle}>
          <p className="font-medium text-[#f0ecdd]">Stripe — STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*</p>
          <p className="mt-1">dashboard.stripe.com → Developers → API keys & Webhooks → Prices.</p>
        </Note>
      )}

      {/* Wallet balance */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/20 bg-gradient-to-r from-[#d4af37]/[0.08] to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Wallet className="h-5 w-5" /></span>
          <div>
            <div className="text-xs uppercase tracking-wider text-[#8a8577]">{t('bill.walletBalance')}</div>
            <div className="font-mono text-xl font-bold text-[#f0ecdd]">{money(walletBalance)} <a href="/app/wallet" className="font-sans text-xs font-medium text-[#d4af37] hover:underline">{t('bill.fundWallet')}</a></div>
          </div>
        </div>
        <div className="text-xs text-[#6a665a]">{t('bill.payInstant')}</div>
      </div>

      {/* Current subscription */}
      <Card className="!border-[#d4af37]/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f4e6a8]/25 to-[#c99a25]/10 text-[#d4af37] ring-1 ring-[#d4af37]/30"><Crown className="h-5 w-5" /></span>
            <div>
              <div className="text-xs uppercase tracking-wider text-[#8a8577]">{t('bill.currentPlan')}</div>
              <div className="mt-0.5 text-2xl font-extrabold tb-gold-text">{currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : t('bill.noPlan', null, 'No plan')}</div>
              {!currentPlan && <div className="mt-1 text-xs text-[#8a8577]">{t('bill.noPlanYet', null, 'Subscribe to unlock the full terminal.')}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[status] || 'bg-white/10 text-[#8a8577]'}`}>{status.replace('_', ' ')}</span>}
                {cancelScheduled && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-400">{t('bill.cancelsOn', { date: fmtDate(periodEnd) })}</span>}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-[#8a8577]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> {t('bill.securedBy')}</div>
            {periodEnd && <div className="mt-2 text-xs">{cancelScheduled ? t('bill.accessUntil') : t('bill.renews')} <span className="font-mono text-[#f0ecdd]">{fmtDate(periodEnd)}</span></div>}
          </div>
        </div>

        {hasSub && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-white/5 pt-5">
            {cancelScheduled ? (
              <GoldButton disabled={busy} onClick={handleResume}>{busy === 'resume' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Resume subscription</GoldButton>
            ) : (
              <button disabled={busy} onClick={handleCancel} className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">{busy === 'cancel' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel subscription</button>
            )}
          </div>
        )}
      </Card>

      {/* Plans */}
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">{t('bill.plans')}</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PAID.map((p) => {
          const isCurrent = currentPlan === p.id;
          const canSwitch = hasSub && !isCurrent;
          return (
            <div key={p.id} className={`relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-transform duration-300 hover:-translate-y-1 ${p.highlight ? 'border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/[0.12] to-[#0f0f14] shadow-[0_24px_80px_-24px_rgba(212,175,55,0.45)]' : 'border-white/[0.07] bg-white/[0.02] backdrop-blur-md'}`}>
              {p.highlight && (
                <>
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                  <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a0a0f]">{t('misc.popular')}</div>
                </>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-bold text-[#f0ecdd]">{p.name}</h4>
                <p className="mt-0.5 text-xs text-[#8a8577]">{p.tagline}</p>
                <div className="mt-3 flex items-end gap-1"><span className="font-mono text-4xl font-bold tb-gold-text">${p.price}</span><span className="mb-1.5 text-sm text-[#8a8577]">/{p.period}</span></div>
                <ul className="mt-4 space-y-2 text-sm text-[#b3ae9e]">{p.features.slice(0, 5).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#d4af37]" />{f}</li>)}</ul>
              </div>
              <div className="mt-5 grid shrink-0 grid-cols-1 gap-2">
                {isCurrent ? (
                  <div className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] py-2.5 text-sm font-bold text-emerald-400"><Check className="h-4 w-4" /> {t('bill.currentPlanBadge')}</div>
                ) : canSwitch ? (
                  <GhostButton disabled={busy} onClick={() => handleSwitch(p.id)} className="w-full">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} {t('bill.switchTo', { name: p.name })}</GhostButton>
                ) : (
                  <>
                    <GoldButton disabled={busy} onClick={() => handleCheckout(p.id)} className="w-full">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t('bill.subscribe')}</GoldButton>
                    <GhostButton disabled={busy || walletBalance < p.price} onClick={() => handleWalletPay(p.id)} className="w-full">{busy === `wallet-${p.id}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />} {t('bill.payWallet')}</GhostButton>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing history */}
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Receipt className="h-4 w-4" /></span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">{t('bill.history')}</h3>
        <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
        <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{events.length}</span>
      </div>
      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[#8a8577]">{t('c.loading')}</div>
        ) : events.length === 0 ? (
          <EmptyState icon={Receipt} title={t('bill.noActivity')} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="no-scrollbar hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-[#d4af37]/12 bg-white/[0.02] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">{[t('bill.hDate'), t('bill.hEvent'), t('bill.hPlan'), t('bill.hAmount'), t('bill.hStatus')].map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-white/5 transition last:border-0 hover:bg-[#d4af37]/[0.04]">
                      <td className="px-5 py-3.5 font-mono text-xs text-[#c9c4b4]">{fmtDate(ev.occurredAt || ev.created)}</td>
                      <td className="px-4 py-3.5 font-medium text-[#f0ecdd]">{ev.eventType?.replace(/[._]/g, ' ')}</td>
                      <td className="px-4 py-3.5 text-[#c9c4b4]">{ev.planName || '—'}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#d4af37]">{ev.amount ? money(ev.amount, ev.currency) : '—'}</td>
                      <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[ev.status] || 'bg-white/10 text-[#8a8577]'}`}>{ev.status || '—'}</span></td>
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
      </Card>
      </div>
    </AppLayout>
  );
}
