import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, DollarSign, Activity, Search, Trash2, RefreshCw, Shield,
  Save, LibraryBig, FileText, BarChart3, TrendingUp, AlertTriangle, CheckCircle,
  XCircle, Edit2, Eye, EyeOff, Download, ChevronLeft, ChevronRight, Filter,
  ToggleLeft, ToggleRight, Key, Server, Database, Globe, Mail, X, UserCheck,
  Crown, TrendingDown, Clock, Zap, Settings2, Lock, Bell, Cpu, HardDrive,
  Wifi, Package, Plus, Copy, RotateCcw, Plug, TestTube, AlertCircle, Check,
  Upload,   ChevronDown, MoreVertical, Power, Code, Layers, MonitorPlay, Target,
  GraduationCap, LayoutDashboard, Type, Trophy, Coins, Ban, Wallet, Bot,
  Building2, Landmark, Palette, Rocket, ShieldCheck, Fingerprint, ExternalLink, Sparkles, Printer
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtPageBar, AtLink, AtMetric, AtPanel, AtProgress,
  AtRing, AtSectionHeading, AtSparkline, AtTabs,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { displayName, displayInitial } from '@/lib/displayName';
import { notifyPlatformSettingsChanged } from '@/lib/platformSettings';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { COMPANY_DEFAULTS, loadCompanyProfile, saveCompanyProfile, buildContextText } from '@/lib/companyProfile';
import { LIVE_CHANNELS } from '@/lib/liveChannels';
import { ABTestingEngine } from '@/lib/ads/abtesting.js';
import { useToast } from '@/hooks/use-toast';

const GOLD = '#d4af37';
const PLAN_COLORS = { none: '#6a665a', pro: '#3b82f6', elite: GOLD, professional: '#a855f7' };
const PLAN_PRICES = { pro: 19.99, elite: 49.99, professional: 99.00 };
const ACADEMY_PRICE = 150; // one-time lifetime fee
// No free trial: paid plans only. Helpers treat legacy 'trial' rows as no plan.
const PAID_PLANS = ['pro', 'elite', 'professional'];
const planKey = (p) => (!p || p === 'trial' ? null : p);
const isPaidPlan = (p) => PAID_PLANS.includes(planKey(p));
const displayPlan = (p) => planKey(p) || 'none';
const planLabel = (p) => { const k = displayPlan(p); return k === 'none' ? 'No plan' : k.charAt(0).toUpperCase() + k.slice(1); };

/* M1–M12 forecast from the financial model (loan file): M6 = 185 users / $7,102 MRR, M12 = 600 users / $23,034 MRR */
const PLAN_FORECAST = (() => {
  const anchors = [
    { m: 1, users: 40, mrr: 1000 },
    { m: 6, users: 185, mrr: 7102 },
    { m: 12, users: 600, mrr: 23034 },
  ];
  const rows = [];
  for (let m = 1; m <= 12; m += 1) {
    const idx = anchors.findIndex((a, i) => m >= a.m && (i === anchors.length - 1 || m < anchors[i + 1].m));
    const seg = anchors[idx];
    const next = anchors[idx + 1] || seg;
    const span = next.m - seg.m || 1;
    const step = m - seg.m;
    rows.push({
      m: `M${m}`,
      users: Math.round(seg.users * Math.pow(next.users / seg.users, step / span)),
      mrr: Math.round(seg.mrr * Math.pow(next.mrr / seg.mrr, step / span)),
    });
  }
  return rows;
})();

// Legacy trial end-date passthrough (no trials are issued anymore;
// existing rows keep whatever the database holds, otherwise null).
function computeTrialEndsAt(user) {
  return user.trialEndsAt || user.trial_ends_at || null;
}

function normalizeAdminUser(raw, source) {
  const role = raw.role || raw.user_role || 'user';
  const created = raw.created || raw.created_at || '';
  const normalized = {
    ...raw,
    source,
    role,
    created,
    username: raw.username || (raw.email ? raw.email.split('@')[0] : 'user'),
    name: raw.name || [raw.first_name ?? raw.firstName, raw.last_name ?? raw.lastName].filter(Boolean).join(' ') || raw.username || (raw.email ? raw.email.split('@')[0] : 'User'),
    first_name: raw.first_name ?? raw.firstName ?? '',
    last_name: raw.last_name ?? raw.lastName ?? '',
    dob: raw.dob || null,
    plan: planKey(raw.plan),
    accountType: raw.accountType === 'company' || raw.account_type === 'company' ? 'teacher'
      : raw.accountType === 'individual' || raw.account_type === 'individual' ? 'trader'
      : raw.accountType || raw.account_type || (role === 'teacher' ? 'teacher' : 'trader'),
    trialEndsAt: computeTrialEndsAt(raw),
    subscriptionStatus: raw.subscriptionStatus || (isPaidPlan(raw.plan) ? 'active' : null),
  };
  return normalized;
}

/* ─── shared data hooks ─────────────────────────────────────────── */
function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('users');
  const load = async () => {
    setLoading(true);
    try {
      let list = [];

      // Admin endpoint merges Supabase auth users + `users`-table rows
      // (service role), so unpaid accounts appear even without a users row.
      try {
        const token = pb.authStore.token;
        if (token) {
          const res = await fetch(`${API_SERVER_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setSource('api-admin');
              setUsers(data.map((u) => normalizeAdminUser(u, 'api-admin')));
              return;
            }
          }
        }
      } catch { /* fall through */ }

      try {
        const usersRows = await pb.collection('users').getFullList({ sort: '-created', requestKey: 'admin-users' });
        list = usersRows.map((u) => normalizeAdminUser(u, 'users'));
      } catch {
        list = [];
      }

      if (list.length > 0) {
        setSource('users');
        setUsers(list);
        return;
      }

      const profileRows = await pb.collection('profiles').getFullList({ sort: '-created_at', requestKey: 'admin-profiles' });
      setSource('profiles');
      setUsers(profileRows.map((u) => normalizeAdminUser(u, 'profiles')));
    } catch {
      setUsers([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return { users, loading, reload: load, setUsers, source };
}

function useTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    pb.collection('trades').getFullList({ sort: '-created', requestKey: 'admin-trades' })
      .then(setTrades).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return { trades, loading };
}

/* ─── shared UI ─────────────────────────────────────────────────── */
function Stat({ icon: Icon, label, value, sub, color = GOLD, trend }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-[#8a8577]">{label}</span>
        <div style={{ background: `${color}18` }} className="grid h-8 w-8 place-items-center rounded-lg shrink-0">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="mt-3 font-mono text-xl sm:text-2xl font-semibold text-[#f0ecdd] truncate">{value}</div>
      {sub && <div className={`mt-1 text-xs ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-[#8a8577]'}`}>{sub}</div>}
    </div>
  );
}

function Badge({ children, color = 'gold' }) {
  const cls = {
    gold: 'bg-[#d4af37]/15 text-[#d4af37]',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-red-500/15 text-red-400',
    blue: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
    muted: 'bg-white/8 text-[#8a8577]',
    orange: 'bg-orange-500/15 text-orange-400',
  }[color] || 'bg-white/8 text-[#8a8577]';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{children}</span>;
}

const planBadge = (plan) => {
  if (!planKey(plan)) return <Badge color="muted">No plan</Badge>;
  if (planKey(plan) === 'pro') return <Badge color="blue">Pro</Badge>;
  if (planKey(plan) === 'elite') return <Badge color="gold">Elite</Badge>;
  return <Badge color="purple">Professional</Badge>;
};

function Spinner() {
  return (
    <div className="glass rounded-2xl p-5" aria-hidden>
      <div className="tb-shimmer h-5 w-1/4 rounded-lg" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tb-shimmer h-9 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function Collapse({ title, sub, count, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} className="glass rounded-[10px]">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">{title}</span>
        {count != null && <span className="rounded-md bg-[#d4af37]/12 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-[#d4af37]">{count}</span>}
        {sub && <span className="truncate text-[11px] text-[#8a8577]">{sub}</span>}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#8a8577] transition-transform open:rotate-180" />
      </summary>
      <div className="border-t border-white/[0.07] p-4 sm:px-5">{children}</div>
    </details>
  );
}

function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#8a8577]">
      <span>{total} results — page {page} of {pages}</span>
      <div className="flex gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/15 disabled:opacity-30 hover:border-[#d4af37]/40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/15 disabled:opacity-30 hover:border-[#d4af37]/40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Edit User Modal ────────────────────────────────────────────── */
function EditUserModal({ user, userSource, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    dob: (user.dob || '').slice(0, 10),
    name: user.name || '',
    plan: planKey(user.plan),
    role: user.role || 'user',
    email: user.email || '',
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let updated;
      if (userSource === 'profiles') {
        updated = await pb.collection('profiles').update(user.id, {
          user_role: ['admin', 'trader', 'teacher', 'student'].includes(form.role) ? form.role : 'student',
        });
      } else {
        updated = await pb.collection('users').update(user.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          dob: form.dob || null,
          name: `${String(form.first_name).trim()} ${String(form.last_name).trim()}`.trim() || form.name,
          plan: form.plan,
          role: form.role,
          phone: form.phone,
        });
      }
      toast({ title: 'User updated', description: `${form.email} saved.` });
      onSaved(normalizeAdminUser(updated, userSource));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Update failed', description: err?.message || 'Try again.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-2xl p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#f0ecdd]">Edit User</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8 hover:text-[#f0ecdd]"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['first_name', 'First name'], ['last_name', 'Last name'], ['dob', 'Date of birth'], ['name', 'Display Name']].map(([k, l]) => (
              <div key={k}>
                <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">{l}</label>
                <input value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })}
                  type={k === 'dob' ? 'date' : 'text'}
                  disabled={userSource === 'profiles'}
                  className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 disabled:opacity-50" />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Phone</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              disabled={userSource === 'profiles'}
              className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 disabled:opacity-50" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Email (read-only)</label>
            <input value={form.email} disabled className="w-full rounded-xl border border-white/5 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#6a665a] outline-none opacity-60" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Plan</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}
                disabled={userSource === 'profiles'}
                className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 disabled:opacity-50">
                {['none', 'pro', 'elite', 'professional'].map(p => <option key={p} value={p === 'none' ? '' : p} className="bg-[#0f0f14]">{planLabel(p === 'none' ? null : p)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50">
                <option value="user" className="bg-[#0f0f14]">User</option>
                <option value="admin" className="bg-[#0f0f14]">Admin</option>
                <option value="teacher" className="bg-[#0f0f14]">Teacher</option>
                <option value="student" className="bg-[#0f0f14]">Student</option>
                <option value="trader" className="bg-[#0f0f14]">Trader</option>
              </select>
            </div>
          </div>
          {userSource === 'profiles' && (
            <p className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/8 px-3 py-2 text-xs text-[#c9c4b4]">
              This account comes from the Supabase profiles table. Role updates are enabled; billing-plan fields are read-only here.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#d4af37]/15 py-2.5 text-sm text-[#8a8577] hover:border-[#d4af37]/30">Cancel</button>
            <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-60">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── User Detail Modal ──────────────────────────────────────────── */
function UserDetailModal({ user, onClose }) {
  const fields = [
    ['Email', user.email],
    ['First name', user.first_name || '—'],
    ['Last name', user.last_name || '—'],
    ['Date of birth', (user.dob || '').slice(0, 10) || '—'],
    ['Name', user.name || '—'],
    ['Phone', user.phone || '—'],
    ['Plan', planLabel(user.plan)],
    ['Role', user.role || 'user'],
    ['Verified', user.verified ? 'Yes' : 'No'],
    ['Primary Market', user.primaryMarket || '—'],
    ['Experience', user.experience || '—'],
    ['Goal', user.goal || '—'],
    ['Joined', (user.created || '').slice(0, 10)],
    ['Subscription ID', user.subscriptionId || '—'],
    ['Sub Status', user.subscriptionStatus || '—'],
    ['Trial Ends', user.trialEndsAt ? user.trialEndsAt.slice(0, 10) : '—'],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-2xl p-4 sm:p-5 max-h-[80vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d4af37]/15 text-lg font-bold text-[#d4af37]">
              {displayInitial(user)}
            </div>
            <div>
              <div className="font-semibold text-[#f0ecdd]">{displayName(user)}</div>
              <div className="text-xs text-[#8a8577]">User Profile</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8"><X className="h-5 w-5" /></button>
        </div>
        <div className="divide-y divide-white/5">
          {fields.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 text-sm gap-4">
              <span className="text-[#8a8577] shrink-0">{k}</span>
              <span className="font-mono text-[#e9e7df] max-w-[60%] truncate text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN DASHBOARD ────────────────────────────────────────────── */
export function AdminDashboard() {
  const { users, loading } = useUsers();
  const { trades } = useTrades();

  const stats = useMemo(() => {
    const paid = users.filter(u => isPaidPlan(u.plan));
    const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);
    const verified = users.filter(u => u.verified).length;
    const academyBuyers = users.filter(u => u.academyAccess).length;
    const academyRevenue = academyBuyers * ACADEMY_PRICE;
    const customers = users.filter(u => isPaidPlan(u.plan) || u.academyAccess).length;
    return { total: users.length, paid: paid.length, mrr, verified, trades: trades.length, academyBuyers, academyRevenue, customers };
  }, [users, trades]);

  const growth = useMemo(() => {
    const buckets = {};
    users.forEach(u => {
      const d = (u.created || '').slice(0, 7);
      if (d) buckets[d] = (buckets[d] || 0) + 1;
    });
    const keys = Object.keys(buckets).sort().slice(-8);
    let run = 0;
    return keys.map(k => { run += buckets[k]; return { m: k.slice(5), users: run, new: buckets[k] }; });
  }, [users]);

  const recent = useMemo(() => users.slice(0, 8), [users]);

  const milestones = useMemo(() => {
    const first = users.map(u => (u.created || '').slice(0, 7)).filter(Boolean).sort()[0];
    let monthsLive = null;
    if (first) {
      const [fy, fm] = first.split('-').map(Number);
      const now = new Date();
      monthsLive = (now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm) + 1;
    }
    const m6 = { label: 'M6 Target', users: 185, mrr: 7102 };
    const m12 = { label: 'M12 Target', users: 600, mrr: 23034 };
    return [
      { ...m6, uPct: Math.min(100, Math.round(stats.total / m6.users * 100)), rPct: Math.min(100, Math.round(stats.mrr / m6.mrr * 100)) },
      { ...m12, uPct: Math.min(100, Math.round(stats.total / m12.users * 100)), rPct: Math.min(100, Math.round(stats.mrr / m12.mrr * 100)) },
    ].map(m => ({ ...m, monthsLive }));
  }, [users, stats]);

  const [sysHealth, setSysHealth] = useState([
    { label: 'Database', status: 'unknown', icon: Database },
    { label: 'API Server', status: 'unknown', icon: Server },
    { label: 'Auth Service', status: 'unknown', icon: Shield },
    { label: 'Email Service', status: 'unknown', icon: Mail },
    { label: 'Billing (Stripe)', status: 'unknown', icon: CreditCard },
    { label: 'Billing (Paddle)', status: 'unknown', icon: CreditCard },
    { label: 'Market Data', status: 'unknown', icon: Activity },
    { label: 'D&B (DUNS)', status: 'unknown', icon: Globe },
  ]);
  const [money, setMoney] = useState(null);
  const [supply, setSupply] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/admin/wallet/overview`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const j = await res.json();
          setMoney(j.money || null);
          setSupply(j.tbcSupply || null);
        }
      } catch { /* money cards stay blank */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/admin/health`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const h = await res.json();
        const c = h.checks || {};
        const ok = (v) => (v ? 'ok' : 'off');
        setSysHealth([
          { label: 'Database', status: ok(c.supabase), detail: c.supabase ? 'connected' : 'unreachable', icon: Database },
          { label: 'API Server', status: 'ok', detail: `v${h.version || '?'} · up ${Math.floor((h.uptimeSec || 0) / 3600)}h`, icon: Server },
          { label: 'Auth Service', status: ok(c.supabase), detail: c.supabase ? 'GoTrue' : 'unreachable', icon: Shield },
          { label: 'Email Service', status: ok(c.smtp), detail: c.smtp ? 'SMTP set' : 'not configured', icon: Mail },
          { label: 'Billing (Stripe)', status: ok(c.stripe), detail: c.stripe ? 'keys set' : 'not configured', icon: CreditCard },
          { label: 'Billing (Paddle)', status: ok(c.paddle), detail: c.paddle ? 'keys set' : 'not configured', icon: CreditCard },
          { label: 'Market Data', status: ok(c.market), detail: c.market ? 'feeds reachable' : 'unreachable', icon: Activity },
          { label: 'D&B (DUNS)', status: ok(c.dnb), detail: c.dnb ? 'Direct+ live' : 'sandbox stub', icon: Globe },
        ]);
      } catch {
        setSysHealth((prev) => prev.map((s) => ({ ...s, status: s.label === 'API Server' ? 'ok' : 'off' })));
      }
    })();
  }, []);

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const verifiedRate = stats.total ? Math.round((stats.verified / stats.total) * 100) : 0;
  const planTone = (plan) => (planKey(plan) === 'pro' ? 'blue' : planKey(plan) === 'elite' ? 'gold' : planKey(plan) === 'professional' ? 'violet' : 'muted');

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          actions={(
            <>
              <AtButton to="/admin/users" variant="gold" icon={Users}>Users</AtButton>
              <AtButton to="/admin/tbc" variant="outline" icon={Coins}>TBC</AtButton>
              <AtButton to="/admin/billing" variant="quiet" icon={CreditCard}>Billing</AtButton>
            </>
          )}
        />

        {loading ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((n) => <div key={n} className="at-kpi animate-pulse bg-[var(--at-soft)]" />)}
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <AtMetric icon={Users} label="Total users" value={stats.total.toLocaleString()} note={`${stats.verified} verified · ${verifiedRate}% of accounts`} />
              <AtMetric icon={CreditCard} label="Paid subscribers" value={stats.paid.toLocaleString()} note={`${Math.max(0, stats.total - stats.paid).toLocaleString()} accounts without a plan`} />
              <AtMetric icon={DollarSign} label="Monthly recurring" value={`$${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="Estimated from active plan prices" tone="text-[var(--at-green)]" />
              <AtMetric icon={GraduationCap} label="Academy students" value={stats.academyBuyers.toLocaleString()} note={`$${stats.academyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} lifetime revenue`} />
              <AtMetric icon={Activity} label="Journaled trades" value={stats.trades.toLocaleString()} note="Across all member accounts" />
            </div>

            <div className="mt-6">
              <AtSectionHeading
                index="01"
                title="Growth & trajectory"
                sub="Cumulative registrations against the illustrative operating plan."
                action={<AtBadge tone="gold">{growth.length} months of data</AtBadge>}
              />
              <div className="grid gap-3 lg:grid-cols-5">
                <AtPanel
                  className="lg:col-span-3"
                  title="User growth"
                  sub="Cumulative registered accounts by month."
                  action={<AtLink to="/admin/analytics">Analytics</AtLink>}
                >
                  {growth.length ? (
                    <div className="h-[224px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growth} margin={{ top: 8, left: -18, right: 6, bottom: 0 }}>
                          <defs>
                            <linearGradient id="atGrowth" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={GOLD} stopOpacity={0.34} />
                              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="m" tick={{ fill: 'var(--at-mut)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--at-mut)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                          <Tooltip
                            contentStyle={{ background: 'var(--at-panel)', border: '1px solid var(--at-line)', borderRadius: 10, fontSize: 11, color: 'var(--at-ink)' }}
                            labelStyle={{ color: 'var(--at-mut)', fontSize: 10 }}
                            itemStyle={{ color: 'var(--at-gold)', fontSize: 11 }}
                          />
                          <Area type="monotone" dataKey="users" name="Total users" stroke={GOLD} strokeWidth={2} fill="url(#atGrowth)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="grid h-[224px] place-items-center text-xs text-[var(--at-mut)]">No growth data yet.</div>}
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--at-line-soft)] pt-3">
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">New this month</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-[var(--at-ink)]">{growth.length ? growth[growth.length - 1].new.toLocaleString() : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Verified</div>
                      <div className="mt-1 font-mono text-sm font-semibold text-[var(--at-green)]">{verifiedRate}%</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Growth trend</div>
                      <div className="mt-1"><AtSparkline data={growth.map((g) => g.new)} height={22} color="var(--at-gold)" /></div>
                    </div>
                  </div>
                </AtPanel>

                <div className="space-y-3 lg:col-span-2">
                  {milestones.map((m) => (
                    <AtPanel
                      key={m.label}
                      title={m.label}
                      sub={m.monthsLive != null ? `Operating month ${m.monthsLive} · illustrative loan model` : 'Illustrative loan model'}
                      action={<AtBadge tone="amber">Model</AtBadge>}
                    >
                      <div className="flex items-center gap-4">
                        <AtRing value={m.uPct} size={62} label={`${m.uPct}%`} />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[var(--at-mut)]">
                              <span>Users</span>
                              <span className="font-mono text-[var(--at-ink-2)]">{stats.total.toLocaleString()} / {m.users.toLocaleString()}</span>
                            </div>
                            <AtProgress value={m.uPct} />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[var(--at-mut)]">
                              <span>MRR</span>
                              <span className="font-mono text-[var(--at-ink-2)]">${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${m.mrr.toLocaleString()}</span>
                            </div>
                            <AtProgress value={m.rPct} tone="green" />
                          </div>
                        </div>
                      </div>
                    </AtPanel>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <AtSectionHeading
                index="02"
                title="Money & ledger"
                sub="Subscriptions, settlement and the separate TBC credit economy."
                action={<AtLink to="/admin/billing">Open billing</AtLink>}
              />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <AtMetric icon={DollarSign} label="Est. MRR" value={`$${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="Monthly recurring revenue" tone="text-[var(--at-green)]" />
                <AtMetric icon={Activity} label="Ledger in · 30d" value={money ? `$${Math.round(money.inUsd30d).toLocaleString()}` : '—'} note="All USD inflows, incl. non-subscription" />
                <AtMetric icon={DollarSign} label="Ledger in · all time" value={money ? `$${Math.round(money.inUsd).toLocaleString()}` : '—'} note="USD inflows since launch" />
                <AtMetric icon={Wallet} label="Pending payouts" value={money ? `$${Math.round(money.pendingUsd).toLocaleString()}` : '—'} note="Awaiting release" tone="text-[var(--at-amber)]" />
                <AtMetric icon={GraduationCap} label="Academy revenue" value={`$${stats.academyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="One-time lifetime access" />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
                <AtPanel
                  title="Settlement snapshot"
                  sub="Platform money movement, not token supply."
                  action={<AtBadge tone={money ? 'green' : 'amber'}>{money ? 'Connected' : 'Awaiting data'}</AtBadge>}
                >
                  <div className="space-y-3">
                    {[
                      { label: 'Monthly ledger inflow', value: money ? `$${Math.round(money.inUsd30d).toLocaleString()}` : '—', note: 'Last 30 days' },
                      { label: 'Pending payouts', value: money ? `$${Math.round(money.pendingUsd).toLocaleString()}` : '—', note: 'Requires release review' },
                      { label: 'Academy lifetime revenue', value: `$${stats.academyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, note: `${stats.academyBuyers} students` },
                      { label: 'Paying customers', value: stats.customers.toLocaleString(), note: `${stats.paid} subscriptions + ${stats.academyBuyers} academy` },
                    ].map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[var(--at-line-soft)] pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="text-[11px] font-semibold text-[var(--at-ink)]">{row.label}</div>
                          <div className="mt-0.5 text-[9px] text-[var(--at-mut-2)]">{row.note}</div>
                        </div>
                        <div className="shrink-0 font-mono text-[13px] font-semibold text-[var(--at-ink)]">{row.value}</div>
                      </div>
                    ))}
                  </div>
                </AtPanel>

                <AtPanel
                  eyebrow="Two ledgers, never merged"
                  title="TBC credits & proposed token"
                  sub="The off-chain platform credit is live. The proposed token is not."
                  action={<AtBadge tone={supply?.tokenIssued ? 'green' : 'amber'}>{supply?.tokenIssued ? 'Token issued' : 'Token not issued'}</AtBadge>}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] p-3">
                      <AtBadge tone="gold">Off-chain credit · live</AtBadge>
                      <div className="mt-3 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--at-ink)]">{supply ? Number(supply.circulatingTbc).toLocaleString() : '—'}</div>
                      <div className="mt-0.5 text-[9px] text-[var(--at-mut)]">TBC credits currently held</div>
                      <div className="mt-3 space-y-1.5 border-t border-[var(--at-line-soft)] pt-2 text-[9px] text-[var(--at-mut)]">
                        <div className="flex justify-between gap-2"><span>Credits ever issued</span><span className="font-mono text-[var(--at-ink-2)]">{supply ? Number(supply.issuedTbc ?? 0).toLocaleString() : '—'}</span></div>
                        <div className="flex justify-between gap-2"><span>30-day volume</span><span className="font-mono text-[var(--at-ink-2)]">{money ? Math.round(money.inTbc30d + money.outTbc30d).toLocaleString() : '—'}</span></div>
                        <div className="flex justify-between gap-2"><span>Peg</span><span className="font-mono text-[var(--at-ink-2)]">1 TBC = 1 KWD</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                      <AtBadge tone="muted">Proposed token · not issued</AtBadge>
                      <div className="mt-3 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--at-mut)]">{supply ? Number(supply.maxSupply).toLocaleString() : '—'}</div>
                      <div className="mt-0.5 text-[9px] text-[var(--at-mut-2)]">Proposed maximum supply</div>
                      <div className="mt-3 space-y-1.5 border-t border-[var(--at-line-soft)] pt-2 text-[9px] text-[var(--at-mut)]">
                        <div className="flex justify-between gap-2"><span>On-chain supply</span><span className="font-mono text-[var(--at-mut-2)]">None</span></div>
                        <div className="flex justify-between gap-2"><span>Sale</span><span className="font-mono text-[var(--at-mut-2)]">Disabled</span></div>
                        <div className="flex justify-between gap-2"><span>Allocation</span><span className="font-mono text-[var(--at-mut-2)]">Illustrative</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <AtAlert icon={Coins} tone="amber">
                      Never present the illustrative 30/20/20/15/10/5 split as actual supply. Credit balances are platform accounting, not token transfers.
                    </AtAlert>
                  </div>
                </AtPanel>
              </div>
            </div>

            <div className="mt-6">
              <AtSectionHeading
                index="03"
                title="Operations"
                sub="Infrastructure posture and the newest accounts."
                action={<AtButton to="/admin/reports" variant="quiet" size="sm" iconRight={ExternalLink}>Reports & logs</AtButton>}
              />
              <div className="grid gap-3 lg:grid-cols-3">
                <AtPanel title="System health" sub="Configured services and live connectivity." action={<AtBadge tone={sysHealth.every((s) => s.status === 'ok') ? 'green' : 'amber'}>{sysHealth.filter((s) => s.status === 'ok').length}/{sysHealth.length} online</AtBadge>}>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {sysHealth.map(({ label, status, detail, icon: Icon }) => (
                      <div key={label} className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-2.5 py-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-semibold text-[var(--at-ink-2)]">{label}</div>
                          {detail && <div className="truncate text-[8px] text-[var(--at-mut-2)]">{detail}</div>}
                        </div>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status === 'ok' ? 'bg-[var(--at-green)] shadow-[0_0_7px_var(--at-green)]' : status === 'unknown' ? 'bg-[var(--at-mut-2)]' : 'bg-[var(--at-red)]'}`} />
                      </div>
                    ))}
                  </div>
                </AtPanel>

                <AtPanel
                  className="lg:col-span-2"
                  title="Recent registrations"
                  sub="Latest eight accounts, newest first."
                  action={<AtLink to="/admin/users">All users</AtLink>}
                  flush
                  bodyClassName="!p-0"
                >
                  <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
                    <table className="at-table min-w-[520px]">
                      <thead>
                        <tr><th>User</th><th>Plan</th><th>Verified</th><th>Joined</th></tr>
                      </thead>
                      <tbody>
                        {recent.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[10px] font-bold text-[var(--at-gold)]">{displayInitial(u)}</span>
                                <div className="min-w-0">
                                  <div className="max-w-[150px] truncate text-[11px] font-semibold !text-[var(--at-ink)] sm:max-w-none">{displayName(u)}</div>
                                  <div className="max-w-[150px] truncate text-[9px] !text-[var(--at-mut)] sm:max-w-none">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><AtBadge tone={planTone(u.plan)}>{planLabel(u.plan)}</AtBadge></td>
                            <td>
                              {u.verified
                                ? <span className="flex items-center gap-1 text-[10px] text-[var(--at-green)]"><CheckCircle className="h-3.5 w-3.5" /> Yes</span>
                                : <span className="flex items-center gap-1 text-[10px] text-[var(--at-mut-2)]"><XCircle className="h-3.5 w-3.5" /> No</span>}
                            </td>
                            <td className="font-mono text-[9px]">{(u.created || '').slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AtPanel>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { to: '/admin/users', icon: Users, title: 'Manage users', sub: 'Plans, roles and verification' },
                  { to: '/admin/tbc', icon: Coins, title: 'Review TBC gates', sub: 'Read-only control room' },
                  { to: '/admin/legal-vault', icon: ShieldCheck, title: 'Open legal vault', sub: '31 controlled instruments' },
                  { to: '/admin/company', icon: Building2, title: 'Company Bible', sub: 'The single source of truth' },
                ].map(({ to, icon: Icon, title, sub }) => (
                  <Link key={to} to={to} className="at-card at-card--hover flex items-center gap-3 p-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-[var(--at-ink)]">{title}</span>
                      <span className="block truncate text-[9px] text-[var(--at-mut)]">{sub}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </AdminLayout>
  );
}

/* ─── ADMIN USERS ────────────────────────────────────────────────── */
const PER_PAGE = 20;

export function AdminUsers() {
  const { users, loading, setUsers, reload, source } = useUsers();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    let out = users;
    if (q) out = out.filter(u => (u.email + (u.first_name || '') + (u.last_name || '') + (u.name || '') + (u.phone || '')).toLowerCase().includes(q.toLowerCase()));
    if (planFilter !== 'all') out = out.filter(u => displayPlan(u.plan) === planFilter);
    if (roleFilter !== 'all') out = out.filter(u => (u.role || 'user') === roleFilter);
    return out;
  }, [users, q, planFilter, roleFilter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const allPageSelected = paged.length > 0 && paged.every(u => selected.has(u.id));

  const toggleAll = () => {
    if (allPageSelected) setSelected(prev => { const n = new Set(prev); paged.forEach(u => n.delete(u.id)); return n; });
    else setSelected(prev => { const n = new Set(prev); paged.forEach(u => n.add(u.id)); return n; });
  };

  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const remove = async (u) => {
    if (source === 'profiles') {
      toast({ variant: 'destructive', title: 'Direct delete disabled', description: 'Delete profile-backed users in Supabase Auth > Users.' });
      return;
    }
    if (u.role === 'admin') return toast({ variant: 'destructive', title: 'Cannot delete admin' });
    if (!window.confirm(`Delete ${u.email}?`)) return;
    try {
      await pb.collection('users').delete(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast({ title: 'User deleted', description: u.email });
    } catch (err) { toast({ variant: 'destructive', title: 'Failed', description: err?.message }); }
  };

    const setSuspended = async (u, suspended) => {
    if (u.role === 'admin') return toast({ variant: 'destructive', title: 'Cannot suspend admin' });
    if (suspended && !window.confirm(`Suspend ${u.email}? They stay logged in but lose everything except support contact.`)) return;
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify({ suspended, reason: suspended ? 'manual review' : undefined }),
      });
      if (!res.ok) throw new Error('request failed');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, user_settings: { ...(x.user_settings || {}), suspended } } : x)));
      toast({ title: suspended ? 'Account suspended' : 'Account restored', description: u.email });
    } catch (err) { toast({ variant: 'destructive', title: 'Failed', description: err?.message }); }
  };

  const bulkDelete = async () => {    if (source === 'profiles') {
      toast({ variant: 'destructive', title: 'Bulk delete disabled', description: 'Delete profile-backed users in Supabase Auth > Users.' });
      return;
    }
    const toDelete = [...selected].filter(id => {
      const u = users.find(x => x.id === id);
      return u && u.role !== 'admin';
    });
    if (!toDelete.length) return toast({ title: 'No eligible users', description: 'Admin accounts are protected.' });
    if (!window.confirm(`Delete ${toDelete.length} user(s)? This cannot be undone.`)) return;
    let deleted = 0;
    for (const id of toDelete) {
      try { await pb.collection('users').delete(id); deleted++; } catch { /* skip */ }
    }
    setUsers(prev => prev.filter(u => !toDelete.includes(u.id)));
    setSelected(new Set());
    toast({ title: `Deleted ${deleted} user(s)` });
  };

  const purgeAllNonAdminUsers = async () => {
    if (source === 'profiles') {
      toast({ variant: 'destructive', title: 'Purge disabled', description: 'Delete profile-backed users in Supabase Auth > Users.' });
      return;
    }
    const nonAdminUsers = users.filter((u) => (u.role || 'user') !== 'admin');
    if (!nonAdminUsers.length) {
      toast({ title: 'No non-admin users to delete' });
      return;
    }
    const confirmation = window.prompt('Type DELETE ALL USERS to confirm permanent removal of all non-admin users.');
    if (confirmation !== 'DELETE ALL USERS') {
      toast({ variant: 'destructive', title: 'Cancelled', description: 'Confirmation phrase did not match.' });
      return;
    }

    let deleted = 0;
    for (const u of nonAdminUsers) {
      try {
        await pb.collection('users').delete(u.id);
        deleted++;
      } catch {
        // continue deleting remaining users
      }
    }
    setUsers((prev) => prev.filter((u) => (u.role || 'user') === 'admin'));
    setSelected(new Set());
    toast({ title: `Deleted ${deleted} user(s)`, description: 'All non-admin users were removed.' });
  };

  const exportCSV = () => {
    const rows = [['id', 'email', 'first_name', 'last_name', 'name', 'dob', 'phone', 'plan', 'role', 'verified', 'created', 'subscriptionStatus']];
    filtered.forEach(u => rows.push([u.id, u.email, u.first_name || '', u.last_name || '', u.name || '', (u.dob || '').slice(0, 10), u.phone || '', displayPlan(u.plan), u.role || 'user', u.verified ? 'true' : 'false', (u.created || '').slice(0, 10), u.subscriptionStatus || '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    toast({ title: 'Exported', description: `${filtered.length} users downloaded.` });
  };

  const onSaved = (updated) => { setUsers(prev => prev.map(u => u.id === updated.id ? normalizeAdminUser(updated, source) : u)); setEditing(null); };

  return (
    <AdminLayout title="User Management">
      {editing && <EditUserModal user={editing} userSource={source} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {viewing && <UserDetailModal user={viewing} onClose={() => setViewing(null)} />}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        {source === 'profiles' && (
          <div className="w-full rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/8 px-3 py-2 text-xs text-[#c9c4b4]">
            Users are being read from Supabase <span className="font-mono">profiles</span>. Role edit works here; deleting users must be done in Supabase Auth.
          </div>
        )}
        <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#8a8577]" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by email, name, or phone…"
            className="w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
          {q && <button onClick={() => setQ('')}><X className="h-4 w-4 text-[#6a665a] hover:text-[#c9c4b4]" /></button>}
        </div>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none">
          <option value="all" className="bg-[#0f0f14]">All Plans</option>
          {['none', 'pro', 'elite', 'professional'].map(p => <option key={p} value={p} className="bg-[#0f0f14]">{planLabel(p === 'none' ? null : p)}</option>)}
        </select>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none">
          <option value="all" className="bg-[#0f0f14]">All Roles</option>
          <option value="user" className="bg-[#0f0f14]">User</option>
          <option value="admin" className="bg-[#0f0f14]">Admin</option>
          <option value="student" className="bg-[#0f0f14]">Student</option>
          <option value="teacher" className="bg-[#0f0f14]">Teacher</option>
          <option value="trader" className="bg-[#0f0f14]">Trader</option>
        </select>
        <div className="flex gap-2">
          <button onClick={reload} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 px-3 py-2.5 text-sm text-[#d4af37] hover:border-[#d4af37]/40">
            <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh list</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/15 px-3 py-2.5 text-sm text-[#8a8577] hover:text-[#e9e7df]">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
        <button onClick={purgeAllNonAdminUsers} className="flex items-center gap-1.5 rounded-xl border border-red-500/35 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
          <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Purge non-admin users</span>
        </button>
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/25">
            <Trash2 className="h-4 w-4" /> Delete selected ({selected.size})
          </button>
        )}
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="tb-mobile-actions w-full sm:min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                  <th className="px-4 py-3"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="h-4 w-4 accent-[#d4af37]" /></th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Plan</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Role</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id} className={`border-b border-white/5 transition hover:bg-white/[0.03] ${selected.has(u.id) ? 'bg-[#d4af37]/5' : ''} ${u.role === 'admin' ? 'bg-[#d4af37]/[0.05]' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} className="h-4 w-4 accent-[#d4af37]" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-[#d4af37]/20 text-[#d4af37] ring-1 ring-[#d4af37]/50' : 'bg-[#d4af37]/10 text-[#d4af37]'}`}>
                          {displayInitial(u)}
                          {u.role === 'admin' && <Crown className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#0a0a0f] p-0.5 text-[#d4af37]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-medium text-[#f0ecdd]">{displayName(u)}</span>
                            {u.role === 'admin' && <span className="shrink-0 rounded-full bg-[#d4af37]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">Admin</span>}
                          </div>
                          <div className="truncate text-xs text-[#8a8577] max-w-[200px] sm:max-w-[260px]" title={u.email}>{u.email}</div>
                          {u.phone && (
                            <div className="truncate font-mono text-[11px] text-[#6a665a] max-w-[200px]">{u.phone}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">{planBadge(u.plan)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">{planBadge(u.plan)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {u.user_settings?.suspended && <Badge color="red"><Ban className="h-3 w-3" /> Suspended</Badge>}
                      {u.role === 'admin'
                        ? <Badge color="gold"><Shield className="h-3 w-3" /> Admin</Badge>
                        : <Badge color="muted">{(u.role || 'user').charAt(0).toUpperCase() + (u.role || 'user').slice(1)}</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.verified
                        ? <Badge color="green"><CheckCircle className="h-3 w-3" /> Verified</Badge>
                        : <Badge color="muted">Unverified</Badge>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#8a8577] hidden lg:table-cell">{(u.created || '').slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(u)} title="View" className="rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8 hover:text-[#c9c4b4]"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => setEditing(u)} title="Edit" className="rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8 hover:text-[#d4af37]"><Edit2 className="h-4 w-4" /></button>
                        {u.user_settings?.suspended
                          ? <button onClick={() => setSuspended(u, false)} disabled={u.role === 'admin'} title="Restore account" className="rounded-lg p-1.5 text-emerald-400/80 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20"><Ban className="h-4 w-4" /></button>
                          : <button onClick={() => setSuspended(u, true)} disabled={u.role === 'admin'} title="Suspend account" className="rounded-lg p-1.5 text-[#8a8577] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20"><Ban className="h-4 w-4" /></button>}
                        <button onClick={() => remove(u)} disabled={u.role === 'admin' || source === 'profiles'} title={source === 'profiles' ? 'Delete in Supabase Auth' : 'Delete'} className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!paged.length && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8a8577]">No users match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN ANALYTICS ────────────────────────────────────────────── */
export function AdminAnalytics() {
  const { users, loading } = useUsers();
  const { trades } = useTrades();
  const { toast } = useToast();

  const planDist = useMemo(() => {
    const counts = { none: 0, pro: 0, elite: 0, professional: 0 };
    users.forEach(u => { const k = displayPlan(u.plan); counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name === 'none' ? 'No plan' : name.charAt(0).toUpperCase() + name.slice(1), value, color: PLAN_COLORS[name] }));
  }, [users]);

  const monthlyNew = useMemo(() => {
    const buckets = {};
    users.forEach(u => {
      const d = (u.created || '').slice(0, 7);
      if (d) buckets[d] = (buckets[d] || 0) + 1;
    });
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([k, v]) => ({ m: k.slice(5), new: v }));
  }, [users]);

  const tradesByMarket = useMemo(() => {
    const counts = {};
    trades.forEach(t => { if (t.market) counts[t.market] = (counts[t.market] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [trades]);

  const paid = users.filter(u => isPaidPlan(u.plan));
  const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);
  const academyBuyers = users.filter(u => u.academyAccess).length;
  const academyRevenue = academyBuyers * ACADEMY_PRICE;

  const churn = useMemo(() => {
    const everPaid = users.filter(u => isPaidPlan(u.plan) || u.subscriptionStatus);
    const canceled = users.filter(u => u.subscriptionStatus === 'canceled' || u.subscriptionStatus === 'past_due');
    return everPaid.length ? canceled.length / everPaid.length : 0;
  }, [users]);
  const arpu = paid.length ? mrr / paid.length : 0;
  const ltv = churn > 0 ? arpu / churn : null;
  const CAC = 150;
  const ltvCac = ltv != null ? ltv / CAC : null;

  const forecastRows = useMemo(() => {
    const keys = users.map(u => (u.created || '').slice(0, 7)).filter(Boolean).sort();
    const launch = keys[0];
    if (!launch) return [];
    const [ly, lm] = launch.split('-').map(Number);
    const liveByMonth = {};
    const mrrByMonth = {};
    users.forEach(u => {
      const d = (u.created || '').slice(0, 7);
      if (!d) return;
      liveByMonth[d] = (liveByMonth[d] || 0) + 1;
      if (isPaidPlan(u.plan)) mrrByMonth[d] = (mrrByMonth[d] || 0) + (PLAN_PRICES[u.plan] || 0);
    });
    return PLAN_FORECAST.map((row, i) => {
      const d = new Date(ly, lm - 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const liveUsers = liveByMonth[key] || 0;
      const liveMrr = mrrByMonth[key] || 0;
      return {
        ...row,
        liveUsers,
        liveMrr,
        win: row.users ? Math.min(100, Math.round((liveUsers / row.users) * 100)) : 0,
      };
    });
  }, [users]);

  const exportForecastCSV = () => {
    const header = ['Month', 'Target Users', 'Live Users', 'Win Rate %', 'Target MRR', 'Live MRR', 'MRR Win %'];
    const lines = forecastRows.map(r => [r.m, r.users, r.liveUsers, r.win, r.mrr, r.liveMrr, r.mrr ? Math.round((r.liveMrr / r.mrr) * 100) : 0]);
    const csv = [header, ...lines].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Exported', description: 'Live vs forecast saved as CSV.' });
  };

  return (
    <AdminLayout title="Analytics">
      <div className="at-page at-scope at-enter pb-10">
      {loading ? <Spinner /> : (
        <>
          <div className="mb-4 mt-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
            <AtMetric icon={Users} label="Total users" value={users.length} note="Registered" />
            <AtMetric icon={UserCheck} label="Verified" value={users.filter(u => u.verified).length} note="Email confirmed" tone="text-[var(--at-green)]" />
            <AtMetric icon={Crown} label="Paid" value={paid.length} note={`${users.length ? Math.round(paid.length / users.length * 100) : 0}% conversion`} tone="text-[var(--at-gold)]" />
            <AtMetric icon={TrendingUp} label="Est. MRR" value={`$${mrr.toFixed(0)}`} note="Monthly recurring" />
          </div>

          <div className="mb-5 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <AtMetric icon={GraduationCap} label="Academy students" value={academyBuyers.toLocaleString()} note="Lifetime access" />
            <AtMetric icon={DollarSign} label="Academy revenue" value={`$${academyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="One-time, lifetime" />
            <AtMetric icon={UserCheck} label="Est. churn" value={`${(churn * 100).toFixed(1)}%`} note="Canceled / ever subscribed" tone={churn > 0.3 ? 'text-[var(--at-red)]' : 'text-[var(--at-green)]'} />
            <AtMetric icon={DollarSign} label="ARPU" value={`$${arpu.toFixed(2)}`} note="MRR per paid user" />
            <AtMetric icon={Crown} label="LTV : CAC" value={ltvCac != null ? `${ltvCac.toFixed(1)}x` : '—'} note={`LTV $${(ltv ?? 0).toFixed(0)} / CAC $${CAC}`} tone={ltvCac >= 3 ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
            <AtMetric icon={Target} label="Plan fit" value={forecastRows.length && mrr > 0 ? `${Math.round(mrr / PLAN_FORECAST[0].mrr * 100)}%` : '—'} note="Live MRR vs M1 target" tone="text-[var(--at-gold)]" />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-[10px] p-4 sm:p-5">
              <h3 className="mb-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">New Registrations / Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyNew} margin={{ left: -12 }}>
                  <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="new" name="New Users" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-[10px] p-4 sm:p-5">
              <h3 className="mb-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Plan Distribution</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={planDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {planDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {planDist.map(({ name, value, color }) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-[#c9c4b4]">{name}</span>
                      </div>
                      <span className="font-mono text-[#f0ecdd]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {tradesByMarket.length > 0 && (
            <Collapse title="Trade Volume by Market" defaultOpen={false}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tradesByMarket} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#c9c4b4', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" name="Trades" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Collapse>
          )}

          {forecastRows.length > 0 && (
            <Collapse title="Live vs Plan — M1–M12 Forecast" sub="M6: 185 users / $7,102 · M12: 600 / $23,034" defaultOpen={false}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#8a8577]">Targets from the financial model.</p>
                <button onClick={exportForecastCSV} className="flex items-center gap-1.5 rounded-[10px] border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/60">
                  <Download className="h-4 w-4" /> Export live vs-forecast CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm tabular-nums">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                      <th className="py-2.5 font-semibold">Month</th>
                      <th className="py-2.5 font-semibold">Target Users</th>
                      <th className="py-2.5 font-semibold">Live Users</th>
                      <th className="py-2.5 font-semibold">Win Rate</th>
                      <th className="py-2.5 font-semibold">Target MRR</th>
                      <th className="py-2.5 font-semibold">Live MRR</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr]:border-t [&_tr]:border-white/5 [&_tr:hover]:bg-white/[0.02]">
                    {forecastRows.map(r => {
                      const ahead = r.liveUsers >= r.users;
                      return (
                        <tr key={r.m} className="border-b border-white/5">
                          <td className="py-3 font-semibold text-[#f0ecdd]">{r.m}</td>
                          <td className="py-3 font-mono text-[#c9c4b4]">{r.users.toLocaleString()}</td>
                          <td className="py-3 font-mono text-[#f0ecdd]">{r.liveUsers.toLocaleString()}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-white/8">
                                <div className="h-full rounded-full" style={{ width: `${r.win}%`, background: ahead ? '#10b981' : GOLD }} />
                              </div>
                              <span className="font-mono text-xs text-[#8a8577]">{r.win}%</span>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-[#c9c4b4]">${r.mrr.toLocaleString()}</td>
                          <td className="py-3 font-mono text-emerald-400">${r.liveMrr.toLocaleString()}</td>
                          <td className="py-3">
                            {r.win >= 100
                              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> On track</span>
                              : <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/10 px-2 py-0.5 text-xs text-[#d4af37]"><Clock className="h-3 w-3" /> {ahead ? 'Ahead' : 'Catching up'}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Collapse>
          )}
        </>
      )}
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN BILLING ──────────────────────────────────────────────── */
export function AdminBilling() {
  const { users, loading } = useUsers();
  const { toast } = useToast();
  const [live, setLive] = useState(null);
  const [payUser, setPayUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoaded, setPayoutsLoaded] = useState(false);
  const [chAttempts, setChAttempts] = useState([]);
  const [chLoaded, setChLoaded] = useState(false);
  const [busy, setBusy] = useState(null);
  const [stFrom, setStFrom] = useState('2026-08-01');
  const [stTo, setStTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [stBusy, setStBusy] = useState(null);
  const [stMsg, setStMsg] = useState('');

  const downloadStatement = async (kind) => {
    setStBusy(kind);
    setStMsg('');
    try {
      const token = pb.authStore.token;
      const url = kind === 'balance'
        ? `${API_SERVER_URL}/admin/financials/balance-sheet?asof=${encodeURIComponent(stTo)}`
        : `${API_SERVER_URL}/admin/financials/income-statement?from=${encodeURIComponent(stFrom)}&to=${encodeURIComponent(stTo)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = kind === 'balance' ? `tradingbible-balance-sheet-${stTo}.csv` : `tradingbible-income-statement-${stFrom}-${stTo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStMsg('Downloaded — CSV is accepted by D&B (max 10 MB). Have your accountant finalize before uploading.');
    } catch (err) {
      setStMsg(String(err.message || err));
    } finally {
      setStBusy(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/admin/billing/summary`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setLive(await res.json());
      } catch { /* estimates remain */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/wallet/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPayouts((await res.json()).withdrawals || []);
      } catch { /* payouts stay empty */ }
      finally { setPayoutsLoaded(true); }
    })();
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/challenges/admin/all`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setChAttempts((await res.json()).attempts || []);
      } catch { /* attempts stay empty */ }
      finally { setChLoaded(true); }
    })();
  }, []);

  const adminCall = async (path, body) => {
    const res = await fetch(`${API_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  };

  const cancelSub = async (u) => {
    if (!window.confirm(`Cancel ${u.email}'s subscription at period end?`)) return;
    setBusy(`cancel:${u.id}`);
    try {
      const r = await adminCall('/admin/billing/cancel', { userId: u.id });
      toast({ title: `Cancelled ${r.canceled?.length || 0} subscription(s) — access until period end` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: err.message });
    } finally { setBusy(null); }
  };

  const openPayments = async (u) => {
    setPayUser(u);
    setPayments([]);
    setBusy(`pay:${u.id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/billing/payments?userId=${encodeURIComponent(u.id)}`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setPayments(data.payments || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Payments lookup failed', description: err.message });
    } finally { setBusy(null); }
  };

  const payChallenge = async (a) => {
    if (!window.confirm(`Pay pass reward for ${a.userEmail || a.owner} (${a.product_name}) to their TBC credit wallet?`)) return;
    setBusy(`chalpay:${a.id}`);
    try {
      const r = await adminCall(`/challenges/admin/payout/${a.id}`, {});
      toast({ title: `Paid ${Number(r.payoutTbc).toLocaleString()} TBC ($${r.payoutUsd})` });
      setChAttempts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'paid' } : x)));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Payout failed', description: err.message });
    } finally { setBusy(null); }
  };

  const refundPayment = async (pi) => {
    const amountStr = window.prompt(`Refund amount in USD (blank = full $${pi.amount}):`, '');
    if (amountStr === null) return;
    const amount = amountStr.trim() === '' ? undefined : Number(amountStr);
    if (amount !== undefined && !(amount > 0)) { toast({ variant: 'destructive', title: 'Invalid amount' }); return; }
    setBusy(`refund:${pi.id}`);
    try {
      const r = await adminCall('/admin/billing/refund', { paymentIntentId: pi.id, amount });
      toast({ title: `Refunded $${r.amount} (${r.status})` });
      setPayments((prev) => prev.map((p) => (p.id === pi.id ? { ...p, status: 'refunded' } : p)));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Refund failed', description: err.message });
    } finally { setBusy(null); }
  };

  const paid = useMemo(() => users.filter(u => isPaidPlan(u.plan)), [users]);
  const noPlan = users.filter(u => !planKey(u.plan));
  const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);
  const arr = mrr * 12;
  const academyBuyers = users.filter(u => u.academyAccess).length;
  const academyRevenue = academyBuyers * ACADEMY_PRICE;

  const planBreakdown = useMemo(() => {
    const counts = {};
    paid.forEach(u => { counts[u.plan] = (counts[u.plan] || 0) + 1; });
    return Object.entries(counts).map(([plan, n]) => ({ plan, n, rev: n * PLAN_PRICES[plan] }));
  }, [paid]);

  return (
    <AdminLayout title="Billing & Revenue">
      <div className="at-page at-scope at-enter pb-10">
      <div className="mb-5 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <AtMetric icon={DollarSign} label={live?.configured ? 'Live MRR' : 'Est. MRR'} value={`$${(live?.configured ? live.mrr : mrr).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note={live?.configured ? `Stripe live · ${live.activeCount} active` : 'Monthly recurring (est)'} tone="text-[var(--at-green)]" />
        <AtMetric icon={TrendingUp} label="Est. ARR" value={`$${arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="Annual recurring" />
        <AtMetric icon={CreditCard} label="Paid subscribers" value={paid.length} note={`$${paid.length ? (mrr / paid.length).toFixed(2) : 0} ARPU`} />
        <AtMetric icon={Users} label="No plan" value={noPlan.length} note={`${users.length ? Math.round(noPlan.length / users.length * 100) : 0}% of total`} />
        <AtMetric icon={GraduationCap} label="Academy sales" value={academyBuyers.toLocaleString()} note="Lifetime access" />
        <AtMetric icon={DollarSign} label="Academy revenue" value={`$${academyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} note="One-time, lifetime" />
      </div>

      {planBreakdown.length > 0 && (
        <Collapse title="Revenue by Plan" sub="By subscription tier" defaultOpen={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm tabular-nums">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                  <th className="py-2.5 font-semibold">Plan</th>
                  <th className="py-2.5 font-semibold">Subscribers</th>
                  <th className="py-2.5 font-semibold">Unit Price</th>
                  <th className="py-2.5 font-semibold">Monthly Rev</th>
                  <th className="py-2.5 font-semibold hidden sm:table-cell">Share</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-white/5 [&_tr:hover]:bg-white/[0.02]">
                {planBreakdown.map(({ plan, n, rev }) => (
                  <tr key={plan} className="border-b border-white/5">
                    <td className="py-3">{planBadge(plan)}</td>
                    <td className="py-3 font-mono text-[#f0ecdd]">{n}</td>
                    <td className="py-3 font-mono text-[#c9c4b4]">${PLAN_PRICES[plan]}</td>
                    <td className="py-3 font-mono text-emerald-400">${rev.toFixed(2)}</td>
                    <td className="py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: mrr > 0 ? `${(rev / mrr) * 100}%` : '0%' }} />
                        </div>
                        <span className="w-10 text-right font-mono text-xs text-[#8a8577]">{mrr > 0 ? `${Math.round(rev / mrr * 100)}%` : '0%'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapse>
      )}

      {loading ? <Spinner /> : (
        <Collapse title="Active Subscriptions" sub="Plans, status and actions" defaultOpen={true}>
          <div className="space-y-2 px-3 pb-3 sm:hidden">
            {paid.length ? paid.map((u) => (
              <div key={u.id} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[#f0ecdd]">{displayName(u)}</div>
                    <div className="truncate text-xs text-[#8a8577]">{u.email}</div>
                  </div>
                  <Badge color={u.subscriptionStatus === 'active' ? 'green' : 'muted'}>{u.subscriptionStatus || 'active'}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {planBadge(u.plan)}
                  <button onClick={() => openPayments(u)} disabled={busy === `pay:${u.id}`} className="ml-auto rounded-lg border border-[#d4af37]/25 px-3 py-1.5 text-xs text-[#d4af37] disabled:opacity-60">Payments</button>
                  <button onClick={() => cancelSub(u)} disabled={busy === `cancel:${u.id}`} className="rounded-lg border border-red-500/35 px-3 py-1.5 text-xs text-red-400 disabled:opacity-60">Cancel</button>
                </div>
              </div>
            )) : <p className="py-6 text-center text-sm text-[#8a8577]">No paid subscriptions yet.</p>}
          </div>
          <div className="hidden overflow-x-auto sm:block">
          <table className="tb-mobile-actions w-full sm:min-w-[560px] text-sm tabular-nums">
            <thead className="sticky top-0 z-10">
                <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                  <th className="px-5 py-2.5 font-semibold">User</th>
                  <th className="px-5 py-2.5 font-semibold hidden sm:table-cell">Plan</th>
                  <th className="px-5 py-2.5 font-semibold hidden sm:table-cell">Status</th>
                  <th className="px-5 py-2.5 font-semibold hidden md:table-cell">Period End</th>
                  <th className="px-5 py-2.5 font-semibold hidden lg:table-cell">Sub ID</th>
                  <th className="px-5 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-white/5">
                {paid.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <div className="text-[#f0ecdd] truncate max-w-[140px]">{displayName(u)}</div>
                      <div className="text-xs text-[#8a8577] truncate max-w-[160px]">{u.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">{planBadge(u.plan)}</div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">{planBadge(u.plan)}</td>
                    <td className="px-5 py-3 hidden sm:table-cell"><Badge color={u.subscriptionStatus === 'active' ? 'green' : 'muted'}>{u.subscriptionStatus || 'active'}</Badge></td>
                    <td className="px-5 py-3 font-mono text-xs text-[#8a8577] hidden md:table-cell">{u.currentPeriodEnd ? u.currentPeriodEnd.slice(0, 10) : '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#6a665a] max-w-[120px] truncate hidden lg:table-cell">{u.subscriptionId || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openPayments(u)} disabled={busy === `pay:${u.id}`} className="rounded-lg border border-[#d4af37]/25 px-2.5 py-1.5 text-xs text-[#d4af37] disabled:opacity-60">Payments</button>
                        <button onClick={() => cancelSub(u)} disabled={busy === `cancel:${u.id}`} className="rounded-lg border border-red-500/35 px-2.5 py-1.5 text-xs text-red-400 disabled:opacity-60">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!paid.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8a8577]">No paid subscriptions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Collapse>
        )}

        <Collapse title="Wallet Payouts & Swaps" sub="View-only money movement" defaultOpen={false}>
          <p className="mb-3 text-xs text-[#8a8577]">Automatic Stripe Connect transfers and non-custodial swap records. View-only — money moves without admin action.</p>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm tabular-nums">
            <thead className="sticky top-0 z-10">
                <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                  <th className="px-5 py-2.5 font-semibold">User</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold">Amount</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 font-semibold hidden md:table-cell">Rail / KYC</th>
                  <th className="px-5 py-2.5 font-semibold hidden lg:table-cell">Reference</th>
                </tr>
              </thead>
            <tbody className="[&_tr]:border-t [&_tr]:border-white/5">
              {payouts.map(w => (
                <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <div className="truncate text-[#f0ecdd] max-w-[180px]">{w.userEmail || '—'}</div>
                    <div className="font-mono text-[11px] text-[#6a665a]">{w.created ? String(w.created).slice(0, 16).replace('T', ' ') : ''}</div>
                  </td>
                  <td className="px-5 py-3"><Badge color={w.type === 'swap' ? 'muted' : 'gold'}>{w.type}</Badge></td>
                  <td className="px-5 py-3 font-mono text-[#f0ecdd]">{Number(w.amount) > 0 ? '+' : ''}{Number(w.amount).toFixed(2)} {w.currency}</td>
                  <td className="px-5 py-3"><Badge color={w.status === 'completed' ? 'green' : w.status === 'failed' ? 'red' : 'gold'}>{w.status}</Badge></td>
                  <td className="px-5 py-3 text-xs text-[#8a8577] hidden md:table-cell">{[w.connectStatus, w.kycStatus].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#6a665a] max-w-[160px] truncate hidden lg:table-cell">{w.reference || '—'}</td>
                </tr>
              ))}
              {payoutsLoaded && !payouts.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8a8577]">No payouts or swaps yet.</td></tr>}
              {!payoutsLoaded && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8a8577]">Loading…</td></tr>}
            </tbody>
          </table>
          </div>
        </Collapse>

        <Collapse title="TradingBible Funded — Attempts" sub="Pass rewards, one click" defaultOpen={false}>
          <p className="mb-3 text-xs text-[#8a8577]">Passed attempts pay the product pass reward to the trader's TBC credit wallet. One click.</p>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm tabular-nums">
            <thead className="sticky top-0 z-10">
                <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                  <th className="px-5 py-2.5 font-semibold">User</th>
                  <th className="px-5 py-2.5 font-semibold">Program</th>
                  <th className="px-5 py-2.5 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Payout</th>
                </tr>
              </thead>
            <tbody>
              {chAttempts.map((a) => {
                const s = a.stats || {};
                const failRule = (s.checks || []).find((c) => !c.pass && (c.id === 'maxdd' || c.id === 'daily'));
                return (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <div className="truncate text-[#f0ecdd] max-w-[180px]">{a.userEmail || '—'}</div>
                      <div className="font-mono text-[11px] text-[#6a665a]">{a.created_at ? String(a.created_at).slice(0, 10) : ''}</div>
                    </td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{a.product_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#8a8577]">${Number(a.fee_paid || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 font-mono text-xs text-[#8a8577]">
                      {s.equity !== undefined ? `+${s.profitPct}% · DD ${s.maxDdPct}% · day ${s.worstDayPct}% · ${s.days}d · ${s.trades}t` : '—'}
                      {failRule && <span className="block text-[11px] text-red-400">Breach: {failRule.label}</span>}
                    </td>
                    <td className="px-5 py-3"><Badge color={a.status === 'passed' || a.status === 'paid' ? 'green' : a.status === 'failed' ? 'red' : 'gold'}>{a.status}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      {a.status === 'passed' && (
                        <button onClick={() => payChallenge(a)} disabled={busy === `chalpay:${a.id}`} className="rounded-lg border border-[#d4af37]/30 px-3 py-1.5 text-xs font-bold text-[#d4af37] disabled:opacity-50">
                          {busy === `chalpay:${a.id}` ? 'Paying…' : 'Pay reward'}
                        </button>
                      )}
                      {a.status === 'paid' && <span className="text-xs text-emerald-400">Paid ✓</span>}
                    </td>
                  </tr>
                );
              })}
              {chLoaded && !chAttempts.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8a8577]">No attempts yet.</td></tr>}
              {!chLoaded && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[#8a8577]">Loading…</td></tr>}
            </tbody>
          </table>
          </div>
        </Collapse>
        <Collapse title="D&B financial statements" sub="D-U-N-S 14-997-6777 · CSV downloads" defaultOpen={false}>
          <p className="mb-3 text-xs leading-relaxed text-[#8a8577]">
            D-U-N-S <span className="font-mono text-[#c9c4b4]">14-997-6777</span> · D&amp;B requires a Balance Sheet and an Income Statement
            (doc, pdf, csv, jpg, png, docx — max 10 MB). Downloads below are <span className="text-[#d4af37]">draft CSVs from platform records, unaudited</span>.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8577]">From</label>
              <input type="date" value={stFrom} onChange={(e) => setStFrom(e.target.value)} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8577]">To</label>
              <input type="date" value={stTo} onChange={(e) => setStTo(e.target.value)} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
            </div>
            <button disabled={stBusy} onClick={() => downloadStatement('income')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-60">
              <Download className="h-4 w-4" /> {stBusy === 'income' ? 'Preparing…' : 'Income Statement (CSV)'}
            </button>
            <button disabled={stBusy} onClick={() => downloadStatement('balance')} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/30 px-4 py-2.5 text-sm font-semibold text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-60">
              <Download className="h-4 w-4" /> {stBusy === 'balance' ? 'Preparing…' : 'Balance Sheet (CSV)'}
            </button>
          </div>
          {stMsg && <p className="mt-2 text-xs text-[#c9c4b4]">{stMsg}</p>}
        </Collapse>
        {payUser && (
          <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[#f0ecdd]">Recent payments · {payUser.email}</h3>
              <button onClick={() => { setPayUser(null); setPayments([]); }} className="text-xs text-[#8a8577] hover:text-[#e9e7df]">Close</button>
            </div>
            {busy === `pay:${payUser.id}` ? <Spinner /> : payments.length ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2 text-sm">
                    <div className="font-mono text-xs text-[#c9c4b4]">${p.amount} {String(p.currency || '').toUpperCase()} · {p.status} · {p.created ? p.created.slice(0, 10) : '—'}</div>
                    <button onClick={() => refundPayment(p)} disabled={busy === `refund:${p.id}` || p.status === 'refunded'} className="rounded-lg border border-red-500/35 px-2.5 py-1.5 text-xs text-red-400 disabled:opacity-60">Refund</button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[#8a8577]">No Stripe payments found for this user.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN CONTENT ──────────────────────────────────────────────── */
const CONTENT_TABS = [
  { id: 'signals', label: 'Trading Signals', icon: BarChart3 },
  { id: 'forum', label: 'Community Forum', icon: Users },
  { id: 'courses', label: 'Academy Courses', icon: LibraryBig },
  { id: 'challenges', label: 'Challenges', icon: Trophy },
  { id: 'brokerlinks', label: 'Broker Links', icon: Plug },
  { id: 'tbc', label: 'TBC Economy', icon: Coins },
  { id: 'calendar', label: 'Economic Calendar', icon: FileText },
  { id: 'copy', label: 'Site Copy', icon: Type },
];

const SIGNAL_STATUSES = ['published', 'draft', 'rejected'];

function useAdminApi(prefix, base) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const root = base || `/admin/content/${prefix}`;

  const load = useCallback(async () => {
    const token = pb.authStore.token;
    try {
      const res = await fetch(`${API_SERVER_URL}${root}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(res.ok ? (Array.isArray(data) ? data : data.items || []) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [root]);

  useEffect(() => { load(); }, [load]);

  const api = async (path, opts = {}) => {
    const token = pb.authStore.token;
    const res = await fetch(`${API_SERVER_URL}${root}${path}`, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'request failed');
    return res.json();
  };

  const create = async (payload) => {
    const row = await api('', { method: 'POST', body: payload });
    await load();
    toast({ title: 'Created' });
    return row;
  };
  const update = async (id, payload) => {
    await api(`/${id}`, { method: 'PATCH', body: payload });
    await load();
    toast({ title: 'Updated' });
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await api(`/${id}`, { method: 'DELETE' });
    await load();
    toast({ title: 'Deleted' });
  };

  return { items, setItems, loading, create, update, remove, api };
}

function SignalForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ symbol: 'BTCUSD', side: 'long', entry: '', target: '', stop: '', status: 'draft', timeframe: '', signalType: '', strength: '', reason: '', ...(initial || {}) });
  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f); }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div><label className={label}>Symbol *</label><input required className={input} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} /></div>
      <div><label className={label}>Side</label>
        <select className={input} value={f.side} onChange={(e) => setF({ ...f, side: e.target.value })}>
          <option value="long">Long</option><option value="short">Short</option>
        </select></div>
      <div><label className={label}>Status</label>
        <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          {SIGNAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select></div>
      <div><label className={label}>Entry</label><input type="number" step="any" className={input} value={f.entry ?? ''} onChange={(e) => setF({ ...f, entry: e.target.value })} /></div>
      <div><label className={label}>Target</label><input type="number" step="any" className={input} value={f.target ?? ''} onChange={(e) => setF({ ...f, target: e.target.value })} /></div>
      <div><label className={label}>Stop</label><input type="number" step="any" className={input} value={f.stop ?? ''} onChange={(e) => setF({ ...f, stop: e.target.value })} /></div>
      <div><label className={label}>Timeframe</label><input className={input} value={f.timeframe ?? ''} onChange={(e) => setF({ ...f, timeframe: e.target.value })} placeholder="H4" /></div>
      <div><label className={label}>Type</label><input className={input} value={f.signalType ?? ''} onChange={(e) => setF({ ...f, signalType: e.target.value })} placeholder="Breakout" /></div>
      <div><label className={label}>Strength</label><input className={input} value={f.strength ?? ''} onChange={(e) => setF({ ...f, strength: e.target.value })} placeholder="Strong" /></div>
      <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Reason</label>
        <textarea rows="3" className={input} value={f.reason ?? ''} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
        <button type="submit" className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
      </div>
    </form>
  );
}

function SignalsTab() {
  const { toast } = useToast();
  const { items, loading, api } = useAdminApi('signals', '/admin/signals');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const saveSignal = async (f) => {
    try {
      if (editing) {
        const meta = { timeframe: f.timeframe, signalType: f.signalType, strength: f.strength, reason: f.reason };
        await api(`/${editing.id}`, { method: 'PATCH', body: { symbol: f.symbol, side: f.side, entry: f.entry === '' ? null : Number(f.entry), target: f.target === '' ? null : Number(f.target), stop: f.stop === '' ? null : Number(f.stop), status: f.status, meta } });
        toast({ title: 'Signal updated' });
      } else {
        await api('', { method: 'POST', body: f });
        toast({ title: 'Signal published' });
      }
      setEditing(null); setCreating(false);
    } catch (err) { toast({ title: 'Save failed', description: String(err.message || err) }); }
  };

  const setStatus = async (id, status) => {
    try { await api(`/${id}`, { method: 'PATCH', body: { status } }); toast({ title: `Signal ${status}` }); }
    catch (err) { toast({ title: 'Failed', description: String(err.message || err) }); }
  };

  const removeSignal = async (id) => {
    if (!window.confirm('Delete this signal?')) return;
    try { await api(`/${id}`, { method: 'DELETE' }); toast({ title: 'Signal deleted' }); }
    catch (err) { toast({ title: 'Failed', description: String(err.message || err) }); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Trading Signals</h3>
        <button onClick={() => { setCreating(true); setEditing(null); }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Plus className="h-4 w-4" /> New signal</button>
      </div>

      {(creating || editing) && (
        <div className="glass rounded-[10px] p-4 sm:p-5">
          <h4 className="mb-4 text-sm font-semibold text-[#f0ecdd]">{editing ? `Edit ${editing.symbol}` : 'New signal'}</h4>
          <SignalForm initial={editing} onSave={saveSignal} onCancel={() => { setCreating(false); setEditing(null); }} />
        </div>
      )}

      <div className="glass overflow-hidden rounded-[10px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                <th className="px-5 py-3">Symbol</th><th className="px-5 py-3">Side</th><th className="px-5 py-3">Entry</th>
                <th className="px-5 py-3">Target</th><th className="px-5 py-3">Stop</th><th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="px-5 py-10 text-center text-[#8a8577]">Loading signals…</td></tr>
                : items.length === 0 ? <tr><td colSpan="7" className="px-5 py-10 text-center text-[#8a8577]">No signals yet.</td></tr>
                : items.map((s) => (
                  <tr key={s.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-[#f0ecdd]">{s.symbol}</td>
                    <td className="px-5 py-3"><span className={s.side === 'long' ? 'text-emerald-400' : 'text-red-400'}>{s.side}</span></td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{s.entry ?? '—'}</td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{s.target ?? '—'}</td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{s.stop ?? '—'}</td>
                    <td className="px-5 py-3">
                      <select value={s.status} onChange={(e) => setStatus(s.id, e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#c9c4b4] outline-none">
                        {SIGNAL_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditing(s); setCreating(false); }} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37] hover:border-[#d4af37]/60" aria-label="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeSignal(s.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ForumTab() {
  const { toast } = useToast();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = pb.authStore.token;
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/forum`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setThreads(res.ok ? data.threads || [] : []);
    } catch { setThreads([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const api = async (path, method, body) => {
    const token = pb.authStore.token;
    const res = await fetch(`${API_SERVER_URL}/admin${path}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error('request failed');
  };

  const toggle = async (id, key) => {
    const t = threads.find((x) => x.id === id);
    try { await api(`/forum/${id}`, 'PATCH', { [key]: !t[key] }); await load(); toast({ title: `${key} toggled` }); }
    catch { toast({ title: 'Failed' }); }
  };

  const removeThread = async (id) => {
    if (!window.confirm('Delete this thread and all replies?')) return;
    try { await api(`/forum/${id}`, 'DELETE'); await load(); toast({ title: 'Thread deleted' }); }
    catch { toast({ title: 'Failed' }); }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Community Forum</h3>
      <div className="glass overflow-hidden rounded-[10px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                <th className="px-5 py-3">Thread</th><th className="px-5 py-3">Author</th><th className="px-5 py-3">Replies</th>
                <th className="px-5 py-3">Flags</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-[#8a8577]">Loading threads…</td></tr>
                : threads.length === 0 ? <tr><td colSpan="5" className="px-5 py-10 text-center text-[#8a8577]">No threads yet.</td></tr>
                : threads.map((t) => (
                  <tr key={t.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#f0ecdd]">{t.title}</div>
                      <div className="text-xs text-[#6a665a] line-clamp-1">{t.content}</div>
                    </td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{t.authorName || t.owner || '—'}</td>
                    <td className="px-5 py-3 text-[#c9c4b4]">{t.replyCount ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        {t.pinned && <span className="rounded-full bg-[#d4af37]/15 px-2 py-0.5 text-[10px] text-[#d4af37]">PINNED</span>}
                        {t.locked && <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-[#8a8577]">LOCKED</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggle(t.id, 'pinned')} className="rounded-lg border border-[#d4af37]/20 px-2.5 py-1.5 text-xs text-[#d4af37] hover:border-[#d4af37]/60">{t.pinned ? 'Unpin' : 'Pin'}</button>
                        <button onClick={() => toggle(t.id, 'locked')} className="rounded-lg border border-[#d4af37]/20 px-2.5 py-1.5 text-xs text-[#d4af37] hover:border-[#d4af37]/60">{t.locked ? 'Unlock' : 'Lock'}</button>
                        <button onClick={() => removeThread(t.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GenericContentTab({ prefix, title, fields, subtitle }) {
  const { items, loading, create, update, remove } = useAdminApi(prefix);
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])));
  const [editing, setEditing] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';

  const submit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    try {
      if (editing) await update(editing.id, { config: { ...form, title: form.title }, enabled: form.enabled !== false });
      else await create({ title: form.title, config: form, enabled: form.enabled !== false });
      setEditing(null);
      setForm(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])));
    } catch (err) { setSaveError(err?.message || err || 'Save failed'); }
  };

  const startEdit = (item) => {
    setEditing(item);
    const c = item.config || {};
    setForm({ ...Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])), ...c, title: item.title || c.title || '' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-[#8a8577]">{subtitle}</p>}
      </div>

      <form onSubmit={submit} className="glass rounded-[10px] p-4 sm:p-5">
        <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">{editing ? `Edit ${editing.title || ''}` : 'New item'}</h4>
        {saveError && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">Save failed: {String(saveError)}</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className={f.full ? 'sm:col-span-2 lg:col-span-3' : ''}>
              <label className={label}>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea'
                ? <textarea rows="3" required={f.required} className={input} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                : f.type === 'number'
                  ? <input type="number" required={f.required} className={input} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />
                  : <input required={f.required} className={input} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} />}
            </div>
          ))}
          <label className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={form.enabled !== false} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-5 w-5 accent-[#d4af37]" />
            <span className="text-sm text-[#c9c4b4]">Published</span>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Save className="h-4 w-4" /> {editing ? 'Update' : 'Publish'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']))); }} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
        </div>
      </form>

      <div className="glass overflow-hidden rounded-[10px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
                <th className="px-5 py-3">Title</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="3" className="px-5 py-10 text-center text-[#8a8577]">Loading…</td></tr>
                : items.length === 0 ? <tr><td colSpan="3" className="px-5 py-10 text-center text-[#8a8577]">Nothing published yet.</td></tr>
                : items.map((item) => (
                  <tr key={item.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#f0ecdd]">{item.title || item.config?.title || item.key}</div>
                      {item.config?.headline && <div className="text-xs text-[#6a665a]">{item.config.headline}</div>}
                    </td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${item.enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/8 text-[#8a8577]'}`}>{item.enabled ? 'Published' : 'Draft'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37] hover:border-[#d4af37]/60" aria-label="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => remove(item.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── SITE COPY (no-code page text) ────────────────────────────────────
   Curated i18n keys the admin can rewrite. Stored as `copy:* rows via the
   generic content API; the app merges enabled rows over built-in ENGLISH
   strings at runtime (other languages keep shipped text). */
const SITE_COPY_KEYS = [
  { key: 'land.heroKick', where: 'Landing → hero eyebrow' },
  { key: 'land.heroA', where: 'Landing → hero title A' },
  { key: 'land.heroB', where: 'Landing → hero title B' },
  { key: 'land.heroC', where: 'Landing → hero title C' },
  { key: 'land.heroSub', where: 'Landing → hero subtitle' },
  { key: 'land.viewPricing', where: 'Landing → pricing button' },
  { key: 'land.pricingSub', where: 'Landing → pricing section subtitle' },
  { key: 'land.featTitleA', where: 'Landing → features title' },
  { key: 'land.aiTitleA', where: 'Landing → AI coach title' },
  { key: 'price.chooseEdge', where: 'Pricing → page headline' },
  { key: 'price.sub', where: 'Pricing → page subtitle' },
  { key: 'aca.titleA', where: 'Academy → hero title' },
  { key: 'pub.blogTitle', where: 'Blog → page title' },
  { key: 'wal.subtitle', where: 'Wallet → page subtitle' },
];

function SiteCopyTab() {
  const { items, loading, create, update, remove: removeRow } = useAdminApi('copy');
  const { toast } = useToast();
  const [key, setKey] = useState(SITE_COPY_KEYS[0].key);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';

  const byKey = Object.fromEntries((items || []).map((i) => [i?.config?.key || '', i]));

  const bustCache = async () => {
    try {
      const { notifySiteCopyChanged } = await import('@/lib/siteContent');
      notifySiteCopyChanged();
    } catch { /* cache bust is best effort */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) { toast({ variant: 'destructive', title: 'Text is empty' }); return; }
    setBusy(true);
    try {
      if (editing) await update(editing.id, { config: { key, value: value.trim() }, enabled: true });
      else await create({ title: key, slug: key.replace(/\./g, '-'), config: { key, value: value.trim() }, enabled: true });
      setEditing(null);
      setValue('');
      await bustCache();
      toast({ title: 'Site copy updated — live on next page view' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: String(err?.message || err) });
    } finally { setBusy(false); }
  };

  const startEdit = (item) => {
    setEditing(item);
    setKey(item?.config?.key || SITE_COPY_KEYS[0].key);
    setValue(item?.config?.value || '');
  };

  const remove = async (item) => {
    try {
      await removeRow(item.id);
      await bustCache();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Delete failed', description: String(err?.message || err) });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Site Copy</h3>
        <p className="mt-1 text-xs text-[#8a8577]">Rewrite page headlines and buttons without code. Applies to English text; other languages keep shipped translations. Changes go live on next page view.</p>
      </div>
      <form onSubmit={submit} className="glass rounded-[10px] p-4 sm:p-5">
        <h4 className="mb-4 text-sm font-semibold text-[#f0ecdd]">{editing ? `Edit ${editing?.config?.key}` : 'New override'}</h4>
        <div className="grid gap-4">
          <div><label className={label}>Text to rewrite</label>
            <select className={input} value={key} onChange={(e) => { setKey(e.target.value); setEditing(null); }}>
              {SITE_COPY_KEYS.map((k) => <option key={k.key} value={k.key} className="bg-[#0f0f14]">{k.key} — {k.where}</option>)}
            </select>
          </div>
          <div><label className={label}>New text</label>
            <textarea rows="3" className={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Replacement text shown to users…" />
          </div>
          {byKey[key] && !editing && <p className="text-xs text-[#d4af37]">This text already has an override — saving creates a second row. Edit the existing one below instead.</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {editing ? 'Update text' : 'Publish text'}
          </button>
          {editing && <button type="button" onClick={() => { setEditing(null); setValue(''); }} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
        </div>
      </form>
      <div className="glass overflow-hidden rounded-[10px]">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0c0c11] text-left text-[10px] uppercase tracking-[0.14em] text-[#8a8577]">
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Live text</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="px-5 py-10 text-center text-[#8a8577]">Loading…</td></tr>
            ) : (items || []).length === 0 ? (
              <tr><td colSpan="3" className="px-5 py-10 text-center text-[#8a8577]">No overrides — the app shows built-in text everywhere.</td></tr>
            ) : (items || []).map((item) => (
              <tr key={item.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-mono text-xs text-[#d4af37]">{item?.config?.key}</td>
                <td className="px-5 py-3 text-[#e9e7df]">{item?.config?.value}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37] hover:border-[#d4af37]/60" aria-label="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Revert"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminContent() {
  const [tab, setTab] = useState('signals');
  return (
    <AdminLayout title="Content Management">
      <div className="at-page at-scope at-enter pb-10">
      <AtTabs tabs={CONTENT_TABS} active={tab} onChange={setTab} className="mb-6 w-fit max-w-full" />

      {tab === 'signals' && <SignalsTab />}
      {tab === 'forum' && <ForumTab />}
      {tab === 'copy' && <SiteCopyTab />}
      {tab === 'challenges' && (
        <GenericContentTab prefix="challenge" title="TradingBible Funded — Evaluation Programs" subtitle="Programs sold on Challenges + Funded pages. Phase-1 rules drive evaluation; Phase-2 + funded terms are shown to traders."
          fields={[
            { key: 'name', label: 'Program name', required: true, default: '', full: false },
            { key: 'description', label: 'Pitch', type: 'textarea', default: '', full: true },
            { key: 'fee', label: 'Entry fee Standard (USD)', type: 'number', default: '499', full: false },
            { key: 'feeSwing', label: 'Entry fee Swing (USD)', type: 'number', default: '519', full: false },
            { key: 'accountSize', label: 'Account size (USD)', type: 'number', default: '100000', full: false },
            { key: 'phase', label: 'Format (two-step / one-step / futures)', default: 'two-step', full: false },
            { key: 'mode', label: 'Engine mode (two-step / one-step / futures)', default: 'two-step', full: false },
            { key: 'targetPct', label: 'Phase 1 target %', type: 'number', default: '10', full: false },
            { key: 'target2Pct', label: 'Phase 2 verification target %', type: 'number', default: '5', full: false },
            { key: 'targetUsd', label: 'Target $ (futures, 0 = use %)', type: 'number', default: '0', full: false },
            { key: 'maxDrawdownPct', label: 'Max loss %', type: 'number', default: '10', full: false },
            { key: 'maxDdUsd', label: 'Max drawdown $ (futures, 0 = use %)', type: 'number', default: '0', full: false },
            { key: 'maxLossMode', label: 'Max-loss mode (static / eod-trailing)', default: 'static', full: false },
            { key: 'dailyLossPct', label: 'Max daily loss %', type: 'number', default: '5', full: false },
            { key: 'dailyLossUsd', label: 'Daily loss $ (futures Pro, 0 = none/%)', type: 'number', default: '0', full: false },
            { key: 'bestDayMaxPct', label: 'Best-day gate % (1-step, 0 = off)', type: 'number', default: '0', full: false },
            { key: 'consistencyMaxPct', label: 'Consistency gate % (futures, 0 = off)', type: 'number', default: '0', full: false },
            { key: 'consistencyBase', label: 'Consistency base (total / positive)', default: 'total', full: false },
            { key: 'maxContracts', label: 'Max contracts (futures, 0 = n/a)', type: 'number', default: '0', full: false },
            { key: 'accountTypeOptions', label: 'Account types (standard,swing)', default: 'standard,swing', full: false },
            { key: 'leverageStandard', label: 'Leverage · Standard', default: '1:100', full: false },
            { key: 'leverageSwing', label: 'Leverage · Swing', default: '1:30', full: false },
            { key: 'minDays', label: 'Min trading days', type: 'number', default: '4', full: false },
            { key: 'profitSplitPct', label: 'Profit split % (trader)', type: 'number', default: '80', full: false },
            { key: 'maxSplitPct', label: 'Max split after scaling %', type: 'number', default: '90', full: false },
            { key: 'payoutCycleDays', label: 'Payout cycle (days)', type: 'number', default: '14', full: false },
            { key: 'leverage', label: 'Leverage', default: '1:100', full: false },
            { key: 'platforms', label: 'Platforms', default: 'MT5 · cTrader · TradingBible Terminal', full: true },
            { key: 'instruments', label: 'Instruments', default: 'Forex · Metals · Indices · Crypto · Stocks', full: true },
            { key: 'scaling', label: 'Scaling plan', default: 'Qualify every 4 months: +25% capital, up to $400K', full: true },
            { key: 'payout', label: 'Pass reward paid out (USD)', type: 'number', default: '500', full: false },
          ]} />
      )}
      {tab === 'brokerlinks' && (
        <GenericContentTab prefix="brokerlink" title="Broker Referral Links" subtitle="Revenue-share links shown as 'Open account' on the Brokers page. Provider ID must match the broker list id (e.g. binance, exness)."
          fields={[
            { key: 'provider', label: 'Provider ID', required: true, default: '', full: false },
            { key: 'url', label: 'Referral URL', required: true, default: '', full: true },
          ]} />
      )}
      {tab === 'tbc' && (
        <GenericContentTab prefix="tbc" title="TBC Brand-Credit Economy" subtitle='One row titled exactly "config" drives the wallet rate and claims. Peg is fixed: 1 TBC = 1 KWD. Set USD-per-KWD (default 3.25); TBC-per-$1 derives automatically. TBC credits are off-chain utility credits — not tokens, not investments.'
          fields={[
            { key: 'title', label: 'Row title (must be "config")', required: true, default: 'config', full: false },
            { key: 'usdPerKwd', label: 'USD per 1 KWD (= USD per 1 TBC)', type: 'number', default: '3.25', full: false },
            { key: 'claimMin', label: 'Min on-chain claim (TBC)', type: 'number', default: '100', full: false },
            { key: 'claimEnabled', label: 'Claims open? (true/false)', default: 'false', full: false },
            { key: 'note', label: 'Policy note shown in wallet', type: 'textarea', default: '', full: true },
          ]} />
      )}
      {tab === 'courses' && (
        <GenericContentTab prefix="course" title="Academy Courses" subtitle="Course catalog shown in the Academy. Publish lessons, quizzes and certificates per course."
          fields={[
            { key: 'title', label: 'Course title', required: true, default: '', full: false },
            { key: 'category', label: 'Category', default: '', full: false },
            { key: 'level', label: 'Level', default: 'Beginner', full: false },
            { key: 'lessons', label: 'Lessons', type: 'number', default: '0', full: false },
            { key: 'durationMins', label: 'Duration (mins)', type: 'number', default: '0', full: false },
            { key: 'price', label: 'Price (USD)', type: 'number', default: '0', full: false },
            { key: 'imageUrl', label: 'Cover image URL', default: '', full: false },
            { key: 'headline', label: 'Short description', default: '', full: true },
            { key: 'syllabus', label: 'Syllabus / description', type: 'textarea', default: '', full: true },
          ]} />
      )}
      {tab === 'calendar' && (
        <GenericContentTab prefix="cal_event" title="Economic Calendar" subtitle="Curated events merged into the live economic calendar feed (shown first, above provider data)."
          fields={[
            { key: 'title', label: 'Event name', required: true, default: '', full: false },
            { key: 'time', label: 'Time (e.g. 2026-08-15 14:30 UTC)', required: true, default: '', full: false },
            { key: 'impact', label: 'Impact (low/medium/high)', default: 'medium', full: false },
            { key: 'currency', label: 'Currency', default: 'USD', full: false },
            { key: 'country', label: 'Country', default: 'US', full: false },
            { key: 'headline', label: 'Headline', default: '', full: true },
            { key: 'actual', label: 'Actual value', default: '', full: false },
            { key: 'snippet', label: 'Notes', type: 'textarea', default: '', full: true },
          ]} />
      )}
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN REPORTS ──────────────────────────────────────────────── */
export function AdminReports() {
  const { users, loading } = useUsers();
  const { trades } = useTrades();
  const { toast } = useToast();

  const exportReport = () => {
    const lines = [
      'TradingBible — System Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Total Users: ${users.length}`,
      `Verified: ${users.filter(u => u.verified).length}`,
      `Paid: ${users.filter(u => isPaidPlan(u.plan)).length}`,
      `No plan: ${users.filter(u => !planKey(u.plan)).length}`,
      `Admins: ${users.filter(u => u.role === 'admin').length}`,
      `Total Trades: ${trades.length}`,
    ];
    const a = document.createElement('a');
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const exportFinancialCSV = () => {
    const conv = 0.05;
    const header = ['Month', 'Total Users', 'Paid Users (5% conv)', 'MRR', 'ARR', 'Avg Ticket', 'LTV (est, 20% churn)', 'LTV:CAC'];
    const lines = PLAN_FORECAST.map(r => {
      const paid = Math.round(r.users * conv);
      const avg = paid ? r.mrr / paid : 0;
      const ltv = avg / 0.2;
      return [r.m, r.users, paid, r.mrr.toFixed(0), (r.mrr * 12).toFixed(0), avg.toFixed(2), ltv.toFixed(0), (ltv / 150).toFixed(2)];
    });
    const csv = [header, ...lines].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `financial_model_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Exported', description: 'Financial model saved as CSV.' });
  };

  const rows = [
    { label: 'Total registered users', value: users.length, icon: Users },
    { label: 'Verified users', value: users.filter(u => u.verified).length, icon: CheckCircle },
    { label: 'Paid subscribers', value: users.filter(u => isPaidPlan(u.plan)).length, icon: CreditCard },
    { label: 'No-plan users', value: users.filter(u => !planKey(u.plan)).length, icon: Clock },
    { label: 'Admin accounts', value: users.filter(u => u.role === 'admin').length, icon: Shield },
    { label: 'Total trades logged', value: trades.length, icon: Activity },
    { label: 'Est. MRR', value: `$${users.filter(u => isPaidPlan(u.plan)).reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0).toFixed(0)}`, icon: DollarSign },
  ];

  const [sysLogs, setSysLogs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = pb.authStore.token;
        if (!token) return;
        const res = await fetch(`${API_SERVER_URL}/admin/logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setSysLogs(await res.json());
      } catch { /* empty feed */ }
    })();
  }, []);

  return (
    <AdminLayout title="Reports & Logs">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={exportFinancialCSV} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/60">
          <Download className="h-4 w-4" /> Generate Financial Model CSV
        </button>
        <button onClick={exportReport} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/60">
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="mb-5 glass rounded-2xl p-4 sm:p-5">
          <h3 className="mb-4 font-semibold text-[#f0ecdd]">Platform Summary</h3>
          <div className="divide-y divide-white/5">
            {rows.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-2.5 text-sm text-[#c9c4b4]">
                  <Icon className="h-4 w-4 shrink-0 text-[#8a8577]" />
                  <span className="truncate">{label}</span>
                </div>
                <span className="font-mono text-[#f0ecdd] shrink-0">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="mb-4 font-semibold text-[#f0ecdd]">System Logs (Latest)</h3>
        <div className="space-y-2 font-mono text-xs overflow-x-auto">
          {sysLogs.length ? sysLogs.slice().reverse().map((l, i) => (
            <div key={i} className="flex items-start gap-2 sm:gap-3 rounded-lg bg-white/[0.03] px-3 py-2 min-w-0">
              <span className="text-[#6a665a] shrink-0">{String(l.ts || '').slice(11, 19)}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${String(l.level).toLowerCase() === 'error' || String(l.level).toLowerCase() === 'fatal' ? 'bg-red-500/20 text-red-400' : String(l.level).toLowerCase() === 'warn' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{String(l.level || 'info').toUpperCase()}</span>
              <span className="text-[#c9c4b4] break-all">{l.msg}</span>
            </div>
          )) : <p className="py-6 text-center font-sans text-sm text-[#8a8577]">No log entries yet — they appear as the API runs.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN INTEGRATIONS ─────────────────────────────────────────── */
const INTEGRATION_PRESETS = [
  { provider: 'alpha_vantage', name: 'Alpha Vantage', icon: BarChart3, color: '#3b82f6', testKind: 'alpha_vantage', envKey: 'ALPHA_VANTAGE_API_KEY', note: 'Equities/forex backup feed. Key lives in server .env — Test uses the server key.', fields: [{ key: 'apiKey', label: 'API Key (reference copy)', type: 'password' }] },
  { provider: 'binance', name: 'Binance', icon: TrendingUp, color: '#f0b90b', testKind: 'binance', noKey: true, note: 'Public market data — no key needed. Per-user private keys live under Brokers, never here.', fields: [] },
  { provider: 'finnhub', name: 'Finnhub', icon: Activity, color: '#10b981', testKind: 'finnhub', envKey: 'FINNHUB_API_KEY', note: 'US-stock quotes. Key lives in server .env — Test uses the server key.', fields: [{ key: 'apiKey', label: 'API Key (reference copy)', type: 'password' }] },
  { provider: 'polygon', name: 'Polygon.io', icon: Globe, color: '#8b5cf6', note: 'Not consumed by the backend — stored here for reference only.', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { provider: 'forex_factory', name: 'Forex Factory', icon: Globe, color: GOLD, noKey: true, note: 'Keyless public calendar feed — nothing to configure.', fields: [] },
  { provider: 'smtp', name: 'Email (SMTP)', icon: Mail, color: '#ec4899', note: 'Auth emails send via the server .env (SMTP_HOST). Test any host below without saving.', fields: [{ key: 'apiKey', label: 'SMTP Host', type: 'text' }, { key: 'apiSecret', label: 'Password', type: 'password' }, { key: 'extraConfig', label: 'Port / From Address (JSON)', type: 'text' }] },
];

function IntegrationCard({ preset, record, onSave, onTest, onDelete }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(() => ({
    apiKey: record?.apiKey || '',
    apiSecret: record?.apiSecret || '',
    extraConfig: record?.extraConfig ? JSON.stringify(record.extraConfig) : '',
    enabled: record?.enabled ?? true,
  }));
  const [show, setShow] = useState({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const Icon = preset.icon;
  const status = record?.status || 'disconnected';
  const lastTested = record?.lastTestedAt ? new Date(record.lastTestedAt).toLocaleString() : 'Never';

  const handleSave = async () => {
    setSaving(true);
    try {
      let extraConfig = null;
      if (form.extraConfig) {
        try { extraConfig = JSON.parse(form.extraConfig); } catch { extraConfig = { raw: form.extraConfig }; }
      }
      const data = { name: preset.name, provider: preset.provider, apiKey: form.apiKey, apiSecret: form.apiSecret, extraConfig, enabled: form.enabled };
      await onSave(record?.id, data);
      toast({ title: 'Saved', description: `${preset.name} configuration saved.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err?.message });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTest(record?.id, preset.provider, form);
      toast({ title: 'Connection tested', description: `${preset.name} responded successfully.` });
    }
    catch (err) { toast({ variant: 'destructive', title: 'Test failed', description: err?.message || `Could not connect to ${preset.name}.` }); }
    finally { setTesting(false); }
  };

  return (
    <div className={`glass rounded-2xl border transition-all ${expanded ? 'border-[#d4af37]/30' : 'border-transparent'}`}>
      <button className="w-full flex items-center gap-3 p-4 sm:p-5 text-left" onClick={() => setExpanded(v => !v)}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${preset.color}18` }}>
          <Icon className="h-5 w-5" style={{ color: preset.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#f0ecdd]">{preset.name}</div>
          <div className="text-xs text-[#8a8577]">Last tested: {lastTested}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'connected'
            ? <Badge color="green"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected</Badge>
            : status === 'error'
            ? <Badge color="red"><AlertCircle className="h-3 w-3" /> Error</Badge>
            : <Badge color="muted">Disconnected</Badge>}
          <ChevronDown className={`h-4 w-4 text-[#8a8577] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#d4af37]/10 p-4 sm:p-5 space-y-4">
          {preset.note && <p className="text-xs leading-relaxed text-[#8a8577]">{preset.note}</p>}
          {preset.fields.map(f => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">{f.label}</label>
              <div className="flex gap-2">
                <input
                  type={show[f.key] ? 'text' : f.type === 'password' ? 'password' : 'text'}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.type === 'password' ? '••••••••••••••••' : `Enter ${f.label.toLowerCase()}…`}
                  className="flex-1 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 font-mono"
                />
                {f.type === 'password' && (
                  <button type="button" onClick={() => setShow(p => ({ ...p, [f.key]: !p[f.key] }))}
                    className="rounded-xl border border-[#d4af37]/15 px-3 text-[#8a8577] hover:text-[#c9c4b4]">
                    {show[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <label className="flex items-center justify-between rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <span className="text-sm text-[#c9c4b4]">Enable this integration</span>
            <div onClick={() => setForm(p => ({ ...p, enabled: !p.enabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${form.enabled ? 'bg-[#d4af37]' : 'bg-white/12'}`}>
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>

          {record?.lastTestResult && (
            <div className={`rounded-xl p-3 text-xs font-mono ${record.status === 'connected' ? 'bg-emerald-500/8 text-emerald-400' : 'bg-red-500/8 text-red-400'}`}>
              {record.lastTestResult}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={handleTest} disabled={testing || (!form.apiKey && !preset.noKey && !preset.testKind)}
              className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/50 disabled:opacity-40">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />} Test Connection
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-60">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            {record && (
              <button onClick={() => onDelete(record.id)}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminIntegrations() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRecords(await pb.collection('admin_integrations').getFullList({ requestKey: 'admin-integrations' })); }
    catch { /* ignore */ } finally { setLoading(false); }
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/health`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } });
      if (res.ok) setHealth(await res.json());
    } catch { /* live strip stays hidden */ }
  };

  useEffect(() => { load(); }, []);

  const getRecord = (provider) => records.find(r => r.provider === provider);

  const handleSave = async (id, data) => {
    if (id) {
      const updated = await pb.collection('admin_integrations').update(id, data);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
    } else {
      const created = await pb.collection('admin_integrations').create({ ...data, status: 'disconnected' });
      setRecords(prev => [...prev, created]);
    }
  };

  const handleTest = async (id, provider, form) => {
    const preset = INTEGRATION_PRESETS.find((p) => p.provider === provider) || {};
    if (preset.testKind) {
      const res = await fetch(`${API_SERVER_URL}/admin/integrations/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: preset.testKind }),
      });
      const data = await res.json().catch(() => ({}));
      const now = new Date().toISOString();
      const passed = res.ok && data.ok;
      const result = passed ? `OK — ${data.detail || 'reachable'} at ${now.slice(11, 19)} UTC` : `FAIL — ${data.error || data.detail || `HTTP ${res.status}`} at ${now.slice(11, 19)} UTC`;
      if (id) {
        const updated = await pb.collection('admin_integrations').update(id, {
          status: passed ? 'connected' : 'error', lastTestedAt: now, lastTestResult: result,
        });
        setRecords(prev => prev.map(r => r.id === id ? updated : r));
      } else {
        toast({ title: passed ? 'Connection tested' : 'Test failed', description: result, variant: passed ? undefined : 'destructive' });
      }
      if (!passed) throw new Error(result);
      return;
    }
    const key = (form?.apiKey || '').trim();
    let payload;
    if (provider === 'smtp') {
      let extra = {};
      try { extra = JSON.parse(form?.extraConfig || '{}'); } catch { extra = {}; }
      payload = { kind: 'smtp', host: key, port: Number(extra.port) || 587, user: extra.user || extra.username || '', pass: form?.apiSecret || '' };
    } else if (provider === 'binance') {
      payload = { kind: 'url', url: 'https://api.binance.com/api/v3/ping' };
    } else if (provider === 'alpha_vantage') {
      payload = { kind: 'url', url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${encodeURIComponent(key)}` };
    } else if (provider === 'finnhub') {
      payload = { kind: 'url', url: `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}` };
    } else if (provider === 'polygon') {
      payload = { kind: 'url', url: `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${encodeURIComponent(key)}` };
    } else if (provider === 'forex_factory') {
      payload = { kind: 'url', url: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json' };
    } else {
      throw new Error(`No test defined for ${provider}`);
    }
    const res = await fetch(`${API_SERVER_URL}/admin/integrations/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const now = new Date().toISOString();
    const passed = res.ok && data.ok;
    const result = passed ? `OK — ${data.detail || 'reachable'} at ${now.slice(11, 19)} UTC` : `FAIL — ${data.error || data.detail || `HTTP ${res.status}`} at ${now.slice(11, 19)} UTC`;
    if (id) {
      const updated = await pb.collection('admin_integrations').update(id, {
        status: passed ? 'connected' : 'error', lastTestedAt: now, lastTestResult: result,
      });
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
    }
    if (!passed) throw new Error(result);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this integration?')) return;
    await pb.collection('admin_integrations').delete(id);
    setRecords(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Integration removed' });
  };

  return (
    <AdminLayout title="Integrations">
      <AtPageBar actions={<AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>} />

      {loading ? <Spinner /> : (
        <>
          {health?.checks && (
            <div className="mb-4 grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ['Alpha Vantage', health.checks.alphaVantage],
                ['Finnhub', health.checks.finnhub],
                ['Market data', health.checks.market],
                ['Email SMTP', health.checks.smtp],
                ['Stripe', health.checks.stripe],
                ['D&B Direct+', health.checks.dnb],
              ].map(([label, on]) => (
                <div key={label} className="glass flex items-center gap-2 rounded-[10px] px-3 py-2.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-bold text-[#f0ecdd]">{label}</span>
                    <span className={`block font-mono text-[10px] ${on ? 'text-emerald-400' : 'text-red-400'}`}>{on ? 'Live' : 'Not set'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
          {INTEGRATION_PRESETS.map(preset => (
            <IntegrationCard
              key={preset.provider}
              preset={preset}
              record={getRecord(preset.provider)}
              onSave={(id, data) => handleSave(id || null, data)}
              onTest={handleTest}
              onDelete={handleDelete}
            />
          ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN API KEYS (server-issued, sha256, verifiable) ─────────── */
const ALL_PERMISSIONS = ['read:market', 'read:journal', 'write:journal', 'read:signals', 'read:alerts', 'write:alerts', 'read:community'];

function mapApiKey(r) {
  return {
    ...r,
    status: r.enabled === false ? 'revoked' : 'active',
    keyPrefix: r.hint || '',
  };
}

export function AdminApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', assignedTo: '', permissions: ['read:market'], expiresAt: '' });
  const [newKeyPlain, setNewKeyPlain] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revealed, setRevealed] = useState({});

  const apiCall = async (path, opts = {}) => {
    const res = await fetch(`${API_SERVER_URL}/admin/api-keys${path}`, {
      method: opts.method || 'GET',
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const rows = await apiCall('');
      setKeys((Array.isArray(rows) ? rows : []).map(mapApiKey));
    }
    catch { setKeys([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newForm.name.trim()) return toast({ variant: 'destructive', title: 'Name required' });
    setCreating(true);
    try {
      const row = await apiCall('', {
        method: 'POST',
        body: {
          name: newForm.name.trim(),
          permissions: newForm.permissions,
          assignedTo: newForm.assignedTo.trim() || undefined,
          expiresAt: newForm.expiresAt || undefined,
        },
      });
      setKeys(prev => [mapApiKey({ ...row, permissions: newForm.permissions, assignedTo: newForm.assignedTo || null }), ...prev]);
      setNewKeyPlain(row.key);
      setNewForm({ name: '', assignedTo: '', permissions: ['read:market'], expiresAt: '' });
      setShowModal(false);
      toast({ title: 'API Key created', description: 'Copy the key now — it will not be shown again.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    } finally { setCreating(false); }
  };

  const setEnabled = async (id, enabled) => {
    if (!enabled && !window.confirm('Revoke this API key? Calls using it will fail verification.')) return;
    await apiCall(`/${id}`, { method: 'PATCH', body: { enabled } });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: enabled ? 'active' : 'revoked' } : k));
    toast({ title: enabled ? 'Key re-enabled' : 'Key revoked' });
  };

  const revoke = (id) => setEnabled(id, false);

  const remove = async (id) => {
    if (!window.confirm('Delete this API key?')) return;
    await apiCall(`/${id}`, { method: 'DELETE' });
    setKeys(prev => prev.filter(k => k.id !== id));
    toast({ title: 'Key deleted' });
  };

  const copyKey = (val) => { navigator.clipboard?.writeText(val); toast({ title: 'Copied to clipboard' }); };

  const togglePerm = (p) => setNewForm(f => ({
    ...f,
    permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p],
  }));

  return (
    <AdminLayout title="API Keys">
      {/* New key revealed */}
      {newKeyPlain && (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-emerald-300 mb-2">Key created — copy it now, it won't be shown again</p>
              <div className="flex gap-2 flex-wrap">
                <code className="flex-1 min-w-0 truncate rounded-lg bg-black/30 px-3 py-2 text-xs font-mono text-emerald-300 break-all">{newKeyPlain}</code>
                <button onClick={() => copyKey(newKeyPlain)} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 shrink-0">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            </div>
            <button onClick={() => setNewKeyPlain('')} className="text-[#8a8577] hover:text-[#c9c4b4]"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <AtPageBar
        meta={[`${keys.length} key${keys.length !== 1 ? 's' : ''}`]}
        actions={<AtButton onClick={() => setShowModal(true)} variant="gold" size="sm" icon={Plus}>Generate key</AtButton>}
      />

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowModal(false)}>
          <div className="overlay-pop relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]">
                <Key className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-[#f0ecdd]">Generate API Key</h3>
                <p className="text-xs text-[#8a8577]">Scoped, expirable, revocable</p>
              </div>
              <button onClick={() => setShowModal(false)} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#8a8577] transition hover:bg-white/5 hover:text-[#e9e7df]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Key Name *</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mobile App Key"
                  className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Assigned To (email/user)</label>
                <input value={newForm.assignedTo} onChange={e => setNewForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="user@example.com"
                  className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Expires At (optional)</label>
                <input type="date" value={newForm.expiresAt} onChange={e => setNewForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-xs transition-colors ${newForm.permissions.includes(p) ? 'border-[#d4af37]/40 bg-[#d4af37]/8 text-[#d4af37]' : 'border-white/8 text-[#8a8577] hover:border-white/20'}`}>
                      <input type="checkbox" checked={newForm.permissions.includes(p)} onChange={() => togglePerm(p)} className="h-3.5 w-3.5 accent-[#d4af37]" />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[#d4af37]/15 py-2.5 text-sm text-[#8a8577]">Cancel</button>
                <button onClick={create} disabled={creating} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-60">
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
          <table className="tb-mobile-actions w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/12 bg-white/[0.02] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-4 py-3.5">Key Prefix</th>
                <th className="px-4 py-3.5 hidden sm:table-cell">Assigned To</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Status</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="group border-b border-white/5 transition last:border-0 hover:bg-[#d4af37]/[0.04]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${k.status === 'active' ? 'bg-[#d4af37]/12 text-[#d4af37]' : 'bg-white/[0.04] text-[#6a665a]'}`}>
                        <Key className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#f0ecdd]">{k.name}</div>
                        <div className="truncate text-xs text-[#8a8577]">{(k.permissions || []).slice(0, 2).join(', ')}{(k.permissions || []).length > 2 ? `+${k.permissions.length - 2}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><code className="rounded-md bg-black/30 px-2 py-1 font-mono text-xs text-[#c9c4b4]">{k.keyPrefix}•••••</code></td>
                  <td className="px-4 py-3.5 text-xs text-[#8a8577] hidden sm:table-cell">{k.assignedTo || '—'}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <Badge color={k.status === 'active' ? 'green' : 'red'}>{k.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#8a8577] hidden lg:table-cell">{(k.created || '').slice(0, 10)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {k.status === 'active' ? (
                        <button onClick={() => revoke(k.id)} title="Revoke" className="grid h-8 w-8 place-items-center rounded-lg text-[#8a8577] transition hover:bg-orange-500/10 hover:text-orange-400">
                          <Power className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => setEnabled(k.id, true)} title="Re-enable" className="grid h-8 w-8 place-items-center rounded-lg text-[#8a8577] transition hover:bg-emerald-500/10 hover:text-emerald-400">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => remove(k.id)} title="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!keys.length && <tr><td colSpan={6} className="px-4 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-[#6a665a]"><Key className="h-5 w-5" /></div><p className="mt-3 text-sm text-[#8a8577]">No API keys yet. Generate your first key above.</p></td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN PLUGINS ──────────────────────────────────────────────── */
const BUILTIN_PLUGINS = [
  { slug: 'market-data', name: 'Market Data Engine', version: '2.1.0', description: 'Real-time quotes, candles, and order book from Alpha Vantage, Binance, Polygon.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'ai-coach', name: 'SI Trade Coach', version: '1.4.0', description: 'GPT-powered trade analysis, emotion scoring, and improvement suggestions.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'economic-calendar', name: 'Economic Calendar', version: '1.2.0', description: 'Forex Factory event feed with impact levels and real-time countdowns.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'chart-drawings', name: 'Chart Drawing Tools', version: '1.0.3', description: 'Persistent trendlines, fibonacci, annotations and templates per user.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'academy', name: 'Academy Module', version: '1.1.0', description: 'Course catalog, lesson tracking, quizzes and certificate generation.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'community-forum', name: 'Community Forum', version: '1.0.1', description: 'Threaded discussions, replies, likes, and moderation tools.', author: 'TradingBible Core', enabled: true, status: 'installed' },
];

export function AdminPlugins() {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Built-in plugins gate real platform features when toggled.
  const PLUGIN_FEATURES = {
    'ai-coach': 'aiCoach',
    academy: 'academy',
    'community-forum': 'community',
    'economic-calendar': 'economicCalendar',
    'market-data': 'chartBuilder',
    'chart-drawings': 'chartBuilder',
  };

  const syncPluginFeature = async (slug, enabled) => {
    const feature = PLUGIN_FEATURES[slug];
    if (!feature) return false;
    try {
      const existing = await pb.collection('admin_platform_settings').getFirstListItem('key = "default"');
      await pb.collection('admin_platform_settings').update(existing.id, {
        features: { ...(existing.features || {}), [feature]: enabled },
      });
      notifyPlatformSettingsChanged();
      return true;
    } catch { return false; }
  };

  const load = async () => {
    setLoading(true);
    try {
      const db = await pb.collection('admin_plugins').getFullList({ requestKey: 'admin-plugins' });
      // Merge builtins with any DB-stored custom plugins
      const dbSlugs = db.map(p => p.slug);
      const merged = [
        ...BUILTIN_PLUGINS.map(p => {
          const dbRecord = db.find(r => r.slug === p.slug);
          return dbRecord ? { ...p, ...dbRecord } : { ...p, _builtin: true };
        }),
        ...db.filter(p => !BUILTIN_PLUGINS.find(b => b.slug === p.slug)),
      ];
      setPlugins(merged);
    } catch { setPlugins(BUILTIN_PLUGINS.map(p => ({ ...p, _builtin: true }))); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (plugin) => {
    const newEnabled = !plugin.enabled;
    if (plugin.id) {
      await pb.collection('admin_plugins').update(plugin.id, { enabled: newEnabled });
    } else {
      await pb.collection('admin_plugins').create({ ...plugin, enabled: newEnabled });
    }
    setPlugins(prev => prev.map(p => p.slug === plugin.slug ? { ...p, enabled: newEnabled } : p));
    const gated = await syncPluginFeature(plugin.slug, newEnabled);
    toast({ title: newEnabled ? `${plugin.name} enabled` : `${plugin.name} disabled`, description: gated ? 'App feature flag updated — takes effect immediately.' : undefined });
  };

  const remove = async (plugin) => {
    if (plugin._builtin) return toast({ variant: 'destructive', title: 'Cannot remove built-in plugin' });
    if (!window.confirm(`Remove ${plugin.name}?`)) return;
    if (plugin.id) await pb.collection('admin_plugins').delete(plugin.id);
    setPlugins(prev => prev.filter(p => p.slug !== plugin.slug));
    toast({ title: 'Plugin removed' });
  };

  const handleUpload = () => fileRef.current?.click();

  const handleManifestFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const manifest = JSON.parse(await file.text());
      const slug = String(manifest.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40);
      const name = String(manifest.name || '').trim().slice(0, 80);
      if (!slug || !name) throw new Error('Manifest must include "slug" and "name".');
      if (plugins.some(p => p.slug === slug)) throw new Error(`A plugin with slug "${slug}" already exists.`);
      const rec = await pb.collection('admin_plugins').create({
        key: `plugin:${slug}`,
        slug,
        name,
        version: String(manifest.version || '1.0.0').slice(0, 20),
        description: String(manifest.description || '').slice(0, 500),
        author: String(manifest.author || 'Custom').slice(0, 80),
        enabled: true,
        status: 'installed',
        config: manifest.config && typeof manifest.config === 'object' ? manifest.config : {},
      });
      setPlugins(prev => [...prev, rec]);
      toast({ title: 'Plugin installed', description: `${name} added from manifest.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err?.message || 'Invalid manifest file.' });
    } finally { setUploading(false); }
  };

  return (
    <AdminLayout title="Plugins">
      <AtPageBar
        meta={[`${plugins.filter(p => p.enabled).length} of ${plugins.length} active`]}
        actions={<AtButton onClick={handleUpload} disabled={uploading} variant="quiet" size="sm" icon={uploading ? RefreshCw : Upload}>{uploading ? 'Uploading…' : 'Upload plugin'}</AtButton>}
      />
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleManifestFile} className="hidden" />

      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {plugins.map(plugin => {
            const Icon = plugin.slug.includes('market') ? BarChart3 : plugin.slug.includes('ai') ? Cpu : plugin.slug.includes('calendar') ? FileText : plugin.slug.includes('chart') ? Layers : plugin.slug.includes('academy') ? LibraryBig : Users;
            return (
              <div key={plugin.slug} className={`glass rounded-2xl p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-4 transition-all ${!plugin.enabled ? 'opacity-60' : ''}`}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d4af37]/10">
                  <Icon className="h-5 w-5 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-medium text-[#f0ecdd]">{plugin.name}</span>
                    <Badge color="muted">v{plugin.version}</Badge>
                    {plugin._builtin && <Badge color="blue">Built-in</Badge>}
                    <Badge color={plugin.status === 'installed' ? 'green' : plugin.status === 'error' ? 'red' : 'muted'}>{plugin.status}</Badge>
                  </div>
                  <p className="text-xs text-[#8a8577] leading-relaxed">{plugin.description}</p>
                  <p className="text-xs text-[#6a665a] mt-1">Author: {plugin.author}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div onClick={() => toggle(plugin)}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${plugin.enabled ? 'bg-[#d4af37]' : 'bg-white/12'}`}>
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${plugin.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  {!plugin._builtin && (
                    <button onClick={() => remove(plugin)} className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN JOBS ─────────────────────────────────────────────────── */
const APP_STATUSES = ['new', 'reviewing', 'shortlisted', 'trial_task', 'rejected', 'hired'];

export function AdminJobs() {
  const { toast } = useToast();
  const [postings, setPostings] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', department: 'Academy', employmentType: 'full-time', location: 'Remote', description: '', requirements: '' });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [postQ, setPostQ] = useState('');
  const [postFilter, setPostFilter] = useState('all');
  const filteredPostings = useMemo(() => postings.filter((p) => {
    if (postFilter !== 'all' && p.status !== postFilter) return false;
    if (postQ && !`${p.title} ${p.department} ${p.employmentType} ${p.location}`.toLowerCase().includes(postQ.toLowerCase())) return false;
    return true;
  }), [postings, postQ, postFilter]);
  const appCountFor = (id) => apps.filter((a) => a.jobId === id && a.status !== 'hired' && a.status !== 'rejected').length;

  const call = async (path, opts = {}) => {
    const res = await fetch(`${API_SERVER_URL}/admin/jobs${path}`, {
      method: opts.method || 'GET',
      headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Independent loads: a failing applications call must never wipe the
      // postings list (or vice versa). Each failure surfaces its own toast.
      const [p, a] = await Promise.allSettled([call('/postings'), call('/applications')]);
      if (p.status === 'fulfilled') setPostings(p.value || []);
      else { setPostings([]); toast({ variant: 'destructive', title: 'Openings failed to load', description: String(p.reason?.message || p.reason) }); }
      if (a.status === 'fulfilled') setApps(a.value || []);
      else { setApps([]); toast({ variant: 'destructive', title: 'Applications failed to load', description: String(a.reason?.message || a.reason) }); }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ title: '', department: 'Academy', employmentType: 'full-time', location: 'Remote', description: '', requirements: '' }); setEditingId(null); };

  const seedCompanyRoles = async () => {
    if (!window.confirm('Add every missing company role from the operating plan? Existing postings are not changed.')) return;
    setBusy(true);
    try {
      const res = await call('/seed-company', { method: 'POST' });
      toast({ title: `Company roles seeded`, description: `${res?.inserted || 0} added · ${res?.skipped || 0} skipped · ${res?.total || 0} in plan` });
      load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Seed failed', description: err.message });
    } finally { setBusy(false); }
  };

  const savePosting = async () => {
    if (!form.title.trim()) return toast({ variant: 'destructive', title: 'Title required' });
    setBusy(true);
    try {
      if (editingId) {
        await call(`/postings/${editingId}`, { method: 'PATCH', body: form });
        toast({ title: 'Posting updated' });
      } else {
        await call('/postings', { method: 'POST', body: form });
        toast({ title: 'Posting published' });
      }
      resetForm();
      load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally { setBusy(false); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ title: p.title || '', department: p.department || 'Academy', employmentType: p.employmentType || 'full-time', location: p.location || 'Remote', description: p.description || '', requirements: p.requirements || '' });
  };

  const togglePosting = async (p) => {
    await call(`/postings/${p.id}`, { method: 'PATCH', body: { status: p.status === 'open' ? 'closed' : 'open' } });
    load();
  };

  const removePosting = async (p) => {
    if (!window.confirm(`Delete "${p.title}" and its applications?`)) return;
    await call(`/postings/${p.id}`, { method: 'DELETE' });
    load();
  };

  const setAppStatus = async (id, status) => {
    await call(`/applications/${id}`, { method: 'PATCH', body: { status } });
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  // One-click Hire: accept + auto-provision the employee login, staff role,
  // mentor staging for coaches, and invite email. The temp password comes
  // back once — share it with the hire directly.
  const [hiredCreds, setHiredCreds] = useState(null); // { email, tempPassword, role }
  const [hiringId, setHiringId] = useState(null); // posting id with screening editor open
  const [hiringDraft, setHiringDraft] = useState({ questions: '', samples_required: false, trial_task: '', trial_days: '14', salary_tbc: '', salary_freq: 'monthly', closes_at: '' });
  const [trials, setTrials] = useState([]);
  const [roster, setRoster] = useState([]);
  const [payAmounts, setPayAmounts] = useState({});
  const [payResult, setPayResult] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const loadRoster = async () => {
    try {
      const rows = await call('/payroll');
      setRoster(rows || []);
      const init = {};
      for (const r of rows || []) init[r.email] = String(r.salary_tbc || '');
      setPayAmounts(init);
    } catch { setRoster([]); }
  };
  useEffect(() => { loadRoster(); }, []);
  const runPayroll = async () => {
    const payments = Object.entries(payAmounts)
      .map(([email, v]) => ({ email, tbc: Number(v) }))
      .filter((x) => x.tbc > 0);
    if (!payments.length) { toast({ variant: 'destructive', title: 'Nothing to allocate', description: 'Enter a platform-credit amount per person first.' }); return; }
    const total = payments.reduce((n, x) => n + x.tbc, 0);
    if (!window.confirm(`Allocate ${total} existing platform credits to ${payments.length} staff from YOUR credit balance? This is not a token issuance or fiat salary payment.`)) return;
    setPayBusy(true);
    try {
      const res = await call('/payroll', { method: 'POST', body: { payments } });
      setPayResult(res);
      loadRoster();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Payroll failed', description: err.message });
    } finally { setPayBusy(false); }
  };
  const loadTrials = async () => {
    try {
      const rows = await call('/trials');
      setTrials(rows || []);
    } catch { setTrials([]); }
  };
  useEffect(() => { loadTrials(); }, []);
  // Compliance-first hire: the dialog collects the lawful-hiring
  // confirmation (work country + region, arrangement, agreement, IP,
  // payroll, manager approval). The API enforces the same gate server-side.
  const [hireFor, setHireFor] = useState(null);
  const [hireCompliance, setHireCompliance] = useState({ workCountry: '', workRegion: '', arrangement: 'eor', agreementSigned: false, ipAssigned: false, payrollReady: false, managerApproved: false, note: '' });
  const openHire = (a) => {
    const c = a.compliance && typeof a.compliance === 'object' ? a.compliance : {};
    setHireCompliance({
      workCountry: c.workCountry || '', workRegion: c.workRegion || '',
      arrangement: ['direct', 'eor', 'contractor', 'subsidiary', 'peo'].includes(String(c.arrangement || '').toLowerCase()) ? String(c.arrangement).toLowerCase() : 'eor',
      agreementSigned: c.agreementSigned === true, ipAssigned: c.ipAssigned === true,
      payrollReady: c.payrollReady === true, managerApproved: c.managerApproved === true,
      note: c.note || '',
    });
    setHireFor(a);
  };
  const hireWarnFor = (a) => {
    if (!a) return '';
    const post = postings.find((x) => x.id === a.jobId);
    const closesAt = post?.hiring?.closes_at;
    const windowOpen = closesAt && !Number.isNaN(Date.parse(closesAt)) && Date.now() < Date.parse(closesAt);
    if (!windowOpen) return '';
    const poolN = apps.filter((x) => x.jobId === a.jobId && x.status !== 'hired' && x.status !== 'rejected').length;
    return `Collection window closes ${String(closesAt).slice(0, 10)} — ${poolN} candidate${poolN === 1 ? '' : 's'} in pool so far.`;
  };
  const confirmHire = async () => {
    const a = hireFor;
    if (!a) return;
    setBusy(true);
    try {
      const res = await call(`/applications/${a.id}/hire`, { method: 'POST', body: { compliance: hireCompliance } });
      setApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'hired', compliance: hireCompliance } : x)));
      setHireFor(null);
      if (res?.tempPassword) {
        setHiredCreds({ email: res.email, tempPassword: res.tempPassword, role: res.role });
      } else {
        toast({ title: `Hired — ${res?.already ? 'login already existed' : 'login ready'}`, description: res?.email });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hire blocked', description: err.message });
    } finally { setBusy(false); }
  };

  const openHiring = (p) => {
    const h = p.hiring && typeof p.hiring === 'object' ? p.hiring : {};
    setHiringId(p.id);
    setHiringDraft({
      questions: (Array.isArray(h.screening) ? h.screening : []).map((q) => q?.q || q).join('\n'),
      samples_required: h.samples_required === true,
      trial_task: h.trial_task || '',
      trial_days: String(h.trial_days || 14),
      salary_tbc: h.salary_tbc ? String(h.salary_tbc) : '',
      salary_freq: h.salary_freq || 'monthly',
      closes_at: h.closes_at ? String(h.closes_at).slice(0, 10) : '',
    });
  };
  const saveHiring = async (p) => {
    setBusy(true);
    try {
      const updated = await call(`/postings/${p.id}`, {
        method: 'PATCH',
        body: {
          hiring: {
            screening: hiringDraft.questions.split('\n').map((x) => x.trim()).filter(Boolean).map((q) => ({ q, required: true })),
            samples_required: hiringDraft.samples_required,
            trial_task: hiringDraft.trial_task,
            trial_days: hiringDraft.trial_days,
            salary_tbc: hiringDraft.salary_tbc,
            salary_freq: hiringDraft.salary_freq,
            closes_at: hiringDraft.closes_at || null,
          },
        },
      });
      setPostings((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
      setHiringId(null);
      toast({ title: 'Screening saved' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally { setBusy(false); }
  };
  const confirmTrial = async (u) => {
    try {
      await call(`/trials/${u.id}/confirm`, { method: 'POST' });
      setTrials((prev) => prev.filter((x) => x.id !== u.id));
      toast({ title: `Probation cleared — ${u.email} is now full staff` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Confirm failed', description: err.message });
    }
  };
  const toggleAutoAccept = async (p) => {
    try {
      const updated = await call(`/postings/${p.id}`, { method: 'PATCH', body: { auto_accept: !(p.auto_accept === true) } });
      setPostings((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
      toast({ title: updated?.auto_accept ? `Auto-accept ON — ${p.title} hires every applicant instantly` : `Auto-accept off — ${p.title}` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Toggle failed', description: err.message });
    }
  };

  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';

  return (
    <AdminLayout title="Jobs & Hiring">
      <div className="at-page at-scope at-enter pb-10">
      <AtPageBar
        actions={(
          <>
            <AtButton onClick={seedCompanyRoles} disabled={busy} variant="outline" size="sm" icon={Sparkles}>Seed roles</AtButton>
            <AtButton onClick={() => { load(); loadRoster(); loadTrials(); }} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>
          </>
        )}
      />
      <div className="mb-4 mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AtMetric index="01" label="Open openings" value={postings.filter((p) => p.status === 'open').length} note="Published and collecting" />
        <AtMetric index="02" label="Active applicants" value={apps.filter((a) => a.status !== 'hired' && a.status !== 'rejected').length} note="In review" tone="text-[var(--at-green)]" />
        <AtMetric index="03" label="On probation" value={trials.length} note="Awaiting confirmation" tone={trials.length ? 'text-[var(--at-amber)]' : undefined} />
        <AtMetric index="04" label="Employed staff" value={roster.length} note="Hired through this desk" />
      </div>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-5">
        {/* ── Left: posting form + openings ── */}
        <div className="glass min-w-0 w-full rounded-2xl p-4 sm:p-5 xl:col-span-2">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">{editingId ? 'Edit opening' : 'New opening'}</h3>
          <div className="mt-3 space-y-2">
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Trading Coach (Forex)" className={input} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className={input} />
              <input value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))} placeholder="Type" className={input} />
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className={input} />
            </div>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Role description" className={`${input} min-h-[84px]`} />
            <textarea value={form.requirements} onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))} placeholder="Requirements" className={`${input} min-h-[60px]`} />
            <div className="flex gap-2">
              <button onClick={savePosting} disabled={busy} className="rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-bold text-[#0a0a0f] disabled:opacity-60">{editingId ? 'Save' : 'Publish'}</button>
              {editingId && <button onClick={resetForm} className="rounded-[10px] border border-white/10 px-4 py-2 text-sm text-[#8a8577]">Cancel</button>}
            </div>
          </div>
          <div className="mb-2 mt-5 flex items-center gap-2">
            <h3 className="shrink-0 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Openings ({postings.length})</h3>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1">
              <Search className="h-3 w-3 shrink-0 text-[#6a665a]" />
              <input value={postQ} onChange={(e) => setPostQ(e.target.value)} placeholder="Filter openings…" className="w-full min-w-0 bg-transparent text-[11px] text-[#e9e7df] outline-none placeholder:text-[#5f5b50]" />
              {postQ && <button onClick={() => setPostQ('')}><X className="h-3 w-3 text-[#6a665a]" /></button>}
            </div>
            {['all', 'open', 'closed'].map((s) => (
              <button key={s} onClick={() => setPostFilter(s)} className={`shrink-0 rounded-md px-1.5 py-1 font-mono text-[10px] font-bold uppercase ${postFilter === s ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#6a665a] hover:text-[#c9c4b4]'}`}>{s}</button>
            ))}
          </div>
          <div className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1 nice-scroll">
            {filteredPostings.map((p) => (
              <div key={p.id} className={`rounded-[10px] border bg-[#0f0f14] px-2.5 py-2 ${p.status === 'open' ? 'border-[#d4af37]/20' : 'border-white/[0.07] opacity-70'}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.status === 'open' ? 'bg-emerald-400' : 'bg-[#5f5b50]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[#f0ecdd]">{p.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#6a665a]">
                      <span className="truncate">{p.department} · {p.employmentType} · {p.location}</span>
                      {Number(p.hiring?.salary_tbc) > 0 && <span className="font-mono font-bold text-[#d4af37]">{p.hiring.salary_tbc} credits/{p.hiring.salary_freq === 'weekly' ? 'wk' : 'mo'}</span>}
                      {appCountFor(p.id) > 0 && <span className="rounded bg-[#38bdf8]/10 px-1 font-mono font-bold text-[#38bdf8]">{appCountFor(p.id)} applying</span>}
                      {p.auto_accept === true && <span className="rounded bg-emerald-400/10 px-1 font-mono font-bold uppercase text-emerald-300">auto</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button onClick={() => startEdit(p)} title="Edit" className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#d4af37]"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => togglePosting(p)} title={p.status === 'open' ? 'Close' : 'Reopen'} className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#d4af37]"><Power className="h-3.5 w-3.5" /></button>
                    <button onClick={() => toggleAutoAccept(p)} title="Auto-hire every applicant" className={`grid h-7 w-7 place-items-center rounded-lg hover:bg-white/5 ${p.auto_accept === true ? 'text-emerald-300' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}><Zap className="h-3.5 w-3.5" /></button>
                    <button onClick={() => (hiringId === p.id ? setHiringId(null) : openHiring(p))} title="Gates: screening, trial, salary" className={`grid h-7 w-7 place-items-center rounded-lg hover:bg-white/5 ${hiringId === p.id ? 'text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}><Settings2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removePosting(p)} title="Delete" className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {hiringId === p.id && (
                  <div className="mt-2 space-y-2 rounded-[10px] border border-[#d4af37]/15 bg-black/20 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Knockout questions (one per line)</div>
                    <textarea value={hiringDraft.questions} onChange={(e) => setHiringDraft({ ...hiringDraft, questions: e.target.value })} placeholder={"e.g. Link your live trading journal\nHow many years profitable?"} className={`${input} min-h-[64px]`} />
                    <label className="flex items-center gap-2 text-xs text-[#c9c4b4]">
                      <input type="checkbox" checked={hiringDraft.samples_required} onChange={(e) => setHiringDraft({ ...hiringDraft, samples_required: e.target.checked })} className="h-4 w-4 accent-[#d4af37]" />
                      Require proof-of-work links
                    </label>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Trial task brief</div>
                    <textarea value={hiringDraft.trial_task} onChange={(e) => setHiringDraft({ ...hiringDraft, trial_task: e.target.value })} placeholder="e.g. Record a 5-min XAUUSD breakdown…" className={`${input} min-h-[56px]`} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Proposed platform credit</div>
                        <div className="flex gap-2">
                          <input type="number" min="0" value={hiringDraft.salary_tbc} onChange={(e) => setHiringDraft({ ...hiringDraft, salary_tbc: e.target.value })} placeholder="e.g. 300" className={`${input} min-w-0 flex-1`} />
                          <select value={hiringDraft.salary_freq} onChange={(e) => setHiringDraft({ ...hiringDraft, salary_freq: e.target.value })} className={`${input} !w-24`}>
                            <option value="monthly">/ mo</option>
                            <option value="weekly">/ wk</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Apply by</div>
                        <input type="date" value={hiringDraft.closes_at} onChange={(e) => setHiringDraft({ ...hiringDraft, closes_at: e.target.value })} className={`${input} w-full`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8a8577]">Probation (days)</span>
                      <input type="number" min="1" max="90" value={hiringDraft.trial_days} onChange={(e) => setHiringDraft({ ...hiringDraft, trial_days: e.target.value })} className={`${input} !w-20`} />
                      <button onClick={() => saveHiring(p)} disabled={busy} className="ml-auto rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-xs font-bold text-[#0a0a0f] disabled:opacity-50">Save gates</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!filteredPostings.length && !loading && <p className="text-sm text-[#8a8577]">{postings.length ? 'No openings match the filter.' : 'No openings yet — publish the first above.'}</p>}
          </div>
        </div>

        {/* ── Right: applicant pipeline ── */}
        <div className="glass min-w-0 w-full rounded-2xl p-4 sm:p-5 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Applicants ({apps.length})</h3>
            {hiredCreds && <button onClick={() => setHiredCreds(null)} className="text-[11px] text-[#8a8577] hover:text-[#e9e7df]">Dismiss hire notice</button>}
          </div>
          {hiredCreds && (
            <div className="mt-3 rounded-[10px] border border-emerald-400/30 bg-emerald-400/5 p-3 text-xs">
              <div className="font-bold text-emerald-300">Hired — login ready for {hiredCreds.email} ({hiredCreds.role})</div>
              <div className="mt-1 font-mono text-[#f0ecdd]">Temp password: {hiredCreds.tempPassword}</div>
              <div className="mt-1 text-[#8a8577]">Share it with them directly + invite email sent.</div>
            </div>
          )}
          <div className="mt-3 overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[#5f5b50]">
                  <th className="pb-2 font-semibold">Candidate</th>
                  <th className="pb-2 font-semibold">Opening</th>
                  <th className="pb-2 font-semibold">Risk</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-white/5 [&_tr:hover]:bg-white/[0.02]">
                {[...apps].sort((x, y) => {
                  const hx = x.status === 'hired' ? 1 : 0;
                  const hy = y.status === 'hired' ? 1 : 0;
                  if (hx !== hy) return hx - hy;
                  const rank = (a) => {
                    const t = String(postings.find((p) => p.id === a.jobId)?.title || '');
                    if (/founder|chief executive/i.test(t)) return 0;
                    if (/vice president/i.test(t)) return 1;
                    return 2;
                  };
                  const rx = rank(x), ry = rank(y);
                  if (rx !== ry) return rx - ry;
                  const sx = x.checks?.samples_ok === true ? 0 : 1;
                  const sy = y.checks?.samples_ok === true ? 0 : 1;
                  if (sx !== sy) return sx - sy;
                  return (Number(x.checks?.risk_score) || 0) - (Number(y.checks?.risk_score) || 0);
                }).map((a) => {
                  const trialBrief = a.status === 'trial_task' ? postings.find((x) => x.id === a.jobId)?.hiring?.trial_task : null;
                  // checks.staffCard is the ID-card profile mirror — not a
                  // recruiter note, so don't show an empty "+ file" for it.
                  const checkData = a.checks && typeof a.checks === 'object' ? a.checks : null;
                  const hasChecks = Boolean(checkData && (
                    typeof checkData.risk_score === 'number'
                    || (Array.isArray(checkData.samples) && checkData.samples.length)
                    || (checkData.answers && typeof checkData.answers === 'object' && Object.keys(checkData.answers).length)
                  ));
                  const hasDetail = Boolean(a.coverLetter || trialBrief || hasChecks);
                  const cand = (
                    <>
                      <div className="font-semibold text-[#f0ecdd]">{a.name}</div>
                      <div className="font-mono text-[11px] text-[#6a665a]">{a.email}{a.phone ? ` · ${a.phone}` : ''} · {(a.created || '').slice(0, 10)}</div>
                    </>
                  );
                  return (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-2">
                      {hasDetail ? (
                        <details>
                          <summary className="cursor-pointer list-none">{cand}<span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-[#d4af37]/70">+ file</span></summary>
                          <div className="mt-1.5 max-w-[320px] space-y-1.5 rounded-lg border border-white/5 bg-black/20 p-2">
                            {a.coverLetter && <p className="max-h-20 overflow-y-auto text-[11px] leading-relaxed text-[#c9c4b4]">{a.coverLetter}</p>}
                            {trialBrief && <p className="rounded-md border border-[#d4af37]/20 bg-[#d4af37]/5 p-1.5 text-[11px] leading-relaxed text-[#c9c4b4]">Trial brief: {trialBrief}</p>}
                            {a.checks && typeof a.checks === 'object' && (
                              <>
                                {typeof a.checks.risk_score === 'number' && (
                                  <div className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${a.checks.risk_score >= 60 ? 'bg-red-400/10 text-red-300' : a.checks.risk_score >= 30 ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-emerald-400/10 text-emerald-300'}`}>
                                    Originality {a.checks.risk_score >= 60 ? 'high' : a.checks.risk_score >= 30 ? 'review' : 'low'} ({a.checks.risk_score})
                                  </div>
                                )}
                                {a.checks.samples && a.checks.samples.length > 0 && (
                                  <div className="text-[11px] text-[#8a8577]">
                                    Work: {a.checks.samples.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" className="mr-2 font-mono text-[#d4af37] hover:underline">[link {i + 1}]</a>)}
                                    <span className="ml-1 text-[#6a665a]">({a.checks.samples_note || 'unverified'})</span>
                                  </div>
                                )}
                                {a.checks.answers && typeof a.checks.answers === 'object' && Object.keys(a.checks.answers).length > 0 && Object.entries(a.checks.answers).map(([q, ans], i) => (
                                  <div key={i} className="text-[11px]"><span className="font-semibold text-[#d4af37]">{q}: </span><span className="text-[#c9c4b4]">{ans}</span></div>
                                ))}
                              </>
                            )}
                          </div>
                        </details>
                      ) : cand}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs text-[#8a8577]">{a.job_postings?.title || 'Opening'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      {typeof a.checks?.risk_score === 'number'
                        ? <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${a.checks.risk_score >= 60 ? 'bg-red-400/10 text-red-300' : a.checks.risk_score >= 30 ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'bg-emerald-400/10 text-emerald-300'}`}>{a.checks.risk_score}</span>
                        : <span className="font-mono text-[10px] text-[#5f5b50]">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      {a.status === 'hired'
                        ? <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Hired</span>
                        : <select value={a.status} onChange={(e) => setAppStatus(a.id, e.target.value)} className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 py-1 text-[11px] text-[#e9e7df]">
                          {APP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      {a.status !== 'hired' && (
                        <button onClick={() => openHire(a)} disabled={busy} className="rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-[11px] font-bold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50">Hire ✓</button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {!apps.length && !loading && <p className="py-6 text-center text-sm text-[#8a8577]">No applications yet.</p>}
          </div>
          {apps.length > 0 && (
            <p className="mt-2 text-[11px] text-[#6a665a]">Click a candidate for cover letter, checks and trial brief.</p>
          )}

          <div className="mb-2 mt-6 flex items-center gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Probation ({trials.length})</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <button onClick={loadTrials} className="text-[11px] text-[#8a8577] hover:text-[#e9e7df]">Refresh</button>
          </div>
          <div className="space-y-2">
            {trials.map((u) => {
              const days = u.trial_ends_at ? Math.max(0, Math.ceil((new Date(u.trial_ends_at) - Date.now()) / 864e5)) : null;
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#f0ecdd]">{u.username || u.name || u.email}</div>
                    <div className="font-mono text-[11px] text-[#8a8577]">{u.email} · {u.role}{days !== null ? ` · ${days}d left` : ''}</div>
                  </div>
                  <button onClick={() => confirmTrial(u)} className="rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-[11px] font-bold text-[#0a0a0f] transition hover:opacity-90">Confirm ✓</button>
                </div>
              );
            })}
            {!trials.length && <p className="text-xs text-[#6a665a]">Nobody on probation — new hires land here automatically for review.</p>}
          </div>

          <div className="mb-2 mt-6 flex items-center gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Platform credit payroll ({roster.length})</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            <button onClick={loadRoster} className="text-[11px] text-[#8a8577] hover:text-[#e9e7df]">Refresh</button>
          </div>
          <p className="mb-2 text-[11px] leading-relaxed text-[#6a665a]">These are existing off-chain platform credits, not the proposed TBC token. They are not a fiat salary or evidence that any token has been issued. Cash compensation is handled separately through payroll or an employer of record.</p>
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="tb-mobile-actions w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[#5f5b50]">
                  <th className="pb-2 font-semibold">Staff</th>
                  <th className="pb-2 font-semibold">Contract credit</th>
                  <th className="pb-2 text-right font-semibold">Allocate (credits)</th>
                </tr>
              </thead>
              <tbody className="[&_tr]:border-t [&_tr]:border-white/5">
                {roster.map((r) => (
                  <tr key={r.email}>
                    <td className="py-2 pr-2">
                      <div className="truncate text-sm font-semibold text-[#f0ecdd]">{r.name || r.email}</div>
                      <div className="truncate font-mono text-[11px] text-[#6a665a]">{r.email} · {r.title}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-[#8a8577]">{Number(r.salary_tbc) > 0 ? `${r.salary_tbc} credits/${r.salary_freq === 'weekly' ? 'wk' : 'mo'}` : '—'}</td>
                    <td className="py-2 pl-2 text-right">
                      <input type="number" min="0" value={payAmounts[r.email] ?? ''} onChange={(e) => setPayAmounts({ ...payAmounts, [r.email]: e.target.value })} placeholder="0" className={`${input} !w-24 !py-1.5 text-right font-mono`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!roster.length && <p className="py-4 text-center text-xs text-[#6a665a]">No hired staff yet — payroll fills as you hire.</p>}
          </div>
          {roster.length > 0 && (
            <button onClick={runPayroll} disabled={payBusy} className="mt-3 w-full rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-bold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50">
              {payBusy ? 'Allocating…' : 'Allocate platform credits'}
            </button>
          )}
          {payResult && (
            <div className="mt-2 rounded-[10px] border border-[#d4af37]/20 bg-black/20 p-3 text-xs">
              <div className="font-bold text-[#f0ecdd]">Run {payResult.run}: {payResult.paid} credited · {payResult.failed} failed · {payResult.total} platform credits</div>
              {(payResult.results || []).filter((x) => !x.ok).map((x) => (
                <div key={x.email} className="mt-1 text-red-300">{x.email}: {x.error}</div>
              ))}
              <button onClick={() => setPayResult(null)} className="mt-2 text-[#8a8577] hover:text-[#e9e7df]">Dismiss</button>
            </div>
          )}
        </div>
      </div>
      {/* ── Compliance-first hire dialog (no native popup) ── */}
      {hireFor && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`Hire ${hireFor.name}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHireFor(null)} />
          <div className="glass relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
            <h4 className="text-sm font-extrabold text-[#f0ecdd]">Hire {hireFor.name}?</h4>
            <p className="mt-0.5 font-mono text-[11px] text-[#8a8577]">{hireFor.email} · creates their employee login immediately</p>
            {hireWarnFor(hireFor) && <p className="mt-2 rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-2 text-[11px] text-[#e8c95a]">{hireWarnFor(hireFor)}</p>}
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">Lawful-hiring confirmation</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a8577]">No work starts until every item is confirmed. Stored on the application.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#8a8577]">Work country</label>
                <input value={hireCompliance.workCountry} onChange={(e) => setHireCompliance({ ...hireCompliance, workCountry: e.target.value })} placeholder="e.g. Nigeria" className={input} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#8a8577]">State / region</label>
                <input value={hireCompliance.workRegion} onChange={(e) => setHireCompliance({ ...hireCompliance, workRegion: e.target.value })} placeholder="e.g. Lagos / Texas" className={input} />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-[11px] font-semibold text-[#8a8577]">Hiring arrangement</label>
              <select value={hireCompliance.arrangement} onChange={(e) => setHireCompliance({ ...hireCompliance, arrangement: e.target.value })} className={input}>
                <option value="direct" className="bg-[#0f0f14]">Direct employment (registered payroll)</option>
                <option value="eor" className="bg-[#0f0f14]">Employer of Record (no local entity)</option>
                <option value="contractor" className="bg-[#0f0f14]">Independent contractor (genuine)</option>
                <option value="subsidiary" className="bg-[#0f0f14]">Local subsidiary</option>
                <option value="peo" className="bg-[#0f0f14]">PEO co-employment (U.S.)</option>
              </select>
            </div>
            <div className="mt-2 space-y-1.5">
              {[['agreementSigned', 'Localized employment agreement signed'], ['ipAssigned', 'IP assignment + confidentiality confirmed'], ['payrollReady', 'Payroll registration / EOR coverage confirmed'], ['managerApproved', 'Manager approval to hire']].map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
                  <span className="text-[13px] text-[#c9c4b4]">{label}</span>
                  <input type="checkbox" checked={hireCompliance[k]} onChange={(e) => setHireCompliance({ ...hireCompliance, [k]: e.target.checked })} className="h-5 w-5 shrink-0 accent-[#d4af37]" />
                </label>
              ))}
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-[11px] font-semibold text-[#8a8577]">Compliance note (optional)</label>
              <input value={hireCompliance.note} onChange={(e) => setHireCompliance({ ...hireCompliance, note: e.target.value })} placeholder="EOR provider, work authorization, …" className={input} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setHireFor(null)} className="min-h-[44px] rounded-xl border border-white/10 px-4 text-sm font-bold text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#f0ecdd]">Cancel</button>
              <button onClick={confirmHire} disabled={busy} className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-sm font-bold text-[#0a0a0f] transition hover:brightness-105 disabled:opacity-50">{busy ? 'Hiring…' : 'Confirm hire ✓'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN TV ──────────────────────────────────────────────────── */
export function AdminTvAds() {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [settings, setSettings] = useState({ rotationSeconds: 12, autoOpenIntervalMinutes: 0, headerText: 'TradingBible TV', footerText: 'Advertise with TradingBible', advertiserEmail: 'ads@tradingbible.app' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', headline: '', imageUrl: '', logoUrl: '', linkUrl: '', cta: 'Learn more', accent: '#d4af37', durationSeconds: 12, snippet: '', enabled: true, type: 'banner', weight: 1, priority: 0, placementIds: [] });
  // Advanced serving JSON: targeting, frequencyCaps, dayparting, pages,
  // vastXml/vmapXml, storyDurationSeconds. Validated on save, merged into config.
  const [advancedJson, setAdvancedJson] = useState('');
  const [advJsonError, setAdvJsonError] = useState('');

  const AD_TYPE_OPTIONS = ['banner', 'video', 'native', 'interstitial', 'rewarded', 'sticky', 'app_open', 'amp', 'story'];
  const PLACEMENT_OPTIONS = [
    { id: 'ph_dashboard_top', name: 'Dashboard top banner' },
    { id: 'ph_academy_feed', name: 'Academy in-feed' },
    { id: 'ph_blog_feed', name: 'Blog in-feed' },
    { id: 'ph_story', name: 'Story fullscreen' },
  ];
  const EMPTY_AD_FORM = { title: '', headline: '', imageUrl: '', videoUrl: '', logoUrl: '', linkUrl: '', cta: 'Learn more', accent: '#d4af37', durationSeconds: 12, snippet: '', enabled: true, type: 'banner', weight: 1, priority: 0, placementIds: [] };
  const ADVANCED_KEYS = ['targeting', 'frequencyCaps', 'dayparting', 'pages', 'vastXml', 'vmapXml', 'storyDurationSeconds'];

  // ── Live channels (manual channel guide for the TV widget + TV page) ──
  const [channels, setChannels] = useState([]);
  const [chEditing, setChEditing] = useState(null);
  const [chBusy, setChBusy] = useState(false);
  const [chForm, setChForm] = useState({ title: '', desk: 'Live', url: '', embedUrl: '', blurb: '', isNew: false, enabled: true, plan: 'pro' });
  // ── Experiments (server-aggregated exposures/conversions) ──
  const [experiments, setExperiments] = useState([]);
  const [expLoaded, setExpLoaded] = useState(false);

  const load = useCallback(async () => {
    const token = pb.authStore.token;
    try {
      const [adsRes, setRes, chRes, expRes] = await Promise.all([
        fetch(`${API_SERVER_URL}/ads/admin/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_SERVER_URL}/ads`),
        fetch(`${API_SERVER_URL}/ads/admin/channels/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_SERVER_URL}/ads/admin/experiments/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [adsData, feedData, chData, expData] = await Promise.all([adsRes.json(), setRes.json(), chRes.json().catch(() => ({})), expRes.json().catch(() => ({}))]);
      setAds(adsRes.ok ? adsData.ads || [] : []);
      setExperiments(expRes.ok ? expData.experiments || [] : []);
      if (feedData?.settings) setSettings((s) => ({ ...s, ...feedData.settings }));
      // Built-ins first (locked rows — they ship in code, not the DB).
      const builtins = LIVE_CHANNELS.map((c) => ({
        id: `builtin-${c.id}`,
        key: `builtin:${c.id}`,
        enabled: true,
        builtin: true,
        config: { title: c.title, desk: c.desk, url: c.url, embedUrl: c.embedUrl, blurb: `${c.blurb} (Built-in — always shown.)`, isNew: c.isNew, plan: c.plan },
      }));
      setChannels(chRes.ok ? [...builtins, ...(chData.channels || [])] : builtins);
    } catch {
      setAds([]);
      setChannels([]);
      setExperiments([]);
    } finally {
      setLoading(false);
      setExpLoaded(true);
    }
  }, []);

  // Significance per experiment, computed with the same engine clients use.
  const expReports = useMemo(() => {
    const engine = new ABTestingEngine({ storage: null });
    return experiments.map((exp) => {
      const varIds = Object.keys(exp.variants || {});
      const metrics = [...new Set(varIds.flatMap((id) => Object.keys(exp.variants[id]?.metrics || {})))];
      const experiment = { id: exp.id, variants: varIds.map((id) => ({ id })), metrics };
      const results = Object.fromEntries(varIds.map((id) => [id, {
        variant: { id },
        metrics: exp.variants[id]?.metrics || {},
        exposures: exp.variants[id]?.exposures || 0,
      }]));
      return { exp, significance: engine.calculateSignificance(experiment, results) || {} };
    });
  }, [experiments]);

  useEffect(() => { load(); }, [load]);

  const api = async (path, opts = {}) => {
    const token = pb.authStore.token;
    const res = await fetch(`${API_SERVER_URL}/ads${path}`, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'request failed');
    return res.json();
  };

  const saveAd = async (e) => {
    e.preventDefault();
    let advanced = {};
    if (advancedJson.trim()) {
      try {
        const parsed = JSON.parse(advancedJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('must be a JSON object');
        advanced = Object.fromEntries(Object.entries(parsed).filter(([k]) => ADVANCED_KEYS.includes(k)));
        setAdvJsonError('');
      } catch (err) {
        setAdvJsonError(`Invalid advanced JSON: ${err.message}`);
        return;
      }
    } else {
      setAdvJsonError('');
    }
    const payload = {
      ...form,
      weight: Number(form.weight) || 0,
      priority: Math.trunc(Number(form.priority) || 0),
      ...advanced,
    };
    setBusy(true);
    try {
      if (editing) {
        await api(`/admin/${editing.id}`, { method: 'PATCH', body: { config: payload, enabled: form.enabled } });
        toast({ title: 'Broadcast updated' });
      } else {
        await api('/admin', { method: 'POST', body: { title: form.title, config: payload, enabled: form.enabled } });
        toast({ title: 'Broadcast created' });
      }
      setEditing(null);
      setForm({ ...EMPTY_AD_FORM });
      setAdvancedJson('');
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err.message || err) });
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: settings });
      toast({ title: 'TV settings saved' });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err.message || err) });
    } finally {
      setBusy(false);
    }
  };

  const removeAd = async (id) => {
    if (!window.confirm('Remove this broadcast?')) return;
    try {
      await api(`/admin/${id}`, { method: 'DELETE' });
      await load();
      toast({ title: 'Broadcast removed' });
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err.message || err) });
    }
  };

  const saveChannel = async (e) => {
    e.preventDefault();
    setChBusy(true);
    try {
      if (chEditing) {
        await api(`/admin/channels/${chEditing.id}`, { method: 'PATCH', body: { config: chForm, enabled: chForm.enabled } });
        toast({ title: 'Channel updated' });
      } else {
        await api('/admin/channels', { method: 'POST', body: { title: chForm.title, config: chForm, enabled: chForm.enabled } });
        toast({ title: 'Channel added' });
      }
      setChEditing(null);
      setChForm({ title: '', desk: 'Live', url: '', embedUrl: '', blurb: '', isNew: false, enabled: true, plan: 'pro' });
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err.message || err) });
    } finally {
      setChBusy(false);
    }
  };

  const removeChannel = async (id) => {
    if (!window.confirm('Remove this channel from the live TV guide?')) return;
    try {
      await api(`/admin/channels/${id}`, { method: 'DELETE' });
      await load();
      toast({ title: 'Channel removed' });
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err.message || err) });
    }
  };

  const startChannelEdit = (ch) => {
    setChEditing(ch);
    setChForm({ ...(ch.config || {}), title: ch.config?.title || '', enabled: ch.enabled !== false });
  };

  const setCF = (k) => (e) => setChForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const startEdit = (ad) => {
    const c = ad.config || {};
    setEditing(ad);
    setForm({
      ...EMPTY_AD_FORM,
      ...c,
      title: ad.title || c.title || '',
      enabled: ad.enabled !== false,
      type: c.type || 'banner',
      weight: c.weight ?? 1,
      priority: c.priority ?? 0,
      placementIds: Array.isArray(c.placementIds) ? c.placementIds : [],
    });
    const adv = Object.fromEntries(ADVANCED_KEYS.filter((k) => c[k] !== undefined && c[k] !== '' && !(Array.isArray(c[k]) && c[k].length === 0)).map((k) => [k, c[k]]));
    setAdvancedJson(Object.keys(adv).length ? JSON.stringify(adv, null, 2) : '');
    setAdvJsonError('');
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';

  return (
    <AdminLayout title="TradingBible TV">
      <div className="at-page at-scope at-enter">
      <AtPageBar
        actions={(
          <>
            <AtButton onClick={saveSettings} variant="gold" icon={Save} disabled={busy}>Save settings</AtButton>
            <AtButton to="/tv" variant="outline" icon={MonitorPlay}>Open TV</AtButton>
          </>
        )}
      />

      <div className="mt-3 mb-5">
        <AtAlert icon={MonitorPlay}>
          This console controls <b className="text-[var(--at-ink)]">advertising and live channels</b>, not TBC token issuance. Advertiser creative should never be mistaken for a financial promotion or a promise of returns.
        </AtAlert>
      </div>

      {/* TV settings */}
      <div className="at-card mb-5 p-4 sm:p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#f0ecdd]"><Settings2 className="h-4 w-4 text-[#d4af37]" /> TV Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={label}>Rotation (seconds)</label>
            <input type="number" min="4" max="60" className={input} value={settings.rotationSeconds}
              onChange={(e) => setSettings({ ...settings, rotationSeconds: Number(e.target.value) })} /></div>
          <div><label className={label}>Header text</label>
            <input className={input} value={settings.headerText} onChange={(e) => setSettings({ ...settings, headerText: e.target.value })} /></div>
          <div><label className={label}>Footer text</label>
            <input className={input} value={settings.footerText} onChange={(e) => setSettings({ ...settings, footerText: e.target.value })} /></div>
          <div><label className={label}>Advertiser email</label>
            <input className={input} value={settings.advertiserEmail} onChange={(e) => setSettings({ ...settings, advertiserEmail: e.target.value })} /></div>
        </div>
        <button onClick={saveSettings} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-50">
          <Save className="h-4 w-4" /> Save settings
        </button>
      </div>

      {/* Create / edit form */}
      <div className="at-card mb-5 p-4 sm:p-5">
        <h3 className="mb-4 font-semibold text-[#f0ecdd]">{editing ? `Edit broadcast — ${editing.title || editing.key}` : 'New broadcast'}</h3>
        <form onSubmit={saveAd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={label}>Title *</label><input required className={input} value={form.title} onChange={setF('title')} placeholder="e.g. Acme Trading Summit" /></div>
          <div><label className={label}>Headline</label><input className={input} value={form.headline} onChange={setF('headline')} placeholder="Short punchy line" /></div>
          <div><label className={label}>CTA button text</label><input className={input} value={form.cta} onChange={setF('cta')} /></div>
          <div><label className={label}>Background image URL</label><input className={input} value={form.imageUrl} onChange={setF('imageUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Video URL (optional — plays in place of image)</label><input className={input} value={form.videoUrl} onChange={setF('videoUrl')} placeholder="https://…/clip.mp4 (autoplay, looped)" /></div>
          <div><label className={label}>Logo URL</label><input className={input} value={form.logoUrl} onChange={setF('logoUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Link URL (opens on click)</label><input className={input} value={form.linkUrl} onChange={setF('linkUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Accent color</label><input type="color" className="h-12 w-full cursor-pointer rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]" value={form.accent} onChange={setF('accent')} /></div>
          <div><label className={label}>Duration (seconds)</label><input type="number" min="4" max="60" className={input} value={form.durationSeconds} onChange={setF('durationSeconds')} /></div>
          <div><label className={label}>Format</label>
            <select className={input} value={form.type || 'banner'} onChange={setF('type')}>
              {AD_TYPE_OPTIONS.map((t) => <option key={t} value={t} className="bg-[#0f0f14]">{t}</option>)}
            </select>
          </div>
          <div><label className={label}>Weight (rotation)</label><input type="number" min="0" step="1" className={input} value={form.weight} onChange={setF('weight')} /></div>
          <div><label className={label}>Priority (higher first)</label><input type="number" step="1" className={input} value={form.priority} onChange={setF('priority')} /></div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={label}>In-app slots (none = everywhere)</label>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_OPTIONS.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${form.placementIds?.includes(p.id) ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#f0ecdd]' : 'border-[#d4af37]/15 text-[#8a8577]'}`}>
                  <input
                    type="checkbox"
                    checked={form.placementIds?.includes(p.id) || false}
                    onChange={(e) => setForm((f) => {
                      const cur = Array.isArray(f.placementIds) ? f.placementIds : [];
                      return { ...f, placementIds: e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id) };
                    })}
                    className="h-4 w-4 accent-[#d4af37]"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Advanced serving JSON (optional: targeting, frequencyCaps, dayparting, pages, vastXml, vmapXml, storyDurationSeconds)</label>
            <textarea rows="4" spellCheck="false" className={`${input} font-mono text-xs`} value={advancedJson} onChange={(e) => setAdvancedJson(e.target.value)} placeholder='{"frequencyCaps": [{"type": "impressions_per_day", "max": 3}], "targeting": [{"type": "user_segment", "segments": ["pro"]}]}' />
            {advJsonError && <p className="mt-1 text-xs text-red-400">{advJsonError}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Snippet (body text)</label>
            <textarea rows="4" className={input} value={form.snippet} onChange={setF('snippet')} placeholder="Longer description shown under the headline…" /></div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={label}>Live creative preview</label>
            <div className="overflow-hidden rounded-xl border border-[#d4af37]/15 bg-[#0a0a0f]">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="max-h-56 w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="grid h-24 place-items-center text-xs text-[#6a665a]">No image — add a Background image URL to preview</div>
              )}
              <div className="flex items-center gap-3 p-3">
                {form.logoUrl && <img src={form.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#f0ecdd]">{form.headline || form.title || 'Headline preview'}</div>
                  <div className="truncate text-xs text-[#8a8577]">{form.snippet || 'Snippet preview'}</div>
                </div>
                <span className="shrink-0 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-xs font-bold text-[#0a0a0f]">{form.cta || 'Learn more'}</span>
              </div>
              <div className="border-t border-white/5 px-3 py-2 font-mono text-[11px] text-[#6a665a]">
                {(form.type || 'banner')} · weight {form.weight ?? 1} · priority {form.priority ?? 0} · {(form.placementIds?.length ? form.placementIds.join(', ') : 'everywhere')}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={setF('enabled')} className="h-5 w-5 accent-[#d4af37]" />
            <span className="text-sm text-[#c9c4b4]">Live now</span>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {editing ? 'Update broadcast' : 'Publish broadcast'}
            </button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ ...EMPTY_AD_FORM }); setAdvancedJson(''); setAdvJsonError(''); }} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
          </div>
        </form>
      </div>

      {/* Ad list */}
      <div className="at-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tb-mobile-actions at-table w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
                <th className="px-5 py-3">Broadcast</th>
                <th className="px-5 py-3">Format</th>
                <th className="px-5 py-3">Slots</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Views</th>
                <th className="px-5 py-3">Clicks</th>
                <th className="px-5 py-3">CTR</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="px-5 py-10 text-center text-[#8a8577]">Loading broadcasts…</td></tr>
              ) : ads.length === 0 ? (
                <tr><td colSpan="8" className="px-5 py-10 text-center text-[#8a8577]">No broadcasts yet — create one above.</td></tr>
              ) : ads.map((ad) => {
                const c = ad.config || {};
                const clicks = Number(c.clicks) || 0;
                const views = Number(c.views) || 0;
                const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) + '%' : '—';
                const slots = Array.isArray(c.placementIds) && c.placementIds.length > 0 ? c.placementIds : ['everywhere'];
                return (
                  <tr key={ad.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {c.logoUrl && <img src={c.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                        <div>
                          <div className="font-medium text-[#f0ecdd]">{ad.title || ad.key}</div>
                          <div className="text-xs text-[#6a665a]">{c.headline || ad.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="rounded-full bg-[#d4af37]/10 px-2.5 py-1 font-mono text-xs text-[#d4af37]">{c.type || 'banner'}</span></td>
                    <td className="px-5 py-4 font-mono text-xs text-[#8a8577]">{slots.join(', ')}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${ad.enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/8 text-[#8a8577]'}`}>{ad.enabled ? 'Live' : 'Paused'}</span></td>
                    <td className="px-5 py-4 text-[#c9c4b4]">{views.toLocaleString()}</td>
                    <td className="px-5 py-4 text-[#c9c4b4]">{clicks.toLocaleString()}</td>
                    <td className="px-5 py-4 text-[#c9c4b4]">{ctr}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(ad)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37] hover:border-[#d4af37]/60" aria-label="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeAd(ad.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Experiments — server-aggregated A/B results */}
      <div className="at-card mt-5 overflow-hidden">
        <div className="border-b border-[var(--at-line)] px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-semibold text-[var(--at-ink)]"><TestTube className="h-4 w-4 text-[var(--at-gold)]" /> Experiments</h3>
          <p className="mt-0.5 text-xs text-[#8a8577]">Exposures and conversions mirrored from clients. Assignment stays client-side; counts aggregate here across devices.</p>
        </div>
        {!expLoaded ? (
          <p className="px-5 py-10 text-center text-sm text-[#8a8577]">Loading experiments…</p>
        ) : expReports.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#8a8577]">No experiment data yet — it appears once clients with experiments report exposures.</p>
        ) : expReports.map(({ exp, significance }) => (
          <div key={exp.id} className="border-b border-white/5 px-5 py-4 last:border-0">
            <div className="font-mono text-sm font-semibold text-[#f0ecdd]">{exp.id}</div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-[#6a665a]">
                    <th className="py-2 pr-4 font-medium">Variant</th>
                    <th className="py-2 pr-4 font-medium">Exposures</th>
                    <th className="py-2 pr-4 font-medium">Conversions</th>
                    <th className="py-2 pr-4 font-medium">Lift</th>
                    <th className="py-2 font-medium">p-value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(exp.variants || {}).map(([varId, v]) => {
                    const metric = Object.keys(v.metrics || {})[0];
                    const sig = metric ? significance[`${varId}.${metric}`] : null;
                    const isControl = varId === Object.keys(exp.variants || {})[0];
                    return (
                      <tr key={varId} className="border-t border-white/5">
                        <td className="py-2 pr-4 font-mono text-[#c9c4b4]">{varId}{isControl && <span className="ml-2 text-[10px] uppercase text-[#6a665a]">control</span>}</td>
                        <td className="py-2 pr-4 font-mono text-[#f0ecdd]">{(v.exposures || 0).toLocaleString()}</td>
                        <td className="py-2 pr-4 font-mono text-[#f0ecdd]">{metric ? `${(v.metrics[metric] || 0).toLocaleString()} ${metric}` : '—'}</td>
                        <td className="py-2 pr-4 font-mono text-[#c9c4b4]">{sig && Number.isFinite(sig.lift) ? `${sig.lift > 0 ? '+' : ''}${sig.lift.toFixed(1)}%` : '—'}</td>
                        <td className="py-2 font-mono">
                          {sig ? (
                            <span className={sig.significant ? 'text-emerald-400' : 'text-[#8a8577]'}>
                              {sig.pValue.toFixed(4)}{sig.significant ? ' ✓' : ''}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Live channels — manual channel guide for TV widget + TV page */}
      <div className="at-card mt-5 p-4 sm:p-5">
        <h3 className="mb-1 font-semibold text-[var(--at-ink)]">{chEditing ? `Edit channel — ${chEditing.config?.title || chEditing.key}` : 'New live channel'}</h3>
        <p className="mb-4 text-xs text-[#8a8577]">Channels appear in the floating TV widget and on the TV page after the 10 built-in desks. Use an embed URL (e.g. a YouTube <span className="font-mono">/embed/live_stream</span>) for instant in-player playback, otherwise the channel page loads in the player.</p>
        <form onSubmit={saveChannel} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={label}>Title *</label><input required className={input} value={chForm.title} onChange={setCF('title')} placeholder="e.g. Bloomberg Europe" /></div>
          <div><label className={label}>Desk badge</label><input className={input} value={chForm.desk} onChange={setCF('desk')} placeholder="Europe" /></div>
          <div><label className={label}>Stream page URL *</label><input required className={input} value={chForm.url} onChange={setCF('url')} placeholder="https://…" /></div>
          <div><label className={label}>Embed URL (optional)</label><input className={input} value={chForm.embedUrl} onChange={setCF('embedUrl')} placeholder="https://…/embed/…" /></div>
          <div className="sm:col-span-2"><label className={label}>Blurb</label><input className={input} value={chForm.blurb} onChange={setCF('blurb')} placeholder="One-line description shown in the guide…" /></div>
          <div><label className={label}>Minimum plan</label>
            <select className={input} value={chForm.plan || 'pro'} onChange={setCF('plan')}>
              <option value="pro" className="bg-[#0f0f14]">Pro — every paid plan</option>
              <option value="elite" className="bg-[#0f0f14]">Elite SI and up</option>
              <option value="professional" className="bg-[#0f0f14]">Professional only</option>
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={chForm.isNew} onChange={setCF('isNew')} className="h-5 w-5 accent-[#d4af37]" />
            <span className="text-sm text-[#c9c4b4]">Mark as NEW badge</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={chForm.enabled} onChange={setCF('enabled')} className="h-5 w-5 accent-[#d4af37]" />
            <span className="text-sm text-[#c9c4b4]">Live now</span>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={chBusy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {chEditing ? 'Update channel' : 'Add channel'}
            </button>
            {chEditing && <button type="button" onClick={() => { setChEditing(null); setChForm({ title: '', desk: 'Live', url: '', embedUrl: '', blurb: '', isNew: false, enabled: true, plan: 'pro' }); }} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="at-card mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tb-mobile-actions at-table w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">URL</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="px-5 py-10 text-center text-[#8a8577]">Loading channels…</td></tr>
              ) : channels.length === 0 ? (
                <tr><td colSpan="4" className="px-5 py-10 text-center text-[#8a8577]">No manual channels yet — the 10 built-in desks always show. Add one above.</td></tr>
              ) : channels.map((ch) => {
                const c = ch.config || {};
                return (
                  <tr key={ch.id} className="border-b border-[#d4af37]/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#f0ecdd]">{c.title || ch.key}</div>
                      <div className="text-xs text-[#6a665a]">{c.desk || 'Live'}{c.isNew ? ' · NEW' : ''}{c.blurb ? ` — ${c.blurb}` : ''} · <span className="text-[#d4af37]">{c.plan || 'pro'}</span></div>
                    </td>
                    <td className="max-w-[220px] truncate px-5 py-4 font-mono text-xs text-[#8a8577]">{c.embedUrl || c.url}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${ch.enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-white/8 text-[#8a8577]'}`}>{ch.builtin ? 'Built-in' : ch.enabled ? 'Live' : 'Paused'}</span></td>
                    <td className="px-5 py-4">
                      {ch.builtin ? (
                        <div className="flex justify-end"><span className="text-[11px] text-[#5f5b50]">Ships with the app</span></div>
                      ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startChannelEdit(ch)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/20 text-[#d4af37] hover:border-[#d4af37]/60" aria-label="Edit"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeChannel(ch.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/60" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}

/* ─── WEEKLY DIGEST PANEL ────────────────────────────────────────── */
function DigestPanel() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);

  const run = async (dry) => {
    setBusy(true);
    try {
      const token = pb.authStore.token;
      const res = await fetch(`${API_SERVER_URL}/admin/digest/weekly${dry ? '?dry=1' : ''}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLast(data);
      toast({
        title: dry ? 'Digest preview ready' : 'Digest sent',
        description: dry
          ? `${data.eventCount ?? 0} events this week.`
          : `Emailed to ${data.sent ?? 0} of ${data.total ?? 0} users${data.failed ? ` (${data.failed} failed)` : ''}.`,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Digest failed', description: err?.message || 'Please try again.' });
    } finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-[10px] p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]"><Mail className="h-4 w-4 text-[#d4af37]" /> Sunday Email Digest</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">
        Summarizes the coming week's economic calendar and emails every user on Sundays at the configured hour (UTC).
        Enable it with the toggle above, then install the server cron once via <span className="font-mono text-[#d4af37]">bash deploy/digest-cron.sh</span> on the VPS.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => run(true)} className="flex items-center gap-2 rounded-[10px] border border-[#d4af37]/25 px-4 py-2.5 text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-60">
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button disabled={busy} onClick={() => run(false)} className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-bold text-[#0a0a0f] transition hover:brightness-105 disabled:opacity-60">
          <Mail className="h-4 w-4" /> {busy ? 'Sending…' : 'Send now'}
        </button>
      </div>
      {last && (
        <div className="mt-4 rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] p-3 text-xs text-[#c9c4b4]">
          {last.subject && <p className="font-semibold text-[#f0ecdd]">{last.subject}</p>}
          {last.summary && <p className="mt-1 whitespace-pre-line leading-relaxed">{last.summary}</p>}
          {last.sent !== undefined && <p className="mt-1 text-[#8a8577]">Sent {last.sent}/{last.total} · {last.eventCount ?? 0} events</p>}
        </div>
      )}
    </div>
  );
}

/* ─── ADMIN EMPLOYEES ──────────────────────────────────────────── */
export function AdminEmployees() {
  const { toast } = useToast();
  const { users } = useUsers();
  const [roster, setRoster] = useState([]);
  const [history, setHistory] = useState({});
  const [aiWork, setAiWork] = useState([]);
  const [loading, setLoading] = useState(true);

  const call = async (path) => {
    const res = await fetch(`${API_SERVER_URL}/admin/jobs${path}`, {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Independent loads: payroll, postings, and history settle on their
      // own — one failure shows its section empty with a toast, never a
      // blank page with no explanation.
      const [r, p, h] = await Promise.allSettled([
        call('/payroll').catch(() => []),
        call('/postings').catch(() => []),
        fetch(`${API_SERVER_URL}/admin/jobs/payroll/history`, { headers: { Authorization: `Bearer ${pb.authStore.token}` } }).then((x) => (x.ok ? x.json() : [])).catch(() => []),
      ]);
      if (r.status === 'fulfilled') setRoster(Array.isArray(r.value) ? r.value : []);
      else { setRoster([]); toast({ variant: 'destructive', title: 'Staff roster failed to load', description: String(r.reason?.message || r.reason) }); }
      const posts = p.status === 'fulfilled' ? p.value : [];
      if (p.status === 'rejected') toast({ variant: 'destructive', title: 'Postings failed to load', description: String(p.reason?.message || p.reason) });
      setAiWork((Array.isArray(posts) ? posts : []).filter((x) => /ai-executed/i.test(x.title || '')));
      const hist = h.status === 'fulfilled' ? h.value : [];
      const byOwner = {};
      for (const row of Array.isArray(hist) ? hist : []) byOwner[row.owner] = row;
      setHistory(byOwner);
    } catch (e) {
      setRoster([]);
      setAiWork([]);
      setHistory({});
      toast({ variant: 'destructive', title: 'Employees failed to load', description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const emailToId = useMemo(() => {
    const m = {};
    for (const u of users || []) if (u.email) m[String(u.email).toLowerCase()] = u.id;
    return m;
  }, [users]);
  // Founder first, then VP, then everyone else by hire date.
  const rankOf = (r) => {
    const t = String(r.title || '');
    if (/founder|chief executive/i.test(t)) return 0;
    if (/vice president/i.test(t)) return 1;
    return 2;
  };
  const orderedRoster = useMemo(() => [...roster].sort((a, b) => {
    const d = rankOf(a) - rankOf(b);
    if (d !== 0) return d;
    return String(a.hiredAt || '') < String(b.hiredAt || '') ? -1 : 1;
  }), [roster]);
  const histFor = (email) => history[emailToId[String(email || '').toLowerCase()]] || null;
  const totalPaidAll = roster.reduce((n, r) => { const h = histFor(r.email); return n + (h ? Number(h.totalPaidTbc) || 0 : 0); }, 0);

  return (
    <AdminLayout title="Employees">
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Employed Staff" value={roster.length.toLocaleString()} sub="Hired via Jobs & Hiring" color="#10b981" />
        <Stat icon={Wallet} label="Monthly platform credits" value={`${roster.reduce((n, r) => n + (String(r.salary_freq) === 'monthly' ? Number(r.salary_tbc) || 0 : 0), 0).toLocaleString()} credits`} sub="Existing off-chain credits · not token" color="#d4af37" />
        <Stat icon={DollarSign} label="Credits allocated" value={`${Math.round(totalPaidAll).toLocaleString()} credits`} sub="All allocation runs, all time" color="#10b981" />
        <Stat icon={Bot} label="AI Work Records" value={aiWork.length.toLocaleString()} sub="$0 · never payroll" color="#38bdf8" />
      </div>
      <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><Users className="h-4 w-4 text-[#d4af37]" /> Employed staff</h3>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/staff-id-cards"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d4af37]/30 px-3 py-2 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10"
            >
              <Printer className="h-4 w-4" /> Print ID cards
            </Link>
            <button onClick={load} className="rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        {loading ? <p className="text-sm text-[#8a8577]">Loading…</p> : roster.length ? (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Contract credit</th>
                  <th className="pb-2 font-medium">Hired</th>
                  <th className="pb-2 font-medium">Last allocated</th>
                  <th className="pb-2 font-medium">Total credits</th>
                  <th className="pb-2 font-medium text-right">Runs</th>
                </tr>
              </thead>
              <tbody>
                {orderedRoster.map((r) => {
                  const h = histFor(r.email);
                  return (
                    <tr key={r.appId || r.email} className="border-b border-white/5">
                      <td className="py-2.5">
                        <div className="font-semibold text-[#f0ecdd]">{r.name || 'Staff member'}</div>
                        <div className="font-mono text-[11px] text-[#6a665a]">{r.email}</div>
                      </td>
                      <td className="py-2.5 text-[#c9c4b4]">{r.title || 'Opening'}</td>
                      <td className="py-2.5 font-mono text-xs text-[#d4af37]">{Number(r.salary_tbc) > 0 ? `${r.salary_tbc} credits/${r.salary_freq === 'weekly' ? 'wk' : 'mo'}` : '—'}</td>
                      <td className="py-2.5 font-mono text-xs text-[#8a8577]">{r.hiredAt ? String(r.hiredAt).slice(0, 10) : '—'}</td>
                      <td className="py-2.5 font-mono text-xs text-[#8a8577]">{h?.lastPaidAt ? String(h.lastPaidAt).slice(0, 10) : 'Never'}</td>
                      <td className="py-2.5 font-mono text-xs text-[#f0ecdd]">{h ? `${Math.round(Number(h.totalPaidTbc) || 0).toLocaleString()} credits` : '0 credits'}</td>
                      <td className="py-2.5 text-right font-mono text-xs text-[#8a8577]">{h?.runs ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[#8a8577]">No hired staff yet. Hire from an application in Jobs &amp; Hiring and they appear here.</p>}
      </div>
      <Collapse title="AI-executed work log" sub="$0 · never employment, never payroll" count={aiWork.length} defaultOpen={false}>
        {aiWork.length ? (
          <div className="space-y-2">
            {aiWork.map((w) => (
              <div key={w.id} className="rounded-[10px] border border-[#38bdf8]/20 bg-[#0f0f14] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[#f0ecdd]">{w.title}</div>
                  <span className="rounded-md bg-[#38bdf8]/10 px-2 py-0.5 font-mono text-[10px] text-[#38bdf8]">{w.status} · $0</span>
                </div>
                {w.description && <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{w.description}</p>}
                <div className="mt-1 font-mono text-[11px] text-[#6a665a]">{w.department || 'Engineering'} · {String(w.created || '').slice(0, 10)}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#8a8577]">No AI work records yet.</p>}
      </Collapse>
    </AdminLayout>
  );
}

/* ─── ADMIN MENTORS ──────────────────────────────────────────────── */
export function AdminMentors() {
  const { toast } = useToast();
  const [mentors, setMentors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = pb.authStore.token;
      const [m, s] = await Promise.all([
        fetch(`${API_SERVER_URL}/admin/mentors`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_SERVER_URL}/admin/mentors/sessions`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setMentors(Array.isArray(m) ? m : []);
      setSessions(Array.isArray(s) ? s : []);
    } catch {
      setMentors([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (m) => {
    setBusy(m.owner);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/mentors/${encodeURIComponent(m.owner)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !m.enabled }),
      });
      if (!res.ok) throw new Error('update failed');
      toast({ title: m.enabled ? 'Mentor hidden' : 'Mentor published' });
      load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: String(err.message || err) });
    } finally {
      setBusy(null);
    }
  };

  const shown = mentors.filter((m) => !q || `${m.owner} ${m.headline} ${(m.topics || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const booked = sessions.filter((s) => s.status === 'booked').length;

  return (
    <AdminLayout title="Mentors">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Mentors', mentors.length],
          ['Published', mentors.filter((m) => m.enabled).length],
          ['Sessions', sessions.length],
          ['Booked', booked],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{value}</div>
          </div>
        ))}
      </div>
      <div className="glass mt-4 rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-[#f0ecdd]"><GraduationCap className="h-4 w-4 text-[#d4af37]" /> Mentor directory</h3>
          <div className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mentors…" className="w-48 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
            <button onClick={load} className="rounded-xl border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        {loading ? <p className="text-sm text-[#8a8577]">Loading…</p> : shown.length ? (
          <div className="space-y-2">
            {shown.map((m) => (
              <div key={m.owner} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#f0ecdd]">{m.headline || 'Untitled mentor'}</div>
                  <div className="mt-0.5 truncate font-mono text-xs text-[#8a8577]">{String(m.owner).slice(0, 8)}… · {(m.topics || []).join(', ') || 'no topics'} · ${m.price_usd ?? 0}</div>
                </div>
                <button disabled={busy === m.owner} onClick={() => toggle(m)} className={`rounded-lg border px-3 py-1.5 text-xs ${m.enabled ? 'border-emerald-500/40 text-emerald-300' : 'border-[#d4af37]/30 text-[#d4af37]'} disabled:opacity-60`}>
                  {m.enabled ? 'Published — hide' : 'Hidden — publish'}
                </button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#8a8577]">No mentors yet. New coaches appear here after they register on /app/mentors; staff hires are staged from Jobs &amp; Hiring.</p>}
      </div>
      <Collapse title="Recent sessions" count={sessions.length} defaultOpen={false}>
        {sessions.length ? (
          <div className="space-y-2">
            {sessions.slice(0, 25).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2 text-sm">
                <div className="min-w-0 truncate text-[#c9c4b4]">{s.topic || 'Session'} · <span className="font-mono text-xs tabular-nums text-[#8a8577]">{s.scheduled_for ? String(s.scheduled_for).slice(0, 16).replace('T', ' ') : 'unscheduled'}</span></div>
                <div className="font-mono text-xs tabular-nums text-[#d4af37]">${s.price_usd ?? 0} · {s.status}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#8a8577]">No sessions booked yet.</p>}
      </Collapse>
    </AdminLayout>
  );
}

/* ─── ADMIN WALLET ───────────────────────────────────────────────── */
export function AdminWallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = pb.authStore.token;
      const res = await fetch(`${API_SERVER_URL}/admin/wallet/overview`, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.ok ? await res.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <AdminLayout title="Wallet & Staking">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Tracked wallets', data?.trackedWallets ?? '—'],
          ['Rails onboarded', data?.railsOnboarded ?? '—'],
          ['KYC verified', data?.kycVerified ?? '—'],
          ['Crypto accounts', data?.cryptoAccounts ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-[#8a8577]">{label}</div>
            <div className="mt-1 font-mono text-xl font-bold text-[#f0ecdd]">{value}</div>
          </div>
        ))}
      </div>
      <Collapse title="Recent money movement" sub="Read-only oversight" count={data?.recentTransactions?.length ?? 0} defaultOpen={false}>
        <div className="mb-3 flex justify-end">
          <button onClick={load} className="rounded-[10px] border border-[#d4af37]/25 px-3 py-2 text-sm text-[#d4af37]"><RefreshCw className="h-4 w-4" /></button>
        </div>
        {loading ? <p className="text-sm text-[#8a8577]">Loading…</p> : data?.recentTransactions?.length ? (
          <div className="space-y-2">
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#d4af37]/10 bg-[#0f0f14] px-3 py-2 text-sm">
                <div className="min-w-0 truncate text-[#c9c4b4]">{t.kind || 'transfer'} · <span className="font-mono text-xs tabular-nums text-[#8a8577]">{t.reference || String(t.id).slice(0, 8)}</span></div>
                <div className="font-mono text-xs tabular-nums text-[#d4af37]">{t.amount} {String(t.currency || 'USD').toUpperCase()} · {t.status}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#8a8577]">No transactions yet. Withdrawal approvals live under Billing &amp; Revenue; per-user funding detail under User Management.</p>}
        <p className="mt-3 text-xs text-[#6a665a]">Read-only oversight — value movement stays in user-scoped wallet routes and billing refunds.</p>
      </Collapse>
    </AdminLayout>
  );
}

/* ─── ADMIN SETTINGS ─────────────────────────────────────────────── */
export function AdminSettings() {
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [settingsId, setSettingsId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [settings, setSettings] = useState({
    platformName: 'TradingBible',
    tagline: 'TradingBible',
    supportEmail: 'support@tradingbible.app',
    trialDays: 0,
    signupsOpen: true,
    maintenance: false,
    twoFARequired: false,
    emailVerification: true,
    enforceBrokerSync: true,
    allowManualPropAccounts: false,
    digestEnabled: false,
    digestHourUTC: 18,
    planGates: { reports: 'elite', coach: 'elite', apiDocs: 'professional', branding: 'professional', apiKeys: 'professional' },
  });
  const [features, setFeatures] = useState({
    aiCoach: true,
    academy: true,
    community: true,
    economicCalendar: true,
    riskTools: true,
    chartBuilder: true,
    signals: true,
    wallet: true,
  });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const existing = await pb.collection('admin_platform_settings').getFirstListItem('key = "default"');
        if (!live) return;
        setSettingsId(existing.id);
        if (existing.settings) setSettings((prev) => ({ ...prev, ...existing.settings }));
        if (existing.features) setFeatures((prev) => ({ ...prev, ...existing.features }));
      } catch (err) {
        if (String(err?.message || '').includes('No matching record found')) {
          if (live) setSettingsId(null);
        } else if (live) {
          toast({ variant: 'destructive', title: 'Failed to load admin settings', description: err?.message || 'Please refresh.' });
        }
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => { live = false; };
  }, [toast]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        if (settingsId) {
          await pb.collection('admin_platform_settings').update(settingsId, { key: 'default', settings, features });
        } else {
          const created = await pb.collection('admin_platform_settings').create({ key: 'default', settings, features });
          setSettingsId(created.id);
        }
        setSaveState('saved');
        notifyPlatformSettingsChanged();
      } catch (err) {
        setSaveState('error');
        toast({ variant: 'destructive', title: 'Autosave failed', description: err?.message || 'Please try again.' });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [settings, features, settingsId, loaded, toast]);

  const save = (e) => { e?.preventDefault(); toast({ title: 'Settings saved', description: 'Configuration updated successfully.' }); };

  const TABS = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'features', label: 'Features', icon: ToggleRight },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <AdminLayout title="System Settings">
      <div className="at-page at-scope at-enter pb-10">
      <AtTabs tabs={TABS} active={tab} onChange={setTab} className="mb-6 w-fit max-w-full" />

      {tab === 'general' && (
        <form onSubmit={save} className="grid items-start gap-4 xl:grid-cols-2">
          <div className="glass rounded-[10px] p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Identity</h3>
            <p className="mb-4 mt-1 text-xs text-[#8a8577]">Name, contact and schedule.</p>
            <div className="space-y-3">
            {[['platformName', 'Platform Name', 'text'], ['tagline', 'Tagline', 'text'], ['supportEmail', 'Support Email', 'email'], ['digestHourUTC', 'Weekly Digest Hour (UTC, Sundays)', 'number']].map(([k, l, t]) => (
              <div key={k}>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#8a8577]">{l}</label>
                <input type={t} value={settings[k]} onChange={e => setSettings({ ...settings, [k]: t === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 text-sm tabular-nums text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
              </div>
            ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-[10px] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Access & automation</h3>
                <span className="font-mono text-[10px] tabular-nums text-[#8a8577]">
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Save failed' : 'Autosave on'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[['signupsOpen', 'Allow new sign-ups'], ['maintenance', 'Maintenance mode'], ['emailVerification', 'Require email verification'], ['enforceBrokerSync', 'Broker-sync-only trades'], ['allowManualPropAccounts', 'Manual prop accounts'], ['digestEnabled', 'Sunday email digest']].map(([k, l]) => (
                <label key={k} className="flex items-center justify-between gap-2 rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 cursor-pointer">
                  <span className="text-[13px] text-[#c9c4b4]">{l}</span>
                  <input type="checkbox" checked={settings[k]} onChange={e => setSettings({ ...settings, [k]: e.target.checked })} className="h-5 w-5 shrink-0 accent-[#d4af37]" />
                </label>
              ))}
              </div>
              <button className="mt-3 flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-bold text-[#0a0a0f] hover:brightness-105"><Save className="h-4 w-4" /> Save Settings</button>
            </div>
            <DigestPanel />
          </div>
        </form>
      )}

      {tab === 'features' && (
        <div className="glass max-w-3xl rounded-[10px] p-4 sm:p-5">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd] mb-4">Feature Toggles</h3>
          <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(features).map(([k, v]) => {
            const labels = { aiCoach: 'SI Coach', academy: 'Academy', community: 'Community', economicCalendar: 'Economic Calendar', riskTools: 'Risk Tools', chartBuilder: 'Chart Builder', signals: 'Trading Signals', wallet: 'Wallet & Banking' };
            return (
              <label key={k} className="flex items-center justify-between rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 cursor-pointer hover:border-[#d4af37]/25 transition-colors">
                <div>
                  <div className="text-sm text-[#c9c4b4]">{labels[k] || k}</div>
                  <div className="text-xs text-[#6a665a]">{v ? 'Enabled — visible to users' : 'Disabled — hidden from navigation'}</div>
                </div>
                <div onClick={() => setFeatures(p => ({ ...p, [k]: !p[k] }))}
                  className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ml-4 shrink-0 ${v ? 'bg-[#d4af37]' : 'bg-white/12'}`}>
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${v ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            );
          })}
          </div>
          <button onClick={() => toast({ title: 'Feature settings saved' })} className="mt-3 flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-bold text-[#0a0a0f] hover:brightness-105"><Save className="h-4 w-4" /> Save</button>
        </div>
      )}

      {tab === 'features' && (
        <div className="glass mt-4 max-w-3xl rounded-[10px] p-4 sm:p-5 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd] mb-1">Plan Gates</h3>
          <p className="text-xs text-[#8a8577] -mt-2">Minimum plan required per premium page. Takes effect on next page view — no deploy needed.</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            ['reports', 'Reports & Analytics (/app/reports)'],
            ['coach', 'SI Coach (/app/coach)'],
            ['apiDocs', 'API Docs (/app/api-docs)'],
            ['branding', 'White-label Branding (/app/branding)'],
            ['apiKeys', 'API Keys (/app/api-keys)'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5">
              <span className="truncate text-[13px] text-[#c9c4b4]">{label}</span>
              <select
                value={settings.planGates?.[k] || 'elite'}
                onChange={(e) => setSettings((p) => ({ ...p, planGates: { ...(p.planGates || {}), [k]: e.target.value } }))}
                className="shrink-0 rounded-lg border border-[#d4af37]/25 bg-[#0f0f14] px-2 py-2 text-[13px] text-[#f0ecdd] outline-none"
              >
                <option value="pro" className="bg-[#0f0f14]">Pro and up</option>
                <option value="elite" className="bg-[#0f0f14]">Elite and up</option>
                <option value="professional" className="bg-[#0f0f14]">Professional only</option>
              </select>
            </label>
          ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="glass max-w-3xl rounded-[10px] p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#f0ecdd]">Security Settings</h3>
          {[['twoFARequired', 'Require 2FA for all users', 'Forces two-factor authentication on every account'],
            ['emailVerification', 'Enforce email verification', 'Users cannot trade until email is verified']].map(([k, l, d]) => (
            <label key={k} className="flex items-start justify-between gap-4 rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5 cursor-pointer">
              <div>
                <div className="text-sm text-[#c9c4b4]">{l}</div>
                <div className="text-xs text-[#6a665a] mt-0.5">{d}</div>
              </div>
              <input type="checkbox" checked={settings[k]} onChange={e => setSettings({ ...settings, [k]: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#d4af37] shrink-0" />
            </label>
          ))}
          <div className="rounded-[10px] border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#c9c4b4]">Session Timeout</span>
              <select className="bg-transparent text-sm text-[#e9e7df] outline-none">
                <option>7 days</option><option>30 days</option><option>90 days</option>
              </select>
            </div>
          </div>
          <button onClick={() => toast({ title: 'Security settings saved' })} className="flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-bold text-[#0a0a0f] hover:brightness-105"><Save className="h-4 w-4" /> Save</button>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

// ── Company Bible design system ─────────────────────────────────
// Config-driven detail renderers: every section gets an icon, blurb and
// field controls typed by content (text / textarea / code / email / url),
// plus live visual previews (swatches, plan cards, timeline, TB-vs-TBC).
const COMPANY_SECTIONS_UI = [
  { id: 'identity', label: 'Identity', icon: Fingerprint, blurb: 'Name, mission, vision, voice — who TradingBible is and how it speaks.' },
  { id: 'legal', label: 'Legal & Entity', icon: Landmark, blurb: 'Delaware LLC reality: formation, agent, DUNS, licence limits, liability.' },
  { id: 'holdings', label: 'Holdings · TB / TBC', icon: Building2, blurb: 'Proposed parent, requested ticker, and the binding TB ≠ TBC distinction.' },
  { id: 'brand', label: 'Brand System', icon: Palette, blurb: 'Colors, logo, typography, email shell, socials — the full look.' },
  { id: 'contacts', label: 'Contacts', icon: Mail, blurb: 'Website and every official inbox.' },
  { id: 'leadership', label: 'Leadership', icon: Users, blurb: 'Founder, VP, quant, team profile, adviser stance.' },
  { id: 'markets', label: 'Markets & MT5', icon: BarChart3, blurb: 'Coverage, data feeds, MT5 bridge endpoints, liquidity doctrine.' },
  { id: 'product', label: 'Product & Stack', icon: Cpu, blurb: 'Live version, tech stack, every surface, terminal IP, auth.' },
  { id: 'monetization', label: 'Money', icon: Wallet, blurb: 'Plans, revenue lines, traction truth, payout rails.' },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck, blurb: 'KYC, fund segregation, SEC/NGX filings, readiness costs.' },
  { id: 'roadmap', label: 'Roadmap', icon: Rocket, blurb: 'Phases to IPO, first-90-day plan, end-state strategy.' },
];

const prettyLabel = (k) => String(k || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function fieldKind(sectionId, key, value) {
  const v = String(value ?? '');
  if (/mt5|bridge|endpoint|POST |GET \/v1/i.test(v) || sectionId === 'markets' && key === 'mt5') return 'code';
  if (v.includes('@') && /email|support|legal|privacy|ads|contact/i.test(key)) return 'email';
  if (/url|website|twitter|discord|github|socials/i.test(key) || /^https?:\/\//i.test(v.trim())) return 'url';
  if (v.length > 140) return 'textarea';
  return 'text';
}

function hexesOf(value) {
  return String(value || '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
}

function filledCount(obj) {
  return Object.values(obj || {}).filter((v) => String(v ?? '').trim() !== '').length;
}

function openHref(kind, value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (kind === 'email') return `mailto:${v.split(/\s|,/)[0]}`;
  const m = v.match(/https?:\/\/[^\s,)]+/i) || v.match(/[\w-]+\.[\w.-]+(\/\S*)?/);
  if (m) { const u = m[0]; return /^https?:\/\//i.test(u) ? u : `https://${u}`; }
  return null;
}

// ── Company Bible (admin-only, A–Z, nothing hidden) ──────────────
// Every company/brand fact in one editable page: identity, legal,
// holdings TB/TBC, brand, contacts, leadership, markets/MT5, product,
// money, compliance, roadmap. Stored via PUT /admin/company (row
// `company:profile` in admin_integrations), autosaved like Settings.
export function AdminCompany() {
  const { toast } = useToast();
  const [tab, setTab] = useState('identity');
  // Always render from defaults immediately — server truth merges over on
  // load. The page never sticks on "Loading…" when offline/unauthorized.
  const freshDefaults = () => {
    const f = {};
    for (const k of Object.keys(COMPANY_DEFAULTS)) f[k] = { ...COMPANY_DEFAULTS[k] };
    return f;
  };
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('tb:company-profile:v1');
      if (raw) {
        const cached = JSON.parse(raw);
        const merged = freshDefaults();
        for (const k of Object.keys(merged)) merged[k] = { ...merged[k], ...(cached[k] || {}) };
        return merged;
      }
    } catch { /* ignore */ }
    return freshDefaults();
  });
  const [stored, setStored] = useState(false);
  const [source, setSource] = useState('defaults');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      const result = await loadCompanyProfile();
      if (!live) return;
      setProfile(result.profile);
      setStored(result.stored);
      setSource(result.source);
      setLoadError(result.error);
      setLoaded(true);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave only after the admin actually edits (dirty flag) — never a
  // blind write-back on page open. 900ms debounce like Settings.
  const dirty = useRef(false);
  useEffect(() => {
    if (!loaded || !dirty.current || !profile) return;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      try {
        const result = await saveCompanyProfile(profile);
        setStored(true);
        setSource(result.source);
        setLoadError(result.source === 'direct' ? 'Saved direct to database (API unreachable) ✓' : '');
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
        toast({ variant: 'destructive', title: 'Company save failed', description: e?.message || 'Please try again.' });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [profile, loaded, toast]);

  const TABS = [
    { id: 'identity', label: 'Identity' },
    { id: 'legal', label: 'Legal' },
    { id: 'holdings', label: 'Holdings TB/TBC' },
    { id: 'brand', label: 'Brand' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'markets', label: 'Markets & MT5' },
    { id: 'product', label: 'Product' },
    { id: 'monetization', label: 'Money' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'roadmap', label: 'Roadmap' },
  ];

  const setField = (section, key, value) => {
    dirty.current = true;
    setSaveState('idle');
    setProfile((p) => ({ ...p, [section]: { ...(p?.[section] || {}), [key]: value } }));
  };

  // Esc dismisses the reset dialog.
  useEffect(() => {
    if (!confirmReset) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setConfirmReset(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmReset]);

  if (!profile) {
    return (
      <AdminLayout title="Company Bible">
        <p className="py-10 text-center text-sm text-[#8a8577]">Preparing company bible…</p>
      </AdminLayout>
    );
  }

  const needle = q.trim().toLowerCase();
  const totals = COMPANY_SECTIONS_UI.reduce((s, sec) => {
    const keys = Object.keys(profile[sec.id] || {});
    s.fields += keys.length;
    s.filled += filledCount(profile[sec.id]);
    return s;
  }, { fields: 0, filled: 0 });
  const totalPct = totals.fields ? Math.round((totals.filled / totals.fields) * 100) : 0;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tradingbible-company-bible.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildContextText(profile));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Clipboard blocked — select the SI brief manually.' });
    }
  };

  const resetSection = (id) => setConfirmReset(id);

  const doResetSection = () => {
    if (!confirmReset) return;
    dirty.current = true;
    setSaveState('idle');
    setProfile((p) => ({ ...p, [confirmReset]: { ...COMPANY_DEFAULTS[confirmReset] } }));
    setConfirmReset(null);
  };

  const jumpTo = (secId, key) => {
    setTab(secId);
    setTimeout(() => {
      document.getElementById(`cb-field-${secId}-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const secMeta = COMPANY_SECTIONS_UI.find((s) => s.id === tab) || COMPANY_SECTIONS_UI[0];
  const SecIcon = secMeta.icon;
  const secKeys = Object.keys(profile[tab] || {});
  const secFilled = filledCount(profile[tab]);
  const holdings = profile.holdings || {};

  const searchHits = (() => {
    if (!needle) return null;
    const hits = [];
    for (const sec of COMPANY_SECTIONS_UI) {
      for (const [k, v] of Object.entries(profile[sec.id] || {})) {
        if (`${sec.label} ${k} ${v}`.toLowerCase().includes(needle)) hits.push({ sec: sec.id, label: sec.label, key: k, value: String(v) });
      }
    }
    return hits.slice(0, 80);
  })();

  const renderField = (secId, k, v) => {
    const kind = fieldKind(secId, k, v);
    const match = needle && `${k} ${v}`.toLowerCase().includes(needle);
    const href = kind === 'email' || kind === 'url' ? openHref(kind, v) : null;
    const swatches = kind !== 'code' ? hexesOf(v) : [];
    const base = 'at-input';
    return (
      <div key={k} id={`cb-field-${secId}-${k}`} className={`scroll-mt-32 rounded-xl border p-3.5 transition ${match ? 'border-[var(--at-line-strong)] bg-[var(--at-gold-soft)]' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] hover:border-[var(--at-line)]'}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--at-ink-2)]">{prettyLabel(k)}</label>
          <span className="at-chip at-chip--plain !min-h-0 !py-1">{kind}</span>
          {String(v ?? '').trim() === '' && <AtBadge tone="red">empty</AtBadge>}
          {href && (
            <a href={href} target={kind === 'url' ? '_blank' : undefined} rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--at-gold)] hover:underline">
              {kind === 'email' ? 'Send mail' : 'Open link'} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <span className="ml-auto font-mono text-[9px] text-[var(--at-mut-2)]">{String(v ?? '').length} chars</span>
        </div>
        {kind === 'text' || kind === 'email' || kind === 'url' ? (
          <input value={String(v ?? '')} onChange={(e) => setField(secId, k, e.target.value)} className={base} />
        ) : (
          <textarea value={String(v ?? '')} onChange={(e) => setField(secId, k, e.target.value)}
            rows={kind === 'code' ? 5 : String(v || '').length > 300 ? 5 : 3}
            spellCheck={false}
            className={`${base} at-textarea ${kind === 'code' ? 'font-mono !text-[var(--at-gold-bright)]' : ''}`} />
        )}
        {swatches.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {swatches.map((hex, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--at-line-soft)] bg-[var(--at-soft)] py-0.5 pl-0.5 pr-2.5">
                <span className="h-5 w-5 rounded-full border border-[var(--at-line-soft)]" style={{ background: hex }} />
                <span className="font-mono text-[9px] text-[var(--at-ink-2)]">{hex}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout title="Company Bible">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          actions={(
            <>
              <AtButton onClick={copyBrief} variant="gold" icon={copied ? Check : Copy}>{copied ? 'Copied' : 'Copy SI brief'}</AtButton>
              <AtButton onClick={exportJSON} variant="outline" icon={Download}>Export JSON</AtButton>
            </>
          )}
        >
          <div className="at-pagebar-extra flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--at-gold)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search everything A–Z — TB, TBC, DUNS, MT5, Nasdaq, support@…"
                className="at-input !pl-9 !bg-transparent"
              />
              {q && <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--at-mut)] hover:text-[var(--at-ink)]">Clear</button>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <AtBadge tone={saveState === 'error' ? 'red' : saveState === 'saving' ? 'gold' : 'green'}>{saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Save failed' : 'Autosaved'}</AtBadge>
              <AtBadge tone={loaded ? 'green' : 'amber'}>{!loaded ? 'Loading' : loadError ? loadError : 'Live record'}</AtBadge>
            </div>
          </div>
        </AtPageBar>

        {searchHits ? (
          <AtPanel
            className="mt-5"
            title={`${searchHits.length} match${searchHits.length === 1 ? '' : 'es'} for “${q}”`}
            sub="Jump straight to the field, then edit in place."
            action={<AtButton onClick={() => setQ('')} variant="quiet" size="sm">Clear search</AtButton>}
          >
            <div className="grid gap-2 md:grid-cols-2">
              {searchHits.map((h, i) => (
                <button key={i} onClick={() => jumpTo(h.sec, h.key)} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 text-left transition hover:border-[var(--at-line-strong)] hover:bg-[var(--at-gold-soft)]">
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">{h.label} · {prettyLabel(h.key)}</div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--at-ink-2)]">{h.value}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--at-mut)]">Jump to field <ExternalLink className="h-2.5 w-2.5" /></span>
                </button>
              ))}
            </div>
            {searchHits.length === 0 && <p className="py-4 text-center text-xs text-[var(--at-mut)]">Nothing matches. Clear the search to browse sections.</p>}
          </AtPanel>
        ) : (
          <div className="mt-5 grid items-start gap-4 xl:grid-cols-[264px_minmax(0,1fr)]">
            <aside className="xl:sticky xl:top-[92px]">
              <div className="grid grid-cols-2 gap-1.5 pb-1 sm:grid-cols-3 xl:grid-cols-1">
                {COMPANY_SECTIONS_UI.map((sec) => {
                  const active = tab === sec.id;
                  const n = Object.keys(profile[sec.id] || {}).length;
                  const f = filledCount(profile[sec.id]);
                  const Icon = sec.icon;
                  const pct = n ? Math.round((f / n) * 100) : 0;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setTab(sec.id)}
                      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-[var(--at-line-strong)] bg-[var(--at-gold-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] hover:border-[var(--at-line)]'}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${active ? 'border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[var(--at-mut)]'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[12px] font-semibold ${active ? 'text-[var(--at-ink)]' : 'text-[var(--at-ink-2)]'}`}>{sec.label}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-[var(--at-soft-2)]"><span className="block h-full rounded-full bg-[var(--at-gold)]" style={{ width: `${pct}%` }} /></span>
                          <span className="font-mono text-[8px] text-[var(--at-mut-2)]">{f}/{n}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <AtPanel className="mt-3 hidden xl:block" eyebrow="SI context" title="SI reads this record" sub="The same fields power every assistant answer about the company.">
                <p className="line-clamp-5 whitespace-pre-wrap font-mono text-[9px] leading-relaxed text-[var(--at-mut)]">{buildContextText(profile).slice(0, 220)}…</p>
                <AtButton onClick={copyBrief} variant="outline" size="sm" icon={copied ? Check : Copy} className="mt-3 w-full">{copied ? 'Copied' : 'Copy full brief'}</AtButton>
              </AtPanel>
            </aside>

            <div className="min-w-0">
              <AtPanel className="min-w-0" bodyClassName="!p-0">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]">
                        <SecIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="at-section-title">{secMeta.label}</h2>
                        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--at-mut)]">{secMeta.blurb}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <AtBadge tone={secFilled === secKeys.length ? 'green' : 'gold'}>{secFilled}/{secKeys.length} filled</AtBadge>
                      <AtButton onClick={() => resetSection(tab)} variant="quiet" size="sm" icon={RotateCcw}>Reset</AtButton>
                    </div>
                  </div>
                  <AtProgress className="mt-4" value={secKeys.length ? Math.round((secFilled / secKeys.length) * 100) : 0} />

                  {tab === 'holdings' && (
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--at-line-strong)] bg-[var(--at-gold-soft)] p-4">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--at-gold)]">Stock · requested</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-[var(--at-ink)]">{holdings.ticker || 'TB'}</div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{holdings.tickerStatus || ''}</p>
                      </div>
                      <div className="rounded-xl border border-violet-400/25 bg-violet-400/[0.06] p-4">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--at-violet)]">Coin · proposed</div>
                        <div className="mt-1 font-mono text-2xl font-bold text-[var(--at-ink)]">{holdings.coin || 'TBC'}</div>
                        <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-[var(--at-mut)]">{holdings.coinStatus || ''}</p>
                      </div>
                    </div>
                  )}

                  {tab === 'monetization' && profile.monetization?.plans && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {String(profile.monetization.plans).split('·').map((p, i) => (
                        <AtBadge key={i} tone="gold">{p.trim()}</AtBadge>
                      ))}
                    </div>
                  )}

                  {tab === 'roadmap' && profile.roadmap?.phases && (
                    <ol className="mt-4 space-y-0">
                      {String(profile.roadmap.phases).split('→').map((p, i, arr) => (
                        <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                          {i < arr.length - 1 && <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-1.4rem)] w-px bg-[var(--at-line)]" />}
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--at-line-strong)] bg-[var(--at-gold-soft)] font-mono text-[9px] font-bold text-[var(--at-gold)]">{String(i + 1).padStart(2, '0')}</span>
                          <p className="pt-1 text-[11px] leading-relaxed text-[var(--at-ink-2)]">{p.trim()}</p>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-5 space-y-3">
                    {secKeys.map((k) => renderField(tab, k, profile[tab]?.[k]))}
                  </div>

                  <p className="mt-4 border-t border-[var(--at-line-soft)] pt-3 text-[10px] leading-relaxed text-[var(--at-mut)]">
                    Stored in <span className="font-mono text-[var(--at-gold)]">admin_integrations · key company:profile</span>. The widget, this page and SI read the same row. Autosave runs 900ms after typing stops.
                  </p>
                </div>
              </AtPanel>
            </div>
          </div>
        )}
      </div>

      {confirmReset && (
        <div className="at-scope fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`Reset ${confirmReset}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmReset(null)} />
          <div className="at-card relative w-full max-w-sm overflow-hidden p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--at-red)]/30 bg-[var(--at-red)]/10 text-[var(--at-red)]">
                <RotateCcw className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[var(--at-ink)]">Reset “{confirmReset}”?</h4>
                <p className="text-[10px] text-[var(--at-mut)]">{Object.keys(profile[confirmReset] || {}).length} fields return to bundled defaults</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--at-mut)]">
              Your edits in this section will be replaced and saved immediately. Every other section stays untouched.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <AtButton onClick={() => setConfirmReset(null)} variant="quiet">Keep my edits</AtButton>
              <AtButton onClick={doResetSection} variant="danger">Reset section</AtButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
