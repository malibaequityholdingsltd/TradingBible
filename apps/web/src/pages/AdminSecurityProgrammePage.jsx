import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertOctagon, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight,
  ClipboardCheck, Code2, Database, Download, FileText, Fingerprint, Globe2,
  HardDrive, Layers, Loader2, Lock, Plus, RefreshCw, Scale, Search, Server,
  ShieldAlert, ShieldCheck, TriangleAlert, Users, X,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtMetric, AtPageBar, AtPanel, AtProgress, AtTabs,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const TABS = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'controls', label: 'Controls', icon: Layers },
  { id: 'risks', label: 'Risk register', icon: ShieldAlert },
  { id: 'incidents', label: 'Incidents', icon: AlertOctagon },
  { id: 'vendors', label: 'Suppliers', icon: Server },
  { id: 'assurance', label: 'Assurance', icon: ClipboardCheck },
  { id: 'roadmap', label: 'Roadmap & standards', icon: Scale },
  { id: 'documents', label: 'Runbooks', icon: BookOpen },
];

const STATUS_TONE = {
  not_started: 'muted', planned: 'muted', in_progress: 'blue', unverified: 'amber',
  implemented: 'green', verified: 'green', blocked: 'red', not_applicable: 'muted',
  open: 'red', mitigating: 'amber', accepted: 'amber', closed: 'green',
  passed: 'green', failed: 'red', not_run: 'muted', not_assessed: 'muted',
  in_review: 'blue', approved: 'green', rejected: 'red',
  contained: 'amber', recovering: 'blue', complete: 'green',
};

const CONTROL_STATUSES = ['not_started', 'planned', 'in_progress', 'unverified', 'implemented', 'verified', 'blocked', 'not_applicable'];
const RISK_STATUSES = ['open', 'mitigating', 'accepted', 'closed'];
const INCIDENT_STATUSES = ['open', 'contained', 'recovering', 'closed'];
const INCIDENT_SEVERITIES = ['sev1', 'sev2', 'sev3', 'sev4'];
const VENDOR_STATUSES = ['not_assessed', 'in_review', 'approved', 'rejected'];
const ACCEPTANCE_STATUSES = ['not_run', 'passed', 'failed', 'blocked', 'not_applicable'];
const INPUT = 'at-input w-full';
const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut)]';

const LAYER_ICONS = { Globe2, Code2, Fingerprint, Database, Activity, Scale };

function statusLabel(value) {
  return String(value || 'not_started').replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localDateTimeNow() {
  return toLocalInput(new Date().toISOString());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function StatusBadge({ status }) {
  return <AtBadge tone={STATUS_TONE[status] || 'muted'}>{statusLabel(status)}</AtBadge>;
}

function Field({ label, children, className = '' }) {
  return <label className={className}><span className={LABEL}>{label}</span>{children}</label>;
}

function ProgressLine({ done, total, label }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--at-mut)]">
        <span>{label}</span>
        <span className="font-mono">{done}/{total} · {pct}%</span>
      </div>
      <AtProgress value={pct} tone={pct === 100 ? 'green' : 'gold'} className="mt-1" />
    </div>
  );
}

function blankRisk() {
  return { title: '', description: '', category: 'Application security', likelihood: 3, impact: 3, owner: '', treatment: '', nextReview: '', relatedControls: '' };
}

function blankIncident() {
  return {
    title: '', severity: 'sev3', detectedAt: localDateTimeNow(), systems: '', customerDataAffected: 'unknown',
    owner: '', notificationAssessment: '', evidenceReference: '',
  };
}

function blankVendor() {
  return {
    name: '', purpose: '', criticality: 'high', relationship: 'current', dataCategories: '',
    mfa: '', encryption: '', certificationEvidence: '', dpaStatus: '', incidentNotification: '', reviewDate: '', notes: '',
  };
}

function blankTraining() {
  return { person: '', team: '', module: '', completedAt: localDateTimeNow(), evidence: '', notes: '' };
}

function blankReview() {
  return { scope: '', reviewer: '', reviewDate: new Date().toISOString().slice(0, 10), status: 'planned', findings: '', evidence: '' };
}

export default function AdminSecurityProgrammePage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [controlLayer, setControlLayer] = useState('all');
  const [controlStatus, setControlStatus] = useState('all');
  const [controlSearch, setControlSearch] = useState('');
  const [expandedControl, setExpandedControl] = useState('');
  const [controlDraft, setControlDraft] = useState(null);
  const [riskDraft, setRiskDraft] = useState(null);
  const [incidentDraft, setIncidentDraft] = useState(null);
  const [vendorDraft, setVendorDraft] = useState(null);
  const [acceptanceDraft, setAcceptanceDraft] = useState(null);
  const [trainingDraft, setTrainingDraft] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const token = () => pb.authStore?.token || '';

  const api = useCallback(async (path, { method = 'GET', body } = {}) => {
    const auth = token();
    if (!auth) throw new Error('Admin session unavailable. Sign in again.');
    const res = await fetch(`${API_SERVER_URL}/security-programme${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${auth}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(payload?.message || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/admin/overview'));
    } catch (err) {
      setError(err?.message || 'Security programme register unavailable');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, action, success) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (err) {
      setError(err?.message || 'The security register could not save that change.');
      return false;
    } finally {
      setBusy('');
    }
  };

  const saveControl = async (id) => {
    if (!controlDraft) return;
    const ok = await run(`control:${id}`, () => api(`/admin/controls/${encodeURIComponent(id)}`, { method: 'PATCH', body: controlDraft }), 'Control evidence saved. The register records what you entered; it does not create the underlying test or approval.');
    if (ok) { setExpandedControl(''); setControlDraft(null); }
  };

  const saveRisk = async () => {
    if (!riskDraft) return;
    const body = { ...riskDraft, relatedControls: String(riskDraft.relatedControls || '').split(',').map((value) => value.trim()).filter(Boolean) };
    const ok = await run(riskDraft.id ? `risk:${riskDraft.id}` : 'risk:new', () => (
      riskDraft.id
        ? api(`/admin/risks/${encodeURIComponent(riskDraft.id)}`, { method: 'PATCH', body })
        : api('/admin/risks', { method: 'POST', body })
    ), 'Risk register updated.');
    if (ok) { setRiskDraft(null); setShowRiskForm(false); }
  };

  const saveIncident = async () => {
    if (!incidentDraft) return;
    const ok = await run(incidentDraft.id ? `incident:${incidentDraft.id}` : 'incident:new', () => (
      incidentDraft.id
        ? api(`/admin/incidents/${encodeURIComponent(incidentDraft.id)}`, { method: 'PATCH', body: incidentDraft })
        : api('/admin/incidents', { method: 'POST', body: incidentDraft })
    ), 'Incident record updated. Preserve the underlying evidence in controlled storage.');
    if (ok) { setIncidentDraft(null); setShowIncidentForm(false); }
  };

  const saveVendor = async () => {
    if (!vendorDraft) return;
    const ok = await run(vendorDraft.id ? `vendor:${vendorDraft.id}` : 'vendor:new', () => (
      vendorDraft.id
        ? api(`/admin/vendors/${encodeURIComponent(vendorDraft.id)}`, { method: 'PATCH', body: vendorDraft })
        : api('/admin/vendors', { method: 'POST', body: vendorDraft })
    ), 'Supplier record updated. Approval requires a dated assessment reference.');
    if (ok) { setVendorDraft(null); setShowVendorForm(false); }
  };

  const saveAcceptance = async (id) => {
    if (!acceptanceDraft) return;
    const ok = await run(`acceptance:${id}`, () => api(`/admin/acceptance/${encodeURIComponent(id)}`, { method: 'PATCH', body: acceptanceDraft }), 'Acceptance test updated.');
    if (ok) setAcceptanceDraft(null);
  };

  const saveTraining = async () => {
    if (!trainingDraft) return;
    const ok = await run('training:new', () => api('/admin/training', { method: 'POST', body: trainingDraft }), 'Training completion recorded.');
    if (ok) { setTrainingDraft(null); setShowTrainingForm(false); }
  };

  const saveReview = async () => {
    if (!reviewDraft) return;
    const ok = await run('review:new', () => api('/admin/access-reviews', { method: 'POST', body: reviewDraft }), 'Access review recorded.');
    if (ok) { setReviewDraft(null); setShowReviewForm(false); }
  };

  const downloadRegister = async () => {
    setBusy('csv');
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/security-programme/admin/register.csv`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadBlob(await res.blob(), 'TradingBible-Security-Register.csv');
      setNotice('Security register exported as CSV.');
    } catch (err) {
      setError(err?.message || 'Security register export failed');
    } finally {
      setBusy('');
    }
  };

  const downloadDocument = async (doc) => {
    setBusy(`doc:${doc.id}`);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/security-programme/admin/documents/${encodeURIComponent(doc.id)}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || `Document unavailable (${res.status})`);
      }
      downloadBlob(await res.blob(), doc.file);
    } catch (err) {
      setError(err?.message || 'Security document unavailable');
    } finally {
      setBusy('');
    }
  };

  const counts = data?.counts?.controls || {};
  const riskCounts = data?.counts?.risks || {};
  const incidentCounts = data?.counts?.incidents || {};
  const vendorCounts = data?.counts?.vendors || {};
  const acceptanceCounts = data?.counts?.acceptance || {};

  const filteredControls = useMemo(() => {
    const q = controlSearch.trim().toLowerCase();
    return (data?.controls || []).filter((row) => {
      if (controlLayer !== 'all' && row.layerId !== controlLayer) return false;
      if (controlStatus !== 'all' && row.status !== controlStatus) return false;
      if (!q) return true;
      return `${row.title} ${row.detail} ${row.evidence} ${row.owner} ${row.note}`.toLowerCase().includes(q);
    });
  }, [data, controlLayer, controlStatus, controlSearch]);

  const groupedControls = useMemo(() => (data?.layers || []).map((layer) => ({
    ...layer,
    controls: filteredControls.filter((row) => row.layerId === layer.id),
  })).filter((layer) => layer.controls.length), [data, filteredControls]);

  const openControl = (row) => {
    setExpandedControl(row.id);
    setControlDraft({
      status: row.status,
      evidence: row.evidence || '',
      note: row.note || '',
      owner: row.owner || '',
      reviewedAt: row.reviewedAt || '',
      nextReview: row.nextReview || '',
    });
  };

  return (
    <AdminLayout title="Security and resilience">
      <div className="at-page at-scope at-enter pb-10">
        <AtPageBar
          meta={[
            `${counts.complete || 0}/${counts.total || 0} controls evidenced`,
            `${counts.verified || 0} independently verified`,
            `${riskCounts.open || 0} open risks`,
            `${incidentCounts.open || 0} open incidents`,
          ]}
          actions={(
            <>
              <AtButton to="/admin/compliance" variant="quiet" icon={ShieldAlert}>Compliance gates</AtButton>
              <AtButton to="/admin/workforce" variant="quiet" icon={Users}>Workforce</AtButton>
              <AtButton onClick={downloadRegister} disabled={Boolean(busy)} variant="outline" icon={Download}>Export register</AtButton>
              <AtButton onClick={load} disabled={loading} variant="quiet" icon={loading ? Loader2 : RefreshCw}>Refresh</AtButton>
            </>
          )}
        >
          <p className="mt-2 max-w-5xl text-[11px] leading-relaxed text-[var(--at-mut)]">
            The live control register for TradingBible&apos;s information security and resilience programme. It covers the internet edge, application,
            identity, infrastructure, data, AI, detection, response, suppliers and assurance. A control is not complete because a product was purchased
            or a policy file exists. The register records evidence references and decisions; it does not configure Cloudflare, Hostinger, Tailscale,
            Supabase or the host firewall.
          </p>
        </AtPageBar>

        <div className="mt-4 space-y-3">
          <AtAlert icon={Lock} tone="red">
            <b className="text-[var(--at-ink)]">No invented security claims.</b> TradingBible has not recorded an ISO/IEC 27001 certificate, a SOC 2
            attestation, a PCI DSS assessment or a completed independent penetration test. Do not claim those until the independent evidence exists and
            is recorded here. Do not store credentials, private keys, customer records or identity documents in this register.
          </AtAlert>
          <AtAlert icon={TriangleAlert} tone="amber">
            <b className="text-[var(--at-ink)]">Live infrastructure changes require authorization.</b> The hardening runbooks include firewall, SSH, DNS
            and tunnel changes that can lock the company out of production. Keep the Hostinger console and an existing SSH session open, take a recovery
            backup and read the rollback section before applying anything.
          </AtAlert>
        </div>

        {error && <div className="mt-4"><AtAlert icon={TriangleAlert} tone="red">{error}</AtAlert></div>}
        {notice && <div className="mt-4"><AtAlert icon={Check} tone="green">{notice}</AtAlert></div>}

        <div className="mt-4"><AtTabs tabs={TABS.map((item) => ({
          ...item,
          count: item.id === 'controls' ? counts.total
            : item.id === 'risks' ? riskCounts.open
              : item.id === 'incidents' ? incidentCounts.open
                : item.id === 'vendors' ? vendorCounts.total
                  : item.id === 'assurance' ? acceptanceCounts.passed
                    : null,
        }))} active={tab} onChange={setTab} /></div>

        {loading && !data ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="at-card h-40 animate-pulse bg-[var(--at-soft)]" />)}</div>
        ) : !data ? <AtEmpty icon={TriangleAlert} title="Security register unavailable" sub="The API did not return the programme register. Check the admin session and the security service." /> : (
          <>
            {tab === 'overview' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <AtMetric icon={ShieldCheck} label="Controls evidenced" value={`${counts.complete || 0}/${counts.total || 0}`} note={`${counts.readiness || 0}% of the register`} tone={counts.readiness === 100 ? 'text-[var(--at-green)]' : 'text-[var(--at-gold)]'} />
                  <AtMetric icon={ClipboardCheck} label="Verified" value={counts.verified || 0} note={`${counts.criticalComplete || 0}/${counts.critical || 0} critical controls complete`} tone={counts.verified ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
                  <AtMetric icon={ShieldAlert} label="Open risks" value={riskCounts.open || 0} note={`${riskCounts.critical || 0} critical · ${riskCounts.high || 0} high`} tone={riskCounts.critical ? 'text-[var(--at-red)]' : 'text-[var(--at-amber)]'} />
                  <AtMetric icon={ClipboardCheck} label="Acceptance tests" value={`${acceptanceCounts.passed || 0}/${acceptanceCounts.total || 0}`} note={`${acceptanceCounts.failed || 0} failed · ${acceptanceCounts.blocked || 0} blocked`} tone={acceptanceCounts.passed === acceptanceCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
                  <AtPanel title="Launch-critical gaps" sub="Controls with critical priority that do not yet have a recorded implemented or verified status." action={<AtBadge tone={data.criticalGaps.length ? 'red' : 'green'}>{data.criticalGaps.length}</AtBadge>}>
                    {data.criticalGaps.length ? (
                      <div className="space-y-1.5">
                        {data.criticalGaps.slice(0, 12).map((row) => (
                          <button key={row.id} type="button" onClick={() => { setTab('controls'); openControl(row); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex w-full items-start gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-left transition hover:border-[var(--at-gold)]/35">
                            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${row.status === 'blocked' ? 'bg-[var(--at-red)]' : row.status === 'implemented' || row.status === 'verified' ? 'bg-[var(--at-green)]' : row.status === 'in_progress' ? 'bg-[var(--at-blue)]' : 'bg-[var(--at-mut-2)]'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-semibold text-[var(--at-ink)]">{row.title}</span>
                              <span className="mt-0.5 block text-[9px] text-[var(--at-mut)]">{row.evidence || 'No evidence reference recorded'} · {row.owner || 'Owner not set'}</span>
                            </span>
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-mut-2)]" />
                          </button>
                        ))}
                        {data.criticalGaps.length > 12 && <p className="text-[10px] text-[var(--at-mut)]">Plus {data.criticalGaps.length - 12} more critical gaps in the control tab.</p>}
                      </div>
                    ) : <AtEmpty icon={ShieldCheck} title="No critical gaps recorded" sub="Every launch-critical control has an implemented or verified status. Confirm the evidence is real and current." />}
                  </AtPanel>

                  <div className="space-y-4">
                    <AtPanel title="Control layers" sub="Progress across the six security layers.">
                      <div className="space-y-3">
                        {data.layers.map((layer) => {
                          const Icon = LAYER_ICONS[layer.icon] || Layers;
                          return (
                            <div key={layer.id}>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--at-mut)]">
                                <Icon className="h-3.5 w-3.5 text-[var(--at-gold)]" />
                                <span className="flex-1 font-semibold text-[var(--at-ink-2)]">{layer.title}</span>
                                <span className="font-mono">{layer.complete}/{layer.total}</span>
                              </div>
                              <ProgressLine done={layer.complete} total={layer.total} label={`${layer.blocked} blocked`} />
                            </div>
                          );
                        })}
                      </div>
                    </AtPanel>
                    <AtPanel title="Current baseline" sub="Read-only observations recorded on 12 November 2026.">
                      <ul className="space-y-1.5 text-[10px] leading-relaxed text-[var(--at-mut)]">
                        <li>DNS is at Hostinger parking nameservers; no DNSSEC, CAA or enforcing DMARC was observed.</li>
                        <li>The origin responds directly; no Cloudflare/WAF edge is evidenced.</li>
                        <li>Public HTML did not show HSTS, CSP, frame, referrer or permissions headers.</li>
                        <li>API Helmet headers exist, but Nginx duplicates several headers.</li>
                        <li>TLS 1.3 and a valid Let&apos;s Encrypt certificate were observed.</li>
                        <li>Unauthenticated admin API returned 401.</li>
                      </ul>
                      <p className="mt-2 text-[9px] leading-relaxed text-[var(--at-amber)]">These are evidence inputs, not permission to change a live server.</p>
                    </AtPanel>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AtPanel title="Top open risks" sub="Highest score first. Accepted risks require a named decision-maker and review date." action={<AtButton onClick={() => { setTab('risks'); setShowRiskForm(true); setRiskDraft(blankRisk()); }} variant="gold" size="sm" icon={Plus}>Add risk</AtButton>}>
                    <div className="space-y-2">
                      {(data.risks || []).filter((risk) => risk.status !== 'closed').slice(0, 6).map((risk) => (
                        <button key={risk.id} type="button" onClick={() => { setTab('risks'); setRiskDraft({ ...risk, relatedControls: (risk.relatedControls || []).join(', ') }); }} className="flex w-full items-start gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-left hover:border-[var(--at-gold)]/35">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold ${Number(risk.score) >= 20 ? 'bg-[var(--at-red-soft)] text-[var(--at-red)]' : Number(risk.score) >= 12 ? 'bg-[var(--at-amber-soft)] text-[var(--at-amber)]' : 'bg-[var(--at-soft)] text-[var(--at-mut)]'}`}>{risk.score}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[var(--at-ink)]">{risk.title}</span><span className="mt-0.5 block text-[9px] text-[var(--at-mut)]">{risk.category} · {risk.owner || 'Owner not set'} · {statusLabel(risk.status)}</span></span>
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[var(--at-mut-2)]" />
                        </button>
                      ))}
                    </div>
                  </AtPanel>

                  <AtPanel title="Recent register activity" sub="Evidence and decisions are recorded with an actor and timestamp." flush>
                    {data.audit?.length ? <div className="at-table-wrap !rounded-none !border-0 !bg-transparent"><table className="at-table min-w-[620px]"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>{data.audit.slice(0, 12).map((row) => <tr key={row.id}><td className="whitespace-nowrap font-mono text-[9px] text-[var(--at-mut)]">{formatDate(row.at)}</td><td className="text-[10px] text-[var(--at-ink-2)]">{row.actor}</td><td className="font-mono text-[9px] text-[var(--at-mut)]">{row.action}</td><td className="font-mono text-[9px] text-[var(--at-mut)]">{row.target}</td><td className="text-[10px] text-[var(--at-mut)]">{row.detail}</td></tr>)}</tbody></table></div> : <AtEmpty icon={ClipboardCheck} title="No register activity yet" sub="Record evidence against a control, risk or supplier to start the audit trail." />}
                  </AtPanel>
                </div>

                <AtPanel title="Programme boundary" sub="The rules that apply to every entry.">
                  <ul className="grid gap-2 text-[10px] leading-relaxed text-[var(--at-mut)] sm:grid-cols-2">
                    {data.notes.map((note) => <li key={note} className="flex items-start gap-2 rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span>{note}</span></li>)}
                  </ul>
                </AtPanel>
              </div>
            )}

            {tab === 'controls' && (
              <div className="mt-4 space-y-4">
                <AtPanel title="Control register" sub="A complete control needs a real evidence reference. Verified means dated test evidence, not a configuration claim." action={<AtBadge tone={counts.complete === counts.total ? 'green' : 'amber'}>{counts.complete}/{counts.total}</AtBadge>}>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <select className="at-input !w-auto !py-1.5 text-[10px]" value={controlLayer} onChange={(event) => setControlLayer(event.target.value)}>
                      <option value="all">All layers</option>
                      {data.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.title}</option>)}
                    </select>
                    <select className="at-input !w-auto !py-1.5 text-[10px]" value={controlStatus} onChange={(event) => setControlStatus(event.target.value)}>
                      <option value="all">All statuses</option>
                      {CONTROL_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                    <div className="relative min-w-0 flex-1 lg:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
                      <input className={`${INPUT} !pl-9`} value={controlSearch} onChange={(event) => setControlSearch(event.target.value)} placeholder="Search control, evidence, owner…" />
                    </div>
                  </div>
                </AtPanel>

                {groupedControls.map((layer) => (
                  <AtPanel key={layer.id} title={layer.title} sub={`${layer.complete}/${layer.total} complete · ${layer.criticalComplete}/${layer.critical} critical controls complete`} action={<AtBadge tone={layer.complete === layer.total ? 'green' : 'amber'}>{layer.complete}/{layer.total}</AtBadge>}>
                    <div className="space-y-2">
                      {layer.controls.map((row) => (
                        <div key={row.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)]">
                          <button type="button" onClick={() => { if (expandedControl === row.id) { setExpandedControl(''); setControlDraft(null); } else openControl(row); }} className="flex w-full items-start gap-3 p-3 text-left">
                            <span className="mt-0.5"><StatusBadge status={row.status} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold text-[var(--at-ink)]">{row.title}</span>{row.launchCritical && <AtBadge tone="gold">launch-critical</AtBadge>}<AtBadge tone="muted">{row.priority}</AtBadge></span>
                              <span className="mt-1 block text-[10px] leading-relaxed text-[var(--at-mut)]">{row.detail}</span>
                              <span className="mt-1 block text-[9px] text-[var(--at-mut-2)]">Evidence: {row.evidence || 'not recorded'} · Owner: {row.owner || 'not set'}{row.nextReview ? ` · Review ${formatDate(row.nextReview)}` : ''}</span>
                            </span>
                            {expandedControl === row.id ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-mut)]" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-mut)]" />}
                          </button>
                          {expandedControl === row.id && controlDraft && (
                            <div className="border-t border-[var(--at-line-soft)] p-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <Field label="Status"><select className="at-input w-full !py-1.5 text-[10px]" value={controlDraft.status} onChange={(event) => setControlDraft((current) => ({ ...current, status: event.target.value }))}>{CONTROL_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
                                <Field label="Owner"><input className={INPUT} value={controlDraft.owner} onChange={(event) => setControlDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Accountable owner" /></Field>
                                <Field label="Reviewed / verified date"><input type="date" className={INPUT} value={controlDraft.reviewedAt} onChange={(event) => setControlDraft((current) => ({ ...current, reviewedAt: event.target.value }))} /></Field>
                                <Field label="Next review"><input type="date" className={INPUT} value={controlDraft.nextReview} onChange={(event) => setControlDraft((current) => ({ ...current, nextReview: event.target.value }))} /></Field>
                              </div>
                              <Field label="Evidence reference" className="mt-2 block"><textarea rows="2" className={INPUT} value={controlDraft.evidence} onChange={(event) => setControlDraft((current) => ({ ...current, evidence: event.target.value }))} placeholder="Document, test result, configuration export or controlled storage reference" /></Field>
                              <Field label="Internal note" className="mt-2 block"><textarea rows="2" className={INPUT} value={controlDraft.note} onChange={(event) => setControlDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Scope, caveat, exception or next action. A not-applicable control requires an explanation." /></Field>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[9px] leading-relaxed text-[var(--at-mut)]">Evidence is required for implemented and verified. Verified also requires dated test evidence. Do not paste secrets or customer data here.</p>
                                <div className="flex gap-2"><AtButton onClick={() => { setExpandedControl(''); setControlDraft(null); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveControl(row.id)} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === `control:${row.id}` ? Loader2 : Check}>{busy === `control:${row.id}` ? 'Saving…' : 'Save evidence'}</AtButton></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AtPanel>
                ))}
                {!groupedControls.length && <AtEmpty icon={Search} title="No controls match" sub="Change the layer or status filter, or clear the search." />}
              </div>
            )}

            {tab === 'risks' && (
              <div className="mt-4 space-y-4">
                <AtPanel title="Security risk register" sub="Likelihood × impact. An accepted risk requires a named decision-maker, acceptance reference and review date." action={<AtButton onClick={() => { setShowRiskForm((value) => !value); setRiskDraft(blankRisk()); }} variant="gold" size="sm" icon={showRiskForm ? X : Plus}>{showRiskForm ? 'Close form' : 'Add risk'}</AtButton>}>
                  {showRiskForm || riskDraft ? (
                    <div className="space-y-2 rounded-xl border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Title" className="sm:col-span-2"><input className={INPUT} value={riskDraft?.title || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What could happen?" /></Field>
                        <Field label="Category"><input className={INPUT} value={riskDraft?.category || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, category: event.target.value }))} /></Field>
                        <Field label="Owner"><input className={INPUT} value={riskDraft?.owner || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Named accountable owner" /></Field>
                        <Field label="Likelihood (1–5)"><input type="number" min="1" max="5" className={INPUT} value={riskDraft?.likelihood || 3} onChange={(event) => setRiskDraft((current) => ({ ...current, likelihood: event.target.value }))} /></Field>
                        <Field label="Impact (1–5)"><input type="number" min="1" max="5" className={INPUT} value={riskDraft?.impact || 3} onChange={(event) => setRiskDraft((current) => ({ ...current, impact: event.target.value }))} /></Field>
                        <Field label="Status"><select className="at-input w-full !py-1.5 text-[10px]" value={riskDraft?.status || 'open'} onChange={(event) => setRiskDraft((current) => ({ ...current, status: event.target.value }))}>{RISK_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
                        <Field label="Review date"><input type="date" className={INPUT} value={riskDraft?.nextReview || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, nextReview: event.target.value }))} /></Field>
                      </div>
                      <Field label="Description"><textarea rows="2" className={INPUT} value={riskDraft?.description || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, description: event.target.value }))} /></Field>
                      <Field label="Treatment"><textarea rows="2" className={INPUT} value={riskDraft?.treatment || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, treatment: event.target.value }))} placeholder="Reduce, transfer, avoid or accept; include the next action" /></Field>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Related control IDs (comma separated)"><input className={INPUT} value={riskDraft?.relatedControls || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, relatedControls: event.target.value }))} placeholder="internet.waf, infrastructure.rls" /></Field>
                        <Field label="Acceptance reference (only if accepted)"><input className={INPUT} value={riskDraft?.acceptanceReference || ''} onChange={(event) => setRiskDraft((current) => ({ ...current, acceptanceReference: event.target.value }))} placeholder="Board / CEO decision reference" /></Field>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2"><AtButton onClick={() => { setRiskDraft(null); setShowRiskForm(false); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={saveRisk} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy?.startsWith('risk') ? Loader2 : Check}>{busy?.startsWith('risk') ? 'Saving…' : 'Save risk'}</AtButton></div>
                    </div>
                  ) : null}
                  <div className="mt-3 space-y-2">
                    {(data.risks || []).map((risk) => (
                      <div key={risk.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-mono text-[13px] font-bold ${Number(risk.score) >= 20 ? 'bg-[var(--at-red-soft)] text-[var(--at-red)]' : Number(risk.score) >= 12 ? 'bg-[var(--at-amber-soft)] text-[var(--at-amber)]' : 'bg-[var(--at-card-bg)] text-[var(--at-mut)]'}`}>{risk.score}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[var(--at-ink)]">{risk.title}</h3><StatusBadge status={risk.status} /><AtBadge tone="muted">{risk.category}</AtBadge></div>
                            <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{risk.description}</p>
                            <p className="mt-1 text-[9px] text-[var(--at-mut-2)]">L{risk.likelihood} × I{risk.impact} · Owner {risk.owner || 'not set'} · Review {formatDate(risk.nextReview)} · Treatment: {risk.treatment || 'not recorded'}</p>
                            {risk.acceptanceReference && <p className="mt-1 text-[9px] text-[var(--at-amber)]">Accepted by reference: {risk.acceptanceReference}</p>}
                          </div>
                          <AtButton onClick={() => { setShowRiskForm(true); setRiskDraft({ ...risk, relatedControls: (risk.relatedControls || []).join(', ') }); }} variant="outline" size="sm">Update</AtButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </AtPanel>
              </div>
            )}

            {tab === 'incidents' && (
              <div className="mt-4 space-y-4">
                <AtAlert icon={AlertOctagon} tone="red"><b className="text-[var(--at-ink)]">Preserve evidence before rebuilding.</b> The incident register records summaries and references, not credentials, customer records or forensic images. Closing an incident requires a resolution time, evidence reference and recorded lessons.</AtAlert>
                <AtPanel title="Incident log" sub="Severity, containment, notification assessment and lessons." action={<AtButton onClick={() => { setShowIncidentForm((value) => !value); setIncidentDraft(blankIncident()); }} variant="gold" size="sm" icon={showIncidentForm ? X : Plus}>{showIncidentForm ? 'Close form' : 'Open incident'}</AtButton>}>
                  {(showIncidentForm || incidentDraft) && (
                    <div className="mb-3 space-y-2 rounded-xl border border-[var(--at-red)]/25 bg-[var(--at-red-soft)] p-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Title" className="sm:col-span-2"><input className={INPUT} value={incidentDraft?.title || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What happened?" /></Field>
                        <Field label="Severity"><select className="at-input w-full !py-1.5 text-[10px]" value={incidentDraft?.severity || 'sev3'} onChange={(event) => setIncidentDraft((current) => ({ ...current, severity: event.target.value }))}>{INCIDENT_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity.toUpperCase()}</option>)}</select></Field>
                        <Field label="Owner"><input className={INPUT} value={incidentDraft?.owner || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Incident commander" /></Field>
                        <Field label="Detected at"><input type="datetime-local" className={INPUT} value={toLocalInput(incidentDraft?.detectedAt)} onChange={(event) => setIncidentDraft((current) => ({ ...current, detectedAt: event.target.value }))} /></Field>
                        <Field label="Status"><select className="at-input w-full !py-1.5 text-[10px]" value={incidentDraft?.status || 'open'} onChange={(event) => setIncidentDraft((current) => ({ ...current, status: event.target.value }))}>{INCIDENT_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
                        <Field label="Contained at"><input type="datetime-local" className={INPUT} value={toLocalInput(incidentDraft?.containedAt)} onChange={(event) => setIncidentDraft((current) => ({ ...current, containedAt: event.target.value }))} /></Field>
                        <Field label="Resolved at"><input type="datetime-local" className={INPUT} value={toLocalInput(incidentDraft?.resolvedAt)} onChange={(event) => setIncidentDraft((current) => ({ ...current, resolvedAt: event.target.value }))} /></Field>
                        <Field label="Customer data affected"><select className="at-input w-full !py-1.5 text-[10px]" value={incidentDraft?.customerDataAffected || 'unknown'} onChange={(event) => setIncidentDraft((current) => ({ ...current, customerDataAffected: event.target.value }))}><option value="unknown">Unknown / under assessment</option><option value="no">No</option><option value="yes">Yes</option></select></Field>
                      </div>
                      <Field label="Systems affected"><input className={INPUT} value={incidentDraft?.systems || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, systems: event.target.value }))} placeholder="Application, Supabase, host, email, broker integration…" /></Field>
                      <Field label="Notification assessment"><textarea rows="2" className={INPUT} value={incidentDraft?.notificationAssessment || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, notificationAssessment: event.target.value }))} placeholder="Counsel assessment, decision and date. Do not invent a notification decision." /></Field>
                      <Field label="Evidence reference"><input className={INPUT} value={incidentDraft?.evidenceReference || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, evidenceReference: event.target.value }))} placeholder="Controlled incident folder, log reference or case number" /></Field>
                      <Field label="Lessons and corrective actions"><textarea rows="2" className={INPUT} value={incidentDraft?.lessons || ''} onChange={(event) => setIncidentDraft((current) => ({ ...current, lessons: event.target.value }))} placeholder="Required before closing the incident" /></Field>
                      <div className="flex flex-wrap justify-end gap-2"><AtButton onClick={() => { setIncidentDraft(null); setShowIncidentForm(false); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={saveIncident} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy?.startsWith('incident') ? Loader2 : Check}>{busy?.startsWith('incident') ? 'Saving…' : 'Save incident'}</AtButton></div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(data.incidents || []).length ? data.incidents.map((incident) => (
                      <div key={incident.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <AtBadge tone={incident.severity === 'sev1' || incident.severity === 'sev2' ? 'red' : incident.severity === 'sev3' ? 'amber' : 'muted'}>{incident.severity.toUpperCase()}</AtBadge>
                          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[var(--at-ink)]">{incident.title}</h3><StatusBadge status={incident.status} /></div><p className="mt-1 text-[9px] text-[var(--at-mut)]">Detected {formatDateTime(incident.detectedAt)} · Owner {incident.owner || 'not set'} · Customer data: {incident.customerDataAffected}</p><p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{incident.notificationAssessment || 'No notification assessment recorded.'}</p></div>
                          <AtButton onClick={() => { setShowIncidentForm(true); setIncidentDraft({ ...incident }); }} variant="outline" size="sm">Update</AtButton>
                        </div>
                      </div>
                    )) : <AtEmpty icon={AlertOctagon} title="No incidents recorded" sub="An empty log is not proof that no incident occurred. Record suspected events and triage decisions." />}
                  </div>
                </AtPanel>
              </div>
            )}

            {tab === 'vendors' && (
              <div className="mt-4 space-y-4">
                <AtAlert icon={Server} tone="amber"><b className="text-[var(--at-ink)]">A badge is not an assessment.</b> Review the scope, period, exceptions and the exact service covered. Record a dated assessment reference before approving a critical supplier.</AtAlert>
                <AtPanel title="Supplier register" sub="Current, proposed and former providers that may receive data or affect production." action={<AtButton onClick={() => { setShowVendorForm((value) => !value); setVendorDraft(blankVendor()); }} variant="gold" size="sm" icon={showVendorForm ? X : Plus}>{showVendorForm ? 'Close form' : 'Add supplier'}</AtButton>}>
                  {(showVendorForm || vendorDraft) && (
                    <div className="mb-3 space-y-2 rounded-xl border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Supplier name"><input className={INPUT} value={vendorDraft?.name || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
                        <Field label="Purpose"><input className={INPUT} value={vendorDraft?.purpose || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, purpose: event.target.value }))} placeholder="Hosting, database, email, payments…" /></Field>
                        <Field label="Criticality"><select className="at-input w-full !py-1.5 text-[10px]" value={vendorDraft?.criticality || 'high'} onChange={(event) => setVendorDraft((current) => ({ ...current, criticality: event.target.value }))}>{['critical', 'high', 'medium', 'low'].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Relationship"><select className="at-input w-full !py-1.5 text-[10px]" value={vendorDraft?.relationship || 'current'} onChange={(event) => setVendorDraft((current) => ({ ...current, relationship: event.target.value }))}>{['current', 'proposed', 'former'].map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
                        <Field label="Data categories" className="sm:col-span-2"><input className={INPUT} value={vendorDraft?.dataCategories || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, dataCategories: event.target.value }))} placeholder="Customer email, trading data, payment records, source code…" /></Field>
                        <Field label="MFA / SSO"><input className={INPUT} value={vendorDraft?.mfa || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, mfa: event.target.value }))} placeholder="Supported, enforced, admin-only…" /></Field>
                        <Field label="Encryption"><input className={INPUT} value={vendorDraft?.encryption || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, encryption: event.target.value }))} placeholder="In transit / at rest evidence" /></Field>
                        <Field label="Assurance evidence"><input className={INPUT} value={vendorDraft?.certificationEvidence || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, certificationEvidence: event.target.value }))} placeholder="SOC 2 / ISO report reference and scope" /></Field>
                        <Field label="DPA status"><input className={INPUT} value={vendorDraft?.dpaStatus || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, dpaStatus: event.target.value }))} placeholder="Signed, under review, not required…" /></Field>
                        <Field label="Incident notification"><input className={INPUT} value={vendorDraft?.incidentNotification || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, incidentNotification: event.target.value }))} placeholder="Contractual notice period and contact" /></Field>
                        <Field label="Next review"><input type="date" className={INPUT} value={vendorDraft?.reviewDate || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, reviewDate: event.target.value }))} /></Field>
                        <Field label="Assessment status"><select className="at-input w-full !py-1.5 text-[10px]" value={vendorDraft?.assessmentStatus || 'not_assessed'} onChange={(event) => setVendorDraft((current) => ({ ...current, assessmentStatus: event.target.value }))}>{VENDOR_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
                      </div>
                      <Field label="Assessment reference"><input className={INPUT} value={vendorDraft?.assessmentReference || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, assessmentReference: event.target.value }))} placeholder="Required for approval: questionnaire, report or review memo reference" /></Field>
                      <Field label="Notes"><textarea rows="2" className={INPUT} value={vendorDraft?.notes || ''} onChange={(event) => setVendorDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Conditions, exceptions, subcontractors or rejection reason" /></Field>
                      <div className="flex flex-wrap justify-end gap-2"><AtButton onClick={() => { setVendorDraft(null); setShowVendorForm(false); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={saveVendor} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy?.startsWith('vendor') ? Loader2 : Check}>{busy?.startsWith('vendor') ? 'Saving…' : 'Save supplier'}</AtButton></div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(data.vendors || []).length ? data.vendors.map((vendor) => (
                      <div key={vendor.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex flex-wrap items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] text-[var(--at-gold)]"><Server className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[var(--at-ink)]">{vendor.name}</h3><StatusBadge status={vendor.assessmentStatus} /><AtBadge tone={vendor.criticality === 'critical' ? 'red' : vendor.criticality === 'high' ? 'amber' : 'muted'}>{vendor.criticality}</AtBadge></div><p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{vendor.purpose} · {vendor.dataCategories || 'data categories not recorded'}</p><p className="mt-1 text-[9px] text-[var(--at-mut-2)]">MFA {vendor.mfa || 'not recorded'} · Encryption {vendor.encryption || 'not recorded'} · Review {formatDate(vendor.reviewDate)}</p></div><AtButton onClick={() => { setShowVendorForm(true); setVendorDraft({ ...vendor }); }} variant="outline" size="sm">Assess</AtButton></div>
                      </div>
                    )) : <AtEmpty icon={Server} title="No suppliers recorded" sub="Inventory current, proposed and former providers. Start with hosting, database, email, payments, source control and AI." />}
                  </div>
                </AtPanel>
              </div>
            )}

            {tab === 'assurance' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <AtMetric icon={ClipboardCheck} label="Tests passed" value={`${acceptanceCounts.passed || 0}/${acceptanceCounts.total || 0}`} note={`${acceptanceCounts.notRun || 0} not run`} tone={acceptanceCounts.passed === acceptanceCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
                  <AtMetric icon={ShieldAlert} label="Failed" value={acceptanceCounts.failed || 0} note="Requires evidence and remediation" tone={acceptanceCounts.failed ? 'text-[var(--at-red)]' : 'text-[var(--at-green)]'} />
                  <AtMetric icon={TriangleAlert} label="Blocked" value={acceptanceCounts.blocked || 0} note="Requires an explanatory note" tone="text-[var(--at-amber)]" />
                  <AtMetric icon={BookOpen} label="Training records" value={data.training.length} note={`${data.accessReviews.length} access reviews`} />
                </div>

                <AtPanel title="Security acceptance tests" sub="A pass requires tester, date and real evidence. No independent sign-off is recorded yet.">
                  <div className="space-y-2">
                    {data.acceptance.map((test) => (
                      <div key={test.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="mt-0.5"><StatusBadge status={test.status} /></span>
                          <div className="min-w-0 flex-1"><h3 className="text-[11px] font-semibold text-[var(--at-ink)]">{test.title}</h3><p className="mt-0.5 text-[10px] leading-relaxed text-[var(--at-mut)]">{test.expected}</p><p className="mt-1 text-[9px] text-[var(--at-mut-2)]">{test.evidence || 'No evidence reference'} · {test.tester || 'Tester not recorded'} · {formatDateTime(test.testedAt)}</p></div>
                          <AtButton onClick={() => setAcceptanceDraft(acceptanceDraft?.id === test.id ? null : { ...test })} variant="outline" size="sm">{acceptanceDraft?.id === test.id ? 'Close' : 'Record result'}</AtButton>
                        </div>
                        {acceptanceDraft?.id === test.id && (
                          <div className="mt-2 rounded-lg border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2">
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <Field label="Status"><select className="at-input w-full !py-1.5 text-[10px]" value={acceptanceDraft.status} onChange={(event) => setAcceptanceDraft((current) => ({ ...current, status: event.target.value }))}>{ACCEPTANCE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></Field>
                              <Field label="Tester"><input className={INPUT} value={acceptanceDraft.tester || ''} onChange={(event) => setAcceptanceDraft((current) => ({ ...current, tester: event.target.value }))} /></Field>
                              <Field label="Tested at"><input type="datetime-local" className={INPUT} value={toLocalInput(acceptanceDraft.testedAt)} onChange={(event) => setAcceptanceDraft((current) => ({ ...current, testedAt: event.target.value }))} /></Field>
                              <Field label="Evidence reference"><input className={INPUT} value={acceptanceDraft.evidence || ''} onChange={(event) => setAcceptanceDraft((current) => ({ ...current, evidence: event.target.value }))} /></Field>
                            </div>
                            <Field label="Note"><input className={INPUT} value={acceptanceDraft.note || ''} onChange={(event) => setAcceptanceDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Required for blocked or not-applicable" /></Field>
                            <div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setAcceptanceDraft(null)} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveAcceptance(test.id)} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === `acceptance:${test.id}` ? Loader2 : Check}>{busy === `acceptance:${test.id}` ? 'Saving…' : 'Save result'}</AtButton></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AtPanel>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AtPanel title="Training records" sub="Aggregate references belong here; personal records stay in the restricted HR system." action={<AtButton onClick={() => { setShowTrainingForm((value) => !value); setTrainingDraft(blankTraining()); }} variant="gold" size="sm" icon={showTrainingForm ? X : Plus}>{showTrainingForm ? 'Close' : 'Record'}</AtButton>}>
                    {(showTrainingForm || trainingDraft) && (
                      <div className="mb-3 space-y-2 rounded-xl border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Person or team"><input className={INPUT} value={trainingDraft?.person || ''} onChange={(event) => setTrainingDraft((current) => ({ ...current, person: event.target.value }))} placeholder="Person or team" /></Field>
                          <Field label="Module"><input className={INPUT} value={trainingDraft?.module || ''} onChange={(event) => setTrainingDraft((current) => ({ ...current, module: event.target.value }))} /></Field>
                          <Field label="Completed at"><input type="datetime-local" className={INPUT} value={trainingDraft?.completedAt || ''} onChange={(event) => setTrainingDraft((current) => ({ ...current, completedAt: event.target.value }))} /></Field>
                          <Field label="Evidence reference"><input className={INPUT} value={trainingDraft?.evidence || ''} onChange={(event) => setTrainingDraft((current) => ({ ...current, evidence: event.target.value }))} /></Field>
                        </div>
                        <div className="flex justify-end gap-2"><AtButton onClick={() => { setTrainingDraft(null); setShowTrainingForm(false); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={saveTraining} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === 'training:new' ? Loader2 : Check}>Save</AtButton></div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {data.training.length ? data.training.map((row) => <div key={row.id} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{row.module}</div><div className="mt-0.5 text-[9px] text-[var(--at-mut)]">{row.person || row.team} · {formatDate(row.completedAt)} · {row.evidence}</div></div>) : <AtEmpty icon={BookOpen} title="No training records" sub="Record aggregate completion and evidence. Do not store personal training files here." />}
                    </div>
                  </AtPanel>

                  <AtPanel title="Access reviews" sub="Privileged access monthly; all workforce access quarterly." action={<AtButton onClick={() => { setShowReviewForm((value) => !value); setReviewDraft(blankReview()); }} variant="gold" size="sm" icon={showReviewForm ? X : Plus}>{showReviewForm ? 'Close' : 'Record'}</AtButton>}>
                    {(showReviewForm || reviewDraft) && (
                      <div className="mb-3 space-y-2 rounded-xl border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Field label="Scope"><input className={INPUT} value={reviewDraft?.scope || ''} onChange={(event) => setReviewDraft((current) => ({ ...current, scope: event.target.value }))} placeholder="Production, Supabase, DNS…" /></Field>
                          <Field label="Reviewer"><input className={INPUT} value={reviewDraft?.reviewer || ''} onChange={(event) => setReviewDraft((current) => ({ ...current, reviewer: event.target.value }))} /></Field>
                          <Field label="Review date"><input type="date" className={INPUT} value={reviewDraft?.reviewDate || ''} onChange={(event) => setReviewDraft((current) => ({ ...current, reviewDate: event.target.value }))} /></Field>
                          <Field label="Status"><select className="at-input w-full !py-1.5 text-[10px]" value={reviewDraft?.status || 'planned'} onChange={(event) => setReviewDraft((current) => ({ ...current, status: event.target.value }))}><option value="planned">planned</option><option value="complete">complete</option></select></Field>
                        </div>
                        <Field label="Findings"><textarea rows="2" className={INPUT} value={reviewDraft?.findings || ''} onChange={(event) => setReviewDraft((current) => ({ ...current, findings: event.target.value }))} /></Field>
                        <Field label="Evidence reference"><input className={INPUT} value={reviewDraft?.evidence || ''} onChange={(event) => setReviewDraft((current) => ({ ...current, evidence: event.target.value }))} placeholder="Required when complete" /></Field>
                        <div className="flex justify-end gap-2"><AtButton onClick={() => { setReviewDraft(null); setShowReviewForm(false); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={saveReview} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === 'review:new' ? Loader2 : Check}>Save</AtButton></div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {data.accessReviews.length ? data.accessReviews.map((row) => <div key={row.id} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold text-[var(--at-ink)]">{row.scope}</span><StatusBadge status={row.status} /></div><div className="mt-0.5 text-[9px] text-[var(--at-mut)]">{row.reviewer} · {formatDate(row.reviewDate)} · {row.evidence || 'No evidence reference'}</div></div>) : <AtEmpty icon={Fingerprint} title="No access reviews" sub="Record privileged access monthly and all workforce access quarterly." />}
                    </div>
                  </AtPanel>
                </div>
              </div>
            )}

            {tab === 'roadmap' && (
              <div className="mt-4 space-y-4">
                <AtPanel title="90-day implementation plan" sub="The plan begins with a launch-critical assessment, not a full enterprise security department.">
                  <div className="grid gap-3 lg:grid-cols-2">
                    {data.roadmap.map((phase) => (
                      <div key={phase.phase} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex items-center justify-between gap-2"><div><div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--at-gold)]">{phase.phase}</div><h3 className="mt-0.5 text-[12px] font-semibold text-[var(--at-ink)]">{phase.title}</h3></div><AtBadge tone="muted">{phase.outcomes.length} outcomes</AtBadge></div>
                        <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{phase.outcomes.map((item) => <li key={item} className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--at-gold)]" /><span>{item}</span></li>)}</ul>
                      </div>
                    ))}
                  </div>
                </AtPanel>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AtPanel title="Standards" sub="Recognised frameworks, not a company-only checklist.">
                    <div className="space-y-2">{data.standards.map((row) => <div key={row.standard} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{row.standard}</div><p className="mt-0.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{row.application}</p></div>)}</div>
                  </AtPanel>
                  <AtPanel title="Roles" sub="Initially, some responsibilities may be contracted to qualified specialists.">
                    <div className="space-y-2">{data.roles.map((row) => <div key={row.role} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{row.role}</div><p className="mt-0.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{row.responsibility}</p></div>)}</div>
                  </AtPanel>
                </div>

                <AtPanel title="Technology shortlist" sub="Proposed purchasing and implementation shortlist, not a claim that any product is installed." flush>
                  <div className="at-table-wrap !rounded-none !border-0 !bg-transparent"><table className="at-table min-w-[760px]"><thead><tr><th>Area</th><th>Candidate</th><th>Priority</th><th>Status</th><th>Note</th></tr></thead><tbody>{data.stack.map((row) => <tr key={row.id}><td className="text-[10px] text-[var(--at-ink-2)]">{row.area}</td><td className="text-[10px] font-semibold text-[var(--at-ink)]">{row.product}</td><td><AtBadge tone={row.priority === 'critical' ? 'red' : row.priority === 'high' ? 'amber' : 'muted'}>{row.priority}</AtBadge></td><td><StatusBadge status={row.status === 'current' ? 'implemented' : 'not_started'} /></td><td className="text-[9px] leading-relaxed text-[var(--at-mut)]">{row.note}</td></tr>)}</tbody></table></div>
                </AtPanel>

                <AtPanel title="Planning budget" sub="Planning ranges in USD, not quotations or approved spend." flush>
                  <div className="at-table-wrap !rounded-none !border-0 !bg-transparent"><table className="at-table min-w-[620px]"><thead><tr><th>Area</th><th>Planning allowance</th><th>Note</th></tr></thead><tbody>{data.budget.map((row) => <tr key={row.area}><td className="text-[10px] font-semibold text-[var(--at-ink)]">{row.area}</td><td className="whitespace-nowrap font-mono text-[10px] text-[var(--at-gold)]">{row.planning}</td><td className="text-[9px] leading-relaxed text-[var(--at-mut)]">{row.note}</td></tr>)}</tbody></table></div>
                </AtPanel>
              </div>
            )}

            {tab === 'documents' && (
              <div className="mt-4 space-y-4">
                <AtAlert icon={BookOpen} tone="blue"><b className="text-[var(--at-ink)]">Controlled programme library.</b> These documents explain the design and the operating procedures. They do not replace a dated test, a management adoption decision or an independent assessment. The live evidence state is in the controls and assurance tabs.</AtAlert>
                <AtPanel title="Security documents" sub={`${data.documents.filter((doc) => doc.available).length}/${data.documents.length} documents available on this API host.`}>
                  <div className="grid gap-2 lg:grid-cols-2">
                    {data.documents.map((doc) => (
                      <div key={doc.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] text-[var(--at-gold)]"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[11px] font-semibold text-[var(--at-ink)]">{doc.title}</h3><AtBadge tone={doc.available ? 'green' : 'muted'}>{doc.available ? 'available' : 'not built'}</AtBadge></div><p className="mt-0.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{doc.summary}</p><p className="mt-1 font-mono text-[8px] text-[var(--at-mut-2)]">{doc.file}</p></div>{doc.available && <AtButton onClick={() => downloadDocument(doc)} disabled={Boolean(busy)} variant="quiet" size="sm" icon={busy === `doc:${doc.id}` ? Loader2 : Download}>MD</AtButton>}</div>
                      </div>
                    ))}
                  </div>
                </AtPanel>
                <AtPanel title="Evidence and runbooks" sub="Operational references for the next review.">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><HardDrive className="h-4 w-4 text-[var(--at-gold)]" /> Public baseline evidence</div><p className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]">Header, DNS and TLS observations from 12 November 2026 are stored in <span className="font-mono">docs/security/evidence/</span>. Re-run the read-only checks after any edge or DNS change.</p></div>
                    <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><Database className="h-4 w-4 text-[var(--at-gold)]" /> Supabase RLS audit</div><p className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]">Run <span className="font-mono">supabase/security/rls-audit.sql</span> read-only, record the output reference, and test tenant isolation separately. Do not apply remediation SQL to production without a staging test.</p></div>
                    <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><Globe2 className="h-4 w-4 text-[var(--at-gold)]" /> Edge and firewall templates</div><p className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]"><span className="font-mono">deploy/security/</span> contains reviewed Nginx, UFW, SSH, Cloudflare Tunnel and Hostinger firewall templates. They are not applied automatically.</p></div>
                    <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><ShieldCheck className="h-4 w-4 text-[var(--at-gold)]" /> Repository preflight</div><p className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]">Run <span className="font-mono">npm run security:audit</span> before deployment. It is a fast preflight, not a replacement for dependency scanning, SAST, DAST or an independent penetration test.</p></div>
                  </div>
                </AtPanel>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
