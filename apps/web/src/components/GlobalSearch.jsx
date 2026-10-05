import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, ListOrdered, BookOpen, Plug, Trophy, Landmark,
  BarChart3, FileText, Bot, Calculator, CandlestickChart, Gauge, Grid2x2,
  Star, Radar, Bell, CalendarClock, Users, GraduationCap, Code2, Settings,
  User, KeyRound, CreditCard, Share2, Lock, Palette, Tag, Info, Newspaper,
  Briefcase, Mail, Tv, HelpCircle, Sun, Moon, LogOut, Crown, CircleDot, X,
  MessageCircleQuestion, Router, Layers,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useTrades } from '@/hooks/useTrades';
import { LIVE_CHANNELS } from '@/lib/liveChannels';
import { getTopicIndex, PATHS } from '@/lib/academyCatalog';
import { FAQS } from '@/pages/LegalPages';
import { BROKERS, PROP_FIRMS } from '@/lib/mockData';
import { INDICATOR_DEFS } from '@/lib/indicators';

const HISTORY_KEY = 'tb:search-history';

// Global app search (Spotlight / ⌘K): find any page, direction, help topic,
// support answer or quick action from one search bar.
export default function GlobalSearch() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [history, setHistory] = useState(() => {
    try { const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(h) ? h.slice(0, 6) : []; }
    catch { return []; }
  });
  const remember = (term) => {
    const clean = String(term || '').trim();
    if (!clean) return;
    setHistory((h) => {
      const next = [clean, ...h.filter((x) => x !== clean)].slice(0, 6);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  };
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open ]);

  const go = (to) => { setOpen(false); nav(to); };

  const query = q.trim().toLowerCase();
  const { trades } = useTrades();

  const topicIndex = useMemo(() => {
    try { return getTopicIndex() || []; } catch { return []; }
  }, []);
  const tradeSymbols = useMemo(() => {
    const seen = new Map();
    (trades || []).forEach((tr) => {
      const sym = String(tr.symbol || tr.market || '').trim();
      if (!sym || seen.has(sym)) return;
      seen.set(sym, tr.strategy || '');
    });
    return [...seen.entries()].slice(0, 30);
  }, [trades]);

  const items = useMemo(() => {
    const P = (group, icon, title, keys, to) => ({ kind: 'page', group, icon, title, keys: `${keys} ${to}`.toLowerCase(), to });
    const pages = [
      P(t('nav.trade', null, 'Trade'), LayoutDashboard, t('nav.dashboard', null, 'Dashboard'), 'dashboard home overview pnl balance winrate', '/app'),
      P(t('nav.trade', null, 'Trade'), ListOrdered, t('nav.terminal', null, 'Terminal'), 'terminal live quotes ticker tape order book', '/app/terminal'),
      P(t('nav.trade', null, 'Trade'), BookOpen, t('nav.journal', null, 'Trading Journal'), 'journal trades diary notes history export csv', '/app/journal'),
      P(t('nav.trade', null, 'Trade'), Plug, t('nav.brokers', null, 'Brokers'), 'broker connect sync mt4 mt5 ctrader api key', '/app/brokers'),
      P(t('nav.trade', null, 'Trade'), Trophy, t('nav.propfirms', null, 'Prop Firms'), 'prop firm funded challenge ftmo account', '/app/prop-firms'),
      P(t('nav.trade', null, 'Trade'), Landmark, t('nav.wallet', null, 'Wallet'), 'wallet crypto deposit withdraw address balance bitcoin ethereum', '/app/wallet'),
      P(t('nav.analyze', null, 'Analyze'), BarChart3, t('nav.analytics', null, 'Analytics'), 'analytics performance stats profit factor charts', '/app/analytics'),
      P(t('nav.analyze', null, 'Analyze'), FileText, t('nav.reports', null, 'Reports'), 'reports daily weekly monthly pdf schedule email', '/app/reports'),
      P(t('nav.analyze', null, 'Analyze'), Bot, t('nav.coach', null, 'SI Coach'), 'ai coach chat advice review mistakes discipline score', '/app/coach'),
      P(t('nav.analyze', null, 'Analyze'), Calculator, t('nav.tools', null, 'Risk Tools'), 'risk calculator position size lot stop loss take profit', '/app/tools'),
      P(t('nav.markets', null, 'Markets'), CandlestickChart, t('nav.charts', null, 'Advanced Charts'), 'charts candlestick drawings indicators timeframe', '/app/charts'),
      P(t('nav.markets', null, 'Markets'), Gauge, t('nav.indicators', null, 'Indicators'), 'indicators rsi macd ema bollinger signals', '/app/indicators'),
      P(t('nav.markets', null, 'Markets'), CircleDot, t('nav.heatmaps', null, 'Heatmaps'), 'heatmap bubbles crypto forex stocks movers gainers losers', '/app/heatmaps'),
      P(t('nav.markets', null, 'Markets'), Layers, t('nav.orderflow', null, 'Order Flow'), 'orderflow order flow footprint depth tape volume delta bookmap dom', '/app/orderflow'),
      P(t('nav.markets', null, 'Markets'), Star, t('nav.watchlists', null, 'Watchlists'), 'watchlist symbols favorites tracking groups', '/app/watchlists'),
      P(t('nav.markets', null, 'Markets'), Radar, t('nav.signals', null, 'Trading Signals'), 'signals buy sell breakout strategy alerts setups', '/app/signals'),
      P(t('nav.markets', null, 'Markets'), Bell, t('nav.alerts', null, 'Price Alerts'), 'alerts price notification target trigger', '/app/alerts'),
      P(t('nav.markets', null, 'Markets'), CalendarClock, t('nav.economic', null, 'Economic Calendar'), 'economic calendar news events fomc nfp cpi earnings', '/app/economic-calendar'),
      P(t('nav.learn', null, 'Learn & Connect'), Users, t('nav.community', null, 'Community'), 'community forum leaderboard traders discussion', '/app/community'),
      P(t('nav.learn', null, 'Learn & Connect'), GraduationCap, t('nav.academy', null, 'Academy'), 'academy school courses lessons quizzes webinar certificate tutor student teacher', '/app/academy'),
      P(t('fot.h_education', null, 'Education'), GraduationCap, t('fot.l_academy', null, 'Academy (public)'), 'academy public school forex crypto learn courses', '/academy'),
      P(t('nav.learn', null, 'Learn & Connect'), Code2, t('nav.apidocs', null, 'API Docs'), 'api docs developers keys webhook integration', '/app/api-docs'),
      P(t('nav.learn', null, 'Learn & Connect'), Settings, t('nav.integrations', null, 'API & Integrations'), 'integrations stripe paddle broker setup status', '/app/integrations'),
      P(t('nav.account', null, 'Account'), User, t('nav.profile', null, 'Profile'), 'profile username avatar account settings personal', '/app/profile'),
      P(t('nav.account', null, 'Account'), KeyRound, t('nav.apikeys', null, 'API Keys'), 'api keys tokens create revoke', '/app/api-keys'),
      P(t('nav.account', null, 'Account'), CreditCard, t('nav.billing', null, 'Billing'), 'billing subscription plan pro elite professional pay invoice cancel upgrade price', '/app/billing'),
      P(t('nav.account', null, 'Account'), Share2, t('nav.affiliate', null, 'Affiliate'), 'affiliate refer referral commission earnings payout', '/app/affiliate'),
      P(t('nav.account', null, 'Account'), Lock, t('nav.security', null, 'Security'), 'security 2fa totp password passkey sessions', '/app/security'),
      P(t('nav.account', null, 'Account'), Palette, t('nav.branding', null, 'White-label'), 'branding white label logo company tagline subdomain', '/app/branding'),
      P(t('nav.company', null, 'Company'), Info, t('nav.school', null, 'School Dashboard'), 'school dashboard classrooms tests certificates students teacher', '/student'),
      P(t('fot.h_company', null, 'Company'), Tag, t('fot.l_pricing', null, 'Pricing'), 'pricing plans cost price subscribe trial pro elite professional', '/pricing'),
      P(t('fot.h_company', null, 'Company'), Info, t('fot.l_about_tradingbible', null, 'About'), 'about mission company tradingbible story', '/about'),
      P(t('fot.h_education', null, 'Education'), Newspaper, t('fot.l_trading_guides', null, 'Guides'), 'guides how to start tutorial help learn', '/guides'),
      P(t('fot.h_education', null, 'Education'), GraduationCap, t('fot.l_webinars', null, 'Webinars'), 'webinars live sessions events host', '/webinars'),
      P(t('fot.h_education', null, 'Education'), Newspaper, t('fot.l_blog', null, 'Blog'), 'blog articles news posts', '/blog'),
      P(t('fot.h_company', null, 'Company'), Briefcase, t('fot.l_careers', null, 'Careers'), 'careers jobs hiring work apply', '/careers'),
      P(t('fot.h_company', null, 'Company'), Mail, t('fot.l_contact', null, 'Contact'), 'contact support email help message', '/contact'),
      P(t('fot.h_community', null, 'Community'), Tv, 'TradingBible TV', 'tv broadcast ads watch video', '/tv'),
      P(t('fot.h_legal', null, 'Legal'), FileText, t('fot.terms', null, 'Terms'), 'terms service conditions legal agreement', '/terms'),
      P(t('fot.h_legal', null, 'Legal'), Lock, t('fot.privacy', null, 'Privacy'), 'privacy policy data protection', '/policy'),
      P(t('fot.h_legal', null, 'Legal'), HelpCircle, t('fot.refunds', null, 'Refunds'), 'refund money back guarantee 14 day return', '/refund'),
      P(t('fot.h_legal', null, 'Legal'), MessageCircleQuestion, t('fot.faq', null, 'FAQ'), 'faq questions answers help broker sync trial cancel refund data ai coach', '/faq'),
    ];
    const support = [
      { kind: 'support', group: t('app.help', null, 'Support'), icon: Plug, title: 'How does broker sync work?', keys: 'broker sync connect import trades', to: '/faq' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: Plug, title: 'Which brokers are supported?', keys: 'brokers supported metatrader ctrader binance coinbase', to: '/faq' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: CreditCard, title: 'Do you offer a free trial?', keys: 'free trial pricing trial card paid', to: '/faq' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: CreditCard, title: 'How do I cancel / get a refund?', keys: 'cancel refund money back subscription stop', to: '/refund' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: Bot, title: 'What does the SI Coach do?', keys: 'ai coach review mistakes discipline help', to: '/faq' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: Lock, title: 'How is my data protected?', keys: 'data privacy security protection safe', to: '/faq' },
      { kind: 'support', group: t('app.help', null, 'Support'), icon: Mail, title: 'Contact support', keys: 'contact support email help message human', to: '/contact' },
    ];
    const tvChannels = LIVE_CHANNELS.map((c) => ({
      kind: 'tv', group: 'TradingBible TV', icon: Tv, title: c.title,
      keys: `${c.title} ${c.desk || ''} tv live channel watch`.toLowerCase(), to: `/tv?channel=${encodeURIComponent(c.id)}`,
    }));
    const recents = !query ? history.map((term) => ({
      kind: 'recent', group: t('c.recent', null, 'Recent'), icon: Search, title: term, term, keys: '',
    })) : [];
    const actions = [
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: Bot, title: t('aiw.coach', null, 'Ask SI Coach'), keys: 'ai si coach chat ask assistant help tutor', run: () => { setOpen(false); window.dispatchEvent(new Event('tb:open-live-chat')); } },
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: Tv, title: t('land.watchTv', null, 'Watch TradingBible TV'), keys: 'tv watch live broadcast television', run: () => go('/tv') },
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: theme === 'light' ? Moon : Sun, title: theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme', keys: 'theme dark light mode appearance', run: () => { setOpen(false); toggleTheme(); } },
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: Crown, title: t('app.upgrade', null, 'Upgrade Plan'), keys: 'upgrade plan subscribe billing pricing', run: () => go('/app/billing') },
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: Router, title: 'View public site', keys: 'home landing public website', run: () => go('/') },
      { kind: 'action', group: t('app.account', null, 'Quick actions'), icon: LogOut, title: t('app.signout', null, 'Sign out'), keys: 'sign out logout exit leave', run: () => { setOpen(false); logout(); nav('/'); } },
    ];
    const admin = isAdmin ? [
      P('Admin', Settings, 'Admin Console', 'admin console dashboard portal manage', '/admin'),
      P('Admin', Users, 'Users', 'admin users manage accounts plans roles', '/admin/users'),
      P('Admin', BarChart3, 'Admin Analytics', 'admin analytics stats revenue growth', '/admin/analytics'),
      P('Admin', CreditCard, 'Admin Billing', 'admin billing revenue mrr subscriptions paddle stripe', '/admin/billing'),
      P('Admin', FileText, 'Admin Content', 'admin content cms pages blog academy threads', '/admin/content'),
      P('Admin', Settings, 'Admin Settings', 'admin settings platform maintenance features trial signups', '/admin/settings'),
      P('Admin', Plug, 'Admin Integrations', 'admin integrations api keys status health', '/admin/integrations'),
      P('Admin', Tv, 'TV Ads', 'admin tv ads broadcast manage', '/admin/tv'),
    ] : [];
    const lessons = topicIndex.map((l) => ({
      kind: 'lesson', group: t('nav.academy', null, 'Academy'), icon: GraduationCap,
      title: l.title || l.lessonKey,
      keys: `${l.title || ''} ${l.courseTitle || ''} ${l.pathName || ''} academy lesson learn`.toLowerCase(),
      to: '/app/academy',
    }));
    const paths = PATHS.map((p) => ({
      kind: 'path', group: t('nav.academy', null, 'Academy'), icon: GraduationCap,
      title: p.name,
      keys: `${p.name} ${p.desc || ''} academy path course`.toLowerCase(),
      to: '/app/academy',
    }));
    const faqs = FAQS.map((f) => ({
      kind: 'support', group: 'FAQ', icon: HelpCircle,
      title: f.q,
      keys: `${f.q} ${f.a}`.toLowerCase().slice(0, 400),
      to: '/faq',
    }));
    const myTrades = tradeSymbols.map(([sym, strat]) => ({
      kind: 'trade', group: t('nav.journal', null, 'Trading Journal'), icon: CandlestickChart,
      title: strat ? `${sym} · ${strat}` : sym,
      keys: `${sym} ${strat} my trades journal`.toLowerCase(),
      to: '/app/journal',
    }));
    const brokers = [...BROKERS, ...PROP_FIRMS].map((b) => ({
      kind: 'broker', group: t('nav.brokers', null, 'Brokers'), icon: Plug,
      title: b.name,
      keys: `${b.name} ${b.tag || ''} ${b.kind || ''} broker connect sync fund`.toLowerCase(),
      to: '/app/brokers',
    }));
    const indicators = Object.entries(INDICATOR_DEFS).map(([key, d]) => ({
      kind: 'indicator', group: t('nav.indicators', null, 'Indicators'), icon: Gauge,
      title: d.label || key,
      keys: `${d.label || ''} ${key} indicator overlay study`.toLowerCase(),
      to: '/app/indicators',
    }));
    const acctGroup = t('nav.account', null, 'Account');
    const account = [
      { kind: 'page', group: acctGroup, icon: User, title: 'Edit profile', keys: 'profile username avatar name edit account personal', to: '/app/profile' },
      { kind: 'page', group: acctGroup, icon: Lock, title: 'Password & 2FA', keys: 'password 2fa totp two factor authentication passkey security login', to: '/app/security' },
      { kind: 'page', group: acctGroup, icon: KeyRound, title: 'Sessions & devices', keys: 'sessions devices active login logout security', to: '/app/security' },
      { kind: 'page', group: acctGroup, icon: Bell, title: 'Price alerts', keys: 'alerts notifications price notify target trigger', to: '/app/alerts' },
    ];
    return [...recents, ...pages, ...tvChannels, ...myTrades, ...lessons, ...paths, ...brokers, ...indicators, ...faqs, ...account, ...support, ...actions, ...admin];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, theme, isAdmin, user?.accountType, query, history, topicIndex, tradeSymbols]);

  const results = useMemo(() => {
    if (!query) return items.slice(0, 9);
    const toks = query.split(/\s+/);
    return items.filter((it) => {
      const hay = `${it.title} ${it.keys}`.toLowerCase();
      return toks.every((tk) => hay.includes(tk));
    }).slice(0, 14);
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { setActive((a) => Math.min(Math.max(a, 0), Math.max(results.length - 1, 0))); }, [results.length]);

  const run = (it) => {
    if (!it) return;
    if (it.kind === 'recent') { setQ(it.term); return; }
    remember(q);
    if (it.kind === 'action') it.run();
    else go(it.to);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, active ]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active ]);

  let lastGroup = null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('touchstart', onDown);
    };
  }, [open ]);

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-md">
      <div
        className="app-search-trigger flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-[#8a8577] transition focus-within:border-[#d4af37]/60 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); } }}
          placeholder={t('nav.search', null, 'Search anything…')}
          aria-label={t('nav.search', null, 'Search')}
          className="w-full min-w-0 bg-transparent text-xs text-[#e9e7df] outline-none placeholder:text-[#8a8577]"
        />
        {!q && <kbd className="ml-auto hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-px font-mono text-[10px] text-[#8a8577] lg:inline">⌘K</kbd>}
        {!!q && <button onClick={() => setQ('')} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[#8a8577] hover:text-[#e9e7df]" aria-label="Clear"><X className="h-3 w-3" /></button>}
      </div>

      {open && (
        <div className="overlay-pop absolute left-0 right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-[1.75rem] border border-[#d4af37]/30 bg-[#0c0c11]/95 shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(212,175,55,0.12)] backdrop-blur-2xl">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[80px]" />
            <div ref={listRef} className="relative max-h-[48vh] overflow-y-auto p-3 no-scrollbar scroll-contain sm:p-4">
              {results.length === 0 && (
                <div className="flex flex-col items-center px-3 py-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-3xl border border-dashed border-[#d4af37]/25 bg-[#d4af37]/[0.04] text-[#6a665a]">
                    <Search className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#e9e7df]">{t('c.noResults', null, 'Nothing found. Try different words.')}</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6a665a]">Try a page name, a topic like “broker” or “refund”, or an action like “theme”.</p>
                </div>
              )}
              {results.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const groupCount = results.filter((r) => r.group === it.group).length;
                return (
                  <React.Fragment key={`${it.group}-${it.title}`}>
                    {header && (
                      <div className="flex items-center gap-2.5 px-2 pb-2 pt-4 first:pt-1">
                        <span className="rounded-md bg-[#d4af37]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">{header}</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/25 to-transparent" />
                        <span className="font-mono text-[10px] text-[#5f5b50]">{groupCount}</span>
                      </div>
                    )}
                    <button
                      data-idx={i}
                      onClick={() => run(it)}
                      onMouseEnter={() => setActive(i)}
                      className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-150 ${i === active ? 'border-[#d4af37]/50 bg-gradient-to-r from-[#d4af37]/[0.14] to-[#d4af37]/[0.03] text-[#f0ecdd] shadow-[0_8px_32px_-12px_rgba(212,175,55,0.5)]' : 'border-transparent text-[#c9c4b4] hover:bg-white/[0.03]'}`}
                    >
                      {i === active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-[#f4e6a8] to-[#c99a25]" />}
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${i === active ? 'bg-[#d4af37]/20 text-[#f0d675]' : 'bg-white/[0.04] text-[#8a8577]'}`}>
                        <it.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{it.title}</span>
                        {it.kind !== 'action' && it.to && <span className="mt-0.5 block truncate font-mono text-[11px] text-[#6a665a]">{it.to}</span>}
                      </span>
                      {it.kind === 'support' && <HelpCircle className="h-4 w-4 shrink-0 text-[#8a8577]" />}
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all ${i === active ? 'bg-[#d4af37] text-[#0a0a0f]' : 'bg-white/[0.04] text-[#5f5b50]'}`}>
                        <span className="font-mono text-[11px]">↵</span>
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="relative flex items-center gap-5 border-t border-white/[0.07] bg-black/30 px-5 py-3 text-[11px] text-[#6a665a] sm:px-6">
              <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono">↵</kbd> open</span>
              <span className="flex items-center gap-1.5"><kbd className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono">esc</kbd> close</span>
              {!query && history.length > 0 ? (
                <button onClick={clearHistory} className="ml-auto hidden items-center gap-1.5 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-[#8a8577] transition hover:border-red-400/40 hover:text-red-400 sm:flex">Clear history</button>
              ) : (
                <span className="ml-auto hidden items-center gap-1.5 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />{results.length} results</span>
              )}
            </div>
          </div>
      )}
    </div>
  );
}
