import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download, Eye, FileText, Grid2X2, List, Loader2, Lock, RefreshCw, Search,
  ShieldCheck, TriangleAlert,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import TbcDocumentViewer from '@/components/TbcDocumentViewer';
import TbcExecutionPanel from '@/components/TbcExecutionPanel';
import {
  AtAlert, AtBadge, AtButton, AtEmpty, AtHero, AtPanel, AtSectionHeading,
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
  { id: 'all', label: 'All documents' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'public', label: 'Public' },
];

export default function AdminTbcDocumentsPage() {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = pb.authStore?.token;
      if (!token) throw new Error('Admin session unavailable. Sign in again.');
      const headers = { Authorization: `Bearer ${token}` };
      const [docRes, execRes] = await Promise.all([
        fetch(`${API_SERVER_URL}/admin/tbc-documents`, { headers }),
        fetch(`${API_SERVER_URL}/admin/legal-vault/executions`, { headers }).catch(() => null),
      ]);
      if (!docRes.ok) throw new Error(docRes.status === 403 ? 'Admin access required.' : `Vault unavailable (${docRes.status})`);
      const data = await docRes.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      if (execRes?.ok) {
        const executionData = await execRes.json().catch(() => ({}));
        setExecutions(Object.fromEntries((executionData.documents || []).map((item) => [item.slug, item])));
      } else {
        setExecutions({});
      }
    } catch (err) {
      setError(err?.message || 'Vault unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (filter === 'public' && doc.visibility !== 'public') return false;
      if (filter === 'controlled' && doc.visibility !== 'internal') return false;
      if (!q) return true;
      return `${doc.number} ${doc.title} ${doc.category} ${doc.summary}`.toLowerCase().includes(q);
    });
  }, [documents, filter, query]);

  const counts = useMemo(() => ({
    all: documents.length,
    public: documents.filter((doc) => doc.visibility === 'public').length,
    controlled: documents.filter((doc) => doc.visibility === 'internal').length,
  }), [documents]);

  const token = () => pb.authStore?.token || '';

  const closeViewer = () => {
    setSelected(null);
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; }
  };

  const openViewer = async (doc) => {
    setBusySlug(doc.slug);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/tbc-documents/${encodeURIComponent(doc.slug)}/docx`, { headers: { Authorization: `Bearer ${token()}` } });
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
      const res = await fetch(`${API_SERVER_URL}/admin/tbc-documents/${encodeURIComponent(doc.slug)}/docx`, { headers: { Authorization: `Bearer ${token()}` } });
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
    <AdminLayout title="TBC Legal Vault">
      <div className="at-page at-scope at-enter">
        <AtHero
          eyebrow="Controlled instruments · admin authenticated"
          icon={ShieldCheck}
          title={<>The legal <em>vault.</em></>}
          description="The 26 corporate and governance instruments plus the five public summaries. Files are streamed only after an admin session is verified; nothing here is bundled into the public site or exposed by a public route."
          status={[
            { label: 'Total documents', value: counts.all || '—', tone: 'gold' },
            { label: 'Controlled', value: counts.controlled || '—', tone: 'amber' },
            { label: 'Public summaries', value: counts.public || '—', tone: 'green' },
            { label: 'Execution', value: 'DocuSign', tone: 'gold' },
          ]}
          statusTitle="Vault posture"
          statusNote="Confidential instruments may contain tax identifiers, registered-office details, ownership information and signature blocks."
          actions={(
            <>
              <AtButton to="/admin/tbc" variant="quiet" icon={Lock}>TBC control center</AtButton>
              <AtButton to="/tbc/documents" variant="outline" icon={FileText}>Public library</AtButton>
            </>
          )}
          bottom={(
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold text-[var(--at-mut)]">
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--at-green)]" /> Admin-authenticated endpoint</span>
              <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Files outside the web bundle</span>
              <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Read-only DOCX reader</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--at-mut-2)]">Corrected layout · October 2026</span>
            </div>
          )}
        />

        <div className="mt-3">
          <AtAlert icon={Lock} tone="amber">
            <b className="text-[var(--at-ink)]">Confidential.</b> Do not share links, exports or screenshots outside the authorized review group. A reviewer acknowledgment is control evidence — not a regulatory approval or legal opinion.
          </AtAlert>
        </div>

        <TbcExecutionPanel onChanged={load} />

        <AtSectionHeading
          className="mt-6"
          index="02"
          title="Document library"
          sub="Read every controlled instrument as Word and download a read-only copy"
          action={<span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">31 records · 26 controlled</span>}
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
                {filter === 'controlled' ? 'Controlled instruments' : filter === 'public' ? 'Public summaries' : 'Document index'}
                <span className="ml-2 font-mono text-[9px] text-[var(--at-mut-2)]">{filtered.length} of {documents.length} · {view} view</span>
              </p>
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">Source: corrected layout + signature-field packages</span>
            </div>

            {!filtered.length ? (
              <div className="at-card"><AtEmpty icon={FileText} title="No documents match" sub="Clear the search or choose another visibility filter." /></div>
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
          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-[var(--at-gold)]" /> DOCX only · editing restricted</span>
          <AtButton to="/tbc/documents" variant="quiet" size="sm" className="ml-auto">Open the five-document public library</AtButton>
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

const executionTone = (state) => ({
  executed: 'green',
  approved: 'green',
  cleared: 'green',
  licensed: 'green',
  live: 'green',
  awaiting_signatures: 'amber',
  prepared: 'gold',
  delivered: 'blue',
  declined: 'red',
  voided: 'red',
}[state] || 'mut');

function DocumentCard({ doc, execution, busySlug, onOpen, onDownload }) {
  const controlled = doc.visibility === 'internal';
  return (
    <article className="at-card at-card--hover at-doc-card">
      <div className="relative p-4">
        <span className="at-doc-number">{doc.number}</span>
        <div className="flex flex-wrap items-center gap-1.5 pr-14">
          <AtBadge tone={controlled ? 'amber' : 'green'}>{controlled ? 'Controlled' : 'Public'}</AtBadge>
          <span className="font-mono text-[9px] text-[var(--at-mut-2)]">{doc.category}</span>
        </div>
        <h3 className="mt-3 max-w-[92%] text-[13px] font-semibold leading-snug tracking-[-0.015em] text-[var(--at-ink)]">{doc.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--at-mut)]">{doc.summary}</p>

        <dl className="at-doc-meta">
          <div><dt>Version</dt><dd>{doc.version}</dd></div>
          <div>
            <dt>Execution</dt>
            <dd className={`!text-[var(--at-${executionTone(execution?.state)})]`}>{execution?.label || doc.signatureStatus}</dd>
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
          {docs.map((doc) => (
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
              <td><AtBadge tone={doc.visibility === 'internal' ? 'amber' : 'green'}>{doc.visibility === 'internal' ? 'Controlled' : 'Public'}</AtBadge></td>
              <td>
                <div className="text-[10px]">{doc.signatureFields}</div>
                <div className={`text-[9px] !text-[var(--at-${executionTone(executions[doc.slug]?.state)})]`}>
                  {executions[doc.slug]?.label || doc.signatureStatus}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
