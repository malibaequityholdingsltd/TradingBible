import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, FileText, CreditCard, LibraryBig, BarChart3,
  LogOut, Menu, Shield, X, ChevronRight, Plug, Key, Package, User, ChevronDown, MonitorPlay
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/billing', label: 'Billing & Revenue', icon: CreditCard },
  { to: '/admin/content', label: 'Content', icon: LibraryBig },
  { to: '/admin/reports', label: 'Reports & Logs', icon: FileText },
  { to: '/admin/tv', label: 'TradingBible TV', icon: MonitorPlay },
  { divider: true },
  { to: '/admin/integrations', label: 'Integrations', icon: Plug },
  { to: '/admin/api-keys', label: 'API Keys', icon: Key },
  { to: '/admin/plugins', label: 'Plugins', icon: Package },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function Brand({ homeTo }) {
  return (
    <Link to={homeTo} className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-lg overflow-hidden">
        <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }} />
        <div className="hidden absolute inset-0 grid place-items-center bg-[#d4af37]/15 text-[#d4af37]">
          <Shield className="h-5 w-5" />
        </div>
      </div>
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-[#f0ecdd]">Trading<span className="gold-text">Bible</span></div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Admin Console</div>
      </div>
    </Link>
  );
}

export default function AdminLayout({ children, title }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const initial = (user?.username || user?.email || 'A').charAt(0).toUpperCase();
  const homeTo = homeRouteForUser(user);
  const signOut = () => { logout(); nav('/'); };

  const SideContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#d4af37]/10">
        <Brand homeTo={homeTo} />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item, idx) => {
          if (item.divider) return <div key={`div-${idx}`} className="my-2 h-px bg-[#d4af37]/10" />;
          const { to, label, icon: Icon, end } = item;
          return (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-button nav-shell-link group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'nav-shell-link--active text-[#f0ecdd] shadow-sm'
                    : 'text-[#8a8577] hover:text-[#e9e7df]'
                }`
              }>
              {({ isActive }) => (
                <>
                  <span className="nav-icon-frame grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.03]">
                    <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? 'text-[#d4af37]' : 'text-[#6a665a] group-hover:text-[#8a8577]'}`} strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-[#d4af37]/60 shrink-0" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#d4af37]/10 px-3 py-3 space-y-1">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#8a8577] hover:bg-red-500/8 hover:text-red-400 transition-colors">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-[var(--header-h)]">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-[var(--header-h)] bottom-0 z-30 hidden w-60 shrink-0 flex-col shell-panel lg:flex">
        {SideContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shell-panel border-r border-[#d4af37]/10">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8">
              <X className="h-5 w-5" />
            </button>
            {SideContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-h-[calc(100dvh-var(--header-h))] flex-1 flex-col pt-14 lg:ml-60">
        {/* Top bar */}
        <header className="fixed left-0 right-0 top-[var(--header-h)] z-30 flex min-h-14 items-center justify-between border-b border-[#d4af37]/10 shell-panel-soft px-3 py-2 sm:px-4 lg:left-60 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center">
                <span className="hidden text-xs uppercase tracking-wider text-[#6a665a] sm:inline">Admin</span>
                <span className="mx-2 hidden text-[#3a3a3a] sm:inline">/</span>
                <span className="truncate text-sm font-medium text-[#e9e7df] sm:text-base">{title || 'Admin Dashboard'}</span>
              </div>
            </div>
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NavLink to="/app" className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#d4af37]/15 px-3 py-1.5 text-xs text-[#8a8577] hover:border-[#d4af37]/30 hover:text-[#c9c4b4]">
              View App
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/60 px-2 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[#d4af37]/15 text-xs font-bold text-[#d4af37] sm:h-7 sm:w-7">{initial}</div>
                  <div className="hidden text-left sm:block">
                    <div className="text-xs font-medium text-[#e9e7df]">{user?.username || 'Admin'}</div>
                    <div className="text-[10px] text-[#6a665a]">Administrator</div>
                  </div>
                  <Shield className="hidden h-3.5 w-3.5 text-[#d4af37]/60 sm:block" />
                  <ChevronDown className="h-3 w-3 text-[#d4af37]/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 border-[#d4af37]/15 bg-[#111113] text-[#e9e7df]">
                <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">Admin</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => nav('/app/profile')} className="cursor-pointer gap-2.5">
                  <User className="h-4 w-4 text-[#d4af37]" /> View profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/admin/settings')} className="cursor-pointer gap-2.5">
                  <Settings className="h-4 w-4 text-[#d4af37]" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav('/app')} className="cursor-pointer gap-2.5">
                  <LayoutDashboard className="h-4 w-4 text-[#d4af37]" /> View app
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2.5 text-red-400 focus:text-red-300">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
