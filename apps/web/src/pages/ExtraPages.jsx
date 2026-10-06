import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Check, RefreshCw, CreditCard, Crown, ArrowRight, Building2, Wallet, Search, KeyRound, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, GoldButton, GhostButton } from '@/components/ui-kit';
import { PLANS, fmtMoney, translatePlan, BROKER_REGISTRY, PROP_FIRM_REGISTRY, CONNECTION_TYPES, getProviderById } from '@/lib/mockData';
import pb from '@/lib/pocketbaseClient';
import { connectBroker, disconnectBroker, resyncBrokerAccount, syncAllBrokers } from '@/lib/brokerSync';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { openCheckout, getSubscription, switchPlan } from '@/lib/stripe';
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

// User-facing connection label. Internal method names (oauth/bridge/adapter)
  // are never shown in the portal — users see what they can do, nothing else.
  function connectionLabel(connectionType) {
    if (connectionType === 'api_key') return 'API key';
    if (connectionType === 'oauth') return 'OAuth';
    if (connectionType === 'mt5_bridge') return 'MT5 Bridge';
    if (connectionType === 'account_login') return 'Account login';
    return 'Coming soon';
  }

  // ── Connect Broker page: only providers with a live backend adapter sync.
  // Never asks for broker passwords, never scrapes login pages, no external
  // login links or faked pending flows — unavailable providers say so honestly.
  export function BrokersPage() {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const [connected, setConnected] = useState([]);
    const [providers, setProviders] = useState([]);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [label, setLabel] = useState('');

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
    useEffect(() => {
      setProviders([...BROKER_REGISTRY, ...PROP_FIRM_REGISTRY]);
    }, []);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return providers;
      return providers.filter((p) => `${p.name} ${p.kind} ${p.notes || ''}`.toLowerCase().includes(q));
    }, [providers, query]);

const forex = filtered.filter((p) => p.kind?.toLowerCase().includes('forex') || p.kind?.toLowerCase().includes('cfd') || p.kind?.toLowerCase().includes('multi-asset'));
  const stocks = filtered.filter((p) => p.kind?.toLowerCase().includes('stock') || p.kind?.toLowerCase().includes('future'));
  const crypto = filtered.filter((p) => p.kind?.toLowerCase().includes('crypto'));

  const totalBalance = connected.reduce((s, c) => s + Number(c.balance || 0), 0);

  const openConnect = (p) => {
    setSelected(p);
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setLabel(p.name);
  };

  const submitApiKey = async () => {
    if (!selected || !user) return;
    const needsPassphrase = selected.supportsPassphrase || selected.connectionType === 'mt5_bridge';
    const needsSecret = selected.connectionType !== 'mt5_bridge';
    
    if (!apiKey.trim() || (needsSecret && !apiSecret.trim())) {
      toast({ variant: 'destructive', title: 'Key required', description: needsSecret ? 'Paste a read-only API key + secret. No passwords.' : 'Enter your MT5 account number and password.' });
      return;
    }
    if (needsPassphrase && !passphrase.trim()) {
      toast({ variant: 'destructive', title: 'Passphrase required', description: selected.connectionType === 'mt5_bridge' ? 'MT5 server is required.' : 'OKX/KuCoin needs the API passphrase too.' });
      return;
    }
    setBusy(`connect:${selected.id}`);
    try {
      await connectBroker({ id: selected.id, name: selected.name }, user.id, 'live', {
        apiKey: apiKey.trim(), apiSecret: needsSecret ? apiSecret.trim() : undefined,
        passphrase: needsPassphrase ? passphrase.trim() : undefined,
        label: label.trim() || selected.name,
      });
      setSelected(null);
      await load();
      toast({ title: `${selected.name} — connected`, description: 'Live-tested before storing. Balances arrive from the feed only.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Connection test failed', description: err?.message || 'Try again' });
    } finally { setBusy(null); }
  };

  const resync = async (acct) => {
    setBusy(`resync:${acct.id}`);
    try {
      const r = await resyncBrokerAccount(acct.id);
      await load();
      if (r?.ok) toast({ title: `${acct.broker} — resynced`, description: r.added ? `${r.added} new fills` : 'Balances up to date' });
      else toast({ variant: 'destructive', title: 'Sync needs attention', description: r?.error || `Couldn't sync ${acct.broker} — coming soon` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Resync failed', description: err?.message || 'Try again' });
    } finally { setBusy(null); }
  };

  const syncAll = async () => {
    setBusy('sync:all');
    try {
      const r = await syncAllBrokers(user?.id);
      await load();
      toast({ title: 'Sync complete', description: `${r.accounts || 0} providers • ${r.added || 0} new fills` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Sync failed', description: err?.message || 'Try again' });
    } finally { setBusy(null); }
  };

  const disconnect = async (acct) => {
    if (!window.confirm(`Disconnect ${acct.broker}? This removes the connection and deletes its stored keys.`)) return;
    setBusy(`disconnect:${acct.id}`);
    try {
      await disconnectBroker(acct.id);
      await load();
      toast({ title: `${acct.broker} — disconnected` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Disconnect failed', description: err?.message || 'Try again' });
    } finally { setBusy(null); }
  };

  const Grid = ({ list }) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((p) => {
        const acct = connected.find((c) => String(c.broker || '').toLowerCase() === String(p.name).toLowerCase());
        const on = acct?.status === 'synced';
        const pending = acct && acct?.status !== 'synced';
        return (
          <div key={p.id} className="tb-card tb-card-hover flex flex-col p-5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="h-11 w-11 rounded-xl object-contain" />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold" style={{ background: `${p.color}22`, color: p.color }}>{p.tag}</div>
                )}
                {acct && (
                  <span title={on ? 'Connected' : 'Pending'} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0f0f14] ${on ? 'bg-emerald-400' : 'bg-[#d4af37] animate-pulse'}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[#f0ecdd]">{p.name}</div>
                <div className="truncate text-xs text-[#8a8577]">{p.kind} • {connectionLabel(p.connectionType)}</div>
              </div>
              {acct && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
                  {on ? 'Connected' : (acct.status || 'Pending')}
                </span>
              )}
            </div>
            <p className="mt-3 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-[#8a8577]">{p.notes || p.blurb || 'Live sync available.'}</p>
            {acct ? (
              <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate font-mono text-lg font-semibold text-[#f0ecdd]">{fmtMoney(acct.balance || 0)}</div>
                  <div className="shrink-0 text-[11px] text-[#8a8577]">{timeAgo(acct.lastSync, t)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton disabled={busy === `resync:${acct.id}`} onClick={() => resync(acct)} className="!min-h-[40px] !px-2 !py-2 !text-xs">
                    {busy === `resync:${acct.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Resync
                  </GhostButton>
                  <button disabled={busy === `disconnect:${acct.id}`} onClick={() => disconnect(acct)} className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-lg border border-red-500/35 px-2 py-2 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-60">
                    Disconnect
                  </button>
                </div>
                {pending && <div className="text-[11px] text-[#d4af37]">Pending — coming soon.</div>}
              </div>
            ) : (
              <GoldButton onClick={() => openConnect(p)} className="mt-3 w-full !rounded-lg !py-2.5 !text-sm !font-medium">
                <Plug className="h-4 w-4" /> Connect
              </GoldButton>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <AppLayout title={t('nav.brokers')}>
      <div className="tb-page">
        <PageHero kickerIcon={Plug} kicker="Live sync • read-only by default" title="Connect account" subtitle="Connect a broker to sync balances and trades automatically. More brokers coming soon — your keys stay encrypted and are never used for trading." />
        <div className="tb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8577]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search broker — Exness, HFM, IBKR, Alpaca, OANDA…" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8a8577]">
            <GhostButton onClick={syncAll} disabled={busy === 'sync:all' || !connected.length} className="!min-h-[36px] !px-3 !py-1.5 !text-xs">
              {busy === 'sync:all' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync all
            </GhostButton>
          </div>
        </div>
        {connected.length > 0 && (
          <div className="tb-card flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8a8577]"><Wallet className="h-4 w-4 text-[#d4af37]" /> Total portfolio</div>
            <div className="font-mono text-xl font-bold text-[#f0ecdd]">{fmtMoney(totalBalance)}</div>
            <div className="text-xs text-[#8a8577]">{connected.length} connected • equity/positions arrive from live feeds only</div>
          </div>
        )}
        <div className="mb-3 mt-6 flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Building2 className="h-4 w-4" /></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">Forex &amp; CFD</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{forex.length}</span>
        </div>
        <Grid list={forex} />
        <div className="mb-3 mt-8 flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Wallet className="h-4 w-4" /></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">Stocks</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{stocks.length}</span>
        </div>
        <Grid list={stocks} />
        <div className="mb-3 mt-8 flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><KeyRound className="h-4 w-4" /></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#f0ecdd]">Crypto</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{crypto.length}</span>
        </div>
        <Grid list={crypto} />
        <p className="mt-6 text-xs leading-relaxed text-[#6a665a]">Your keys are encrypted and stored securely. Read-only by default — the app never places trades or withdraws funds.</p>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div className="tb-card w-full max-w-md space-y-4 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f0ecdd]"><Plug className="h-4 w-4 text-[#d4af37]" /> Connect {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="rounded-full p-1.5 text-[#8a8577] hover:bg-white/5" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs leading-relaxed text-[#8a8577]">{selected.setup}</p>
            {(selected.connectionType === 'api_key' || selected.connectionType === 'mt5_bridge') ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] p-3 text-xs leading-relaxed text-[#c9c4b4]">
                  {selected.connectionType === 'mt5_bridge' ? (
                    <>MT5 Bridge required. Configure <b>MT_BRIDGE_URL</b> and <b>MT_BRIDGE_TOKEN</b> in your environment. Demo accounts are blocked — only live/funded MT5 accounts can connect.</>
                  ) : (
                    <>Create a <b>read-only</b> key in your broker account → API Management (no withdrawals, no futures unless needed). Paste key + secret here — it is tested once, then stored encrypted. We never ask for your broker password.</>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8a8577]">Label</label>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8a8577]">API key</label>
                  <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={selected.connectionType === 'mt5_bridge' ? 'MT5 Account Number' : 'Read-only API key'} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
                </div>
                {selected.connectionType !== 'mt5_bridge' && (
                  <div>
                    <label className="mb-1 block text-xs text-[#8a8577]">API secret / Password</label>
                    <input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} type="password" placeholder={selected.connectionType === 'mt5_bridge' ? 'MT5 Password' : 'API secret (never stored in plaintext)'} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
                  </div>
                )}
                {(selected.supportsPassphrase || selected.connectionType === 'mt5_bridge') && (
                  <div>
                    <label className="mb-1 block text-xs text-[#8a8577]">Passphrase / Server</label>
                    <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} type="password" placeholder={selected.connectionType === 'mt5_bridge' ? 'MT5 Server' : 'API passphrase (OKX/KuCoin shows it once at creation)'} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-[#f0ecdd] outline-none focus:border-[#d4af37]/60" />
                  </div>
                )}
                <GoldButton disabled={busy === `connect:${selected.id}`} onClick={submitApiKey} className="w-full">
                  {busy === `connect:${selected.id}` ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Test &amp; connect
                </GoldButton>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-[#c9c4b4]">
                  <span className="text-[#d4af37]">Coming soon</span> — {selected.name} sync isn't available yet. What it will need: {selected.authType}
                </div>
                <GoldButton disabled className="w-full opacity-60">
                  <Plug className="h-4 w-4" /> Coming soon
                </GoldButton>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export function PricingPage() {
  const { user, isAuthed, updateProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const [busy, setBusy] = useState(null);
  const [hasSub, setHasSub] = useState(false);
  const { ledger, payWithWallet } = useWallet();
  const walletBalance = ledger?.balances?.USD || 0;
  const currentPlan = user?.plan || null;

  useEffect(() => {
    if (!isAuthed) return;
    getSubscription().then((s) => setHasSub(Boolean(s?.id))).catch(() => setHasSub(false));
  }, [isAuthed]);

  const planAction = async (kind, plan) => {
    const key = kind === 'wallet' ? `wallet-${plan.id}` : plan.id;
    setBusy(key);
    try {
      if (kind === 'wallet') {
        await payWithWallet(plan.id);
        await updateProfile({ plan: plan.id });
        toast({ title: t('bill.payWallet'), description: plan.name });
      } else if (hasSub) {
        await switchPlan(plan.id);
        await updateProfile({ plan: plan.id });
        toast({ title: t('c.done'), description: t('bill.switchTo', { name: plan.name }) });
      } else {
        await openCheckout(plan.id);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: t('c.error'), description: err?.message || t('c.retry') });
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-[#07070a] px-6 pt-24 pb-16 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[60rem] max-w-none -translate-x-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[140px]" />
      <div className="relative mx-auto max-w-[96rem]">
        <Link to={homeTo} className="mb-10 flex items-center gap-2.5"><img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" /><span className="font-semibold">Trading<span className="gold-text">Bible</span></span></Link>
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/[0.06] px-4 py-1.5 text-xs font-medium text-[#d4af37]"><Crown className="h-3.5 w-3.5" /> {t('price.billedStripe')}</div>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">{t('price.chooseEdge')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#8a8577]">{t('price.sub')}</p>
          {isAuthed && (
            <p className="mt-3 text-sm text-[#8a8577]">{t('bill.walletBalance')} <span className="font-mono font-bold text-[#f0ecdd]">${walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></p>
          )}
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
                {(() => {
                  const isCurrent = isAuthed && currentPlan === p.id;
                  const canSwitch = isAuthed && hasSub && !isCurrent;
                  if (isCurrent) {
                    return <div className="mt-7 flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 text-sm font-bold text-emerald-400"><Check className="h-4 w-4" /> {t('bill.currentPlanBadge', null, 'Current plan')}</div>;
                  }
                  if (!isAuthed) {
                    return <Link to="/signup" className={`mt-7 flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition active:scale-[0.98] ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_8px_28px_-8px_rgba(212,175,55,0.6)] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.06]'}`}>{p.cta} <ArrowRight className="h-4 w-4" /></Link>;
                  }
                  return (
                    <div className="mt-7 grid gap-2">
                      {canSwitch ? (
                        <button disabled={!!busy} onClick={() => planAction('switch', p)} className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-[#d4af37]/30 text-sm font-bold text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-60">{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('bill.switchTo', { name: p.name })}</button>
                      ) : (
                        <button disabled={!!busy} onClick={() => planAction('checkout', p)} className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition active:scale-[0.98] disabled:opacity-60 ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_8px_28px_-8px_rgba(212,175,55,0.6)] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.06]'}`}>{busy === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t('bill.subscribe', null, 'Subscribe')}</button>
                      )}
                      <button disabled={!!busy || walletBalance < p.price} onClick={() => planAction('wallet', p)} title={walletBalance < p.price ? t('bill.lowBalance', null, 'Insufficient wallet balance') : ''} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 text-xs font-semibold text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#e9e7df] disabled:opacity-40">{busy === `wallet-${p.id}` ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />} {t('bill.payWallet', null, 'Pay with wallet')}</button>
                    </div>
                  );
                })()}
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
