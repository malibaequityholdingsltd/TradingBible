import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Check, RefreshCw, Users, DollarSign, CreditCard, Activity, Crown, ArrowRight, Bot, ExternalLink, Building2, Wallet } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, GoldButton, GhostButton } from '@/components/ui-kit';
import { BROKERS, PROP_FIRMS, PLANS, fmtMoney, translatePlan } from '@/lib/mockData';
import pb from '@/lib/pocketbaseClient';
import { connectBroker, disconnectBroker, resyncBrokerAccount } from '@/lib/brokerSync';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { homeRouteForUser } from '@/lib/homeRoute';

function timeAgo(iso, t) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return t ? t('bro.justNow') : 'just now';
  if (diff < 60) return t ? t('bro.minAgo', { n: diff }) : `${diff} min ago`;
  return t ? t('bro.hrAgo', { n: Math.round(diff / 60) }) : `${Math.round(diff / 60)}h ago`;
}

function ConnectedList({ items }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <div key={c.id} className="tb-card tb-card-hover p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1"><span className="min-w-0 truncate font-semibold text-[#f0ecdd]">{c.broker}</span><span className={`flex shrink-0 items-center gap-1.5 text-xs ${c.status === 'synced' ? 'text-emerald-400' : 'text-[#d4af37]'}`}><span className={`h-1.5 w-1.5 rounded-full ${c.status === 'synced' ? 'bg-emerald-400' : 'bg-[#d4af37] animate-pulse'}`} />{c.status === 'synced' ? 'Synced' : 'Syncing'}</span></div>
          <div className="mt-1 truncate font-mono text-xs text-[#8a8577]">{c.accountRef}</div>
          <div className="mt-2 truncate font-mono text-xl font-semibold text-[#f0ecdd]">{fmtMoney(c.balance || 0)}</div>
          <div className="mt-1 text-[11px] text-[#8a8577]">{t('bro.lastSync')}: {timeAgo(c.lastSync, t)}</div>
        </div>
      ))}
    </div>
  );
}

export function BrokersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
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
      toast({ title: `${b.name} — ${t('bro.connected')}`, description: t('bro.syncedOk') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('bro.syncFail'), description: err?.message || t('bro.tryAgain') });
    } finally { setBusy(null); }
  };

  const resync = async (acct) => {
    setBusy(`resync:${acct.id}`);
    try {
      await resyncBrokerAccount(acct.id);
      await load();
      toast({ title: `${acct.broker} — ${t('bro.resync')}`, description: t('bro.resynced') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('bro.resyncFail'), description: err?.message || t('bro.tryAgain') });
    } finally { setBusy(null); }
  };

  const disconnect = async (acct) => {
    if (!window.confirm(t('bro.confirmDisc', { name: acct.broker }))) return;
    setBusy(`disconnect:${acct.id}`);
    try {
      await disconnectBroker(acct.id);
      await load();
      toast({ title: `${acct.broker} — ${t('bro.disconnect')}` });
    } catch (err) {
      toast({ variant: 'destructive', title: t('bro.disconnFail'), description: err?.message || t('bro.tryAgain') });
    } finally { setBusy(null); }
  };

  const liveAccts = connected.filter((c) => (c.accountKind || 'live') === 'live');
  const propAccts = connected.filter((c) => c.accountKind === 'prop');

  const Grid = ({ list, kind }) => {
    const { t } = useI18n();
    return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((b) => {
        const acct = connected.find((c) => c.broker === b.name && (c.accountKind || 'live') === kind);
        const on = acct && acct.status === 'synced';
        const syncingAcct = acct && acct.status === 'syncing';
        const isBusy = busy === kind + b.name;
        return (
          <div key={b.name} className="tb-card tb-card-hover p-4 sm:p-5">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: `${b.color}22`, color: b.color }}>{b.tag}</div><div className="min-w-0"><div className="truncate font-semibold text-[#f0ecdd]">{b.name}</div><div className="truncate text-xs text-[#8a8577]">{b.kind}</div></div></div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? 'bg-emerald-500/15 text-emerald-400' : syncingAcct ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-red-500/15 text-red-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-400' : syncingAcct ? 'bg-[#d4af37]' : 'bg-red-400'}`} />
                {on ? t('bro.connected') : syncingAcct ? t('bro.syncing') : t('bro.disconnected')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/20 px-2 py-0.5 text-[11px] text-[#c9c4b4]">{kind === 'live' ? t('bro.liveOnly') : t('bro.funded')}</span>
            </div>
            {on ? (
              <button disabled={on || isBusy || loading || syncingAcct} onClick={() => connect(b, kind)}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 py-2.5 text-sm font-medium text-emerald-400 transition disabled:opacity-70">
                <><Check className="h-4 w-4" /> {t('bro.connected')}</>
              </button>
            ) : (
              <GoldButton disabled={isBusy || loading || syncingAcct} onClick={() => connect(b, kind)} className="mt-3 w-full !rounded-lg !py-2.5 !text-sm !font-medium disabled:opacity-70">
                {isBusy ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t('bro.opening')}</> : <><Plug className="h-4 w-4" /> {t('bro.connect')}</>}
              </GoldButton>
            )}
            {on && acct && (
              <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <GhostButton
                  disabled={busy === `resync:${acct.id}`}
                  onClick={() => resync(acct)}
                  className="!min-h-[44px] !px-2 !py-2 !text-xs disabled:opacity-60"
                >
                  {busy === `resync:${acct.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {t('bro.resync')}
                </GhostButton>
                <button
                  disabled={busy === `disconnect:${acct.id}`}
                  onClick={() => disconnect(acct)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-red-500/35 px-2 py-2 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                >
                  {busy === `disconnect:${acct.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} {t('bro.disconnect')}
                </button>
              </div>
            )}
            <div className="mt-2 truncate text-[11px] text-[#8a8577]">{b.authType}</div>
          </div>
        );
      })}
    </div>
    );
  };

  return (
    <AppLayout title={t('nav.brokers')}>
      <div className="tb-page">
        <PageHero
          kickerIcon={Plug}
          kicker={t('bro.kicker')}
          title={t('nav.brokers')}
          subtitle={t('bro.syncDesc')}
        />

        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Wallet className="h-4 w-4" /></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">{t('bro.liveAccts')}</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{liveAccts.length}</span>
        </div>
        <ConnectedList items={liveAccts} />
        <Grid list={BROKERS} kind="live" />

        <div className="mb-3 mt-8 flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Building2 className="h-4 w-4" /></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">{t('bro.propAccts')}</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{propAccts.length}</span>
        </div>
        <ConnectedList items={propAccts} />
        <Grid list={PROP_FIRMS} kind="prop" />
      </div>
    </AppLayout>
  );
}

export function PricingPage() {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] max-w-none -translate-x-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[140px]" />
      <div className="relative mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5"><img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" /><span className="font-semibold">Trading<span className="gold-text">Bible</span></span></Link>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-4 py-1.5 text-xs font-medium text-[#d4af37]"><Crown className="h-3.5 w-3.5" /> {t('price.billedStripe')}</div>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">{t('price.chooseEdge')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#8a8577]">{t('price.sub')}</p>
        </div>
        <div className="mx-auto grid max-w-6xl items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((raw) => {
            const p = translatePlan(t, raw);
            return (
              <div key={p.id} className={`price-card relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7 ${p.highlight ? 'price-card-pop border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/[0.12] to-[#0f0f14] shadow-[0_24px_80px_-24px_rgba(212,175,55,0.45)] lg:scale-[1.04]' : 'border-white/[0.07] bg-white/[0.02] backdrop-blur-md'}`}>
                {p.highlight && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                    <div className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a0a0f]">{t('misc.popular')}</div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <img src={p.logo} alt={`${p.name} plan logo`} className="h-12 w-12 rounded-2xl object-contain ring-1 ring-[#d4af37]/25" />
                  <div>
                    <h3 className="text-lg font-bold text-[#f0ecdd]">{p.name}</h3>
                    <p className="text-xs text-[#8a8577]">{p.tagline}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="font-mono text-[2.6rem] font-bold leading-none tb-gold-text">{p.price === 0 ? 'Free' : `$${p.price}`}</span>
                  <span className="mb-1.5 text-sm text-[#8a8577]">/{p.period}</span>
                </div>
                <div className="my-5 h-px bg-gradient-to-r from-[#d4af37]/25 to-transparent" />
                <ul className="flex-1 space-y-2.5 text-sm text-[#c9c4b4]">{p.features.map(f => <li key={f} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d4af37]/12"><Check className="h-3 w-3 text-[#d4af37]" /></span><span className="leading-snug">{f}</span></li>)}</ul>
                <Link to="/signup" className={`mt-7 flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition active:scale-[0.98] ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_8px_28px_-8px_rgba(212,175,55,0.6)] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.06]'}`}>{p.cta} <ArrowRight className="h-4 w-4" /></Link>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-[#6a665a]">{t('price.guarantee', null, 'Every first payment is covered by a 14-day money-back guarantee. Cancel anytime from your profile — you keep access until the end of your billing period.')}</p>
      </div>
      <Footer />
    </div>
  );
}
