import React, { useEffect, useState, useCallback } from 'react';
import { Crown, Check, CreditCard, RefreshCw, XCircle, RotateCcw, ArrowUpRight, ShieldCheck, Receipt, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PLANS } from '@/lib/mockData';
import pb from '@/lib/pocketbaseClient';
import { openCheckout, getSubscription, cancelSubscription, resumeSubscription, switchPlan, getPaddleConfig } from '@/lib/paddle';

const PAID = PLANS.filter((p) => p.id !== 'trial');

function fmtDate(iso) {
  if (!iso) return '—';
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
  const [sub, setSub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [paddleEnv, setPaddleEnv] = useState(null);

  const currentPlan = user?.plan || 'trial';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getPaddleConfig();
      setConfigured(cfg.configured);
      setPaddleEnv(cfg.environment || null);
    } catch { setConfigured(false); }
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
      await openCheckout(plan, (e) => {
        if (e?.name === 'checkout.completed') {
          toast({ title: 'Payment successful', description: 'Your subscription is being activated.' });
          setTimeout(load, 2500);
        }
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Checkout unavailable', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const handleSwitch = async (plan) => {
    setBusy(plan);
    try {
      await switchPlan(plan);
      await updateProfile({ plan });
      toast({ title: 'Plan updated', description: `You are now on the ${plan} plan. Charges are prorated.` });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Change failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const handleCancel = async () => {
    setBusy('cancel');
    try {
      await cancelSubscription(false);
      toast({ title: 'Cancellation scheduled', description: 'Your plan stays active until the end of the billing period.' });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const handleResume = async () => {
    setBusy('resume');
    try {
      await resumeSubscription();
      toast({ title: 'Subscription resumed', description: 'Auto-renewal is back on.' });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Resume failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const status = sub?.status || (currentPlan === 'trial' ? 'trialing' : null);
  const hasSub = Boolean(sub?.id);
  const isAdmin = user?.role === 'admin';
  const cancelScheduled = sub?.scheduled_change?.action === 'cancel' || user?.cancelScheduled;
  const periodEnd = sub?.current_billing_period?.ends_at || user?.currentPeriodEnd;

  return (
    <AppLayout title="Billing & Subscription">
      <PageHeader
        icon={Crown}
        kicker="Subscription"
        description="Manage your trial and paid subscription in one place. Changes apply instantly to your account access."
        actions={paddleEnv && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${paddleEnv === 'live' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${paddleEnv === 'live' ? 'bg-emerald-400' : 'bg-[#d4af37]'}`} />
            Paddle {paddleEnv === 'live' ? 'Live' : 'Sandbox'} environment
            {paddleEnv !== 'live' && <span className="hidden font-normal text-[#8a8577] sm:inline">· test mode</span>}
          </span>
        )}
      />

      {isAdmin && !configured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
          <div className="text-sm text-[#c9c4b4]">
            <p className="font-medium text-[#f0ecdd]">Paddle {paddleEnv === 'live' ? 'live' : 'sandbox'} credentials are not fully configured yet.</p>
            <p className="mt-1">Add your <span className="font-mono text-[#d4af37]">PADDLE_{paddleEnv === 'live' ? 'LIVE' : 'SANDBOX'}_API_KEY</span>, <span className="font-mono text-[#d4af37]">PADDLE_{paddleEnv === 'live' ? 'LIVE' : 'SANDBOX'}_CLIENT_TOKEN</span>, <span className="font-mono text-[#d4af37]">PADDLE_{paddleEnv === 'live' ? 'LIVE' : 'SANDBOX'}_WEBHOOK_SECRET</span> and price IDs to <span className="font-mono">apps/api/.env</span> to enable checkout. Set <span className="font-mono text-[#d4af37]">PADDLE_ENV_OVERRIDE</span> to switch between sandbox and live manually, or leave it unset to follow <span className="font-mono text-[#d4af37]">NODE_ENV</span>. Everything below is wired and production-ready — it activates automatically once those values are set.</p>
          </div>
        </div>
      )}

      {/* Current subscription */}
      <div className="mb-6 glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Crown className="h-4 w-4 text-[#d4af37]" /> Current plan</div>
            <div className="mt-2 text-2xl font-bold gold-text">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</div>
            {currentPlan === 'trial' && <div className="mt-1 text-xs text-[#8a8577]">You are currently on trial access.</div>}
            <div className="mt-2 flex items-center gap-2">
              {status && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || 'bg-white/10 text-[#8a8577]'}`}>{status.replace('_', ' ')}</span>}
              {cancelScheduled && <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs text-red-400">Cancels {fmtDate(periodEnd)}</span>}
            </div>
          </div>
          <div className="text-right text-sm text-[#8a8577]">
            <div className="flex items-center justify-end gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Secured by Paddle</div>
            {periodEnd && <div className="mt-2">{cancelScheduled ? 'Access until' : 'Renews'} <span className="text-[#f0ecdd]">{fmtDate(periodEnd)}</span></div>}
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
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#8a8577]">Plans</h3>
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
              <div className="mt-4 shrink-0 sm:mt-0 sm:w-44">
                {isCurrent ? (
                  <div className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 py-2.5 text-sm font-semibold text-emerald-400"><Check className="h-4 w-4" /> Current plan</div>
                ) : canSwitch ? (
                  <button disabled={busy} onClick={() => handleSwitch(p.id)} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#d4af37]/25 py-2.5 text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-60">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />} Switch to {p.name}</button>
                ) : (
                  <button disabled={busy} onClick={() => handleCheckout(p.id)} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Subscribe</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing history */}
      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[#8a8577]"><Receipt className="h-4 w-4" /> Payment & invoice history</h3>
      <div className="glass rounded-2xl">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-[#8a8577]">Loading…</div>
        ) : events.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#8a8577]">No billing activity yet. Your receipts and invoices will appear here after your first payment.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="no-scrollbar hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">{['Date', 'Event', 'Plan', 'Amount', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
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
