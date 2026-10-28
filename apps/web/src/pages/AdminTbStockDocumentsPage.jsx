import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download, Eye, FileSignature, FileText, Grid2X2, List, Loader2, Lock, RefreshCw,
  Search, ShieldCheck, TriangleAlert,
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

const FILTERS = [
  { id: 'all', label: 'All TB documents' },
  { id: 'open', label: 'Not executed' },
  { id: 'executed', label: 'Executed' },
];

const EXECUTION_TONE = {
  executed: 'green',
  approved: 'green',
  cleared: 'green',
  licensed: 'green',
  live: 'green',
  awaiting_signatures: 'amber',
  delivered: 'blue',
  prepared: 'gold',
  declined: 'red',
  voided: 'red',
};

export default function AdminTbStockDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [executions, setExecutions] = useState({});
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [busySlug, setBusySlug] = useState('');
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
        fetch(`${API_SERVER_URL}/admin/tb-stock-documents`, { headers }),
        fetch(`${API_SERVER_URL}/admin/tb-stock-documents/executions`, { headers }).catch(() => null),
      ]);
      if (!docRes.ok) throw new Error(docRes.status === 403 ? 'Admin access required.' : `TB stock library unavailable (${docRes.status})`);
      const data = await docRes.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      if (execRes?.ok) {
        const executionData = await execRes.json().catch(() => ({}));
        setExecutions(Object.fromEntries((executionData.documents || []).map((item) => [item.slug, item])));
      } else {
        setExecutions({});
      }
    } catch (err) {
      setError(err?.message || 'TB stock library unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const state = executions[doc.slug]?.state;
      if (filter === 'open' && state === 'executed') return false;
      if (filter === 'executed' && state !== 'executed') return false;
      if (!q) return true;
      return `${doc.number} ${doc.title} ${doc.category} ${doc.summary}`.toLowerCase().includes(q);
    });
  }, [documents, executions, filter, query]);

  const counts = useMemo(() => ({
    all: documents.length,
    open: documents.filter((doc) => executions[doc.slug]?.state !== 'executed').length,
    executed: documents.filter((doc) => executions[doc.slug]?.state === 'executed').length,
  }), [documents, executions]);

  const closeViewer = () => {
    setSelected(null);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
  };

  const openViewer = async (doc) => {
    setBusySlug(doc.slug);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/tb-stock-documents/${encodeURIComponent(doc.slug)}/docx`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required.' : `Document unavailable (${res.status})`);
      const blob = await res.blob();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setSelected({ doc, url: objectUrl.current });
    } catch (err) {
      window.alert(err?.message || 'Document unavailable');
    } finally {
      setBusySlug('');
    }
  };

  const download = async (doc) => {
    setBusySlug(`${doc.slug}:docx`);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/tb-stock-documents/${encodeURIComponent(doc.slug)}/docx`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.slug}-readonly.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      window.alert(err?.message || 'Download failed');
    } finally {
      setBusySlug('');
    }
  };

  return (
    <AdminLayout title="TB Stock Documents">
      <div className="at-page at-scope at-enter">
        <AtPageBar
          meta={[
            `${counts.all || '—'} TB stock documents`,
            `${counts.executed || 0} executed`,
            'DocuSign',
            'TB equity only',
          ]}
          actions={(
            <>
              <AtButton to="/admin/investor-relations" variant="quiet" icon={Lock}>Investor records</AtButton>
              <AtButton to="/stock/TB/documents" variant="outline" icon={FileText}>Public library</AtButton>
            </>
          )}
        />

        <div className="mt-3">
          <AtAlert icon={TriangleAlert} tone="amber">
            <b className="text-[var(--at-ink)]">Real DocuSign execution only.</b> These instruments are signature-ready drafts,
            not approved, effective, or executed. Confirm signer identity, capacity, consent, and the required legal and
            regulatory review before creating or releasing an envelope. TB stock records remain separate from TBC token records.
          </AtAlert>
        </div>

        <TbcExecutionPanel
          onChanged={load}
          apiBase="/admin/tb-stock-documents"
          title="TB stock execution & approvals"
          subtitle="Nine signature-ready TB stock instruments · each signer receives only the tabs anchored inside their own execution block · status syncs by webhook or manual pull"
          panelSub="TB stock instruments"
          documentListLabel="TB stock documents"
          emptySub="Provision the TB stock document package in the API storage root before preparing execution."
          approvalOptions={[
            { value: 'approved', label: 'Instrument approved' },
            { value: 'cleared', label: 'Instrument cleared' },
          ]}
          approvalStateDefault="approved"
          approvalHelp="Record approval only after DocuSign reports the envelope as executed. This is an instrument-level evidence record; it does not approve an IPO, listing, offering, share issuance, transfer, valuation, or public market."
          approvalPlaceholder="Resolution reference, counsel advice, signatory authority, conditions…"
          scopeNote="Each signer receives signature, printed-name, capacity and date tabs anchored only to their own execution block. Optional parties are off by default. TB equity is not TBC and cannot be combined, converted, or swapped."
        />

        <AtSectionHeading
          className="mt-6"
          index="02"
          title="TB stock document library"
          sub="Read every signature-ready instrument as Word and download the current read-only copy"
          action={<span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">9 records · public drafts</span>}
        />

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-3 sm:flex-row sm:items-center">
          <div className="at-segmented shrink-0">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={filter === item.id ? 'is-active' : ''}>
                {item.label}
                <span className="font-mono text-[9px] opacity-70">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--at-mut-2)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, number, category…"
              className="at-input !pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="at-segmented">
              <button type="button" onClick={() => setView('grid')} className={view === 'grid' ? 'is-active' : ''} aria-label="Grid view"><Grid2X2 className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setView('list')} className={view === 'list' ? 'is-active' : ''} aria-label="List view"><List className="h-3.5 w-3.5" /></button>
            </div>
            <AtButton onClick={load} variant="quiet" size="sm" icon={RefreshCw} className={loading ? 'opacity-70' : ''}>Refresh</AtButton>
          </div>
        </div>

        {loading && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="at-card h-56 animate-pulse bg-[var(--at-soft)]" />
            ))}
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
                TB stock index
                <span className="ml-2 font-mono text-[9px] text-[var(--at-mut-2)]">{filtered.length} of {documents.length} · {view} view</span>
              </p>
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">DOCX readers · PDFs reserved for DocuSign anchoring</span>
            </div>

            {!filtered.length ? (
              <div className="at-card"><AtEmpty icon={FileText} title="No TB documents match" sub="Clear the search or choose another execution filter." /></div>
            ) : view === 'grid' ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((doc) => (
                  <DocumentCard
                    key={doc.slug}
                    doc={doc}
                    execution={executions[doc.slug]}
                    busySlug={busySlug}
                    onOpen={openViewer}
                    onDownload={download}
                  />
                ))}
              </div>
            ) : (
              <DocumentTable docs={filtered} executions={executions} busySlug={busySlug} onOpen={openViewer} onDownload={download} />
            )}
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-3 text-[10px] text-[var(--at-mut)]">
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--at-green)]" /> Admin-authenticated streaming</span>
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> DOCX only · PDFs not distributed</span>
          <span className="flex items-center gap-2"><FileSignature className="h-3.5 w-3.5 text-[var(--at-amber)]" /> No fabricated signatures or approvals</span>
          <AtButton to="/stock/TB/documents" variant="quiet" size="sm" className="ml-auto">Open the public TB library</AtButton>
        </div>
      </div>

      <TbcDocumentViewer
        open={Boolean(selected)}
        doc={selected?.doc}
        docxUrl={selected?.url || ''}
        onDownloadDocx={() => selected?.doc && download(selected.doc)}
        onClose={closeViewer}
      />
    </AdminLayout>
  );
}

function DocumentCard({ doc, execution, busySlug, onOpen, onDownload }) {
  const state = execution?.state || 'not_prepared';
  const tone = EXECUTION_TONE[state] || 'muted';
  return (
    <article className="at-card at-card--hover at-doc-card">
      <div className="relative p-4">
        <span className="at-doc-number">{doc.number}</span>
        <div className="flex flex-wrap items-center gap-1.5 pr-14">
          <AtBadge tone="green">Public draft</AtBadge>
          <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{doc.category}</span>
        </div>
        <h3 className="mt-3 max-w-[92%] text-[13px] font-semibold leading-snug tracking-[-0.015em] text-[var(--at-ink)]">{doc.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{doc.summary}</p>

        <dl className="at-doc-meta">
          <div><dt>Version</dt><dd>{doc.version}</dd></div>
          <div>
            <dt>Execution</dt>
            <dd className={`!text-[var(--at-${tone})]`}>{execution?.label || doc.signatureStatus}</dd>
          </div>
          <div><dt>Format</dt><dd>DOCX</dd></div>
          <div><dt>Download</dt><dd>{fmtBytes(doc.docxBytes)}</dd></div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <AtButton onClick={() => onOpen(doc)} disabled={busySlug === doc.slug} variant="outline" size="sm" icon={busySlug === doc.slug ? Loader2 : Eye} className={busySlug === doc.slug ? 'opacity-70' : ''}>View</AtButton>
          <AtButton onClick={() => onDownload(doc)} disabled={busySlug === `${doc.slug}:docx`} variant="quiet" size="sm" icon={Download}>Read-only DOCX</AtButton>
        </div>
      </div>
    </article>
  );
}

function DocumentTable({ docs, executions, busySlug, onOpen, onDownload }) {
  return (
    <div className="at-table-wrap">
      <table className="at-table min-w-[980px]">
        <thead>
          <tr><th>Document</th><th>Category</th><th>Visibility</th><th>Signatures</th><th>Files</th><th className="text-right">Actions</th></tr>
        </thead>
        <tbody>
          {docs.map((doc) => {
            const execution = executions[doc.slug];
            const state = execution?.state || 'not_prepared';
            return (
              <tr key={doc.slug}>
                <td>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-[9px] text-[var(--at-gold)]">{doc.number}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold !text-[var(--at-ink)]">{doc.title}</div>
                      <div className="mt-0.5 line-clamp-1 max-w-xl text-[10px] !text-[var(--at-mut)]">{doc.summary}</div>
                      <div className="mt-0.5 font-mono text-[9px] !text-[var(--at-mut-2)]">{doc.version}</div>
                    </div>
                  </div>
                </td>
                <td className="text-[10px]">{doc.category}</td>
                <td><AtBadge tone="green">Public draft</AtBadge></td>
                <td>
                  <div className="text-[10px]">{doc.signatureFields}</div>
                  <div className={`text-[9px] !text-[var(--at-${EXECUTION_TONE[state] || 'muted'})]`}>
                    {execution?.label || doc.signatureStatus}
                  </div>
                </td>
                <td className="font-mono text-[9px] !text-[var(--at-mut)]">
                  <div>DOCX · {fmtBytes(doc.docxBytes)}</div>
                  <div>Read-only copy</div>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <AtButton onClick={() => onOpen(doc)} disabled={busySlug === doc.slug} variant="outline" size="sm" icon={busySlug === doc.slug ? Loader2 : Eye}>View</AtButton>
                    <AtButton onClick={() => onDownload(doc)} disabled={busySlug === `${doc.slug}:docx`} variant="quiet" size="sm" icon={Download}>DOCX</AtButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
