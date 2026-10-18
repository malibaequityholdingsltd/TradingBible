import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, LayoutDashboard, Users, BarChart3, CreditCard, LibraryBig,
  FileText, MonitorPlay, Plug, Key, Package, Briefcase, Settings,
  LogOut, Eye, HelpCircle, Gift, GraduationCap, Wallet, Bot, Bell,
  Trophy, CalendarDays, MessagesSquare, Newspaper, TrendingUp, ShieldCheck,
  BookOpen, PiggyBank, Radio, Tv, FlaskConical, LineChart, UserRound, Globe, IdCard,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { enterAdminPreview } from '@/lib/adminPreview';

// Admin console search (Spotlight / ⌘K): jump to any admin section or run a
// quick action from one search bar. Rendered in AdminLayout only.
export default function AdminSearch() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useRef(null);

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

  const [history, setHistory] = useState(() => {
    try { const h = JSON.parse(localStorage.getItem('tb:admin-search-history') || '[]'); return Array.isArray(h) ? h.slice(0, 6) : []; }
    catch { return []; }
  });
  const remember = (term) => {
    const clean = String(term || '').trim();
    if (!clean) return;
    setHistory((h) => {
      const next = [clean, ...h.filter((x) => x !== clean)].slice(0, 6);
      try { localStorage.setItem('tb:admin-search-history', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('tb:admin-search-history'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open) {
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  const go = (to) => { setOpen(false); nav(to); };

  const items = useMemo(() => {
    const P = (group, icon, title, keys, to) => ({ kind: 'page', group, icon, title, keys: `${keys} ${to}`.toLowerCase(), to });
    return [
      P('Admin', LayoutDashboard, 'Admin Dashboard', 'dashboard home overview console', '/admin'),
      P('Admin', Users, 'User Management', 'users accounts manage roles plans ban', '/admin/users'),
      P('Admin', UserRound, 'Employees', 'employees staff hired roster payroll ai work log', '/admin/employees'),
      P('Admin', IdCard, 'ID Cards', 'staff id cards badge print photo qr license card', '/admin/staff-id-cards'),
      P('Admin', BarChart3, 'Admin Analytics', 'analytics stats revenue growth charts', '/admin/analytics'),
      P('Admin', CreditCard, 'Admin Billing', 'billing revenue mrr subscriptions invoices paddle stripe', '/admin/billing'),
      P('Admin', Gift, 'Admin Airdrops', 'airdrops tbc token distribute claim rewards', '/admin/airdrops'),
      P('Admin', LibraryBig, 'Admin Content', 'content cms pages blog academy threads', '/admin/content'),
      P('Admin', FileText, 'Admin Reports & Logs', 'reports logs moderation threads audit', '/admin/reports'),
      P('Admin', MonitorPlay, 'TradingBible TV', 'tv ads broadcast manage rotate', '/admin/tv'),
      P('Admin', Plug, 'Admin Integrations', 'integrations api keys status health webhook', '/admin/integrations'),
      P('Admin', Key, 'Admin API Keys', 'api keys tokens revoke manage', '/admin/api-keys'),
      P('Admin', Package, 'Admin Plugins', 'plugins extensions manage install', '/admin/plugins'),
      P('Admin', GraduationCap, 'Admin Mentors', 'mentors coaches directory publish sessions booking', '/admin/mentors'),
      P('Admin', Wallet, 'Admin Wallet & Staking', 'wallet staking money movement rails kyc balances transactions', '/admin/wallet'),
      P('Admin', Briefcase, 'Jobs & Hiring', 'jobs hiring careers postings applicants', '/admin/jobs'),
      P('Admin', Settings, 'Admin Settings', 'settings platform maintenance features trial signups', '/admin/settings'),
      P('Trader App', LayoutDashboard, 'Trader Dashboard', 'app dashboard home overview portfolio', '/app'),
      P('Trader App', MonitorPlay, 'Terminal Pro', 'terminal charts workstation trading desk candles', '/app/terminal-pro'),
      P('Trader App', BookOpen, 'Trade Journal', 'journal trades entries exits notes diary', '/app/journal'),
      P('Trader App', BarChart3, 'Analytics', 'analytics equity drawdown performance discipline score', '/app/analytics'),
      P('Trader App', LineChart, 'Signals', 'signals indicator market ideas long short', '/app/signals'),
      P('Trader App', Bell, 'Price Alerts', 'alerts price notification levels alarm', '/app/alerts'),
      P('Trader App', TrendingUp, 'Indicators', 'indicators rsi macd bollinger ema screener', '/app/indicators'),
      P('Trader App', BarChart3, 'Heatmaps', 'heatmaps market bubbles sectors map', '/app/heatmaps'),
      P('Trader App', TrendingUp, 'Order Flow', 'orderflow footprint volume delta dom', '/app/orderflow'),
      P('Trader App', FlaskConical, 'Backtester', 'backtest strategy history hypothetical results', '/app/backtest'),
      P('Trader App', FlaskConical, 'Paper Trading', 'paper demo virtual practice no risk', '/app/paper'),
      P('Trader App', Trophy, 'Challenges & Prop Firms', 'challenges funded evaluation prop payout', '/app/challenges'),
      P('Trader App', Bot, 'SI Coach', 'coach ai mentor chat discipline mistakes', '/app/coach'),
      P('Trader App', FileText, 'SI Reports', 'reports daily weekly performance review', '/app/reports'),
      P('Trader App', ShieldCheck, 'Risk Tools', 'risk position size calculator breakeven expectancy ruin', '/app/tools'),
      P('Trader App', CalendarDays, 'Economic Calendar', 'calendar macro events news cpi fomc earnings', '/app/economic-calendar'),
      P('Trader App', MessagesSquare, 'Community', 'community forum leaderboard chat traders', '/app/community'),
      P('Trader App', GraduationCap, 'Academy', 'academy courses lessons school learn education', '/app/academy'),
      P('Trader App', GraduationCap, 'Mentors', 'mentors booking coaching one on one tutor', '/app/mentors'),
      P('Trader App', BookOpen, 'Pro Guide', 'guide onboarding missions checklist start', '/app/guide'),
      P('Trader App', CreditCard, 'Billing', 'billing subscription plan upgrade wallet pay', '/app/billing'),
      P('Trader App', Wallet, 'Wallet', 'wallet fund deposit withdraw crypto fiat stripe', '/app/wallet'),
      P('Trader App', Gift, 'Affiliate', 'affiliate referral commission payouts earnings', '/app/affiliate'),
      P('Trader App', PiggyBank, 'Staking', 'staking yield earn tbc lock apy', '/app/staking'),
      P('Trader App', Key, 'API Docs & Keys', 'api developer docs keys webhooks white label', '/app/api-docs'),
      P('Trader App', UserRound, 'Profile & KYC', 'profile account identity verification kyc settings', '/app/profile'),
      P('Trader App', ShieldCheck, 'Security', 'security passkeys sessions devices deactivate', '/app/security'),
      P('Trader App', Radio, 'TradingBible TV', 'tv broadcast shows watch live player', '/tv'),
      P('Trader App', Wallet, '$TBC Token', 'tbc token economy vesting lockup convert', '/tbc'),
      P('Public Site', Globe, 'Landing', 'home landing public website hero', '/'),
      P('Public Site', Newspaper, 'Pricing', 'pricing plans cost subscribe pro elite professional', '/pricing'),
      P('Public Site', BookOpen, 'About', 'about company mission team story', '/about'),
      P('Public Site', Newspaper, 'Blog & Guides', 'blog guides news articles learn', '/blog'),
      P('Public Site', Briefcase, 'Careers', 'careers jobs hiring work remote', '/careers'),
      P('Public Site', Tv, 'Leaderboard', 'leaderboard top traders ranking public', '/leaderboard'),
      { kind: 'action', group: 'Quick actions', icon: Eye, title: 'View app as trader', keys: 'view app preview trader terminal', run: () => { setOpen(false); enterAdminPreview(); nav('/app'); } },
      { kind: 'action', group: 'Quick actions', icon: Users, title: 'Find a user', keys: 'find user search email name phone account', run: () => go('/admin/users') },
      { kind: 'action', group: 'Quick actions', icon: CreditCard, title: 'Billing & payouts', keys: 'payout affiliate billing money', run: () => go('/admin/billing') },
      { kind: 'action', group: 'Quick actions', icon: HelpCircle, title: 'View public site', keys: 'home landing public website', run: () => go('/') },
      { kind: 'action', group: 'Quick actions', icon: LogOut, title: 'Sign out', keys: 'sign out logout exit', run: () => { setOpen(false); logout(); nav('/'); } },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = q.trim().toLowerCase();
  const recents = !query ? history.map((term) => ({
    kind: 'recent', group: 'Recent', icon: Search, title: term, term, keys: '',
  })) : [];
  const results = useMemo(() => {
    if (!query) return [...recents, ...items].slice(0, 9);
    const toks = query.split(/\s+/);
    const compact = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Subsequence match: every char of the token appears in order — catches
    // typos like "anlytics" → "analytics" without a fuzzy-search library.
    const isSubseq = (needle, hay) => {
      let j = 0;
      for (let i = 0; i < hay.length && j < needle.length; i++) {
        if (hay[i] === needle[j]) j++;
      }
      return j === needle.length;
    };
    const scored = [];
    for (const it of items) {
      const title = String(it.title || '').toLowerCase();
      const hay = `${title} ${it.keys || ''}`.toLowerCase();
      const hayCompact = hay.replace(/[^a-z0-9]/g, '');
      const titleCompact = title.replace(/[^a-z0-9]/g, '');
      const strict = toks.every((tk) => hay.includes(tk) || hayCompact.includes(compact(tk)));
      if (strict) {
        scored.push({ it, score: toks.every((tk) => title.includes(tk) || titleCompact.includes(compact(tk))) ? 2 : 1 });
      } else if (query.length >= 3 && toks.every((tk) => isSubseq(compact(tk), hayCompact))) {
        scored.push({ it, score: 0.5 });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((s) => s.it);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, history]);

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
  }, [open, results, active]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

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
  }, [open]);

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
          placeholder="Search pages, users, actions…"
          aria-label="Search admin console"
          className="w-full min-w-0 bg-transparent text-xs text-[#e9e7df] outline-none placeholder:text-[#8a8577]"
        />
        {!q && <kbd className="ml-auto hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-px font-mono text-[10px] text-[#8a8577] lg:inline">⌘K</kbd>}
        {!!q && <button onClick={() => setQ('')} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/5 text-[#8a8577] hover:text-[#e9e7df]" aria-label="Clear"><X className="h-3 w-3" /></button>}
      </div>

      {open && (
        <div className="overlay-pop absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[1.75rem] border border-[#d4af37]/30 bg-[#0c0c11]/95 shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(212,175,55,0.12)] backdrop-blur-2xl">
            <div ref={listRef} className="relative max-h-[48vh] overflow-y-auto p-3 no-scrollbar scroll-contain sm:p-4">
              {results.length === 0 && (
                <div className="flex flex-col items-center px-3 py-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-3xl border border-dashed border-[#d4af37]/25 bg-[#d4af37]/[0.04] text-[#6a665a]">
                    <Search className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-[15px] font-semibold text-[#e9e7df]">Nothing found. Try “users”, “billing”, “TV” or “settings”.</p>
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
