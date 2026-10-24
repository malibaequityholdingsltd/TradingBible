import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react';

export default function TbcDocumentViewer({ open, doc, pdfUrl, docxUrl, onDownloadDocx, onClose, loading = false, error = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={doc?.title || 'TBC document'}>
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[12px] border border-[#d4af37]/20 bg-[#0b0b10] shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10">
            <FileText className="h-4 w-4 text-[#d4af37]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-[#f0ecdd]">{doc?.title || 'TBC document'}</div>
            <div className="truncate text-[11px] text-[#8a8577]">{doc?.number || ''}{doc?.number ? ' · ' : ''}{doc?.classification || doc?.status || 'Controlled document'}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {(docxUrl || onDownloadDocx) && (
              docxUrl ? (
                <a href={docxUrl} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                  <Download className="h-3.5 w-3.5" /> DOCX
                </a>
              ) : (
                <button type="button" onClick={onDownloadDocx} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                  <Download className="h-3.5 w-3.5" /> DOCX
                </button>
              )
            )}
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            )}
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd]" aria-label="Close document">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-[#1a1a1a]">
          {loading && (
            <div className="absolute inset-0 grid place-items-center text-sm text-[#c9c4b4]">
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" /> Loading secure document…</span>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-red-300">{error}</div>
          )}
          {pdfUrl && !error && (
            <iframe title={doc?.title || 'TBC PDF'} src={pdfUrl} className="h-full w-full border-0 bg-white" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
