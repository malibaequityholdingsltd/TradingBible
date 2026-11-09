import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, FileSignature, FileText, Lock, ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { AtBadge, AtButton, AtEmpty, AtPanel } from '@/components/AtelierUI';

const signedLabel = (doc) => (doc?.execution?.signed ? 'Execution recorded' : 'Signature-ready');

export function TbStockDocumentCard({ doc, onRead, compact = false }) {
  const signed = doc?.execution?.signed === true;
  const executionLabel = signed ? 'Execution recorded' : doc?.execution?.label || doc?.signatureStatus || 'Open — not executed';
  return (
    <article className="at-card at-card--hover flex h-full flex-col">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)]">
            <FileText className="h-4 w-4 text-[var(--at-gold)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">{doc.number}</span>
              <AtBadge tone={signed ? 'green' : 'gold'}>{signedLabel(doc)}</AtBadge>
              <AtBadge tone="muted">{doc.category}</AtBadge>
            </div>
            <h3 className={`mt-1.5 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[var(--at-ink)] ${compact ? 'line-clamp-2' : ''}`}>{doc.title}</h3>
            <p className={`mt-1 text-[10px] leading-relaxed text-[var(--at-mut)] ${compact ? 'line-clamp-2' : ''}`}>{doc.summary}</p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--at-line-soft)] pt-3">
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Execution</dt>
            <dd className="mt-0.5 text-[9px] font-semibold text-[var(--at-ink-2)]">{executionLabel}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--at-mut-2)]">Access</dt>
            <dd className="mt-0.5 text-[9px] font-semibold text-[var(--at-ink-2)]">In-app reader · no download</dd>
          </div>
        </dl>

        {signed && (
          <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[var(--at-green)]">
            <ShieldCheck className="h-3 w-3" /> Execution status recorded · signatory details withheld
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <AtButton onClick={() => onRead?.(doc)} variant="outline" size="sm" icon={BookOpen}>Read in app</AtButton>
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--at-mut-2)]">
            <Lock className="h-3 w-3" /> Read-only
          </span>
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
        Nine preparation instruments. They stay drafts until DocuSign records completion;
        no signature, approval, listing, or offering is implied. Signatory details are not published.
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
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--at-gold)]">{doc.number}</span>
              <span className="mt-1 block text-[10px] font-semibold leading-snug text-[var(--at-ink)]">{doc.title}</span>
              <span className="mt-1 block text-[9px] text-[var(--at-mut)]">{doc.execution?.signed ? 'Execution recorded' : 'Signature-ready · not executed'}</span>
            </button>
          ))}
        </div>
      )}
    </AtPanel>
  );
}
