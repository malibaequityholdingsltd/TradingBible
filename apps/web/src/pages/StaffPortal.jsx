import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, Menu, X,
  BarChart3, TrendingUp, Target, GraduationCap, Wallet, Shield,
  HelpCircle, Mail, Bell, Search, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { displayName, displayInitial } from '@/lib/displayName';
import { usePlatformSettings } from '@/lib/platformSettings';

const STAFF_TOOLS = {
  trader: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Your trading overview' },
    { id: 'terminal', label: 'Terminal Pro', icon: TrendingUp, desc: 'Charts, DOM, Order Flow' },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen, desc: 'Entries, exits, analytics' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Performance metrics' },
    { id: 'risk', label: 'Risk Tools', icon: Target, desc: 'Position sizing, R:R' },
    { id: 'signals', label: 'Signals', icon: TrendingUp, desc: 'Live trading signals' },
  ],
  teacher: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Your teaching overview' },
    { id: 'courses', label: 'My Courses', icon: GraduationCap, desc: 'Manage your curriculum' },
    { id: 'students', label: 'Students', icon: Users, desc: 'Track progress & grades' },
    { id: 'webinars', label: 'Webinars', icon: BarChart3, desc: 'Live sessions & replays' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Engagement & performance' },
  ],
  default: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Performance metrics' },
  ]
};

function StaffLayout({ children, title, user }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { settings } = usePlatformSettings();
  const platformName = settings?.platformName || 'TradingBible';
  const initial = displayInitial(user);
  const role = user?.accountType === 'teacher' ? 'teacher' : 'trader';
  const tools = STAFF_TOOLS[role] || STAFF_TOOLS.default;
  const { logout } = useAuth();

  const signOut = () => {
    logout();
    nav('/');
  };

  const StaffNav = (
    <div className="flex h-full flex-col tabular-nums">
      <div className="px-4 pb-3 pt-5">
        <Link to="/staff" className="group flex items-center gap-2.5">
          <span className="relative shrink-0">
            <img src={TRADINGBIBLE_LOGO} alt="TradingBible" draggable={false} className="h-9 w-9 rounded-[10px] border border-[#d4af37]/25 bg-[#0c0c11] object-contain p-0.5 transition group-hover:border-[#d4af37]/50" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#d4af37] ring-2 ring-[#0a0a0f]">
              <Shield className="h-2.5 w-2.5 text-[#0a0a0f]" />
            </span>
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-black tracking-tight text-[#f0ecdd]">{platformName}</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Staff Portal</span>
          </span>
        </Link>
      </div>

      <nav data-nav-scroll className="tbl-cascade nice-scroll flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {tools.map((tool) => (
          <Link key={tool.id} to={`/staff/${tool.id}`} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `tbl-row group flex min-h-[48px] w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition ${isActive
                ? 'tbl-row--active bg-[#d4af37]/[0.12] font-semibold text-[#f0ecdd] shadow-[inset_0_1px_0_rgba(244,230,168,0.12)] ring-1 ring-inset ring-[#d4af37]/25'
                : 'text-[#8a8577] hover:bg-white/[0.04] hover:text-[#e9e7df]'}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/[0.04] text-[#8a8577] transition group-hover:text-[#d4af37]">
            <tool.icon className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#f0ecdd]">{tool.label}</span>
            <span className="block truncate text-[10px] leading-tight text-[#8a8577]">{tool.desc}</span>
          </div>
        </Link>
        ))}
      </nav>

      <div className="border-t border-[#d4af37]/10 px-2 py-2.5 space-y-1">
        <div className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 bg-[#d4af37]/5 bg-black/20">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-sm font-bold tabular-nums text-[#0a0a0f]">{initial}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#f0ecdd]">{displayName(user)}</span>
            <span className="term-faint block text-xs capitalize">{role}</span>
          </span>
        </div>
        <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-sm tabular-nums text-[#8a8577] hover:bg-red-500/8 hover:text-red-400 transition-colors">
          <LogOut className="h-4 w-4" strokeWidth={1.9} />Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="staff-portal min-h-screen bg-transparent pt-[var(--header-h)] tabular-nums antialiased">
      <aside className="fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl lg:block">
        {StaffNav}
      </aside>

      {open && <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed bottom-0 left-0 top-[var(--header-h)] z-40 flex w-[280px] flex-col border-r border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-[10px] p-1.5 text-[#8a8577] hover:bg-white/5">
          <X className="h-5 w-5" />
        </button>
        {StaffNav}
      </aside>

      <div className="lg:pl-[280px]">
        <header className="app-header fixed inset-x-0 left-0 right-0 top-[var(--header-h)] z-[35] w-full border-b border-white/[0.06] bg-[#0a0a0f]/90 tabular-nums backdrop-blur-2xl lg:left-[280px] lg:w-[calc(100%-280px)]">
          <div aria-hidden className="app-header-hairline pointer-events-none absolute inset-x-0 bottom-0 h-px" />
          <div aria-hidden className="app-header-sheen pointer-events-none absolute inset-0 overflow-hidden" />
          <div className="flex h-14 w-full items-center justify-between gap-1 px-1 sm:gap-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button onClick={() => setOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37] lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded-[6px] bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums text-[#d4af37]">Staff</span>
                  <span className="truncate text-sm font-semibold tabular-nums text-[#f0ecdd] sm:text-base">{title || 'Staff Portal'}</span>
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-3">
              <Search className="h-4 w-4 shrink-0 text-[#8a8577]" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-[10px] text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37]" aria-label="Messages">
                <Mail className="h-4 w-4" />
              </button>
              <button onClick={() => signOut()} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium tabular-nums text-[#8a8577] transition hover:bg-white/5 hover:text-[#d4af37] sm:flex">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-none flex-1 px-4 pb-4 pt-[84px] sm:px-5 sm:pb-5 sm:pt-[92px] lg:px-7 lg:pt-[100px] xl:px-8 xl:pt-[104px] 2xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}

export function StaffDashboard() {
  const { user } = useAuth();
  const role = user?.accountType === 'teacher' ? 'teacher' : 'trader';
  
  return (
    <StaffLayout title="Dashboard" user={user}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#f0ecdd]">Welcome back</h1>
            <p className="mt-1 text-sm text-[#8a8577]">Your {capitalize(role)} workspace is ready</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Since" value="Today" icon="calendar" />
          <StatCard label="Tasks" value="0" icon="check" />
          <StatCard label="Notifications" value="0" icon="bell" />
          <StatCard label="Status" value="Active" icon="check-circle" />
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#f0ecdd] mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/staff/terminal" className="btn-primary">Open Terminal</Link>
            <Link to="/staff/journal" className="btn-secondary">Trade Journal</Link>
            <Link to="/staff/analytics" className="btn-secondary">Analytics</Link>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function StatCard({ label, value, icon }) {
  const icons = { calendar: '📅', check: '✅', bell: '🔔', 'check-circle': '✅' };
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-sm text-[#8a8577]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[#f0ecdd]">{value}</div>
    </div>
  );
}

export function StaffTerminal() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Terminal Pro" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/terminal-pro"
          className="w-full h-full border-0"
          title="Terminal Pro"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffJournal() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Trade Journal" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/journal"
          className="w-full h-full border-0"
          title="Trade Journal"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffAnalytics() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Analytics" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/analytics"
          className="w-full h-full border-0"
          title="Analytics"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffCourses() {
  const { user } = useAuth();
  return (
    <StaffLayout title="My Courses" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/academy"
          className="w-full h-full border-0"
          title="My Courses"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffStudents() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Students" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/academy?view=students"
          className="w-full h-full border-0"
          title="Students"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffWebinars() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Webinars" user={useAuth().user}>
      <div className="h-[calc(100vh-var(--header-h)-4rem)]">
        <iframe
          src="/app/academy?view=webinars"
          className="w-full h-full border-0"
          title="Webinars"
        />
      </div>
    </StaffLayout>
  );
}

export function StaffSettings() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Settings" user={useAuth().user}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#f0ecdd] mb-4">Profile Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8a8577] mb-1">Display Name</label>
              <input type="text" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8a8577] mb-1">Email</label>
              <input type="email" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8a8577] mb-1">Role</label>
              <input type="text" className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" disabled />
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

export default function StaffPortal() {
  const { user, isAuthReady, isAuthed } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthed) return nav('/login');
    if (user?.role !== 'admin' && user?.accountType !== 'teacher' && user?.accountType !== 'trader') {
      return nav('/app');
    }
  }, [isAuthReady, isAuthed, user, nav]);

  if (!isAuthReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-transparent">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4af37]/40 border-t-[#d4af37]" />
          Loading…
        </div>
      </div>
    );
  }

  if (!isAuthed) return null;

  const role = user?.accountType === 'teacher' ? 'teacher' : 'trader';
  const tools = STAFF_TOOLS[role] || STAFF_TOOLS.default;
  const toolMap = {
    dashboard: StaffDashboard,
    terminal: StaffTerminal,
    journal: StaffJournal,
    analytics: StaffAnalytics,
    courses: StaffCourses,
    students: StaffStudents,
    webinars: StaffWebinars,
    signals: () => <div className="h-full flex items-center justify-center text-[#8a8577]">Signals coming soon</div>,
    risk: () => <div className="h-full flex items-center justify-center text-[#8a8577]">Risk Tools coming soon</div>,
    students: StaffStudents,
    webinars: StaffWebinars,
    settings: StaffSettings,
  };

  const path = location.pathname.replace('/staff', '') || '/dashboard';
  const toolId = path.split('/')[1] || 'dashboard';
  const Component = toolMap[toolId] || StaffDashboard;

  return <Component />;
}