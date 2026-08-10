import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Bot, Plug, Crown, User, LogOut, Menu, BarChart3, FileText, Calculator, Users, GraduationCap, Lock, Code2, Palette, CreditCard, HelpCircle, CandlestickChart, Grid2x2, Gauge, Star, Bell, Radar, CalendarClock, Landmark, ListOrdered, KeyRound, Building2, Settings, ChevronDown, Trophy, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl } from '@/lib/avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { useI18n } from '@/lib/i18n';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import LiveChatWidget from '@/components/LiveChatWidget';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { homeRouteForUser } from '@/lib/homeRoute';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COMPANY_ITEMS = [
  { to: '/company', labelKey: 'nav.school', icon: Building2, end: true },
  { to: '/company/students', labelKey: 'nav.students', icon: Users },
  { to: '/company/teachers', labelKey: 'nav.teachers', icon: GraduationCap },
  { to: '/company/assessments', labelKey: 'nav.exams', icon: BookOpen },
  { to: '/company/submissions', labelKey: 'nav.submissions', icon: FileText },
  { to: '/company/academy-profiles', labelKey: 'nav.academyprofiles', icon: User },
];

const NAV_GROUPS = [
  {
    labelKey: 'nav.trade',
    items: [
      { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: '/app/charts', labelKey: 'nav.charts', icon: CandlestickChart },
      { to: '/app/indicators', labelKey: 'nav.indicators', icon: Gauge },
      { to: '/app/heatmaps', labelKey: 'nav.heatmaps', icon: Grid2x2 },
      { to: '/app/watchlists', labelKey: 'nav.watchlists', icon: Star },
      { to: '/app/terminal', labelKey: 'nav.terminal', icon: ListOrdered },
      { to: '/app/signals', labelKey: 'nav.signals', icon: Radar },
      { to: '/app/alerts', labelKey: 'nav.alerts', icon: Bell },
      { to: '/app/economic-calendar', labelKey: 'nav.economic', icon: CalendarClock },
      { to: '/app/journal', labelKey: 'nav.journal', icon: BookOpen },
      { to: '/app/reports', labelKey: 'nav.reports', icon: FileText },
      { to: '/app/coach', labelKey: 'nav.coach', icon: Bot, requiresSubscriber: true },
      { to: '/app/tools', labelKey: 'nav.tools', icon: Calculator, requiresSubscriber: true },
      { to: '/app/brokers', labelKey: 'nav.brokers', icon: Plug },
      { to: '/app/prop-firms', labelKey: 'nav.propfirms', icon: Trophy },
      { to: '/app/wallet', labelKey: 'nav.wallet', icon: Landmark, requiresSubscriber: true },
    ],
  },
  {
    labelKey: 'nav.learn',
    items: [
      { to: '/app/community', labelKey: 'nav.community', icon: Users, requiresSubscriber: true },
      { to: '/app/academy', labelKey: 'nav.academy', icon: GraduationCap, requiresSubscriber: true },
      { to: '/app/api-docs', labelKey: 'nav.apidocs', icon: Code2, requiresSubscriber: true },
      { to: '/app/integrations', labelKey: 'nav.integrations', icon: Plug, requiresSubscriber: true },
    ],
  },
  {
    labelKey: 'nav.account',
    items: [
      { to: '/app/profile', labelKey: 'nav.profile', icon: User },
      { to: '/app/api-keys', labelKey: 'nav.apikeys', icon: KeyRound },
      { to: '/app/billing', labelKey: 'nav.billing', icon: CreditCard },
      { to: '/app/affiliate', labelKey: 'nav.affiliate', icon: Share2 },
      { to: '/app/security', labelKey: 'nav.security', icon: Lock },
      { to: '/app/branding', labelKey: 'nav.branding', icon: Palette, requiresSubscriber: true },
    ],
  },
];

function Brand({ homeTo }) {
  return (
    <Link to={homeTo} className="flex items-center gap-2.5">
      <img src={TRADINGBIBLE_LOGO} alt="TradingBible logo" className="h-9 w-9 rounded-lg object-contain" />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-[#f0ecdd]">Trading<span className="gold-text">Bible</span></div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a8577]">Terminal</div>
      </div>
    </Link>
  );
}

export default function AppLayout({ children, title, trialDays = 7 }) {
  const [open, setOpen] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const nav = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { unseen } = useNotifications();
  const { t } = useI18n();
  const initial = (user?.username || user?.email || 'A').charAt(0).toUpperCase();
  const signOut = () => { logout(); nav('/'); };

  const isAdmin = user?.role === 'admin';
  const isSubscriber = ['pro', 'elite', 'professional'].includes((user?.plan || '').toLowerCase());
  const isCompany = user?.accountType === 'company';
  const trialDaysRemaining = useMemo(() => {
    if (isSubscriber || isAdmin || !user) return 0;
    const startRaw = user.created || user.created_at;
    const trialEndRaw = user.trialEndsAt || user.trial_ends_at;
    const trialEnd = trialEndRaw
      ? new Date(trialEndRaw)
      : (startRaw ? new Date(new Date(startRaw).getTime() + Number(trialDays || 7) * 24 * 60 * 60 * 1000) : null);
    if (!trialEnd || Number.isNaN(trialEnd.getTime())) return Number(trialDays || 7);
    const msLeft = trialEnd.getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }, [isSubscriber, isAdmin, user, trialDays]);
const avatar = avatarUrl(user);
const homeTo = homeRouteForUser(user);
const pluralS = (n) => (n === 1 ? '' : 's');

  useEffect(() => {
    if (user && user.tutorialDone === false) setTutorial(true);
  }, [user]);

  const completeTutorial = () => { updateProfile({ tutorialDone: true }).catch(() => {}); };

  const SideContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6"><Brand homeTo={homeTo} /></div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {(isCompany ? [{ labelKey: 'nav.company', items: COMPANY_ITEMS }, ...NAV_GROUPS] : NAV_GROUPS).map((group) => (
          <div key={group.labelKey} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f5b50]">{t(group.labelKey)}</div>
            {group.items
              .filter((it) => !it.adminOnly || isAdmin)
              .filter((it) => !it.requiresSubscriber || isSubscriber)
              .map(({ to, labelKey, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-button nav-shell-link flex min-h-[44px] items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${isActive ? 'nav-shell-link--active text-[#f0ecdd] gold-glow' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                <span className="nav-icon-frame grid h-8 w-8 place-items-center rounded-lg bg-white/[0.03] text-[#8a8577]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 truncate">{t(labelKey)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {!isSubscriber && !isAdmin && (
      <div className="m-3 rounded-xl glass p-4">
        <div className="flex items-center gap-2 text-[#d4af37]"><Crown className="h-4 w-4" /><span className="text-xs font-semibold">{t('app.trial')}</span></div>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{t('app.trialLeft', { n: trialDaysRemaining, s: pluralS(trialDaysRemaining) })}</p>
        <button onClick={() => nav('/app/billing')} className="mt-3 min-h-[44px] w-full rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-xs font-semibold text-[#0a0a0f] transition hover:opacity-90">{t('app.upgrade')}</button>
      </div>
      )}
      <div className="border-t border-[#d4af37]/12 px-3 py-3">
        <button onClick={signOut} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#8a8577] transition hover:bg-white/5 hover:text-[#e9e7df]"><LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />{t('app.signout')}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-[var(--header-h)]">
      <aside className="fixed left-0 top-[var(--header-h)] bottom-0 z-30 hidden w-64 flex-col shell-panel lg:block">{SideContent}</aside>
      {open && <div className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-[var(--header-h)] bottom-0 z-40 w-64 flex-col shell-panel transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>{SideContent}</aside>
      <div className="lg:pl-64">
        <header className="sticky top-[var(--header-h)] z-20 flex items-center justify-between border-b border-[#d4af37]/12 shell-panel-soft px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <button className="grid h-11 w-11 place-items-center rounded-full border border-[#d4af37]/25 text-[#d4af37] lg:hidden" aria-label={t('app.openNav')} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
            <h1 className="min-w-0 truncate text-base font-semibold text-[#f0ecdd] sm:text-xl">{title}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <button onClick={() => nav('/app/alerts')} className="relative grid h-11 w-11 place-items-center rounded-full border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60" title={t('app.alerts')}>
              <Bell className="h-4 w-4" />
              {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unseen > 9 ? '9+' : unseen}</span>}
            </button>
            <button onClick={() => setTutorial(true)} className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#d4af37]/25 px-3 py-1 text-xs text-[#d4af37] transition hover:border-[#d4af37]/60"><HelpCircle className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('app.help')}</span></button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#0f0f14]/70 px-1.5 py-1 text-left transition hover:border-[#d4af37]/60">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold text-[#0a0a0f]">
                    {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : initial}
                  </span>
                  <ChevronDown className="mr-0.5 h-3.5 w-3.5 text-[#d4af37]" />
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
        <main className="p-4 sm:p-5 lg:p-7">
          {children}
        </main>
      </div>
      {tutorial && <OnboardingTutorial onClose={() => setTutorial(false)} onComplete={completeTutorial} />}
      <LiveChatWidget />
    </div>
  );
}
