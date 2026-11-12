import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Briefcase, Building2, Check, ChevronDown, ChevronRight, ClipboardCheck,
  Download, FileText, Globe2, Loader2, Lock, RefreshCw, Scale, Search,
  ShieldCheck, TriangleAlert, Users, Wallet,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtMetric, AtPageBar, AtPanel, AtProgress, AtTabs,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const TABS = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'employer', label: 'Employer readiness', icon: Building2 },
  { id: 'employees', label: 'Employee files', icon: Users },
  { id: 'policies', label: 'Policies & documents', icon: BookOpen },
  { id: 'jurisdictions', label: 'Jurisdictions', icon: Globe2 },
  { id: 'payroll', label: 'Payroll & benefits', icon: Wallet },
];

const STATUS_TONE = {
  complete: 'green',
  in_progress: 'blue',
  blocked: 'red',
  not_started: 'muted',
  not_applicable: 'muted',
  template: 'amber',
  in_review: 'blue',
  adopted: 'green',
};

const STATUS_OPTIONS = ['not_started', 'in_progress', 'complete', 'blocked', 'not_applicable'];
const INPUT = 'at-input w-full';
const LABEL = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--at-mut)]';

function statusLabel(value) {
  return String(value || 'not_started').replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

function ItemStatusEditor({ value, onChange, disabled = false }) {
  return (
    <select className="at-input !py-1.5 text-[10px]" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
    </select>
  );
}

export default function AdminWorkforceCompliancePage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [employerFilter, setEmployerFilter] = useState('all');
  const [employerSearch, setEmployerSearch] = useState('');
  const [expandedEmployer, setExpandedEmployer] = useState('');
  const [employerDraft, setEmployerDraft] = useState(null);
  const [expandedPolicy, setExpandedPolicy] = useState('');
  const [policyDraft, setPolicyDraft] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeFile, setEmployeeFile] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSection, setEmployeeSection] = useState('file');
  const [employeeDraft, setEmployeeDraft] = useState(null);
  const [profileDraft, setProfileDraft] = useState(null);

  const token = () => pb.authStore?.token || '';

  const api = useCallback(async (path, { method = 'GET', body } = {}) => {
    const auth = token();
    if (!auth) throw new Error('Admin session unavailable. Sign in again.');
    const res = await fetch(`${API_SERVER_URL}/workforce${path}`, {
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
      const payload = await api('/admin/overview');
      setData(payload);
      setSelectedEmployee((current) => {
        if (!current) return null;
        return payload.employees?.find((row) => row.email === current.email) || null;
      });
    } catch (err) {
      setError(err?.message || 'Workforce register unavailable');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setEmployeeFile(null);
    setEmployeeLoading(true);
    setEmployeeSection('file');
    setEmployeeDraft(null);
    setProfileDraft(null);
    setError('');
    try {
      const payload = await api(`/admin/employees/${encodeURIComponent(employee.email)}`);
      setEmployeeFile(payload);
      setProfileDraft({
        manager: payload.profile?.manager || '',
        probationEnd: payload.profile?.probationEnd || '',
        employmentType: payload.profile?.employmentType || '',
        workLocation: payload.profile?.workLocation || '',
        hrNotes: payload.profile?.hrNotes || '',
      });
      setSelectedEmployee(payload.employee || employee);
    } catch (err) {
      setError(err?.message || 'Employee file unavailable');
    } finally {
      setEmployeeLoading(false);
    }
  };

  const reloadEmployee = async (email) => {
    if (!email) return;
    try {
      const payload = await api(`/admin/employees/${encodeURIComponent(email)}`);
      setEmployeeFile(payload);
      setSelectedEmployee(payload.employee);
    } catch (err) {
      setError(err?.message || 'Employee file unavailable');
    }
  };

  const saveEmployer = async (id) => {
    if (!employerDraft) return;
    setBusy(`employer:${id}`);
    setError('');
    setNotice('');
    try {
      await api(`/admin/employer/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          status: employerDraft.status,
          evidence: employerDraft.evidence,
          owner: employerDraft.owner,
          dueDate: employerDraft.dueDate,
          note: employerDraft.note,
        },
      });
      setNotice('Employer compliance evidence saved. The register records what you entered; it does not create the underlying approval.');
      setExpandedEmployer('');
      setEmployerDraft(null);
      await load();
    } catch (err) {
      setError(err?.message || 'Employer item could not be saved');
    } finally {
      setBusy('');
    }
  };

  const savePolicy = async (id) => {
    if (!policyDraft) return;
    setBusy(`policy:${id}`);
    setError('');
    setNotice('');
    try {
      await api(`/admin/policies/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: {
          status: policyDraft.status,
          adoptedAt: policyDraft.adoptedAt,
          approvalReference: policyDraft.approvalReference,
          note: policyDraft.note,
        },
      });
      setNotice('Policy status saved. An adopted status requires a real adoption date and approval reference.');
      setExpandedPolicy('');
      setPolicyDraft(null);
      await load();
    } catch (err) {
      setError(err?.message || 'Policy could not be saved');
    } finally {
      setBusy('');
    }
  };

  const saveProfile = async () => {
    if (!selectedEmployee || !profileDraft) return;
    setBusy('profile');
    setError('');
    setNotice('');
    try {
      await api(`/admin/employees/${encodeURIComponent(selectedEmployee.email)}`, {
        method: 'PATCH',
        body: { profile: profileDraft },
      });
      setNotice('Employee management profile saved.');
      await reloadEmployee(selectedEmployee.email);
      await load();
    } catch (err) {
      setError(err?.message || 'Employee profile could not be saved');
    } finally {
      setBusy('');
    }
  };

  const saveEmployeeItem = async (kind, id) => {
    if (!selectedEmployee || !employeeDraft) return;
    setBusy(`employee:${kind}:${id}`);
    setError('');
    setNotice('');
    const body = {
      status: employeeDraft.status,
      reference: employeeDraft.reference,
      note: employeeDraft.note,
    };
    if (kind === 'file') body.itemId = id;
    if (kind === 'onboarding') body.onboardingId = id;
    if (kind === 'offboarding') body.offboardingId = id;
    try {
      await api(`/admin/employees/${encodeURIComponent(selectedEmployee.email)}`, { method: 'PATCH', body });
      setNotice('Employee-file evidence saved.');
      setEmployeeDraft(null);
      await reloadEmployee(selectedEmployee.email);
      await load();
    } catch (err) {
      setError(err?.message || 'Employee-file item could not be saved');
    } finally {
      setBusy('');
    }
  };

  const downloadPack = async () => {
    setBusy('pack');
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${API_SERVER_URL}/workforce/admin/pack.zip`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || `Pack unavailable (${res.status})`);
      }
      downloadBlob(await res.blob(), 'TradingBible-Workforce-Document-Pack.zip');
      setNotice('Workforce document pack downloaded.');
    } catch (err) {
      setError(err?.message || 'Workforce document pack unavailable');
    } finally {
      setBusy('');
    }
  };

  const downloadRegister = async () => {
    setBusy('csv');
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/workforce/admin/register.csv`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadBlob(await res.blob(), 'TradingBible-Workforce-Register.csv');
      setNotice('Workforce register exported as CSV.');
    } catch (err) {
      setError(err?.message || 'Workforce register export failed');
    } finally {
      setBusy('');
    }
  };

  const downloadDocument = async (doc, format) => {
    setBusy(`doc:${doc.id}:${format}`);
    setError('');
    try {
      const res = await fetch(`${API_SERVER_URL}/workforce/admin/documents/${encodeURIComponent(doc.id)}/${format}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || `Document unavailable (${res.status})`);
      }
      const ext = format === 'docx' ? 'docx' : format;
      downloadBlob(await res.blob(), `${doc.title.replaceAll(' ', '-')}.${ext}`);
    } catch (err) {
      setError(err?.message || 'Document unavailable');
    } finally {
      setBusy('');
    }
  };

  const employerById = useMemo(() => Object.fromEntries((data?.employer || []).map((item) => [item.id, item])), [data]);
  const filteredEmployerSections = useMemo(() => {
    const q = employerSearch.trim().toLowerCase();
    return (data ? ['corporate', 'payroll', 'protection', 'tech', 'mgmt'] : []).map((sectionId) => {
      const section = (data?.employer || []).filter((item) => item.sectionId === sectionId);
      const items = section.filter((item) => {
        if (employerFilter !== 'all' && item.status !== employerFilter) return false;
        if (!q) return true;
        return `${item.title} ${item.detail} ${item.evidence} ${item.owner} ${item.note}`.toLowerCase().includes(q);
      });
      return {
        id: sectionId,
        title: section[0]?.sectionTitle || sectionId,
        blurb: section[0]?.sectionBlurb || '',
        total: section.length,
        complete: section.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length,
        items,
      };
    }).filter((section) => section.items.length > 0);
  }, [data, employerFilter, employerSearch]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return (data?.employees || []).filter((employee) => {
      if (!q) return true;
      return `${employee.name} ${employee.email} ${employee.title} ${employee.department} ${employee.jurisdictionLabel} ${employee.manager}`.toLowerCase().includes(q);
    });
  }, [data, employeeSearch]);

  const openEmployerItem = (id) => {
    const item = employerById[id];
    if (!item) return;
    setTab('employer');
    setExpandedEmployer(id);
    setEmployerDraft({ ...item });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const counts = data?.counts || {};
  const employerCounts = counts.employer || {};
  const launchCounts = counts.launch || {};
  const employeeCounts = counts.employees || {};
  const policyCounts = counts.policies || {};

  return (
    <AdminLayout title="Workforce compliance">
      <div className="at-page at-scope at-enter pb-10">
        <AtPageBar
          meta={[
            `${employerCounts.complete || 0}/${employerCounts.total || 0} employer controls`,
            `${employeeCounts.total || 0} employees`,
            `${policyCounts.adopted || 0}/${policyCounts.total || 0} policies adopted`,
            'US · Nigeria · local law',
          ]}
          actions={(
            <>
              <AtButton to="/admin/employees" variant="quiet" icon={Users}>Employee directory</AtButton>
              <AtButton to="/admin/jobs" variant="quiet" icon={Briefcase}>Jobs & hiring</AtButton>
              <AtButton onClick={downloadRegister} disabled={Boolean(busy)} variant="outline" icon={Download}>Export register</AtButton>
              <AtButton onClick={downloadPack} disabled={Boolean(busy)} variant="gold" icon={busy === 'pack' ? Loader2 : FileText}>{busy === 'pack' ? 'Building…' : 'Download document pack'}</AtButton>
              <AtButton onClick={load} disabled={loading} variant="quiet" icon={loading ? Loader2 : RefreshCw}>Refresh</AtButton>
            </>
          )}
        >
          <p className="mt-2 max-w-5xl text-[11px] leading-relaxed text-[var(--at-mut)]">
            The employer and employee control register for TradingBible Holdings, Inc. It covers the company, directors and managers, full-time and
            part-time employees, remote employees and individual contractors. A Delaware registration does not satisfy employment, payroll, tax,
            insurance or workplace obligations in the country or state where a person actually works. The register records evidence and adoption; it
            does not create a legal approval.
          </p>
        </AtPageBar>

        <div className="mt-4 space-y-3">
          <AtAlert icon={Lock} tone="red">
            <b className="text-[var(--at-ink)]">No invented approvals.</b> A green status means an operator recorded a real evidence reference. The
            platform does not create counsel sign-off, an EIN, a payroll registration, an insurance policy, a pension enrolment or a local-law
            conclusion. Do not promise equity, options, bonuses or benefits until the board, plan documents, tax analysis and local law support the
            promise.
          </AtAlert>
          {data?.profile?.workforceModel && (
            <AtAlert icon={Users} tone="blue">
              <b className="text-[var(--at-ink)]">Controlled core team first.</b> {data.profile.workforceModel} Priority open leadership roles:{' '}
              {(data.profile.priorityOpenRoles || []).join(' · ')}. Open roles are not appointments.
            </AtAlert>
          )}
        </div>

        {error && <div className="mt-4"><AtAlert icon={TriangleAlert} tone="red">{error}</AtAlert></div>}
        {notice && <div className="mt-4"><AtAlert icon={Check} tone="green">{notice}</AtAlert></div>}

        <div className="mt-4"><AtTabs tabs={TABS.map((item) => ({
          ...item,
          count: item.id === 'employer' ? employerCounts.total : item.id === 'employees' ? employeeCounts.total : item.id === 'policies' ? policyCounts.total : null,
        }))} active={tab} onChange={setTab} /></div>

        {loading && !data ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="at-card h-40 animate-pulse bg-[var(--at-soft)]" />)}</div>
        ) : !data ? <AtEmpty icon={TriangleAlert} title="Workforce register unavailable" sub="The API did not return the register. Check the admin session and the workforce service." /> : (
          <>
            {tab === 'overview' && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <AtMetric icon={Building2} label="Employer controls" value={`${employerCounts.complete || 0}/${employerCounts.total || 0}`} note={`${employerCounts.blocked || 0} blocked · ${employerCounts.inProgress || 0} in progress`} tone={employerCounts.complete === employerCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-gold)]'} />
                  <AtMetric icon={ClipboardCheck} label="Launch checklist" value={`${launchCounts.complete || 0}/${launchCounts.total || 0}`} note={`${launchCounts.blocked || 0} blocked`} tone={launchCounts.complete === launchCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
                  <AtMetric icon={Users} label="Employee files" value={`${employeeCounts.filesComplete || 0}/${employeeCounts.total || 0}`} note={`${employeeCounts.filesBlocked || 0} blocked · ${employeeCounts.filesInProgress || 0} in progress`} tone={employeeCounts.filesComplete === employeeCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-gold)]'} />
                  <AtMetric icon={BookOpen} label="Policies adopted" value={`${policyCounts.adopted || 0}/${policyCounts.total || 0}`} note={`${policyCounts.template || 0} controlled templates`} tone={policyCounts.adopted === policyCounts.total ? 'text-[var(--at-green)]' : 'text-[var(--at-amber)]'} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
                  <AtPanel title="Employment readiness checklist" sub="The 19 launch-critical controls. Open an item to record evidence and status." action={<AtBadge tone={launchCounts.complete === launchCounts.total ? 'green' : 'amber'}>{launchCounts.complete}/{launchCounts.total}</AtBadge>}>
                    <div className="space-y-1.5">
                      {(data.launch || []).map((item) => (
                        <button key={item.id} type="button" onClick={() => openEmployerItem(item.employerItemId)} className="flex w-full items-start gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-left transition hover:border-[var(--at-gold)]/35">
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.status === 'complete' || item.status === 'not_applicable' ? 'bg-[var(--at-green)]' : item.status === 'blocked' ? 'bg-[var(--at-red)]' : item.status === 'in_progress' ? 'bg-[var(--at-blue)]' : 'bg-[var(--at-mut-2)]'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold text-[var(--at-ink)]">{item.title}</span>
                            <span className="mt-0.5 block text-[9px] text-[var(--at-mut)]">{item.evidence || 'No evidence reference recorded'} · {item.owner || 'Owner not set'}</span>
                          </span>
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-mut-2)]" />
                        </button>
                      ))}
                    </div>
                  </AtPanel>

                  <div className="space-y-4">
                    <AtPanel title="Jurisdiction mix" sub="Where the people actually work, not where the company is incorporated.">
                      <div className="space-y-2">
                        {[
                          ['United States', employeeCounts.us || 0, 'US'],
                          ['Nigeria', employeeCounts.ng || 0, 'NG'],
                          ['Other country', employeeCounts.other || 0, 'INT'],
                          ['Not recorded', employeeCounts.unrecorded || 0, '—'],
                        ].map(([label, value, code]) => (
                          <div key={label} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2">
                            <span className="text-[11px] text-[var(--at-ink-2)]">{label}</span>
                            <span className="flex items-center gap-2"><span className="font-mono text-[10px] text-[var(--at-mut)]">{code}</span><b className="text-[12px] text-[var(--at-ink)]">{value}</b></span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[10px] leading-relaxed text-[var(--at-mut)]">Unrecorded jurisdiction means the employee file cannot be treated as complete. Confirm the work country and state/region before the start date.</p>
                    </AtPanel>
                    <AtPanel title="Company departments" sub="Every department needs an accountable manager, even when the role is vacant.">
                      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {(data.departments || []).map((department) => (
                          <details key={department.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5">
                            <summary className="cursor-pointer text-[11px] font-semibold text-[var(--at-ink)]">{department.name}</summary>
                            <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{department.responsibility}</p>
                          </details>
                        ))}
                      </div>
                    </AtPanel>
                  </div>
                </div>

                <AtPanel title="Operating cadence" sub="The recurring employer obligations that keep the register current." flush>
                  <div className="at-table-wrap !rounded-none !border-0 !bg-transparent">
                    <table className="at-table min-w-[640px]">
                      <thead><tr><th>Frequency</th><th>Employer activity</th></tr></thead>
                      <tbody>{(data.cadence || []).map((row) => <tr key={row.frequency}><td className="whitespace-nowrap font-semibold text-[var(--at-ink)]">{row.frequency}</td><td className="text-[11px] leading-relaxed text-[var(--at-mut)]">{row.activity}</td></tr>)}</tbody>
                    </table>
                  </div>
                </AtPanel>

                <div className="grid gap-4 xl:grid-cols-2">
                  <AtPanel title="Record categories" sub="Restricted HR and employment records.">
                    <div className="space-y-2">{(data.records || []).map((record) => <details key={record.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5"><summary className="cursor-pointer text-[11px] font-semibold text-[var(--at-ink)]">{record.title}</summary><ul className="ml-4 mt-1 list-disc space-y-0.5 text-[10px] leading-relaxed text-[var(--at-mut)]">{record.items.map((item) => <li key={item}>{item}</li>)}</ul></details>)}</div>
                  </AtPanel>
                  <AtPanel title="Policy notes" sub="The boundaries that apply to every document in the pack.">
                    <ul className="space-y-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{(data.notes || []).map((note) => <li key={note} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span>{note}</span></li>)}</ul>
                  </AtPanel>
                </div>

                <AtPanel title="Recent register activity" sub="Evidence and adoption decisions are recorded. The platform does not sign for a lawyer, board or regulator." flush>
                  {data.audit?.length ? <div className="at-table-wrap !rounded-none !border-0 !bg-transparent"><table className="at-table min-w-[640px]"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>{data.audit.map((row) => <tr key={row.id}><td className="whitespace-nowrap font-mono text-[9px] text-[var(--at-mut)]">{formatDate(row.at)}</td><td className="text-[10px] text-[var(--at-ink-2)]">{row.actor}</td><td className="font-mono text-[9px] text-[var(--at-mut)]">{row.action}</td><td className="font-mono text-[9px] text-[var(--at-mut)]">{row.target}</td><td className="text-[10px] text-[var(--at-mut)]">{row.detail}</td></tr>)}</tbody></table></div> : <AtEmpty icon={ClipboardCheck} title="No register activity yet" sub="Record evidence against an employer or employee item to start the audit trail." />}
                </AtPanel>
              </div>
            )}

            {tab === 'employer' && (
              <div className="mt-4 space-y-4">
                <AtPanel title="Employer controls" sub="Grouped by the five employer obligations. A complete item needs a real evidence reference, not just a checkbox." action={<div className="flex flex-wrap gap-1.5"><AtButton onClick={downloadPack} variant="gold" size="sm" icon={FileText}>Document pack</AtButton></div>}>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="at-segmented shrink-0 overflow-x-auto">
                      {['all', 'not_started', 'in_progress', 'blocked', 'complete'].map((value) => <button key={value} type="button" onClick={() => setEmployerFilter(value)} className={employerFilter === value ? 'is-active' : ''}>{value === 'all' ? 'All' : statusLabel(value)}</button>)}
                    </div>
                    <div className="relative min-w-0 flex-1 lg:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
                      <input className={`${INPUT} !pl-9`} value={employerSearch} onChange={(event) => setEmployerSearch(event.target.value)} placeholder="Search control, evidence, owner…" />
                    </div>
                  </div>
                </AtPanel>

                {filteredEmployerSections.map((section) => (
                  <AtPanel key={section.id} title={section.title} sub={`${section.complete}/${section.total} complete`} action={<AtBadge tone={section.complete === section.total ? 'green' : 'amber'}>{section.complete}/{section.total}</AtBadge>}>
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)]">
                          <button type="button" onClick={() => { if (expandedEmployer === item.id) { setExpandedEmployer(''); setEmployerDraft(null); } else { setExpandedEmployer(item.id); setEmployerDraft({ ...item }); } }} className="flex w-full items-start gap-3 p-3 text-left">
                            <span className="mt-0.5"><StatusBadge status={item.status} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-semibold text-[var(--at-ink)]">{item.title}</span>{item.launchCritical && <AtBadge tone="gold">launch-critical</AtBadge>}</span>
                              <span className="mt-1 block text-[10px] leading-relaxed text-[var(--at-mut)]">{item.detail}</span>
                              <span className="mt-1 block text-[9px] text-[var(--at-mut-2)]">Evidence: {item.evidence || 'not recorded'} · Owner: {item.owner || 'not set'}{item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}</span>
                            </span>
                            {expandedEmployer === item.id ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-mut)]" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-mut)]" />}
                          </button>
                          {expandedEmployer === item.id && employerDraft && (
                            <div className="border-t border-[var(--at-line-soft)] p-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <label><span className={LABEL}>Status</span><ItemStatusEditor value={employerDraft.status} onChange={(value) => setEmployerDraft((current) => ({ ...current, status: value }))} /></label>
                                <label><span className={LABEL}>Owner</span><input className={INPUT} value={employerDraft.owner || ''} onChange={(event) => setEmployerDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Accountable owner" /></label>
                                <label><span className={LABEL}>Due date</span><input type="date" className={INPUT} value={employerDraft.dueDate || ''} onChange={(event) => setEmployerDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label>
                                <label><span className={LABEL}>Evidence reference</span><input className={INPUT} value={employerDraft.evidence || ''} onChange={(event) => setEmployerDraft((current) => ({ ...current, evidence: event.target.value }))} placeholder="Document, memo, filing or approval reference" /></label>
                              </div>
                              <label className="mt-2 block"><span className={LABEL}>Internal note</span><textarea rows="2" className={INPUT} value={employerDraft.note || ''} onChange={(event) => setEmployerDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Scope, caveats, local-law confirmation or next action" /></label>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] leading-relaxed text-[var(--at-mut)]">Do not mark complete without a real reference. Complete means the underlying document, filing or approval exists.</p><div className="flex gap-2"><AtButton onClick={() => { setExpandedEmployer(''); setEmployerDraft(null); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveEmployer(item.id)} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === `employer:${item.id}` ? Loader2 : Check}>{busy === `employer:${item.id}` ? 'Saving…' : 'Save evidence'}</AtButton></div></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AtPanel>
                ))}
                {!filteredEmployerSections.length && <AtEmpty icon={Search} title="No controls match" sub="Change the status filter or clear the search." />}
              </div>
            )}

            {tab === 'employees' && (
              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
                <AtPanel title="Employee files" sub={`${employeeCounts.total || 0} hired employees · ${employeeCounts.filesComplete || 0} complete`} action={<AtButton to="/admin/employees" variant="gold" size="sm" icon={Users}>Add employee</AtButton>}>
                  <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" /><input className={`${INPUT} !pl-9`} value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search name, email, role, jurisdiction…" /></div>
                  <div className="mt-3 max-h-[680px] space-y-1.5 overflow-y-auto pr-1">
                    {filteredEmployees.length ? filteredEmployees.map((employee) => (
                      <button key={employee.email} type="button" onClick={() => openEmployee(employee)} className={`w-full rounded-xl border p-3 text-left transition ${selectedEmployee?.email === employee.email ? 'border-[var(--at-gold)]/45 bg-[var(--at-gold-soft)]' : 'border-[var(--at-line-soft)] bg-[var(--at-soft)] hover:border-[var(--at-line)]'}`}>
                        <div className="flex items-start gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] text-[var(--at-gold)]"><Users className="h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5"><span className="truncate text-[11px] font-semibold text-[var(--at-ink)]">{employee.name}</span><StatusBadge status={employee.fileStatus} /></span>
                            <span className="mt-0.5 block truncate text-[9px] text-[var(--at-mut)]">{employee.title} · {employee.department}</span>
                            <span className="mt-1 block text-[9px] text-[var(--at-mut-2)]">{employee.jurisdictionLabel}{employee.workRegion ? ` · ${employee.workRegion}` : ''} · file {employee.fileDone}/{employee.fileTotal} · onboarding {employee.onboardingDone}/{employee.onboardingTotal}</span>
                          </span>
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-mut-2)]" />
                        </div>
                      </button>
                    )) : <AtEmpty icon={Users} title="No employees match" sub="Add an employee from the employee directory, or clear the search. The register only lists hired employees." />}
                  </div>
                </AtPanel>

                <div className="space-y-4">
                  {!selectedEmployee ? <AtPanel title="Select an employee" sub="The full file, onboarding checklist, offboarding checklist and management profile appear here."><AtEmpty icon={ClipboardCheck} title="No employee selected" sub="Choose an employee from the register. The file shows only the items applicable to the recorded work country." /></AtPanel> : employeeLoading ? <AtPanel title={selectedEmployee.name} sub="Loading the controlled employee file…"><div className="flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin text-[var(--at-gold)]" /> Loading employee file…</div></AtPanel> : employeeFile ? (
                    <>
                      <AtPanel title={selectedEmployee.name} sub={`${selectedEmployee.title} · ${selectedEmployee.department} · ${selectedEmployee.email}`} action={<div className="flex flex-wrap gap-1.5"><AtBadge tone={selectedEmployee.jurisdiction === 'US' ? 'blue' : selectedEmployee.jurisdiction === 'NG' ? 'green' : 'amber'}>{selectedEmployee.jurisdictionLabel}</AtBadge><StatusBadge status={selectedEmployee.fileStatus} /></div>}>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <AtMetric icon={ClipboardCheck} label="File completion" value={`${selectedEmployee.fileDone}/${selectedEmployee.fileTotal}`} note={`${selectedEmployee.fileBlocked} blocked`} tone={selectedEmployee.fileComplete ? 'text-[var(--at-green)]' : 'text-[var(--at-gold)]'} />
                          <AtMetric icon={Users} label="Onboarding" value={`${selectedEmployee.onboardingDone}/${selectedEmployee.onboardingTotal}`} note="First-day and first-month controls" />
                          <AtMetric icon={Lock} label="Offboarding" value={`${selectedEmployee.offboardingDone}/${selectedEmployee.offboardingTotal}`} note="Only used at exit" />
                        </div>
                        <div className="mt-3"><ProgressLine done={selectedEmployee.fileDone} total={selectedEmployee.fileTotal} label="Applicable employee-file items" /></div>
                        {selectedEmployee.missing?.length > 0 && <p className="mt-2 text-[10px] leading-relaxed text-[var(--at-amber)]">Next missing: {selectedEmployee.missing.join(' · ')}</p>}
                        {employeeFile.note && <div className="mt-3"><AtAlert icon={TriangleAlert} tone="amber">{employeeFile.note}</AtAlert></div>}
                      </AtPanel>

                      <AtPanel title="Management profile" sub="Stored in the workforce register; sensitive documents stay in the controlled HR file." action={<AtButton onClick={saveProfile} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === 'profile' ? Loader2 : Check}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</AtButton>}>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label><span className={LABEL}>Reporting manager</span><input className={INPUT} value={profileDraft?.manager || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, manager: event.target.value }))} placeholder="Named manager, not a vacant role" /></label>
                          <label><span className={LABEL}>Employment type</span><input className={INPUT} value={profileDraft?.employmentType || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, employmentType: event.target.value }))} placeholder="Full-time, part-time, contractor" /></label>
                          <label><span className={LABEL}>Work location</span><input className={INPUT} value={profileDraft?.workLocation || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, workLocation: event.target.value }))} placeholder="City, state/region, country" /></label>
                          <label><span className={LABEL}>Probation / initial review date</span><input type="date" className={INPUT} value={profileDraft?.probationEnd || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, probationEnd: event.target.value }))} /></label>
                        </div>
                        <label className="mt-2 block"><span className={LABEL}>Internal HR note</span><textarea rows="2" className={INPUT} value={profileDraft?.hrNotes || ''} onChange={(event) => setProfileDraft((current) => ({ ...current, hrNotes: event.target.value }))} placeholder="Do not store identity numbers, medical details or bank details here." /></label>
                      </AtPanel>

                      <AtPanel title="Employee-file controls" sub="Only the items applicable to the recorded jurisdiction are shown." action={<div className="flex gap-1.5">{(['file', 'onboarding', 'offboarding']).map((section) => <button key={section} type="button" onClick={() => { setEmployeeSection(section); setEmployeeDraft(null); }} className={`rounded-lg border px-2 py-1 text-[9px] font-semibold capitalize ${employeeSection === section ? 'border-[var(--at-gold)]/45 bg-[var(--at-gold-soft)] text-[var(--at-gold)]' : 'border-[var(--at-line-soft)] text-[var(--at-mut)]'}`}>{section}</button>)}</div>}>
                        {employeeSection === 'file' && (
                          <div className="space-y-3">
                            {(employeeFile.sections || []).map((section) => (
                              <details key={section.id} open className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)]">
                                <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-[var(--at-ink)]">{section.title} <span className="ml-1 font-mono text-[9px] font-normal text-[var(--at-mut)]">{section.items.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length}/{section.items.length}</span></summary>
                                <div className="space-y-1.5 border-t border-[var(--at-line-soft)] p-2">
                                  {section.items.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-2">
                                      <div className="flex flex-wrap items-start gap-2">
                                        <StatusBadge status={item.status} />
                                        <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{item.title}</div><p className="mt-0.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{item.detail}</p><p className="mt-0.5 text-[8.5px] text-[var(--at-mut-2)]">Reference: {item.reference || 'not recorded'} · {item.owner || 'owner not set'}</p></div>
                                        <button type="button" onClick={() => setEmployeeDraft(employeeDraft?.kind === 'file' && employeeDraft?.id === item.id ? null : { kind: 'file', id: item.id, status: item.status, reference: item.reference || '', note: item.note || '' })} className="rounded-md border border-[var(--at-line-soft)] px-2 py-1 text-[9px] font-semibold text-[var(--at-mut)] hover:text-[var(--at-gold)]">{employeeDraft?.kind === 'file' && employeeDraft?.id === item.id ? 'Close' : 'Update'}</button>
                                      </div>
                                      {employeeDraft?.kind === 'file' && employeeDraft?.id === item.id && (
                                        <div className="mt-2 rounded-lg border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2">
                                          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                                            <label><span className={LABEL}>Status</span><ItemStatusEditor value={employeeDraft.status} onChange={(value) => setEmployeeDraft((current) => ({ ...current, status: value }))} /></label>
                                            <label><span className={LABEL}>Evidence reference</span><input className={INPUT} value={employeeDraft.reference} onChange={(event) => setEmployeeDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Signed document, verification note or file reference" /></label>
                                          </div>
                                          <label className="mt-2 block"><span className={LABEL}>Note</span><input className={INPUT} value={employeeDraft.note} onChange={(event) => setEmployeeDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Scope or caveat" /></label>
                                          <div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setEmployeeDraft(null)} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveEmployeeItem('file', item.id)} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === `employee:file:${item.id}` ? Loader2 : Check}>{busy === `employee:file:${item.id}` ? 'Saving…' : 'Save'}</AtButton></div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                        {employeeSection === 'onboarding' && (
                          <div className="space-y-1.5">
                            {employeeFile.onboarding.map((item) => (
                              <div key={item.id} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2">
                                <div className="flex flex-wrap items-start gap-2"><StatusBadge status={item.status} /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{item.title}</div><p className="mt-0.5 text-[9px] text-[var(--at-mut)]">{item.when} · {item.owner}</p></div><button type="button" onClick={() => setEmployeeDraft(employeeDraft?.kind === 'onboarding' && employeeDraft?.id === item.id ? null : { kind: 'onboarding', id: item.id, status: item.status, reference: item.reference || '', note: item.note || '' })} className="rounded-md border border-[var(--at-line-soft)] px-2 py-1 text-[9px] font-semibold text-[var(--at-mut)] hover:text-[var(--at-gold)]">{employeeDraft?.kind === 'onboarding' && employeeDraft?.id === item.id ? 'Close' : 'Update'}</button></div>
                                {employeeDraft?.kind === 'onboarding' && employeeDraft?.id === item.id && <div className="mt-2 rounded-lg border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2"><div className="grid gap-2 sm:grid-cols-[160px_1fr]"><label><span className={LABEL}>Status</span><ItemStatusEditor value={employeeDraft.status} onChange={(value) => setEmployeeDraft((current) => ({ ...current, status: value }))} /></label><label><span className={LABEL}>Evidence reference</span><input className={INPUT} value={employeeDraft.reference} onChange={(event) => setEmployeeDraft((current) => ({ ...current, reference: event.target.value }))} /></label></div><div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setEmployeeDraft(null)} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveEmployeeItem('onboarding', item.id)} disabled={Boolean(busy)} variant="gold" size="sm">Save</AtButton></div></div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {employeeSection === 'offboarding' && (
                          <div className="space-y-1.5">
                            {employeeFile.offboarding.map((item) => (
                              <div key={item.id} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2">
                                <div className="flex flex-wrap items-start gap-2"><StatusBadge status={item.status} /><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold text-[var(--at-ink)]">{item.title}</div><p className="mt-0.5 text-[9px] text-[var(--at-mut)]">{item.when} · {item.owner}</p></div><button type="button" onClick={() => setEmployeeDraft(employeeDraft?.kind === 'offboarding' && employeeDraft?.id === item.id ? null : { kind: 'offboarding', id: item.id, status: item.status, reference: item.reference || '', note: item.note || '' })} className="rounded-md border border-[var(--at-line-soft)] px-2 py-1 text-[9px] font-semibold text-[var(--at-mut)] hover:text-[var(--at-gold)]">{employeeDraft?.kind === 'offboarding' && employeeDraft?.id === item.id ? 'Close' : 'Update'}</button></div>
                                {employeeDraft?.kind === 'offboarding' && employeeDraft?.id === item.id && <div className="mt-2 rounded-lg border border-[var(--at-gold)]/25 bg-[var(--at-gold-soft)] p-2"><div className="grid gap-2 sm:grid-cols-[160px_1fr]"><label><span className={LABEL}>Status</span><ItemStatusEditor value={employeeDraft.status} onChange={(value) => setEmployeeDraft((current) => ({ ...current, status: value }))} /></label><label><span className={LABEL}>Evidence reference</span><input className={INPUT} value={employeeDraft.reference} onChange={(event) => setEmployeeDraft((current) => ({ ...current, reference: event.target.value }))} /></label></div><div className="mt-2 flex justify-end gap-2"><AtButton onClick={() => setEmployeeDraft(null)} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => saveEmployeeItem('offboarding', item.id)} disabled={Boolean(busy)} variant="gold" size="sm">Save</AtButton></div></div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </AtPanel>
                    </>
                  ) : <AtPanel title={selectedEmployee.name} sub="Employee file"><AtEmpty icon={TriangleAlert} title="Employee file unavailable" sub="Reload the employee or check the workforce API." /></AtPanel>}
                </div>
              </div>
            )}

            {tab === 'policies' && (
              <div className="mt-4 space-y-4">
                <AtPanel title="Policy and document library" sub="A document is not adopted because it exists. Record the approving body, date and reference before treating it as operative." action={<AtButton onClick={downloadPack} disabled={Boolean(busy)} variant="gold" size="sm" icon={FileText}>{busy === 'pack' ? 'Building…' : 'Download full pack'}</AtButton>}>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <AtMetric icon={FileText} label="Documents" value={policyCounts.total || 0} note="Controlled templates and reference packs" />
                    <AtMetric icon={BookOpen} label="Adopted" value={policyCounts.adopted || 0} note="Real adoption reference recorded" tone="text-[var(--at-green)]" />
                    <AtMetric icon={TriangleAlert} label="Templates" value={policyCounts.template || 0} note="Not yet reviewed or adopted" tone="text-[var(--at-amber)]" />
                    <AtMetric icon={ShieldCheck} label="In review" value={policyCounts.inReview || 0} note="Counsel or board review in progress" />
                  </div>
                  {!data.config?.documentsAvailable && <div className="mt-3"><AtAlert icon={TriangleAlert} tone="amber">The generated DOCX/PDF pack has not been built on this API host. The policy records still work. Run <span className="font-mono">node scripts/build-workforce-documents.mjs</span> to build the pack.</AtAlert></div>}
                </AtPanel>

                {(data.policies || []).map((doc) => (
                  <div key={doc.id} className="at-card p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] text-[var(--at-gold)]"><FileText className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-[13px] font-semibold text-[var(--at-ink)]">{doc.title}</h3><StatusBadge status={doc.status} /><AtBadge tone="muted">{doc.version}</AtBadge></div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{doc.appliesTo} · Owner: {doc.owner}</p>
                        <p className="mt-1 text-[9px] text-[var(--at-mut-2)]">{doc.adoptedAt ? `Adopted ${formatDate(doc.adoptedAt)} · ${doc.approvalReference}` : 'No adoption date or approval reference recorded.'}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.config?.documentsAvailable && <><AtButton onClick={() => downloadDocument(doc, 'pdf')} disabled={Boolean(busy)} variant="quiet" size="sm" icon={Download}>PDF</AtButton><AtButton onClick={() => downloadDocument(doc, 'docx')} disabled={Boolean(busy)} variant="quiet" size="sm" icon={Download}>DOCX</AtButton></>}
                        <AtButton onClick={() => { if (expandedPolicy === doc.id) { setExpandedPolicy(''); setPolicyDraft(null); } else { setExpandedPolicy(doc.id); setPolicyDraft({ ...doc }); } }} variant="outline" size="sm" icon={expandedPolicy === doc.id ? ChevronDown : ChevronRight}>{expandedPolicy === doc.id ? 'Close' : 'Record status'}</AtButton>
                      </div>
                    </div>
                    {expandedPolicy === doc.id && policyDraft && (
                      <div className="mt-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <label><span className={LABEL}>Status</span><select className="at-input w-full !py-1.5 text-[10px]" value={policyDraft.status} onChange={(event) => setPolicyDraft((current) => ({ ...current, status: event.target.value }))}>{['template', 'in_review', 'adopted', 'not_applicable'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
                          <label><span className={LABEL}>Adoption date</span><input type="date" className={INPUT} value={policyDraft.adoptedAt || ''} onChange={(event) => setPolicyDraft((current) => ({ ...current, adoptedAt: event.target.value }))} /></label>
                          <label className="sm:col-span-2"><span className={LABEL}>Board / counsel / officer approval reference</span><input className={INPUT} value={policyDraft.approvalReference || ''} onChange={(event) => setPolicyDraft((current) => ({ ...current, approvalReference: event.target.value }))} placeholder="Resolution, engagement letter, memo or signed approval" /></label>
                        </div>
                        <label className="mt-2 block"><span className={LABEL}>Note</span><input className={INPUT} value={policyDraft.note || ''} onChange={(event) => setPolicyDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Scope, local addenda or conditions" /></label>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] text-[var(--at-mut)]">Adopted requires a real date and approval reference. No document is signed by the platform.</p><div className="flex gap-2"><AtButton onClick={() => { setExpandedPolicy(''); setPolicyDraft(null); }} variant="quiet" size="sm">Cancel</AtButton><AtButton onClick={() => savePolicy(doc.id)} disabled={Boolean(busy)} variant="gold" size="sm" icon={busy === `policy:${doc.id}` ? Loader2 : Check}>{busy === `policy:${doc.id}` ? 'Saving…' : 'Save status'}</AtButton></div></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'jurisdictions' && (
              <div className="mt-4 space-y-4">
                <AtAlert icon={Globe2} tone="blue"><b className="text-[var(--at-ink)]">The work location controls.</b> A US employee, a Nigerian employee and a contractor in another country may need different contracts, payroll, tax, pension, insurance and termination processes. This page is a control framework, not a legal opinion for a specific hire.</AtAlert>
                {(data.jurisdictions || []).map((jurisdiction) => (
                  <AtPanel key={jurisdiction.id} title={`${jurisdiction.label}`} sub={jurisdiction.summary} action={<AtBadge tone={jurisdiction.id === 'US' ? 'blue' : jurisdiction.id === 'NG' ? 'green' : 'amber'}>{jurisdiction.flag}</AtBadge>}>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><h4 className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><Building2 className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Employer responsibilities</h4><ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{jurisdiction.employer.map((item) => <li key={item} className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--at-gold)]" /><span>{item}</span></li>)}</ul></div>
                      <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><h4 className="flex items-center gap-2 text-[11px] font-semibold text-[var(--at-ink)]"><Users className="h-3.5 w-3.5 text-[var(--at-blue)]" /> Employee responsibilities</h4><ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-[var(--at-mut)]">{jurisdiction.employee.map((item) => <li key={item} className="flex gap-2"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--at-blue)]" /><span>{item}</span></li>)}</ul></div>
                    </div>
                    <div className="mt-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><p className="text-[10px] leading-relaxed text-[var(--at-mut)]"><b className="text-[var(--at-ink)]">Sources to verify:</b> {jurisdiction.sources.join(' · ')}.</p><p className="mt-2 text-[10px] leading-relaxed text-[var(--at-amber)]">{jurisdiction.caution}</p></div>
                  </AtPanel>
                ))}
              </div>
            )}

            {tab === 'payroll' && (
              <div className="mt-4 space-y-4">
                <AtAlert icon={Wallet} tone="amber"><b className="text-[var(--at-ink)]">Platform credits are not salary.</b> Existing off-chain platform credits are not TBC tokens, not fiat pay and not evidence of a payroll run. Cash compensation must go through a lawful payroll provider or employer-of-record arrangement. No benefit in the proposed tiers below exists until it is approved in writing.</AtAlert>
                <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
                  <AtPanel title="Payroll readiness" sub="The employer must be able to pay lawfully in each country and currency before the start date.">
                    <div className="space-y-2">
                      {(data.employer || []).filter((item) => item.sectionId === 'payroll').map((item) => (
                        <button key={item.id} type="button" onClick={() => openEmployerItem(item.id)} className="flex w-full items-start gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-2.5 text-left hover:border-[var(--at-gold)]/35"><StatusBadge status={item.status} /><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold text-[var(--at-ink)]">{item.title}</span><span className="mt-0.5 block text-[9px] text-[var(--at-mut)]">{item.evidence || 'No evidence reference recorded'}</span></span><ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[var(--at-mut-2)]" /></button>
                      ))}
                    </div>
                  </AtPanel>
                  <AtPanel title="Payroll control" sub="The existing payroll desk handles platform-credit allocations. It is not a fiat payroll system.">
                    <div className="space-y-2 text-[10px] leading-relaxed text-[var(--at-mut)]">
                      <p>The employee directory and payroll roster are separate from this compliance register. Use the employee directory to add an employee and generate the account, staff profile, ID-card data, onboarding record and payroll metadata.</p>
                      <p>Use this register to confirm the lawful payroll provider, tax registrations, pension and insurance obligations for the employee’s actual work location.</p>
                      <p>Do not run a fiat payroll from a platform-credit workflow. Do not promise a TBC allocation as salary.</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2"><AtButton to="/admin/employees" variant="gold" size="sm" icon={Users}>Employee directory</AtButton><AtButton to="/admin/jobs" variant="quiet" size="sm" icon={Briefcase}>Jobs & hiring</AtButton><AtButton onClick={() => openEmployerItem('payroll.provider')} variant="outline" size="sm" icon={ClipboardCheck}>Record payroll provider</AtButton></div>
                  </AtPanel>
                </div>
                <AtPanel title="Proposed benefits framework" sub="Proposed only. Board approval, plan documents, tax analysis and local-law review are required before any promise.">
                  <div className="grid gap-3 lg:grid-cols-3">
                    {(data.benefitTiers || []).map((tier) => (
                      <div key={tier.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                        <div className="flex items-center justify-between gap-2"><h4 className="text-[12px] font-semibold text-[var(--at-ink)]">{tier.name}</h4><AtBadge tone="amber">proposed</AtBadge></div>
                        <p className="mt-1 text-[9px] leading-relaxed text-[var(--at-mut)]">{tier.note}</p>
                        <div className="mt-2 space-y-1">{tier.items.map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-2"><div className="text-[9px] font-semibold text-[var(--at-ink-2)]">{label}</div><div className="mt-0.5 text-[9px] leading-relaxed text-[var(--at-mut)]">{value}</div></div>)}</div>
                      </div>
                    ))}
                  </div>
                </AtPanel>
                <AtPanel title="Payroll and benefits records" sub="Keep these records in a restricted HR or payroll system.">
                  <div className="grid gap-2 sm:grid-cols-3">{(data.records || []).filter((record) => record.id !== 'employer').map((record) => <div key={record.id} className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3"><h4 className="text-[10px] font-semibold text-[var(--at-ink)]">{record.title}</h4><ul className="mt-1 list-disc space-y-0.5 pl-4 text-[9px] leading-relaxed text-[var(--at-mut)]">{record.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>
                </AtPanel>
              </div>
            )}
          </>
        )}

        <div className="mt-4 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-4 text-[10px] leading-relaxed text-[var(--at-mut)]">
          <div className="flex items-start gap-2"><Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span><b className="text-[var(--at-ink)]">Legal boundary.</b> This register is an internal control and record-keeping tool. It is not legal advice, an employment contract, a payroll filing, an insurance policy or a regulator approval. Employment counsel in the relevant jurisdiction must review the documents before use. The platform records the evidence you enter and never creates an approval.</span></div>
        </div>
      </div>
    </AdminLayout>
  );
}
