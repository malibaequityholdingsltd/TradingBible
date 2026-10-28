import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, FileSignature, Loader2, RefreshCw, Send, ShieldCheck,
  Stamp, TriangleAlert,
} from 'lucide-react';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPanel, AtSectionHeading,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const STATE_TONE = {
  not_prepared: 'muted',
  prepared: 'gold',
  awaiting_signatures: 'amber',
  delivered: 'blue',
  executed: 'green',
  declined: 'red',
  voided: 'red',
  approved: 'green',
  cleared: 'green',
  licensed: 'green',
  live: 'green',
};

const APPROVAL_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'live', label: 'Live' },
];

const fmtWhen = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const cleanDraft = (recipients) => Object.fromEntries(
  (recipients || []).map((recipient) => [recipient.id, {
    selected: Boolean(recipient.selected),
    name: recipient.name || '',
    email: recipient.email || '',
    routingOrder: recipient.routingOrder || 1,
  }]),
);

export default function TbcExecutionPanel({
  onChanged,
  apiBase = '/admin/legal-vault',
  title = 'Execution & approvals',
  subtitle = 'DocuSign envelopes for the five public summaries and 26 controlled instruments · each signer gets only their own anchored fields · status syncs by webhook or manual pull',
  panelSub = 'public and controlled instruments',
  documentListLabel = 'TBC documents',
  emptySub = 'Provision the TBC document package on the API host to prepare execution.',
  approvalOptions = APPROVAL_OPTIONS,
  approvalStateDefault = 'approved',
  approvalHelp = 'Record an approval only after DocuSign reports the envelope as executed. Approval states are evidence records; they do not enable token sale, staking, governance, migration or chain features.',
  approvalPlaceholder = 'Resolution reference, counsel advice, license number, conditions…',
  scopeNote = 'Each signer receives signature, printed-name, capacity and date tabs anchored only to their own execution block. Optional parties are off by default.',
}) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlug, setSelectedSlug] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [approvalState, setApprovalState] = useState('approved');
  const [approvalNote, setApprovalNote] = useState('');

  const token = () => pb.authStore?.token || '';

  const api = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_SERVER_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || data?.error?.message || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  }, []);

  const load = useCallback(async (preferredSlug) => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`${apiBase}/executions`);
      setState(data);
      setSelectedSlug((current) => {
        const next = preferredSlug || current;
        if (next && data.documents?.some((doc) => doc.slug === next)) return next;
        return data.documents?.[0]?.slug || '';
      });
    } catch (err) {
      setError(err?.message || 'Execution register unavailable');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(
    () => state?.documents?.find((doc) => doc.slug === selectedSlug) || null,
    [state, selectedSlug],
  );

  useEffect(() => {
    if (!selected) return;
    setDrafts(cleanDraft(selected.recipients));
    setApprovalState(selected.approvalStatus && selected.approvalStatus !== 'not_requested' ? selected.approvalStatus : approvalStateDefault);
    setApprovalNote(selected.approvalNote || '');
    setNotice('');
  }, [selected?.slug, selected?.lastSyncedAt, selected?.approvalAt, approvalStateDefault]);

  const counts = useMemo(() => {
    const docs = state?.documents || [];
    return {
      prepared: docs.filter((doc) => doc.state !== 'not_prepared').length,
      awaiting: docs.filter((doc) => ['prepared', 'awaiting_signatures', 'delivered'].includes(doc.state)).length,
      executed: docs.filter((doc) => doc.state === 'executed').length,
      approved: docs.filter((doc) => ['approved', 'cleared', 'licensed', 'live'].includes(doc.state)).length,
    };
  }, [state]);

  const updateDraft = (id, patch) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const saveWorkflow = async () => {
    if (!selected) return null;
    setBusy('save');
    setNotice('');
    try {
      const recipients = selected.recipients.map((recipient) => ({
        ...drafts[recipient.id],
        id: recipient.id,
        routingOrder: recipient.routingOrder || 1,
      }));
      const data = await api(`${apiBase}/${encodeURIComponent(selected.slug)}/workflow`, {
        method: 'PUT',
        body: JSON.stringify({ recipients }),
      });
      await load(selected.slug);
      onChanged?.();
      setNotice('Signer assignments saved to the execution register.');
      return data.execution;
    } catch (err) {
      setError(err?.message || 'Could not save signer assignments');
      return null;
    } finally {
      setBusy('');
    }
  };

  const send = async () => {
    if (!selected) return;
    setBusy('send');
    setError('');
    setNotice('');
    try {
      const recipients = selected.recipients.map((recipient) => ({
        ...drafts[recipient.id],
        id: recipient.id,
        routingOrder: recipient.routingOrder || 1,
      }));
      await api(`${apiBase}/${encodeURIComponent(selected.slug)}/workflow`, {
        method: 'PUT',
        body: JSON.stringify({ recipients }),
      });
      const data = await api(`${apiBase}/${encodeURIComponent(selected.slug)}/send`, {
        method: 'POST',
        body: JSON.stringify({ draft: !sendImmediately }),
      });
      await load(selected.slug);
      onChanged?.();
      setNotice(data.draft
        ? 'DocuSign draft envelope prepared. Review it in DocuSign, then release it from this panel.'
        : 'DocuSign envelope sent. Each signer can access only the tabs anchored to their own execution block.');
    } catch (err) {
      setError(err?.message || 'Could not create the DocuSign envelope');
    } finally {
      setBusy('');
    }
  };

  const submitDraft = async () => {
    if (!selected) return;
    setBusy('submit');
    setError('');
    try {
      await api(`${apiBase}/${encodeURIComponent(selected.slug)}/submit`, { method: 'POST' });
      await load(selected.slug);
      onChanged?.();
      setNotice('Draft envelope released for signature.');
    } catch (err) {
      setError(err?.message || 'Could not send the draft envelope');
    } finally {
      setBusy('');
    }
  };

  const sync = async () => {
    if (!selected) return;
    setBusy('sync');
    setError('');
    try {
      await api(`${apiBase}/${encodeURIComponent(selected.slug)}/sync`, { method: 'POST' });
      await load(selected.slug);
      onChanged?.();
      setNotice('Envelope and recipient status pulled from DocuSign.');
    } catch (err) {
      setError(err?.message || 'Could not sync from DocuSign');
    } finally {
      setBusy('');
    }
  };

  const recordApproval = async () => {
    if (!selected) return;
    setBusy('approval');
    setError('');
    try {
      await api(`${apiBase}/${encodeURIComponent(selected.slug)}/approval`, {
        method: 'POST',
        body: JSON.stringify({ status: approvalState, note: approvalNote }),
      });
      await load(selected.slug);
      onChanged?.();
      setNotice('Approval decision recorded. Operational gates remain independently controlled.');
    } catch (err) {
      setError(err?.message || 'Could not record approval');
    } finally {
      setBusy('');
    }
  };

  const configured = Boolean(state?.configured);
  const isDraft = selected?.providerStatus === 'created';
  const canSend = configured && selected && ['not_prepared', 'declined', 'voided'].includes(selected.state)
    && !selected.envelopeId;
  const canApprove = selected?.state === 'executed' || ['approved', 'cleared', 'licensed', 'live'].includes(selected?.state);

  return (
    <section className="mt-5">
      <AtSectionHeading
        index="01"
        title={title}
        sub={subtitle}
        action={<AtBadge tone={configured ? 'green' : 'amber'}>{configured ? 'DocuSign configured' : 'DocuSign setup required'}</AtBadge>}
      />

      <AtPanel
        title="Signature register"
        sub={`${counts.prepared} prepared · ${counts.awaiting} awaiting signatures · ${counts.executed} executed · ${counts.approved} approved · ${panelSub}`}
        action={<AtButton onClick={() => load(selectedSlug)} variant="quiet" size="sm" icon={loading ? Loader2 : RefreshCw} disabled={loading}>Refresh</AtButton>}
        bodyClassName="p-0"
      >
        {!configured && (
          <div className="border-b border-[var(--at-line-soft)] p-4">
            <AtAlert icon={TriangleAlert} tone="amber">
              <b className="text-[var(--at-ink)]">DocuSign is not connected on this API server.</b>{' '}
              Add {state?.missing?.length ? state.missing.join(', ') : 'the DocuSign credentials'} to the API environment, then restart the API.
              The register can still be prepared, but envelopes cannot be sent until credentials are present.
            </AtAlert>
          </div>
        )}

        {error && (
          <div className="border-b border-[var(--at-line-soft)] p-4">
            <AtAlert icon={TriangleAlert} tone="red">{error}</AtAlert>
          </div>
        )}
        {notice && (
          <div className="border-b border-[var(--at-line-soft)] p-4">
            <AtAlert icon={Check} tone="green">{notice}</AtAlert>
          </div>
        )}

        {loading && !state ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-[var(--at-soft)]" />)}
          </div>
        ) : !state?.documents?.length ? (
          <AtEmpty icon={FileSignature} title="No documents found" sub={emptySub} />
        ) : (
          <div className="at-exec-layout">
            <div className="at-exec-list" role="listbox" aria-label={documentListLabel}>
              {state.documents.map((doc) => (
                <button
                  key={doc.slug}
                  type="button"
                  role="option"
                  aria-selected={doc.slug === selectedSlug}
                  onClick={() => setSelectedSlug(doc.slug)}
                  className={`at-exec-item ${doc.slug === selectedSlug ? 'is-active' : ''}`}
                >
                  <span className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span className="mt-0.5 font-mono text-[9px] text-[var(--at-gold)]">{doc.number}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-[var(--at-ink)]">{doc.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <AtBadge tone={STATE_TONE[doc.state] || 'muted'}>{doc.label}</AtBadge>
                        <AtBadge tone={doc.visibility === 'public' ? 'blue' : 'muted'}>{doc.visibility === 'public' ? 'Public' : 'Controlled'}</AtBadge>
                        <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{doc.signed}/{doc.selected} signed</span>
                      </span>
                    </span>
                  </span>
                  <ChevronRight className={`mt-1 h-3.5 w-3.5 shrink-0 text-[var(--at-mut-2)] ${doc.slug === selectedSlug ? 'text-[var(--at-gold)]' : ''}`} />
                </button>
              ))}
            </div>

            {selected && (
              <div className="min-w-0 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--at-line-soft)] pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AtBadge tone="gold">{selected.number}</AtBadge>
                      <AtBadge tone={STATE_TONE[selected.state] || 'muted'}>{selected.label}</AtBadge>
                      {selected.approvalBy && <span className="font-mono text-[9px] text-[var(--at-mut-2)]">by {selected.approvalBy}</span>}
                    </div>
                    <h3 className="mt-2 max-w-2xl text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[var(--at-ink)]">{selected.title}</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">
                      {selected.providerStatus ? `DocuSign status: ${selected.providerStatus}` : 'No DocuSign envelope yet.'}
                      {selected.envelopeId ? ` · Envelope ${selected.envelopeId.slice(0, 8)}…` : ''}
                      {selected.completedAt ? ` · Completed ${fmtWhen(selected.completedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.envelopeId && (
                      <AtButton onClick={sync} disabled={Boolean(busy) || !configured} variant="outline" size="sm" icon={busy === 'sync' ? Loader2 : RefreshCw}>
                        Sync
                      </AtButton>
                    )}
                    {isDraft && (
                      <AtButton onClick={submitDraft} disabled={Boolean(busy) || !configured} variant="gold" size="sm" icon={busy === 'submit' ? Loader2 : Send}>
                        Release draft
                      </AtButton>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="at-eyebrow">Signing scope</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">
                        {scopeNote}
                      </p>
                    </div>
                    <AtBadge tone="blue">{selected.selected} recipients selected</AtBadge>
                  </div>

                  <div className="space-y-2">
                    {selected.recipients.map((recipient) => {
                      const draft = drafts[recipient.id] || {};
                      return (
                        <div key={recipient.id} className={`at-signer-row ${recipient.required ? 'is-required' : ''}`}>
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={Boolean(draft.selected)}
                              disabled={recipient.required || Boolean(selected.envelopeId)}
                              onChange={(event) => updateDraft(recipient.id, { selected: event.target.checked })}
                              aria-label={`Include ${recipient.party}`}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-[var(--at-ink)]">{recipient.party || recipient.label}</span>
                                {recipient.required ? <AtBadge tone="gold">Required</AtBadge> : <AtBadge>Optional</AtBadge>}
                                {recipient.status && <AtBadge tone={recipient.status === 'completed' ? 'green' : recipient.status === 'declined' ? 'red' : 'blue'}>{recipient.status}</AtBadge>}
                              </div>
                              {recipient.capacity && <p className="mt-0.5 text-[10px] text-[var(--at-mut)]">{recipient.capacity}</p>}
                              <p className="mt-1 font-mono text-[9px] leading-relaxed text-[var(--at-mut-2)]">Tab anchor: {recipient.anchor || recipient.label}</p>
                            </div>
                          </div>
                          <div className="at-signer-fields">
                            <label className="at-label">
                              Full name
                              <input
                                className="at-input"
                                value={draft.name || ''}
                                disabled={!draft.selected || Boolean(selected.envelopeId)}
                                onChange={(event) => updateDraft(recipient.id, { name: event.target.value })}
                                placeholder="Required signer name"
                                autoComplete="off"
                              />
                            </label>
                            <label className="at-label">
                              Email
                              <input
                                className="at-input"
                                type="email"
                                value={draft.email || ''}
                                disabled={!draft.selected || Boolean(selected.envelopeId)}
                                onChange={(event) => updateDraft(recipient.id, { email: event.target.value })}
                                placeholder="name@company.com"
                                autoComplete="off"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AtButton onClick={saveWorkflow} disabled={Boolean(busy) || Boolean(selected.envelopeId)} variant="outline" size="sm" icon={busy === 'save' ? Loader2 : Check}>
                      Save signer list
                    </AtButton>
                    <AtButton onClick={send} disabled={Boolean(busy) || !canSend} variant="gold" size="sm" icon={busy === 'send' ? Loader2 : Send}>
                      {selected.envelopeId ? 'Envelope already sent' : 'Send via DocuSign'}
                    </AtButton>
                    <label className="at-check text-[10px] text-[var(--at-mut)]">
                      <input type="checkbox" checked={sendImmediately} onChange={(event) => setSendImmediately(event.target.checked)} disabled={Boolean(selected.envelopeId)} />
                      Send immediately (uncheck to prepare a DocuSign draft)
                    </label>
                  </div>
                  {!configured && <p className="mt-2 text-[10px] text-[var(--at-amber)]">Sending is disabled until the DocuSign credentials are added to the API environment.</p>}
                </div>

                <div className="mt-5 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="at-eyebrow">Approval evidence</div>
                      <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[var(--at-mut)]">
                        {approvalHelp}
                      </p>
                    </div>
                    <AtBadge tone={canApprove ? 'green' : 'amber'}>
                      {selected.approvalStatus === 'not_requested' ? 'No decision recorded' : selected.approvalStatus}
                    </AtBadge>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="at-label sm:w-40">
                      Decision
                      <select className="at-select" value={approvalState} onChange={(event) => setApprovalState(event.target.value)} disabled={!canApprove}>
                        {approvalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="at-label min-w-0 flex-1">
                      Evidence / conditions
                      <input
                        className="at-input"
                        value={approvalNote}
                        onChange={(event) => setApprovalNote(event.target.value)}
                        disabled={!canApprove}
                        placeholder={approvalPlaceholder}
                      />
                    </label>
                    <AtButton onClick={recordApproval} disabled={!canApprove || Boolean(busy)} variant="gold" size="sm" icon={busy === 'approval' ? Loader2 : Stamp}>
                      Record
                    </AtButton>
                  </div>
                  {!canApprove && <p className="mt-2 text-[10px] text-[var(--at-amber)]">The approval control unlocks when the DocuSign envelope is executed.</p>}
                  {selected.approvalStatus !== 'not_requested' && (
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--at-mut-2)]">
                      {selected.approvalStatus} · {fmtWhen(selected.approvalAt)}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-[var(--at-mut-2)]">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[var(--at-green)]" /> Recipient-scoped tabs</span>
                  <span className="flex items-center gap-1.5"><FileSignature className="h-3 w-3 text-[var(--at-gold)]" /> Connect webhook verified by HMAC</span>
                  <span className="ml-auto font-mono uppercase tracking-[0.12em]">Last sync {fmtWhen(selected.lastSyncedAt)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </AtPanel>
    </section>
  );
}
