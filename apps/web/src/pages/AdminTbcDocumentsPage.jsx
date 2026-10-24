import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Eye, FileText, Filter, Loader2, Lock, RefreshCw, Search, ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import TbcDocumentViewer from '@/components/TbcDocumentViewer';
import { Card, GhostButton, Note, PageHero, SectionHead } from '@/components/ui-kit';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const fmtBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
};

export default function AdminTbcDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
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
      const res = await fetch(`${API_SERVER_URL}/admin/tbc-documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required.' : `Vault unavailable (${res.status})`);
      const data = await res.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
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
      const res = await fetch(`${API_SERVER_URL}/admin/tbc-documents/${encodeURIComponent(doc.slug)}/file`, { headers: { Authorization: `Bearer ${token()}` } });
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

  const download = async (doc, type) => {
    setBusySlug(`${doc.slug}:${type}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/tbc-documents/${encodeURIComponent(doc.slug)}/${type === 'docx' ? 'docx' : 'file'}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.slug}.${type === 'docx' ? 'docx' : 'pdf'}`;
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
      <div className="tb-page !max-w-[1500px]">
        <PageHero kickerIcon={ShieldCheck} kicker="Controlled documents" title="TBC Legal" accent="Vault" subtitle="The 26 corporate and governance instruments plus the five public summaries. Files are streamed only after an admin session is verified; nothing here is bundled into the public site." actions={<><GhostButton to="/admin/tbc">TBC control center</GhostButton><GhostButton to="/tbc/documents">Public library</GhostButton></>} />
        <div className="mt-4"><Note icon={Lock}>Confidential. These instruments may contain tax identifiers, registered-office details, ownership information and signature blocks. Do not share links, exports or screenshots outside the authorized review group.</Note></div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[['all', 'All documents'], ['controlled', 'Controlled instruments'], ['public', 'Public summaries']].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${filter === id ? 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]' : 'border-white/[0.08] bg-white/[0.02] text-[#8a8577] hover:text-[#e9e7df]'}`}><Filter className="h-3.5 w-3.5" /> {label} <span className="font-mono text-[10px] opacity-70">{counts[id]}</span></button>)}
          <div className="relative ml-auto flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-sm"><Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#6a665a]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, number, category…" className="min-h-[36px] w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] pl-8 pr-3 text-xs text-[#e9e7df] outline-none placeholder:text-[#5f5b50] focus:border-[#d4af37]/50" /></div>
          <button type="button" onClick={load} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>

        {loading && <div className="mt-4 grid place-items-center rounded-[10px] border border-white/[0.06] bg-[#0b0b10] py-14 text-sm text-[#8a8577]"><Loader2 className="mr-2 h-4 w-4 animate-spin text-[#d4af37]" /> Opening the controlled vault…</div>}
        {error && !loading && <div className="mt-4"><Note icon={TriangleAlert} tone="warning">{error} <button type="button" onClick={load} className="font-bold text-[#d4af37] underline">Retry</button></Note></div>}

        {!loading && !error && (
          <Card className="mt-4 !p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3"><FileText className="h-4 w-4 text-[#d4af37]" /><span className="text-sm font-bold text-[#f0ecdd]">{filtered.length} documents</span><span className="ml-auto text-[10px] text-[#6a665a]">Source: corrected layout + signature-field packages · October 2026</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-[#6a665a] [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-semibold"><th>Document</th><th>Category</th><th>Visibility</th><th>Signature fields</th><th>Files</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.slug} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3"><div className="flex items-start gap-2"><span className="mt-0.5 font-mono text-[10px] text-[#6a665a]">{doc.number}</span><div><div className="font-semibold text-[#e9e7df]">{doc.title}</div><div className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-[#8a8577]">{doc.summary}</div><div className="mt-1 font-mono text-[10px] text-[#6a665a]">{doc.version}</div></div></div></td>
                      <td className="px-4 py-3 text-[11px] text-[#c9c4b4]">{doc.category}</td>
                      <td className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${doc.visibility === 'internal' ? 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300' : 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'}`}>{doc.visibility === 'internal' ? 'Controlled' : 'Public'}</span><div className="mt-1 text-[10px] text-[#6a665a]">{doc.classification}</div></td>
                      <td className="px-4 py-3 text-[11px] text-[#8a8577]"><div>{doc.signatureFields}</div><div className="mt-0.5 text-amber-300">{doc.signatureStatus}</div></td>
                      <td className="px-4 py-3 text-[10px] text-[#6a665a]"><div>PDF · {fmtBytes(doc.pdfBytes)}</div><div>DOCX · {fmtBytes(doc.docxBytes)}</div></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5"><button type="button" onClick={() => openViewer(doc)} disabled={busySlug === doc.slug} className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#d4af37]/25 px-2.5 text-[11px] font-bold text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50">{busySlug === doc.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} View</button><button type="button" onClick={() => download(doc, 'pdf')} disabled={busySlug === `${doc.slug}:pdf`} className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30"><Download className="h-3.5 w-3.5" /> PDF</button><button type="button" onClick={() => download(doc, 'docx')} disabled={busySlug === `${doc.slug}:docx`} className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30"><FileText className="h-3.5 w-3.5" /> DOCX</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && <div className="px-4 py-10 text-center text-sm text-[#8a8577]">No documents match this filter.</div>}
          </Card>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#6a665a]"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Admin-authenticated endpoint · files outside the public web bundle · no public URL.</div>
        <div className="mt-2"><Link to="/tbc/documents" className="text-[11px] font-semibold text-[#d4af37] hover:underline">Open the five-document public library →</Link></div>
      </div>
      <TbcDocumentViewer
        open={Boolean(selected)}
        doc={selected?.doc}
        pdfUrl={selected?.url || ''}
        onDownloadDocx={() => selected?.doc && download(selected.doc, 'docx')}
        onClose={closeViewer}
      />
    </AdminLayout>
  );
}
