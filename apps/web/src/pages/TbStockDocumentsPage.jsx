import React, { useState } from 'react';
import {
  ArrowLeft, FileSignature, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import InvestorShell, { InvestorNotice } from '@/components/InvestorShell';
import TbcDocumentViewer from '@/components/TbcDocumentViewer';
import { TbStockDocumentLibrary } from '@/components/TbStockDocuments';
import {
  CapPublicHead, CapRecordCard, CapSection, CapSectionHead,
} from '@/components/CapitalUI';
import { AtButton } from '@/components/AtelierUI';
import { publicTbStockDocxUrl, usePublicTbStockDocuments } from '@/lib/tbStockDocs';
import { TB_ISSUER, formatDate } from '@/lib/investorRelations';

export default function TbStockDocumentsPage() {
  const { documents, meta, loading, error, reload } = usePublicTbStockDocuments();
  const [selected, setSelected] = useState(null);

  return (
    <InvestorShell active="TB Stock">
      <div className="cap-page stock-record-page">
        <TbcDocumentViewer
          open={Boolean(selected)}
          doc={selected}
          docxUrl={selected ? publicTbStockDocxUrl(selected.slug) : ''}
          onDownloadDocx={selected ? () => { window.location.href = publicTbStockDocxUrl(selected.slug); } : undefined}
          onClose={() => setSelected(null)}
        />

        <CapPublicHead
          title="TB stock documents"
          actions={(
            <AtButton to="/stock/TB" variant="outline" size="sm" icon={ArrowLeft}>TB stock record</AtButton>
          )}
          aside={(
            <CapRecordCard
              title="Library status"
              badge="Draft · not executed"
              rows={[
                ['Instruments', loading ? 'Checking' : `${documents.length} published`],
                ['Signature', 'DocuSign only'],
                ['Format', 'DOCX · read-only'],
                ['Ticker', 'TB · proposed'],
              ]}
              note="A document is an executed copy only when the execution register reports DocuSign completion. No signature is fabricated."
            />
          )}
        />

        <div className="mt-2.5"><InvestorNotice compact /></div>

        <CapSection>
          <CapSectionHead
            index="01"
            title="Signature-ready library"
            sub="Preparation instruments for a proposed future public listing. Drafts remain unsigned until real DocuSign execution is recorded."
            action={(
              <button type="button" onClick={reload} className="text-[9px] font-bold text-[var(--at-gold)] hover:underline">
                Refresh
              </button>
            )}
          />
          <div className="mb-3 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] p-3">
            <div className="flex items-start gap-2.5">
              <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-gold)]" />
              <div>
                <p className="text-[10px] font-semibold text-[var(--at-ink)]">
                  Authorized signers only. These are not approved, effective, or executed merely because they are published.
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">
                  {meta?.notice || 'TB is a proposed future ticker. These instruments are not an offer, listing approval, or evidence of a public market.'}{' '}
                  The library remains separate from TBC token documents and from shareholder ownership records.
                </p>
              </div>
            </div>
          </div>
          <TbStockDocumentLibrary
            documents={documents}
            loading={loading}
            error={error}
            onRead={setSelected}
            emptySub="The nine signature-ready instruments are being provisioned. No placeholder document or signature is shown."
          />
        </CapSection>

        <CapSection>
          <CapSectionHead index="02" title="Execution boundary" />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-green)]" />
                <div>
                  <p className="text-[10px] font-bold text-[var(--at-ink)]">DocuSign is the execution provider</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">
                    Tabs are anchored to each signer’s unique execution block. Envelope status is recorded in a separate TB register.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-card-bg)] p-3">
              <div className="flex items-start gap-2">
                <FileSignature className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
                <div>
                  <p className="text-[10px] font-bold text-[var(--at-ink)]">No public market is implied</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--at-mut)]">
                    {TB_ISSUER.tickerStatus}. {TB_ISSUER.exchangeStatus}. No share price, market capitalisation, volume, or listing approval exists.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[9px] text-[var(--at-mut-2)]">
            Last library update {formatDate(meta?.updated, 'October 2026')} · {TB_ISSUER.currentEntity} · {TB_ISSUER.jurisdiction}
          </p>
        </CapSection>

        <div className="mt-4">
          <Link to="/investors" className="text-[10px] font-semibold text-[var(--at-gold)] hover:underline">
            Return to investor relations
          </Link>
        </div>
      </div>
    </InvestorShell>
  );
}
