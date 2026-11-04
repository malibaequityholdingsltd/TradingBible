import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, SquareTerminal, BookOpen, Trophy, FlaskConical, Plug, Wallet,
  Radar, Grid2x2, Activity, CalendarClock, Coins, Medal, Landmark, BarChart3,
  FileText, Calculator, Code2, GraduationCap, Bot, Users, Compass, MonitorPlay,
  CreditCard, Share2, ShieldCheck, Palette, KeyRound, User, Settings, LogOut,
  Menu, Search, Bell, HelpCircle, ChevronDown, PanelLeftClose, PanelLeftOpen,
  X, Plus, ArrowDownToLine, ArrowUpRight, RefreshCw, Crown, Building2,
  MessageCircle, LifeBuoy, Check,
} from 'lucide-react';
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
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
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
// its page body, so the sidebar and dock never unmount between sections.
const AppChromeTitleContext = createContext(null);

export function AppChromeShell({ children }) {
  const [title, setTitle] = useState('');
  return (
    <AppLayoutContent title={title || 'TradingBible'}>
      <AppChromeTitleContext.Provider value={setTitle}>{children}</AppChromeTitleContext.Provider>
    </AppLayoutContent>
  );
}

const NAV_GROUPS = [
  {
    label: 'Trade',
    items: [
      { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/terminal-pro', labelKey: 'nav.terminalPro', icon: SquareTerminal },
      { to: '/app/journal', labelKey: 'nav.journal', icon: BookOpen },
      { to: '/app/challenges', labelKey: 'nav.challenges', icon: Trophy },
      { to: '/app/paper', labelKey: 'nav.paper', icon: FlaskConical },
      { to: '/app/brokers', labelKey: 'nav.brokers', icon: Plug },
      { to: '/app/wallet', labelKey: 'nav.wallet', icon: Wallet, requiresSubscriber: true },
    ],
  },
  {
    label: 'Markets',
    items: [
      { to: '/app/signals', labelKey: 'nav.signals', icon: Radar },
      { to: '/app/heatmaps', labelKey: 'nav.heatmaps', icon: Grid2x2, requiresSubscriber: true },
      { to: '/app/orderflow', labelKey: 'nav.orderflow', icon: Activity, requiresSubscriber: true },
      { to: '/app/economic-calendar', labelKey: 'nav.economic', icon: CalendarClock },
      { to: '/app/staking', labelKey: 'nav.staking', icon: Coins },
      { to: '/leaderboard', labelKey: 'nav.leaderboard', icon: Medal },
      { to: '/app/investors', label: 'Investor access', icon: Landmark },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: '/app/reports', labelKey: 'nav.reports', icon: FileText, requiresSubscriber: true, requiredPlan: 'elite' },
      { to: '/app/tools', labelKey: 'nav.tools', icon: Calculator, requiresSubscriber: true },
      { to: '/app/backtest', labelKey: 'nav.backtest', icon: FlaskConical },
      { to: '/app/api-docs', labelKey: 'nav.apidocs', icon: Code2, requiresSubscriber: true, requiredPlan: 'professional' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/app/academy', labelKey: 'nav.academy', icon: GraduationCap },
      { to: '/app/coach', labelKey: 'nav.coach', icon: Bot, requiredPlan: 'elite' },
      { to: '/app/community', labelKey: 'nav.community', icon: Users },
      { to: '/app/guide', labelKey: 'nav.guide', icon: Compass },
      { to: '/tv', label: 'TradingBible TV', icon: MonitorPlay },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/app/billing', labelKey: 'nav.billing', icon: CreditCard },
      { to: '/app/affiliate', labelKey: 'nav.affiliate', icon: Share2 },
      { to: '/app/security', labelKey: 'app.settings', icon: ShieldCheck },
      { to: '/app/branding', labelKey: 'nav.branding', icon: Palette, requiredPlan: 'professional' },
      { to: '/app/api-keys', labelKey: 'nav.apikeys', icon: KeyRound, requiredPlan: 'professional' },
      { to: '/app/profile', labelKey: 'nav.profile', icon: User },
    ],
  },
];

const DOCK = [
  { to: '/app/terminal-pro', labelKey: 'nav.terminalPro', icon: SquareTerminal },
  { to: '/app/wallet', labelKey: 'nav.wallet', icon: Wallet, requiresSubscriber: true },
  { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, center: true },
  { to: '/app/challenges', labelKey: 'nav.challenges', icon: Trophy },
];

function SidebarBrand({ homeTo, collapsed, onToggle }) {
  return (
    <div className="ex-sidebar__brand">
      <Link to={homeTo} className="flex min-w-0 items-center gap-2.5" aria-label="TradingBible home">
        <span className="ex-sidebar__mark">
          <img
            src={TRADINGBIBLE_LOGO}
            alt=""
            aria-hidden
            className="h-full w-full object-contain p-1"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        </span>
        <span className="ex-sidebar__brand-text">
          <strong>TradingBible</strong>
          <span>Exchange terminal</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        className="ex-icon-btn ml-auto hidden xl:inline-grid"
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>
    </div>
  );
}

function NavItem({ item, active, locked, onLocked }) {
  const Icon = item.icon;
  const label = item.label || item.labelKey;
  const className = `ex-nav-item${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`;

  if (locked) {
    return (
      <button type="button" onClick={onLocked} className={className} title={`${label} — upgrade required`}>
        <Icon aria-hidden />
        <span className="ex-nav-item__label">{label}</span>
        <Crown aria-hidden className="ml-auto h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <NavLink to={item.to} end={item.end} className={className} title={label}>
      <Icon aria-hidden />
      <span className="ex-nav-item__label">{label}</span>
      {item.badge ? <span className="ex-nav-item__badge">{item.badge}</span> : null}
    </NavLink>
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem('tb:sidebar-collapsed') === '1'; } catch { return false; }
  });
  const [presetId, setPresetId] = useState(() => {
    try {
      const saved = loadLocalTheme();
      if (!saved) return 'tb-gold';
      const hit = WL_PRESETS.find((preset) => (preset.accentColor || '').toLowerCase() === (saved.accentColor || '').toLowerCase());
      return hit ? hit.id : 'custom';
    } catch { return 'tb-gold'; }
  });
  const [themeOpen, setThemeOpen] = useState(false);
  const [presetAccent, setPresetAccent] = useState(() => {
    try { return loadLocalTheme()?.accentColor || WL_DEFAULTS.accentColor; } catch { return WL_DEFAULTS.accentColor; }
  });

  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout, updateProfile } = useAuth();
  const { unseen } = useNotifications();
  const { t } = useI18n();
  const { features } = usePlatformSettings();
  const initial = displayInitial(user);
  const signOut = () => { logout(); nav('/'); };

  const isAdmin = user?.role === 'admin';
  const adminPreview = isAdmin && isAdminPreview();
  const isSubscriber = isAdmin || ['pro', 'elite', 'professional', 'teams'].includes((user?.plan || '').toLowerCase());
  const canSeeSignals = isAdmin || features.signals !== false;
  const avatar = avatarUrl(user);
  const homeTo = homeRouteForUser(user);

  useEffect(() => {
    try { window.localStorage.setItem('tb:sidebar-collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  useEffect(() => {
    if (!user) return;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem('tb:tour-dismissed') === '1'; } catch { /* ignore */ }
    if (dismissed || user.tutorialDone === true) return;
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

  const pickPreset = (preset) => {
    const base = (() => { try { return loadLocalTheme() || WL_DEFAULTS; } catch { return WL_DEFAULTS; } })();
    const next = {
      ...base,
      accentColor: preset.accentColor,
      headingColor: preset.headingColor,
      bodyColor: preset.bodyColor,
      mutedColor: preset.mutedColor,
      primaryColor: preset.primaryColor,
    };
    applyWhiteLabel(next);
    saveLocalTheme(next);
    setPresetId(preset.id);
    setPresetAccent(preset.accentColor);
  };

  const goPricing = () => nav('/pricing');

  const visibleItems = (items) => (items || [])
    .filter((item) => !item.hidden)
    .filter((item) => !item.adminOnly || isAdmin)
    .filter((item) => {
      const feature = featureForRoute(item.to);
      return !feature || features[feature] !== false || isAdmin;
    })
    .map((item) => ({
      ...item,
      locked: (item.requiresSubscriber && !isSubscriber) || (item.requiredPlan && !meetsPlan(user, item.requiredPlan)),
    }));

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: visibleItems(group.items),
  })).filter((group) => group.items.length);

  const dockItems = DOCK
    .filter((item) => {
      const feature = featureForRoute(item.to);
      return !feature || features[feature] !== false || isAdmin;
    })
    .map((item) => ({
      ...item,
      locked: (item.requiresSubscriber && !isSubscriber) || (item.requiredPlan && !meetsPlan(user, item.requiredPlan)),
    }));

  const isActive = (item) => (item.end
    ? loc.pathname === item.to
    : loc.pathname === item.to || loc.pathname.startsWith(`${item.to}/`));

  const moreActive = moreOpen || !dockItems.some((item) => isActive(item));

  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!moreOpen && !searchOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen, searchOpen]);

  const accountMenu = (
    <DropdownMenuContent align="end" sideOffset={8} className="tb-avatarmenu ex-menu w-60 rounded-[8px] border border-[var(--ex-line)] bg-[var(--ex-panel)] p-1 text-[var(--ex-text)] shadow-[var(--ex-shadow)]">
      <DropdownMenuLabel className="px-2.5 py-2">
        <span className="block truncate text-[11px] font-semibold text-[var(--ex-text)]">{user?.name || user?.email || 'Account'}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[var(--ex-muted)]">{user?.email || ''}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="my-1 bg-[var(--ex-line)]" />
      <DropdownMenuItem onClick={() => nav('/app/profile')} className="ex-menu__item">
        <User /> <span>Profile</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => nav('/app/billing')} className="ex-menu__item">
        <CreditCard /> <span>Billing</span>
        <span className="ml-auto text-[9px] uppercase text-[var(--ex-faint)]">{user?.plan || 'free'}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => nav('/app/security')} className="ex-menu__item">
        <ShieldCheck /> <span>Security</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => nav('/app/branding')} className="ex-menu__item">
        <Palette /> <span>Branding</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setThemeOpen(true)} className="ex-menu__item">
        <span className="h-3.5 w-3.5 rounded-[4px] ring-1 ring-[var(--ex-line-2)]" style={{ background: presetAccent }} />
        <span>App theme</span>
        <span className="ml-auto text-[10px] text-[var(--ex-faint)]">
          {(WL_PRESETS.find((preset) => preset.id === presetId)?.label || 'Custom').split(' ').slice(-1)}
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => nav('/app/api-keys')} className="ex-menu__item">
        <KeyRound /> <span>API keys</span>
      </DropdownMenuItem>
      {isAdmin && (
        <DropdownMenuItem onClick={() => nav('/admin')} className="ex-menu__item">
          <Building2 /> <span>Admin console</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="my-1 bg-[var(--ex-line)]" />
      <DropdownMenuItem onClick={() => { setTutorial(true); }} className="ex-menu__item">
        <HelpCircle /> <span>Product tour</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={signOut} className="ex-menu__item ex-menu__item--danger">
        <LogOut /> <span>Sign out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className={`tb-app-shell ex-shell${adminPreview ? ' tb-admin-preview' : ''}`}>
      <aside className={`ex-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Primary navigation">
        <SidebarBrand homeTo={homeTo} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <div className="ex-sidebar__scroll">
          {groups.map((group) => (
            <div className="ex-nav-group" key={group.label}>
              <div className="ex-nav-group__label">{group.label}</div>
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={{ ...item, label: item.label || t(item.labelKey, null, item.labelKey) }}
                  active={isActive(item)}
                  locked={item.locked}
                  onLocked={goPricing}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="ex-sidebar__footer">
          <Link to="/app/profile" className="ex-sidebar__account">
            <span className="ex-avatar">
              {avatar ? <img src={avatar} alt="" /> : initial}
            </span>
            <span className="ex-sidebar__footer-text">
              <strong>{user?.name || user?.username || 'Account'}</strong>
              <span>{isAdmin ? 'Administrator' : (user?.plan || 'Free')} · {isAdmin ? 'Full access' : (isSubscriber ? 'Active' : 'Upgrade')}</span>
            </span>
          </Link>
        </div>
      </aside>

      <header className="ex-topbar">
        <div className="ex-topbar__lead">
          <span className="ex-topbar__crumb">TradingBible</span>
          <h1 className="ex-topbar__title">{title}</h1>
        </div>
        <div className="ex-topbar__search">
          <GlobalSearch />
        </div>
        <div className="ex-topbar__actions">
          <Link to="/app/wallet?tab=cash" className="ex-btn ex-btn--primary ex-btn--sm hidden sm:inline-flex">
            <Plus /> Deposit
          </Link>
          <Link to="/app/terminal-pro" className="ex-btn ex-btn--secondary ex-btn--sm hidden md:inline-flex">
            <ArrowUpRight /> Trade
          </Link>
          {canSeeSignals && (
            <button type="button" onClick={() => nav('/app/alerts')} className="ex-icon-btn relative" title={t('app.alerts', null, 'Alerts')}>
              <Bell />
              {unseen > 0 && <span className="ex-icon-btn__dot">{unseen > 9 ? '9+' : unseen}</span>}
            </button>
          )}
          <ThemeSwitcher inline className="ex-icon-btn" />
          <span className="hidden md:inline-flex"><LanguageSwitcher className="ex-icon-btn" /></span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ex-avatar ml-0.5" aria-label="Account menu">
                {avatar ? <img src={avatar} alt="" /> : initial}
              </button>
            </DropdownMenuTrigger>
            {accountMenu}
          </DropdownMenu>
        </div>
      </header>

      <header className="ex-mobile-bar">
        <div className="ex-mobile-bar__brand">
          <Link to={homeTo} className="ex-sidebar__mark" aria-label="TradingBible home">
            <img
              src={TRADINGBIBLE_LOGO}
              alt=""
              aria-hidden
              className="h-full w-full object-contain p-1"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          </Link>
          <h1 className="ex-mobile-bar__title">{title}</h1>
        </div>
        <div className="ex-mobile-bar__actions">
          <button type="button" onClick={() => setSearchOpen(true)} className="ex-icon-btn" aria-label="Search">
            <Search />
          </button>
          {canSeeSignals && (
            <button type="button" onClick={() => nav('/app/alerts')} className="ex-icon-btn relative" aria-label="Alerts">
              <Bell />
              {unseen > 0 && <span className="ex-icon-btn__dot">{unseen > 9 ? '9+' : unseen}</span>}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="ex-avatar" aria-label="Account menu">
                {avatar ? <img src={avatar} alt="" /> : initial}
              </button>
            </DropdownMenuTrigger>
            {accountMenu}
          </DropdownMenu>
        </div>
      </header>

      <main className="ex-main">
        <div className="ex-main__inner">
          {adminPreview && (
            <div className="ex-notice ex-notice--accent mb-3 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">Admin preview — you are viewing the member experience.</span>
              <button
                type="button"
                onClick={() => { exitAdminPreview(); nav('/admin'); }}
                className="ex-btn ex-btn--secondary ex-btn--sm shrink-0"
              >
                <LogOut /> Exit
              </button>
            </div>
          )}
          {children}
        </div>
      </main>

      <div className="ex-mobile-dockfade" aria-hidden />
      <nav className="ex-mobile-dock" aria-label="App sections">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey, null, item.labelKey);
          const className = (active) => `ex-mobile-dock__item${item.center ? ' ex-mobile-dock__item--hero' : ''}${active ? ' is-active' : ''}`;
          if (item.locked) {
            return (
              <button key={item.to} type="button" onClick={goPricing} className={`${className(false)} is-locked`} aria-label={`${label} — upgrade required`}>
                <span className={item.center ? 'ex-mobile-dock__orb' : ''}><Icon aria-hidden /></span>
                <span className="ex-mobile-dock__label">{label}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive: active }) => className(active)}
            >
              {item.center ? <span className="ex-mobile-dock__orb"><Icon aria-hidden /></span> : <Icon aria-hidden />}
              <span className="ex-mobile-dock__label">{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`ex-mobile-dock__item${moreActive ? ' is-active' : ''}`}
          aria-label="More sections"
          aria-expanded={moreOpen}
        >
          <Menu aria-hidden />
          <span className="ex-mobile-dock__label">More</span>
        </button>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Search">
          <button type="button" className="ex-sheet-backdrop" aria-label="Close search" onClick={() => setSearchOpen(false)} />
          <div className="ex-sheet" style={{ top: 'var(--ex-ticker-h)', bottom: 'auto', maxHeight: '76dvh', borderRadius: '0 0 12px 12px', borderTop: 0, borderBottom: '1px solid var(--ex-line-2)' }}>
            <div className="ex-sheet__head">
              <strong>Search TradingBible</strong>
              <button type="button" onClick={() => setSearchOpen(false)} className="ex-icon-btn" aria-label="Close search"><X /></button>
            </div>
            <div className="pt-3">
              <GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button type="button" className="ex-sheet-backdrop" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="ex-sheet">
            <div className="ex-sheet__grab" aria-hidden />
            <div className="ex-sheet__head">
              <strong>All sections</strong>
              <button type="button" onClick={() => setMoreOpen(false)} className="ex-icon-btn" aria-label="Close menu"><X /></button>
            </div>

            <div className="ex-sheet__group">
              <div className="ex-sheet__group-label">Quick access</div>
              <div className="ex-sheet__grid">
                <Link to="/app/wallet?tab=cash" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <ArrowDownToLine /><span>Deposit</span>
                </Link>
                <Link to="/app/wallet?tab=send" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <ArrowUpRight /><span>Send</span>
                </Link>
                <Link to="/app/wallet?tab=crypto" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <RefreshCw /><span>Convert</span>
                </Link>
                <Link to="/app/coach" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <Bot /><span>SI Coach</span>
                </Link>
                <Link to="/app/academy" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <GraduationCap /><span>Academy</span>
                </Link>
                <Link to="/tv" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <MonitorPlay /><span>TV</span>
                </Link>
                <button type="button" onClick={() => { setMoreOpen(false); window.dispatchEvent(new CustomEvent('tb:open-live-chat')); }} className="ex-sheet__tile">
                  <MessageCircle /><span>Live chat</span>
                </button>
                <Link to="/contact" className="ex-sheet__tile" onClick={() => setMoreOpen(false)}>
                  <LifeBuoy /><span>Support</span>
                </Link>
              </div>
            </div>

            {groups.map((group) => (
              <div className="ex-sheet__group" key={group.label}>
                <div className="ex-sheet__group-label">{group.label}</div>
                <div className="ex-sheet__grid">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const label = item.label || t(item.labelKey, null, item.labelKey);
                    if (item.locked) {
                      return (
                        <button key={item.to} type="button" onClick={() => { setMoreOpen(false); goPricing(); }} className="ex-sheet__tile">
                          <Icon /><span>{label}</span><Crown className="h-3 w-3 text-[var(--ex-accent)]" />
                        </button>
                      );
                    }
                    return (
                      <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMoreOpen(false)} className={({ isActive: active }) => `ex-sheet__tile${active ? ' is-active' : ''}`}>
                        <Icon /><span>{label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="ex-sheet__group">
              <div className="ex-sheet__group-label">Preferences</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between gap-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] px-2 py-1.5">
                  <span className="text-[10.5px] font-semibold text-[var(--ex-text-2)]">Theme</span>
                  <ThemeSwitcher inline className="ex-icon-btn" />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] px-2 py-1.5">
                  <span className="text-[10.5px] font-semibold text-[var(--ex-text-2)]">Language</span>
                  <LanguageSwitcher className="ex-icon-btn" />
                </div>
              </div>
            </div>

            <div className="ex-sheet__group">
              <div className="ex-sheet__group-label">Account</div>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/app/billing" onClick={() => setMoreOpen(false)} className="ex-sheet__tile"><CreditCard /><span>Billing</span></Link>
                <Link to="/app/security" onClick={() => setMoreOpen(false)} className="ex-sheet__tile"><ShieldCheck /><span>Security</span></Link>
                <Link to="/app/profile" onClick={() => setMoreOpen(false)} className="ex-sheet__tile"><User /><span>Profile</span></Link>
                <button type="button" onClick={() => { setMoreOpen(false); signOut(); }} className="ex-sheet__tile"><LogOut /><span>Sign out</span></button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--ex-line)] pt-3">
              <span className="text-[10px] text-[var(--ex-muted)]">Signed in as {user?.email || 'member'}</span>
              <span className="ex-badge ex-badge--accent"><Check className="h-2.5 w-2.5" /> {isAdmin ? 'Admin' : (user?.plan || 'Free')}</span>
            </div>
          </div>
        </div>
      )}

      <ThemePickerDialog open={themeOpen} onOpenChange={setThemeOpen} activeId={presetId} onPick={pickPreset} />
      {tutorial && <OnboardingTutorial onClose={dismissTutorial} onComplete={completeTutorial} />}
    </div>
  );
}
