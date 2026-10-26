import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, FileText, CreditCard, IdCard, LibraryBig, BarChart3,
  LogOut, Menu, Shield, X, Plug, Key, Package, User, ChevronDown, MonitorPlay, Briefcase, Gift,
  GraduationCap, Wallet, UserRound, Building2, Coins, Command, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import AdminSearch from '@/components/AdminSearch';
import '@/styles/admin-console.css';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { displayInitial } from '@/lib/displayName';
import { homeRouteForUser } from '@/lib/homeRoute';
import { enterAdminPreview } from '@/lib/adminPreview';
import { AtBadge } from '@/components/AtelierUI';
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
    label: 'Command',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/reports', label: 'Reports & logs', icon: FileText },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/admin/users', label: 'User management', icon: Users },
      { to: '/admin/employees', label: 'Employees', icon: UserRound },
      { to: '/admin/staff-id-cards', label: 'ID cards', icon: IdCard },
      { to: '/admin/billing', label: 'Billing & revenue', icon: CreditCard },
    ],
  },
  {
    label: 'Ecosystem',
    items: [
      { to: '/admin/tbc', label: 'TBC control center', icon: Coins },
      { to: '/admin/legal-vault', label: 'TBC legal vault', icon: ShieldCheck },
      { to: '/admin/airdrops', label: 'Airdrops', icon: Gift },
      { to: '/admin/wallet', label: 'Wallet & staking', icon: Wallet },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { to: '/admin/content', label: 'Content', icon: LibraryBig },
      { to: '/admin/tv', label: 'TradingBible TV', icon: MonitorPlay },
      { to: '/admin/mentors', label: 'Mentors', icon: GraduationCap },
      { to: '/admin/jobs', label: 'Jobs & hiring', icon: Briefcase },
    ],
  },
  {
    label: 'Company & system',
    items: [
      { to: '/admin/company', label: 'Company Bible', icon: Building2 },
      { to: '/admin/integrations', label: 'Integrations', icon: Plug },
      { to: '/admin/api-keys', label: 'API keys', icon: Key },
      { to: '/admin/plugins', label: 'Plugins', icon: Package },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function Brand({ homeTo }) {
  return (
    <Link to={homeTo} className="group flex min-w-0 items-center gap-3">
      <span className="at-rail-mark shrink-0">
        <img
          src={TRADINGBIBLE_LOGO}
          alt="TradingBible"
          draggable={false}
          className="object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-[var(--at-gold)]/50 bg-[var(--at-bg0)]">
          <Shield className="h-2.5 w-2.5 text-[var(--at-gold)]" />
        </span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="at-rail-word block truncate text-[var(--at-ink)]">Trading<span className="text-[var(--at-gold)]">Bible</span></span>
        <span className="at-rail-sub mt-1 block">Operator suite</span>
      </span>
    </Link>
  );
}

export default function AdminLayout({ children, title }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const initial = displayInitial(user);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore?.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/admin/jobs/payroll`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStaff((await res.json()) || []);
      } catch { /* staff badge stays empty */ }
    })();
  }, []);

  const staffRank = (s) => {
    const t = String(s.title || '');
    if (/founder|chief executive/i.test(t)) return 0;
    if (/vice president/i.test(t)) return 1;
    return 2;
  };
  const orderedStaff = [...(staff || [])].sort((a, b) => staffRank(a) - staffRank(b));
  const homeTo = homeRouteForUser(user);
  const signOut = () => { logout(); nav('/'); };

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

  const SideContent = (
    <div className="flex h-full min-h-0 flex-col tabular-nums">
      <div className="at-rail-brand">
        <Brand homeTo={homeTo} />
      </div>

      <div className="mx-4 mb-4 flex items-center justify-between rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
        <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--at-mut)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--at-green)] shadow-[0_0_9px_var(--at-green)]" />
          Secure operator session
        </span>
        <span className="at-kbd">⌘K</span>
      </div>

      <nav data-nav-scroll className="nice-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="at-navgroup-label">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `at-navlink ${isActive ? 'is-active' : ''}`}
                >
                  <span className="at-navlink-icon"><Icon className="h-3.5 w-3.5" strokeWidth={1.9} /></span>
                  <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                  {label === 'TBC control center' && <span className="h-1.5 w-1.5 rounded-full bg-[var(--at-amber)]/70" />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--at-line-soft)] px-3 py-3 sm:hidden">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--at-mut)]">Display</span>
        <div className="flex items-center gap-2">
          <ThemeSwitcher inline />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );

  return (
    <div className="at-shell tb-admin-shell min-h-screen bg-transparent pt-[var(--header-h)] tabular-nums antialiased">
      <aside className="at-rail fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[258px] flex-col overflow-hidden lg:flex">
        {SideContent}
      </aside>

      {open && <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-black/75 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`at-rail fixed bottom-0 left-0 top-[var(--header-h)] z-40 flex w-[278px] flex-col overflow-hidden transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-[var(--at-line-soft)] text-[var(--at-mut)] hover:text-[var(--at-ink)]">
          <X className="h-4 w-4" />
        </button>
        {SideContent}
      </aside>

      <div className="lg:pl-[258px]">
        <header className="at-topbar fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] h-16 w-full lg:left-[258px] lg:w-[calc(100%-258px)]">
          <div className="flex h-full w-full items-center gap-2 px-2.5 sm:gap-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button onClick={() => setOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--at-line-soft)] text-[var(--at-gold)] transition hover:border-[var(--at-line)] hover:text-[var(--at-gold)] lg:hidden" aria-label="Open navigation">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="at-crumb hidden sm:flex items-center gap-1.5">
                  <span>TradingBible</span><span className="text-[var(--at-mut-2)]">/</span><b>Admin</b>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-sm font-semibold tracking-[-0.02em] text-[var(--at-ink)] sm:text-[15px]">{title || 'Admin Dashboard'}</h1>
                  <AtBadge tone="gold" className="hidden md:inline-flex">Live workspace</AtBadge>
                </div>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex">
              <div className="w-full max-w-[430px]">
                <AdminSearch />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end">
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-1 sm:gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--at-gold)] transition hover:bg-[var(--at-gold-soft)] hover:text-[var(--at-gold)] sm:grid" aria-label="Staff directory" title="Staff">
                      <Users className="h-3.5 w-3.5" />
                      {staff.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--at-gold)] px-1 font-mono text-[8px] font-bold text-[#0a0a0f]">{staff.length}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl border-[var(--at-line)] bg-[#111113] tabular-nums text-[#e9e7df]">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#8a8577]">Staff · {staff.length}</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5" />
                    {orderedStaff.length ? orderedStaff.slice(0, 8).map((s) => (
                      <DropdownMenuItem key={s.appId || s.email} onClick={() => nav('/admin/employees')} className="cursor-pointer gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#d4af37]/12 text-[11px] font-bold text-[#d4af37]">{String(s.name || s.email || '?').slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{s.name || 'Staff member'}</span>
                          <span className="block truncate text-[10px] text-[#8a8577]">{s.title || 'Opening'}</span>
                        </span>
                      </DropdownMenuItem>
                    )) : (
                      <div className="px-3 py-4 text-xs text-[#8a8577]">No hired staff yet.</div>
                    )}
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => nav('/admin/employees')} className="cursor-pointer gap-2.5">
                      <Users className="h-4 w-4 text-[#d4af37]" /> All employees
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="hidden h-5 w-px bg-[var(--at-line-soft)] sm:block" />
                <span className="hidden sm:contents"><ThemeSwitcher inline /></span>
                <span className="hidden sm:contents"><LanguageSwitcher /></span>
                <button onClick={() => { enterAdminPreview(); nav('/app'); }} className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-[var(--at-mut)] transition hover:bg-[var(--at-gold-soft)] hover:text-[var(--at-gold)] xl:flex">
                  <LayoutDashboard className="h-3.5 w-3.5 text-[var(--at-gold)]" /> View app
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-lg py-0.5 pl-0.5 pr-1 text-left transition hover:bg-[var(--at-soft-2)]">
                      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-[11px] font-bold tabular-nums text-[#0a0a0f] ring-1 ring-[#d4af37]/40">
                        {initial}
                      </span>
                      <ChevronDown className="h-3 w-3 text-[var(--at-gold)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl border-[#d4af37]/15 bg-[#111113] tabular-nums text-[#e9e7df]">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#8a8577]">Admin</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={() => nav('/app/profile')} className="cursor-pointer gap-2.5">
                      <User className="h-4 w-4 text-[#d4af37]" /> View profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => nav('/admin/settings')} className="cursor-pointer gap-2.5">
                      <Settings className="h-4 w-4 text-[#d4af37]" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2.5 text-red-400 focus:text-red-300">
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-none flex-1 px-1.5 pb-28 pt-[calc(4rem+1rem)] sm:px-2 sm:pb-8 lg:px-3 xl:px-4">
          {children}
        </main>

        <nav aria-label="Admin sections" className="tb-admin-dock">
          {[
            { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
            { to: '/admin/users', label: 'Users', icon: Users },
            { to: '/admin/tbc', label: 'TBC', icon: Coins },
            { to: '/admin/jobs', label: 'Hiring', icon: Briefcase },
          ].map(({ to, label, icon: Icon, end }) => {
            const active = end ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(`${to}/`);
            return (
              <NavLink key={to} to={to} end={end} className={`tb-admin-dock__tab ${active ? 'is-active' : ''}`}>
                <span className="tb-admin-dock__icon"><Icon className="h-[19px] w-[19px]" strokeWidth={1.9} /></span>
                <span>{label}</span>
              </NavLink>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className="tb-admin-dock__tab">
            <span className="tb-admin-dock__icon"><Menu className="h-[19px] w-[19px]" strokeWidth={1.9} /></span>
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
