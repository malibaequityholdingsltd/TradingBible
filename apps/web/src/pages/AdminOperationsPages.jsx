import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, BarChart3, BookOpen,
  Building2, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Coins,
  FileCheck2, FileText, Filter, Globe, GraduationCap, Layers, Lock,
  Mail, Megaphone, MessagesSquare, RefreshCw, Search, ShieldCheck, Signal, Sparkles,
  Target, TrendingUp, Trophy, Users, Wallet, XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtMetric, AtPageBar, AtPanel,
  AtProgress, AtSectionHeading,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { usePlatformSettings } from '@/lib/platformSettings';
import {
  ACADEMY_TIERS, COMPANY_FACTS, FUNDED_FACTS, formatNumber, formatUsd,
} from '@/lib/adminCatalog';
import {
  COMPLIANCE_GATES, LAUNCH_CHECKS, PRODUCT_SURFACES, PUBLIC_SITE_PAGES, STATUS_TONE,
} from '@/lib/adminData';
import { PATHS, SCHOOLS, STATIC_CURRICULA, WEBINAR_CATALOG, pathStats } from '@/lib/academyCatalog';

async function adminFetch(path, options = {}) {
  const res = await fetch(`${API_SERVER_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pb.authStore.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

function statusTone(status) {
  return STATUS_TONE[String(status || '').toLowerCase()] || 'muted';
}

function StatusBadge({ status }) {
  return <AtBadge tone={statusTone(status)}>{String(status || 'unknown').replace(/-/g, ' ')}</AtBadge>;
}

function PageShell({ children, ...props }) {
  return (
    <AdminLayout title={props.title}>
      <div className="at-page at-scope at-enter pb-10">
        <AtPageBar meta={props.meta} actions={props.actions}>
          {props.description && <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[var(--at-mut)]">{props.description}</p>}
        </AtPageBar>
        {children}
      </div>
    </AdminLayout>
  );
}

/* ─── PRODUCT SURFACES ───────────────────────────────────────────── */
const FEATURE_FOR_PRODUCT = {
  terminal: 'chartBuilder',
  signals: 'signals',
  alerts: 'signals',
  indicators: 'chartBuilder',
  heatmaps: 'chartBuilder',
  calendar: 'economicCalendar',
  coach: 'aiCoach',
  tools: 'riskTools',
  community: 'community',
  academy: 'academy',
  wallet: 'wallet',
};

export function AdminProductSurfacesPage() {
  const { features, planGates } = usePlatformSettings();
  const [q, setQ] = useState('');
  const [area, setArea] = useState('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRODUCT_SURFACES
      .filter((surface) => area === 'all' || surface.area === area)
      .filter((surface) => !needle || `${surface.name} ${surface.to} ${surface.area} ${surface.gate} ${surface.note}`.toLowerCase().includes(needle))
      .map((surface) => {
        const featureKey = FEATURE_FOR_PRODUCT[surface.id];
        const enabled = featureKey ? features?.[featureKey] !== false : true;
        const gate = surface.id === 'reports' ? planGates?.reports : surface.id === 'coach' ? planGates?.coach : surface.id === 'api-docs' ? planGates?.apiDocs : surface.id === 'api-keys' ? planGates?.apiKeys : surface.id === 'branding' ? planGates?.branding : surface.gate;
        return { ...surface, enabled, effectiveGate: gate || surface.gate, featureKey };
      });
  }, [q, area, features, planGates]);

  const areas = useMemo(() => ['all', ...new Set(PRODUCT_SURFACES.map((s) => s.area))], []);
  const enabledCount = rows.filter((r) => r.enabled).length;
  const gateLabel = (gate) => (/professional|teams/i.test(String(gate)) ? 'Enterprise' : gate);

  return (
    <PageShell
      title="Product surfaces"
      meta={[`${PRODUCT_SURFACES.length} member surfaces`, `${enabledCount} enabled`, 'Plan gates applied', 'Live routes']}
      description="Every shipped member-facing surface, its route, effective plan gate and current feature-switch state. Use Settings for plan gates and Plugins for module switches. This page does not grant entitlements."
      actions={<><AtButton to="/admin/settings" variant="quiet" icon={ShieldCheck}>Plan gates</AtButton><AtButton to="/admin/plugins" variant="outline" icon={Layers}>Plugins</AtButton></>}
    >
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--at-mut)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search surfaces, routes, gates…" className="at-input !pl-9" />
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="at-input max-w-[190px]">
          {areas.map((value) => <option key={value} value={value}>{value === 'all' ? 'All product areas' : value}</option>)}
        </select>
        <AtBadge tone="gold">{rows.length} shown</AtBadge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Layers} label="Surfaces" value={PRODUCT_SURFACES.length} note="Mapped member routes" />
        <AtMetric icon={CheckCircle2} label="Feature switches on" value={enabledCount} note="Rows matching current filter" tone="text-[var(--at-green)]" />
        <AtMetric icon={Lock} label="Paid or enterprise" value={PRODUCT_SURFACES.filter((s) => /Premium|Ever-paid|Paid|Enterprise/.test(s.gate)).length} note="Paid or enterprise routes" tone="text-[var(--at-gold)]" />
        <AtMetric icon={Globe} label="Public routes" value={PRODUCT_SURFACES.filter((s) => s.gate === 'Public').length} note="No account required" />
      </div>

      <AtPanel className="mt-4" title="Surface inventory" sub="A route can be live while its feature switch is off; both states are shown." flush>
        <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
          <table className="at-table min-w-[760px]">
            <thead><tr><th>Surface</th><th>Area</th><th>Route</th><th>Plan gate</th><th>Switch</th><th className="text-right">Open</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="font-semibold text-[var(--at-ink)]">{row.name}</div>
                    <div className="mt-0.5 max-w-[360px] text-[10px] leading-relaxed text-[var(--at-mut)]">{row.note}</div>
                  </td>
                  <td><AtBadge tone="muted">{row.area}</AtBadge></td>
                  <td><span className="font-mono text-[10px] text-[var(--at-ink-2)]">{row.to}</span></td>
                  <td><AtBadge tone={/professional|teams|enterprise/i.test(String(row.effectiveGate)) ? 'violet' : /Premium|Paid|Ever-paid/.test(row.effectiveGate) ? 'gold' : 'muted'}>{gateLabel(row.effectiveGate)}</AtBadge></td>
                  <td><AtBadge tone={row.enabled ? 'green' : 'red'}>{row.enabled ? 'On' : 'Off'}</AtBadge></td>
                  <td className="text-right"><Link to={row.to} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--at-gold)] hover:underline">Open <ArrowUpRight className="h-3 w-3" /></Link></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6}><AtEmpty icon={Search} title="No surfaces match" sub="Clear the search or choose another area." /></td></tr>}
            </tbody>
          </table>
        </div>
      </AtPanel>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <AtPanel title="Where to change access" sub="No entitlement is changed on this page.">
          <div className="space-y-2">
            {[
              { to: '/admin/settings', icon: ShieldCheck, title: 'Plan gates', note: 'Premium and enterprise minimums.' },
              { to: '/admin/plugins', icon: Layers, title: 'Feature switches', note: 'AI coach, Academy, community, calendar, charts, signals and wallet.' },
              { to: '/admin/content', icon: FileText, title: 'Content', note: 'Signals, forum, courses, challenges, calendar and site copy.' },
            ].map(({ to, icon: Icon, title, note }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 transition hover:border-[var(--at-line-strong)]">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[var(--at-ink)]">{title}</span><span className="block text-[10px] text-[var(--at-mut)]">{note}</span></span>
                <ChevronRight className="h-4 w-4 text-[var(--at-mut-2)]" />
              </Link>
            ))}
          </div>
        </AtPanel>
        <AtAlert icon={AlertTriangle} tone="amber">
          <b className="text-[var(--at-ink)]">A feature switch is not a licence.</b>{' '}
          Turning on a product surface does not authorise brokerage, securities issuance, payments, card issuance or TBC sale. Regulated activity stays closed until the gates on the Compliance page clear.
        </AtAlert>
      </div>
    </PageShell>
  );
}

/* ─── ACADEMY ────────────────────────────────────────────────────── */
export function AdminAcademyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await adminFetch('/admin/content/course');
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (err) { setError(err.message); setItems([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    let courses = 0;
    let lessons = 0;
    let minutes = 0;
    for (const path of PATHS) {
      const s = pathStats(path.key);
      courses += s.courses;
      lessons += s.lessons;
      minutes += s.minutes;
    }
    return { courses, lessons, minutes, paths: PATHS.length, schools: SCHOOLS.length, webinars: WEBINAR_CATALOG.length };
  }, []);

  const schoolRows = useMemo(() => SCHOOLS.map((school) => {
    let courses = 0;
    let lessons = 0;
    for (const key of school.pathKeys) {
      const s = pathStats(key);
      courses += s.courses;
      lessons += s.lessons;
    }
    return { ...school, courses, lessons };
  }), []);

  return (
    <PageShell
      title="Academy operations"
      meta={[`${stats.paths} paths`, `${stats.courses} courses`, `${stats.lessons} lessons`, 'Tuition separate from Premium']}
      description="The Academy is a company education product. It has 17 paths, 76 courses and 347 lessons. Lifetime tuition is separate from the Free/Premium platform subscription. Course overrides are managed in Content."
      actions={<><AtButton to="/admin/content" variant="quiet" icon={FileText}>Course content</AtButton><AtButton to="/academy" variant="outline" icon={Globe}>Public catalogue</AtButton><AtButton to="/app/academy" variant="gold" icon={GraduationCap}>Open Academy</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={BookOpen} label="Learning paths" value={stats.paths} note={`${stats.schools} schools`} />
        <AtMetric icon={Layers} label="Courses" value={stats.courses} note="Shipped catalogue" />
        <AtMetric icon={FileText} label="Lessons" value={stats.lessons} note={`${formatNumber(stats.minutes)} minutes`} />
        <AtMetric icon={GraduationCap} label="Webinars" value={stats.webinars} note="Catalogue entries" tone="text-[var(--at-gold)]" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
        <AtPanel title="Curriculum coverage" sub="Schools, paths, courses and lessons from the shipped catalogue.">
          <div className="space-y-2">
            {schoolRows.map((school) => (
              <div key={school.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)] font-mono text-[9px] font-bold text-[var(--at-gold)]">{school.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[var(--at-ink)]">{school.name}</div>
                  <div className="text-[10px] text-[var(--at-mut)]">{school.pathKeys.length} paths · {school.courses} courses · {school.lessons} lessons</div>
                </div>
                <AtBadge tone="muted">{school.code}</AtBadge>
              </div>
            ))}
          </div>
        </AtPanel>

        <AtPanel title="Lifetime tuition" sub="One-time tiers. Not a subscription and not included in Premium.">
          <div className="space-y-2">
            {ACADEMY_TIERS.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                <div><div className="text-[11px] font-semibold text-[var(--at-ink)]">{tier.name}</div><div className="text-[10px] text-[var(--at-mut)]">{tier.learners} learner{tier.learners === 1 ? '' : 's'}{tier.note ? ` · ${tier.note}` : ''}</div></div>
                <span className="font-mono text-sm font-bold text-[var(--at-gold)]">{formatUsd(tier.price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3"><AtAlert icon={Lock} tone="amber"><b className="text-[var(--at-ink)]">Tuition is separate.</b> Premium does not include Academy lifetime access. No refund, transfer or seat rule is invented here.</AtAlert></div>
        </AtPanel>
      </div>

      <AtPanel className="mt-4" title="Course overrides" sub="Admin-created course records from Content → Academy Courses." action={<AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>} flush>
        {loading ? <div className="p-5"><AtProgress value={45} /></div> : error ? (
          <div className="p-5"><AtAlert icon={AlertTriangle} tone="red">{error}</AtAlert></div>
        ) : items.length ? (
          <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
            <table className="at-table min-w-[620px]">
              <thead><tr><th>Title</th><th>Status</th><th>Created</th><th className="text-right">Edit</th></tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold text-[var(--at-ink)]">{item.title || item.config?.title || 'Untitled course'}</td>
                  <td><AtBadge tone={item.enabled === false ? 'muted' : 'green'}>{item.enabled === false ? 'Draft' : 'Published'}</AtBadge></td>
                  <td className="font-mono text-[10px] text-[var(--at-mut)]">{String(item.created || item.created_at || '').slice(0, 10) || '—'}</td>
                  <td className="text-right"><Link to="/admin/content?tab=courses" className="text-[10px] font-semibold text-[var(--at-gold)] hover:underline">Open content</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <AtEmpty icon={BookOpen} title="No course overrides" sub="The shipped catalogue is live. Admin-created course records appear here when published in Content." />}
      </AtPanel>
    </PageShell>
  );
}

/* ─── CHALLENGES & FUNDED ────────────────────────────────────────── */
export function AdminChallengesPage() {
  const [attempts, setAttempts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [a, p] = await Promise.allSettled([
      adminFetch('/challenges/admin/all'),
      adminFetch('/admin/content/challenge'),
    ]);
    if (a.status === 'fulfilled') setAttempts(a.value.attempts || []);
    else { setAttempts([]); setError(a.reason?.message || 'Attempts failed to load'); }
    if (p.status === 'fulfilled') setProducts(Array.isArray(p.value) ? p.value : p.value.items || []);
    else setProducts([]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => attempts.reduce((acc, row) => {
    const status = String(row.status || 'active').toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}), [attempts]);

  return (
    <PageShell
      title="Challenges & funded"
      meta={[`${FUNDED_FACTS.products} products`, `${formatUsd(FUNDED_FACTS.maxAccount)} max account`, `${FUNDED_FACTS.maxSplit}% max split`, `${FUNDED_FACTS.payoutDays}-day payouts`]}
      description="Funded evaluations are a company product: 16 products, maximum $200,000 account, standard 80% split scaling to 90%, and 14-day payouts to the TBC credit wallet. Attempt data is read-only here; product rules and pass rewards are edited in Content."
      actions={<><AtButton to="/admin/content?tab=challenges" variant="quiet" icon={FileText}>Program rules</AtButton><AtButton to="/programs" variant="outline" icon={Globe}>Public programs</AtButton><AtButton to="/app/challenges" variant="gold" icon={Trophy}>Open challenges</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Trophy} label="Evaluation products" value={FUNDED_FACTS.products} note="Shipped product catalogue" />
        <AtMetric icon={Target} label="Max account" value={formatUsd(FUNDED_FACTS.maxAccount)} note="Hard product ceiling" tone="text-[var(--at-gold)]" />
        <AtMetric icon={TrendingUp} label="Profit split" value={`${FUNDED_FACTS.standardSplit}% → ${FUNDED_FACTS.maxSplit}%`} note="Standard to scaled" />
        <AtMetric icon={Clock3} label="Payout cycle" value={`${FUNDED_FACTS.payoutDays} days`} note="To TBC credit wallet" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_.9fr]">
        <AtPanel title="Attempt register" sub="Latest 200 challenge attempts from the admin API." action={<AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>} flush>
          {loading ? <div className="p-5"><AtProgress value={50} /></div> : error ? <div className="p-5"><AtAlert icon={AlertTriangle} tone="red">{error}</AtAlert></div> : attempts.length ? (
            <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
              <table className="at-table min-w-[700px]">
                <thead><tr><th>Trader</th><th>Product</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>{attempts.slice(0, 40).map((row) => (
                  <tr key={row.id}>
                    <td><div className="font-semibold text-[var(--at-ink)]">{row.userEmail || row.owner || 'Account'}</div><div className="font-mono text-[9px] text-[var(--at-mut-2)]">{String(row.id).slice(0, 8)}</div></td>
                    <td className="font-mono text-[10px] text-[var(--at-ink-2)]">{row.product_key || row.productKey || '—'}</td>
                    <td><StatusBadge status={row.status || 'active'} /></td>
                    <td className="font-mono text-[10px] text-[var(--at-mut)]">{String(row.created_at || row.created || '').slice(0, 10) || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <AtEmpty icon={Trophy} title="No challenge attempts" sub="Attempts appear here after a trader starts an evaluation." />}
        </AtPanel>

        <div className="space-y-3">
          <AtPanel title="Attempt state" sub="Counts from the loaded register.">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Total loaded', attempts.length, 'muted'],
                ['Active', counts.active || 0, 'gold'],
                ['Passed', counts.passed || 0, 'green'],
                ['Failed / breached', (counts.failed || 0) + (counts.breached || 0), 'red'],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                  <div className="at-kpi-label">{label}</div>
                  <div className={`mt-1 font-mono text-lg font-bold ${tone === 'green' ? 'text-[var(--at-green)]' : tone === 'red' ? 'text-[var(--at-red)]' : tone === 'gold' ? 'text-[var(--at-gold)]' : 'text-[var(--at-ink)]'}`}>{value}</div>
                </div>
              ))}
            </div>
          </AtPanel>
          <AtPanel title="Product overrides" sub="Admin-created program records.">
            {products.length ? products.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 border-b border-[var(--at-line-soft)] py-2 last:border-0">
                <span className="truncate text-[11px] text-[var(--at-ink-2)]">{item.title || item.config?.name || 'Program'}</span>
                <AtBadge tone={item.enabled === false ? 'muted' : 'green'}>{item.enabled === false ? 'Draft' : 'Live'}</AtBadge>
              </div>
            )) : <p className="text-[11px] text-[var(--at-mut)]">No admin product overrides. The shipped 16-product catalogue is live.</p>}
            <AtButton to="/admin/content?tab=challenges" variant="outline" size="sm" icon={FileText} className="mt-3 w-full">Edit program rules</AtButton>
          </AtPanel>
          <AtAlert icon={AlertTriangle} tone="amber"><b className="text-[var(--at-ink)]">Payouts are not executed here.</b> Pass rewards are paid through the challenge payout route after identity checks. No figure on this page is a performance guarantee.</AtAlert>
        </div>
      </div>
    </PageShell>
  );
}

/* ─── SIGNALS & ALERTS ───────────────────────────────────────────── */
export function AdminSignalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await adminFetch('/admin/signals'); setItems(Array.isArray(data) ? data : data.items || []); }
    catch (err) { setItems([]); setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => items.reduce((acc, item) => {
    const status = String(item.status || 'draft').toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}), [items]);

  return (
    <PageShell
      title="Signals & alerts"
      meta={[`${items.length} signal records`, `${counts.published || 0} published`, `${counts.draft || 0} draft`, 'Delivery channels gated']}
      description="Published signal ideas and alert surfaces. Signal records are created in Content; alert delivery depends on configured email/SMS channels. SMS remains design-only until a provider, consent and opt-out handling exist."
      actions={<><AtButton to="/admin/content?tab=signals" variant="quiet" icon={FileText}>Signal content</AtButton><AtButton to="/app/signals" variant="outline" icon={Signal}>Open signals</AtButton><AtButton to="/app/alerts" variant="gold" icon={Activity}>Open alerts</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Signal} label="Signal records" value={items.length} note="Published, draft and rejected" />
        <AtMetric icon={CheckCircle2} label="Published" value={counts.published || 0} note="Visible to members" tone="text-[var(--at-green)]" />
        <AtMetric icon={Clock3} label="Draft / rejected" value={(counts.draft || 0) + (counts.rejected || 0)} note="Not visible" tone="text-[var(--at-amber)]" />
        <AtMetric icon={Mail} label="SMS delivery" value="Blocked" note="No provider or consent records" tone="text-[var(--at-red)]" />
      </div>

      <AtPanel className="mt-4" title="Signal register" sub="Latest published, draft and rejected signals from the admin API." action={<AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>} flush>
        {loading ? <div className="p-5"><AtProgress value={50} /></div> : error ? <div className="p-5"><AtAlert icon={AlertTriangle} tone="red">{error}</AtAlert></div> : items.length ? (
          <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
            <table className="at-table min-w-[720px]">
              <thead><tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Target</th><th>Stop</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-[11px] font-semibold text-[var(--at-ink)]">{item.symbol || '—'}</td>
                  <td><AtBadge tone={String(item.side).toLowerCase() === 'long' ? 'green' : String(item.side).toLowerCase() === 'short' ? 'red' : 'muted'}>{item.side || '—'}</AtBadge></td>
                  <td className="font-mono text-[10px] text-[var(--at-ink-2)]">{item.entry ?? '—'}</td>
                  <td className="font-mono text-[10px] text-[var(--at-ink-2)]">{item.target ?? '—'}</td>
                  <td className="font-mono text-[10px] text-[var(--at-ink-2)]">{item.stop ?? '—'}</td>
                  <td><StatusBadge status={item.status || 'draft'} /></td>
                  <td className="font-mono text-[10px] text-[var(--at-mut)]">{String(item.created || item.created_at || '').slice(0, 10) || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <AtEmpty icon={Signal} title="No signals" sub="Create signals in Content → Trading Signals. Published signals appear here." />}
      </AtPanel>

      <div className="mt-3"><AtAlert icon={Mail} tone="amber"><b className="text-[var(--at-ink)]">Alert delivery is not proven.</b> Email depends on production SMTP and sender verification; SMS has no provider, consent records or opt-out handling. Do not tell members an alert will arrive until the channel is verified.</AtAlert></div>
    </PageShell>
  );
}

/* ─── COMMUNITY & MODERATION ─────────────────────────────────────── */
export function AdminCommunityPage() {
  const [threads, setThreads] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await adminFetch('/admin/forum');
      setThreads(Array.isArray(data?.threads) ? data.threads : []);
      setReplies(Array.isArray(data?.replies) ? data.replies : []);
    } catch (err) { setThreads([]); setReplies([]); setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <PageShell
      title="Community & moderation"
      meta={[`${threads.length} threads`, `${replies.length} replies`, 'Moderation required', 'No automated report queue']}
      description="Forum and community content records. The shipped community has no separate automated report queue exposed here, so moderation is a manual review of published content. Never expose member data outside an authorised review."
      actions={<><AtButton to="/admin/content?tab=forum" variant="quiet" icon={FileText}>Forum content</AtButton><AtButton to="/app/community" variant="outline" icon={Users}>Open community</AtButton><AtButton to="/community" variant="gold" icon={Globe}>Public page</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Users} label="Threads" value={threads.length} note="Member discussions" />
        <AtMetric icon={MessagesSquare} label="Replies" value={replies.length} note="Thread responses" tone="text-[var(--at-green)]" />
        <AtMetric icon={Lock} label="Locked / pinned" value={`${threads.filter((t) => t.locked).length} / ${threads.filter((t) => t.pinned).length}`} note="Moderation flags" tone="text-[var(--at-amber)]" />
        <AtMetric icon={ShieldCheck} label="Report queue" value="Manual" note="No automated endpoint" />
      </div>

      <AtPanel className="mt-4" title="Forum register" sub="Latest member threads, reply counts and moderation flags from the admin API." action={<AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw}>Refresh</AtButton>} flush>
        {loading ? <div className="p-5"><AtProgress value={50} /></div> : error ? <div className="p-5"><AtAlert icon={AlertTriangle} tone="red">{error}</AtAlert></div> : threads.length ? (
          <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
            <table className="at-table min-w-[700px]">
              <thead><tr><th>Thread</th><th>Author</th><th>Replies</th><th>Flags</th><th>Created</th><th className="text-right">Open</th></tr></thead>
              <tbody>{threads.map((thread) => {
                const count = replies.filter((r) => (r.thread || r.threadId) === thread.id).length || Number(thread.replyCount) || 0;
                return (
                  <tr key={thread.id}>
                    <td>
                      <div className="font-semibold text-[var(--at-ink)]">{thread.title || 'Untitled thread'}</div>
                      <div className="mt-0.5 max-w-[320px] truncate text-[10px] text-[var(--at-mut)]">{thread.body || thread.category || 'No preview'}</div>
                    </td>
                    <td className="text-[11px] text-[var(--at-ink-2)]">{thread.authorName || 'Member'}</td>
                    <td className="font-mono text-[10px] text-[var(--at-ink)]">{formatNumber(count)}</td>
                    <td className="space-x-1"><AtBadge tone={thread.pinned ? 'gold' : 'muted'}>{thread.pinned ? 'Pinned' : 'Normal'}</AtBadge><AtBadge tone={thread.locked ? 'amber' : 'muted'}>{thread.locked ? 'Locked' : 'Open'}</AtBadge></td>
                    <td className="font-mono text-[10px] text-[var(--at-mut)]">{String(thread.created || thread.created_at || '').slice(0, 10) || '—'}</td>
                    <td className="text-right"><Link to="/admin/content?tab=forum" className="text-[10px] font-semibold text-[var(--at-gold)] hover:underline">Review</Link></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <AtEmpty icon={Users} title="No forum threads" sub="Threads appear here when members start a discussion." />}
      </AtPanel>

      <div className="mt-3"><AtAlert icon={ShieldCheck} tone="amber"><b className="text-[var(--at-ink)]">Moderation is manual.</b> Review reports through the member-facing moderation flow or the content record. Do not publish member emails, IP addresses or identity documents in the admin portal.</AtAlert></div>
    </PageShell>
  );
}

/* ─── AFFILIATES ─────────────────────────────────────────────────── */
export function AdminAffiliatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await adminFetch('/admin/affiliates')); }
    catch (err) { setData(null); setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || {};
  return (
    <PageShell
      title="Affiliates"
      meta={[`${totals.codes || 0} codes`, `${totals.clicks || 0} clicks`, `${totals.signups || 0} signups`, '15% recurring · TBC settlement']}
      description="Read-only affiliate register. The programme pays 15% recurring commission on eligible referred Premium subscriptions, settled in TBC credits at the published rate. Refunds and chargebacks are removed before payout. No earnings are guaranteed."
      actions={<><AtButton to="/affiliates" variant="quiet" icon={Globe}>Public programme</AtButton><AtButton to="/admin/wallet" variant="outline" icon={Wallet}>Wallet oversight</AtButton><AtButton onClick={load} variant="gold" icon={RefreshCw}>Refresh</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <AtMetric icon={Users} label="Affiliate codes" value={totals.codes || 0} note="Registered partners" />
        <AtMetric icon={Activity} label="Clicks" value={totals.clicks || 0} note="Referral-link loads" />
        <AtMetric icon={BadgeCheck} label="Signups" value={totals.signups || 0} note="Tracked referrals" />
        <AtMetric icon={CircleDollarSign} label="Pending" value={formatUsd(totals.pending || 0, { decimals: 2 })} note="Before refunds/fraud review" tone="text-[var(--at-amber)]" />
        <AtMetric icon={Wallet} label="Paid" value={formatUsd(totals.paid || 0, { decimals: 2 })} note="Commission marked paid" tone="text-[var(--at-green)]" />
      </div>

      <AtPanel className="mt-4" title="Affiliate register" sub="Codes, clicks, signups and commission state. Read-only." flush>
        {loading ? <div className="p-5"><AtProgress value={50} /></div> : error ? <div className="p-5"><AtAlert icon={AlertTriangle} tone="red">{error}</AtAlert></div> : (data?.codes || []).length ? (
          <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
            <table className="at-table min-w-[760px]">
              <thead><tr><th>Code</th><th>Owner</th><th>Clicks</th><th>Signups</th><th>Rate</th><th>Pending</th><th>Paid</th></tr></thead>
              <tbody>{data.codes.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-[11px] font-bold text-[var(--at-gold)]">{row.code}</td>
                  <td><div className="text-[11px] text-[var(--at-ink-2)]">{row.ownerEmail || 'Account'}</div><div className="font-mono text-[9px] text-[var(--at-mut-2)]">{String(row.owner || '').slice(0, 8)}</div></td>
                  <td className="font-mono text-[11px] text-[var(--at-ink)]">{formatNumber(row.clicks)}</td>
                  <td className="font-mono text-[11px] text-[var(--at-ink)]">{formatNumber(row.signups)}</td>
                  <td className="font-mono text-[11px] text-[var(--at-ink-2)]">{Math.round((row.rate || 0.15) * 100)}%</td>
                  <td className="font-mono text-[11px] text-[var(--at-amber)]">{formatUsd(row.pending, { decimals: 2 })}</td>
                  <td className="font-mono text-[11px] text-[var(--at-green)]">{formatUsd(row.paid, { decimals: 2 })}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <AtEmpty icon={Users} title="No affiliate codes" sub="Codes appear here after members register for the referral programme." />}
      </AtPanel>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <AtAlert icon={AlertTriangle} tone="amber"><b className="text-[var(--at-ink)]">No income promise.</b> Commission depends on eligible paid subscriptions, refunds, chargebacks, fraud review and the affiliate terms. TBC settlement is not equity and has no promised market value.</AtAlert>
        <AtAlert icon={Wallet}><b className="text-[var(--at-ink)]">Payouts are member-initiated.</b> This register does not pay, approve or reverse a commission. Wallet and ledger records remain the settlement source.</AtAlert>
      </div>
    </PageShell>
  );
}

/* ─── PUBLIC SITE & LAUNCH ───────────────────────────────────────── */
export function AdminPublicSitePage() {
  const [group, setGroup] = useState('all');
  const [q, setQ] = useState('');
  const groups = useMemo(() => ['all', ...new Set(PUBLIC_SITE_PAGES.map((p) => p.group))], []);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PUBLIC_SITE_PAGES
      .filter((page) => group === 'all' || page.group === group)
      .filter((page) => !needle || `${page.name} ${page.to} ${page.group} ${page.note}`.toLowerCase().includes(needle));
  }, [group, q]);
  const live = PUBLIC_SITE_PAGES.filter((p) => p.status === 'live').length;
  const gated = PUBLIC_SITE_PAGES.filter((p) => p.status === 'gated').length;
  const review = PUBLIC_SITE_PAGES.filter((p) => p.status === 'review').length;
  const launchDone = LAUNCH_CHECKS.filter((c) => c.status === 'done').length;
  const launchPct = Math.round((launchDone / LAUNCH_CHECKS.length) * 100);

  return (
    <PageShell
      title="Public site & launch"
      meta={[`${PUBLIC_SITE_PAGES.length} public routes`, `${live} live`, `${gated} gated`, `Launch ${COMPANY_FACTS.launchDate}`]}
      description="The public route inventory and launch-readiness register. A route being live does not mean an offering, fund, token sale or regulated service is open. Use this page to check public claims, gated pages and launch prerequisites."
      actions={<><AtButton to="/" variant="quiet" icon={Globe}>Open public site</AtButton><AtButton to="/admin/communications" variant="outline" icon={Megaphone}>Communications</AtButton><AtButton to="/admin/company" variant="gold" icon={Building2}>Company Bible</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={Globe} label="Public routes" value={PUBLIC_SITE_PAGES.length} note="Mapped public pages" />
        <AtMetric icon={CheckCircle2} label="Live" value={live} note="Publicly routable" tone="text-[var(--at-green)]" />
        <AtMetric icon={Lock} label="Gated / review" value={gated + review} note={`${gated} gated · ${review} counsel review`} tone="text-[var(--at-amber)]" />
        <AtMetric icon={Sparkles} label="Launch checks" value={`${launchDone}/${LAUNCH_CHECKS.length}`} note={`${launchPct}% recorded complete`} tone="text-[var(--at-gold)]" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--at-mut)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search public pages…" className="at-input !pl-9" />
        </div>
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="at-input max-w-[190px]">
          {groups.map((value) => <option key={value} value={value}>{value === 'all' ? 'All groups' : value}</option>)}
        </select>
        <AtBadge tone="gold">{rows.length} shown</AtBadge>
      </div>

      <AtPanel className="mt-4" title="Public route inventory" sub="Every public route and its status." flush>
        <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
          <table className="at-table min-w-[720px]">
            <thead><tr><th>Page</th><th>Group</th><th>Route</th><th>Status</th><th className="text-right">Open</th></tr></thead>
            <tbody>{rows.map((page) => (
              <tr key={page.id}>
                <td><div className="font-semibold text-[var(--at-ink)]">{page.name}</div><div className="mt-0.5 max-w-[360px] text-[10px] leading-relaxed text-[var(--at-mut)]">{page.note}</div></td>
                <td><AtBadge tone="muted">{page.group}</AtBadge></td>
                <td><span className="font-mono text-[10px] text-[var(--at-ink-2)]">{page.to}</span></td>
                <td><StatusBadge status={page.status} /></td>
                <td className="text-right">{page.to.includes(':') ? <span className="text-[10px] text-[var(--at-mut-2)]">Dynamic</span> : <Link to={page.to} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--at-gold)] hover:underline">Open <ArrowUpRight className="h-3 w-3" /></Link>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </AtPanel>

      <AtPanel className="mt-4" title="Launch readiness" sub="Recorded checks. A pending item is not complete just because it appears here." action={<AtBadge tone="gold">{launchPct}%</AtBadge>}>
        <AtProgress value={launchPct} className="mb-4" />
        <div className="grid gap-2 lg:grid-cols-2">
          {LAUNCH_CHECKS.map((check) => (
            <div key={check.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--at-ink)]">{check.title}</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-[var(--at-mut)]">{check.detail}</div>
                </div>
                <StatusBadge status={check.status} />
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">{check.area} · {check.owner}</div>
            </div>
          ))}
        </div>
      </AtPanel>
    </PageShell>
  );
}

/* ─── COMPLIANCE & GATES ─────────────────────────────────────────── */
export function AdminCompliancePage() {
  const [area, setArea] = useState('all');
  const areas = useMemo(() => ['all', ...new Set(COMPLIANCE_GATES.map((g) => g.area))], []);
  const rows = useMemo(() => COMPLIANCE_GATES.filter((gate) => area === 'all' || gate.area === area), [area]);
  const closed = COMPLIANCE_GATES.filter((g) => ['closed', 'blocked', 'not-filed', 'not-started', 'missing'].includes(g.status)).length;
  const open = COMPLIANCE_GATES.filter((g) => g.status === 'open').length;
  const unverified = COMPLIANCE_GATES.filter((g) => g.status === 'unverified').length;

  return (
    <PageShell
      title="Compliance & gates"
      meta={[`${COMPLIANCE_GATES.length} gates`, `${closed} closed / blocked`, `${open} open`, 'No gate can be opened here']}
      description="The operator-suite gate register. This is an internal checklist, not legal advice, a regulatory approval or a substitute for counsel. No control on this page can open a gate."
      actions={<><AtButton to="/admin/fundraising-documents" variant="quiet" icon={FileCheck2}>Fundraising</AtButton><AtButton to="/admin/tbc" variant="outline" icon={Coins}>TBC</AtButton><AtButton to="/admin/settings" variant="gold" icon={ShieldCheck}>Settings</AtButton></>}
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AtMetric icon={ShieldCheck} label="Registered gates" value={COMPLIANCE_GATES.length} note="Across legal, payments, TBC and records" />
        <AtMetric icon={XCircle} label="Closed / blocked" value={closed} note="Must remain closed until evidence clears" tone="text-[var(--at-red)]" />
        <AtMetric icon={Clock3} label="Open items" value={open} note="Counsel-confirmed records" tone="text-[var(--at-amber)]" />
        <AtMetric icon={AlertTriangle} label="Unverified" value={unverified} note="No acceptance evidence" tone="text-[var(--at-amber)]" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--at-mut)]" />
        <select value={area} onChange={(e) => setArea(e.target.value)} className="at-input max-w-[220px]">
          {areas.map((value) => <option key={value} value={value}>{value === 'all' ? 'All areas' : value}</option>)}
        </select>
        <AtBadge tone="muted">{rows.length} shown</AtBadge>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((gate) => (
          <AtPanel key={gate.id} title={gate.title} sub={`${gate.area} · ${gate.id}`} action={<StatusBadge status={gate.status} />}>
            <p className="text-[11px] leading-relaxed text-[var(--at-ink-2)]">{gate.detail}</p>
          </AtPanel>
        ))}
      </div>

      <div className="mt-4"><AtAlert icon={AlertTriangle} tone="red"><b className="text-[var(--at-ink)]">No regulated activity is open.</b> Public solicitation, payment collection, securities issuance, TBC sale, card issuance and brokerage remain disabled. The fundraising execution gate is locked and no public offering exists.</AtAlert></div>
      <div className="mt-3"><AtAlert icon={FileText}><b className="text-[var(--at-ink)]">Source of truth.</b> The repository register is <span className="font-mono text-[var(--at-gold)]">docs/blocked-items.md</span>. Update it with counsel and provider evidence before changing any status.</AtAlert></div>
    </PageShell>
  );
}
