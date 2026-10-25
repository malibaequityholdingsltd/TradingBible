import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { renderAsync } from 'docx-preview';

// DOCX is the canonical reading format for the TBC library. The viewer renders
// the Word document in the browser; the PDF copies stay server-side for
// DocuSign anchoring and are never exposed as a reader/download option.
export default function TbcDocumentViewer({
  open,
  doc,
  docxUrl,
  onDownloadDocx,
  onClose,
  loading = false,
  error = '',
}) {
  const hostRef = useRef(null);
  const [renderState, setRenderState] = useState('idle');
  const [renderError, setRenderError] = useState('');

  // docx-preview renders fixed-width US Letter pages. On a phone, showing a
  // 816px page inside a 390px sheet forces sideways scrolling and clips the
  // reader. Scale the whole rendered stack to the available width using CSS
  // zoom (layout-aware in modern browsers) so the page reads like a document
  // view, not a desktop screenshot.
  const fitDocx = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const page = host.querySelector('.tbc-docx-wrapper > section.tbc-docx');
    if (!page) return;
    host.style.setProperty('--tbc-zoom', '1');
    const base = page.getBoundingClientRect().width || 816;
    const available = Math.max(280, host.clientWidth - 8);
    const zoom = Math.min(1, Math.max(0.36, available / base));
    host.style.setProperty('--tbc-zoom', String(zoom));
  }, []);

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

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => requestAnimationFrame(fitDocx);
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (observer && hostRef.current) observer.observe(hostRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [open, fitDocx]);

  useEffect(() => {
    if (!open || !docxUrl) {
      setRenderState('idle');
      setRenderError('');
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;
    setRenderState('loading');
    setRenderError('');
    (async () => {
      try {
        const res = await fetch(docxUrl, { signal: controller.signal, credentials: 'same-origin' });
        if (!res.ok) throw new Error(`Could not load the Word document (${res.status}).`);
        const blob = await res.blob();
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = '';
        await renderAsync(blob, hostRef.current, undefined, {
          className: 'tbc-docx',
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: true,
          useBase64URL: true,
        });
        if (!cancelled) {
          setRenderState('ready');
          requestAnimationFrame(fitDocx);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setRenderState('error');
        setRenderError(err?.message || 'Could not render the Word document.');
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, docxUrl]);

  if (!open || typeof document === 'undefined') return null;

  const showLoading = loading || renderState === 'loading';
  const shownError = error || renderError;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={doc?.title || 'TBC document'}>
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[14px] border border-[var(--at-line)] bg-[var(--at-bg0)] shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--at-line-soft)] bg-[var(--at-card-bg)] px-3 py-2.5 sm:px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)]">
            <FileText className="h-4 w-4 text-[var(--at-gold)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-[var(--at-ink)]">{doc?.title || 'TBC document'}</div>
            <div className="truncate text-[11px] text-[var(--at-mut)]">
              {doc?.number || ''}{doc?.number ? ' · ' : ''}{doc?.classification || doc?.status || 'Controlled document'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1 rounded-md border border-[var(--at-line)] bg-[var(--at-soft)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--at-mut)] sm:inline-flex">
              <Lock className="h-3 w-3 text-[var(--at-gold)]" /> Read-only DOCX
            </span>
            {onDownloadDocx && (
              <button type="button" onClick={onDownloadDocx} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--at-line)] bg-[var(--at-card-bg)] px-2.5 text-xs font-semibold text-[var(--at-ink-2)] transition hover:border-[var(--at-line-strong)] hover:text-[var(--at-gold)]">
                <Download className="h-3.5 w-3.5" /> DOCX
              </button>
            )}
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--at-line)] text-[var(--at-mut)] transition hover:bg-[var(--at-soft-2)] hover:text-[var(--at-ink)]" aria-label="Close document">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {doc?.execution?.signed && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[10px] text-emerald-200 sm:px-4">
            <span className="inline-flex items-center gap-1.5 font-bold"><ShieldCheck className="h-3.5 w-3.5" /> Executed copy</span>
            <span>DocuSign reports this envelope as completed.</span>
            {doc.execution.completedAt && <span className="text-emerald-300/70">Completed {new Date(doc.execution.completedAt).toLocaleDateString()}</span>}
          </div>
        )}
        <div className="relative flex-1 overflow-auto bg-[#3b3b3b]">
          {showLoading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--at-bg0)] text-sm text-[var(--at-mut)]">
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[var(--at-gold)]" /> Rendering Word document…</span>
            </div>
          )}
          {shownError && !showLoading && (
            <div className="absolute inset-0 z-10 grid place-items-center p-6 text-center text-sm text-[var(--at-red)]">{shownError}</div>
          )}
          <div ref={hostRef} className="tbc-docx-host" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--at-line-soft)] bg-[var(--at-card-bg)] px-3 py-2 text-[9px] text-[var(--at-mut-2)]">
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-[var(--at-gold)]" /> Editing is restricted in the downloaded copy. PDF copies are not distributed.</span>
          <span className="font-mono uppercase tracking-[0.1em]">{doc?.execution?.signed ? 'Executed DOCX' : docxUrl ? 'DOCX source' : 'Preparing document'}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
