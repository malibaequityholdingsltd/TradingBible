import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, Download, Eye, FileSignature, FileText, Loader2, Lock, RefreshCw,
  Scale, Search, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import TbcDocumentViewer from '@/components/TbcDocumentViewer';
import TbcExecutionPanel from '@/components/TbcExecutionPanel';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtPageBar, AtPanel, AtSectionHeading,
} from '@/components/AtelierUI';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const fmtBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

const TRACKS = [
  { id: 'all', label: 'All 20' },
  { id: 'Framework', label: 'Framework' },
  { id: 'Private placement', label: 'Private placement' },
  { id: 'Regulation CF', label: 'Regulation CF' },
  { id: 'Execution', label: 'Execution' },
];

const STATE_TONE = {
  not_prepared: 'muted',
  prepared: 'gold',
  awaiting_signatures: 'amber',
  delivered: 'blue',
  executed: 'green',
  declined: 'red',
  voided: 'red',
  approved: 'green',
};

export default function AdminFundraisingDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [executions, setExecutions] = useState({});
  const [executionState, setExecutionState] = useState(null);
  const [track, setTrack] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const objectUrl = useRef('');

  const token = () => pb.authStore?.token || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const auth = token();
      if (!auth) throw new Error('Admin session unavailable. Sign in again.');
      const headers = { Authorization: `Bearer ${auth}` };
      const [docRes, execRes] = await Promise.all([
        fetch(`${API_SERVER_URL}/admin/fundraising-documents`, { headers }),
        fetch(`${API_SERVER_URL}/admin/fundraising-documents/executions`, { headers }).catch(() => null),
      ]);
      if (!docRes.ok) throw new Error(docRes.status === 403 ? 'Admin access required.' : `Fundraising packet unavailable (${docRes.status})`);
      const data = await docRes.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      if (execRes?.ok) {
        const executionData = await execRes.json().catch(() => ({}));
        setExecutionState(executionData);
        setExecutions(Object.fromEntries((executionData.documents || []).map((item) => [item.slug, item])));
      } else {
        setExecutionState(null);
        setExecutions({});
      }
    } catch (err) {
      setError(err?.message || 'Fundraising packet unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (track !== 'all' && doc.track !== track) return false;
      if (!q) return true;
      return `${doc.number} ${doc.title} ${doc.subtitle} ${doc.category} ${doc.summary}`.toLowerCase().includes(q);
    });
  }, [documents, track, query]);

  const counts = useMemo(() => {
    const next = { all: documents.length };
    for (const item of TRACKS) {
      if (item.id !== 'all') next[item.id] = documents.filter((doc) => doc.track === item.id).length;
    }
    return next;
  }, [documents]);

  const closeViewer = () => {
    setSelected(null);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const openViewer = async (doc) => {
    setBusy(`view:${doc.slug}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/fundraising-documents/${encodeURIComponent(doc.slug)}/docx`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required.' : `Document unavailable (${res.status})`);
      const blob = await res.blob();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setSelected({ doc, url: objectUrl.current });
    } catch (err) {
      window.alert(err?.message || 'Document unavailable');
    } finally {
      setBusy('');
    }
  };

  const downloadDocument = async (doc, format = 'docx') => {
    setBusy(`${format}:${doc.slug}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/fundraising-documents/${encodeURIComponent(doc.slug)}/${format}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      downloadBlob(blob, `${doc.number}-${doc.slug}.${format}`);
    } catch (err) {
      window.alert(err?.message || 'Download failed');
    } finally {
      setBusy('');
    }
  };

  const downloadPacket = async () => {
    setBusy('packet');
    setNotice('');
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/fundraising-documents/packet.zip`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`Packet download failed (${res.status})`);
      const blob = await res.blob();
      downloadBlob(blob, 'TradingBible-Fundraising-Packet-2026-11.zip');
      setNotice('Packet ZIP downloaded. It contains the 20 DOCX/PDF drafts, the manifest, the fundraising communications pack and a README warning that the packet is not executable.');
    } catch (err) {
      window.alert(err?.message || 'Packet download failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <AdminLayout title="Fundraising Documents">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          meta={[
            `${counts.all || '—'} controlled drafts`,
            'Admin only',
            'No public offering page',
            'DocuSign gated',
          ]}
          actions={(
            <>
              <AtButton to="/admin/communications" variant="quiet" icon={FileText}>Communications</AtButton>
              <AtButton to="/admin/investor-relations" variant="quiet" icon={Lock}>Investor records</AtButton>
              <AtButton onClick={downloadPacket} disabled={busy === 'packet'} variant="gold" icon={busy === 'packet' ? Loader2 : Archive}>
                {busy === 'packet' ? 'Building packet…' : 'Download packet'}
              </AtButton>
            </>
          )}
        />

        <div className="mt-3 space-y-3">
          <AtAlert icon={TriangleAlert} tone="red">
            <b className="text-[var(--at-ink)]">DRAFT · NOT EXECUTED · COUNSEL REVIEW REQUIRED.</b>{' '}
            These are company-drafted fundraising files, not an offer, solicitation, filing, qualification, approval or executed instrument.
            There is no public fundraising page and no investment button. Private-placement communications must remain one-to-one and
            limited to existing relationships; Regulation CF communications must wait for SEC qualification and the registered intermediary.
          </AtAlert>
          <AtAlert icon={ShieldCheck} tone="amber">
            <b className="text-[var(--at-ink)]">What is complete:</b> the branded 20-document packet, the Form D worksheet, the Reg CF preparation
            workbook, the SAFE forms, the investor certificates and the 45-template email/SMS/in-app registry. <b className="text-[var(--at-ink)]">What is not:</b>{' '}
            corporate registration details, a cap table, audited or reviewed financials, board-authorized terms, a qualified Reg CF offering,
            a Form D filing, production DocuSign credentials and counsel sign-off. Blanks remain visible on purpose.
          </AtAlert>
        </div>

        <TbcExecutionPanel
          onChanged={load}
          apiBase="/admin/fundraising-documents"
          title="Fundraising execution & approvals"
          subtitle="Controlled DOCX/PDF instruments · every signature, name, capacity, date and questionnaire field is anchored to the correct party's own block · execution is locked until the board and counsel gate is opened"
          panelSub="fundraising instruments"
          documentListLabel="Fundraising documents"
          emptySub="Build the fundraising packet with scripts/build-fundraising-documents.py before preparing execution."
          approvalOptions={[{ value: 'approved', label: 'Counsel cleared / board approved' }]}
          approvalStateDefault="approved"
          approvalHelp="Record this only after DocuSign reports the envelope as executed and counsel has cleared the exact document version. This is an instrument-level evidence record; it is not an SEC qualification, a Form D filing, a closing, a funding confirmation or an authorization to solicit."
          approvalPlaceholder="Board resolution, counsel advice, signatory authority, version, conditions…"
          scopeNote="Company and counsel sign only their own execution blocks. Investor questionnaires use custom text and checkbox tabs anchored to the investor's own lines. Optional parties are off by default. No bank details are sent in a DocuSign message."
          executionEnabled={Boolean(executionState?.executionEnabled)}
          executionDisabledReason={executionState?.executionLockReason || 'Fundraising execution is locked. Set FUNDRAISING_EXECUTION_ENABLED=true only after board authorization and counsel review of the exact document version.'}
        />

        {notice && <div className="mt-4"><AtAlert icon={ShieldCheck} tone="green">{notice}</AtAlert></div>}

        <AtSectionHeading
          className="mt-6"
          index="02"
          title="Confidential fundraising packet"
          sub="Read the current draft as Word, download the read-only DOCX or the DocuSign-anchored PDF, or take the whole packet for counsel"
          action={<span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">{counts.all} records · internal</span>}
        />

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-3 xl:flex-row xl:items-center">
          <div className="at-segmented shrink-0 overflow-x-auto">
            {TRACKS.map((item) => (
              <button key={item.id} type="button" onClick={() => setTrack(item.id)} className={track === item.id ? 'is-active' : ''}>
                {item.label}
                <span className="font-mono text-[9px] opacity-70">{counts[item.id] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, number, category…"
              className="at-input !pl-9"
            />
          </div>
          <div className="flex items-center gap-2 xl:ml-auto">
            <AtBadge tone="amber">Draft only</AtBadge>
            <AtBadge tone={executionState?.executionEnabled ? 'green' : 'muted'}>
              {executionState?.executionEnabled ? 'Execution gate open' : 'Execution locked'}
            </AtBadge>
            <AtButton onClick={load} variant="quiet" size="sm" icon={loading ? Loader2 : RefreshCw} disabled={loading}>Refresh</AtButton>
          </div>
        </div>

        {loading && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="at-card h-60 animate-pulse bg-[var(--at-soft)]" />)}
          </div>
        )}

        {error && !loading && (
          <div className="mt-5">
            <AtAlert icon={TriangleAlert} tone="red">
              {error}{' '}
              <button type="button" onClick={load} className="font-bold text-[var(--at-gold)] underline">Retry</button>
            </AtAlert>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-[var(--at-mut)]">
                Confidential packet index
                <span className="ml-2 font-mono text-[9px] text-[var(--at-mut-2)]">{filtered.length} of {documents.length} · internal only</span>
              </p>
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">DOCX reader · PDF for DocuSign · ZIP for counsel</span>
            </div>

            {!filtered.length ? (
              <div className="at-card"><AtEmpty icon={FileText} title="No fundraising documents match" sub="Clear the search or choose another track." /></div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((doc) => (
                  <FundraisingCard
                    key={doc.slug}
                    doc={doc}
                    execution={executions[doc.slug]}
                    busy={busy}
                    onOpen={openViewer}
                    onDownload={downloadDocument}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <AtPanel
          className="mt-6"
          eyebrow="Packet control"
          title="What is intentionally still blank"
          sub="These are the facts that must be completed from company records before any document can leave the draft state."
        >
          <div className="grid gap-x-8 gap-y-2 text-[11px] leading-relaxed text-[var(--at-mut)] sm:grid-cols-2">
            {[
              'Certificate of incorporation date, principal address, fiscal year end and officer/director records.',
              'Board-authorized security, offering amount, minimum target, price, valuation cap and use-of-proceeds budget.',
              'Reconciled cap table, SAFE register, option pool, prior offerings and related-party disclosures.',
              'Audited or reviewed financial statements, accountant identity and going-concern conclusion.',
              'Registered intermediary, CRD number, escrow arrangement and Reg CF campaign URL.',
              'Counsel sign-off on the exact document version and the communications gate.',
            ].map((item) => (
              <div key={item} className="flex gap-2 border-b border-[var(--at-line-soft)] pb-2 last:border-0">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--at-gold)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </AtPanel>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-3 text-[10px] text-[var(--at-mut)]">
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Admin-authenticated streaming</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--at-green)]" /> No public page · no solicitation</span>
          <span className="flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-[var(--at-amber)]" /> Counsel review required</span>
          <AtButton to="/admin/tb-stock-documents" variant="quiet" size="sm" className="ml-auto">TB stock documents</AtButton>
        </div>
      </div>

      <TbcDocumentViewer
        open={Boolean(selected)}
        doc={selected?.doc}
        docxUrl={selected?.url || ''}
        onDownloadDocx={() => selected?.doc && downloadDocument(selected.doc, 'docx')}
        onClose={closeViewer}
        redactedSignatories
      />
    </AdminLayout>
  );
}

function FundraisingCard({ doc, execution, busy, onOpen, onDownload }) {
  const state = execution?.state || 'not_prepared';
  const tone = STATE_TONE[state] || 'muted';
  const isBusy = (suffix) => busy === `${suffix}:${doc.slug}`;
  return (
    <article className="at-card at-card--hover at-doc-card">
      <div className="relative p-4">
        <span className="at-doc-number">{doc.number}</span>
        <div className="flex flex-wrap items-center gap-1.5 pr-14">
          <AtBadge tone="amber">Draft · not executed</AtBadge>
          <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{doc.track}</span>
        </div>
        <h3 className="mt-3 max-w-[92%] text-[13px] font-semibold leading-snug tracking-[-0.015em] text-[var(--at-ink)]">{doc.title}</h3>
        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{doc.subtitle || doc.summary}</p>

        <dl className="at-doc-meta">
          <div><dt>Version</dt><dd>{doc.version}</dd></div>
          <div><dt>Execution</dt><dd className={`!text-[var(--at-${tone})]`}>{execution?.label || doc.signatureStatus || 'Not prepared'}</dd></div>
          <div><dt>Signatures</dt><dd className="line-clamp-2">{doc.signatureFields || '—'}</dd></div>
          <div><dt>Files</dt><dd>DOCX {fmtBytes(doc.docxBytes)} · PDF {fmtBytes(doc.pdfBytes)}</dd></div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AtButton onClick={() => onOpen(doc)} disabled={isBusy('view')} variant="outline" size="sm" icon={isBusy('view') ? Loader2 : Eye}>
            {isBusy('view') ? 'Loading…' : 'View'}
          </AtButton>
          <AtButton onClick={() => onDownload(doc, 'docx')} disabled={isBusy('docx')} variant="quiet" size="sm" icon={Download}>DOCX</AtButton>
          <AtButton onClick={() => onDownload(doc, 'pdf')} disabled={isBusy('pdf')} variant="quiet" size="sm" icon={FileSignature}>PDF</AtButton>
        </div>
      </div>
    </article>
  );
}
