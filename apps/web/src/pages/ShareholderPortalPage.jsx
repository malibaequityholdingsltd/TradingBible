import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, FileText, KeyRound,
  Landmark, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound, Users, Vote,
} from 'lucide-react';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import { AtAlert, AtBadge, AtButton, AtEmpty, AtPanel, AtProgress } from '@/components/AtelierUI';
import { CapPublicHead, CapRecordCard } from '@/components/CapitalUI';
import { IrDocumentList, IrSectionHead, IrStatGrid } from '@/components/InvestorBits';
import { useAuth } from '@/hooks/useAuth';
import { useShareholderPortal, investorFetch } from '@/lib/investorApi';
import { formatDate, formatNumber, TB_ISSUER } from '@/lib/investorRelations';

function SignInGate() {
  return (
    <div className="ir-portal-gate">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)]"><LockKeyhole className="h-4 w-4 text-[var(--at-gold)]" /></span>
        <div>
          <div className="ir-card-title">Authenticated access required</div>
          <p className="ir-card-text">The shareholder register is not public. Sign in with the email address associated with your verified record, then request access.</p>
        </div>
      </div>
      <div className="ir-actions">
        <AtButton to="/login?next=%2Finvestors%2Fshareholders" variant="gold" icon={KeyRound}>Sign in</AtButton>
        <AtButton to="/signup?next=%2Finvestors%2Fshareholders" variant="outline">Create account</AtButton>
      </div>
      <div className="ir-security-note mt-4"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>Sign in does not grant access to shareholder records. An administrator must verify identity and approve the request.</span></div>
    </div>
  );
}

function AccessRequestForm({ user, onRequested }) {
  const [form, setForm] = useState({
    legalName: user?.name || '',
    email: user?.email || '',
    entityType: 'individual',
    jurisdiction: '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await investorFetch('/portal/access-request', { method: 'POST', auth: true, body: form });
      onRequested?.();
    } catch (err) {
      setError(err.message || 'Your access request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="ir-form-grid">
      <div className="ir-field">
        <label htmlFor="sh-name">Full legal name</label>
        <input id="sh-name" required value={form.legalName} onChange={update('legalName')} autoComplete="name" placeholder="As shown on your ownership record" />
      </div>
      <div className="ir-field">
        <label htmlFor="sh-email">Account email</label>
        <input id="sh-email" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
        <span className="ir-field-note">Use the email on your TradingBible account. Mismatched requests require manual review.</span>
      </div>
      <div className="ir-field">
        <label htmlFor="sh-entity">Holder type</label>
        <select id="sh-entity" value={form.entityType} onChange={update('entityType')}>
          <option value="individual">Individual</option>
          <option value="entity">Entity</option>
          <option value="trust">Trust</option>
          <option value="custodian">Custodian</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="ir-field">
        <label htmlFor="sh-jurisdiction">Jurisdiction</label>
        <input id="sh-jurisdiction" value={form.jurisdiction} onChange={update('jurisdiction')} placeholder="State or country" autoComplete="address-level1" />
      </div>
      <div className="ir-field ir-field--full">
        <label htmlFor="sh-note">Verification note</label>
        <textarea id="sh-note" value={form.note} onChange={update('note')} placeholder="Optional: identify the certificate, purchase record or entity through which you hold an interest. Do not include passwords, private keys or full bank details." />
      </div>
      <div className="ir-field ir-field--full ir-actions">
        <AtButton type="submit" variant="gold" icon={busy ? Loader2 : ShieldCheck} disabled={busy}>{busy ? 'Submitting…' : 'Request verified access'}</AtButton>
        <span className="ir-field-note">The request is stored for IR review. It does not change ownership or create a position.</span>
      </div>
      {error && <div className="ir-field ir-field--full"><div className="at-alert at-alert--red !px-3 !py-2.5 !text-[10px]">{error}</div></div>}
    </form>
  );
}

function PendingState({ portal, reload }) {
  const shareholder = portal?.shareholder || {};
  return (
    <div className="ir-cols-12">
      <div className="ir-span-7">
        <AtPanel eyebrow="Access request" title="Verification is pending" sub="No ownership records are visible until an administrator completes review.">
          <div className="ir-stack">
            <div className="ir-account-card">
              <div className="ir-kicker">Requested identity</div>
              <div className="text-sm font-semibold text-[var(--at-ink)]">{shareholder.legal_name || '—'}</div>
              <div className="ir-list-sub">{shareholder.email || '—'}</div>
            </div>
            <div className="ir-cols-2">
              <div className="ir-account-card"><div className="ir-kicker">Access status</div><div className="text-sm font-semibold text-[var(--at-amber)]">{shareholder.access_status || 'requested'}</div></div>
              <div className="ir-account-card"><div className="ir-kicker">Verification</div><div className="text-sm font-semibold text-[var(--at-amber)]">{shareholder.verification_status || 'pending'}</div></div>
            </div>
            {shareholder.verification_note && <div className="ir-card ir-card--soft"><div className="ir-kicker">Your note</div><p className="ir-card-text">{shareholder.verification_note}</p></div>}
            <div className="ir-security-note"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>We do not send passwords or documents through this portal. If IR needs evidence, it will use the contact channel you provide.</span></div>
            <div className="ir-actions">
              <AtButton onClick={reload} variant="outline" icon={Loader2}>Check status</AtButton>
              <AtButton to="/investors/contact" variant="quiet" icon={Mail}>Contact IR</AtButton>
            </div>
          </div>
        </AtPanel>
      </div>
      <div className="ir-span-5">
        <AtPanel eyebrow="What happens next" title="A controlled review" sub="The portal is deliberately read-only.">
          <ol className="ir-bullet-list">
            <li>IR confirms the legal name and the identity of the requester.</li>
            <li>IR matches the request to an executed ownership record.</li>
            <li>IR approves access and records the verification decision.</li>
            <li>Only then does the portal return your own positions and voting history.</li>
            <li>No position is created, transferred or changed by this request.</li>
          </ol>
          <div className="ir-security-note mt-3"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span>Read-only access. No transfer, issuance, vote execution or ownership change.</span></div>
        </AtPanel>
      </div>
    </div>
  );
}

function PositionCard({ position }) {
  const pct = position.vesting?.vestedPct;
  return (
    <div className="ir-card ir-card--soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="ir-kicker">{position.shareClass?.classCode || 'Share class'} · {position.certificateNumber || 'No certificate number'}</div>
          <div className="mt-1 text-lg font-bold tracking-[-0.035em] text-[var(--at-ink)]">{formatNumber(position.shares, 2)} shares</div>
          <div className="ir-list-sub">{position.shareClass?.name || 'Share class'}</div>
        </div>
        <AtBadge tone={position.status === 'active' ? 'green' : 'amber'}>{position.status}</AtBadge>
      </div>
      <div className="ir-cols-3 mt-3">
        <div><div className="ir-kicker">Ownership</div><div className="mt-1 font-mono text-[11px] font-semibold text-[var(--at-ink)]">{position.ownershipPct == null ? '—' : `${Number(position.ownershipPct).toFixed(4)}%`}</div></div>
        <div><div className="ir-kicker">Issued</div><div className="mt-1 font-mono text-[11px] font-semibold text-[var(--at-ink)]">{formatDate(position.issuedDate, '—')}</div></div>
        <div><div className="ir-kicker">Vesting</div><div className="mt-1 font-mono text-[11px] font-semibold text-[var(--at-ink)]">{position.vestingMonths ? `${position.vestingMonths} months` : '—'}</div></div>
      </div>
      {position.vesting && (
        <div className="mt-3">
          <div className="ir-progress-row"><span>Schedule estimate</span><strong>{pct}%</strong></div>
          <AtProgress value={pct} />
          <div className="ir-field-note mt-1">{position.vesting.note} Recorded terms control; this is not a legal determination of vested shares.</div>
        </div>
      )}
      {position.transferRestrictions && <p className="ir-card-text"><span className="font-semibold text-[var(--at-ink)]">Restrictions:</span> {position.transferRestrictions}</p>}
      <div className="ir-field-note mt-2">Source: {position.sourceReference} · Approved {formatDate(position.approvedAt)}</div>
    </div>
  );
}

function ApprovedPortal({ portal, reload }) {
  const positions = portal.positions || [];
  const documents = portal.documents || [];
  const meetings = portal.meetings || [];
  const voting = portal.voting || [];
  const totals = portal.totals || { positions: 0, shares: 0, classes: [] };
  const shareholder = portal.shareholder || {};

  return (
    <>
      <section className="ir-sec">
        <IrStatGrid items={[
          { label: 'Active positions', value: String(totals.positions || 0), note: 'Verified ownership records.', badge: 'Own only', badgeTone: 'green' },
          { label: 'Shares recorded', value: formatNumber(totals.shares, 2), note: 'Across active positions.', tone: 'gold' },
          { label: 'Share classes', value: totals.classes?.join(', ') || '—', note: 'As recorded by the company.' },
          { label: 'Voting records', value: String(voting.length), note: 'Historical records only. No live vote.' },
        ]} />
      </section>

      <section className="ir-sec">
        <IrSectionHead index="01" title="Your positions" sub="Certificate, class, ownership and vesting terms. No other shareholder is visible." action={<AtButton onClick={reload} variant="outline" size="sm" icon={Loader2}>Refresh</AtButton>} />
        {positions.length === 0 ? (
          <AtPanel flush><AtEmpty icon={Landmark} title="No position recorded" sub="Your access is approved, but no executed ownership record is linked to this account yet. Contact investor relations if this is unexpected." action={<AtButton to="/investors/contact" variant="outline" size="sm">Contact IR</AtButton>} /></AtPanel>
        ) : (
          <div className="ir-cols-2">{positions.map((position) => <PositionCard key={position.id} position={position} />)}</div>
        )}
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Voting history" title="Your recorded votes" sub="Read-only. The portal does not cast or change a vote.">
              {voting.length === 0 ? (
                <AtEmpty icon={Vote} title="No voting records" sub="No meeting vote is linked to your account. A live meeting or proxy process is not enabled." />
              ) : (
                <div className="ir-table-wrap">
                  <table className="ir-table">
                    <thead><tr><th>Agenda item</th><th>Vote</th><th>Recorded</th></tr></thead>
                    <tbody>{voting.map((row) => <tr key={row.id}><td>{row.agendaItem}</td><td><AtBadge tone={row.vote === 'for' ? 'green' : row.vote === 'against' ? 'red' : 'muted'}>{row.vote}</AtBadge></td><td className="num">{formatDate(row.recordedAt)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Meetings" title="Shareholder meetings" sub="Public notices and recorded status.">
              {meetings.length === 0 ? (
                <AtEmpty icon={CalendarClock} title="No meetings scheduled" sub="A meeting notice will appear here when one is published." />
              ) : (
                <div className="ir-list">
                  {meetings.map((meeting) => (
                    <div className="ir-list-row" key={meeting.id}>
                      <div className="ir-list-main"><div className="ir-list-title">{meeting.title}</div><div className="ir-list-sub">{formatDate(meeting.meetingDate, 'Date not published')}{meeting.recordDate ? ` · Record date ${formatDate(meeting.recordDate)}` : ''}</div>{meeting.details && <div className="ir-list-sub">{meeting.details}</div>}</div>
                      <div className="ir-list-side"><AtBadge tone={meeting.status === 'completed' ? 'green' : meeting.status === 'cancelled' ? 'red' : 'blue'}>{meeting.status}</AtBadge>{meeting.noticeUrl && <a href={meeting.noticeUrl} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-[var(--at-gold)]">Notice</a>}</div>
                    </div>
                  ))}
                </div>
              )}
            </AtPanel>
          </div>
        </div>
      </section>

      <section className="ir-sec">
        <div className="ir-cols-12">
          <div className="ir-span-7">
            <AtPanel eyebrow="Account security" title="Protect access to your record" sub="Privileged records deserve stronger authentication.">
              <div className="ir-security-note"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" /><span>Enable multi-factor authentication on your TradingBible account. Never share your sign-in code. Shareholder access is read-only and every privileged change is audited.</span></div>
              <div className="ir-sep" />
              <div className="ir-cols-2">
                <div className="ir-account-card"><div className="ir-kicker">Email</div><div className="text-[12px] font-semibold">{shareholder.email}</div></div>
                <div className="ir-account-card"><div className="ir-kicker">Access</div><div className="text-[12px] font-semibold text-[var(--at-green)]">Verified · read-only</div></div>
              </div>
            </AtPanel>
          </div>
          <div className="ir-span-5">
            <AtPanel eyebrow="Statements" title="Issued documents" sub="Only public documents are listed here.">
              {documents.length === 0 ? <AtEmpty icon={FileText} title="No public statements" sub="A shareholder statement is not generated by this page. Issued documents will appear only when published." /> : <IrDocumentList documents={documents.slice(0, 6)} />}
            </AtPanel>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ShareholderPortalPage() {
  const { isAuthed, user, isAuthReady } = useAuth();
  const { data, loading, error, reload } = useShareholderPortal(isAuthed);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (requestSent) {
      reload();
      setRequestSent(false);
    }
  }, [requestSent, reload]);

  const status = data?.status;
  const showApproved = status === 'approved';
  const showPending = status === 'pending' || status === 'requested' || status === 'suspended' || status === 'revoked';
  const showRequest = isAuthed && !loading && !error && (!data || status === 'not_requested');

  return (
    <InvestorShell active="Shareholders">
      <div className="ir-page cap-page">
        <CapPublicHead
          title="Shareholder portal"
          aside={(
            <CapRecordCard
              title="Portal access"
              badge={showApproved ? 'Verified' : showPending ? 'In review' : isAuthed ? 'Signed in' : 'Sign in required'}
              rows={[
                ['Authentication', isAuthed ? 'Signed in' : 'Required'],
                ['Verification', showApproved ? 'Verified' : showPending ? 'Pending' : 'Not started'],
                ['Ownership data', showApproved ? 'Visible' : 'Hidden'],
                ['Transfers', 'Not enabled'],
                ['Voting execution', 'Not enabled'],
              ]}
              note="No public page exposes an individual holding. No request changes legal ownership."
            />
          )}
        />
        <div className="mt-2"><InvestorNotice /></div>

        {!isAuthReady || (isAuthed && loading) ? (
          <section className="ir-sec"><div className="ir-card flex items-center gap-2 text-[11px] text-[var(--at-mut)]"><Loader2 className="h-4 w-4 animate-spin" /> Checking your authenticated access…</div></section>
        ) : !isAuthed ? (
          <section className="ir-sec"><div className="ir-cols-12"><div className="ir-span-7"><SignInGate /></div><div className="ir-span-5"><AtPanel eyebrow="Access boundary" title="Not a public register" sub="What the portal will and will not do."><ul className="ir-bullet-list"><li>It returns only records linked to the authenticated, verified account.</li><li>It never exposes another shareholder's identity or position.</li><li>It does not issue shares, move certificates or execute a transfer.</li><li>It does not cast a vote or act as a proxy.</li><li>Every administrator decision is written to an audit stream.</li></ul></AtPanel></div></div></section>
        ) : error ? (
          <section className="ir-sec"><AtAlert icon={ShieldCheck} tone="amber"><div className="flex flex-wrap items-center justify-between gap-2"><span>{error}</span><AtButton onClick={reload} variant="outline" size="sm">Retry</AtButton></div></AtAlert></section>
        ) : showApproved ? (
          <ApprovedPortal portal={data} reload={reload} />
        ) : showPending ? (
          <section className="ir-sec"><PendingState portal={data} reload={reload} /></section>
        ) : showRequest ? (
          <section className="ir-sec">
            <div className="ir-cols-12">
              <div className="ir-span-7">
                <AtPanel eyebrow="Access request" title="Request verified shareholder access" sub="No positions are visible until an administrator verifies your identity and approves the request.">
                  <AccessRequestForm user={user} onRequested={() => setRequestSent(true)} />
                </AtPanel>
              </div>
              <div className="ir-span-5">
                <AtPanel eyebrow="Before you request" title="What you will see" sub="A narrow, read-only record.">
                  <ul className="ir-bullet-list">
                    <li>Your own active positions and certificate references.</li>
                    <li>Share class, ownership percentage and recorded issue date.</li>
                    <li>Vesting terms and a schedule estimate, with the contractual documents controlling.</li>
                    <li>Your historical voting records and public meeting notices.</li>
                    <li>Public documents only; no other shareholder's data.</li>
                  </ul>
                  <div className="ir-security-note mt-3"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-gold)]" /><span>The portal cannot create, transfer, cancel or vote shares. Contact IR if your legal record needs correction.</span></div>
                </AtPanel>
              </div>
            </div>
          </section>
        ) : (
          <section className="ir-sec"><AtPanel flush><AtEmpty icon={ShieldCheck} title="Access unavailable" sub="The portal did not return an active access state. Contact investor relations for help." action={<AtButton to="/investors/contact" variant="outline" size="sm">Contact IR</AtButton>} /></AtPanel></section>
        )}

        <section className="ir-sec"><div className="ir-disclosure">Shareholder records are private and read-only. The portal is not a transfer agent, securities intermediary, voting platform or source of a share price. TB is a proposed ticker and the company is not publicly traded. Email {TB_ISSUER.irEmail} for access questions.</div></section>
      </div>
    </InvestorShell>
  );
}
