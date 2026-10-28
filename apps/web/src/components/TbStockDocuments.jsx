import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Download, FileSignature, FileText, ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { AtBadge, AtButton, AtEmpty, AtPanel } from '@/components/AtelierUI';
import { publicTbStockDocxUrl } from '@/lib/tbStockDocs';

const signedLabel = (doc) => (doc?.execution?.signed ? 'Executed copy' : 'Signature-ready');

export function TbStockDocumentCard({ doc, onRead, compact = false }) {
  const signed = doc?.execution?.signed === true;
  const executionLabel = signed ? 'Executed copy' : doc?.execution?.label || doc?.signatureStatus || 'Open — not executed';
  const href = publicTbStockDocxUrl(doc.slug);
  return (
    <article className="at-card at-card--hover flex h-full flex-col">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)]">
            <FileText className="h-4 w-4 text-[var(--at-gold)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">{doc.number}</span>
              <AtBadge tone={signed ? 'green' : 'gold'}>{signedLabel(doc)}</AtBadge>
              <AtBadge tone="muted">{doc.category}</AtBadge>
            </div>
            <h3 className={`mt-1.5 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[var(--at-ink)] ${compact ? 'line-clamp-2' : ''}`}>{doc.title}</h3>
            <p className={`mt-1 text-[10px] leading-relaxed text-[var(--at-mut)] ${compact ? 'line-clamp-2' : ''}`}>{doc.summary}</p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--at-line-soft)] pt-3">
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Signature</dt>
            <dd className="mt-0.5 text-[9px] font-semibold text-[var(--at-ink-2)]">{executionLabel}</dd>
          </div>
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Format</dt>
            <dd className="mt-0.5 text-[9px] font-semibold text-[var(--at-ink-2)]">DOCX · read-only</dd>
          </div>
        </dl>

        {signed && (
          <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[var(--at-green)]">
            <ShieldCheck className="h-3 w-3" /> Signed record served automatically
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <AtButton onClick={() => onRead?.(doc)} variant="outline" size="sm" icon={BookOpen}>Read</AtButton>
          <a
            href={href}
            download={`${doc.slug}-${signed ? 'executed' : 'readonly'}.docx`}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[var(--at-line)] px-2.5 text-[11px] font-semibold text-[var(--at-ink-2)] transition hover:border-[var(--at-line-strong)] hover:text-[var(--at-gold)]"
          >
            <Download className="h-3.5 w-3.5" /> {signed ? 'Executed DOCX' : 'DOCX'}
          </a>
        </div>
      </div>
    </article>
  );
}

export function TbStockDocumentLibrary({ documents, loading, error, onRead, limit, emptySub }) {
  const shown = limit ? (documents || []).slice(0, limit) : (documents || []);
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((n) => <div key={n} className="at-card h-56 animate-pulse bg-[var(--at-soft)]" />)}
      </div>
    );
  }
  if (error) {
    return (
      <AtPanel flush>
        <AtEmpty
          icon={TriangleAlert}
          title="Document library unavailable"
          sub={`${error} Static company information remains available; do not treat a missing document as approved or executed.`}
        />
      </AtPanel>
    );
  }
  if (!shown.length) {
    return (
      <AtPanel flush>
        <AtEmpty
          icon={FileSignature}
          title="No TB stock documents published"
          sub={emptySub || 'The signature-ready library is being provisioned. No placeholder signature or approval is shown.'}
        />
      </AtPanel>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map((doc) => <TbStockDocumentCard key={doc.slug} doc={doc} onRead={onRead} />)}
    </div>
  );
}

export function TbStockDocumentsSection({ documents, loading, error, onRead }) {
  const shown = (documents || []).slice(0, 3);
  return (
    <AtPanel
      className="cap-panel"
      title="TB stock documents"
      action={(
        <Link to="/stock/TB/documents" className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--at-gold)] hover:underline">
          Open library <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    >
      <p className="mb-3 text-[10px] leading-relaxed text-[var(--at-mut)]">
        Nine signature-ready preparation instruments. They stay drafts until DocuSign records completion;
        no signature, approval, listing, or offering is implied.
      </p>
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-lg bg-[var(--at-soft)]" />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 text-[10px] text-[var(--at-amber)]">
          {error} The static TB record remains available.
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 text-[10px] text-[var(--at-mut)]">
          The document library is being provisioned. No placeholder signature is shown.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {shown.map((doc) => (
            <button
              key={doc.slug}
              type="button"
              onClick={() => onRead?.(doc)}
              className="rounded-lg border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3 text-left transition hover:border-[var(--at-line-strong)]"
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">{doc.number}</span>
              <span className="mt-1 block text-[10px] font-semibold leading-snug text-[var(--at-ink)]">{doc.title}</span>
              <span className="mt-1 block text-[9px] text-[var(--at-mut)]">{doc.execution?.signed ? 'Executed copy' : 'Signature-ready · not executed'}</span>
            </button>
          ))}
        </div>
      )}
    </AtPanel>
  );
}
