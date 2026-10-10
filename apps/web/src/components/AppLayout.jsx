import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Bot, Plug, Crown, User, LogOut, Menu, BarChart3, FileText, Calculator, Users, GraduationCap, Code2, Palette, CreditCard, HelpCircle, Bell, Radar, CalendarClock, Landmark, KeyRound, Building2, Settings, ChevronDown, Trophy, Share2, MonitorPlay, Compass, FlaskConical, Store, Medal, Briefcase, SquareTerminal, Star, Coins, Droplets, Sun, Moon, Languages, Check, X, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl } from '@/lib/avatar';
import { displayInitial } from '@/lib/displayName';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n, SUPPORTED_LANGS } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import GlobalSearch from '@/components/GlobalSearch';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { BrandWordmark, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { homeRouteForUser } from '@/lib/homeRoute';
import { meetsPlan } from '@/lib/entitlements';
import { isAdminPreview, exitAdminPreview } from '@/lib/adminPreview';
import { usePlatformSettings, featureForRoute } from '@/lib/platformSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

const NAV_GROUPS = [
  {
    labelKey: 'nav.trade',
    items: [
      { to: '/app/terminal-pro', labelKey: 'nav.terminalPro', icon: SquareTerminal },
      { to: '/app/journal', labelKey: 'nav.journal', icon: BookOpen },
      { to: '/app/challenges', labelKey: 'nav.challenges', icon: Trophy },
      { to: '/app/paper', labelKey: 'nav.paper', icon: FlaskConical },
      { to: '/app/brokers', labelKey: 'nav.brokers', icon: Plug },
      { to: '/app/funded', labelKey: 'nav.funded', icon: Trophy },
      { to: '/app/wallet', labelKey: 'nav.wallet', icon: Landmark, requiresSubscriber: true },    ],
  },
  {
    labelKey: 'nav.analyze',
    items: [
      { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: '/app/backtest', labelKey: 'nav.backtest', icon: FlaskConical },
      { to: '/app/reports', labelKey: 'nav.reports', icon: FileText, requiresSubscriber: true, requiredPlan: 'elite' },
      { to: '/app/coach', labelKey: 'nav.coach', icon: Bot, requiresSubscriber: true, requiredPlan: 'elite' },
      { to: '/app/tools', labelKey: 'nav.tools', icon: Calculator, requiresSubscriber: true },
    ],
  },
  {
    labelKey: 'nav.markets',
    items: [
      { to: '/app/watchlists', labelKey: 'nav.watchlists', icon: Star },
      { to: '/tv', labelKey: 'nav.tv', icon: MonitorPlay },
      { to: '/app/signals', labelKey: 'nav.signals', icon: Radar },
      { to: '/app/market', labelKey: 'nav.market', icon: Store },
      { to: '/app/staking', labelKey: 'nav.staking', icon: Coins },
      { to: '/app/defi', labelKey: 'nav.defi', icon: Droplets },
      { to: '/leaderboard', labelKey: 'nav.leaderboard', icon: Medal },
      { to: '/app/alerts', labelKey: 'nav.alerts', icon: Bell },
      { to: '/app/economic-calendar', labelKey: 'nav.economic', icon: CalendarClock },
    ],
  },
  {
    labelKey: 'nav.learn',
    items: [
      { to: '/app/guide', labelKey: 'nav.guide', icon: Compass },
      { to: '/app/mentors', labelKey: 'nav.mentors', icon: Briefcase },
      { to: '/app/community', labelKey: 'nav.community', icon: Users },
      { to: '/app/academy', labelKey: 'nav.academy', icon: GraduationCap },
      { to: '/app/api-docs', labelKey: 'nav.apidocs', icon: Code2, requiresSubscriber: true, requiredPlan: 'professional' },
    ],
  },
];

function Brand({ homeTo, platformName, tagline }) {
  const { t } = useI18n();
  const words = String(platformName || 'TradingBible SI').trim().split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';
  return (
    <Link to={homeTo} className="group flex items-center gap-4">
      <BrandWordmark size={32} showTagline={false} />
      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f]" />
    </Link>
  );
}

function NavItem({ to, labelKey, icon: Icon, end, locked, t, onNav }) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-[#8a8577] transition group-hover:text-[#d4af37]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">{t(labelKey)}</span>
      {locked && <Crown className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />}
    </>
  );
  const cls = 'tbl-row group flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2 transition-all';
  if (locked) {
    return (
      <button onClick={onNav} className={`${cls} text-[#8a8577]/70 hover:bg-white/[0.04] hover:text-[#e9e7df]`}>
        {inner}
      </button>
    );
  }
  return (
    <NavLink to={to} end={end} onClick={onNav}
      className={({ isActive }) => `${cls} ${isActive ? 'tbl-row--active bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/5 text-[#f0ecdd] ring-1 ring-inset ring-[#d4af37]/30' : 'text-[#8a8577] hover:bg-white/[0.04] hover:text-[#e9e7df]'}`}>
      {inner}
    </NavLink>
  );
}

export default function AppLayout({ children, title }) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout, updateProfile } = useAuth();
  const { unseen } = useNotifications();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const { features } = usePlatformSettings();
  const initial = displayInitial(user);
  const signOut = () => { logout(); nav('/'); };

  const isAdmin = user?.role === 'admin';
  const isSubscriber = isAdmin || ['pro', 'elite', 'professional'].includes((user?.plan || '').toLowerCase());
  const canSeeSignals = isAdmin || features.signals !== false;
  const avatar = avatarUrl(user);
  const homeTo = homeRouteForUser(user);

  useEffect(() => {
    if (user && user.tutorialDone === false) setTutorial(true);
  }, [user]);

  const completeTutorial = () => { updateProfile({ tutorialDone: true }).catch(() => {}); };
  const closeDrawer = () => setOpen(false);

  // Keep the sidebar list scroll across page changes (each page mounts a
  // fresh sidebar, which used to snap the list back to Dashboard every time)
  useEffect(() => {
    const key = 'tb:nav-scroll';
    let y = 0;
    try { y = parseInt(sessionStorage.getItem(key) || '0', 10) || 0; } catch { /* ignore */ }
    const scrollers = Array.from(document.querySelectorAll('[data-nav-scroll]'));
    scrollers.forEach((el) => { if (y > 0) el.scrollTop = y; });
    const onScroll = (e) => {
      try { sessionStorage.setItem(key, String(e.target.scrollTop)); } catch { /* ignore */ }
    };
    scrollers.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }));
    return () => scrollers.forEach((el) => el.removeEventListener('scroll', onScroll));
  }, []);
  const goPricing = () => { setOpen(false); nav('/pricing'); };

  // Phone dock tabs: Dashboard · Terminal · Signals · TV · More.
  // Same lock + feature rules as the sidebar. Everything else lives
  // in the More sheet — no side list on phones.
  const lockFor = (to) => {
    for (const g of NAV_GROUPS) {
      const it = (g.items || []).find((i) => i.to === to);
      if (it) return (it.requiresSubscriber && !isSubscriber) || (it.requiredPlan && !meetsPlan(user, it.requiredPlan));
    }
    return false;
  };
  const MAIN_TABS = [
    { to: '/app', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/app/terminal-pro', icon: SquareTerminal, label: t('dock.terminal', null, 'Terminal') },
    { to: '/app/wallet', icon: Landmark, label: t('nav.wallet'), center: true },
    { to: '/app/funded', icon: Trophy, label: t('nav.funded') },
  ]
    .filter((m) => {
      const feature = featureForRoute(m.to);
      return !feature || features[feature] !== false || isAdmin;
    })
    .map((m) => ({ ...m, locked: lockFor(m.to) }));
  const mainActive = (to) => (to === '/app' ? loc.pathname === '/app' : (loc.pathname === to || loc.pathname.startsWith(`${to}/`)));
  const moreActive = moreOpen || !MAIN_TABS.some((m) => mainActive(m.to));
  const SHEET_SKIP = new Set(MAIN_TABS.map((m) => m.to));

  // Sheet hygiene: close on route change, lock body scroll + Esc to close.
  useEffect(() => { setMoreOpen(false); setSearchOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

  // Phone-only bottom dock: the FULL sidebar list (Dashboard first, then
  // every group, same visibility + lock rules) as thumb-sized docks. The
  // side list is gone on phones — the dock IS the navigation there.
  // Tablets/desktops are untouched — the dock renders below sm only.
  const visibleItems = (items) => (items || [])
    .filter((it) => !it.hidden)
    .filter((it) => !it.adminOnly || isAdmin)
    .filter((it) => {
      const feature = featureForRoute(it.to);
      return !feature || features[feature] !== false || isAdmin;
    })
    .map((it) => ({
      ...it,
      locked: (it.requiresSubscriber && !isSubscriber) || (it.requiredPlan && !meetsPlan(user, it.requiredPlan)),
    }));

  const SideContent = (
    <div className="flex h-full flex-col">
      <nav data-nav-scroll className="tbl-cascade flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items
            .filter((it) => !it.hidden)
            .filter((it) => !it.adminOnly || isAdmin)
            .filter((it) => {
              const feature = featureForRoute(it.to);
              return !feature || features[feature] !== false || isAdmin;
            });
          if (!items.length) return null;
          return (
            <div key={group.labelKey} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#5f5b50]">{t(group.labelKey)}</div>
              {items.map((it) => {
                const locked = (it.requiresSubscriber && !isSubscriber) || (it.requiredPlan && !meetsPlan(user, it.requiredPlan));
                return (
                  <NavItem
                    key={it.to}
                    to={it.to}
                    labelKey={it.labelKey}
                    icon={it.icon}
                    end={it.end}
                    locked={locked}
                    t={t}
                    onNav={locked ? goPricing : closeDrawer}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>
      {!isSubscriber && !isAdmin && (
        <div className="m-3 rounded-2xl border border-[#d4af37]/25 bg-gradient-to-b from-[#d4af37]/[0.08] to-transparent p-4">
          <div className="flex items-center gap-2 text-[#d4af37]"><Crown className="h-4 w-4" /><span className="text-xs font-bold">{t('app.upgrade')}</span></div>
          <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('bill.noPlanYet', null, 'Subscribe to unlock the full terminal.')}</p>
          <button onClick={() => nav('/app/billing')} className="mt-3 min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-xs font-bold text-[#0a0a0f] transition hover:opacity-90">{t('app.upgrade')}</button>
        </div>
      )}
      <div className="border-t border-white/5 px-3 py-3">
        <button onClick={() => { closeDrawer(); nav('/app'); }} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#8a8577] transition hover:bg-white/5 hover:text-[#e9e7df]"><LayoutDashboard className="h-[18px] w-[18px]" strokeWidth={1.9} />{t('nav.dashboard')}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-[var(--header-h)]">
      <aside className="tb-drawer fixed bottom-0 left-0 top-[calc(var(--header-h)+var(--apphead))] z-30 hidden w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl lg:block">{SideContent}</aside>
      {open && <div className="fixed inset-x-0 bottom-0 top-[calc(var(--header-h)+var(--apphead))] z-40 hidden bg-black/70 backdrop-blur-sm sm:block lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`tb-drawer fixed bottom-0 left-0 top-[calc(var(--header-h)+var(--apphead))] z-40 hidden w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform sm:flex lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>{SideContent}</aside>
      <div className="lg:pl-[280px]">
        {/* Phone header: solid two-row bar (compact row + full-width
            search). sm+ keeps the single-row translucent bar. */}
        <header className="app-header fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] w-full border-b border-white/[0.06] bg-[#0a0a0f] sm:bg-[#0a0a0f]/90 sm:backdrop-blur-2xl">
          {/* drifting gold hairline + slow light sweep */}
          <div aria-hidden className="app-header-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <div aria-hidden className="app-header-sheen pointer-events-none absolute inset-0 overflow-hidden" />
          <div className="flex h-14 w-full items-center justify-between gap-2 px-1 sm:gap-3 sm:px-2">
          {/* Left: menu + brand + page */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <button className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37] sm:grid lg:hidden" aria-label={t('app.openNav')} onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <img src={TRADINGBIBLE_LOGO} alt="" aria-hidden className="h-9 w-9 shrink-0 rounded-xl border border-[#d4af37]/40 bg-[#0c0c11] object-contain gold-glow sm:hidden" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <Link to={homeRouteForUser(user)} className="group hidden items-center gap-2.5 sm:flex" aria-label="TradingBible home">
              <span className="relative">
                <img
                  src={TRADINGBIBLE_LOGO}
                  alt="TradingBible"
                    className="h-9 w-9 rounded-xl border border-[#d4af37]/40 bg-[#0c0c11] object-contain transition duration-200 group-hover:scale-105 group-hover:border-[#d4af37]/70"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-2 ring-[#0a0a0f]" />
              </span>
              <span className="text-xl font-black leading-none tracking-tight text-[#f0ecdd]">Trading<span className="gold-text">Bible</span></span>
            </Link>
            <span aria-hidden className="hidden h-6 w-px bg-white/10 xl:block" />
            <h1 className="hidden min-w-0 truncate text-sm font-semibold text-[#c9c4b4] xl:block">{title}</h1>
            <div className="min-w-0 sm:hidden">
              <h1 className="tb-title truncate text-lg font-bold tracking-tight text-[#f0ecdd]">{title}</h1>
            </div>
          </div>

          {/* Center: Global Search (sm+ only — phones get a full-width row below) */}
          <div className="hidden min-w-0 flex-1 justify-center px-1 sm:flex sm:px-3">
            <div className="w-full max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          {/* Right: unified action cluster (theme/lang hidden on phones — they live in the drawer) */}
          <div className="flex min-w-0 flex-1 items-center justify-end">
          <div className="app-header-pill flex shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-md sm:gap-1.5 sm:p-1.5">
            {/* Phones: search is an overlay toggled here, not a fixed row */}
            <button onClick={() => setSearchOpen((o) => !o)} aria-label={t('nav.search', null, 'Search')} aria-expanded={searchOpen}
              className="hdr-ic grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37] sm:hidden">
              <Search className="h-4 w-4" />
            </button>
            <span className="hidden sm:contents"><ThemeSwitcher inline /></span>
            <span className="hidden sm:contents"><LanguageSwitcher /></span>
            {canSeeSignals && (
              <button onClick={() => nav('/app/alerts')} className="hdr-ic relative grid h-9 w-9 place-items-center rounded-full text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37]" title={t('app.alerts')}>
                <Bell className="h-4 w-4" />
                {unseen > 0 && <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">{unseen > 9 ? '9+' : unseen}</span>}
              </button>
            )}
            <button onClick={() => setTutorial(true)} aria-label={t('app.help')} title={t('app.help')} className="hidden h-9 w-9 place-items-center rounded-full text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37] sm:grid">
              <HelpCircle className="h-4 w-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1.5 text-left transition hover:bg-white/5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold text-[#0a0a0f] ring-1 ring-[#d4af37]/50">
                    {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#8a8577]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="tb-avatarmenu w-56 border-[#d4af37]/15 bg-[#111113] text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{t('app.account')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => nav('/app/profile')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <User className="h-4 w-4 text-[#d4af37]" /> {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/billing')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <CreditCard className="h-4 w-4 text-[#d4af37]" /> {t('nav.billing')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/affiliate')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <Share2 className="h-4 w-4 text-[#d4af37]" /> {t('nav.affiliate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/security')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <Settings className="h-4 w-4 text-[#d4af37]" /> {t('app.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/branding')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <Palette className="h-4 w-4 text-[#d4af37]" /> {t('nav.branding')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/api-keys')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <KeyRound className="h-4 w-4 text-[#d4af37]" /> {t('nav.apikeys')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => nav('/admin')} className="min-h-[44px] cursor-pointer gap-2.5">
                    <Building2 className="h-4 w-4 text-[#d4af37]" /> {t('app.admin')}
                  </DropdownMenuItem>
                )}
                {/* Phones only: theme + language live here — the compact
                    header row and the removed side list have no room. */}
                <DropdownMenuSeparator className="bg-white/5 sm:hidden" />
                <DropdownMenuItem onClick={toggleTheme} className="min-h-[44px] cursor-pointer gap-2.5 sm:hidden">
                  {isLight ? <Moon className="h-4 w-4 text-[#d4af37]" /> : <Sun className="h-4 w-4 text-[#d4af37]" />}
                  {isLight ? t('app.darkMode', null, 'Dark mode') : t('app.lightMode', null, 'Light mode')}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="min-h-[44px] gap-2.5 sm:hidden">
                    <Languages className="h-4 w-4 text-[#d4af37]" />
                    <span className="flex-1 text-left">{t('lang.switcher', null, 'Language')} · {String(lang || 'auto').toUpperCase()}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent side="left" align="start" className="tb-avatarmenu max-h-[50vh] w-48 overflow-y-auto border-[#d4af37]/15 bg-[#111113] text-[#e9e7df]">
                    <DropdownMenuItem onClick={() => setLang('auto')} className="min-h-[44px] cursor-pointer gap-2.5">
                      <span className="flex-1">{t('lang.auto', null, 'Auto')}</span>
                      {(() => { try { return !localStorage.getItem('tb_lang'); } catch { return false; } })() && <Check className="h-4 w-4 text-[#d4af37]" />}
                    </DropdownMenuItem>
                    {SUPPORTED_LANGS.map((l) => (
                      <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="min-h-[44px] cursor-pointer gap-2.5">
                        <span className="flex-1">{l.label}</span>
                        {lang === l.code && <Check className="h-4 w-4 text-[#d4af37]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={signOut} className="min-h-[44px] cursor-pointer gap-2.5 text-red-400 focus:text-red-300">
                  <LogOut className="h-4 w-4" /> {t('app.signout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
          </div>
          {/* Phones: search expands as an overlay panel under the bar */}
          {searchOpen && (
            <div className="tb-searchpanel absolute inset-x-0 top-full border-b border-white/[0.06] bg-[#0a0a0f] px-3 pb-3 pt-2 sm:hidden">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} /></div>
                <button onClick={() => setSearchOpen(false)} aria-label={t('c.close', null, 'Close')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-[#8a8577] transition hover:text-[#e9e7df]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-4 pb-24 pt-[calc(var(--apphead)+0.75rem)] sm:px-5 sm:pb-5 sm:pt-[92px] lg:px-7 lg:pt-[100px] xl:px-8 xl:pt-[104px] 2xl:px-12">
          {isAdmin && isAdminPreview() && (
            <div className="admin-frost mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-4 py-2">
              <span className="text-xs text-[#d4af37]">{t('misc.adminPreview')}</span>
              <button onClick={() => { exitAdminPreview(); nav('/admin'); }} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#d4af37]/30 px-3 py-1.5 text-xs font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10"><LogOut className="h-3.5 w-3.5" /> {t('misc.exitAdmin')}</button>
            </div>
          )}
          {children}
        </main>
        {/* Phone dock: 5 thumb tabs. Everything else lives in More —
            no side list on phones. Tablets/desktops untouched. */}
        {/* Phone dock backdrop: solid fade so page text never shows
            around or below the floating dock while scrolling. */}
        <div aria-hidden className="tb-dockfade pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent sm:hidden" />
        <nav aria-label="App sections" className="tb-dock fixed inset-x-4 bottom-3 z-40 rounded-[26px] border border-[#d4af37]/20 bg-[#101016] shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_24px_rgba(212,175,55,0.08)] ring-1 ring-inset ring-white/[0.06] sm:hidden">
          <div className="flex px-2 pb-2 pt-2">
            {MAIN_TABS.map((m) => {
              const Icon = m.icon;
              // Center hero action: raised gold circle breaking above the
              // dock line (TV/SI bubble style). Every cell shares one
              // geometry — fixed h-7 icon box + label — so all five
              // labels sit on the exact same baseline by construction.
              if (m.center) {
                const circleAt = 'absolute left-1/2 top-[-38px] -translate-x-1/2 dock-float';
                const circleBase = 'dock-ring relative grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br text-[#0a0a0f] ring-4 ring-[#101016] transition active:scale-90';
                return (
                  <div key={m.to} className="flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5">
                    <span className="relative grid h-8 w-full shrink-0 place-items-center">
                      {m.locked ? (
                        <button onClick={goPricing} aria-label={m.label} className={circleAt}>
                          <span className={`${circleBase} from-[#f4e6a8] to-[#c99a25] shadow-[0_10px_26px_rgba(212,175,55,0.45)]`}>
                            <Icon className="h-7 w-7" strokeWidth={2} />
                            <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-[#0a0a0f] ring-2 ring-[#d4af37]" title="Locked">
                              <Crown className="h-3 w-3 text-[#d4af37]" />
                            </span>
                          </span>
                        </button>
                      ) : (
                        <NavLink to={m.to} aria-label={m.label} className={circleAt}>
                          {({ isActive }) => (
                            <span className={`${circleBase} from-[#f4e6a8] to-[#c99a25] ${isActive ? 'dock-glow' : 'shadow-[0_10px_26px_rgba(212,175,55,0.45)]'}`}>
                              <Icon className="h-7 w-7" strokeWidth={2.1} />
                            </span>
                          )}
                        </NavLink>
                      )}
                    </span>
                  </div>
                );
              }
              const btn = 'dock-tab flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl transition active:scale-95';
              const pill = 'grid h-8 min-w-[52px] shrink-0 place-items-center rounded-full px-4 transition';
              const lbl = 'truncate text-[10px] font-semibold leading-none';
              if (m.locked) {
                return (
                  <button key={m.to} onClick={goPricing} aria-label={m.label} className={`${btn} text-[#8a8577]/70`}>
                    <span className={`${pill} text-[#8a8577]/70`}>
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                    </span>
                    <span className={`${lbl} text-[#8a8577]/70`}>{m.label}</span>
                  </button>
                );
              }
              return (
                <NavLink key={m.to} to={m.to} end={m.end} aria-label={m.label}
                  className={`${btn}`}>
                  {({ isActive }) => (
                    <>
                      <span key={isActive ? 'on' : 'off'} className={`${pill} ${isActive ? 'pill-on dock-pop bg-[#d4af37]/20 text-[#d4af37] shadow-[inset_0_0_12px_rgba(212,175,55,0.15)]' : 'text-[#8a8577]'}`}>
                        <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                      </span>
                      <span className={`${lbl} ${isActive ? 'lbl-on text-[#d4af37]' : 'text-[#8a8577]'}`}>{m.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            <button onClick={() => setMoreOpen((o) => !o)} aria-label={t('dock.more', null, 'More')} aria-expanded={moreOpen}
              className="dock-tab flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl transition active:scale-95">
              <span className={`grid h-8 min-w-[52px] shrink-0 place-items-center rounded-full px-4 transition ${moreActive ? 'pill-on bg-[#d4af37]/20 text-[#d4af37] shadow-[inset_0_0_12px_rgba(212,175,55,0.15)]' : 'text-[#8a8577]'}`}>
                <span className={`grid place-items-center transition-transform duration-300 ${moreOpen ? 'rotate-90' : ''}`}>
                  {moreOpen ? <X className="h-[22px] w-[22px]" strokeWidth={1.9} /> : <Menu className="h-[22px] w-[22px]" strokeWidth={1.9} />}
                </span>
              </span>
              <span className={`truncate text-[10px] font-semibold leading-none ${moreActive ? 'lbl-on text-[#d4af37]' : 'text-[#8a8577]'}`}>{t('dock.more', null, 'More')}</span>
            </button>
          </div>
        </nav>
        {/* Phone More sheet: the full list, grouped, one tap away. */}
        {moreOpen && (
          <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label={t('dock.more', null, 'More')}>
            <div className="dock-fade absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
            <div className="tb-sheet dock-sheet-up absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-[#d4af37]/25 bg-[#0a0a0f] px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="sticky top-0 bg-[#0a0a0f] pb-2 pt-2.5">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" aria-hidden />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#f0ecdd]">{t('dock.more', null, 'More')}</span>
                  <button onClick={() => setMoreOpen(false)} aria-label={t('c.close', null, 'Close')}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[#8a8577] transition hover:text-[#e9e7df]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-5 pb-4">
                {NAV_GROUPS.map((group) => {
                  const items = visibleItems(group.items).filter((it) => !SHEET_SKIP.has(it.to));
                  if (!items.length) return null;
                  return (
                    <div key={group.labelKey}>
                      <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#5f5b50]">{t(group.labelKey)}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {items.map((it) => {
                          const Icon = it.icon;
                          const label = t(it.labelKey);
                          const tile = 'tile flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition active:scale-95';
                          if (it.locked) {
                            return (
                              <button key={it.to} onClick={() => { setMoreOpen(false); goPricing(); }} aria-label={label} className={`${tile} border-white/5 text-[#8a8577]/70`}>
                                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{label}</span>
                                <Crown className="h-3 w-3 shrink-0 text-[#d4af37]" />
                              </button>
                            );
                          }
                          return (
                            <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMoreOpen(false)} aria-label={label}
                              className={({ isActive }) => `${tile} sheet-row ${isActive ? 'sheet-on border-[#d4af37]/50 bg-[#d4af37]/12 text-[#f0ecdd]' : 'border-white/5 text-[#8a8577] hover:border-[#d4af37]/30'}`}>
                              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} />
                              <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      {tutorial && <OnboardingTutorial onClose={() => setTutorial(false)} onComplete={completeTutorial} />}
    </div>
  );
}
