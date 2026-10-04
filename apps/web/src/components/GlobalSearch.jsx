import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, ListOrdered, BookOpen, Plug, Trophy, Landmark,
  BarChart3, FileText, Bot, Calculator, CandlestickChart, Gauge, Grid2x2,
  Star, Radar, Bell, CalendarClock, Users, GraduationCap, Code2, Settings,
  User, KeyRound, CreditCard, Share2, Lock, Palette, Tag, Info, Newspaper,
  Briefcase, Mail, Tv, HelpCircle, Sun, Moon, LogOut, Crown, CircleDot, X,
  MessageCircleQuestion, Router,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

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
  const inputRef = useRef(null);
  const listRef = useRef(null);
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
      setQ('');
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open ]);

  const go = (to) => { setOpen(false); nav(to); };

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
      P(t('nav.markets', null, 'Markets'), Star, t('nav.watchlists', null, 'Watchlists'), 'watchlist symbols favorites tracking groups', '/app/watchlists'),
      P(t('nav.markets', null, 'Markets'), Radar, t('nav.signals', null, 'Trading Signals'), 'signals buy sell breakout strategy alerts setups', '/app/signals'),
      P(t('nav.markets', null, 'Markets'), Bell, t('nav.alerts', null, 'Price Alerts'), 'alerts price notification target trigger', '/app/alerts'),
      P(t('nav.markets', null, 'Markets'), CalendarClock, t('nav.economic', null, 'Economic Calendar'), 'economic calendar news events fomc nfp cpi earnings', '/app/economic-calendar'),
      P(t('nav.learn', null, 'Learn & Connect'), Users, t('nav.community', null, 'Community'), 'community forum leaderboard traders discussion', '/app/community'),
      P(t('nav.learn', null, 'Learn & Connect'), GraduationCap, t('nav.academy', null, 'Academy'), 'academy school courses lessons quizzes webinar certificate tutor student teacher', '/app/academy'),
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
      P(t('fot.h_company', null, 'Company'), Info, t('fot.l_about_tradingbible', null, 'About'), 'about mission company maliba story', '/about'),
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
    const actions = [
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
    return [...pages, ...support, ...actions, ...admin];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, theme, isAdmin, user?.accountType]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return items.slice(0, 9);
    const toks = query.split(/\s+/);
    return items.filter((it) => {
      const hay = `${it.title} ${it.keys}`.toLowerCase();
      return toks.every((tk) => hay.includes(tk));
    }).slice(0, 14);
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);

  const run = (it) => {
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('nav.search', null, 'Search')}
        title={`${t('nav.search', null, 'Search')} (⌘K)`}
        className="flex h-11 w-full max-w-md items-center gap-2 rounded-2xl border border-[#d4af37]/25 px-3 text-[#8a8577] transition hover:border-[#d4af37]/60 hover:text-[#d4af37] sm:min-w-[220px] lg:min-w-[320px]"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden truncate text-xs sm:inline">{t('nav.search', null, 'Search anything…')}</span>
        <kbd className="ml-auto hidden rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#8a8577] lg:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="glass sheen-panel overlay-pop relative w-full max-w-2xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-4">
              <Search className="h-4 w-4 shrink-0 text-[#d4af37]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('nav.searchPh', null, 'Search pages, help, actions…')}
                className="h-12 w-full bg-transparent py-4 text-sm text-[#e9e7df] outline-none placeholder:text-[#5f5b50]"
              />
              <button onClick={() => setOpen(false)} className="text-[#8a8577] hover:text-[#e9e7df]" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2 no-scrollbar scroll-contain">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[#8a8577]">{t('c.noResults', null, 'Nothing found. Try different words.')}</p>
              )}
              {results.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                return (
                  <React.Fragment key={`${it.group}-${it.title}`}>
                    {header && <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f5b50]">{header}</div>}
                    <button
                      data-idx={i}
                      onClick={() => run(it)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === active ? 'bg-[#d4af37]/12 text-[#f0ecdd]' : 'text-[#c9c4b4]'}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i === active ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-white/[0.04] text-[#8a8577]'}`}>
                        <it.icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{it.title}</span>
                        {it.kind !== 'action' && it.to && <span className="block truncate font-mono text-[10px] text-[#5f5b50]">{it.to}</span>}
                      </span>
                      {it.kind === 'support' && <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[#8a8577]" />}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-[#d4af37]/10 px-4 py-2 text-[10px] text-[#5f5b50]">
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">↵</kbd> open</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono">esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
