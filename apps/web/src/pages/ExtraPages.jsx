import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Check, RefreshCw, Users, DollarSign, CreditCard, Activity, Crown, ArrowRight, Bot, ExternalLink, Building2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { BROKERS, PROP_FIRMS, PLANS, fmtMoney } from '@/lib/mockData';
import pb from '@/lib/pocketbaseClient';
import { connectBroker, disconnectBroker, resyncBrokerAccount } from '@/lib/brokerSync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { homeRouteForUser } from '@/lib/homeRoute';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)}h ago`;
}

function ConnectedList({ items }) {
  if (!items.length) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <div key={c.id} className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1"><span className="min-w-0 truncate font-semibold text-[#f0ecdd]">{c.broker}</span><span className={`flex shrink-0 items-center gap-1 text-xs ${c.status === 'synced' ? 'text-emerald-400' : 'text-[#d4af37]'}`}>{c.status === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}{c.status === 'synced' ? 'Synced' : 'Syncing'}</span></div>
          <div className="mt-1 truncate font-mono text-xs text-[#8a8577]">{c.accountRef}</div>
          <div className="mt-2 truncate font-mono text-xl font-semibold text-[#f0ecdd]">{fmtMoney(c.balance || 0)}</div>
          <div className="mt-1 text-[11px] text-[#8a8577]">Last sync: {timeAgo(c.lastSync)}</div>
        </div>
      ))}
    </div>
  );
}

export function BrokersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState([]);
  const [busy, setBusy] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) { setConnected([]); setLoading(false); return; }
    try {
      const items = await pb.collection('broker_accounts').getFullList({
        filter: `owner = "${user.id}"`,
        sort: '-created',
      });
      setConnected(items);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user?.id]);

  const connect = async (b, kind) => {
    if (!user) return;
    setBusy(kind + b.name);
    try {
      window.open(b.authUrl, '_blank', 'noopener,noreferrer');
      await connectBroker(b, user.id, kind, { accountRef: `${b.authType} authorization` });
      await load();
      toast({ title: `${b.name} synced`, description: 'AI imported your historical trades and account balance.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Sync failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const resync = async (acct) => {
    setBusy(`resync:${acct.id}`);
    try {
      await resyncBrokerAccount(acct.id);
      await load();
      toast({ title: `${acct.broker} re-synced`, description: 'Latest account data has been refreshed.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Re-sync failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const disconnect = async (acct) => {
    if (!window.confirm(`Disconnect ${acct.broker}?`)) return;
    setBusy(`disconnect:${acct.id}`);
    try {
      await disconnectBroker(acct.id);
      await load();
      toast({ title: `${acct.broker} disconnected` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Disconnect failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(null); }
  };

  const liveAccts = connected.filter((c) => (c.accountKind || 'live') === 'live');
  const propAccts = connected.filter((c) => c.accountKind === 'prop');

  const Grid = ({ list, kind }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((b) => {
        const acct = connected.find((c) => c.broker === b.name && (c.accountKind || 'live') === kind);
        const on = acct && acct.status === 'synced';
        const syncingAcct = acct && acct.status === 'syncing';
        const isBusy = busy === kind + b.name;
        return (
          <div key={b.name} className="glass glass-hover rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: `${b.color}22`, color: b.color }}>{b.tag}</div><div className="min-w-0"><div className="truncate font-semibold text-[#f0ecdd]">{b.name}</div><div className="truncate text-xs text-[#8a8577]">{b.kind}</div></div></div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? 'bg-emerald-500/15 text-emerald-400' : syncingAcct ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-red-500/15 text-red-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-400' : syncingAcct ? 'bg-[#d4af37]' : 'bg-red-400'}`} />
                {on ? 'Connected' : syncingAcct ? 'Syncing' : 'Disconnected'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/20 px-2 py-0.5 text-[11px] text-[#c9c4b4]">{kind === 'live' ? 'Live only' : 'Funded'}</span>
            </div>
            <button disabled={on || isBusy || loading || syncingAcct} onClick={() => connect(b, kind)}
              className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-70 ${on ? 'border border-emerald-500/30 text-emerald-400' : 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] hover:opacity-90'}`}>
            {on ? <><Check className="h-4 w-4" /> Connected</> : isBusy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Opening…</> : <><Plug className="h-4 w-4" /> Connect</>}
            </button>
            {on && acct && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  disabled={busy === `resync:${acct.id}`}
                  onClick={() => resync(acct)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#d4af37]/25 px-2 py-2 text-xs text-[#d4af37] transition hover:border-[#d4af37]/50 disabled:opacity-60"
                >
                  {busy === `resync:${acct.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-sync
                </button>
                <button
                  disabled={busy === `disconnect:${acct.id}`}
                  onClick={() => disconnect(acct)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-red-500/35 px-2 py-2 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                >
                  {busy === `disconnect:${acct.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} Disconnect
                </button>
              </div>
            )}
            <div className="mt-2 truncate text-[11px] text-[#8a8577]">{b.authType}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <AppLayout title="Broker Connections">
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.06] p-4">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[#d4af37]" />
        <p className="text-sm text-[#c9c4b4]">Connect a <span className="text-[#f0ecdd]">live broker</span> or <span className="text-[#f0ecdd]">prop-firm account</span> and the AI engine syncs your full historical and live trade history plus your real account balance — no manual entry. <span className="text-[#f0ecdd]">Demo accounts are not supported</span>; only live and funded accounts are allowed.</p>
      </div>

      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#8a8577]">Live trading accounts</h3>
      <ConnectedList items={liveAccts} />
      <Grid list={BROKERS} kind="live" />

      <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[#8a8577]"><Building2 className="h-4 w-4 text-[#d4af37]" /> Prop firm accounts</h3>
      <ConnectedList items={propAccts} />
      <Grid list={PROP_FIRMS} kind="prop" />
    </AppLayout>
  );
}

function AdminStat({ icon: Icon, label, value, sub }) {
  return <div className="glass rounded-2xl p-5"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-[#8a8577]">{label}</span><Icon className="h-4 w-4 text-[#d4af37]" /></div><div className="mt-3 font-mono text-2xl font-semibold text-[#f0ecdd]">{value}</div><div className="mt-1 text-xs text-emerald-400">{sub}</div></div>;
}

export function AdminPage() {
  const users = [
    { email: 'marcus@fund.io', plan: 'Professional', status: 'Active', mrr: 99 },
    { email: 'sofia.trades@gmail.com', plan: 'Elite AI', status: 'Active', mrr: 49.99 },
    { email: 'dan.k@proton.me', plan: 'Pro', status: 'Trial', mrr: 0 },
    { email: 'aisha@desk.co', plan: 'Elite AI', status: 'Past due', mrr: 49.99 },
    { email: 'leo.fx@outlook.com', plan: 'Pro', status: 'Cancelled', mrr: 0 },
  ];
  return (
    <AppLayout title="Admin Panel">
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat icon={Users} label="Total Users" value="12,480" sub="+312 this week" />
        <AdminStat icon={CreditCard} label="Active Subs" value="4,921" sub="+8.4% MoM" />
        <AdminStat icon={DollarSign} label="MRR" value="$182,540" sub="+11.2% MoM" />
        <AdminStat icon={Activity} label="Trial → Paid" value="34.8%" sub="Above benchmark" />
      </div>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-5 w-5 text-[#d4af37]" /> Users & Subscriptions</h3>
      <div className="glass no-scrollbar overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">{['User', 'Plan', 'Status', 'MRR', 'Paddle ID'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.email} className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="px-4 py-3 text-[#f0ecdd]">{u.email}</td>
              <td className="px-4 py-3 text-[#c9c4b4]">{u.plan}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${u.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : u.status === 'Trial' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-red-500/15 text-red-400'}`}>{u.status}</span></td>
              <td className="px-4 py-3 font-mono text-[#c9c4b4]">${u.mrr}</td>
              <td className="px-4 py-3 font-mono text-xs text-[#6a665a]">sub_{Math.random().toString(36).slice(2, 10)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AppLayout>
  );
}

export function PricingPage() {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5"><img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" /><span className="font-semibold">Trading<span className="gold-text">Bible</span></span></Link>
        <div className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 px-3 py-1 text-xs text-[#d4af37]"><Crown className="h-3.5 w-3.5" /> Billed securely via Paddle</div>
          <h1 className="text-4xl font-bold sm:text-5xl">Choose your <span className="gold-text">edge</span></h1>
          <p className="mt-3 text-[#8a8577]">Start with a 7-day premium trial. Upgrade, downgrade or cancel anytime.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`relative flex flex-col rounded-2xl p-6 ${p.highlight ? 'glass gold-glow' : 'glass'}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0f]">MOST POPULAR</div>}
              <img src={p.logo} alt={`${p.name} plan logo`} className="mb-3 h-14 w-14 rounded-xl object-contain" />
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-xs text-[#8a8577]">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1"><span className="text-3xl font-bold gold-text">{p.price === 0 ? 'Free' : `$${p.price}`}</span><span className="mb-1 text-sm text-[#8a8577]">/{p.period}</span></div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-[#b3ae9e]">{p.features.map(f => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#d4af37]" />{f}</li>)}</ul>
              <Link to="/signup" className={`mt-6 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60'}`}>{p.cta} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-[#6a665a]">Webhook-ready for Paddle: subscription_created · subscription_updated · subscription_cancelled · subscription_payment_failed</p>
      </div>
      <Footer />
    </div>
  );
}
