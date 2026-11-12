import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Ban, Building2, CheckCircle2, Clock3, FileText,
  Landmark, Lock, Mail, ShieldCheck, Users,
} from 'lucide-react';
import PublicSiteShell, {
  PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';

const STATUS_ROWS = [
  { label: 'Issuer', value: 'TradingBible Holdings, Inc.', note: 'Delaware corporation', tone: 'neutral' },
  { label: 'Securities offering', value: 'None open', note: 'No offer or sale is being made', tone: 'amber' },
  { label: 'Instruments', value: 'Not authorised', note: 'No SAFE, note, equity or token sale terms are approved', tone: 'amber' },
  { label: 'Form D', value: 'Not filed', note: 'No private-placement filing has been made', tone: 'amber' },
  { label: 'Regulation CF', value: 'No offering', note: 'No Form C, qualification or funding portal', tone: 'amber' },
  { label: 'Execution gate', value: 'Closed', note: 'FUNDRAISING_EXECUTION_ENABLED is not enabled', tone: 'amber' },
];

const CONDITIONS = [
  'Written board authorisation for the specific transaction and amount.',
  'Counsel approval of the issuer, instrument, disclosure and investor eligibility.',
  'A complete offering document or, for Regulation CF, a filed and qualified Form C through a registered funding portal.',
  'Verified cap table, ownership records and current financial statements.',
  'Escrow, subscription and investor-verification arrangements operated by the appropriate providers.',
  'A clear public notice of the official documents, deadline and channels before any funds are accepted.',
];

const NOT_THIS = [
  'Not an offer to sell, or a solicitation of an offer to buy, any security.',
  'Not a reservation, waitlist, allocation, pre-order or indication of interest.',
  'Not a promise of returns, distribution, liquidity, listing or valuation.',
  'Not a request for money, wire transfer, crypto transfer or payment of any kind.',
  'Not evidence that any exemption, qualification, filing or approval has been obtained.',
];

function Pill({ children, tone = 'amber' }) {
  const cls = tone === 'amber'
    ? 'border-[#d4af37]/25 bg-[#d4af37]/[0.08] text-[#e8c95a]'
    : 'border-white/10 bg-white/[0.04] text-[#b8b3a3]';
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] ${cls}`}>{children}</span>;
}

function Panel({ title, sub, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-[#d4af37]/15 bg-white/[0.02] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 ${className}`}>
      {(title || sub || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold tracking-tight text-[#f0ecdd]">{title}</h3>}
            {sub && <p className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export default function FundraisingStatusPage() {
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Capital formation · status record"
        title={<>No offering is open. <span className="tb-gold-text">No funds are being requested.</span></>}
        description="TradingBible Holdings, Inc. is preparing internal fundraising materials for review, but it is not currently offering or selling securities to the public. This page is a status record, not a solicitation."
        meta={['No offering open', 'Private company', 'No investment function', 'Updated 10 Nov 2026']}
      >
        <div className="mt-6 max-w-3xl">
          <PublicNotice tone="amber">
            <b className="text-[#f0ecdd]">Do not send funds.</b>{' '}
            Nothing on this page is an offer, solicitation, subscription instruction or investment contract.
            Any request for money that claims to be from TradingBible should be treated as unauthorised until it appears in an official company document issued after written board and counsel approval.
          </PublicNotice>
        </div>
      </PublicPageHead>

      <PublicSection
        eyebrow="Current state"
        title="Private preparation only"
        sub="The company has final-form confidential fundraising documents for internal review. Final form is not an offering, filing or approval."
      >
        <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <Panel title="Offer status" sub="As at the date shown above.">
            <div className="divide-y divide-white/[0.06]">
              {STATUS_ROWS.map((row) => (
                <div key={row.label} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#e9e7df]">{row.label}</div>
                    <div className="mt-0.5 text-[10px] text-[#8a8577]">{row.note}</div>
                  </div>
                  <Pill tone={row.tone}>{row.value}</Pill>
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title="What exists today" sub="Confidential work product, not a public offer.">
              <div className="space-y-2.5">
                {[
                  { icon: FileText, title: '20 final-form private documents', note: 'Final-form and awaiting board/counsel authorization' },
                  { icon: ShieldCheck, title: 'Execution and send gates closed', note: 'DocuSign sending and submission are disabled' },
                  { icon: Users, title: 'No investor commitments', note: 'No subscription, allocation or acceptance has occurred' },
                  { icon: Lock, title: 'No public investment route', note: 'No button, form, wallet address or payment link' },
                ].map(({ icon: Icon, title, note }) => (
                  <div key={title} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-[#e8c95a]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#e9e7df]">{title}</div>
                      <div className="mt-0.5 text-[10px] leading-relaxed text-[#8a8577]">{note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="flex gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-[11px] leading-relaxed text-[#c9c4b4]">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c95a]" />
              <div><b className="text-[#f0ecdd]">No timeline is promised.</b> A future offering may never occur. If the board decides not to proceed, no offering will be made and no funds will be accepted.</div>
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Before any offering"
        title="The gates that must be cleared"
        sub="These are prerequisites, not a schedule. Each one requires evidence outside this page."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {CONDITIONS.map((item, index) => (
            <div key={item} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/[0.08] font-mono text-[10px] font-bold text-[#e8c95a]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="pt-1 text-[11px] leading-relaxed text-[#c9c4b4]">{item}</p>
            </div>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Boundaries"
        title="What this page is not"
        sub="Read this before relying on anything you see elsewhere."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <Panel title="No solicitation" sub="Plain-language limits.">
            <ul className="space-y-2">
              {NOT_THIS.map((item) => (
                <li key={item} className="flex gap-2.5 text-[11px] leading-relaxed text-[#c9c4b4]">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c95a]" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Official channels" sub="Where a future notice would appear.">
            <div className="space-y-3">
              <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c95a]" />
                <div>
                  <div className="text-[11px] font-semibold text-[#e9e7df]">Company website</div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#8a8577]">This page and the investor relations section are the only public status locations.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c95a]" />
                <div>
                  <div className="text-[11px] font-semibold text-[#e9e7df]">Legal contact</div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[#8a8577]">
                    <a href="mailto:legal@tradingbible.app" className="text-[#e8c95a] hover:underline">legal@tradingbible.app</a>{' '}
                    for company or securities-status questions. Do not send account numbers, funds or identity documents.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link to="/about" className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-[#c9c4b4] transition hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                  Company overview <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link to="/investors" className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-[#c9c4b4] transition hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                  Investor relations <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-5 rounded-2xl border border-[#d4af37]/15 bg-white/[0.02] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.08] text-[#e8c95a]">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#e8c95a]">Issuer record</div>
                <div className="mt-1 text-sm font-semibold text-[#f0ecdd]">TradingBible Holdings, Inc.</div>
                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#8a8577]">
                  Delaware corporation. Private company. Not publicly traded. TB is a proposed ticker, not a listed security. TBC is a proposed token, not issued or for sale.
                  Product launch is planned for 25 December 2026; a product launch is not a securities offering.
                </p>
              </div>
            </div>
            <Pill>Private · pre-launch</Pill>
          </div>
        </div>

        <div className="mt-5">
          <PublicNotice>
            <b className="text-[#f0ecdd]">Status changes will be published here.</b>{' '}
            This page will be updated if an offering is authorised. Until then, no person is authorised to accept an investment, subscription or transfer on the company&apos;s behalf.
          </PublicNotice>
        </div>

        <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-[#6a665a]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This status record is maintained by the company. It is not legal advice, an SEC filing, a qualification, a FINRA approval or a substitute for official offering documents.
        </p>
      </PublicSection>
    </PublicSiteShell>
  );
}
