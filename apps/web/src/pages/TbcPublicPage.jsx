import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronRight, Coins, Code2, Download,
  FileText, Globe2, Layers, Lock, Network, Radio, ShieldCheck, Sparkles,
  Store, Timer, TriangleAlert, Wallet, Workflow,
} from 'lucide-react';
import TbcPublicShell, { TbcProposalNotice } from '@/components/TbcPublicShell';
import TbcDocumentViewer from '@/components/TbcDocumentViewer';
import { AtBadge, AtButton, AtHero, AtPanel } from '@/components/AtelierUI';
import { Card, GhostButton, GoldButton, Note, SectionHead } from '@/components/ui-kit';
import { publicDocxUrl, usePublicTbcDocuments } from '@/lib/tbcDocs';
import { useAuth } from '@/hooks/useAuth';
import {
  TBC_ALLOCATION, TBC_ELIGIBILITY_SIGNALS, TBC_FAQS, TBC_JURISDICTIONS, TBC_MODULES,
  TBC_PROPOSAL, TBC_PURCHASE_CONTROLS, TBC_PURCHASE_STEPS, TBC_RISKS, TBC_ROADMAP,
  TBC_SEPARATION, TBC_SUPPLY_LIFECYCLE, TBC_STATUS_TONES, TBC_UTILITIES,
  TBC_UTILITY_LEDGER_FIELDS,
} from '@/lib/tbcEcosystem';

const STATUS = (key) => TBC_STATUS_TONES[key] || { label: key || 'Status', className: 'border-white/10 bg-white/5 text-[#8a8577]' };

function Pill({ status, children }) {
  const tone = STATUS(status);
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.className}`}>{children || tone.label}</span>;
}

function GoldDot() {
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]" />;
}

function AllocationBars({ compact = false }) {
  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
      {TBC_ALLOCATION.map((item) => (
        <div key={item.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-[#c9c4b4] sm:text-sm">{item.label}</span>
            <span className="shrink-0 font-mono text-xs font-bold text-[#f0ecdd]">{item.pct}% <span className="font-normal text-[#6a665a]">· {item.amount}</span></span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
          </div>
          {!compact && <p className="mt-1 text-[11px] leading-relaxed text-[#6a665a]">{item.note}</p>}
        </div>
      ))}
    </div>
  );
}

function ModuleGrid({ limit }) {
  const modules = limit ? TBC_MODULES.slice(0, limit) : TBC_MODULES;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => (
        <div key={module.id} className="flex items-start gap-2.5 rounded-[10px] border border-white/[0.06] bg-black/20 p-3">
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.07]">
            <Layers className="h-3.5 w-3.5 text-[#d4af37]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#f0ecdd]">{module.title}</span>
              <Pill status={module.status} />
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a8577]">{module.detail}</p>
            {module.route && <Link to={module.route} className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#d4af37] hover:underline">Open <ChevronRight className="h-3 w-3" /></Link>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentCard({ doc, onRead }) {
  const execution = doc.execution;
  const signed = execution?.signed === true;
  const executionLabel = signed ? 'Executed copy' : execution?.state && execution.state !== 'not_prepared' ? execution.label : '';
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.07]">
          <FileText className="h-4 w-4 text-[#d4af37]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-[#6a665a]">{doc.number}</span>
            <Pill status={doc.status?.toLowerCase().includes('proposal') ? 'gated' : 'planned'}>{doc.status}</Pill>
            {executionLabel && <Pill status={signed ? 'live' : 'planned'}>{executionLabel}</Pill>}
          </div>
          <h3 className="mt-1 text-sm font-bold leading-snug text-[#f0ecdd]">{doc.title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{doc.summary}</p>
          {signed && (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Signed record served automatically
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        <button type="button" onClick={() => onRead?.(doc)} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-[#d4af37]/10 px-2.5 text-[11px] font-bold text-[#d4af37] hover:bg-[#d4af37]/15">
          <BookOpen className="h-3.5 w-3.5" /> {signed ? 'Read executed' : 'Read'}
        </button>
        <a href={publicDocxUrl(doc.slug)} download={`${doc.slug}-${signed ? 'executed' : 'readonly'}.docx`} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
          <FileText className="h-3.5 w-3.5" /> {signed ? 'Executed DOCX' : 'Read-only DOCX'}
        </a>
      </div>
    </Card>
  );
}

function DocumentLibrary({ documents, loading, error, onRead, limit }) {
  const shown = limit ? documents.slice(0, limit) : documents;
  if (loading) return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-44 animate-pulse rounded-[10px] border border-white/[0.06] bg-white/[0.02]" />)}</div>;
  if (error) return <Note icon={TriangleAlert} tone="warning">{error} You can still contact support if you need a document.</Note>;
  if (!shown.length) return <Note icon={FileText}>No public documents are published yet.</Note>;
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{shown.map((doc) => <DocumentCard key={doc.slug} doc={doc} onRead={onRead} />)}</div>;
}

function SectionLink({ to, children }) {
  return <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-[#d4af37] hover:underline">{children} <ArrowRight className="h-3.5 w-3.5" /></Link>;
}

/* Every TBC section keeps the same disclosure-first masthead. The shared
 * AtHero gives the section pages the same editorial rhythm as the overview
 * without changing any page's data or action logic. */
function PageHero({ kicker, kickerIcon, title, accent, subtitle, stats, actions }) {
  const status = stats?.length
    ? stats.map((item, index) => ({ ...item, tone: index === 0 ? 'gold' : undefined }))
    : [
        { label: 'Token issued', value: '0 TBC', tone: 'amber' },
        { label: 'Public sale', value: 'Disabled', tone: 'amber' },
        { label: 'Staking / governance', value: 'Disabled', tone: 'amber' },
        { label: 'Current stage', value: TBC_PROPOSAL.phase, tone: 'gold' },
      ];
  return (
    <AtHero
      eyebrow={kicker}
      icon={kickerIcon}
      title={(
        <>
          {title}
          {accent && <><br /><em>{accent}</em></>}
        </>
      )}
      description={subtitle}
      status={status}
      statusTitle={stats?.length ? 'At a glance' : 'Disclosure state'}
      statusNote="No token has been issued. No sale, staking, governance or migration is open. Every regulated function requires written legal, technical and security approval."
      actions={actions}
      bottom={(
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <AtBadge tone="amber">Proposal · phase 01</AtBadge>
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--at-mut)]">Information surface only</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--at-mut)]">Not a brokerage deposit</span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--at-mut-2)]">Updated {TBC_PROPOSAL.updated}</span>
        </div>
      )}
    />
  );
}

function Roadmap({ full = false }) {
  const rows = full ? TBC_ROADMAP : TBC_ROADMAP.slice(0, 4);
  return (
    <div className="space-y-0">
      {rows.map((phase, index) => {
        const tone = STATUS(phase.status);
        return (
          <div key={phase.phase} className="relative flex gap-3 pb-4 last:pb-0">
            {index < rows.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 h-full w-px bg-white/[0.08]" />}
            <div className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black ${tone.className}`}>{phase.phase}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#f0ecdd]">{phase.title}</h3>
                <Pill status={phase.status} />
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a8577]">{phase.short}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#6a665a]"><Lock className="h-3 w-3" /> Gate: {phase.gate}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UtilityCards() {
  const icons = { terminal: Coins, radar: Radio, code: Code2, network: Network };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TBC_UTILITIES.map((item) => {
        const Icon = icons[item.icon] || Sparkles;
        return (
          <Card key={item.title} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.07]"><Icon className="h-4 w-4 text-[#d4af37]" /></div>
              <Pill status={item.status === 'Planned' ? 'planned' : 'gated'}>{item.status}</Pill>
            </div>
            <h3 className="mt-2 text-sm font-bold text-[#f0ecdd]">{item.title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{item.body}</p>
          </Card>
        );
      })}
    </div>
  );
}

export default function TbcPublicPage({ section = 'overview' }) {
  const { documents, loading: docsLoading, error: docsError } = usePublicTbcDocuments();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const whitepaper = useMemo(() => documents.find((doc) => doc.slug === 'tbc-whitepaper'), [documents]);

  return (
    <TbcPublicShell active={section}>
      <div className="at-scope at-enter">
        <TbcDocumentViewer
          open={Boolean(selectedDoc)}
          doc={selectedDoc}
          docxUrl={selectedDoc ? publicDocxUrl(selectedDoc.slug) : ''}
          onDownloadDocx={selectedDoc ? () => { window.location.href = publicDocxUrl(selectedDoc.slug); } : undefined}
          onClose={() => setSelectedDoc(null)}
        />
        {section === 'overview' && <Overview docs={documents} docsLoading={docsLoading} docsError={docsError} onRead={setSelectedDoc} />}
        {section === 'whitepaper' && <Whitepaper whitepaper={whitepaper} docsLoading={docsLoading} onRead={setSelectedDoc} />}
        {section === 'tokenomics' && <Tokenomics />}
        {section === 'utility' && <Utility />}
        {section === 'roadmap' && <RoadmapPage />}
        {section === 'documents' && <Documents docs={documents} loading={docsLoading} error={docsError} onRead={setSelectedDoc} />}
        {section === 'purchases' && <Purchases />}
        {section === 'eligibility' && <Eligibility />}
        {section === 'compliance' && <Compliance />}
        {section === 'separation' && <Separation />}
        {section === 'risks' && <Risks />}
        {section === 'faqs' && <Faqs />}
      </div>
    </TbcPublicShell>
  );
}

function Overview({ docs, docsLoading, docsError, onRead }) {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero
          kickerIcon={Coins}
          kicker="TradingBible Coin · Phase 1"
          title="An ecosystem asset,"
          accent="built in the open"
          subtitle="TBC is being designed as a utility-first digital asset for TradingBible. The first release is information and account management — not a token sale. Every regulated function stays gated until the evidence exists."
          stats={[
            { label: 'Proposed max supply', value: TBC_PROPOSAL.supplyLabel },
            { label: 'Issued', value: '0 TBC' },
            { label: 'Public sale', value: 'Disabled' },
            { label: 'Phase', value: 'Information' },
          ]}
          actions={<><GoldButton to="/app/tbc">Open TBC dashboard <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/tbc/whitepaper">Read the whitepaper</GhostButton></>}
        />
        <div className="mt-4"><TbcProposalNotice /></div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Not issued', 'No token has been minted or distributed.'],
          ['Not selling', 'The purchase journey is visible, but payment collection is off.'],
          ['Not a brokerage deposit', 'TBC and any future brokerage business are separate.'],
          ['Not a promise', 'No returns, listing, liquidity or transferability is guaranteed.'],
        ].map(([title, body], index) => (
          <div key={title} className="at-card relative overflow-hidden p-4">
            <span className="at-index">0{index + 1}</span>
            <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[var(--at-ink)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--at-gold)]" /> {title}
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--at-mut)]">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Coins} title="The corrected tokenomics scenario" sub="Illustrative only — not an adopted distribution." right={<SectionLink to="/tbc/tokenomics">Full tokenomics</SectionLink>} />
          <AllocationBars compact />
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px] text-[#8a8577]">
            <Lock className="h-3.5 w-3.5 text-[#d4af37]" /> Team proposal: 12-month cliff + 36 months monthly vesting. Treasury: dual approval and reporting controls.
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={ShieldCheck} title="What is actually live" sub="Phase 1 is intentionally narrow." right={<SectionLink to="/tbc/roadmap">Roadmap</SectionLink>} />
          <ModuleGrid limit={6} />
          <div className="mt-3 text-[11px] text-[#6a665a]">Activation is server-controlled. A UI label never turns on a regulated function.</div>
        </Card>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Sparkles} title="Utility, with the price in plain sight" sub="Proposed — services remain priced in fiat-equivalent terms." right={<SectionLink to="/tbc/utility">Utility center</SectionLink>} />
          <UtilityCards />
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Workflow} title="The purchase journey is designed, not opened" sub="Eight controls must pass before payment collection." right={<SectionLink to="/tbc/purchases">Purchase controls</SectionLink>} />
          <div className="space-y-2">
            {TBC_PURCHASE_STEPS.slice(0, 5).map((step) => (
              <div key={step.n} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <span className="font-mono text-[10px] text-[#6a665a]">{step.n}</span>
                <span className="min-w-0 flex-1 text-xs font-semibold text-[#e9e7df]">{step.title}</span>
                <Pill status={step.status} />
              </div>
            ))}
          </div>
          <div className="mt-3"><TbcProposalNotice compact /></div>
        </Card>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Globe2} title="Jurisdiction access is a decision, not a checkbox" sub="No market has been cleared." right={<SectionLink to="/tbc/eligibility">Eligibility</SectionLink>} />
          <div className="space-y-1.5">
            {TBC_JURISDICTIONS.slice(0, 5).map((row) => (
              <div key={row.market} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-1.5 last:border-0">
                <span className="text-xs text-[#c9c4b4]">{row.market}</span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[10px] font-bold text-amber-300">{row.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={FileText} title="Public document library" sub="Five corrected summaries; the 26 controlled instruments stay in the admin vault." right={<SectionLink to="/tbc/documents">All documents</SectionLink>} />
          <DocumentLibrary documents={docs} loading={docsLoading} error={docsError} onRead={onRead} limit={3} />
        </Card>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Timer} title="Roadmap to a gated launch" sub="Phases are evidence gates, not deadlines." right={<SectionLink to="/tbc/roadmap">All 8 phases</SectionLink>} />
          <Roadmap />
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={TriangleAlert} title="Read the risks first" sub="A short summary, not the full disclosure." right={<SectionLink to="/tbc/risks">Risk factors</SectionLink>} />
          <div className="space-y-2">
            {TBC_RISKS.slice(0, 4).map((risk) => (
              <div key={risk.title} className="flex items-start gap-2 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
                <GoldDot />
                <div><div className="text-xs font-semibold text-[#e9e7df]">{risk.title}</div><div className="text-[11px] leading-relaxed text-[#8a8577]">{risk.body}</div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Whitepaper({ whitepaper, docsLoading, onRead }) {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={BookOpen} kicker="Official summary · P-01" title="TBC Whitepaper" accent="& Utility Roadmap" subtitle="Issuer overview, functional design and delivery milestones. Read the current draft in the Word reader, or download a read-only Word copy." actions={<><GoldButton to="/app/tbc">Open dashboard <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/tbc/documents">Document library</GhostButton></>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="overflow-hidden !p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <FileText className="h-4 w-4 text-[#d4af37]" />
            <span className="text-sm font-bold text-[#f0ecdd]">{whitepaper?.title || 'TBC Whitepaper & Utility Roadmap'}</span>
            {whitepaper && <span className="ml-auto font-mono text-[10px] text-[#6a665a]">{whitepaper.version}</span>}
          </div>
          {docsLoading && <div className="grid h-[62vh] place-items-center text-sm text-[#8a8577]">Loading document…</div>}
          {!docsLoading && whitepaper && (
            <div className="relative grid h-[58vh] place-items-center overflow-hidden bg-[#26262b] p-6 text-center">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.16),transparent_58%)]" />
              <div className="relative max-w-sm">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]"><FileText className="h-7 w-7" /></span>
                <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af37]">Word document · read-only</div>
                <h3 className="mt-2 text-lg font-bold text-[#f0ecdd]">{whitepaper.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#8a8577]">Opens in the secure Word reader. The downloaded copy has editing restricted; no PDF copy is distributed.</p>
                <button type="button" onClick={() => onRead(whitepaper)} className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-xs font-bold text-[#121006]">
                  <BookOpen className="h-4 w-4" /> Open Word reader
                </button>
              </div>
            </div>
          )}
          {!docsLoading && !whitepaper && <div className="p-5"><Note icon={TriangleAlert}>The whitepaper is not available from the document service right now. Please try again shortly.</Note></div>}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] p-3">
            {whitepaper && <><button type="button" onClick={() => onRead(whitepaper)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 text-xs font-bold text-[#0a0a0f]"><BookOpen className="h-3.5 w-3.5" /> Read in Word</button><a href={publicDocxUrl(whitepaper.slug)} download={`${whitepaper.slug}-readonly.docx`} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-[#c9c4b4]"><Download className="h-3.5 w-3.5" /> Read-only DOCX</a></>}
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-4">
            <SectionHead icon={Coins} title="At a glance" />
            {[
              ['Issuer', 'TradingBible LLC'],
              ['Jurisdiction', 'Delaware, United States'],
              ['Proposed supply', TBC_PROPOSAL.supplyLabel],
              ['Status', 'Proposal — not issued'],
              ['Updated', TBC_PROPOSAL.updated],
            ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 text-xs last:border-0"><span className="text-[#8a8577]">{label}</span><span className="text-right font-semibold text-[#e9e7df]">{value}</span></div>)}
          </Card>
          <Card className="p-4">
            <SectionHead icon={ShieldCheck} title="What this document is not" />
            <ul className="space-y-2 text-[11px] leading-relaxed text-[#8a8577]">
              {['Not an offer or solicitation to buy TBC.', 'Not evidence that a token, sale, network or brokerage is operational.', 'Not a promise of returns, listing, liquidity or transferability.', 'Not a substitute for the full risk factors and legal documents.'].map((item) => <li key={item} className="flex gap-2"><GoldDot />{item}</li>)}
            </ul>
          </Card>
          <Link to="/tbc/documents" className="flex items-center justify-between rounded-[10px] border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-4 py-3 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37]/[0.1]">Browse all public summaries <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </>
  );
}

function Tokenomics() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Layers} kicker="Economics · proposal only" title="100 million TBC," accent="one controlled supply picture" subtitle="The corrected working scenario gives 30% to ecosystem and development, 20% to community incentives, 20% to public distribution, 15% to treasury, 10% to team and 5% to liquidity. None of this is an adopted allocation or issued supply." actions={<GoldButton to="/tbc/whitepaper">Read the whitepaper <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Coins} title="Illustrative allocation" sub="Percentages sum to 100%; amounts are proposed maximums." />
          <AllocationBars />
          <p className="mt-3 text-[11px] leading-relaxed text-[#6a665a]">Final percentages, release dates and vesting periods remain subject to management and legal approval. The tokenomics dashboard must never display these figures as circulating supply.</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={ActivityIcon} title="Supply lifecycle" sub="What is known, and what is not yet measured." />
          <div className="space-y-1">
            {TBC_SUPPLY_LIFECYCLE.map((row) => <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-2 last:border-0"><div><div className="text-xs font-semibold text-[#e9e7df]">{row.label}</div><div className="text-[10px] text-[#6a665a]">{row.status}</div></div><span className="font-mono text-xs text-[#c9c4b4]">{row.value}</span></div>)}
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-4"><SectionHead icon={Lock} title="Vesting framework" /><p className="text-xs leading-relaxed text-[#8a8577]">Team and contributor allocations could be subject to a 12-month cliff followed by 36 months of monthly vesting. Treasury allocations would require documented dual approval and periodic reporting. Partnership and liquidity programmes need published terms before activation.</p></Card>
        <Card className="p-4"><SectionHead icon={ShieldCheck} title="Controls before any number becomes live" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['Signed supply ledger with mint authority and contract addresses', 'Allocation approval and independent reconciliation', 'Vesting contracts tested against the schedule', 'Public reporting that separates issued, locked and circulating supply'].map((x) => <li key={x} className="flex gap-2"><GoldDot />{x}</li>)}</ul></Card>
      </div>
      <div className="mt-4"><Note icon={TriangleAlert} tone="warning">The 30/20/20/15/10/5 figures replace older, inconsistent allocations previously shown in the app. They remain a working proposal, not a promise.</Note></div>
    </>
  );
}

function ActivityIcon(props) {
  return <Timer {...props} />;
}

function Utility() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Sparkles} kicker="Utility center · proposal" title="Useful first," accent="not speculative first" subtitle="TBC is intended to pay for eligible TradingBible services. Each utility must be delivered, priced, lawful and tested before it can be marked available." actions={<GoldButton to="/tbc/documents">Read the documents <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5"><UtilityCards /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="p-4"><SectionHead icon={Store} title="What a live utility must record" /><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{TBC_UTILITY_LEDGER_FIELDS.map((field) => <div key={field} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2 text-[11px] text-[#c9c4b4]">{field}</div>)}</div></Card>
        <Card className="p-4"><SectionHead icon={Wallet} title="Spend rules" /><div className="space-y-2 text-xs leading-relaxed text-[#8a8577]"><p>Show the actual fiat-equivalent price, conversion quote, fees and refund terms before any TBC payment.</p><p>Platform subscriptions and plans stay on card or cash unless a separately approved payment path exists.</p><p>TBC credits and the proposed token are different balances. The app must never merge them into one misleading number.</p></div><div className="mt-3"><Link to="/app/wallet?tab=crypto" className="text-xs font-bold text-[#d4af37] hover:underline">See the current wallet and credits →</Link></div></Card>
      </div>
    </>
  );
}

function RoadmapPage() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Timer} kicker="Delivery roadmap" title="Eight phases," accent="each with an evidence gate" subtitle="The sequence is deliberate: information and account management first; compliance, testing and audits before any authorized distribution; chain and migration last." actions={<GoldButton to="/tbc/documents">Read the plan <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 sm:p-5"><Roadmap full /></Card>
        <div className="space-y-3">
          <Card className="p-4"><SectionHead icon={ShieldCheck} title="Phase 1 — what is being built now" /><div className="space-y-2 text-[11px] leading-relaxed text-[#8a8577]">{['Public TBC information, whitepaper and risk disclosures', 'Corrected tokenomics with proposal labels', 'Authenticated account and dashboard experience', 'Document control and admin legal vault', 'Support intake and internal status visibility'].map((x) => <div key={x} className="flex gap-2"><GoldDot />{x}</div>)}</div></Card>
          <Card className="p-4"><SectionHead icon={Lock} title="What does not happen in Phase 1" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['No token issuance, public sale, payment collection or delivery.', 'No live staking, governance vote or migration.', 'No brokerage, custody or client-money activity.', 'No claim of regulatory approval or licence.'].map((x) => <li key={x} className="flex gap-2"><GoldDot />{x}</li>)}</ul></Card>
        </div>
      </div>
    </>
  );
}

function Documents({ docs, loading, error, onRead }) {
  const { user } = useAuth();
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={FileText} kicker="Public document library" title="Read the source," accent="not the marketing" subtitle="Five corrected public summaries covering the whitepaper, supply and vesting, purchases and custody, jurisdiction eligibility, and platform separation. The 26 controlled corporate instruments are available only in the admin vault." actions={<GoldButton to="/app/tbc">Open dashboard <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5"><DocumentLibrary documents={docs} loading={loading} error={error} onRead={onRead} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><SectionHead icon={ShieldCheck} title="Controlled legal vault" /><p className="text-xs leading-relaxed text-[#8a8577]">The 26 corporate and governance instruments include confidential issuer information such as tax identifiers, registered-office details and signature blocks. They are streamed only to an authenticated administrator — not bundled into the public site.</p><div className="mt-3">{user?.role === 'admin' ? <Link to="/admin/legal-vault" className="text-xs font-bold text-[#d4af37] hover:underline">Administrator legal vault →</Link> : <span className="text-[10px] text-[#6a665a]">Access is limited to authenticated administrators.</span>}</div></Card>
        <Card className="p-4"><SectionHead icon={BookOpen} title="How to read a controlled document" /><div className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{['Check the document number, version and date.', 'Read the status and signature block: a reviewer acknowledgment is not regulatory approval.', 'Open the Word reader for the controlled layout; downloads are read-only DOCX copies.', 'Report a suspected outdated or altered copy to support.'].map((x) => <div key={x} className="flex gap-2"><GoldDot />{x}</div>)}</div></Card>
      </div>
    </>
  );
}

function Purchases() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Lock} kicker="Purchase controls" title="Designed now," accent="disabled until authorized" subtitle="The eight-step journey is documented so the controls can be built and tested. Payment collection remains off until legal, compliance, custody, payment provider, refund and launch requirements are satisfied." actions={<GoldButton to="/tbc/eligibility">Check eligibility <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4 rounded-[10px] border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-relaxed text-[#e9c4c4]"><span className="font-bold text-red-300">Sale disabled.</span> No TBC purchase is possible on this website. Anyone offering a TBC sale, presale, allocation or guaranteed return is not authorized by TradingBible LLC.</div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4 sm:p-5"><SectionHead icon={Workflow} title="Proposed purchaser journey" sub="Each step is a control, not a guarantee that the next exists." /><div className="space-y-2">{TBC_PURCHASE_STEPS.map((step) => <div key={step.n} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.07] font-mono text-[10px] font-bold text-[#d4af37]">{step.n}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-bold text-[#f0ecdd]">{step.title}</span><Pill status={step.status} /></div><p className="mt-0.5 text-[11px] text-[#8a8577]">{step.body}</p></div></div>)}</div></Card>
        <div className="space-y-3">
          <Card className="p-4"><SectionHead icon={CheckCircle2} title="Written evidence required before launch" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{TBC_PURCHASE_CONTROLS.map((x) => <li key={x} className="flex gap-2"><GoldDot />{x}</li>)}</ul></Card>
          <Card className="p-4"><SectionHead icon={Wallet} title="Payment, custody and refunds" /><div className="space-y-2 text-[11px] leading-relaxed text-[#8a8577]"><p><strong className="text-[#c9c4b4]">Payments:</strong> card, bank, stablecoin and other digital-asset methods are technical options, not confirmed accepted methods.</p><p><strong className="text-[#c9c4b4]">Custody:</strong> self-custody delivery and third-party custody are different products. Key management, multisig, withdrawal limits and recovery must be documented.</p><p><strong className="text-[#c9c4b4]">Refunds:</strong> failed KYC, payment failure, overpayment, duplicate transfers, network outages and legal cancellation rights require a traceable process.</p></div></Card>
        </div>
      </div>
    </>
  );
}

function Eligibility() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Globe2} kicker="Jurisdictions & eligibility" title="No market is cleared," accent="and no checkbox decides" subtitle="TradingBible wishes to evaluate access in the United States, Nigeria and additional international markets. Intent to serve a country is not permission to market or sell tokens there." actions={<GoldButton to="/tbc/purchases">Purchase controls <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 overflow-hidden rounded-[10px] border border-white/[0.07] bg-[#0b0b10]">
        <div className="border-b border-white/[0.07] px-4 py-3"><SectionHead icon={Globe2} title="Initial market assessment register" sub="Every row remains not cleared." /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-[#6a665a] [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-semibold"><th>Market</th><th>Proposed approach</th><th>Decision</th></tr></thead>
            <tbody>{TBC_JURISDICTIONS.map((row) => <tr key={row.market} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-3 font-semibold text-[#e9e7df]">{row.market}</td><td className="px-4 py-3 text-[11px] leading-relaxed text-[#8a8577]">{row.approach}</td><td className="px-4 py-3"><span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[10px] font-bold text-amber-300">{row.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><SectionHead icon={FingerprintIcon} title="Access-control signals" /><ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">{TBC_ELIGIBILITY_SIGNALS.map((x) => <li key={x} className="flex gap-2"><GoldDot />{x}</li>)}</ul></Card>
        <Card className="p-4"><SectionHead icon={ShieldCheck} title="Denials and record keeping" /><p className="text-xs leading-relaxed text-[#8a8577]">Where a person is ineligible, prevent acceptance of payment and provide a neutral explanation where legally appropriate. Preserve an auditable decision record while respecting data-protection obligations. VPN use or a false declaration is not evidence of eligibility.</p></Card>
      </div>
    </>
  );
}

function FingerprintIcon(props) {
  return <ShieldCheck {...props} />;
}

function Compliance() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero
          kickerIcon={ShieldCheck}
          kicker="Compliance & access · proposal"
          title="No licence is claimed,"
          accent="no market is cleared"
          subtitle="A token sale, exchange, custody service or brokerage product needs jurisdiction-specific legal analysis, identity controls, sanctions screening, payment controls, records and a complaint route. None of those is live for TBC."
          actions={<><GoldButton to="/tbc/eligibility">Eligibility details <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/tbc/documents">Read the documents</GhostButton></>}
        />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={ShieldCheck} title="Compliance posture" sub="Phase 1 is information and account management only." />
          <div className="space-y-1.5">
            {[
              ['Token issuance', 'Not issued; no public sale'],
              ['Brokerage / custody', 'Not offered as part of TBC'],
              ['KYC / identity', 'Not configured'],
              ['Sanctions screening', 'Not configured'],
              ['Country eligibility', 'No market cleared'],
              ['Complaints / refunds', 'Support intake only'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0">
                <span className="text-[#8a8577]">{label}</span>
                <span className="text-right font-semibold text-[#c9c4b4]">{value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Globe2} title="Access is multi-signal" sub="A checkbox, VPN or self-declaration is not enough." />
          <ul className="space-y-2 text-[11px] leading-relaxed text-[#8a8577]">
            {TBC_ELIGIBILITY_SIGNALS.map((signal) => (
              <li key={signal} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#d4af37]" />{signal}</li>
            ))}
          </ul>
          <div className="mt-3"><SectionLink to="/tbc/eligibility">Read the eligibility design</SectionLink></div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-4 sm:p-5">
          <SectionHead icon={Globe2} title="Jurisdiction decision register" sub="Every market remains not cleared." />
          <div className="space-y-1.5">
            {TBC_JURISDICTIONS.map((row) => (
              <div key={row.market} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0">
                <span className="text-[#c9c4b4]">{row.market}</span>
                <span className="text-right text-[11px] text-[#8a8577]">{row.approach}</span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-2 py-0.5 text-[10px] font-bold text-amber-300">{row.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-4">
            <SectionHead icon={Lock} title="Launch evidence" />
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-[#8a8577]">
              {TBC_PURCHASE_CONTROLS.slice(0, 6).map((item) => (
                <li key={item} className="flex gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />{item}</li>
              ))}
            </ul>
          </Card>
          <Note icon={TriangleAlert}>
            Nothing on this page is a legal opinion, regulatory approval or authorization to offer TBC. A reviewer acknowledgment is control evidence, not permission to launch.
          </Note>
        </div>
      </div>
    </>
  );
}

function Separation() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={Workflow} kicker="Brokerage & platform separation" title="Software is not brokerage," accent="and TBC is not a deposit" subtitle="TradingBible software, the proposed TBC issuance and any future regulated brokerage business are separate workstreams with separate legal, accounting and technology controls." actions={<GoldButton to="/tbc/documents">Read the separation paper <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5"><SectionHead icon={Code2} title="TradingBible software / TBC ecosystem" /><ul className="space-y-2">{TBC_SEPARATION.software.map((x) => <li key={x} className="flex gap-2 text-xs text-[#c9c4b4]"><GoldDot />{x}</li>)}</ul></Card>
        <Card className="p-4 sm:p-5"><SectionHead icon={LandmarkIcon} title="Future regulated brokerage" /><ul className="space-y-2">{TBC_SEPARATION.brokerage.map((x) => <li key={x} className="flex gap-2 text-xs text-[#c9c4b4]"><GoldDot />{x}</li>)}</ul></Card>
      </div>
      <Card className="mt-4 border-red-400/20 bg-red-400/[0.04] p-4"><div className="flex gap-2 text-xs leading-relaxed text-[#e9c4c4]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><span><strong className="text-red-200">Boundary rule:</strong> {TBC_SEPARATION.rule}</span></div></Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><SectionHead icon={Building2Icon} title="Entity and accounting separation" /><p className="text-xs leading-relaxed text-[#8a8577]">Counsel should decide whether regulated brokerage activities require separately licensed subsidiaries or affiliates. Separate bank accounts, books, personnel authorizations, customer contracts, risk management and capital should be maintained as required.</p></Card>
        <Card className="p-4"><SectionHead icon={Network} title="Infrastructure and API controls" /><p className="text-xs leading-relaxed text-[#8a8577]">Any MT4/MT5 or other bridge must be supported by lawful broker/server licensing, permissioned APIs, identity and account consent, logging, secure secrets management, transaction controls and audit trails. A configured bridge URL does not confer brokerage authorization.</p></Card>
      </div>
    </>
  );
}

function LandmarkIcon(props) {
  return <Building2Icon {...props} />;
}

function Building2Icon(props) {
  return <Globe2 {...props} />;
}

function Risks() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={TriangleAlert} kicker="Risk factors · summary" title="Read the risks," accent="then decide" subtitle="TBC is a proposal with significant legal, technical, market and operational uncertainty. This page is a summary; the full risk disclosure and offering documents control." actions={<GoldButton to="/tbc/documents">Read the source documents <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-4"><TbcProposalNotice /></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {TBC_RISKS.map((risk) => <Card key={risk.title} className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-[#f0ecdd]">{risk.title}</h3><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${risk.level === 'High' ? 'border-red-400/20 bg-red-400/[0.07] text-red-300' : 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300'}`}>{risk.level}</span></div><p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{risk.body}</p></Card>)}
      </div>
      <div className="mt-4"><Note icon={TriangleAlert} tone="warning">This is not a complete risk disclosure. Do not rely on this page to make an investment decision. No offer or solicitation is made.</Note></div>
    </>
  );
}

function Faqs() {
  return (
    <>
      <div className="pt-3 sm:pt-5">
        <PageHero kickerIcon={BookOpen} kicker="Frequently asked questions" title="Straight answers," accent="including the uncomfortable ones" subtitle="What TBC is, what it is not, and what must happen before any regulated function can open." actions={<GoldButton to="/tbc/documents">Source documents <ArrowRight className="h-4 w-4" /></GoldButton>} />
      </div>
      <div className="mt-5 space-y-2">
        {TBC_FAQS.map((faq) => <details key={faq.q} className="group rounded-[10px] border border-white/[0.07] bg-[#0b0b10] p-4 open:border-[#d4af37]/25"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#f0ecdd]"><span>{faq.q}</span><ChevronRight className="h-4 w-4 shrink-0 text-[#d4af37] transition group-open:rotate-90" /></summary><p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#8a8577]">{faq.a}</p></details>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card className="p-4"><SectionHead icon={FileText} title="Need a document?" /><p className="text-xs text-[#8a8577]">The five public summaries are available in the document library. The controlled instruments are in the admin legal vault.</p><div className="mt-2"><SectionLink to="/tbc/documents">Document library</SectionLink></div></Card><Card className="p-4"><SectionHead icon={ShieldCheck} title="Report a suspicious offer" /><p className="text-xs leading-relaxed text-[#8a8577]">TradingBible will never ask you to send seed phrases, grant wallet approvals, or pay a “tax” to receive TBC. Report any offer that claims otherwise to support.</p><div className="mt-2"><SectionLink to="/app/tbc/support">Contact support</SectionLink></div></Card></div>
    </>
  );
}
