import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, FileText, CreditCard, IdCard, LibraryBig, BarChart3,
  LogOut, Menu, Search, Shield, X, Plug, Key, Package, User, ChevronDown, ChevronRight, MonitorPlay, Briefcase, Gift,
  GraduationCap, Wallet, UserRound, Building2, Coins, Command, ShieldCheck, Landmark,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import AdminSearch from '@/components/AdminSearch';
import '@/styles/admin-console.css';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { BrandName, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { IosIcon } from '@/components/IosIcon';
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

// Admin chrome lives at the route boundary so switching console sections does
// not remount the rail, header, phone search row or dock.
const AdminChromeTitleContext = createContext(null);

export function AdminChromeShell({ children }) {
  const [title, setTitle] = useState('');
  return (
    <AdminLayoutContent title={title || 'Admin Dashboard'}>
      <AdminChromeTitleContext.Provider value={setTitle}>{children}</AdminChromeTitleContext.Provider>
    </AdminLayoutContent>
  );
}

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
    label: 'Capital & IR',
    items: [
      { to: '/admin/equity', label: 'Equity administration', icon: Landmark },
      { to: '/admin/investor-relations', label: 'Investor relations', icon: FileText },
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
        <BrandName name="TradingBible" className="at-rail-word block truncate" />
        <span className="at-rail-sub mt-1 block">Operator suite</span>
      </span>
    </Link>
  );
}

export default function AdminLayout({ children, title }) {
  const setShellTitle = useContext(AdminChromeTitleContext);
  useLayoutEffect(() => {
    if (setShellTitle) setShellTitle(title || '');
  }, [setShellTitle, title]);
  if (setShellTitle) return children;
  return <AdminLayoutContent title={title}>{children}</AdminLayoutContent>;
}

function AdminLayoutContent({ children, title }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const initial = displayInitial(user);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setSearchQ('');
  }, [loc.pathname]);

  useEffect(() => {
    if (!open && !searchOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') { setOpen(false); setSearchOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, searchOpen]);

  const allAdminNav = NAV_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
  const normalizedSearch = searchQ.trim().toLowerCase();
  const searchResults = normalizedSearch
    ? allAdminNav.filter((item) => `${item.label} ${item.to} ${item.group}`.toLowerCase().includes(normalizedSearch))
    : allAdminNav;

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
    <div className="tb-admin-rail-inner tabular-nums">
      <div className="tb-admin-brandbar">
        <Brand homeTo={homeTo} />
        <span className="at-kbd">⌘K</span>
      </div>

      <div className="tb-admin-session">
        <span><i />Secure operator session</span>
        <span className="at-kbd">Live</span>
      </div>

      <button
        type="button"
        onClick={() => { enterAdminPreview(); nav('/app'); }}
        className="tb-admin-viewapp"
      >
        <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">View app</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--at-mut)]" />
      </button>

      <nav data-nav-scroll className="tb-admin-nav nice-scroll">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="tb-admin-nav-group">
            <div className="tb-admin-nav-label">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `at-navlink ${isActive ? 'is-active' : ''}`}
                >
                  <span className="at-navlink-icon"><Icon strokeWidth={1.9} /></span>
                  <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                  {label === 'TBC control center' && <span className="h-1.5 w-1.5 rounded-full bg-[var(--at-amber)]/70" />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="tb-admin-sidefoot">
        <div className="tb-admin-identity">
          <span className="tb-admin-identity-badge">{initial}</span>
          <span className="tb-admin-identity-copy">
            <strong>{user?.name || 'Operator'}</strong>
            <span>{user?.email || user?.role || 'Admin'}</span>
          </span>
          <div className="tb-admin-sidefoot-tools">
            <ThemeSwitcher inline />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={signOut}
              className="grid h-7 w-7 place-items-center rounded-md text-[var(--at-mut)] transition hover:bg-[var(--at-soft-2)] hover:text-[var(--at-red)]"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="at-shell tb-admin-shell min-h-screen bg-transparent pt-[var(--header-h)] tabular-nums antialiased">
      {/* Desktop keeps the persistent operator rail. Phones never render a
          side rail: navigation lives in the header search and the bottom
          More sheet, matching the trader app. */}
      <aside className="at-rail fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[258px] flex-col overflow-hidden lg:flex">
        {SideContent}
      </aside>

      <div className="lg:pl-[258px]">
        <header className="at-topbar fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] h-16 w-full lg:left-[258px] lg:w-[calc(100%-258px)]">
          <div className="flex h-full w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:min-w-[178px] sm:flex-none">
              <img
                src={TRADINGBIBLE_LOGO}
                alt=""
                aria-hidden
                className="h-8 w-8 shrink-0 rounded-[10px] border border-[var(--at-line-soft)] bg-[var(--at-gold-soft)] object-contain sm:hidden"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="min-w-0">
                <div className="at-crumb hidden sm:flex items-center gap-1.5">
                  <BrandName name="TradingBible" /><span className="text-[var(--at-mut-2)]">/</span><b>Admin</b>
                </div>
                <div className="flex items-center gap-1.5 leading-none sm:hidden">
                  <BrandName name="TradingBible" className="text-[10px] font-bold tracking-[-0.01em]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--at-mut-2)]">Admin</span>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-2 sm:mt-0">
                  <h1 className="truncate text-[17px] font-semibold tracking-[-0.035em] text-[var(--at-ink)] sm:min-w-[150px] sm:text-[15px]">{title || 'Admin Dashboard'}</h1>
                  <AtBadge tone="gold" className="hidden xl:inline-flex">Live workspace</AtBadge>
                </div>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-2 sm:flex">
              <div className="w-full max-w-[430px]">
                <AdminSearch />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end">
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => { setSearchOpen(true); setOpen(false); }}
                  aria-label="Search admin"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--at-gold)] transition hover:bg-[var(--at-gold-soft)] sm:hidden"
                >
                  <Search className="h-4 w-4" />
                </button>
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
                <span className="hidden sm:flex"><ThemeSwitcher inline /></span>
                <span className="hidden sm:flex"><LanguageSwitcher /></span>
                <button
                  onClick={() => { enterAdminPreview(); nav('/app'); }}
                  aria-label="View app"
                  title="View app"
                  className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--at-mut)] transition hover:bg-[var(--at-gold-soft)] hover:text-[var(--at-gold)] sm:grid xl:flex xl:w-auto xl:items-center xl:gap-1.5 xl:px-2.5 xl:text-[10px] xl:font-semibold"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-[var(--at-gold)]" />
                  <span className="hidden xl:inline">View app</span>
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
                    <DropdownMenuItem onClick={() => { enterAdminPreview(); nav('/app'); }} className="cursor-pointer gap-2.5">
                      <LayoutDashboard className="h-4 w-4 text-[#d4af37]" /> View app
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { enterAdminPreview(); nav('/app/profile'); }} className="cursor-pointer gap-2.5">
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

        {!open && !searchOpen && (
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
                  <span className="tb-admin-dock__icon"><IosIcon icon={Icon} tone="theme" glyph="contrast" size="md" className="nav-medallion" /></span>
                  <span>{label}</span>
                </NavLink>
              );
            })}
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setOpen(true); }}
              aria-label="More admin sections"
              aria-expanded={open}
              className={`tb-admin-dock__tab ${open ? 'is-active' : ''}`}
            >
              <span className="tb-admin-dock__icon"><IosIcon icon={open ? X : Menu} tone="theme" glyph="contrast" size="md" className="nav-medallion" /></span>
              <span>More</span>
            </button>
          </nav>
        )}

        {/* Phone search is a focused overlay, not a permanent second bar. */}
        {searchOpen && (
          <div className="fixed inset-0 z-[86] bg-[var(--at-bg0)] sm:hidden" role="dialog" aria-modal="true" aria-label="Search admin sections">
            <div className="flex h-full flex-col pt-[calc(var(--header-h)+10px)]">
              <div className="flex items-center gap-2 px-3 pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-[var(--at-line)] bg-[var(--at-soft)] px-3">
                  <Search className="h-4 w-4 shrink-0 text-[var(--at-gold)]" />
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={(event) => setSearchQ(event.target.value)}
                    placeholder="Search sections and actions"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-[var(--at-ink)] outline-none placeholder:text-[var(--at-mut-2)]"
                  />
                  {searchQ && (
                    <button type="button" onClick={() => setSearchQ('')} aria-label="Clear search" className="grid h-8 w-8 place-items-center text-[var(--at-mut)]">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQ(''); }} className="h-11 shrink-0 rounded-[12px] border border-[var(--at-line)] px-3 text-xs font-semibold text-[var(--at-ink-2)]">
                  Cancel
                </button>
              </div>
              <div className="nice-scroll flex-1 overflow-y-auto px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {searchResults.length ? (
                  <div className="space-y-1.5">
                    {searchResults.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => { setSearchOpen(false); setSearchQ(''); nav(item.to); }}
                          className="flex min-h-[56px] w-full items-center gap-3 rounded-[16px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 text-left"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Icon className="h-4 w-4" strokeWidth={1.9} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--at-ink)]">{item.label}</span>
                            <span className="block truncate text-[10px] uppercase tracking-[0.1em] text-[var(--at-mut-2)]">{item.group}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--at-mut-2)]" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid place-items-center py-16 text-center text-sm text-[var(--at-mut)]">No sections match “{searchQ}”.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phone More: one native sheet for the whole operator suite. */}
        {open && (
          <div className="fixed inset-0 z-[85] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="tb-sheet tb-admin-more-sheet dock-sheet-up absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border-t border-[var(--at-gold)]/25 bg-[#0a0a0f] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="tb-sheet-head sticky top-0 z-10 -mx-4 bg-[#0a0a0f] px-4 pb-2 pt-2.5">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" aria-hidden />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--at-mut-2)]">TradingBible</p>
                    <h2 className="mt-0.5 text-lg font-bold tracking-[-0.03em] text-[var(--at-ink)]">Operator menu</h2>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--at-line-soft)] text-[var(--at-mut)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold text-[#0a0a0f] ring-1 ring-[#d4af37]/40">{initial}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--at-ink)]">{user?.name || 'Operator'}</span>
                  <span className="block truncate text-[11px] text-[var(--at-mut)]">{user?.email || 'Administrator'}</span>
                </span>
                <AtBadge tone="gold">Admin</AtBadge>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => { setOpen(false); enterAdminPreview(); nav('/app'); }} className="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-[17px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[10px] font-semibold text-[var(--at-ink-2)]">
                  <LayoutDashboard className="h-4 w-4 text-[var(--at-gold)]" /> View app
                </button>
                <button type="button" onClick={() => { setOpen(false); nav('/admin/settings'); }} className="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-[17px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[10px] font-semibold text-[var(--at-ink-2)]">
                  <Settings className="h-4 w-4 text-[var(--at-gold)]" /> Settings
                </button>
                <button type="button" onClick={() => { setOpen(false); signOut(); }} className="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-[17px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[10px] font-semibold text-red-400">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>

              <div className="space-y-5">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--at-mut-2)]">{group.label}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                          key={to}
                          to={to}
                          end={end}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) => `sheet-row flex min-h-[64px] items-center gap-2.5 rounded-[16px] border px-3 py-2.5 text-left text-[11px] font-semibold ${isActive ? 'sheet-on border-[#d4af37]/40 bg-[#d4af37]/[0.10] text-[#f0ecdd] ring-1 ring-inset ring-[#d4af37]/25' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[var(--at-ink-2)]'}`}
                        >
                          <IosIcon icon={Icon} tone="theme" glyph="contrast" size="sm" className="nav-medallion nav-medallion--sm shrink-0" />
                          <span className="min-w-0 flex-1 leading-tight">{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-[var(--at-line-soft)] pt-3">
                <span className="flex flex-1 items-center justify-center rounded-[14px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] py-2"><ThemeSwitcher inline /></span>
                <span className="flex flex-1 items-center justify-center rounded-[14px] border border-[var(--at-line-soft)] bg-[var(--at-soft)] py-2"><LanguageSwitcher /></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
