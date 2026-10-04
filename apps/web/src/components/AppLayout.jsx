import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Bot, Plug, Crown, User, LogOut, Menu, BarChart3, FileText, Calculator, Users, GraduationCap, Lock, Code2, Palette, CreditCard, HelpCircle, CandlestickChart, Grid2x2, Gauge, Bell, Radar, CalendarClock, Landmark, ListOrdered, KeyRound, Building2, Settings, ChevronDown, Trophy, Share2, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl } from '@/lib/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n } from '@/lib/i18n';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import GlobalSearch from '@/components/GlobalSearch';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
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
      { to: '/app/integrations', labelKey: 'nav.integrations', icon: Settings, requiresSubscriber: true, requiredPlan: 'professional' },
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
    <Link to={homeTo} className="group flex items-center gap-3">
      <span className="relative">
        <img src={TRADINGBIBLE_LOGO} alt={`${platformName} logo`} className="h-10 w-10 rounded-2xl object-contain ring-1 ring-[#d4af37]/30 transition group-hover:ring-[#d4af37]/60" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f]" />
      </span>
      <span className="leading-tight">
        <span className="block font-bold tracking-tight text-[#f0ecdd]">{first ? `${first} ` : ''}<span className="gold-text">{last}</span></span>
        <span className="block max-w-[150px] truncate text-[10px] uppercase tracking-[0.22em] text-[#8a8577]">{tagline || t('nav.terminal')}</span>
      </span>
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
  const cls = 'group flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2 transition-all';
  if (locked) {
    return (
      <button onClick={onNav} className={`${cls} text-[#8a8577]/70 hover:bg-white/[0.04] hover:text-[#e9e7df]`}>
        {inner}
      </button>
    );
  }
  return (
    <NavLink to={to} end={end} onClick={onNav}
      className={({ isActive }) => `${cls} ${isActive ? 'bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/5 text-[#f0ecdd] ring-1 ring-inset ring-[#d4af37]/30' : 'text-[#8a8577] hover:bg-white/[0.04] hover:text-[#e9e7df]'}`}>
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
  const { settings, features } = usePlatformSettings();
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
  const goPricing = () => { setOpen(false); nav('/pricing'); };

  const SideContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6"><Brand homeTo={homeTo} platformName={settings.platformName} tagline={settings.tagline} /></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
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
      <aside className="fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[268px] flex-col border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl lg:block">{SideContent}</aside>
      {open && <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-[var(--header-h)] z-40 flex w-[268px] flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>{SideContent}</aside>
      <div className="lg:pl-[268px]">
        <header className="fixed inset-x-0 top-[var(--header-h)] z-20 flex items-center justify-between border-b border-white/5 bg-[#0a0a0f]/70 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4 lg:left-[268px] lg:px-7 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#d4af37]/25 text-[#d4af37] lg:hidden" aria-label={t('app.openNav')} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[#f0ecdd] sm:text-xl">{title}</h1>
              <p className="hidden truncate text-[11px] text-[#6a665a] sm:block">{user?.username || user?.email}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 justify-center px-2">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {canSeeSignals && (
              <button onClick={() => nav('/app/alerts')} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60" title={t('app.alerts')}>
                <Bell className="h-4 w-4" />
                {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unseen > 9 ? '9+' : unseen}</span>}
              </button>
            )}
            <button onClick={() => setTutorial(true)} className="hidden min-h-[44px] items-center gap-1.5 rounded-full border border-[#d4af37]/25 px-3 py-1 text-xs text-[#d4af37] transition hover:border-[#d4af37]/60 sm:flex"><HelpCircle className="h-3.5 w-3.5" /> <span className="hidden md:inline">{t('app.help')}</span></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#0f0f14]/70 py-1 pl-1 pr-2 text-left transition hover:border-[#d4af37]/60">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold text-[#0a0a0f]">
                    {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#d4af37]" />
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
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-4 pb-4 pt-[84px] sm:px-5 sm:pb-5 sm:pt-[96px] lg:px-7 lg:pt-[104px] xl:px-8 xl:pt-[108px] 2xl:px-12">
          {isAdmin && isAdminPreview() && (
            <div className="admin-frost mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-4 py-2.5">
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
