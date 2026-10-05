import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Bot, Plug, Crown, User, LogOut, Menu, BarChart3, FileText, Calculator, Users, GraduationCap, Lock, Code2, Palette, CreditCard, HelpCircle, CandlestickChart, Grid2x2, Gauge, Bell, Radar, CalendarClock, Landmark, ListOrdered, KeyRound, Building2, Settings, ChevronDown, Trophy, Share2, Layers, MonitorPlay } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl } from '@/lib/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n } from '@/lib/i18n';
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
} from '@/components/ui/dropdown-menu';

const NAV_GROUPS = [
  {
    labelKey: 'nav.trade',
    items: [
      { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/terminal', labelKey: 'nav.terminal', icon: ListOrdered },
      { to: '/app/journal', labelKey: 'nav.journal', icon: BookOpen },
      { to: '/app/brokers', labelKey: 'nav.brokers', icon: Plug },
      { to: '/app/prop-firms', labelKey: 'nav.propfirms', icon: Trophy },
      { to: '/app/wallet', labelKey: 'nav.wallet', icon: Landmark, requiresSubscriber: true },    ],
  },
  {
    labelKey: 'nav.analyze',
    items: [
      { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: '/app/reports', labelKey: 'nav.reports', icon: FileText, requiresSubscriber: true, requiredPlan: 'elite' },
      { to: '/app/coach', labelKey: 'nav.coach', icon: Bot, requiresSubscriber: true, requiredPlan: 'elite' },
      { to: '/app/tools', labelKey: 'nav.tools', icon: Calculator, requiresSubscriber: true },
    ],
  },
  {
    labelKey: 'nav.markets',
    items: [
      { to: '/app/charts', labelKey: 'nav.charts', icon: CandlestickChart },
      { to: '/app/indicators', labelKey: 'nav.indicators', icon: Gauge },
      { to: '/app/heatmaps', labelKey: 'nav.heatmaps', icon: Grid2x2 },
      { to: '/app/orderflow', labelKey: 'nav.orderflow', icon: Layers },
      { to: '/tv', labelKey: 'nav.tv', icon: MonitorPlay },
      { to: '/app/signals', labelKey: 'nav.signals', icon: Radar },
      { to: '/app/alerts', labelKey: 'nav.alerts', icon: Bell },
      { to: '/app/economic-calendar', labelKey: 'nav.economic', icon: CalendarClock },
    ],
  },
  {
    labelKey: 'nav.learn',
    items: [
      { to: '/app/community', labelKey: 'nav.community', icon: Users },
      { to: '/app/academy', labelKey: 'nav.academy', icon: GraduationCap },
      { to: '/app/api-docs', labelKey: 'nav.apidocs', icon: Code2, requiresSubscriber: true, requiredPlan: 'professional' },
    ],
  },
  {
    labelKey: 'nav.account',
    items: [
      { to: '/app/profile', labelKey: 'nav.profile', icon: User },
      { to: '/app/api-keys', labelKey: 'nav.apikeys', icon: KeyRound, requiresSubscriber: true, requiredPlan: 'professional' },
      { to: '/app/billing', labelKey: 'nav.billing', icon: CreditCard },
      { to: '/app/affiliate', labelKey: 'nav.affiliate', icon: Share2 },
      { to: '/app/security', labelKey: 'nav.security', icon: Lock },
      { to: '/app/branding', labelKey: 'nav.branding', icon: Palette, requiresSubscriber: true, requiredPlan: 'professional' },
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
      <BrandWordmark size={32} showTagline tagline={tagline || 'maliba-admin'} />
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
  const [tutorial, setTutorial] = useState(false);
  const nav = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { unseen } = useNotifications();
  const { t } = useI18n();
  const { features } = usePlatformSettings();
  const initial = (user?.username || user?.email || 'A').charAt(0).toUpperCase();
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
        <button onClick={signOut} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#8a8577] transition hover:bg-white/5 hover:text-[#e9e7df]"><LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />{t('app.signout')}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-[var(--header-h)]">
      <aside className="fixed bottom-0 left-0 top-[calc(var(--header-h)+3.5rem)] z-30 hidden w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl lg:block">{SideContent}</aside>
      {open && <div className="fixed inset-x-0 bottom-0 top-[calc(var(--header-h)+3.5rem)] z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-[calc(var(--header-h)+3.5rem)] z-40 flex w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>{SideContent}</aside>
      <div className="lg:pl-[280px]">
        <header className="app-header fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] w-full border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-2xl">
          {/* drifting gold hairline + slow light sweep */}
          <div aria-hidden className="app-header-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <div aria-hidden className="app-header-sheen pointer-events-none absolute inset-0 overflow-hidden" />
          <div className="flex h-14 w-full items-center justify-between gap-2 px-1 sm:gap-3 sm:px-2">
          {/* Left: menu + brand + page */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37] lg:hidden" aria-label={t('app.openNav')} onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
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
              <h1 className="truncate text-base font-semibold text-[#f0ecdd]">{title}</h1>
            </div>
          </div>

          {/* Center: Global Search */}
          <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-3">
            <div className="w-full max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          {/* Right: unified action cluster */}
          <div className="flex min-w-0 flex-1 items-center justify-end">
          <div className="app-header-pill flex shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-md sm:gap-1.5 sm:p-1.5">
            <ThemeSwitcher inline />
            <LanguageSwitcher />
            {canSeeSignals && (
              <button onClick={() => nav('/app/alerts')} className="relative grid h-9 w-9 place-items-center rounded-full text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37]" title={t('app.alerts')}>
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
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold text-[#0a0a0f] ring-1 ring-[#d4af37]/50">
                    {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#8a8577]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 border-[#d4af37]/15 bg-[#111113] text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{t('app.account')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => nav('/app/profile')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <User className="h-4 w-4 text-[#d4af37]" /> {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/security')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <Settings className="h-4 w-4 text-[#d4af37]" /> {t('app.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app/api-keys')} className="min-h-[44px] cursor-pointer gap-2.5">
                  <KeyRound className="h-4 w-4 text-[#d4af37]" /> {t('nav.apikeys')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => nav('/admin')} className="min-h-[44px] cursor-pointer gap-2.5">
                    <Building2 className="h-4 w-4 text-[#d4af37]" /> {t('app.admin')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={signOut} className="min-h-[44px] cursor-pointer gap-2.5 text-red-400 focus:text-red-300">
                  <LogOut className="h-4 w-4" /> {t('app.signout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-4 pb-4 pt-[84px] sm:px-5 sm:pb-5 sm:pt-[92px] lg:px-7 lg:pt-[100px] xl:px-8 xl:pt-[104px] 2xl:px-12">
          {isAdmin && isAdminPreview() && (
            <div className="admin-frost mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-4 py-2">
              <span className="text-xs text-[#d4af37]">{t('misc.adminPreview')}</span>
              <button onClick={() => { exitAdminPreview(); nav('/admin'); }} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#d4af37]/30 px-3 py-1.5 text-xs font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10"><LogOut className="h-3.5 w-3.5" /> {t('misc.exitAdmin')}</button>
            </div>
          )}
          {children}
        </main>
      </div>
      {tutorial && <OnboardingTutorial onClose={() => setTutorial(false)} onComplete={completeTutorial} />}
    </div>
  );
}
