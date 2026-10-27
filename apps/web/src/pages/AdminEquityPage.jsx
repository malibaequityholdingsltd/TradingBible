import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Coins, FileText, Gavel,
  Landmark, Layers, Loader2, LockKeyhole, Plus, RefreshCw, ShieldCheck, Users,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPanel,
} from '@/components/AtelierUI';
import { CapAdminHead, CapKpiGrid, CapTabs } from '@/components/CapitalUI';
import { useToast } from '@/hooks/use-toast';
import { investorFetch, useAdminInvestor } from '@/lib/investorApi';
import { formatDate, formatNumber } from '@/lib/investorRelations';

const TABS = [
  { id: 'overview', label: 'Equity overview', icon: BarChart3 },
  { id: 'captable', label: 'Cap table', icon: Layers },
  { id: 'proposals', label: 'Proposals & approvals', icon: Gavel },
  { id: 'classes', label: 'Share classes', icon: Coins },
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
  const tone = ['authorized', 'approved', 'executed', 'active', 'verified'].includes(status) ? 'green'
    : ['rejected', 'revoked', 'cancelled', 'blocked'].includes(status) ? 'red'
      : ['pending_approval', 'proposed', 'under_review', 'requested'].includes(status) ? 'amber'
        : 'muted';
  return <AtBadge tone={tone}>{String(status || '—').replaceAll('_', ' ')}</AtBadge>;
}

function OverviewTab({ data }) {
  const m = data?.metrics || {};
  const classes = data?.shareClasses || [];
  const active = (data?.positions || []).filter((row) => row.status === 'active');
  const authorized = classes.reduce((sum, row) => sum + (Number(row.authorized_shares) || 0), 0);
  const issued = classes.reduce((sum, row) => sum + (Number(row.issued_shares) || 0), 0);
  const outstanding = classes.reduce((sum, row) => sum + (Number(row.outstanding_shares) || 0), 0);
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={LockKeyhole} tone="amber"><span className="font-bold">Evidence and approval only.</span> This console records executed corporate decisions. It does not mint shares, move certificates, execute a transfer, connect to a transfer agent or enable a trade.</AtAlert>
      <CapKpiGrid items={[
        { label: 'Authorized shares', value: formatNumber(authorized), note: 'Across recorded classes' },
        { label: 'Issued shares', value: formatNumber(issued), note: 'Company records only' },
        { label: 'Outstanding shares', value: formatNumber(outstanding), note: 'Not a public market figure' },
        { label: 'Active positions', value: String(active.length), note: `${m.pendingProposals ?? 0} proposal(s) awaiting decision`, tone: 'gold' },
      ]} />
      <div className="ir-cols-12">
        <div className="ir-span-8">
          <AtPanel eyebrow="Capital register" title="Share classes" sub="Authorized classes and recorded figures.">
            {classes.length === 0 ? <AtEmpty icon={Coins} title="No share classes" sub="Create a proposed class in the Share classes tab. Authorized status requires an effective date and approving authority." /> : (
              <div className="ir-table-wrap"><table className="ir-table"><thead><tr><th>Class</th><th>Name</th><th>Authorized</th><th>Issued</th><th>Outstanding</th><th>Status</th><th>Public</th></tr></thead><tbody>{classes.map((row) => <tr key={row.id}><td className="strong">{row.class_code}</td><td>{row.name}</td><td className="num">{formatNumber(row.authorized_shares)}</td><td className="num">{formatNumber(row.issued_shares)}</td><td className="num">{formatNumber(row.outstanding_shares)}</td><td><StatusBadge status={row.status} /></td><td>{row.is_public ? <AtBadge tone="green">Public</AtBadge> : <AtBadge tone="muted">Private</AtBadge>}</td></tr>)}</tbody></table></div>
            )}
          </AtPanel>
        </div>
        <div className="ir-span-4">
          <AtPanel eyebrow="Controls" title="No execution path" sub="Operational boundaries.">
            <div className="ir-list">
              {[['Share issuance', 'Disabled'], ['Transfers', 'Disabled'], ['Trading', 'Disabled'], ['Voting execution', 'Disabled'], ['Transfer agent', 'Not connected'], ['Public quote', 'Not available']].map(([label, value]) => (
                <div className="ir-list-row !py-2" key={label}><div className="ir-list-main"><div className="ir-list-sub !mt-0">{label}</div></div><div className="ir-list-side"><AtBadge tone={value === 'Disabled' ? 'amber' : 'muted'}>{value}</AtBadge></div></div>
              ))}
            </div>
            <div className="ir-security-note mt-3"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>Every material action is appended to the hash-chained equity audit stream.</span></div>
          </AtPanel>
        </div>
      </div>
      <AtPanel eyebrow="Recent activity" title="Equity audit events" sub="Newest first.">
        {(data?.audit || []).length === 0 ? <AtEmpty icon={ShieldCheck} title="No audit events" sub="The first recorded action will create the chain head." /> : (
          <div className="ir-table-wrap"><table className="ir-table"><thead><tr><th>Seq</th><th>Action</th><th>Summary</th><th>Actor</th><th>When</th></tr></thead><tbody>{data.audit.slice(0, 10).map((row) => <tr key={row.id}><td className="num">{row.seq}</td><td className="strong">{row.action}</td><td>{row.summary}</td><td className="muted">{row.actor_email || '—'}</td><td className="num">{formatDate(row.created_at)}</td></tr>)}</tbody></table></div>
        )}
      </AtPanel>
    </div>
  );
}

function PositionForm({ data, reload }) {
  const { busy, save } = useSaver(reload);
  const empty = { shareholderId: '', shareClassId: '', shares: '', certificateNumber: '', issuedDate: '', vestingStart: '', vestingCliffMonths: '', vestingMonths: '', transferRestrictions: '', sourceReference: '', approvedBy: '', proposalId: '', ownershipPct: '' };
  const [form, setForm] = useState(empty);
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const verified = (data?.shareholders || []).filter((row) => row.verification_status === 'verified');
  const classes = (data?.shareClasses || []).filter((row) => row.status !== 'retired');
  const proposals = (data?.proposals || []).filter((row) => row.status === 'approved' || row.status === 'executed');
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/positions', form, { success: 'Position evidence recorded.' });
    if (result) setForm(empty);
  }
  return (
    <details className="ir-admin-form">
      <summary>+ Record an executed position</summary>
      <form onSubmit={submit} className="ir-form-grid ir-form-grid--3">
        <Field label="Verified shareholder" full>
          <select required value={form.shareholderId} onChange={update('shareholderId')}><option value="">Select a verified shareholder</option>{verified.map((row) => <option key={row.id} value={row.id}>{row.legal_name} — {row.email}</option>)}</select>
          {verified.length === 0 && <span className="ir-field-note text-[var(--at-amber)]">No verified shareholder yet. Verify access in Investor relations → Shareholder access.</span>}
        </Field>
        <Field label="Share class">
          <select required value={form.shareClassId} onChange={update('shareClassId')}><option value="">Select a class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.class_code} — {row.name}</option>)}</select>
        </Field>
        <Field label="Shares"><input required type="number" step="any" min="0.0001" value={form.shares} onChange={update('shares')} /></Field>
        <Field label="Certificate / reference"><input value={form.certificateNumber} onChange={update('certificateNumber')} /></Field>
        <Field label="Issued date"><input type="date" value={form.issuedDate} onChange={update('issuedDate')} /></Field>
        <Field label="Ownership % (optional)"><input type="number" step="any" value={form.ownershipPct} onChange={update('ownershipPct')} placeholder="Computed if blank" /></Field>
        <Field label="Vesting start"><input type="date" value={form.vestingStart} onChange={update('vestingStart')} /></Field>
        <Field label="Cliff (months)"><input type="number" value={form.vestingCliffMonths} onChange={update('vestingCliffMonths')} /></Field>
        <Field label="Vesting (months)"><input type="number" value={form.vestingMonths} onChange={update('vestingMonths')} /></Field>
        <Field label="Approved proposal (optional)"><select value={form.proposalId} onChange={update('proposalId')}><option value="">No linked proposal</option>{proposals.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field>
        <Field label="Source reference" full note="Required. Identify the executed board resolution, certificate, purchase agreement or transfer record. This page records evidence; it does not execute the action."><textarea required value={form.sourceReference} onChange={update('sourceReference')} /></Field>
        <Field label="Approving authority" full note="Required. A named officer, director or authorized committee."><input required value={form.approvedBy} onChange={update('approvedBy')} placeholder="Name or corporate authority" /></Field>
        <Field label="Transfer restrictions" full><textarea value={form.transferRestrictions} onChange={update('transferRestrictions')} /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Plus} disabled={busy}>{busy ? 'Recording…' : 'Record position evidence'}</AtButton></div>
      </form>
    </details>
  );
}

function PositionRow({ row, reload }) {
  const { busy, save } = useSaver(reload);
  const [status, setStatus] = useState(row.status);
  const [sourceReference, setSourceReference] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const changed = status !== row.status;
  async function updateStatus() {
    const result = await save(`/admin/positions/${row.id}`, { status, sourceReference, approvedBy }, { method: 'PATCH', success: 'Position status updated with evidence.' });
    if (result) {
      setSourceReference('');
      setApprovedBy('');
    }
  }
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.shareholder_name} · {formatNumber(row.shares, 2)} {row.class_code}</div>
        <div className="ir-admin-item-sub">{row.shareholder_email} · Certificate {row.certificate_number || '—'} · Issued {formatDate(row.issued_date, '—')} · Approved by {row.approved_by}</div>
        <div className="ir-admin-item-sub">Source: {row.source_reference}</div>
        {row.ownership_pct != null && <div className="ir-admin-item-sub">Recorded ownership: {Number(row.ownership_pct).toFixed(4)}%</div>}
      </div>
      <div className="ir-admin-inline">
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}><option value="active">Active</option><option value="transferred">Transferred</option><option value="cancelled">Cancelled</option></select></Field>
        {changed && (
          <>
            <Field label="Execution source" full><input value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} placeholder="Resolution or transfer record reference" disabled={busy} /></Field>
            <Field label="Approving authority"><input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Named officer or director" disabled={busy} /></Field>
            <AtButton onClick={updateStatus} variant="gold" size="sm" icon={busy ? Loader2 : CheckCircle2} disabled={busy || !sourceReference.trim() || !approvedBy.trim()}>Save change</AtButton>
          </>
        )}
        <StatusBadge status={row.status} />
      </div>
    </div>
  );
}

function CapTableTab({ data, reload }) {
  const positions = data?.positions || [];
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={AlertTriangle} tone="amber"><span className="font-bold">This is a register, not a transfer engine.</span> No share is issued by this form. A position is recorded only with a source reference and approving authority. Do not enter a position before the corporate record exists.</AtAlert>
      <AtPanel eyebrow="Private equity register" title="Share positions" sub="Visible to operators only. Approved shareholders see only their own records.">
        <PositionForm data={data} reload={reload} />
        <div className="ir-sep" />
        {positions.length === 0 ? <AtEmpty icon={Layers} title="No positions recorded" sub="Record the first executed position only after verifying the shareholder and the source evidence." /> : (
          <div className="ir-admin-list">{positions.map((row) => <PositionRow key={row.id} row={row} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function ClassForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const empty = { classCode: '', name: '', status: 'proposed', authorizedShares: '', issuedShares: '', outstandingShares: '', treasuryShares: '', votesPerShare: '1', rights: '', effectiveDate: '', approvedBy: '', isPublic: false };
  const [form, setForm] = useState(empty);
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/share-classes', form, { success: 'Share class created.' });
    if (result) setForm(empty);
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New share class</summary>
      <form onSubmit={submit} className="ir-form-grid ir-form-grid--3">
        <Field label="Class code"><input required value={form.classCode} onChange={update('classCode')} placeholder="COMMON" /></Field>
        <Field label="Name"><input required value={form.name} onChange={update('name')} placeholder="Common Stock" /></Field>
        <Field label="Status"><select value={form.status} onChange={update('status')}><option value="proposed">Proposed</option><option value="authorized">Authorized</option><option value="retired">Retired</option></select></Field>
        {[['authorizedShares', 'Authorized shares'], ['issuedShares', 'Issued shares'], ['outstandingShares', 'Outstanding shares'], ['treasuryShares', 'Treasury shares']].map(([key, label]) => <Field key={key} label={label}><input type="number" step="any" value={form[key]} onChange={update(key)} /></Field>)}
        <Field label="Votes / share"><input type="number" step="any" value={form.votesPerShare} onChange={update('votesPerShare')} /></Field>
        <Field label="Effective date"><input type="date" value={form.effectiveDate} onChange={update('effectiveDate')} /></Field>
        <Field label="Approving authority"><input value={form.approvedBy} onChange={update('approvedBy')} placeholder="Required for authorized" /></Field>
        <label className="ir-check"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))} /> Publish class to public capital structure</label>
        <Field label="Rights and restrictions" full><textarea value={form.rights} onChange={update('rights')} /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Coins} disabled={busy}>{busy ? 'Creating…' : 'Create share class'}</AtButton><span className="ir-field-note">Authorized status requires an effective date and approving authority. Public status only exposes aggregated class data.</span></div>
      </form>
    </details>
  );
}

function ClassRow({ row, reload }) {
  const { busy, save } = useSaver(reload);
  const [status, setStatus] = useState(row.status);
  const [effectiveDate, setEffectiveDate] = useState(row.effective_date || '');
  const [approvedBy, setApprovedBy] = useState(row.approved_by || '');
  const [isPublic, setIsPublic] = useState(Boolean(row.is_public));
  async function saveRow() {
    await save(`/admin/share-classes/${row.id}`, { status, effectiveDate, approvedBy, isPublic }, { method: 'PATCH', success: 'Share class updated.' });
  }
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.class_code} · {row.name}</div>
        <div className="ir-admin-item-sub">Authorized {formatNumber(row.authorized_shares)} · Issued {formatNumber(row.issued_shares)} · Outstanding {formatNumber(row.outstanding_shares)} · Treasury {formatNumber(row.treasury_shares)} · {formatNumber(row.votes_per_share, 2)} votes/share</div>
        <div className="ir-admin-item-sub">{row.rights || 'No rights summary recorded.'}{row.approved_by ? ` · Approved by ${row.approved_by}` : ''}</div>
      </div>
      <div className="ir-admin-inline">
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}><option value="proposed">Proposed</option><option value="authorized">Authorized</option><option value="retired">Retired</option></select></Field>
        <Field label="Effective date"><input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} disabled={busy} /></Field>
        <Field label="Approver"><input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} disabled={busy} /></Field>
        <label className="ir-check"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public</label>
        <StatusBadge status={row.status} />
        <AtButton onClick={saveRow} variant="gold" size="sm" icon={busy ? Loader2 : CheckCircle2} disabled={busy}>Save</AtButton>
      </div>
    </div>
  );
}

function ClassesTab({ data, reload }) {
  return (
    <div className="ir-stack-lg">
      <AtPanel eyebrow="Capital structure" title="Share classes" sub="A proposed class is not an authorized class. Authorized requires an effective date and a named approving authority.">
        <ClassForm reload={reload} />
        <div className="ir-sep" />
        {(data?.shareClasses || []).length === 0 ? <AtEmpty icon={Coins} title="No share classes" sub="Create a proposed class above." /> : (
          <div className="ir-admin-list">{data.shareClasses.map((row) => <ClassRow key={row.id} row={row} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function ProposalForm({ reload }) {
  const { busy, save } = useSaver(reload);
  const empty = { title: '', proposalType: 'issuance', summary: '', proposedBy: '', supportingDocumentUrl: '' };
  const [form, setForm] = useState(empty);
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    const result = await save('/admin/proposals', form, { success: 'Proposal created.' });
    if (result) setForm(empty);
  }
  return (
    <details className="ir-admin-form">
      <summary>+ New equity proposal</summary>
      <form onSubmit={submit} className="ir-form-grid">
        <Field label="Title" full><input required value={form.title} onChange={update('title')} /></Field>
        <Field label="Type"><select value={form.proposalType} onChange={update('proposalType')}>{['issuance', 'option_pool', 'transfer', 'conversion', 'dividend', 'split', 'governance', 'other'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></Field>
        <Field label="Proposed by"><input value={form.proposedBy} onChange={update('proposedBy')} placeholder="Name or committee" /></Field>
        <Field label="Supporting document URL" full><input value={form.supportingDocumentUrl} onChange={update('supportingDocumentUrl')} placeholder="https://…" /></Field>
        <Field label="Summary" full><textarea value={form.summary} onChange={update('summary')} /></Field>
        <div className="ir-field ir-field--full ir-actions"><AtButton type="submit" variant="gold" size="sm" icon={busy ? Loader2 : Gavel} disabled={busy}>{busy ? 'Creating…' : 'Create proposal'}</AtButton><span className="ir-field-note">A proposal is a draft. It does not change the cap table or execute a transaction.</span></div>
      </form>
    </details>
  );
}

function ProposalRow({ row, approvals, reload }) {
  const { busy, save } = useSaver(reload);
  const [note, setNote] = useState('');
  const [executionReference, setExecutionReference] = useState('');
  const decided = ['approved', 'rejected', 'executed'].includes(row.status);
  const rowApprovals = approvals.filter((item) => item.proposal_id === row.id);
  async function decide(decision) {
    await save(`/admin/proposals/${row.id}/decision`, { decision, note }, { method: 'POST', success: `Proposal ${decision === 'approve' ? 'approved' : 'rejected'}.` });
  }
  async function execute() {
    await save(`/admin/proposals/${row.id}/execute`, { executionReference }, { method: 'POST', success: 'External execution recorded.' });
  }
  return (
    <div className="ir-admin-item">
      <div className="ir-admin-item-main">
        <div className="ir-admin-item-title">{row.title}</div>
        <div className="ir-admin-item-sub">{row.proposal_type.replaceAll('_', ' ')} · proposed by {row.proposed_by || '—'} · {formatDate(row.created_at)}</div>
        {row.summary && <div className="ir-admin-item-sub">{row.summary}</div>}
        {row.decision_note && <div className="ir-admin-item-sub">Decision note: {row.decision_note}</div>}
        {row.approved_by && <div className="ir-admin-item-sub text-[var(--at-green)]">Decided by {row.approved_by} · {formatDate(row.approved_at)}</div>}
        {row.execution_reference && <div className="ir-admin-item-sub">External execution: {row.execution_reference} · {formatDate(row.executed_at)}</div>}
        {rowApprovals.length > 0 && <div className="ir-admin-item-sub">Approval records: {rowApprovals.map((item) => `${item.decision} by ${item.approver_email}`).join(' · ')}</div>}
      </div>
      <div className="ir-admin-inline">
        <StatusBadge status={row.status} />
        {!decided && (
          <>
            <Field label="Decision note"><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required for a material decision?" /></Field>
            <AtButton onClick={() => decide('approve')} variant="gold" size="sm" icon={busy ? Loader2 : CheckCircle2} disabled={busy}>Approve</AtButton>
            <AtButton onClick={() => decide('reject')} variant="danger" size="sm" disabled={busy}>Reject</AtButton>
          </>
        )}
        {row.status === 'approved' && (
          <>
            <Field label="External execution reference"><input value={executionReference} onChange={(e) => setExecutionReference(e.target.value)} placeholder="Resolution, transfer agent or filing reference" /></Field>
            <AtButton onClick={execute} variant="outline" size="sm" icon={busy ? Loader2 : FileText} disabled={busy || !executionReference.trim()}>Record external execution</AtButton>
          </>
        )}
      </div>
    </div>
  );
}

function ProposalsTab({ data, reload }) {
  return (
    <div className="ir-stack-lg">
      <AtAlert icon={Gavel} tone="amber"><span className="font-bold">Approval is not execution.</span> Approving a proposal records a corporate decision. Marking it executed requires an external execution reference. This console never issues, transfers or trades a security.</AtAlert>
      <AtPanel eyebrow="Corporate actions" title="Equity proposals and approvals" sub="Draft, decide and record external execution evidence. Decided proposals are immutable.">
        <ProposalForm reload={reload} />
        <div className="ir-sep" />
        {(data?.proposals || []).length === 0 ? <AtEmpty icon={Gavel} title="No proposals" sub="Create the first corporate equity proposal above." /> : (
          <div className="ir-admin-list">{data.proposals.map((row) => <ProposalRow key={row.id} row={row} approvals={data.approvals || []} reload={reload} />)}</div>
        )}
      </AtPanel>
    </div>
  );
}

function AuditTab({ data }) {
  const chain = data?.auditChain || { valid: false, checked: 0, failures: [] };
  return (
    <div className="ir-stack-lg">
      <AtPanel eyebrow="Integrity" title="Equity audit chain" sub="SHA-256 hash chain. Each event links to its predecessor." action={<AtBadge tone={chain.valid ? 'green' : 'red'}>{chain.valid ? 'Valid' : 'Review'}</AtBadge>}>
        <div className="ir-cols-3">
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Events checked</div><div className="mt-1 font-mono text-xl font-bold">{chain.checked}</div></div>
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Failures</div><div className="mt-1 font-mono text-xl font-bold">{chain.failures?.length || 0}</div></div>
          <div className="ir-card ir-card--soft !p-3"><div className="ir-kicker">Head hash</div><div className="mt-1 truncate font-mono text-[10px]">{chain.head ? chain.head.slice(0, 30) : '—'}</div></div>
        </div>
        <div className="ir-sep" />
        <div className="ir-table-wrap"><table className="ir-table"><thead><tr><th>Seq</th><th>Action</th><th>Entity</th><th>Summary</th><th>Actor</th><th>When</th><th>Hash</th></tr></thead><tbody>{(data?.audit || []).map((row) => <tr key={row.id}><td className="num">{row.seq}</td><td className="strong">{row.action}</td><td>{row.entity_type}</td><td>{row.summary}</td><td className="muted">{row.actor_email || '—'}</td><td className="num">{formatDate(row.created_at)}</td><td className="muted font-mono text-[9px]">{String(row.hash || '').slice(0, 16)}…</td></tr>)}</tbody></table></div>
      </AtPanel>
    </div>
  );
}

export default function AdminEquityPage() {
  const { data, loading, error, reload } = useAdminInvestor();
  const [tab, setTab] = useState('overview');
  return (
    <AdminLayout title="Equity administration">
      <div className="ir-page cap-page cap-admin-page">
        <CapAdminHead
          title="Equity administration"
          actions={(
            <>
              <AtButton onClick={reload} variant="outline" size="sm" icon={RefreshCw} disabled={loading}>Refresh</AtButton>
              <AtButton to="/admin/investor-relations" variant="gold" size="sm" iconRight={ArrowRight}>IR control</AtButton>
            </>
          )}
        />
        {error && <div className="mt-2"><AtAlert icon={AlertTriangle} tone="red"><div className="flex flex-wrap items-center justify-between gap-2"><span>{error}</span><AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton></div></AtAlert></div>}
        <CapTabs
          tabs={TABS.map((item) => ({ ...item, count: item.id === 'proposals' ? (data?.proposals || []).filter((row) => row.status === 'pending_approval').length : undefined }))}
          active={tab}
          onChange={setTab}
        />
        {loading ? <div className="cap-empty"><span className="cap-empty-icon"><Loader2 className="h-4 w-4 animate-spin" /></span><div><strong>Loading equity controls</strong><p>Reading the private register and audit chain.</p></div></div> : (
          <>
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'captable' && <CapTableTab data={data} reload={reload} />}
            {tab === 'proposals' && <ProposalsTab data={data} reload={reload} />}
            {tab === 'classes' && <ClassesTab data={data} reload={reload} />}
            {tab === 'audit' && <AuditTab data={data} />}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
