import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, CalendarClock, Check, CheckCircle2, ChevronRight,
  CircleAlert, FileText, Fingerprint, Landmark, Layers, Loader2,
  LockKeyhole, Mail, RefreshCw, Scale, ShieldCheck, ShieldAlert, Vote,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { AtBadge, AtButton } from '@/components/AtelierUI';
import { useAuth } from '@/hooks/useAuth';
import { investorFetch, useShareholderPortal } from '@/lib/investorApi';
import { formatDate, formatNumber, TB_ISSUER } from '@/lib/investorRelations';
import '@/styles/investor-access.css';

const STATUS = {
  not_requested: { label: 'Not requested', tone: 'muted', identity: 'Not submitted', access: 'Not requested', note: 'Request access to begin verification.' },
  pending: { label: 'In review', tone: 'amber', identity: 'Pending review', access: 'Requested', note: 'IR is matching your identity to a record.' },
  approved: { label: 'Verified', tone: 'green', identity: 'Verified', access: 'Approved', note: 'Your verified record is visible below.' },
  suspended: { label: 'Suspended', tone: 'red', identity: 'Review required', access: 'Suspended', note: 'Access is paused. Contact IR for the next step.' },
  revoked: { label: 'Revoked', tone: 'red', identity: 'Not active', access: 'Revoked', note: 'Access is no longer active. Contact IR for help.' },
  loading: { label: 'Checking', tone: 'muted', identity: 'Checking', access: 'Checking', note: 'Confirming your authenticated access.' },
};

function statusOf(status) {
  return STATUS[status] || STATUS.not_requested;
}

function Stat({ icon: Icon, label, value, note }) {
  return (
    <article className="ia-stat">
      <div className="ia-stat-top"><span>{label}</span><Icon className="h-4 w-4" /></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function SectionHead({ index, title, sub, action }) {
  return (
    <div className="ia-section-head">
      <div className="ia-section-title-wrap">
        {index && <span className="ia-index">{index}</span>}
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {action && <div className="ia-section-action">{action}</div>}
    </div>
  );
}

function EmptyRecord({ icon: Icon = Landmark, title, sub, action }) {
  return (
    <div className="ia-empty">
      <span className="ia-empty-icon"><Icon className="h-5 w-5" /></span>
      <strong>{title}</strong>
      <p>{sub}</p>
      {action}
    </div>
  );
}

function Hero({ status, data, user }) {
  const meta = statusOf(status);
  const shareholder = data?.shareholder || {};
  const approved = status === 'approved';
  const positions = data?.totals?.positions;
  const displayName = shareholder.legal_name || user?.name || 'Authenticated account';
  const displayEmail = shareholder.email || user?.email || 'Signed in';

  return (
    <section className="ia-hero">
      <div className="ia-hero-copy">
        <div className="ia-eyebrow"><span className="ia-eyebrow-dot" /> Investor access</div>
        <h1>Your ownership,<br /><span>clearly recorded.</span></h1>
        <p className="ia-hero-lead">
          A private, read-only view of the shares investor relations has verified in your name.
          This is not a public register, a transfer agent, or a market quote.
        </p>
        <div className="ia-hero-tags">
          <span><Fingerprint /> Authenticated</span>
          <span><LockKeyhole /> Read-only</span>
          <span><Landmark /> Pre-IPO</span>
          <span><Scale /> TB equity ≠ TBC</span>
        </div>
      </div>

      <aside className="ia-record-card">
        <div className="ia-record-head">
          <span className="ia-kicker">Record status</span>
          <AtBadge tone={meta.tone}>{meta.label}</AtBadge>
        </div>
        <div className="ia-record-identity">
          <div className="ia-monogram" aria-hidden>TB</div>
          <div className="ia-record-name">
            <strong>{displayName}</strong>
            <span>{displayEmail}</span>
          </div>
        </div>
        <div className="ia-record-rows">
          <div><span>Identity</span><strong className={`is-${meta.tone}`}>{meta.identity}</strong></div>
          <div><span>Access</span><strong>{meta.access}</strong></div>
          <div><span>Positions</span><strong>{approved ? (positions || 0) : 'Hidden'}</strong></div>
          <div><span>Market</span><strong>Private</strong></div>
        </div>
        <p className="ia-record-foot"><ShieldCheck /> {meta.note} Only your records are visible.</p>
      </aside>
    </section>
  );
}

function BoundaryGrid({ status, data, user }) {
  const approved = status === 'approved';
  const items = [
    { icon: Fingerprint, label: 'Authenticated', value: data?.shareholder?.email || user?.email || 'Signed in', note: 'This session is tied to your account.' },
    { icon: BadgeCheck, label: 'IR verification', value: approved ? 'Identity verified' : 'Review required', note: approved ? 'A named IR decision approved access.' : 'No record is visible before approval.' },
    { icon: LockKeyhole, label: 'Read-only boundary', value: 'No transfers', note: 'The portal cannot issue, move or vote shares.' },
    { icon: Scale, label: 'Record separation', value: 'TB ≠ TBC', note: 'Equity records and TBC balances are separate.' },
  ];
  return (
    <section className="ia-boundary" aria-label="Access boundaries">
      {items.map(({ icon: Icon, label, value, note }) => (
        <div className="ia-boundary-card" key={label}>
          <span className="ia-boundary-icon"><Icon className="h-4 w-4" /></span>
          <div><span className="ia-kicker">{label}</span><strong>{value}</strong><p>{note}</p></div>
        </div>
      ))}
    </section>
  );
}

function AccessRequestForm({ user, onSubmitted }) {
  const [form, setForm] = useState({
    legalName: user?.name || '',
    email: user?.email || '',
    entityType: 'individual',
    jurisdiction: '',
    note: '',
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (!consent) {
      setError('Confirm that you understand this request does not create or transfer ownership.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await investorFetch('/portal/access-request', { method: 'POST', auth: true, body: form });
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Your access request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="ia-form">
      <div className="ia-field">
        <label htmlFor="ia-name">Full legal name</label>
        <input id="ia-name" className="ia-input" required value={form.legalName} onChange={update('legalName')} autoComplete="name" placeholder="As shown on your ownership record" maxLength={240} />
      </div>
      <div className="ia-field">
        <label htmlFor="ia-email">Account email</label>
        <input id="ia-email" className="ia-input" type="email" required value={form.email} onChange={update('email')} autoComplete="email" maxLength={220} />
        <span className="ia-field-note">Use the email on your TradingBible account. A mismatch requires manual review.</span>
      </div>
      <div className="ia-field">
        <label htmlFor="ia-entity">Holder type</label>
        <select id="ia-entity" className="ia-input" value={form.entityType} onChange={update('entityType')}>
          <option value="individual">Individual</option>
          <option value="entity">Entity</option>
          <option value="trust">Trust</option>
          <option value="custodian">Custodian</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="ia-field">
        <label htmlFor="ia-jurisdiction">Jurisdiction</label>
        <input id="ia-jurisdiction" className="ia-input" value={form.jurisdiction} onChange={update('jurisdiction')} placeholder="State or country" autoComplete="address-level1" maxLength={120} />
      </div>
      <div className="ia-field ia-field--full">
        <label htmlFor="ia-note">Verification note <span>Optional</span></label>
        <textarea id="ia-note" className="ia-input ia-textarea" value={form.note} onChange={update('note')} placeholder="Identify the certificate, purchase record or entity through which you hold an interest. Do not include passwords, private keys or full bank details." maxLength={2000} />
      </div>
      <label className="ia-consent ia-field--full">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>I understand this request does not create, transfer, cancel or confirm ownership. IR must verify my identity before any record is shown.</span>
      </label>
      {error && <div className="ia-alert ia-alert--red ia-field--full" role="alert"><CircleAlert className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <div className="ia-form-actions ia-field--full">
        <AtButton type="submit" variant="gold" size="lg" icon={busy ? Loader2 : ShieldCheck} disabled={busy}>
          {busy ? 'Submitting request…' : 'Request verified access'}
        </AtButton>
        <span className="ia-field-note">Stored for IR review. No position is created by this request.</span>
      </div>
    </form>
  );
}

function RequestView({ user, onSubmitted, justSubmitted }) {
  return (
    <div className="ia-main-grid">
      <section className="ia-panel ia-panel--form">
        <div className="ia-panel-head">
          <span className="ia-step">01 / Access request</span>
          <h2>Request verified access</h2>
          <p>Tell investor relations who the record belongs to. The request is reviewed before any ownership data is returned.</p>
        </div>
        {justSubmitted && (
          <div className="ia-alert ia-alert--green" role="status"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Request received. Your identity is now queued for IR review.</span></div>
        )}
        <AccessRequestForm user={user} onSubmitted={onSubmitted} />
      </section>

      <aside className="ia-side-stack">
        <section className="ia-panel">
          <div className="ia-panel-head">
            <span className="ia-step">02 / Approval</span>
            <h3>What approval unlocks</h3>
            <p>A narrow record, scoped to you.</p>
          </div>
          <ul className="ia-unlock-list">
            {[
              [Landmark, 'Your positions', 'Certificate reference, share class and recorded issue date.'],
              [BadgeCheck, 'Your ownership record', 'Percentage, vesting terms and the source reference behind the entry.'],
              [Vote, 'Governance history', 'Your recorded votes and public meeting notices.'],
              [FileText, 'Approved documents', 'Public statements only. No other shareholder is visible.'],
            ].map(([Icon, title, body]) => (
              <li key={title}><span className="ia-unlock-icon"><Icon className="h-4 w-4" /></span><div><strong>{title}</strong><p>{body}</p></div></li>
            ))}
          </ul>
        </section>

        <section className="ia-panel ia-panel--muted">
          <div className="ia-panel-head">
            <span className="ia-step">Verification path</span>
            <h3>Three controlled steps</h3>
          </div>
          <ol className="ia-timeline">
            <li className="is-done"><span>1</span><div><strong>Submit identity</strong><p>Your legal name and account email are recorded.</p></div></li>
            <li className="is-active"><span>2</span><div><strong>IR matches the record</strong><p>A named reviewer checks the executed ownership record.</p></div></li>
            <li><span>3</span><div><strong>Read-only access opens</strong><p>Only your positions, votes and documents become visible.</p></div></li>
          </ol>
          <div className="ia-note"><LockKeyhole className="h-4 w-4" /><span>The portal cannot create, transfer, cancel or vote shares. Contact IR if your legal record needs correction.</span></div>
        </section>
      </aside>
    </div>
  );
}

function PendingView({ data, reload, justSubmitted }) {
  const shareholder = data?.shareholder || {};
  return (
    <div className="ia-main-grid">
      <section className="ia-panel">
        <div className="ia-panel-head">
          <span className="ia-step">Verification in progress</span>
          <h2>Your request is with investor relations</h2>
          <p>No ownership records are visible until a reviewer completes the identity check.</p>
        </div>
        {justSubmitted && (
          <div className="ia-alert ia-alert--green" role="status"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Request received. IR review is the next step.</span></div>
        )}
        <ol className="ia-timeline ia-timeline--large">
          <li className="is-done"><span><Check className="h-3.5 w-3.5" /></span><div><strong>Request received</strong><p>{formatDate(shareholder.created_at, 'Submitted')} · Stored for IR review.</p></div></li>
          <li className="is-active"><span>2</span><div><strong>Identity and record review</strong><p>IR confirms the legal name and matches the request to an executed record.</p></div></li>
          <li><span>3</span><div><strong>Access decision</strong><p>You will see the verified record only after approval.</p></div></li>
        </ol>
        <div className="ia-identity-card">
          <div className="ia-identity-head"><span className="ia-kicker">Submitted identity</span><AtBadge tone="amber">Pending</AtBadge></div>
          <div className="ia-identity-grid">
            <div><span>Legal name</span><strong>{shareholder.legal_name || '—'}</strong></div>
            <div><span>Email</span><strong>{shareholder.email || '—'}</strong></div>
            <div><span>Access status</span><strong>{shareholder.access_status || 'requested'}</strong></div>
            <div><span>Verification</span><strong>{shareholder.verification_status || 'pending'}</strong></div>
          </div>
          {shareholder.verification_note && <div className="ia-note"><FileText className="h-4 w-4" /><span>{shareholder.verification_note}</span></div>}
        </div>
        <div className="ia-form-actions">
          <AtButton onClick={reload} variant="outline" icon={RefreshCw}>Check status</AtButton>
          <AtButton to="/investors/contact" variant="quiet" icon={Mail}>Contact IR</AtButton>
        </div>
      </section>

      <aside className="ia-side-stack">
        <section className="ia-panel">
          <div className="ia-panel-head"><span className="ia-step">What happens next</span><h3>A controlled review</h3></div>
          <ul className="ia-check-list">
            <li><CheckCircle2 /> IR confirms your legal name and identity.</li>
            <li><CheckCircle2 /> IR matches the request to an executed ownership record.</li>
            <li><CheckCircle2 /> IR records the verification decision.</li>
            <li><CheckCircle2 /> Only then are your positions and voting history returned.</li>
          </ul>
          <div className="ia-note"><ShieldCheck className="h-4 w-4" /><span>No position is created, transferred or changed by this request.</span></div>
        </section>
        <section className="ia-panel ia-panel--muted">
          <div className="ia-panel-head"><span className="ia-step">Privacy</span><h3>Private by design</h3></div>
          <p className="ia-body-copy">The register is not public. The portal never exposes another shareholder's identity, position or contact details.</p>
          <div className="ia-chip-row"><AtBadge tone="green">Authenticated</AtBadge><AtBadge tone="muted">Read-only</AtBadge><AtBadge tone="amber">IR reviewed</AtBadge></div>
        </section>
      </aside>
    </div>
  );
}

function PositionCard({ position }) {
  const pct = position.vesting?.vestedPct;
  const statusTone = position.status === 'active' ? 'green' : 'amber';
  return (
    <article className="ia-position">
      <div className="ia-position-head">
        <div>
          <span className="ia-kicker">{position.shareClass?.classCode || 'Share class'} · {position.certificateNumber || 'No certificate number'}</span>
          <h3>{formatNumber(position.shares, 2)} <span>shares</span></h3>
          <p>{position.shareClass?.name || 'Share class'}</p>
        </div>
        <AtBadge tone={statusTone}>{position.status}</AtBadge>
      </div>
      <div className="ia-position-grid">
        <div><span>Ownership</span><strong>{position.ownershipPct == null ? '—' : `${Number(position.ownershipPct).toFixed(4)}%`}</strong></div>
        <div><span>Issued</span><strong>{formatDate(position.issuedDate, '—')}</strong></div>
        <div><span>Vesting</span><strong>{position.vestingMonths ? `${position.vestingMonths} months` : '—'}</strong></div>
      </div>
      {position.vesting && (
        <div className="ia-vesting">
          <div className="ia-vesting-row"><span>Schedule estimate</span><strong>{pct}%</strong></div>
          <div className="ia-progress"><span style={{ width: `${Math.max(0, Math.min(100, Number(pct) || 0))}%` }} /></div>
          <p>{position.vesting.note} Recorded terms control; this is not a legal determination of vested shares.</p>
        </div>
      )}
      {position.transferRestrictions && <p className="ia-position-note"><strong>Restrictions:</strong> {position.transferRestrictions}</p>}
      <div className="ia-position-foot"><span>Source: {position.sourceReference || '—'}</span><span>Approved {formatDate(position.approvedAt, '—')}</span></div>
    </article>
  );
}

function DocumentRow({ document }) {
  return (
    <div className="ia-document">
      <span className="ia-document-icon"><FileText className="h-4 w-4" /></span>
      <div className="ia-document-main">
        <strong>{document.title}</strong>
        <span>{document.category} · {document.documentType} · {formatDate(document.publishedAt, 'Date pending')}</span>
        {document.summary && <p>{document.summary}</p>}
      </div>
      {document.url ? <a href={document.url} target="_blank" rel="noreferrer" className="ia-document-link">Open <ArrowRight className="h-3.5 w-3.5" /></a> : <AtBadge tone="amber">Link pending</AtBadge>}
    </div>
  );
}

function ApprovedView({ data, reload }) {
  const positions = data?.positions || [];
  const documents = data?.documents || [];
  const meetings = data?.meetings || [];
  const voting = data?.voting || [];
  const totals = data?.totals || { positions: 0, shares: 0, classes: [] };
  const shareholder = data?.shareholder || {};

  return (
    <>
      <section className="ia-stat-grid">
        <Stat icon={Landmark} label="Active positions" value={String(totals.positions || 0)} note="Verified ownership records." />
        <Stat icon={Layers} label="Shares recorded" value={formatNumber(totals.shares, 2)} note="Across active positions." />
        <Stat icon={BadgeCheck} label="Share classes" value={totals.classes?.join(', ') || '—'} note="As recorded by the company." />
        <Stat icon={Vote} label="Voting records" value={String(voting.length)} note="Historical records only." />
      </section>

      <section className="ia-section">
        <SectionHead
          index="01"
          title="Your positions"
          sub="Certificate, class, ownership and vesting terms. No other shareholder is visible."
          action={<AtButton onClick={reload} variant="outline" size="sm" icon={RefreshCw}>Refresh</AtButton>}
        />
        {positions.length === 0 ? (
          <div className="ia-panel"><EmptyRecord icon={Landmark} title="No position recorded" sub="Your access is approved, but no executed ownership record is linked to this account yet. Contact investor relations if this is unexpected." action={<AtButton to="/investors/contact" variant="outline" size="sm">Contact IR</AtButton>} /></div>
        ) : (
          <div className="ia-position-list">{positions.map((position) => <PositionCard key={position.id} position={position} />)}</div>
        )}
      </section>

      <section className="ia-section">
        <SectionHead index="02" title="Governance & meetings" sub="Your historical voting records and public shareholder meeting notices." />
        <div className="ia-two-col">
          <div className="ia-panel">
            <div className="ia-panel-head"><span className="ia-step">Voting history</span><h3>Your recorded votes</h3><p>Read-only. The portal does not cast or change a vote.</p></div>
            {voting.length === 0 ? <EmptyRecord icon={Vote} title="No voting records" sub="No meeting vote is linked to your account. Live voting and proxy execution are not enabled." /> : (
              <div className="ia-table-wrap"><table className="ia-table"><thead><tr><th>Agenda item</th><th>Vote</th><th>Recorded</th></tr></thead><tbody>{voting.map((row) => <tr key={row.id}><td>{row.agendaItem}</td><td><AtBadge tone={row.vote === 'for' ? 'green' : row.vote === 'against' ? 'red' : 'muted'}>{row.vote}</AtBadge></td><td className="num">{formatDate(row.recordedAt)}</td></tr>)}</tbody></table></div>
            )}
          </div>
          <div className="ia-panel">
            <div className="ia-panel-head"><span className="ia-step">Meetings</span><h3>Shareholder meetings</h3><p>Public notices and recorded status.</p></div>
            {meetings.length === 0 ? <EmptyRecord icon={CalendarClock} title="No meetings scheduled" sub="A meeting notice will appear here when one is published." /> : (
              <div className="ia-meeting-list">{meetings.map((meeting) => (
                <div className="ia-meeting" key={meeting.id}>
                  <div><strong>{meeting.title}</strong><span>{formatDate(meeting.meetingDate, 'Date not published')}{meeting.recordDate ? ` · Record date ${formatDate(meeting.recordDate)}` : ''}</span>{meeting.details && <p>{meeting.details}</p>}</div>
                  <div className="ia-meeting-side"><AtBadge tone={meeting.status === 'completed' ? 'green' : meeting.status === 'cancelled' ? 'red' : 'blue'}>{meeting.status}</AtBadge>{meeting.noticeUrl && <a href={meeting.noticeUrl} target="_blank" rel="noreferrer">Notice</a>}</div>
                </div>
              ))}</div>
            )}
          </div>
        </div>
      </section>

      <section className="ia-section">
        <SectionHead index="03" title="Documents & access" sub="Approved public statements and the security boundary around your private record." />
        <div className="ia-two-col">
          <div className="ia-panel">
            <div className="ia-panel-head"><span className="ia-step">Statements</span><h3>Issued documents</h3><p>Only public documents are listed here.</p></div>
            {documents.length === 0 ? <EmptyRecord icon={FileText} title="No public statements" sub="A shareholder statement is not generated by this page. Issued documents appear only when published." /> : <div className="ia-document-list">{documents.slice(0, 6).map((document) => <DocumentRow key={document.id} document={document} />)}</div>}
          </div>
          <div className="ia-panel">
            <div className="ia-panel-head"><span className="ia-step">Account security</span><h3>Protect access to your record</h3><p>Privileged records deserve stronger authentication.</p></div>
            <div className="ia-note"><ShieldCheck className="h-4 w-4" /><span>Enable multi-factor authentication on your TradingBible account. Never share your sign-in code. Shareholder access is read-only and every privileged change is audited.</span></div>
            <div className="ia-security-grid">
              <div><span>Email</span><strong>{shareholder.email || '—'}</strong></div>
              <div><span>Access</span><strong className="is-green">Verified · read-only</strong></div>
              <div><span>Verified</span><strong>{formatDate(shareholder.verified_at, '—')}</strong></div>
              <div><span>Entity</span><strong>{shareholder.entity_type || '—'}</strong></div>
            </div>
            <div className="ia-form-actions"><AtButton to="/investors/contact" variant="outline" icon={Mail}>Contact IR</AtButton></div>
          </div>
        </div>
      </section>
    </>
  );
}

function BlockedView({ status, data }) {
  const meta = statusOf(status);
  const shareholder = data?.shareholder || {};
  return (
    <div className="ia-main-grid">
      <section className="ia-panel ia-panel--blocked">
        <div className="ia-panel-head">
          <span className="ia-step">Access {status}</span>
          <h2>{status === 'suspended' ? 'Your access is paused' : 'Your access is no longer active'}</h2>
          <p>{meta.note} Your positions and documents are hidden while the record is in this state.</p>
        </div>
        <div className="ia-alert ia-alert--amber" role="status"><ShieldAlert className="h-4 w-4 shrink-0" /><span>Contact investor relations if you believe this is unexpected. Do not submit a second request while the record is under review.</span></div>
        <div className="ia-identity-grid">
          <div><span>Legal name</span><strong>{shareholder.legal_name || '—'}</strong></div>
          <div><span>Access status</span><strong>{shareholder.access_status || status}</strong></div>
          <div><span>Verification</span><strong>{shareholder.verification_status || '—'}</strong></div>
          <div><span>Record visibility</span><strong>Hidden</strong></div>
        </div>
        <div className="ia-form-actions"><AtButton to="/investors/contact" variant="gold" icon={Mail}>Contact investor relations</AtButton></div>
      </section>
      <aside className="ia-side-stack">
        <section className="ia-panel ia-panel--muted">
          <div className="ia-panel-head"><span className="ia-step">Read-only</span><h3>No ownership change</h3></div>
          <p className="ia-body-copy">This portal never transfers, cancels or issues shares, and it never casts a vote. A change to your legal record must go through investor relations and the company's executed records.</p>
          <div className="ia-chip-row"><AtBadge tone="muted">No transfers</AtBadge><AtBadge tone="muted">No voting execution</AtBadge><AtBadge tone="muted">Audited</AtBadge></div>
        </section>
      </aside>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="ia-loading" role="status"><Loader2 className="h-5 w-5 animate-spin" /><span>Checking your authenticated access…</span></div>
  );
}

function ErrorView({ error, reload }) {
  return (
    <div className="ia-panel ia-panel--error">
      <div className="ia-empty">
        <span className="ia-empty-icon"><CircleAlert className="h-5 w-5" /></span>
        <strong>Investor access is temporarily unavailable</strong>
        <p>{error}</p>
        <AtButton onClick={reload} variant="outline" icon={RefreshCw}>Try again</AtButton>
      </div>
    </div>
  );
}

function PortalBody({ data, loading, error, reload, user, justSubmitted, onSubmitted }) {
  const status = data?.status || (loading ? 'loading' : 'not_requested');
  if (loading && !data) return <LoadingView />;
  if (error && !data) return <ErrorView error={error} reload={reload} />;

  return (
    <>
      {error && data && <div className="ia-alert ia-alert--amber" role="status"><CircleAlert className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      {status === 'approved' && <ApprovedView data={data} reload={reload} />}
      {status === 'pending' && <PendingView data={data} reload={reload} justSubmitted={justSubmitted} />}
      {['suspended', 'revoked'].includes(status) && <BlockedView status={status} data={data} />}
      {!['approved', 'pending', 'suspended', 'revoked', 'loading'].includes(status) && (
        <RequestView user={user} onSubmitted={onSubmitted} justSubmitted={justSubmitted} />
      )}
    </>
  );
}

export default function InvestorAccessPage() {
  const { user, isAuthed } = useAuth();
  const { data, loading, error, reload } = useShareholderPortal(isAuthed);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const status = data?.status || (loading ? 'loading' : 'not_requested');

  const submit = () => {
    setJustSubmitted(true);
    reload();
  };

  return (
    <AppLayout title="Investor access">
      <div className="ia-page at-scope">
        <div className="ia-topline">
          <div className="ia-topline-left"><span className="ia-live-dot" /><span>Private capital record</span><span className="ia-topline-sep">/</span><span>Investor relations</span></div>
          <Link to="/app" className="ia-back">Back to app <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>

        <Hero status={status} data={data} user={user} />
        <BoundaryGrid status={status} data={data} user={user} />
        <PortalBody data={data} loading={loading} error={error} reload={reload} user={user} justSubmitted={justSubmitted} onSubmitted={submit} />

        <footer className="ia-disclosure">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Shareholder records are private and read-only. The portal is not a transfer agent, securities intermediary, voting platform or source of a share price. TB is a proposed ticker and the company is not publicly traded. Email {TB_ISSUER.irEmail} for access questions.</span>
        </footer>
      </div>
    </AppLayout>
  );
}
