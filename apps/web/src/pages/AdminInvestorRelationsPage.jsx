import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, FileText, Globe2, Landmark, Loader2,
  Mail, Megaphone, Newspaper, RefreshCw, ShieldCheck, Target, Users,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtMetric, AtPanel, AtProgress, AtTabs,
} from '@/components/AtelierUI';
import { useToast } from '@/hooks/use-toast';
import { investorFetch, useAdminInvestor } from '@/lib/investorApi';
import { formatDate, formatNumber, TB_DOC_CATEGORIES } from '@/lib/investorRelations';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'ipo', label: 'IPO readiness', icon: Target },
  { id: 'financials', label: 'Financial reports', icon: FileText },
  { id: 'documents', label: 'Documents', icon: Globe2 },
  { id: 'access', label: 'Shareholder access', icon: Users },
  { id: 'audience', label: 'Audience & inbox', icon: Mail },
  { id: 'audit', label: 'Audit trail', icon: ShieldCheck },
];

function Field({ label, children, full = false, note }) {
  return (
    <div className={`ir-field ${full ? 'ir-field--full' : ''}`}>
      <label>{label}</label>
      {children}
      {note && <span className="ir-field-note">{note}</span>}
    </div>
  );
}

function useSaver(reload) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (path, body, { method = 'POST', success = 'Saved.', onDone } = {}) => {
    setBusy(true);
    try {
      const result = await investorFetch(path, { method, body, auth: true });
      if (result?.warning) toast({ title: 'Saved with an audit warning', description: result.warning, variant: 'destructive' });
      else toast({ title: success });
      await reload();
      onDone?.(result);
      return result;
    } catch (err) {
      toast({ title: 'Could not save', description: err.message || 'Request failed.', variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, save };
}

function StatusBadge({ status }) {
  const tone = status === 'published' || status === 'approved' || status === 'verified' || status === 'complete' || status === 'confirmed'
    ? 'green'
    : status === 'blocked' || status === 'rejected' || status === 'revoked'
      ? 'red'
      : status === 'pending' || status === 'under_review' || status === 'requested' || status === 'pending_approval'
        ? 'amber'
        : 'muted';
  return <AtBadge tone={tone}>{String(status || '—').replaceAll('_', ' ')}</AtBadge>;
}

function OverviewTab({ data, reload }) {
  const m = data?.metrics || {};
  return (
    <div className="ir-stack-lg">
      <div className="ir-cols-4">
        <AtMetric label="Published announcements" value={m.publishedAnnouncements ?? 0} note={`${m.draftAnnouncements ?? 0} drafts`} />
        <AtMetric label="Approved reports" value={m.approvedReports ?? 0} note={`${m.publishedReports ?? 0} published`} />
        <AtMetric label="Verified shareholders" value={m.verifiedShareholders ?? 0} note={`${m.pendingAccess ?? 0} pending access`} />
        <AtMetric label="Audit chain" value={m.auditChainValid ? 'Valid' : 'Review'} note={`${m.auditEvents ?? 0} events loaded`} tone={m.auditChainValid ? 'text-[var(--at-green)]' : 'text-[var(--at-red)]'} />
      </div>
      {!m.auditChainValid && (
        <AtAlert icon={AlertTriangle} tone="red"><span className="font-bold">Audit chain verification failed or is incomplete.</span> Do not rely on equity records until the chain is reviewed. The API returns the first failures in the audit tab.</AtAlert>
      )}
      <div className="ir-cols-12">
        <div className="ir-span-8">
          <AtPanel eyebrow="Disclosure queue" title="Latest announcements" sub="Draft, published and archived items. Public readers see published items only." action={<AtButton onClick={reload} variant="outline" size="sm" icon={RefreshCw}>Refresh</AtButton>}>
            {(data?.announcements || []).length === 0 ? <AtEmpty icon={Newspaper} title="No announcements" sub="Create a draft in the Announcements tab." /> : (
              <div className="ir-list">
                {data.announcements.slice(0, 8).map((row) => (
                  <div className="ir-list-row" key={row.id}>
                    <div className="ir-list-main"><div className="ir-list-title">{row.title}</div><div className="ir-list-sub">{row.category} · {formatDate(row.created_at)}</div></div>
                    <div className="ir-list-side"><StatusBadge status={row.status} /></div>
                  </div>
                ))}
              </div>
            )}
          </AtPanel>
        </div>
        <div className="ir-span-4">
          <AtPanel eyebrow="Access queue" title="Shareholder verification" sub="Pending requests require identity review.">
            {(data?.shareholders || []).filter((row) => row.access_status === 'requested').length === 0 ? <AtEmpty icon={ShieldCheck} title="No pending requests" sub="New portal requests appear here." /> : (
              <div className="ir-list">
                {data.shareholders.filter((row) => row.access_status === 'requested').slice(0, 6).map((row) => (
                  <div className="ir-list-row" key={row.id}>
                    <div className="ir-list-main"><div className="ir-list-title">{row.legal_name}</div><div className="ir-list-sub">{row.email}</div></div>
                    <div className="ir-list-side"><StatusBadge status={row.access_status} /></div>
                  </div>
                ))}
              </div>
            )}
          </AtPanel>
          <div className="ir-sep" />
          <AtPanel eyebrow="Policy" title="Execution is disabled" sub="This console records and publishes; it does not execute securities.">
            <div className="ir-security-note"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>No share issuance, transfer, trade, vote or token operation is enabled. Equity entries are evidence records only.</span></div>
          </AtPanel>
        </div>
      </div>
      <AtPanel eyebrow="Audit preview" title="Recent equity audit events" sub="Append-only hash-chain events. The full chain is checked on every admin load.">
        {(data?.audit || []).length === 0 ? <AtEmpty icon={ShieldCheck} title="No audit events" sub="The first controlled action will create the chain head." /> : (
          <div className="ir-table-wrap">
            <table className="ir-table">
              <thead><tr><th>Seq</th><th>Action</th><th>Summary</th><th>Actor</th><th>When</th><th>Hash</th></tr></thead>
              <tbody>{data.audit.slice(0, 12).map((row) => <tr key={row.id}><td className="num">{row.seq}</td><td className="strong">{row.action}</td><td>{row.summary}</td><td className="muted">{row.actor_email || '—'}</td><td className="num">{formatDate(row.created_at)}</td><td className="muted font-mono text-[9px]">{String(row.hash || '').slice(0, 14)}…</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </AtPanel>
    </div>
  );
}

function AnnouncementForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const [form, setForm] = useState({ title: '', category: 'Corporate', summary: '', body: '', status: 'draft' });
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/announcements', form, { success: 'Announcement created.' });
    if (result) setForm({ title: '', category: 'Corporate', summary: '', body: '', status: 'draft' });
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New announcement</summary>
      <form onSubmit={submit} className="ir-form-grid">
        <Field label="Title"><input required value={form.title} onChange={update('title')} maxLength={240} /></Field>
        <Field label="Category"><input value={form.category} onChange={update('category')} maxLength={80} /></Field>
        <Field label="Status"><select value={form.status} onChange={update('status')}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        <Field label="Summary" full><textarea value={form.summary} onChange={update('summary')} maxLength={1200} /></Field>
        <Field label="Body" full><textarea value={form.body} onChange={update('body')} /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Megaphone} disabled={busy}>{busy ? 'Creating…' : 'Create announcement'}</AtButton><span className="ir-field-note">Published items are immediately visible through the public API.</span></div>
      </form>
    </details>
  );
}

function AnnouncementsTab({ data, reload }) {
  const { busy, save } = useSaver(reload);
  return (
    <div className="ir-stack-lg">
      <AtPanel eyebrow="Public disclosure" title="Announcements" sub="Draft, review and publish corporate announcements. Public readers see published items only.">
        <AnnouncementForm reload={reload} />
        <div className="ir-sep" />
        {(data?.announcements || []).length === 0 ? <AtEmpty icon={Newspaper} title="No announcements" sub="Create the first announcement above." /> : (
          <div className="ir-admin-list">
            {data.announcements.map((row) => (
              <div className="ir-admin-item" key={row.id}>
                <div className="ir-admin-item-main">
                  <div className="ir-admin-item-title">{row.title}</div>
                  <div className="ir-admin-item-sub">{row.category} · {formatDate(row.created_at)} · {row.is_demo ? 'Demo record' : 'Production record'}</div>
                  {row.summary && <div className="ir-admin-item-sub">{row.summary}</div>}
                </div>
                <div className="ir-admin-inline">
                  <Field label="Status">
                    <select value={row.status} onChange={(e) => save(`/admin/announcements/${row.id}`, { status: e.target.value }, { method: 'PATCH', success: 'Announcement status updated.' })} disabled={busy}>
                      <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                    </select>
                  </Field>
                  <StatusBadge status={row.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </AtPanel>
    </div>
  );
}

function MilestoneRow({ row, reload }) {
  const { busy, save } = useSaver(reload);
  const [status, setStatus] = useState(row.status);
  const [evidence, setEvidence] = useState(row.evidence || '');
  const [owner, setOwner] = useState(row.owner || '');
  const [isPublic, setIsPublic] = useState(Boolean(row.is_public));
  async function saveRow() {
    await save(`/admin/milestones/${row.id}`, { status, evidence, owner, isPublic }, { method: 'PATCH', success: 'IPO milestone updated.' });
  }
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.title}</div>
        <div className="ir-admin-item-sub">{row.phase} · {row.description}</div>
        {row.approved_at && <div className="ir-admin-item-sub text-[var(--at-green)]">Approved by {row.approved_by} · {formatDate(row.approved_at)}</div>}
      </div>
      <div className="ir-admin-inline">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
            <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="complete">Complete</option>
          </select>
        </Field>
        <Field label="Owner"><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Named owner" disabled={busy} /></Field>
        <Field label="Evidence" full><textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Required before this milestone can be complete." disabled={busy} /></Field>
        <label className="ir-check"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public</label>
        <AtButton onClick={saveRow} variant="gold" size="sm" icon={busy ? Loader2 : CheckCircle2} disabled={busy}>Save</AtButton>
      </div>
    </div>
  );
}

function MilestoneForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const [form, setForm] = useState({ phase: 'Preparation', title: '', description: '', status: 'not_started', evidence: '', owner: '', sortOrder: 100, isPublic: true });
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/milestones', form, { success: 'Milestone created.' });
    if (result) setForm({ phase: 'Preparation', title: '', description: '', status: 'not_started', evidence: '', owner: '', sortOrder: 100, isPublic: true });
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New readiness milestone</summary>
      <form onSubmit={submit} className="ir-form-grid">
        <Field label="Title"><input required value={form.title} onChange={update('title')} /></Field>
        <Field label="Phase"><input value={form.phase} onChange={update('phase')} /></Field>
        <Field label="Status"><select value={form.status} onChange={update('status')}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="complete">Complete</option></select></Field>
        <Field label="Sort order"><input type="number" value={form.sortOrder} onChange={update('sortOrder')} /></Field>
        <Field label="Description" full><textarea value={form.description} onChange={update('description')} /></Field>
        <Field label="Evidence" full><textarea value={form.evidence} onChange={update('evidence')} placeholder="Required for complete." /></Field>
        <Field label="Owner"><input value={form.owner} onChange={update('owner')} /></Field>
        <label className="ir-check"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))} /> Public</label>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Target} disabled={busy}>{busy ? 'Creating…' : 'Create milestone'}</AtButton></div>
      </form>
    </details>
  );
}

function IpoTab({ data, reload }) {
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={ShieldCheck} tone="amber"><span className="font-bold">No auto-approval.</span> Complete requires a non-empty evidence record. The API rejects completion without evidence and records the approving operator.</AtAlert>
      <AtPanel eyebrow="Readiness" title="IPO milestones" sub="Edit status, evidence, owner and public visibility. The public page shows the checklist without implying an application or approval.">
        <MilestoneForm reload={reload} />
        <div className="ir-sep" />
        {(data?.milestones || []).length === 0 ? <AtEmpty icon={Target} title="No milestones" sub="Create the first readiness workstream above." /> : (
          <div className="ir-admin-list">{data.milestones.map((row) => <MilestoneRow key={row.id} row={row} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function FinancialForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const empty = {
    periodLabel: '', periodEnd: '', reportType: 'annual', title: '', status: 'draft', auditorStatus: 'unaudited',
    currency: 'USD', revenue: '', operatingExpenses: '', netIncome: '', totalAssets: '', totalLiabilities: '',
    cashFlowOperating: '', shareholdersEquity: '', eps: '', sourceNote: '', documentUrl: '',
  };
  const [form, setForm] = useState(empty);
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/financials', form, { success: 'Financial report created.' });
    if (result) setForm(empty);
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New financial report</summary>
      <form onSubmit={submit} className="ir-form-grid ir-form-grid--3">
        <Field label="Period label"><input required value={form.periodLabel} onChange={update('periodLabel')} placeholder="FY2026" /></Field>
        <Field label="Period end"><input type="date" value={form.periodEnd} onChange={update('periodEnd')} /></Field>
        <Field label="Report type"><select value={form.reportType} onChange={update('reportType')}><option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="monthly">Monthly</option><option value="other">Other</option></select></Field>
        <Field label="Report title" full><input required value={form.title} onChange={update('title')} /></Field>
        <Field label="Status"><select value={form.status} onChange={update('status')}><option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="published">Published</option></select></Field>
        <Field label="Auditor status"><select value={form.auditorStatus} onChange={update('auditorStatus')}><option value="unaudited">Unaudited</option><option value="reviewed">Reviewed</option><option value="audited">Audited</option></select></Field>
        <Field label="Currency"><input value={form.currency} onChange={update('currency')} maxLength={8} /></Field>
        {[['revenue', 'Revenue'], ['operatingExpenses', 'Operating expenses'], ['netIncome', 'Net income'], ['totalAssets', 'Total assets'], ['totalLiabilities', 'Total liabilities'], ['cashFlowOperating', 'Operating cash flow'], ['shareholdersEquity', 'Shareholders’ equity'], ['eps', 'EPS']].map(([key, label]) => (
          <Field key={key} label={label}><input type="number" step="any" value={form[key]} onChange={update(key)} placeholder="Leave blank if not disclosed" /></Field>
        ))}
        <Field label="Source note" full note="Required before approval or publication."><textarea value={form.sourceNote} onChange={update('sourceNote')} placeholder="Identify the accounting record, report or approved workpaper." /></Field>
        <Field label="Document URL" full><input value={form.documentUrl} onChange={update('documentUrl')} placeholder="https://…" /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : FileText} disabled={busy}>{busy ? 'Creating…' : 'Create report'}</AtButton><span className="ir-field-note">Never enter estimates as audited results. The source note and auditor status are part of the public record.</span></div>
      </form>
    </details>
  );
}

function FinancialRow({ row, reload }) {
  const { busy, save } = useSaver(reload);
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.title}</div>
        <div className="ir-admin-item-sub">{row.period_label} · {row.auditor_status} · {row.currency} · {row.approved_by ? `approved by ${row.approved_by}` : 'not approved'}</div>
        {row.source_note && <div className="ir-admin-item-sub">Source: {row.source_note}</div>}
      </div>
      <div className="ir-admin-inline">
        <Field label="Status">
          <select value={row.status} onChange={(e) => save(`/admin/financials/${row.id}`, { status: e.target.value }, { method: 'PATCH', success: 'Report status updated.' })} disabled={busy}>
            <option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </Field>
        <StatusBadge status={row.status} />
      </div>
    </div>
  );
}

function FinancialsTab({ data, reload }) {
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={AlertTriangle} tone="amber"><span className="font-bold">Approved figures only.</span> The public API returns a report only when its status is published and approved_at is set. A report without a source note is rejected.</AtAlert>
      <AtPanel eyebrow="Reporting workflow" title="Financial reports" sub="Create, review and publish reports with an identified source and auditor status.">
        <FinancialForm reload={reload} />
        <div className="ir-sep" />
        {(data?.financials || []).length === 0 ? <AtEmpty icon={FileText} title="No financial reports" sub="Create a draft or approved report above." /> : (
          <div className="ir-admin-list">{data.financials.map((row) => <FinancialRow key={row.id} row={row} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function DocumentForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const empty = { title: '', category: 'Corporate', documentType: 'PDF', summary: '', visibility: 'public', status: 'draft', url: '', version: '1.0', checksumSha256: '', sourceNote: '' };
  const [form, setForm] = useState(empty);
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/documents', form, { success: 'Document created.' });
    if (result) setForm(empty);
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New document</summary>
      <form onSubmit={submit} className="ir-form-grid">
        <Field label="Title" full><input required value={form.title} onChange={update('title')} /></Field>
        <Field label="Category"><select value={form.category} onChange={update('category')}>{TB_DOC_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="File type"><select value={form.documentType} onChange={update('documentType')}><option>PDF</option><option>DOCX</option><option>HTML</option><option>Other</option></select></Field>
        <Field label="Visibility"><select value={form.visibility} onChange={update('visibility')}><option value="public">Public</option><option value="restricted">Restricted</option></select></Field>
        <Field label="Status"><select value={form.status} onChange={update('status')}><option value="draft">Draft</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        <Field label="Version"><input value={form.version} onChange={update('version')} /></Field>
        <Field label="Published URL" full><input value={form.url} onChange={update('url')} placeholder="https://…" /></Field>
        <Field label="Summary" full><textarea value={form.summary} onChange={update('summary')} /></Field>
        <Field label="SHA-256 checksum"><input value={form.checksumSha256} onChange={update('checksumSha256')} placeholder="Optional" /></Field>
        <Field label="Source note"><input value={form.sourceNote} onChange={update('sourceNote')} placeholder="Approval or source reference" /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : FileText} disabled={busy}>{busy ? 'Creating…' : 'Create document'}</AtButton><span className="ir-field-note">Host the approved artifact in controlled storage first, then publish the link. Never publish a private working paper.</span></div>
      </form>
    </details>
  );
}

function DocumentRow({ row, reload }) {
  const { busy, save } = useSaver(reload);
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.title}</div>
        <div className="ir-admin-item-sub">{row.category} · {row.document_type} · v{row.version} · {row.visibility} · {row.url || 'No URL'}</div>
        {row.source_note && <div className="ir-admin-item-sub">{row.source_note}</div>}
      </div>
      <div className="ir-admin-inline">
        <Field label="Status"><select value={row.status} onChange={(e) => save(`/admin/documents/${row.id}`, { status: e.target.value }, { method: 'PATCH', success: 'Document status updated.' })} disabled={busy}><option value="draft">Draft</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        <StatusBadge status={row.status} />
      </div>
    </div>
  );
}

function DocumentsTab({ data, reload }) {
  return (
    <div className="ir-stack-lg">
      <AtPanel eyebrow="Public library" title="Investor documents" sub="Only approved public documents are returned by the public API. Restricted documents remain private.">
        <DocumentForm reload={reload} />
        <div className="ir-sep" />
        {(data?.documents || []).length === 0 ? <AtEmpty icon={FileText} title="No documents" sub="Create the first document above." /> : (
          <div className="ir-admin-list">{data.documents.map((row) => <DocumentRow key={row.id} row={row} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function AccessRow({ row, positions, reload }) {
  const { busy, save } = useSaver(reload);
  const positionCount = positions.filter((p) => p.shareholder_id === row.id && p.status === 'active').length;
  const update = (accessStatus) => save(`/admin/access-requests/${row.id}`, { accessStatus, verificationStatus: accessStatus === 'approved' ? 'verified' : row.verification_status }, { method: 'PATCH', success: 'Shareholder access updated.' });
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.legal_name}</div>
        <div className="ir-admin-item-sub">{row.email} · {row.entity_type} · {row.jurisdiction || 'Jurisdiction not supplied'} · {positionCount} active position(s)</div>
        <div className="ir-admin-item-sub">Requested {formatDate(row.created_at)}{row.verified_by ? ` · Verified by ${row.verified_by} ${formatDate(row.verified_at)}` : ''}</div>
        {row.verification_note && <div className="ir-admin-item-sub">Note: {row.verification_note}</div>}
      </div>
      <div className="ir-admin-inline">
        <StatusBadge status={row.verification_status} />
        <StatusBadge status={row.access_status} />
        <AtButton onClick={() => update('approved')} variant="gold" size="sm" icon={busy ? Loader2 : CheckCircle2} disabled={busy || row.access_status === 'approved'}>Approve</AtButton>
        <AtButton onClick={() => update('revoked')} variant="danger" size="sm" disabled={busy || row.access_status === 'revoked'}>Revoke</AtButton>
      </div>
    </div>
  );
}

function AccessTab({ data, reload }) {
  const { busy, save } = useSaver(reload);
  const [form, setForm] = useState({ legalName: '', email: '', entityType: 'individual', jurisdiction: '', verificationNote: '' });
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/shareholders', form, { success: 'Shareholder record created.' });
    if (result) setForm({ legalName: '', email: '', entityType: 'individual', jurisdiction: '', verificationNote: '' });
  }
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={ShieldCheck} tone="amber"><span className="font-bold">Verify before approving.</span> Approval requires an identity match and an executed ownership record. The portal never executes a transfer, issuance or vote. All decisions are audited.</AtAlert>
      <AtPanel eyebrow="Private register" title="Shareholder access and verification" sub="Only a verified shareholder can see their own positions. No public endpoint returns this table.">
        <details className="ir-admin-form">
          <summary>+ Add a shareholder record</summary>
          <form onSubmit={submit} className="ir-form-grid">
            <Field label="Legal name"><input required value={form.legalName} onChange={update('legalName')} /></Field>
            <Field label="Email"><input type="email" required value={form.email} onChange={update('email')} /></Field>
            <Field label="Holder type"><select value={form.entityType} onChange={update('entityType')}><option value="individual">Individual</option><option value="entity">Entity</option><option value="trust">Trust</option><option value="custodian">Custodian</option><option value="other">Other</option></select></Field>
            <Field label="Jurisdiction"><input value={form.jurisdiction} onChange={update('jurisdiction')} /></Field>
            <Field label="Verification note" full><textarea value={form.verificationNote} onChange={update('verificationNote')} /></Field>
            <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Users} disabled={busy}>{busy ? 'Creating…' : 'Create record'}</AtButton></div>
          </form>
        </details>
        <div className="ir-sep" />
        {(data?.shareholders || []).length === 0 ? <AtEmpty icon={Users} title="No shareholder records" sub="Portal requests and manually created records appear here." /> : (
          <div className="ir-admin-list">{data.shareholders.map((row) => <AccessRow key={row.id} row={row} positions={data.positions || []} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function AudienceTab({ data }) {
  const subscriptions = data?.subscriptions || [];
  const contacts = data?.contacts || [];
  return (
    <div className="ir-stack-lg">
      <div className="ir-cols-12">
        <div className="ir-span-6">
          <AtPanel eyebrow="Investor updates" title="Subscriptions" sub="Confirmed subscribers only receive updates. Pending confirmations are not counted.">
            <div className="ir-cols-2 mb-3">
              <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Confirmed</div><div className="mt-1 font-mono text-xl font-bold">{subscriptions.filter((row) => row.status === 'confirmed').length}</div></div>
              <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Pending</div><div className="mt-1 font-mono text-xl font-bold">{subscriptions.filter((row) => row.status === 'pending').length}</div></div>
            </div>
            {subscriptions.length === 0 ? <AtEmpty icon={Mail} title="No subscriptions" sub="Public subscriptions appear here after consent." /> : (
              <div className="ir-list">{subscriptions.slice(0, 30).map((row) => <div className="ir-list-row" key={row.id}><div className="ir-list-main"><div className="ir-list-title">{row.email}</div><div className="ir-list-sub">{row.name || 'No name'} · {formatDate(row.created_at)}</div></div><div className="ir-list-side"><StatusBadge status={row.status} /></div></div>)}</div>
            )}
          </AtPanel>
        </div>
        <div className="ir-span-6">
          <AtPanel eyebrow="IR inbox" title="Contact requests" sub="Stored messages; email delivery is attempted separately.">
            {contacts.length === 0 ? <AtEmpty icon={Mail} title="No contact requests" sub="New IR messages appear here." /> : (
              <div className="ir-list">{contacts.slice(0, 30).map((row) => <div className="ir-list-row" key={row.id}><div className="ir-list-main"><div className="ir-list-title">{row.name} · {row.inquiry_type}</div><div className="ir-list-sub">{row.email}{row.organization ? ` · ${row.organization}` : ''} · {formatDate(row.created_at)}</div><div className="ir-list-sub">{row.message}</div></div><div className="ir-list-side"><StatusBadge status={row.status} /></div></div>)}</div>
            )}
          </AtPanel>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ data }) {
  const chain = data?.auditChain || { valid: false, checked: 0, failures: [] };
  return (
    <div className="ir-stack-lg">
      <AtPanel eyebrow="Integrity" title="Equity audit chain" sub="Every controlled action appends a SHA-256 hash linked to the previous event." action={<AtBadge tone={chain.valid ? 'green' : 'red'}>{chain.valid ? 'Chain valid' : 'Review required'}</AtBadge>}>
        <div className="ir-cols-3">
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Events checked</div><div className="mt-1 font-mono text-xl font-bold">{chain.checked}</div></div>
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Failures</div><div className="mt-1 font-mono text-xl font-bold">{chain.failures?.length || 0}</div></div>
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Head</div><div className="mt-1 truncate font-mono text-[10px] font-semibold">{chain.head ? `${chain.head.slice(0, 24)}…` : '—'}</div></div>
        </div>
        {chain.failures?.length > 0 && <div className="ir-security-note mt-3"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-red)]" /><span>{chain.failures.map((f) => `Seq ${f.seq}: ${f.error}`).join(' · ')}</span></div>}
        <div className="ir-sep" />
        <div className="ir-table-wrap"><table className="ir-table"><thead><tr><th>Seq</th><th>Action</th><th>Entity</th><th>Summary</th><th>Actor</th><th>When</th><th>Hash</th></tr></thead><tbody>{(data?.audit || []).map((row) => <tr key={row.id}><td className="num">{row.seq}</td><td className="strong">{row.action}</td><td>{row.entity_type}{row.entity_id ? `:${String(row.entity_id).slice(0, 8)}` : ''}</td><td>{row.summary}</td><td className="muted">{row.actor_email || '—'}</td><td className="num">{formatDate(row.created_at)}</td><td className="muted font-mono text-[9px]">{String(row.hash || '').slice(0, 16)}…</td></tr>)}</tbody></table></div>
      </AtPanel>
    </div>
  );
}

export default function AdminInvestorRelationsPage() {
  const { data, loading, error, reload } = useAdminInvestor();
  const [tab, setTab] = useState('overview');
  const metrics = data?.metrics || {};

  return (
    <AdminLayout title="Investor relations control">
      <div className="ir-page">
        <div className="at-pagebar">
          <div className="at-pagebar-main"><div className="at-pagebar-meta"><span>Capital & investor relations</span><span>TB · pre-IPO</span><span>Controlled publication</span></div><h1 className="at-pagebar-title">Investor relations control</h1><p className="at-pagebar-sub">Publish approved disclosures, track IPO readiness and verify shareholder access. No market data, share execution or token operation is enabled.</p></div>
          <div className="at-pagebar-actions"><AtButton onClick={reload} variant="outline" size="sm" icon={RefreshCw} disabled={loading}>Refresh</AtButton><AtButton to="/investors" variant="gold" size="sm" iconRight={Globe2}>View public IR</AtButton></div>
        </div>
        {error && <AtAlert icon={AlertTriangle} tone="red"><div className="flex flex-wrap items-center justify-between gap-2"><span>{error}</span><AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton></div></AtAlert>}
        <div className="ir-tabs-scroll my-4"><AtTabs tabs={TABS.map((item) => ({ ...item, count: item.id === 'access' ? metrics.pendingAccess : undefined }))} active={tab} onChange={setTab} /></div>
        {loading ? <div className="ir-card flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading the investor operations console…</div> : (
          <>
            {tab === 'overview' && <OverviewTab data={data} reload={reload} />}
            {tab === 'announcements' && <AnnouncementsTab data={data} reload={reload} />}
            {tab === 'ipo' && <IpoTab data={data} reload={reload} />}
            {tab === 'financials' && <FinancialsTab data={data} reload={reload} />}
            {tab === 'documents' && <DocumentsTab data={data} reload={reload} />}
            {tab === 'access' && <AccessTab data={data} reload={reload} />}
            {tab === 'audience' && <AudienceTab data={data} />}
            {tab === 'audit' && <AuditTab data={data} />}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
