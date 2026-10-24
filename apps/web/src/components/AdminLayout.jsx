import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, FileText, CreditCard, IdCard, LibraryBig, BarChart3,
  LogOut, Menu, Shield, X, Plug, Key, Package, User, ChevronDown, MonitorPlay, Briefcase, Gift,
  GraduationCap, Wallet, UserRound, Building2, Coins
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import AdminSearch from '@/components/AdminSearch';
import '@/styles/admin-console.css';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { displayName, displayInitial } from '@/lib/displayName';
import { homeRouteForUser } from '@/lib/homeRoute';
import { enterAdminPreview } from '@/lib/adminPreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/employees', label: 'Employees', icon: UserRound },
  { to: '/admin/staff-id-cards', label: 'ID Cards', icon: IdCard },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/billing', label: 'Billing & Revenue', icon: CreditCard },
  { to: '/admin/airdrops', label: 'Airdrops', icon: Gift },
  { to: '/admin/tbc', label: 'TBC Control Center', icon: Coins },
  { to: '/admin/legal-vault', label: 'TBC Legal Vault', icon: Shield },
  { to: '/admin/content', label: 'Content', icon: LibraryBig },
  { to: '/admin/reports', label: 'Reports & Logs', icon: FileText },
  { to: '/admin/tv', label: 'TradingBible TV', icon: MonitorPlay },
  { divider: true },
  { to: '/admin/integrations', label: 'Integrations', icon: Plug },
  { to: '/admin/api-keys', label: 'API Keys', icon: Key },
  { to: '/admin/plugins', label: 'Plugins', icon: Package },
  { to: '/admin/mentors', label: 'Mentors', icon: GraduationCap },
  { to: '/admin/wallet', label: 'Wallet & Staking', icon: Wallet },
  { to: '/admin/jobs', label: 'Jobs & Hiring', icon: Briefcase },
  { to: '/admin/company', label: 'Company Bible', icon: Building2 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Brand({ homeTo }) {
  return (
    <Link to={homeTo} className="group flex items-center gap-2.5">
      <span className="relative shrink-0">
        <img src={TRADINGBIBLE_LOGO} alt="TradingBible" draggable={false} className="h-9 w-9 rounded-[10px] border border-[#d4af37]/25 bg-[#0c0c11] object-contain p-0.5 transition group-hover:border-[#d4af37]/50" onError={e => { e.currentTarget.style.display = 'none'; }} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#d4af37] ring-2 ring-[#0a0a0f]">
          <Shield className="h-2.5 w-2.5 text-[#0a0a0f]" />
        </span>
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-tight text-[#f0ecdd]">Trading<span className="gold-text">Bible</span></span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Admin Console</span>
      </span>
    </Link>
  );
}

export default function AdminLayout({ children, title }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
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
  const myPosition = (staff || []).find((s) => String(s.email || '').toLowerCase() === String(user?.email || '').toLowerCase())?.title || '';
  const staffRank = (s) => {
    const t = String(s.title || '');
    if (/founder|chief executive/i.test(t)) return 0;
    if (/vice president/i.test(t)) return 1;
    return 2;
  };
  const orderedStaff = [...(staff || [])].sort((a, b) => staffRank(a) - staffRank(b));
  const homeTo = homeRouteForUser(user);
  const signOut = () => { logout(); nav('/'); };

  // Same sidebar scroll persistence as the user portal
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
    <div className="flex h-full flex-col tabular-nums">
      {/* Logo */}
      <div className="px-4 pb-3 pt-5">
        <Brand homeTo={homeTo} />
      </div>

      {/* Nav */}
      <nav data-nav-scroll className="tbl-cascade nice-scroll flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {NAV.map((item, idx) => {
          if (item.divider) return <div key={`div-${idx}`} className="my-2 h-px bg-[#d4af37]/10" />;
          const { to, label, icon: Icon, end } = item;
          return (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `tbl-row group flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm tabular-nums transition-all ${
                  isActive
                    ? 'tbl-row--active bg-[#d4af37]/[0.12] font-semibold text-[#f0ecdd] shadow-[inset_0_1px_0_rgba(244,230,168,0.12)] ring-1 ring-inset ring-[#d4af37]/25'
                    : 'text-[#8a8577] hover:bg-white/[0.04] hover:text-[#e9e7df]'
                }`
              }>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/[0.04] text-[#8a8577] transition group-hover:text-[#d4af37]">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium tabular-nums">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#d4af37]/10 px-2 py-2.5 space-y-1">
        <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-sm tabular-nums text-[#8a8577] hover:bg-red-500/8 hover:text-red-400 transition-colors">
          <LogOut className="h-4 w-4" strokeWidth={1.9} />Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="adm-console min-h-screen bg-transparent pt-[var(--header-h)] tabular-nums antialiased">
      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[248px] flex-col border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl lg:block">
        {SideContent}
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-[var(--header-h)] z-40 flex w-[248px] flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-[10px] p-1.5 text-[#8a8577] hover:bg-white/5">
          <X className="h-5 w-5" />
        </button>
        {SideContent}
      </aside>

      {/* Main content */}
      <div className="lg:pl-[248px]">
        {/* Top bar — same design as the user portal header */}
        <header className="app-header fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] w-full border-b border-white/[0.06] bg-[#0a0a0f]/90 tabular-nums backdrop-blur-2xl lg:left-[248px] lg:w-[calc(100%-248px)]">
          <div aria-hidden className="app-header-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <div aria-hidden className="app-header-sheen pointer-events-none absolute inset-0 overflow-hidden" />
          <div className="flex h-14 w-full items-center justify-between gap-1 px-1 sm:gap-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37] lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-[6px] bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums text-[#d4af37]">Admin</span>
                {myPosition ? (
                  <span className="hidden shrink-0 truncate rounded-[6px] border border-[#d4af37]/30 bg-[#d4af37]/[0.07] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums text-[#f0ecdd] sm:inline">{myPosition}</span>
                ) : null}
                <span className="truncate text-sm font-semibold tabular-nums text-[#f0ecdd] sm:text-base">{title || 'Admin Dashboard'}</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-3">
            <div className="w-full max-w-xl">
              <AdminSearch />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end">
          <div className="flex shrink-0 items-center gap-1 rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-1 tabular-nums backdrop-blur-md sm:gap-1.5 sm:p-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37]" aria-label="Staff directory" title="Staff">
                  <Users className="h-4 w-4" />
                  {staff.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#d4af37] px-1 font-mono text-[9px] font-bold text-[#0a0a0f]">{staff.length}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-[10px] border-[#d4af37]/15 bg-[#111113] tabular-nums text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">Staff · {staff.length}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {orderedStaff.length ? orderedStaff.slice(0, 8).map((s) => (
                  <DropdownMenuItem key={s.appId || s.email} onClick={() => nav('/admin/employees')} className="cursor-pointer gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] bg-[#d4af37]/12 text-[11px] font-bold text-[#d4af37]">{String(s.name || s.email || '?').slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{s.name || 'Staff member'}</span>
                      <span className="block truncate text-[11px] text-[#8a8577]">{s.title || 'Opening'}</span>
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
            <ThemeSwitcher inline />
            <LanguageSwitcher />
            <button onClick={() => { enterAdminPreview(); nav('/app'); }} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium tabular-nums text-[#8a8577] transition hover:bg-[#d4af37]/10 hover:text-[#d4af37] sm:flex">
              <LayoutDashboard className="h-4 w-4" />
              <span>View App</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-[10px] py-0.5 pl-0.5 pr-1.5 text-left transition hover:bg-white/5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold tabular-nums text-[#0a0a0f] ring-1 ring-[#d4af37]/40">
                    {initial}
                  </span>
                  <span className="hidden text-left lg:block">
                    <span className="block max-w-[120px] truncate text-xs font-medium tabular-nums text-[#e9e7df]">{displayName(user)}</span>
                    <span className="block text-[10px] tabular-nums text-[#6a665a]">{myPosition || 'Administrator'}</span>
                  </span>
                  <Shield className="hidden h-3.5 w-3.5 shrink-0 text-[#d4af37]/60 lg:block" />
                  <ChevronDown className="h-3.5 w-3.5 text-[#8a8577]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-[10px] border-[#d4af37]/15 bg-[#111113] tabular-nums text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">Admin</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => nav('/app/profile')} className="cursor-pointer gap-2.5">
                  <User className="h-4 w-4 text-[#d4af37]" /> View profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/admin/settings')} className="cursor-pointer gap-2.5">
                  <Settings className="h-4 w-4 text-[#d4af37]" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { enterAdminPreview(); nav('/app'); }} className="cursor-pointer gap-2.5">
                  <LayoutDashboard className="h-4 w-4 text-[#d4af37]" /> View app
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

        {/* Page content */}
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 pb-4 pt-[84px] sm:px-5 sm:pb-5 sm:pt-[92px] lg:px-7 lg:pt-[100px] xl:px-8 xl:pt-[104px] 2xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
