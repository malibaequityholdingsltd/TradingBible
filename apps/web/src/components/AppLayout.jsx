import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Plug, Crown, User, LogOut, Menu, BarChart3, FileText, Calculator, Users, GraduationCap, Code2, Palette, CreditCard, HelpCircle, Bell, Radar, CalendarClock, Landmark, KeyRound, Building2, Settings, ChevronDown, Trophy, Share2, Compass, FlaskConical, Medal, Briefcase, SquareTerminal, Star, Coins, X, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl } from '@/lib/avatar';
import { displayInitial } from '@/lib/displayName';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n } from '@/lib/i18n';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import GlobalSearch from '@/components/GlobalSearch';
import ThemePickerDialog from '@/components/ThemePickerDialog';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { BrandWordmark, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { IosIcon, IOS_TINTS as IOS } from '@/components/IosIcon';
import { homeRouteForUser } from '@/lib/homeRoute';
import { meetsPlan } from '@/lib/entitlements';
import { isAdminPreview, exitAdminPreview } from '@/lib/adminPreview';
import { WL_PRESETS, WL_DEFAULTS, applyWhiteLabel, loadLocalTheme, saveLocalTheme } from '@/lib/whitelabel';
import { usePlatformSettings, featureForRoute } from '@/lib/platformSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// The portal chrome is mounted once by <PersistentChrome> and survives route
// changes. Pages still render <AppLayout> for their title and content rhythm;
// that inner instance hands the title to this mounted shell and renders only
// its page body, so the header and dock never unmount between sections.
const AppChromeTitleContext = createContext(null);

export function AppChromeShell({ children }) {
  const [title, setTitle] = useState('');
  return (
    <AppLayoutContent title={title || 'TradingBible'}>
      <AppChromeTitleContext.Provider value={setTitle}>{children}</AppChromeTitleContext.Provider>
    </AppLayoutContent>
  );
}

// Muted tint set for navigation glyphs. The glyph carries the colour;
// surfaces stay quiet so the navigation reads as one system.
const NAV_GROUPS = [
  {
    labelKey: 'nav.trade',
    items: [
      { to: '/app/terminal-pro', labelKey: 'nav.terminalPro', icon: SquareTerminal, tint: IOS.blue },
      { to: '/app/journal', labelKey: 'nav.journal', icon: BookOpen, tint: IOS.orange },
      { to: '/app/challenges', labelKey: 'nav.challenges', icon: Trophy, tint: IOS.purple },
      { to: '/app/paper', labelKey: 'nav.paper', icon: FlaskConical, tint: IOS.green },
      { to: '/app/brokers', labelKey: 'nav.brokers', icon: Plug, tint: IOS.gray },
      { to: '/app/wallet', labelKey: 'nav.wallet', icon: Landmark, requiresSubscriber: true, tint: IOS.teal },    ],
  },
  {
    labelKey: 'nav.analyze',
    items: [
      { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3, tint: IOS.pink },
      { to: '/app/backtest', labelKey: 'nav.backtest', icon: FlaskConical, tint: IOS.indigo },
      { to: '/app/reports', labelKey: 'nav.reports', icon: FileText, requiresSubscriber: true, requiredPlan: 'elite', tint: IOS.red },
      { to: '/app/tools', labelKey: 'nav.tools', icon: Calculator, requiresSubscriber: true, tint: IOS.gray },
    ],
  },
  {
    labelKey: 'nav.markets',
    items: [
      { to: '/app/watchlists', labelKey: 'nav.watchlists', icon: Star, tint: IOS.gold },
      { to: '/app/signals', labelKey: 'nav.signals', icon: Radar, tint: IOS.orange },
      { to: '/app/staking', labelKey: 'nav.staking', icon: Coins, tint: IOS.green },
      { to: '/app/tbc', labelKey: 'nav.tbc', icon: Coins, tint: IOS.gold },
      { to: '/investors', labelKey: 'nav.investors', label: 'Investor relations', icon: Landmark, tint: IOS.gold },
      { to: '/leaderboard', labelKey: 'nav.leaderboard', icon: Medal, tint: IOS.purple },
      { to: '/app/economic-calendar', labelKey: 'nav.economic', icon: CalendarClock, tint: IOS.indigo },
    ],
  },
  {
    labelKey: 'nav.learn',
    items: [
      { to: '/app/guide', labelKey: 'nav.guide', icon: Compass, tint: IOS.teal },
      { to: '/app/mentors', labelKey: 'nav.mentors', icon: Briefcase, tint: IOS.brown },
      { to: '/app/community', labelKey: 'nav.community', icon: Users, tint: IOS.blue },
      { to: '/app/academy', labelKey: 'nav.academy', icon: GraduationCap, tint: IOS.red },
      { to: '/app/api-docs', labelKey: 'nav.apidocs', icon: Code2, requiresSubscriber: true, requiredPlan: 'professional', tint: IOS.gray },
    ],
  },
];

function Brand({ homeTo, platformName, tagline }) {
  const { t } = useI18n();
  const words = String(platformName || 'TradingBible SI').trim().split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';
  return (
    <Link to={homeTo} className="group flex items-center gap-2.5">
      <BrandWordmark size={32} showTagline={false} />
      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f]" />
    </Link>
  );
}

export default function AppLayout({ children, title }) {
  const setShellTitle = useContext(AppChromeTitleContext);
  useLayoutEffect(() => {
    if (setShellTitle) setShellTitle(title || '');
  }, [setShellTitle, title]);
  if (setShellTitle) return children;
  return <AppLayoutContent title={title}>{children}</AppLayoutContent>;
}

function AppLayoutContent({ children, title }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  // One-click app themes (everyone, every plan): accent + text colors apply
  // instantly across the full app, in dark and light. Identity fields
  // (company/logo) stay in the Branding studio.
  const [presetId, setPresetId] = useState(() => {
    try {
      const saved = loadLocalTheme();
      if (!saved) return 'tb-gold';
      const hit = WL_PRESETS.find((pr) => (pr.accentColor || '').toLowerCase() === (saved.accentColor || '').toLowerCase());
      return hit ? hit.id : 'custom';
    } catch { return 'tb-gold'; }
  });
  const [themeOpen, setThemeOpen] = useState(false);
  const [presetAccent, setPresetAccent] = useState(() => {
    try { return loadLocalTheme()?.accentColor || WL_DEFAULTS.accentColor; } catch { return WL_DEFAULTS.accentColor; }
  });
  const pickPreset = (pr) => {
    const base = (() => { try { return loadLocalTheme() || WL_DEFAULTS; } catch { return WL_DEFAULTS; } })();
    const next = { ...base, accentColor: pr.accentColor, headingColor: pr.headingColor, bodyColor: pr.bodyColor, mutedColor: pr.mutedColor, primaryColor: pr.primaryColor };
    applyWhiteLabel(next);
    saveLocalTheme(next);
    setPresetId(pr.id);
    setPresetAccent(pr.accentColor);
  };
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout, updateProfile } = useAuth();
  const { unseen } = useNotifications();
  const { t } = useI18n();
  const { features } = usePlatformSettings();
  const initial = displayInitial(user);
  const signOut = () => { logout(); nav('/'); };

  const isAdmin = user?.role === 'admin';
  const isSubscriber = isAdmin || ['pro', 'elite', 'professional'].includes((user?.plan || '').toLowerCase());
  const canSeeSignals = isAdmin || features.signals !== false;
  const avatar = avatarUrl(user);
  const homeTo = homeRouteForUser(user);

  useEffect(() => {
    if (!user) return;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem('tb:tour-dismissed') === '1'; } catch { /* ignore */ }
    if (dismissed || user.tutorialDone === true) return;
    // Only brand-new accounts get the auto tour — existing users were
    // force-prompted by a DB default of false. They can still open it
    // anytime from the Help button.
    const created = Date.parse(user.created || '') || 0;
    const fresh = !created || (Date.now() - created) < 14 * 864e5;
    if (fresh) setTutorial(true);
  }, [user]);

  const dismissTutorial = () => {
    try { window.localStorage.setItem('tb:tour-dismissed', '1'); } catch { /* ignore */ }
    updateProfile({ tutorialDone: true }).catch(() => {});
    setTutorial(false);
  };
  const completeTutorial = () => {
    try { window.localStorage.setItem('tb:tour-dismissed', '1'); } catch { /* ignore */ }
    updateProfile({ tutorialDone: true }).catch(() => {});
    setTutorial(false);
  };
  const goPricing = () => nav('/pricing');
  const menuIcon = (Icon, tone) => <IosIcon icon={Icon} size="2xs" tone={tone} />;

  // Phone dock: Terminal · Wallet · Dashboard (raised centre) · Challenges · More.
  // Everything else lives in the More sheet — no side list on phones.
  const lockFor = (to) => {
    for (const g of NAV_GROUPS) {
      const it = (g.items || []).find((i) => i.to === to);
      if (it) return (it.requiresSubscriber && !isSubscriber) || (it.requiredPlan && !meetsPlan(user, it.requiredPlan));
    }
    return false;
  };
  const MAIN_TABS = [
    { to: '/app/terminal-pro', icon: SquareTerminal, label: t('dock.terminal', null, 'Terminal'), tint: IOS.indigo },
    { to: '/app/wallet', icon: Landmark, label: t('nav.wallet'), tint: IOS.teal },
    { to: '/app', icon: LayoutDashboard, label: t('nav.dashboard'), end: true, center: true, tint: IOS.gold },
    { to: '/app/challenges', icon: Trophy, label: t('nav.challenges'), tint: IOS.orange },
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

  // Phone-only bottom dock: the core tabs, with Dashboard raised at the
  // centre. Tablets and desktops use the footer row instead.
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

  const footerItems = NAV_GROUPS.flatMap((group) => visibleItems(group.items));
  const footerSplit = Math.ceil(footerItems.length / 2);
  const footerLeft = footerItems.slice(0, footerSplit);
  const footerRight = footerItems.slice(footerSplit);

  const dashboardLabel = t('nav.dashboard');
  const dashboardActive = loc.pathname === '/app' || loc.pathname === '/app/';
  const renderDashboardOrb = (compact = false) => (
    <div className={`nav-dashboard-slot ${compact ? 'nav-dashboard-slot--compact' : ''}`}>
      <NavLink
        to="/app"
        end
        aria-label={dashboardLabel}
        aria-current={dashboardActive ? 'page' : undefined}
        className="nav-dashboard-orb"
      >
        <span aria-hidden className="nav-dashboard-halo" />
        <span aria-hidden className="nav-dashboard-orbit" />
        <IosIcon
          icon={LayoutDashboard}
          size="2xl"
          tint={IOS.gold}
          glyph="#1C1C1E"
          className="nav-dashboard-icon"
        />
        <span aria-hidden className="nav-dashboard-spark" />
      </NavLink>
    </div>
  );

  const renderFooterItem = (it, index) => {
    const label = it.label || t(it.labelKey);
    const base = 'app-nav-footer-link group relative flex h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/60';
    const tile = (
      <span className="relative">
        <IosIcon
          icon={it.icon}
          tint={IOS.gold}
          glyph="#1C1C1E"
          size="md"
          className={`nav-medallion ${it.locked ? 'opacity-60 saturate-[0.7]' : ''}`}
        />
        {it.locked && <Crown className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-[#0a0a0f] p-[2px] text-[#d4af37] ring-1 ring-[#d4af37]/40" />}
      </span>
    );
    const labelEl = <span className="app-nav-footer-label hidden max-w-full truncate px-0.5 text-[8px] font-semibold leading-none xl:block">{label}</span>;
    const tooltip = (
      <span className="pointer-events-none absolute bottom-[calc(100%+3px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#d4af37]/25 bg-[#0a0a0f] px-2 py-1 text-[10px] font-semibold text-[#f0ecdd] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 xl:hidden">
        {label}{it.locked ? ' · upgrade' : ''}
      </span>
    );
    if (it.locked) {
      return (
        <button
          key={it.to}
          type="button"
          onClick={goPricing}
          aria-label={`${label} — upgrade required`}
          className={base}
          style={{ '--nav-i': index }}
        >
          {tooltip}
          {tile}
          {labelEl}
        </button>
      );
    }
    return (
      <NavLink
        key={it.to}
        to={it.to}
        end={it.end}
        aria-label={label}
        style={{ '--nav-i': index }}
        className={({ isActive }) => `${base} ${isActive ? 'app-nav-footer-link--active' : ''}`}
      >
        {tooltip}
        {tile}
        {labelEl}
      </NavLink>
    );
  };

  const FooterNav = (
    <footer className="app-nav-footer fixed inset-x-0 bottom-0 z-40 hidden backdrop-blur-xl lg:block">
      <span aria-hidden className="app-nav-footer-sheen" />
      <nav
        aria-label="App sections"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
        className="relative z-[1] mx-auto flex w-full max-w-none items-stretch justify-center px-2 pt-1.5 sm:px-3 xl:px-5 2xl:px-8"
      >
        <div className="flex min-w-0 flex-1 items-stretch justify-end">
          {footerLeft.map((it, i) => renderFooterItem(it, i))}
        </div>
        {renderDashboardOrb()}
        <div className="flex min-w-0 flex-1 items-stretch justify-start">
          {footerRight.map((it, i) => renderFooterItem(it, i + footerSplit))}
        </div>
      </nav>
    </footer>
  );

  return (
    <div className="tb-app-shell min-h-screen bg-transparent pt-[var(--header-h)] tabular-nums antialiased">
      <div>
        {/* Phone header: solid two-row bar (compact row + full-width
            search). sm+ keeps the single-row translucent bar. */}
        <header className="app-header fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] w-full border-b border-white/[0.06] bg-[#0a0a0f] tabular-nums sm:bg-[#0a0a0f]/90 sm:backdrop-blur-2xl">
          {/* drifting gold hairline + slow light sweep */}
          <div aria-hidden className="app-header-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <div aria-hidden className="app-header-sheen pointer-events-none absolute inset-0 overflow-hidden" />
          <div className="flex h-14 w-full items-center justify-between gap-2 px-1 sm:gap-3 sm:px-2">
          {/* Left: brand + page */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <img src={TRADINGBIBLE_LOGO} alt="" aria-hidden className="app-header-mobile-logo h-8 w-8 shrink-0 rounded-[10px] border border-[#d4af37]/25 bg-[#0c0c11] object-contain gold-glow sm:hidden" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <Link to={homeRouteForUser(user)} className="group hidden items-center gap-2.5 sm:flex" aria-label="TradingBible home">
              <span className="relative">
                <img
                  src={TRADINGBIBLE_LOGO}
                  alt="TradingBible"
                    className="h-8 w-8 rounded-[10px] border border-[#d4af37]/25 bg-[#0c0c11] object-contain transition duration-200 group-hover:scale-105 group-hover:border-[#d4af37]/50"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 tabular-nums shadow-[0_0_8px_rgba(52,211,153,0.9)] ring-2 ring-[#0a0a0f]" />
              </span>
              <span className="text-xl font-black leading-none tracking-tight text-[#f0ecdd]">Trading<span className="gold-text">Bible</span></span>
            </Link>
            <span aria-hidden className="hidden h-6 w-px bg-white/10 xl:block" />
            <h1 className="hidden min-w-0 truncate text-sm font-semibold text-[#c9c4b4] sm:block">{title}</h1>
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

          {/* Right: unified action cluster — theme and language stay one tap away at every width. */}
          <div className="flex min-w-0 flex-1 items-center justify-end">
          <div className="app-header-pill flex shrink-0 items-center gap-1 rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-1 tabular-nums backdrop-blur-md sm:gap-1.5 sm:p-1.5">
            {/* Phones: search is an overlay toggled here, not a fixed row */}
            <button onClick={() => setSearchOpen((o) => !o)} aria-label={t('nav.search', null, 'Search')} aria-expanded={searchOpen}
              className="hdr-ic grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37] sm:hidden">
              <IosIcon icon={Search} size="sm" tone="theme" />
            </button>
            <ThemeSwitcher inline className="hdr-ic hover:bg-[#d4af37]/10" />
            <LanguageSwitcher className="hdr-ic hover:bg-[#d4af37]/10" />
            {canSeeSignals && (
              <button onClick={() => nav('/app/alerts')} className="hdr-ic relative grid h-9 w-9 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37]" title={t('app.alerts')}>
                <IosIcon icon={Bell} size="sm" tone="theme" />
                {unseen > 0 && <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold tabular-nums text-white">{unseen > 9 ? '9+' : unseen}</span>}
              </button>
            )}
            <button onClick={() => setTutorial(true)} aria-label={t('app.help')} title={t('app.help')} className="hidden h-9 w-9 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37] sm:grid">
              <IosIcon icon={HelpCircle} size="sm" tone="theme" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-[10px] py-0.5 pl-0.5 pr-1.5 text-left transition hover:bg-white/5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold tabular-nums text-[#0a0a0f] ring-1 ring-[#d4af37]/40">
                    {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#d4af37]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="tb-avatarmenu w-56 rounded-[10px] border-[#d4af37]/15 bg-[#111113] tabular-nums text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{t('app.account')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => nav('/app/profile')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(User, 'blue')} {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/billing')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(CreditCard, 'green')} {t('nav.billing')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/affiliate')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(Share2, 'purple')} {t('nav.affiliate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/security')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(Settings, 'gray')} {t('app.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/branding')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(Palette, 'pink')} {t('nav.branding')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setThemeOpen(true)} className="min-h-[44px] cursor-pointer gap-2.5">
                  <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] ring-1 ring-white/25" style={{ background: presetAccent }} />
                  <span className="flex-1">{t('brd.themes', null, 'App theme')} · {(WL_PRESETS.find((pr) => pr.id === presetId)?.label || t('brd.custom', null, 'Custom')).split(' ').slice(-1)}</span>
                  <span className="font-mono text-[11px] text-[#5f5b50]">›</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/api-keys')} className="min-h-[44px] cursor-pointer gap-2.5">
                  {menuIcon(KeyRound, 'orange')} {t('nav.apikeys')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => nav('/admin')} className="min-h-[44px] cursor-pointer gap-2.5">
                    {menuIcon(Building2, 'red')} {t('app.admin')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={signOut} className="min-h-[44px] cursor-pointer gap-2.5 text-red-400 focus:text-red-300">
                  {menuIcon(LogOut, 'red')} {t('app.signout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemePickerDialog open={themeOpen} onOpenChange={setThemeOpen} activeId={presetId} onPick={pickPreset} />
          </div>
          </div>
          </div>
          {/* Phones: search expands as an overlay panel under the bar */}
          {searchOpen && (
            <div className="tb-searchpanel absolute inset-x-0 top-full border-b border-white/[0.06] bg-[#0a0a0f] px-3 pb-3 pt-2 sm:hidden">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} /></div>
                <button onClick={() => setSearchOpen(false)} aria-label={t('c.close', null, 'Close')}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-white/10 text-[#8a8577] transition hover:text-[#e9e7df]">
                  <IosIcon icon={X} size="2xs" tone="gray" />
                </button>
              </div>
            </div>
          )}
        </header>
        <main className="mx-auto w-full max-w-none px-1.5 pb-24 pt-[calc(var(--apphead)+0.75rem)] sm:px-2 sm:pt-[92px] lg:px-2 lg:pt-[100px] xl:px-2.5 xl:pt-[104px] 2xl:px-3">
          {isAdmin && isAdminPreview() && (
            <div className="admin-frost mb-2 flex items-center justify-between gap-3 rounded-[10px] border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-4 py-2 tabular-nums">
              <span className="text-xs text-[#d4af37]">{t('misc.adminPreview')}</span>
              <button onClick={() => { exitAdminPreview(); nav('/admin'); }} className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#d4af37]/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-[#d4af37] transition hover:bg-[#d4af37]/10"><LogOut className="h-3.5 w-3.5" /> {t('misc.exitAdmin')}</button>
            </div>
          )}
          {children}
        </main>
        {FooterNav}
        {/* Phone dock: 5 thumb tabs. Everything else lives in More —
            no side list on phones. Tablets/desktops untouched. */}
        {/* Phone dock backdrop: solid fade so page text never shows
            around or below the floating dock while scrolling. */}
        <div aria-hidden className="tb-dockfade pointer-events-none fixed inset-x-0 bottom-0 z-30 h-36 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent lg:hidden" />
        <nav aria-label="App sections" className="tb-dock fixed inset-x-4 bottom-3 z-40 rounded-[10px] border border-[#d4af37]/15 bg-[#101016] tabular-nums shadow-[0_12px_32px_rgba(0,0,0,0.55),0_0_20px_rgba(212,175,55,0.06)] ring-1 ring-inset ring-white/[0.06] lg:hidden">
          <div className="flex px-2 pb-2 pt-2">
            {MAIN_TABS.map((m, idx) => {
              const Icon = m.icon;
              // Dashboard is the raised hero: a gold medallion that breaks
              // above the dock line, with its own orbit + halo motion.
              if (m.center) {
                return <React.Fragment key={m.to}>{renderDashboardOrb(true)}</React.Fragment>;
              }
              const btn = 'dock-tab ios-spring flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[10px] tabular-nums';
              const pill = 'relative grid h-11 min-w-[52px] shrink-0 place-items-center rounded-[12px] transition';
              const lbl = 'max-w-full truncate text-[10px] font-semibold tabular-nums leading-none';
              if (m.locked) {
                return (
                  <button key={m.to} onClick={goPricing} aria-label={`${m.label} — upgrade required`} style={{ '--nav-i': idx }} className={`${btn} text-[#8a8577]/70`}>
                    <span className={`${pill} text-[#8a8577]/70`}>
                      <IosIcon icon={Icon} tint={IOS.gold} glyph="#1C1C1E" size="md" className="nav-medallion opacity-60 saturate-[0.7]" />
                      <Crown className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-[#0a0a0f] p-[1.5px] text-[#d4af37] ring-1 ring-[#d4af37]/40" />
                    </span>
                    <span className={`${lbl} text-[#8a8577]/70`}>{m.label}</span>
                  </button>
                );
              }
              return (
                <NavLink key={m.to} to={m.to} end={m.end} aria-label={m.label}
                  style={{ '--nav-i': idx }} className={`${btn}`}>
                  {({ isActive }) => (
                    <>
                      <span key={isActive ? 'on' : 'off'} className={`${pill} ${isActive ? 'dock-pop' : ''}`}>
                        <IosIcon icon={Icon} tint={IOS.gold} glyph="#1C1C1E" size="md" className="nav-medallion" />
                      </span>
                      <span className={`${lbl} ${isActive ? 'lbl-on' : 'text-[#8a8577]'}`}>{m.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            <button onClick={() => setMoreOpen((o) => !o)} aria-label={t('dock.more', null, 'More')} aria-expanded={moreOpen}
              style={{ '--nav-i': MAIN_TABS.length }} className="dock-tab ios-spring flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl">
              <span className="relative grid h-11 min-w-[52px] shrink-0 place-items-center rounded-[12px] transition">
                <IosIcon icon={moreOpen ? X : Menu} tint={IOS.gold} glyph="#1C1C1E" size="md" className="nav-medallion" />
              </span>
              <span className={`truncate text-[10px] font-semibold leading-none ${moreActive ? 'lbl-on' : 'text-[#8a8577]'}`}>{t('dock.more', null, 'More')}</span>
            </button>
          </div>
        </nav>
        {/* Phone More sheet: the full list, grouped, one tap away. */}
        {moreOpen && (
          <div className="fixed inset-0 z-[85] lg:hidden" role="dialog" aria-modal="true" aria-label={t('dock.more', null, 'More')}>
            <div className="dock-fade absolute inset-0 bg-black/70" onClick={() => setMoreOpen(false)} />
            <div className="tb-sheet dock-sheet-up absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[10px] border-t border-[#d4af37]/20 bg-[#0a0a0f] px-4 tabular-nums pb-[env(safe-area-inset-bottom)]">
              <div className="sticky top-0 bg-[#0a0a0f] pb-2 pt-2.5">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" aria-hidden />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tabular-nums text-[#f0ecdd]">{t('dock.more', null, 'More')}</span>
                  <button onClick={() => setMoreOpen(false)} aria-label={t('c.close', null, 'Close')}
                    className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 text-[#8a8577] transition hover:text-[#e9e7df]">
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
                      <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#5f5b50] tabular-nums">{t(group.labelKey)}</div>
                      <div className="grid grid-cols-3 gap-2">
                        {items.map((it) => {
                          const Icon = it.icon;
                          const label = it.label || t(it.labelKey);
                          const tile = 'tile ios-spring flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-[10px] border px-1 py-3 text-center tabular-nums';
                          const iosTile = (
                            <IosIcon icon={Icon} tint={it.tint} glyph={it.glyph} size="sm" className="shadow-[0_1px_6px_rgba(0,0,0,0.35)]" />
                          );
                          if (it.locked) {
                            return (
                              <button key={it.to} onClick={() => { setMoreOpen(false); goPricing(); }} aria-label={label} className={`${tile} border-white/5 text-[#8a8577]/70`}>
                                {iosTile}
                                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">{label}</span>
                                <Crown className="h-3 w-3 shrink-0 text-[#d4af37]" />
                              </button>
                            );
                          }
                          return (
                            <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMoreOpen(false)} aria-label={label}
                              className={({ isActive }) => `${tile} sheet-row ${isActive ? 'sheet-on border-[#d4af37]/40 bg-[#d4af37]/[0.10] text-[#f0ecdd] ring-1 ring-inset ring-[#d4af37]/25' : 'border-white/5 text-[#8a8577] hover:border-[#d4af37]/25'}`}>
                              {iosTile}
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
      {tutorial && <OnboardingTutorial onClose={dismissTutorial} onComplete={completeTutorial} />}
    </div>
  );
}
