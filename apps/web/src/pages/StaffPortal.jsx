import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpen, Briefcase,
  CalendarDays, Check, ChevronRight, CircleHelp, Command, ExternalLink,
  GraduationCap, LayoutDashboard, LogOut, Menu, RefreshCw, Search, Settings, Radio, Clock, Award,
  Shield, ShieldCheck, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isStaffUser } from '@/lib/entitlements';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { PATHS, SCHOOLS, TRACKS, WEBINAR_CATALOG, pathStats } from '@/lib/academyCatalog';
import { displayName, displayInitial } from '@/lib/displayName';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useToast } from '@/hooks/use-toast';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import '@/styles/staff-console.css';

const LAUNCH_DATE = new Date('2026-12-25T00:00:00Z');
const CHECKLIST_KEY = 'tb:staff:checklist';

const COMPANY = {
  operator: 'TradingBible Holdings, Inc.',
  launch: '25 December 2026',
  site: 'tradingbible.app',
};

const ROLE_LABELS = {
  trader: 'Trading staff',
  teacher: 'Academy staff',
  operator: 'Operator',
};

const TOOLS = {
  trader: [
    { id: 'terminal', label: 'Terminal Pro', icon: TrendingUp, desc: 'Chart, DOM, order flow and replay', accent: 'gold' },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen, desc: 'Entries, exits and decision record', accent: 'green' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Performance and risk metrics', accent: 'blue' },
    { id: 'risk', label: 'Risk Tools', icon: Target, desc: 'Position size, R:R and portfolio risk', accent: 'violet' },
    { id: 'signals', label: 'Signals', icon: Activity, desc: 'Market setups and alert history', accent: 'rose' },
  ],
  teacher: [
    { id: 'courses', label: 'Academy Studio', icon: GraduationCap, desc: 'Curriculum, lessons and student paths', accent: 'gold' },
    { id: 'webinars', label: 'Live Webinars', icon: CalendarDays, desc: 'Host schedule, replays and rooms', accent: 'blue' },
    { id: 'analytics', label: 'Engagement', icon: BarChart3, desc: 'Learning performance and progress', accent: 'green' },
  ],
  operator: [
    { id: 'terminal', label: 'Terminal Pro', icon: TrendingUp, desc: 'Chart, DOM, order flow and replay', accent: 'gold' },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen, desc: 'Entries, exits and decision record', accent: 'green' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Performance and risk metrics', accent: 'blue' },
    { id: 'courses', label: 'Academy Studio', icon: GraduationCap, desc: 'Curriculum, lessons and student paths', accent: 'violet' },
    { id: 'risk', label: 'Risk Tools', icon: Target, desc: 'Position size, R:R and portfolio risk', accent: 'rose' },
    { id: 'signals', label: 'Signals', icon: Activity, desc: 'Market setups and alert history', accent: 'gold' },
  ],
};

function staffRole(user) {
  if (user?.role === 'admin') return 'operator';
  return user?.accountType === 'teacher' ? 'teacher' : 'trader';
}

function daysToLaunch() {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function prettyDate(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function roleLabel(user) {
  return ROLE_LABELS[staffRole(user)] || ROLE_LABELS.trader;
}

function staffTitle(user) {
  const staff = user?.user_settings?.staff || {};
  return staff.title || (staffRole(user) === 'teacher' ? 'Academy staff' : 'Trading staff');
}

function toolList(user) {
  return TOOLS[staffRole(user)] || TOOLS.trader;
}

function buildSearchItems(user) {
  const tools = toolList(user).map((tool) => ({
    label: tool.label,
    description: tool.desc,
    to: `/staff/${tool.id}`,
    group: 'Staff workspace',
  }));
  return [
    { label: 'Staff dashboard', description: 'Your workspace overview', to: '/staff', group: 'Staff workspace' },
    ...tools,
    { label: 'Staff settings', description: 'Profile and workspace preferences', to: '/staff/settings', group: 'Staff workspace' },
    { label: 'Member dashboard', description: 'Open the subscriber terminal', to: '/app', group: 'Member account' },
    { label: 'Security & passkeys', description: 'Manage sign-in protection', to: '/app/security', group: 'Member account' },
    { label: 'Public team', description: 'Documented team and open priority seats', to: '/team', group: 'Company' },
    { label: 'Launch record', description: 'Public launch status and gates', to: '/launch', group: 'Company' },
    { label: 'TBC documents', description: 'Read-only public document library', to: '/tbc/documents', group: 'Company' },
  ];
}

function StaffSearch({ open, onClose, user }) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => buildSearchItems(user), [user]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(term));
  }, [items, query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="staff-search-layer" role="dialog" aria-modal="true" aria-label="Search staff workspace">
      <button type="button" className="staff-search-scrim" aria-label="Close search" onClick={onClose} />
      <div className="staff-search-panel">
        <div className="staff-search-field">
          <Search className="h-4 w-4" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, accounts and records…"
            aria-label="Search staff workspace"
          />
          <button type="button" onClick={onClose} className="staff-search-esc">ESC</button>
        </div>
        <div className="staff-search-results">
          {filtered.length === 0 ? (
            <div className="staff-search-empty">No result for “{query.trim()}”. Try “terminal”, “settings” or “team”.</div>
          ) : filtered.map((item) => (
            <Link key={`${item.group}-${item.to}-${item.label}`} to={item.to} onClick={onClose} className="staff-search-result">
              <span className="staff-search-result__icon"><ChevronRight className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="staff-search-result__label">{item.label}</span>
                <span className="staff-search-result__desc">{item.description}</span>
              </span>
              <span className="staff-search-result__group">{item.group}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StaffLayout({ title, subtitle, user, current, actions, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { logout } = useAuth();
  const { settings } = usePlatformSettings();
  const navigate = useNavigate();
  const platformName = settings?.platformName || 'TradingBible';
  const role = staffRole(user);
  const tools = toolList(user);
  const staff = user?.user_settings?.staff || {};
  const staffCode = staff.employeeId || staff.employeeNo || 'Staff record';

  const closeMobile = () => setMobileOpen(false);
  const signOut = () => { logout(); navigate('/'); };

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navContent = (
    <div className="staff-rail__inner">
      <div className="staff-rail__brand">
        <Link to="/staff" onClick={closeMobile} className="staff-brand" aria-label="Staff workspace home">
          <span className="staff-brand__mark">
            <img src={TRADINGBIBLE_LOGO} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <span className="staff-brand__badge"><Shield className="h-2.5 w-2.5" /></span>
          </span>
          <span className="staff-brand__copy">
            <strong>{platformName}</strong>
            <span>Staff workspace</span>
          </span>
        </Link>
      </div>

      <nav className="staff-rail__nav" aria-label="Staff navigation">
        <div className="staff-nav-section">
          <div className="staff-nav-label">Workspace</div>
          <NavLink to="/staff" end onClick={closeMobile} className={({ isActive }) => `staff-nav-link${isActive ? ' is-active' : ''}`}>
            <span className="staff-nav-icon"><LayoutDashboard /></span>
            <span><strong>Dashboard</strong><small>Your staff overview</small></span>
          </NavLink>
          {tools.map((tool) => (
            <NavLink key={tool.id} to={`/staff/${tool.id}`} onClick={closeMobile} className={({ isActive }) => `staff-nav-link${isActive ? ' is-active' : ''}`}>
              <span className={`staff-nav-icon staff-nav-icon--${tool.accent}`}><tool.icon /></span>
              <span><strong>{tool.label}</strong><small>{tool.desc}</small></span>
            </NavLink>
          ))}
        </div>

        <div className="staff-nav-section">
          <div className="staff-nav-label">Company</div>
          <Link to="/team" className="staff-nav-link" onClick={closeMobile}>
            <span className="staff-nav-icon staff-nav-icon--muted"><Users /></span>
            <span><strong>Team record</strong><small>Documented team and open seats</small></span>
          </Link>
          <Link to="/launch" className="staff-nav-link" onClick={closeMobile}>
            <span className="staff-nav-icon staff-nav-icon--muted"><Sparkles /></span>
            <span><strong>Launch desk</strong><small>25 Dec 2026 status</small></span>
          </Link>
          <Link to="/tbc/documents" className="staff-nav-link" onClick={closeMobile}>
            <span className="staff-nav-icon staff-nav-icon--muted"><BookOpen /></span>
            <span><strong>Public documents</strong><small>Read-only source record</small></span>
          </Link>
        </div>

        <div className="staff-nav-section">
          <div className="staff-nav-label">Account</div>
          <Link to="/app" className="staff-nav-link" onClick={closeMobile}>
            <span className="staff-nav-icon staff-nav-icon--muted"><ArrowUpRight /></span>
            <span><strong>Member portal</strong><small>Open the subscriber app</small></span>
          </Link>
          <NavLink to="/staff/settings" onClick={closeMobile} className={({ isActive }) => `staff-nav-link${isActive ? ' is-active' : ''}`}>
            <span className="staff-nav-icon staff-nav-icon--muted"><Settings /></span>
            <span><strong>Settings</strong><small>Profile and workspace</small></span>
          </NavLink>
        </div>
      </nav>

      <div className="staff-rail__footer">
        <Link to="/staff/settings" onClick={closeMobile} className="staff-identity">
          <span className="staff-avatar">{displayInitial(user)}</span>
          <span className="staff-identity__copy">
            <strong>{displayName(user)}</strong>
            <small>{staffTitle(user)}</small>
            <em>{staffCode}</em>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </Link>
        <button type="button" onClick={signOut} className="staff-signout">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="staff-console">
      <aside className={`staff-rail${mobileOpen ? ' is-open' : ''}`} aria-label="Staff sidebar">{navContent}</aside>
      {mobileOpen && <button type="button" className="staff-mobile-scrim" aria-label="Close staff navigation" onClick={closeMobile} />}

      <div className="staff-main">
        <header className="staff-topbar">
          <div className="staff-topbar__lead">
            <button type="button" className="staff-icon-btn staff-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open staff navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="staff-topbar__title">
              <span className="staff-badge"><ShieldCheck className="h-3 w-3" /> Staff</span>
              <strong>{title || 'Staff workspace'}</strong>
              {subtitle && <small>{subtitle}</small>}
            </div>
          </div>

          <div className="staff-topbar__actions">
            <button type="button" className="staff-search-trigger" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
              <span>Search workspace</span>
              <kbd><Command className="h-3 w-3" />K</kbd>
            </button>
            <Link to="/app/alerts" className="staff-icon-btn" title="Open member alerts" aria-label="Open member alerts">
              <Bell className="h-4 w-4" />
            </Link>
            <Link to="/app" className="staff-member-link">
              <ArrowUpRight className="h-3.5 w-3.5" /> Member app
            </Link>
            {actions}
          </div>
        </header>

        <main className={`staff-content staff-content--${current || 'dashboard'}`}>
          {children}
        </main>

        <footer className="staff-footer">
          <span>{COMPANY.operator}</span>
          <span className="staff-footer__dot" />
          <span>{current === 'dashboard' ? 'Staff workspace' : `Staff workspace / ${title}`}</span>
          <span className="staff-footer__spacer" />
          <Link to="/security">Security</Link>
          <Link to="/contact">Support</Link>
        </footer>
      </div>

      <StaffSearch open={searchOpen} onClose={() => setSearchOpen(false)} user={user} />
    </div>
  );
}

function Kicker({ children, icon: Icon }) {
  return <span className="staff-kicker">{Icon && <Icon className="h-3.5 w-3.5" />}{children}</span>;
}

function Stat({ label, value, note, tone = 'default' }) {
  return (
    <div className={`staff-stat staff-stat--${tone}`}>
      <span className="staff-stat__label">{label}</span>
      <strong className="staff-stat__value">{value}</strong>
      {note && <span className="staff-stat__note">{note}</span>}
    </div>
  );
}

function QuickCard({ tool }) {
  const Icon = tool.icon;
  return (
    <Link to={`/staff/${tool.id}`} className={`staff-quick staff-quick--${tool.accent}`}>
      <span className="staff-quick__icon"><Icon /></span>
      <span className="staff-quick__copy">
        <strong>{tool.label}</strong>
        <small>{tool.desc}</small>
      </span>
      <ArrowRight className="staff-quick__arrow" />
    </Link>
  );
}

function Checklist({ user }) {
  const storageKey = `${CHECKLIST_KEY}:${user?.id || 'staff'}`;
  const [done, setDone] = useState([]);
  const items = [
    { id: 'security', label: 'Review your sign-in security', hint: 'Passkey, 2FA and active sessions', to: '/app/security' },
    { id: 'desk', label: 'Open the member desk', hint: 'Check alerts, account status and billing', to: '/app' },
    { id: 'launch', label: 'Read the launch record', hint: 'Confirm the public launch gates', to: '/launch' },
  ];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setDone(raw ? JSON.parse(raw) : []);
    } catch {
      setDone([]);
    }
  }, [storageKey]);

  const toggle = (id) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <section className="staff-panel staff-panel--checklist">
      <div className="staff-panel__head">
        <div>
          <Kicker icon={Check}>Shift checklist</Kicker>
          <h2>Three things before the desk opens.</h2>
        </div>
        <span className="staff-panel__meta">{done.length}/{items.length} done</span>
      </div>
      <div className="staff-checklist">
        {items.map((item) => {
          const checked = done.includes(item.id);
          return (
            <div key={item.id} className={`staff-check${checked ? ' is-done' : ''}`}>
              <button type="button" onClick={() => toggle(item.id)} className="staff-check__box" aria-label={`Mark ${item.label} ${checked ? 'not done' : 'done'}`} aria-pressed={checked}>
                {checked && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className="staff-check__copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <Link to={item.to} className="staff-check__open" aria-label={`Open ${item.label}`}><ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          );
        })}
      </div>
      <p className="staff-panel__footnote">Saved locally on this device. No personal data leaves your browser.</p>
    </section>
  );
}

export function StaffDashboard() {
  const { user } = useAuth();
  const role = staffRole(user);
  const tools = toolList(user);
  const staff = user?.user_settings?.staff || {};
  const first = displayName(user).split(/\s+/)[0] || 'there';
  const days = daysToLaunch();
  const memberSince = prettyDate(user?.created);

  return (
    <StaffLayout title="Dashboard" subtitle="Staff workspace" user={user} current="dashboard">
      <section className="staff-hero">
        <div className="staff-hero__glow" aria-hidden />
        <div className="staff-hero__copy">
          <Kicker icon={Sparkles}>{roleLabel(user)} · {staffTitle(user)}</Kicker>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {first}.</h1>
          <p>Your staff workspace is connected to the same member record. Open a desk, review the public record, and keep the launch work moving.</p>
          <div className="staff-hero__actions">
            <Link to={role === 'teacher' ? '/staff/courses' : '/staff/terminal'} className="staff-btn staff-btn--gold">
              {role === 'teacher' ? 'Open Academy studio' : 'Open Terminal Pro'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/staff/settings" className="staff-btn staff-btn--ghost">Manage profile</Link>
          </div>
        </div>
        <div className="staff-hero__signal" aria-hidden>
          <span className="staff-hero__ring staff-hero__ring--one" />
          <span className="staff-hero__ring staff-hero__ring--two" />
          <span className="staff-hero__ring staff-hero__ring--three" />
          <span className="staff-hero__mark"><ShieldCheck /></span>
          <span className="staff-hero__signal-label">record<br />online</span>
        </div>
      </section>

      <div className="staff-stat-grid">
        <Stat label="Workspace" value="Active" note={`${roleLabel(user)} access`} tone="green" />
        <Stat label="Staff record" value={staff.employeeId || staff.employeeNo || 'Linked'} note={staffTitle(user)} tone="gold" />
        <Stat label="Public launch" value={`${days} days`} note={COMPANY.launch} tone="blue" />
        <Stat label="Priority seats" value="12 open" note="Documented on /team" tone="violet" />
      </div>

      <div className="staff-main-grid">
        <section className="staff-panel">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={LayoutDashboard}>Your desk</Kicker>
              <h2>Everything you need, one click away.</h2>
            </div>
            <span className="staff-panel__meta">{tools.length} tools</span>
          </div>
          <div className="staff-quick-grid">
            {tools.map((tool) => <QuickCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        <section className="staff-panel staff-panel--launch">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={CalendarDays}>Launch desk</Kicker>
              <h2>25 December 2026</h2>
            </div>
          </div>
          <div className="staff-launch-count">
            <strong>{days}</strong>
            <span>days to public launch</span>
          </div>
          <p className="staff-panel__body">The public record is live. Paid surfaces, card issuance and TBC payment rails remain gated until the legal and provider conditions are satisfied.</p>
          <div className="staff-launch-links">
            <Link to="/launch">Launch record <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            <Link to="/team">Team & seats <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </section>
      </div>

      <div className="staff-main-grid staff-main-grid--lower">
        <Checklist user={user} />

        <section className="staff-panel staff-panel--record">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={Briefcase}>Company record</Kicker>
              <h2>Verified facts only.</h2>
            </div>
          </div>
          <dl className="staff-record">
            <div><dt>Operator</dt><dd>{COMPANY.operator}</dd></div>
            <div><dt>Domain</dt><dd>{COMPANY.site}</dd></div>
            <div><dt>Public launch</dt><dd>{COMPANY.launch}</dd></div>
            <div><dt>Member since</dt><dd>{memberSince}</dd></div>
          </dl>
          <Link to="/about" className="staff-text-link">Read the company record <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </div>
    </StaffLayout>
  );
}


const ACADEMY_TOTAL_LESSONS = PATHS.reduce((total, path) => total + pathStats(path.key).lessons, 0);
const ACADEMY_TOTAL_COURSES = PATHS.reduce((total, path) => total + pathStats(path.key).courses, 0);
const ACADEMY_TRACK_LABELS = Object.fromEntries(TRACKS.map((track) => [track.key, track.name]));
const ACADEMY_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function webinarTime(webinar) {
  const hour = webinar.hour % 12 || 12;
  return `${ACADEMY_WEEKDAYS[webinar.day]} · ${hour}:00 ${webinar.hour >= 12 ? 'PM' : 'AM'} ET`;
}

function StaffAcademyStudio({ mode = 'studio' }) {
  const { user } = useAuth();
  const isWebinars = mode === 'webinars';
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiServerClient.fetch('/company/teacher/overview', {
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = body?.error?.message || body?.error || 'Teacher overview is not available for this account.';
          throw new Error(message);
        }
        return body;
      })
      .then((body) => {
        if (!active) return;
        setOverview(body && !Array.isArray(body) ? body : null);
        setOverviewError('');
      })
      .catch((err) => {
        if (!active) return;
        setOverview(null);
        setOverviewError(String(err?.message || 'Teacher overview is temporarily unavailable.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const academy = overview?.academy || {};
  const teacher = overview?.teacher || {};
  const webinars = useMemo(() => [...WEBINAR_CATALOG].sort((a, b) => a.day - b.day || a.hour - b.hour), []);
  const visibleWebinars = isWebinars ? webinars : webinars.slice(0, 4);
  const teacherName = teacher.name || displayName(user);

  return (
    <StaffLayout
      title={isWebinars ? 'Live Webinars' : 'Academy Studio'}
      subtitle={isWebinars ? 'Host schedule, rooms and replays' : 'Curriculum, lessons and learning operations'}
      user={user}
      current={isWebinars ? 'webinars' : 'courses'}
    >
      <section className="staff-studio-hero">
        <div className="staff-studio-hero__copy">
          <Kicker icon={GraduationCap}>Academy 2.0 · {isWebinars ? 'Live room' : 'Staff view'}</Kicker>
          <h1>{isWebinars ? 'The schedule behind the live room.' : 'The curriculum, held to one standard.'}</h1>
          <p>
            {isWebinars
              ? 'Every SI-hosted session, its desk and its weekly slot. Member RSVP, room entry and replay controls stay inside the Academy.'
              : 'Review the full programme map, learning operations and webinar schedule. This staff view is read-only; learner enrolment and lesson playback stay inside the member Academy.'}
          </p>
          <div className="staff-hero__actions">
            <Link to={isWebinars ? '/staff/courses' : '/staff/webinars'} className="staff-btn staff-btn--gold">
              {isWebinars ? 'Open Academy Studio' : 'Open webinar schedule'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/app/academy" className="staff-btn staff-btn--ghost">Member Academy</Link>
          </div>
        </div>
        <div className="staff-studio-mark" aria-hidden>
          <span className="staff-studio-mark__icon"><GraduationCap /></span>
          <strong>{ACADEMY_TOTAL_LESSONS}</strong>
          <span>lessons across {PATHS.length} programmes</span>
        </div>
      </section>

      <div className="staff-stat-grid staff-stat-grid--four">
        <Stat label="Academy enrolments" value={loading ? '—' : (academy.enrollments ?? 0).toLocaleString()} note="Learners enrolled across paths" tone="green" />
        <Stat label="Lessons completed" value={loading ? '—' : (academy.lessonsCompleted ?? 0).toLocaleString()} note="Completed lesson records" tone="blue" />
        <Stat label="Certificates" value={loading ? '—' : (academy.certificates ?? 0).toLocaleString()} note="Issued after final exams" tone="gold" />
        <Stat label="Webinar attendance" value={loading ? '—' : (academy.webinarAttended ?? 0).toLocaleString()} note={`${academy.webinarRsvps ?? 0} RSVPs on record`} tone="violet" />
      </div>

      {overviewError && (
        <div className="staff-studio-note">
          <CircleHelp className="h-4 w-4" />
          <span>{overviewError} The curriculum and webinar catalogue below remain available.</span>
        </div>
      )}

      {!isWebinars && (
        <section className="staff-panel staff-panel--studio">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={BookOpen}>Programme map</Kicker>
              <h2>Four schools. {PATHS.length} programmes. {ACADEMY_TOTAL_COURSES} courses.</h2>
            </div>
            <span className="staff-panel__meta">{ACADEMY_TOTAL_LESSONS} lessons</span>
          </div>
          <div className="staff-school-grid">
            {SCHOOLS.map((school) => (
              <section key={school.key} className="staff-school">
                <div className="staff-school__head">
                  <span>{school.code}</span>
                  <h3>{school.name}</h3>
                </div>
                <p>{school.desc}</p>
                <div className="staff-school__paths">
                  {school.pathKeys.map((key) => {
                    const path = PATHS.find((item) => item.key === key);
                    if (!path) return null;
                    const stats = pathStats(path.key);
                    return (
                      <div key={path.key} className="staff-academy-path">
                        <div className="staff-academy-path__top">
                          <strong>{path.name}</strong>
                          <span>{stats.lessons} lessons</span>
                        </div>
                        <div className="staff-academy-path__meta">
                          <span>{path.level}</span>
                          <span>{ACADEMY_TRACK_LABELS[path.track] || path.track}</span>
                          <span>{stats.courses} courses</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

      <section className={`staff-panel staff-panel--studio${isWebinars ? ' staff-panel--webinars' : ''}`}>
        <div className="staff-panel__head">
          <div>
            <Kicker icon={Radio}>Live webinars</Kicker>
            <h2>{isWebinars ? 'Twelve weekly rooms.' : 'Next rooms on the schedule.'}</h2>
          </div>
          {!isWebinars && <Link to="/staff/webinars" className="staff-text-link">Full schedule <ArrowRight className="h-4 w-4" /></Link>}
        </div>
        <div className="staff-webinar-grid">
          {visibleWebinars.map((webinar) => (
            <article key={webinar.id} className="staff-webinar">
              <div className="staff-webinar__top">
                <span className="staff-webinar__time"><Clock className="h-3.5 w-3.5" /> {webinarTime(webinar)}</span>
                <span className="staff-webinar__track">{ACADEMY_TRACK_LABELS[webinar.track] || webinar.track}</span>
              </div>
              <h3>{webinar.title}</h3>
              <p>{webinar.description}</p>
              <div className="staff-webinar__foot">
                <span>{webinar.host}</span>
                <span>{webinar.duration} min</span>
              </div>
            </article>
          ))}
        </div>
        <p className="staff-panel__footnote">Schedule is shown in Eastern Time. RSVP, room access and replay controls are member-Academy surfaces.</p>
      </section>

      {overview && (
        <section className="staff-panel staff-panel--studio">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={Award}>Teacher record</Kicker>
              <h2>{teacherName} · Academy operations.</h2>
            </div>
          </div>
          <dl className="staff-record staff-record--inline">
            <div><dt>Account</dt><dd>{teacher.email || user?.email || '—'}</dd></div>
            <div><dt>Subject</dt><dd>{teacher.subject || 'Not assigned'}</dd></div>
            <div><dt>Applications</dt><dd>{Array.isArray(overview.myApplications) ? overview.myApplications.length : 0} on record</dd></div>
          </dl>
          {teacher.bio && <p className="staff-panel__body">{teacher.bio}</p>}
        </section>
      )}
    </StaffLayout>
  );
}

function StaffFrame({ title, subtitle, src, current }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const frameSrc = `${src}${src.includes('?') ? '&' : '?'}embed=1${version ? `&v=${version}` : ''}`;

  return (
    <StaffLayout
      title={title}
      subtitle={subtitle}
      user={user}
      current={current}
      actions={<a href={src} target="_blank" rel="noreferrer" className="staff-open-window"><ExternalLink className="h-3.5 w-3.5" /> Open full window</a>}
    >
      <div className="staff-frame">
        <div className="staff-frame__bar">
          <span className="staff-frame__live"><span /> Live workspace</span>
          <span className="staff-frame__route">{src}</span>
          <button type="button" onClick={() => { setLoaded(false); setVersion((value) => value + 1); }} className="staff-frame__refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <div className={`staff-frame__viewport${loaded ? ' is-loaded' : ''}`}>
          {!loaded && <div className="staff-frame__loading"><span className="staff-spinner" /> Loading workspace…</div>}
          <iframe key={version} src={frameSrc} title={title} onLoad={() => setLoaded(true)} />
        </div>
      </div>
    </StaffLayout>
  );
}

export function StaffTerminal() {
  return <StaffFrame title="Terminal Pro" subtitle="Charts, DOM, order flow and replay" src="/app/terminal-pro" current="terminal" />;
}

export function StaffJournal() {
  return <StaffFrame title="Trade Journal" subtitle="Decision record and trade review" src="/app/journal" current="journal" />;
}

export function StaffAnalytics() {
  return <StaffFrame title="Analytics" subtitle="Performance, risk and engagement" src="/app/analytics" current="analytics" />;
}

export function StaffRisk() {
  return <StaffFrame title="Risk Tools" subtitle="Position size and portfolio risk" src="/app/tools" current="risk" />;
}

export function StaffSignals() {
  return <StaffFrame title="Signals" subtitle="Market setups and alert history" src="/app/signals" current="signals" />;
}

export function StaffCourses() {
  return <StaffAcademyStudio mode="studio" />;
}

export function StaffWebinars() {
  return <StaffAcademyStudio mode="webinars" />;
}

export function StaffStudents() {
  return <Navigate to="/staff/courses" replace />;
}

export function StaffSettings() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user?.first_name || user?.firstName || '');
  const [lastName, setLastName] = useState(user?.last_name || user?.lastName || '');
  const [busy, setBusy] = useState(false);
  const staff = user?.user_settings?.staff || {};

  useEffect(() => {
    setFirstName(user?.first_name || user?.firstName || '');
    setLastName(user?.last_name || user?.lastName || '');
  }, [user]);

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter your first and last name before saving.' });
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      toast({ title: 'Profile updated', description: 'Your staff profile is now up to date.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not save', description: String(err?.message || 'Please try again.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffLayout title="Settings" subtitle="Profile and workspace" user={user} current="settings">
      <div className="staff-settings-grid">
        <section className="staff-panel">
          <div className="staff-panel__head">
            <div>
              <Kicker icon={Settings}>Profile</Kicker>
              <h1>Your staff identity.</h1>
            </div>
          </div>
          <form onSubmit={save} className="staff-form">
            <label>
              <span>First name</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
            </label>
            <label>
              <span>Last name</span>
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" />
            </label>
            <label>
              <span>Account email</span>
              <input value={user?.email || ''} readOnly disabled />
              <small>Email changes are handled by the account security team.</small>
            </label>
            <label>
              <span>Role</span>
              <input value={`${roleLabel(user)} · ${staffTitle(user)}`} readOnly disabled />
            </label>
            <div className="staff-form__actions">
              <button type="submit" disabled={busy} className="staff-btn staff-btn--gold">{busy ? 'Saving…' : 'Save profile'}</button>
              <Link to="/app/profile" className="staff-btn staff-btn--ghost">Member profile</Link>
            </div>
          </form>
        </section>

        <div className="staff-settings-side">
          <section className="staff-panel">
            <div className="staff-panel__head">
              <div><Kicker icon={ShieldCheck}>Staff record</Kicker><h2>Read-only facts.</h2></div>
            </div>
            <dl className="staff-record">
              <div><dt>Department</dt><dd>{staff.department || '—'}</dd></div>
              <div><dt>Employee ID</dt><dd>{staff.employeeId || staff.employeeNo || '—'}</dd></div>
              <div><dt>Title</dt><dd>{staffTitle(user)}</dd></div>
              <div><dt>Status</dt><dd>{isStaffUser(user) ? 'Hired' : 'Operator access'}</dd></div>
            </dl>
          </section>
          <section className="staff-panel staff-panel--callout">
            <Kicker icon={CircleHelp}>Help & controls</Kicker>
            <h2>Keep the account safe.</h2>
            <p className="staff-panel__body">Review passkeys, two-factor authentication and active sessions before working from a new device.</p>
            <div className="staff-link-list">
              <Link to="/app/security">Security & passkeys <ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link to="/contact">Contact support <ArrowRight className="h-3.5 w-3.5" /></Link>
              <Link to="/terms">Terms of Service <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </section>
        </div>
      </div>
    </StaffLayout>
  );
}

function StaffNotFound() {
  const { user } = useAuth();
  return (
    <StaffLayout title="Not found" subtitle="Staff workspace" user={user} current="not-found">
      <section className="staff-notfound">
        <span className="staff-kicker">404 · Workspace</span>
        <h1>That staff tool does not exist.</h1>
        <p>The workspace has a fixed set of desks and records. Choose a real route below or open the dashboard.</p>
        <div className="staff-hero__actions">
          <Link to="/staff" className="staff-btn staff-btn--gold">Staff dashboard <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/app" className="staff-btn staff-btn--ghost">Member app</Link>
        </div>
      </section>
    </StaffLayout>
  );
}

export default function StaffPortal() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname.replace(/^\/staff\/?/, '');
  const toolId = path.split('/')[0] || 'dashboard';

  const toolMap = {
    dashboard: StaffDashboard,
    terminal: StaffTerminal,
    journal: StaffJournal,
    analytics: StaffAnalytics,
    risk: StaffRisk,
    signals: StaffSignals,
    courses: StaffCourses,
    webinars: StaffWebinars,
    students: StaffStudents,
    settings: StaffSettings,
  };
  const Component = toolMap[toolId];

  if (!Component) return <StaffNotFound />;
  return <Component />;
}
