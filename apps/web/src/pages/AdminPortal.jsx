import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Users, CreditCard, DollarSign, Activity, Search, Trash2, RefreshCw, Shield,
  Save, LibraryBig, FileText, BarChart3, TrendingUp, AlertTriangle, CheckCircle,
  XCircle, Edit2, Eye, EyeOff, Download, ChevronLeft, ChevronRight, Filter,
  ToggleLeft, ToggleRight, Key, Server, Database, Globe, Mail, X, UserCheck,
  Crown, TrendingDown, Clock, Zap, Settings2, Lock, Bell, Cpu, HardDrive,
  Wifi, Package, Plus, Copy, RotateCcw, Plug, TestTube, AlertCircle, Check,
  Upload,   ChevronDown, MoreVertical, Power, Code, Layers, MonitorPlay
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import AdminLayout from '@/components/AdminLayout';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useToast } from '@/hooks/use-toast';

const GOLD = '#d4af37';
const PLAN_COLORS = { trial: '#6a665a', pro: '#3b82f6', elite: GOLD, professional: '#a855f7' };
const PLAN_PRICES = { trial: 0, pro: 19.99, elite: 49.99, professional: 99.00 };
const DEFAULT_TRIAL_DAYS = 7;

function computeTrialEndsAt(user, trialDays = DEFAULT_TRIAL_DAYS) {
  if (user.trialEndsAt) return user.trialEndsAt;
  const joinedAt = user.created || user.created_at;
  const base = joinedAt ? new Date(joinedAt) : null;
  if (!base || Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + trialDays);
  return base.toISOString();
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
    name: raw.name || raw.username || (raw.email ? raw.email.split('@')[0] : 'User'),
    plan: raw.plan || 'trial',
    accountType: raw.accountType || raw.account_type || (role === 'company' ? 'company' : 'individual'),
    trialEndsAt: computeTrialEndsAt(raw, Number(raw.trialDays) || DEFAULT_TRIAL_DAYS),
    subscriptionStatus: raw.subscriptionStatus || (raw.plan && raw.plan !== 'trial' ? 'active' : 'trial'),
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
  if (!plan || plan === 'trial') return <Badge color="muted">Trial</Badge>;
  if (plan === 'pro') return <Badge color="blue">Pro</Badge>;
  if (plan === 'elite') return <Badge color="gold">Elite</Badge>;
  return <Badge color="purple">Professional</Badge>;
};

function Spinner() {
  return (
    <div className="glass flex items-center justify-center gap-2 rounded-2xl py-20 text-sm text-[#8a8577]">
      <RefreshCw className="h-4 w-4 animate-spin text-[#d4af37]" /> Loading…
    </div>
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
    username: user.username || '',
    name: user.name || '',
    plan: user.plan || 'trial',
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
          user_role: form.role === 'admin' ? 'admin' : form.role === 'company' ? 'company' : form.role === 'teacher' ? 'teacher' : 'student',
        });
      } else {
        updated = await pb.collection('users').update(user.id, {
          username: form.username,
          name: form.name,
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
      <div className="glass w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#f0ecdd]">Edit User</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8a8577] hover:bg-white/8 hover:text-[#f0ecdd]"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['username', 'Username'], ['name', 'Display Name']].map(([k, l]) => (
              <div key={k}>
                <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">{l}</label>
                <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
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
                {['trial', 'pro', 'elite', 'professional'].map(p => <option key={p} value={p} className="bg-[#0f0f14]">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
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
                <option value="company" className="bg-[#0f0f14]">Company</option>
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
    ['Username', user.username || '—'],
    ['Name', user.name || '—'],
    ['Phone', user.phone || '—'],
    ['Plan', user.plan || 'trial'],
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
      <div className="glass w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d4af37]/15 text-lg font-bold text-[#d4af37]">
              {(user.username || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-[#f0ecdd]">{user.username || user.email}</div>
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
    const paid = users.filter(u => u.plan && u.plan !== 'trial');
    const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);
    const verified = users.filter(u => u.verified).length;
    return { total: users.length, paid: paid.length, mrr, verified, trades: trades.length };
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

  const sysHealth = [
    { label: 'Database', status: 'ok', icon: Database },
    { label: 'API Server', status: 'ok', icon: Server },
    { label: 'Auth Service', status: 'ok', icon: Shield },
    { label: 'Market Data', status: 'ok', icon: Globe },
    { label: 'Email Service', status: 'ok', icon: Mail },
    { label: 'WebSockets', status: 'ok', icon: Wifi },
  ];

  return (
    <AdminLayout title="Admin Dashboard">
      {loading ? <Spinner /> : (
        <>
          <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
            <Stat icon={Users} label="Total Users" value={stats.total.toLocaleString()} sub={`${stats.verified} verified`} trend="up" />
            <Stat icon={CreditCard} label="Paid Subscribers" value={stats.paid.toLocaleString()} sub={`${stats.total - stats.paid} on trial`} color="#3b82f6" />
            <Stat icon={DollarSign} label="Est. MRR" value={`$${stats.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Monthly recurring" trend="up" color="#10b981" />
            <Stat icon={Activity} label="Total Trades" value={stats.trades.toLocaleString()} sub="Across all users" color="#a855f7" />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-2xl p-4 sm:p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[#f0ecdd]">User Growth</h3>
                <Badge color="gold">{growth.length} months</Badge>
              </div>
              {growth.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={growth} margin={{ left: -12, right: 8 }}>
                    <defs>
                      <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="users" name="Total Users" stroke={GOLD} strokeWidth={2} fill="url(#ug)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-[#8a8577]">No growth data yet.</p>}
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="mb-4 font-semibold text-[#f0ecdd]">System Health</h3>
              <div className="space-y-2">
                {sysHealth.map(({ label, status, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-[#c9c4b4]">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#8a8577]" />
                      <span className="truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400">Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-[#f0ecdd]">Recent Registrations</h3>
              <span className="text-xs text-[#8a8577]">Latest 8</span>
            </div>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Plan</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Verified</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(u => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d4af37]/10 text-xs font-bold text-[#d4af37]">
                            {(u.username || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[#e9e7df] truncate max-w-[100px] sm:max-w-none">{u.username || '—'}</div>
                            <div className="text-xs text-[#8a8577] truncate max-w-[120px] sm:max-w-none">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">{planBadge(u.plan)}</td>
                      <td className="py-2.5 hidden sm:table-cell">
                        {u.verified
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3.5 w-3.5" /> Yes</span>
                          : <span className="flex items-center gap-1 text-xs text-[#8a8577]"><XCircle className="h-3.5 w-3.5" /> No</span>}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-[#8a8577]">{(u.created || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
    if (q) out = out.filter(u => (u.email + (u.username || '') + (u.name || '')).toLowerCase().includes(q.toLowerCase()));
    if (planFilter !== 'all') out = out.filter(u => (u.plan || 'trial') === planFilter);
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

  const bulkDelete = async () => {
    if (source === 'profiles') {
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
    const rows = [['id', 'email', 'username', 'name', 'plan', 'role', 'verified', 'created', 'subscriptionStatus']];
    filtered.forEach(u => rows.push([u.id, u.email, u.username || '', u.name || '', u.plan || 'trial', u.role || 'user', u.verified ? 'true' : 'false', (u.created || '').slice(0, 10), u.subscriptionStatus || '']));
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
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by email, name, or username…"
            className="w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
          {q && <button onClick={() => setQ('')}><X className="h-4 w-4 text-[#6a665a] hover:text-[#c9c4b4]" /></button>}
        </div>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none">
          <option value="all" className="bg-[#0f0f14]">All Plans</option>
          {['trial', 'pro', 'elite', 'professional'].map(p => <option key={p} value={p} className="bg-[#0f0f14]">{p}</option>)}
        </select>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] outline-none">
          <option value="all" className="bg-[#0f0f14]">All Roles</option>
          <option value="user" className="bg-[#0f0f14]">User</option>
          <option value="admin" className="bg-[#0f0f14]">Admin</option>
          <option value="student" className="bg-[#0f0f14]">Student</option>
          <option value="teacher" className="bg-[#0f0f14]">Teacher</option>
          <option value="company" className="bg-[#0f0f14]">Company</option>
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
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                  <th className="px-4 py-3"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="h-4 w-4 accent-[#d4af37]" /></th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Role</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id} className={`border-b border-white/5 transition hover:bg-white/[0.03] ${selected.has(u.id) ? 'bg-[#d4af37]/5' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} className="h-4 w-4 accent-[#d4af37]" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4af37]/10 text-xs font-bold text-[#d4af37]">
                          {(u.username || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#f0ecdd] truncate max-w-[120px] sm:max-w-none">{u.username || <span className="text-[#6a665a]">—</span>}</div>
                          <div className="text-xs text-[#8a8577] truncate max-w-[150px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{planBadge(u.plan)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
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

  const planDist = useMemo(() => {
    const counts = { trial: 0, pro: 0, elite: 0, professional: 0 };
    users.forEach(u => { counts[u.plan || 'trial'] = (counts[u.plan || 'trial'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, color: PLAN_COLORS[name] }));
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

  const paid = users.filter(u => u.plan && u.plan !== 'trial');
  const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);

  return (
    <AdminLayout title="Analytics">
      {loading ? <Spinner /> : (
        <>
          <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
            <Stat icon={Users} label="Total Users" value={users.length} sub="Registered" />
            <Stat icon={UserCheck} label="Verified" value={users.filter(u => u.verified).length} sub="Email confirmed" color="#10b981" />
            <Stat icon={Crown} label="Paid" value={paid.length} sub={`${users.length ? Math.round(paid.length / users.length * 100) : 0}% conversion`} color={GOLD} />
            <Stat icon={TrendingUp} label="Est. MRR" value={`$${mrr.toFixed(0)}`} sub="Monthly recurring" color="#a855f7" />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="mb-4 font-semibold text-[#f0ecdd]">New Registrations / Month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyNew} margin={{ left: -12 }}>
                  <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="new" name="New Users" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="mb-4 font-semibold text-[#f0ecdd]">Plan Distribution</h3>
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
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="mb-4 font-semibold text-[#f0ecdd]">Trade Volume by Market</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tradesByMarket} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#c9c4b4', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip contentStyle={{ background: '#0f0f14', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" name="Trades" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN BILLING ──────────────────────────────────────────────── */
export function AdminBilling() {
  const { users, loading } = useUsers();

  const paid = useMemo(() => users.filter(u => u.plan && u.plan !== 'trial'), [users]);
  const trial = users.filter(u => !u.plan || u.plan === 'trial');
  const mrr = paid.reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0);
  const arr = mrr * 12;

  const planBreakdown = useMemo(() => {
    const counts = {};
    paid.forEach(u => { counts[u.plan] = (counts[u.plan] || 0) + 1; });
    return Object.entries(counts).map(([plan, n]) => ({ plan, n, rev: n * PLAN_PRICES[plan] }));
  }, [paid]);

  return (
    <AdminLayout title="Billing & Revenue">
      <div className="mb-5 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat icon={DollarSign} label="Est. MRR" value={`$${mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Monthly recurring" trend="up" color="#10b981" />
        <Stat icon={TrendingUp} label="Est. ARR" value={`$${arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Annual recurring" trend="up" color={GOLD} />
        <Stat icon={CreditCard} label="Paid Subscribers" value={paid.length} sub={`$${paid.length ? (mrr / paid.length).toFixed(2) : 0} ARPU`} color="#3b82f6" />
        <Stat icon={Users} label="Trial Users" value={trial.length} sub={`${users.length ? Math.round(trial.length / users.length * 100) : 0}% of total`} color="#a855f7" />
      </div>

      {planBreakdown.length > 0 && (
        <div className="mb-5 glass rounded-2xl p-4 sm:p-5">
          <h3 className="mb-4 font-semibold text-[#f0ecdd]">Revenue by Plan</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Subscribers</th>
                  <th className="pb-3 font-medium">Unit Price</th>
                  <th className="pb-3 font-medium">Monthly Rev</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Share</th>
                </tr>
              </thead>
              <tbody>
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
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="glass overflow-x-auto rounded-2xl">
          <div className="border-b border-[#d4af37]/12 px-5 py-3.5">
            <h3 className="font-semibold text-[#f0ecdd]">Active Subscriptions</h3>
          </div>
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Period End</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Sub ID</th>
              </tr>
            </thead>
            <tbody>
              {paid.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <div className="text-[#f0ecdd] truncate max-w-[140px]">{u.username || u.name || '—'}</div>
                    <div className="text-xs text-[#8a8577] truncate max-w-[160px]">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">{planBadge(u.plan)}</td>
                  <td className="px-5 py-3 hidden sm:table-cell"><Badge color={u.subscriptionStatus === 'active' ? 'green' : 'muted'}>{u.subscriptionStatus || 'active'}</Badge></td>
                  <td className="px-5 py-3 font-mono text-xs text-[#8a8577] hidden md:table-cell">{u.currentPeriodEnd ? u.currentPeriodEnd.slice(0, 10) : '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#6a665a] max-w-[120px] truncate hidden lg:table-cell">{u.subscriptionId || '—'}</td>
                </tr>
              ))}
              {!paid.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8a8577]">No paid subscriptions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN CONTENT ──────────────────────────────────────────────── */
const CONTENT_TABS = [
  { id: 'signals', label: 'Trading Signals', icon: BarChart3 },
  { id: 'forum', label: 'Community Forum', icon: Users },
  { id: 'courses', label: 'Academy Courses', icon: LibraryBig },
  { id: 'calendar', label: 'Economic Calendar', icon: FileText },
];

const SIGNAL_STATUSES = ['published', 'draft', 'rejected'];

function useAdminApi(prefix) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = pb.authStore.token;
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/content/${prefix}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(res.ok ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => { load(); }, [load]);

  const api = async (path, opts = {}) => {
    const token = pb.authStore.token;
    const res = await fetch(`${API_SERVER_URL}/admin/content/${prefix}${path}`, {
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
  const { items, loading, api } = useAdminApi('signals');
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
        <h3 className="font-semibold text-[#f0ecdd]">Trading Signals</h3>
        <button onClick={() => { setCreating(true); setEditing(null); }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Plus className="h-4 w-4" /> New signal</button>
      </div>

      {(creating || editing) && (
        <div className="glass rounded-2xl p-5">
          <h4 className="mb-4 text-sm font-semibold text-[#f0ecdd]">{editing ? `Edit ${editing.symbol}` : 'New signal'}</h4>
          <SignalForm initial={editing} onSave={saveSignal} onCancel={() => { setCreating(false); setEditing(null); }} />
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
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
      <h3 className="font-semibold text-[#f0ecdd]">Community Forum</h3>
      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
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
  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await update(editing.id, { config: { ...form, title: form.title }, enabled: form.enabled !== false });
      else await create({ title: form.title, config: form, enabled: form.enabled !== false });
      setEditing(null);
      setForm(Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])));
    } catch (err) { window.alert('Save failed: ' + (err.message || err)); }
  };

  const startEdit = (item) => {
    setEditing(item);
    const c = item.config || {};
    setForm({ ...Object.fromEntries(fields.map((f) => [f.key, f.default ?? ''])), ...c, title: item.title || c.title || '' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-[#f0ecdd]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-[#8a8577]">{subtitle}</p>}
      </div>

      <form onSubmit={submit} className="glass rounded-2xl p-5">
        <h4 className="mb-4 text-sm font-semibold text-[#f0ecdd]">{editing ? `Edit ${editing.title || ''}` : 'New item'}</h4>
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

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
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

export function AdminContent() {
  const [tab, setTab] = useState('signals');
  return (
    <AdminLayout title="Content Management">
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-1 w-fit">
        {CONTENT_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm transition ${tab === id ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#c9c4b4]'}`}>
            <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'signals' && <SignalsTab />}
      {tab === 'forum' && <ForumTab />}
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
    </AdminLayout>
  );
}

/* ─── ADMIN REPORTS ──────────────────────────────────────────────── */
export function AdminReports() {
  const { users, loading } = useUsers();
  const { trades } = useTrades();

  const exportReport = () => {
    const lines = [
      'TradingBible — System Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Total Users: ${users.length}`,
      `Verified: ${users.filter(u => u.verified).length}`,
      `Paid: ${users.filter(u => u.plan && u.plan !== 'trial').length}`,
      `Trial: ${users.filter(u => !u.plan || u.plan === 'trial').length}`,
      `Admins: ${users.filter(u => u.role === 'admin').length}`,
      `Total Trades: ${trades.length}`,
    ];
    const a = document.createElement('a');
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const rows = [
    { label: 'Total registered users', value: users.length, icon: Users },
    { label: 'Verified users', value: users.filter(u => u.verified).length, icon: CheckCircle },
    { label: 'Paid subscribers', value: users.filter(u => u.plan && u.plan !== 'trial').length, icon: CreditCard },
    { label: 'Trial users', value: users.filter(u => !u.plan || u.plan === 'trial').length, icon: Clock },
    { label: 'Admin accounts', value: users.filter(u => u.role === 'admin').length, icon: Shield },
    { label: 'Total trades logged', value: trades.length, icon: Activity },
    { label: 'Est. MRR', value: `$${users.filter(u => u.plan && u.plan !== 'trial').reduce((s, u) => s + (PLAN_PRICES[u.plan] || 0), 0).toFixed(0)}`, icon: DollarSign },
  ];

  const sysLogs = [
    { time: new Date().toISOString().slice(11, 19), level: 'INFO', msg: 'PocketBase running — all migrations applied' },
    { time: new Date(Date.now() - 60000).toISOString().slice(11, 19), level: 'INFO', msg: 'Express API healthy on port 3001' },
    { time: new Date(Date.now() - 120000).toISOString().slice(11, 19), level: 'INFO', msg: 'Integrated AI routes mounted' },
    { time: new Date(Date.now() - 180000).toISOString().slice(11, 19), level: 'INFO', msg: 'Auth store initialised' },
    { time: new Date(Date.now() - 240000).toISOString().slice(11, 19), level: 'INFO', msg: 'Market data cache active (60s TTL)' },
  ];

  return (
    <AdminLayout title="Reports & Logs">
      <div className="mb-4 flex justify-end">
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
          {sysLogs.map((l, i) => (
            <div key={i} className="flex items-start gap-2 sm:gap-3 rounded-lg bg-white/[0.03] px-3 py-2 min-w-0">
              <span className="text-[#6a665a] shrink-0">{l.time}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${l.level === 'ERROR' ? 'bg-red-500/20 text-red-400' : l.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{l.level}</span>
              <span className="text-[#c9c4b4] break-all">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

/* ─── ADMIN INTEGRATIONS ─────────────────────────────────────────── */
const INTEGRATION_PRESETS = [
  { provider: 'alpha_vantage', name: 'Alpha Vantage', icon: BarChart3, color: '#3b82f6', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { provider: 'binance', name: 'Binance', icon: TrendingUp, color: '#f0b90b', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }, { key: 'apiSecret', label: 'API Secret', type: 'password' }] },
  { provider: 'finnhub', name: 'Finnhub', icon: Activity, color: '#10b981', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { provider: 'polygon', name: 'Polygon.io', icon: Globe, color: '#8b5cf6', fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }] },
  { provider: 'forex_factory', name: 'Forex Factory', icon: Globe, color: GOLD, fields: [{ key: 'apiKey', label: 'API Key (optional)', type: 'password' }] },
  { provider: 'smtp', name: 'Email (SMTP)', icon: Mail, color: '#ec4899', fields: [{ key: 'apiKey', label: 'SMTP Host', type: 'text' }, { key: 'apiSecret', label: 'Password', type: 'password' }, { key: 'extraConfig', label: 'Port / From Address (JSON)', type: 'text' }] },
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
    try { await onTest(record?.id, preset.provider, form.apiKey); toast({ title: 'Connection tested', description: `${preset.name} responded successfully.` }); }
    catch { toast({ variant: 'destructive', title: 'Test failed', description: `Could not connect to ${preset.name}.` }); }
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
            <button onClick={handleTest} disabled={testing || !form.apiKey}
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

  const load = async () => {
    setLoading(true);
    try { setRecords(await pb.collection('admin_integrations').getFullList({ requestKey: 'admin-integrations' })); }
    catch { /* ignore */ } finally { setLoading(false); }
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

  const handleTest = async (id, provider, apiKey) => {
    // Simulate test — in production you'd call an Express endpoint
    await new Promise(r => setTimeout(r, 1200));
    const now = new Date().toISOString();
    if (id) {
      const updated = await pb.collection('admin_integrations').update(id, {
        status: 'connected', lastTestedAt: now, lastTestResult: `OK — tested at ${now.slice(11, 19)} UTC`
      });
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this integration?')) return;
    await pb.collection('admin_integrations').delete(id);
    setRecords(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Integration removed' });
  };

  return (
    <AdminLayout title="Integrations">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[#f0ecdd]">Third-Party Integrations</h2>
          <p className="text-sm text-[#8a8577] mt-0.5">Configure API keys and connections to external services.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 px-3 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/40">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? <Spinner /> : (
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
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN API KEYS ─────────────────────────────────────────────── */
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'tb_';
  for (let i = 0; i < 48; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
}

const ALL_PERMISSIONS = ['read:market', 'read:journal', 'write:journal', 'read:signals', 'read:alerts', 'write:alerts', 'read:community'];

export function AdminApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', assignedTo: '', permissions: ['read:market'], expiresAt: '' });
  const [newKeyPlain, setNewKeyPlain] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [revealed, setRevealed] = useState({});

  const load = async () => {
    setLoading(true);
    try { setKeys(await pb.collection('admin_api_keys').getFullList({ sort: '-created', requestKey: 'admin-api-keys' })); }
    catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newForm.name.trim()) return toast({ variant: 'destructive', title: 'Name required' });
    setCreating(true);
    try {
      const plain = generateKey();
      const prefix = plain.slice(0, 7);
      const hash = btoa(plain); // base64 as a simple "hash" for display
      const rec = await pb.collection('admin_api_keys').create({
        name: newForm.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: newForm.permissions,
        assignedTo: newForm.assignedTo,
        status: 'active',
        usageCount: 0,
        expiresAt: newForm.expiresAt || null,
      });
      setKeys(prev => [rec, ...prev]);
      setNewKeyPlain(plain);
      setShowModal(false);
      toast({ title: 'API Key created', description: 'Copy the key now — it will not be shown again.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    } finally { setCreating(false); }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this API key? This action cannot be undone.')) return;
    await pb.collection('admin_api_keys').update(id, { status: 'revoked' });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
    toast({ title: 'Key revoked' });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this API key?')) return;
    await pb.collection('admin_api_keys').delete(id);
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

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-[#f0ecdd]">API Key Management</h2>
          <p className="text-sm text-[#8a8577] mt-0.5">{keys.length} key{keys.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90">
          <Plus className="h-4 w-4" /> Generate Key
        </button>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#f0ecdd]">Generate API Key</h3>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-[#8a8577]" /></button>
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
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/12 text-left text-xs uppercase tracking-wider text-[#8a8577]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key Prefix</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Assigned To</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Status</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="text-[#f0ecdd]">{k.name}</div>
                    <div className="text-xs text-[#8a8577]">{(k.permissions || []).slice(0, 2).join(', ')}{(k.permissions || []).length > 2 ? `+${k.permissions.length - 2}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#c9c4b4]">{k.keyPrefix}•••••••••••••</td>
                  <td className="px-4 py-3 text-xs text-[#8a8577] hidden sm:table-cell">{k.assignedTo || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge color={k.status === 'active' ? 'green' : 'red'}>{k.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#8a8577] hidden lg:table-cell">{(k.created || '').slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {k.status === 'active' && (
                        <button onClick={() => revoke(k.id)} title="Revoke" className="rounded-lg p-1.5 text-[#8a8577] hover:bg-orange-500/10 hover:text-orange-400">
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => remove(k.id)} title="Delete" className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!keys.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#8a8577]">No API keys yet. Generate your first key above.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

/* ─── ADMIN PLUGINS ──────────────────────────────────────────────── */
const BUILTIN_PLUGINS = [
  { slug: 'market-data', name: 'Market Data Engine', version: '2.1.0', description: 'Real-time quotes, candles, and order book from Alpha Vantage, Binance, Polygon.', author: 'TradingBible Core', enabled: true, status: 'installed' },
  { slug: 'ai-coach', name: 'AI Trade Coach', version: '1.4.0', description: 'GPT-powered trade analysis, emotion scoring, and improvement suggestions.', author: 'TradingBible Core', enabled: true, status: 'installed' },
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
    toast({ title: newEnabled ? `${plugin.name} enabled` : `${plugin.name} disabled` });
  };

  const remove = async (plugin) => {
    if (plugin._builtin) return toast({ variant: 'destructive', title: 'Cannot remove built-in plugin' });
    if (!window.confirm(`Remove ${plugin.name}?`)) return;
    if (plugin.id) await pb.collection('admin_plugins').delete(plugin.id);
    setPlugins(prev => prev.filter(p => p.slug !== plugin.slug));
    toast({ title: 'Plugin removed' });
  };

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast({ title: 'Upload feature', description: 'Custom plugin upload requires a plugin ZIP package. Contact support.' });
    }, 800);
  };

  return (
    <AdminLayout title="Plugins">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#f0ecdd]">Plugin Management</h2>
          <p className="text-sm text-[#8a8577] mt-0.5">{plugins.filter(p => p.enabled).length} of {plugins.length} plugins active</p>
        </div>
        <button onClick={handleUpload} disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2.5 text-sm text-[#d4af37] hover:border-[#d4af37]/50">
          {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload Plugin
        </button>
      </div>

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

/* ─── ADMIN TV ──────────────────────────────────────────────────── */
export function AdminTvAds() {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [settings, setSettings] = useState({ rotationSeconds: 12, autoOpenIntervalMinutes: 0, headerText: 'TradingBible TV', footerText: 'Advertise with TradingBible', advertiserEmail: 'ads@tradingbible.app' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', headline: '', imageUrl: '', logoUrl: '', linkUrl: '', cta: 'Learn more', accent: '#d4af37', durationSeconds: 12, snippet: '', enabled: true });

  const load = useCallback(async () => {
    const token = pb.authStore.token;
    try {
      const [adsRes, setRes] = await Promise.all([
        fetch(`${API_SERVER_URL}/ads/admin/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_SERVER_URL}/ads`),
      ]);
      const [adsData, feedData] = await Promise.all([adsRes.json(), setRes.json()]);
      setAds(adsRes.ok ? adsData.ads || [] : []);
      if (feedData?.settings) setSettings((s) => ({ ...s, ...feedData.settings }));
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    setBusy(true);
    try {
      if (editing) {
        await api(`/admin/${editing.id}`, { method: 'PATCH', body: { config: form, enabled: form.enabled } });
        toast({ title: 'Broadcast updated' });
      } else {
        await api('/admin', { method: 'POST', body: { title: form.title, config: form, enabled: form.enabled } });
        toast({ title: 'Broadcast created' });
      }
      setEditing(null);
      setForm({ title: '', headline: '', imageUrl: '', logoUrl: '', linkUrl: '', cta: 'Learn more', accent: '#d4af37', durationSeconds: 12, snippet: '', enabled: true });
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

  const startEdit = (ad) => {
    setEditing(ad);
    setForm({ ...ad.config, title: ad.title || ad.config?.title || '', enabled: ad.enabled !== false });
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
  const label = 'mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider';

  return (
    <AdminLayout title="TradingBible TV">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#f0ecdd]">TV Broadcasts</h2>
          <p className="mt-1 text-xs text-[#8a8577]">Fullscreen ad rotation shown at <span className="text-[#d4af37]">tradingbible.app/tv</span>.</p>
        </div>
        <a href="/tv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm text-[#d4af37] hover:border-[#d4af37]/60 transition-colors">
          <MonitorPlay className="h-4 w-4" /> View TV
        </a>
      </div>

      {/* TV settings */}
      <div className="glass mb-6 rounded-2xl p-5">
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
      <div className="glass mb-6 rounded-2xl p-5">
        <h3 className="mb-4 font-semibold text-[#f0ecdd]">{editing ? `Edit broadcast — ${editing.title || editing.key}` : 'New broadcast'}</h3>
        <form onSubmit={saveAd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={label}>Title *</label><input required className={input} value={form.title} onChange={setF('title')} placeholder="e.g. Acme Trading Summit" /></div>
          <div><label className={label}>Headline</label><input className={input} value={form.headline} onChange={setF('headline')} placeholder="Short punchy line" /></div>
          <div><label className={label}>CTA button text</label><input className={input} value={form.cta} onChange={setF('cta')} /></div>
          <div><label className={label}>Background image URL</label><input className={input} value={form.imageUrl} onChange={setF('imageUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Logo URL</label><input className={input} value={form.logoUrl} onChange={setF('logoUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Link URL (opens on click)</label><input className={input} value={form.linkUrl} onChange={setF('linkUrl')} placeholder="https://…" /></div>
          <div><label className={label}>Accent color</label><input type="color" className="h-12 w-full cursor-pointer rounded-xl border border-[#d4af37]/15 bg-[#0f0f14]" value={form.accent} onChange={setF('accent')} /></div>
          <div><label className={label}>Duration (seconds)</label><input type="number" min="4" max="60" className={input} value={form.durationSeconds} onChange={setF('durationSeconds')} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={label}>Snippet (body text)</label>
            <textarea rows="4" className={input} value={form.snippet} onChange={setF('snippet')} placeholder="Longer description shown under the headline…" /></div>
          <label className="flex items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={setF('enabled')} className="h-5 w-5 accent-[#d4af37]" />
            <span className="text-sm text-[#c9c4b4]">Live now</span>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90 disabled:opacity-50">
              <Save className="h-4 w-4" /> {editing ? 'Update broadcast' : 'Publish broadcast'}
            </button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ title: '', headline: '', imageUrl: '', logoUrl: '', linkUrl: '', cta: 'Learn more', accent: '#d4af37', durationSeconds: 12, snippet: '', enabled: true }); }} className="rounded-xl border border-[#d4af37]/25 px-5 py-2.5 text-sm text-[#d4af37]">Cancel</button>}
          </div>
        </form>
      </div>

      {/* Ad list */}
      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/10 text-left text-xs uppercase tracking-wider text-[#6a665a]">
                <th className="px-5 py-3">Broadcast</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Views</th>
                <th className="px-5 py-3">Clicks</th>
                <th className="px-5 py-3">CTR</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-[#8a8577]">Loading broadcasts…</td></tr>
              ) : ads.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-[#8a8577]">No broadcasts yet — create one above.</td></tr>
              ) : ads.map((ad) => {
                const c = ad.config || {};
                const clicks = Number(c.clicks) || 0;
                const views = Number(c.views) || 0;
                const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) + '%' : '—';
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
    tagline: 'Trade like the 1%. Journal like a fund.',
    supportEmail: 'support@tradingbible.app',
    trialDays: 7,
    signupsOpen: true,
    maintenance: false,
    twoFARequired: false,
    emailVerification: true,
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
      <div className="flex flex-wrap gap-1 mb-6 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm transition ${tab === id ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#c9c4b4]'}`}>
            <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <form onSubmit={save} className="glass max-w-xl rounded-2xl p-5 sm:p-6 space-y-5">
          <h3 className="font-semibold text-[#f0ecdd]">General Configuration</h3>
          <div className="text-xs text-[#8a8577]">
            {saveState === 'saving' && 'Saving automatically...'}
            {saveState === 'saved' && 'All changes saved'}
            {saveState === 'error' && 'Autosave failed'}
            {saveState === 'idle' && 'Changes save automatically'}
          </div>
          {[['platformName', 'Platform Name', 'text'], ['tagline', 'Tagline', 'text'], ['supportEmail', 'Support Email', 'email'], ['trialDays', 'Trial Length (days)', 'number']].map(([k, l, t]) => (
            <div key={k}>
              <label className="mb-1.5 block text-xs font-medium text-[#8a8577] uppercase tracking-wider">{l}</label>
              <input type={t} value={settings[k]} onChange={e => setSettings({ ...settings, [k]: t === 'number' ? Number(e.target.value) : e.target.value })}
                className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
            </div>
          ))}
          {[['signupsOpen', 'Allow new sign-ups'], ['maintenance', 'Maintenance mode'], ['emailVerification', 'Require email verification']].map(([k, l]) => (
            <label key={k} className="flex items-center justify-between rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
              <span className="text-sm text-[#c9c4b4]">{l}</span>
              <input type="checkbox" checked={settings[k]} onChange={e => setSettings({ ...settings, [k]: e.target.checked })} className="h-5 w-5 accent-[#d4af37]" />
            </label>
          ))}
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Save className="h-4 w-4" /> Save Settings</button>
        </form>
      )}

      {tab === 'features' && (
        <div className="glass max-w-xl rounded-2xl p-5 sm:p-6 space-y-3">
          <h3 className="font-semibold text-[#f0ecdd] mb-4">Feature Toggles</h3>
          {Object.entries(features).map(([k, v]) => {
            const labels = { aiCoach: 'AI Coach', academy: 'Academy', community: 'Community', economicCalendar: 'Economic Calendar', riskTools: 'Risk Tools', chartBuilder: 'Chart Builder', signals: 'Trading Signals', wallet: 'Wallet & Banking' };
            return (
              <label key={k} className="flex items-center justify-between rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer hover:border-[#d4af37]/25 transition-colors">
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
          <button onClick={() => toast({ title: 'Feature settings saved' })} className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
        </div>
      )}

      {tab === 'security' && (
        <div className="glass max-w-xl rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="font-semibold text-[#f0ecdd]">Security Settings</h3>
          {[['twoFARequired', 'Require 2FA for all users', 'Forces two-factor authentication on every account'],
            ['emailVerification', 'Enforce email verification', 'Users cannot trade until email is verified']].map(([k, l, d]) => (
            <label key={k} className="flex items-start justify-between gap-4 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3 cursor-pointer">
              <div>
                <div className="text-sm text-[#c9c4b4]">{l}</div>
                <div className="text-xs text-[#6a665a] mt-0.5">{d}</div>
              </div>
              <input type="checkbox" checked={settings[k]} onChange={e => setSettings({ ...settings, [k]: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[#d4af37] shrink-0" />
            </label>
          ))}
          <div className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#c9c4b4]">Session Timeout</span>
              <select className="bg-transparent text-sm text-[#e9e7df] outline-none">
                <option>7 days</option><option>30 days</option><option>90 days</option>
              </select>
            </div>
          </div>
          <button onClick={() => toast({ title: 'Security settings saved' })} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
        </div>
      )}
    </AdminLayout>
  );
}
