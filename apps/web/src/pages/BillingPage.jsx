import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Check, CreditCard, Crown, Receipt, RefreshCw,
  RotateCcw, ShieldCheck, Wallet, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, EmptyState, GhostButton, GoldButton, Note } from '@/components/ui-kit';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PLANS, translatePlan } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import pb from '@/lib/pocketbaseClient';
import { openCheckout, getSubscription, cancelSubscription, resumeSubscription, switchPlan, getStripeConfig } from '@/lib/stripe';
import { useWallet } from '@/hooks/useWallet';

function fmtDate(iso) {
  if (!iso) return '—';
  const value = typeof iso === 'number' ? new Date(iso * 1000).toISOString() : iso;
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const money = (n, c = 'USD') => (n || n === 0)
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(n)
  : '—';

function statusBadge(status) {
  if (status === 'active') return 'ex-badge--up';
  if (status === 'past_due') return 'ex-badge--down';
  if (status === 'paused') return 'ex-badge--accent';
  return '';
}

export default function BillingPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const plans = PLANS.map((plan) => translatePlan(t, plan));
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
      const config = await getStripeConfig();
      setConfigured(Boolean(config?.configured));
      setStripeEnv(config?.environment || null);
    } catch {
      setConfigured(false);
      setStripeEnv(null);
    }
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
      <div className="ex-page">
        <header className="ex-page-head">
          <div className="ex-page-head__copy">
            <span className="ex-kicker">Account</span>
            <h1 className="ex-page-title">Billing</h1>
            <p className="ex-page-sub">Your plan, payment method and invoice history. Prices are fixed and shown before checkout.</p>
          </div>
          <div className="ex-page-actions">
            {stripeEnv ? (
              <span className={`ex-badge ${stripeEnv === 'live' ? 'ex-badge--up' : 'ex-badge--accent'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${stripeEnv === 'live' ? 'bg-[var(--ex-up)]' : 'bg-[var(--ex-accent)]'}`} />
                {stripeEnv === 'live' ? t('bill.stripeLive', null, 'Stripe live') : t('bill.stripeTest', null, 'Stripe test')}
              </span>
            ) : null}
            <Link to="/pricing" className="ex-btn ex-btn--secondary ex-btn--sm">Compare plans <ArrowUpRight /></Link>
          </div>
        </header>

        {isAdmin && !configured && (
          <div className="mb-3">
            <Note icon={AlertTriangle} tone="accent">
              <p className="font-semibold text-[var(--ex-text)]">Stripe is not fully configured</p>
              <p className="mt-1">Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET and the STRIPE_PRICE_* values in the API environment.</p>
            </Note>
          </div>
        )}

        <div className="ex-card mb-3 flex flex-wrap items-center justify-between gap-3 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="ex-empty__icon h-9 w-9"><Wallet className="h-4 w-4" /></span>
            <div>
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">{t('bill.walletBalance', null, 'Wallet balance')}</div>
              <div className="ex-mono mt-0.5 text-[18px] font-semibold text-[var(--ex-text)]">
                {money(walletBalance)} <Link to="/app/wallet" className="ml-1 font-sans text-[10px] font-semibold text-[var(--ex-accent)] hover:underline">{t('bill.fundWallet', null, 'Fund wallet')}</Link>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-[var(--ex-muted)]">{t('bill.payInstant', null, 'Instant payment from your cash balance')}</div>
        </div>

        <Card className="mb-3 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[color-mix(in_srgb,var(--ex-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--ex-accent)_10%,transparent)] text-[var(--ex-accent)]"><Crown className="h-4 w-4" /></span>
              <div>
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">{t('bill.currentPlan', null, 'Current plan')}</div>
                <div className="mt-0.5 text-[22px] font-bold tracking-[-0.04em] text-[var(--ex-text)]">{currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : t('bill.noPlan', null, 'No plan')}</div>
                {!currentPlan && <div className="mt-1 text-[10.5px] text-[var(--ex-muted)]">{t('bill.noPlanYet', null, 'Subscribe to unlock the full terminal.')}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {status && <span className={`ex-badge ${statusBadge(status)}`}>{status.replace('_', ' ')}</span>}
                  {cancelScheduled && <span className="ex-badge ex-badge--down">{t('bill.cancelsOn', { date: fmtDate(periodEnd) }, `Cancels ${fmtDate(periodEnd)}`)}</span>}
                </div>
              </div>
            </div>
            <div className="text-right text-[10.5px] text-[var(--ex-muted)]">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--ex-up)_24%,transparent)] bg-[color-mix(in_srgb,var(--ex-up)_8%,transparent)] px-2.5 py-1 font-semibold text-[var(--ex-up)]"><ShieldCheck className="h-3.5 w-3.5" /> {t('bill.securedBy', null, 'Secured by Stripe')}</div>
              {periodEnd && <div className="mt-2">{cancelScheduled ? t('bill.accessUntil', null, 'Access until') : t('bill.renews', null, 'Renews')} <span className="ex-mono text-[var(--ex-text)]">{fmtDate(periodEnd)}</span></div>}
            </div>
          </div>

          {hasSub && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--ex-line)] pt-3">
              {cancelScheduled ? (
                <GoldButton disabled={busy} onClick={handleResume} className="ex-btn--sm">{busy === 'resume' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Resume subscription</GoldButton>
              ) : (
                <button type="button" disabled={busy} onClick={handleCancel} className="ex-btn ex-btn--danger ex-btn--sm disabled:opacity-60">
                  {busy === 'cancel' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel subscription
                </button>
              )}
            </div>
          )}
        </Card>

        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ex-text)]">{t('bill.plans', null, 'Plans')}</h2>
          <span className="h-px flex-1 bg-[var(--ex-line)]" />
          <span className="text-[10px] text-[var(--ex-muted)]">Fixed monthly pricing · cancel anytime</span>
        </div>

        <div className="ex-plan-grid">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const canSwitch = hasSub && !isCurrent;
            return (
              <div key={plan.id} className={`ex-plan-card${plan.highlight ? ' is-featured' : ''}${isCurrent ? ' is-current' : ''}`}>
                {plan.highlight && <span className="ex-plan-badge">{t('misc.popular', null, 'Popular')}</span>}
                <div className="min-w-0 flex-1">
                  <h3 className="ex-plan-card__name">{plan.name}</h3>
                  <p className="ex-plan-card__tagline">{plan.tagline}</p>
                  <div className="ex-plan-card__price"><strong>${plan.price}</strong><span>/{plan.period}</span></div>
                  <ul className="ex-plan-card__features">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li key={feature}><Check />{feature}</li>
                    ))}
                  </ul>
                </div>
                <div className="ex-plan-card__actions">
                  {isCurrent ? (
                    <div className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-[6px] border border-[color-mix(in_srgb,var(--ex-up)_28%,transparent)] bg-[color-mix(in_srgb,var(--ex-up)_8%,transparent)] text-[11px] font-semibold text-[var(--ex-up)]"><Check className="h-3.5 w-3.5" /> {t('bill.currentPlanBadge', null, 'Current plan')}</div>
                  ) : canSwitch ? (
                    <GhostButton disabled={busy} onClick={() => handleSwitch(plan.id)} className="ex-btn--sm w-full">
                      {busy === plan.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />} {t('bill.switchTo', { name: plan.name }, `Switch to ${plan.name}`)}
                    </GhostButton>
                  ) : (
                    <>
                      <GoldButton disabled={busy} onClick={() => handleCheckout(plan.id)} className="ex-btn--sm w-full">
                        {busy === plan.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} {t('bill.subscribe', null, 'Subscribe')}
                      </GoldButton>
                      <GhostButton disabled={busy || walletBalance < plan.price} onClick={() => handleWalletPay(plan.id)} className="ex-btn--sm w-full">
                        {busy === `wallet-${plan.id}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />} {t('bill.payWallet', null, 'Pay with wallet')}
                      </GhostButton>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-2 mt-4 flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5 text-[var(--ex-muted)]" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ex-text)]">{t('bill.history', null, 'Billing history')}</h2>
          <span className="h-px flex-1 bg-[var(--ex-line)]" />
          <span className="ex-badge">{events.length}</span>
        </div>

        <Card>
          {loading ? (
            <div className="px-4 py-10 text-center text-[12px] text-[var(--ex-muted)]">{t('c.loading', null, 'Loading…')}</div>
          ) : events.length === 0 ? (
            <EmptyState icon={Receipt} title={t('bill.noActivity', null, 'No billing activity yet')} sub="Invoices and plan changes will appear here." />
          ) : (
            <div className="ex-table-wrap">
              <table className="ex-table ex-table--cards">
                <thead>
                  <tr>
                    <th>{t('bill.hDate', null, 'Date')}</th>
                    <th>{t('bill.hEvent', null, 'Event')}</th>
                    <th>{t('bill.hPlan', null, 'Plan')}</th>
                    <th>{t('bill.hAmount', null, 'Amount')}</th>
                    <th>{t('bill.hStatus', null, 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Date" className="ex-muted">{fmtDate(event.occurredAt || event.created)}</td>
                      <td data-label="Event" className="ex-table__main">{event.eventType?.replace(/[._]/g, ' ')}</td>
                      <td data-label="Plan" className="ex-muted">{event.planName || '—'}</td>
                      <td data-label="Amount" className="ex-table__num text-[var(--ex-accent)]">{event.amount ? money(event.amount, event.currency) : '—'}</td>
                      <td data-label="Status"><span className={`ex-badge ${statusBadge(event.status)}`}>{event.status || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
