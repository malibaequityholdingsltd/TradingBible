import React from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Briefcase, Building2, CheckCircle2,
  Clock3, FileText, Landmark, Layers, Lock, Mail, Scale,
  ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
import PublicSiteShell, {
  PublicCTA, PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';
import {
  FUND_DOCUMENTS, FUND_ENTITY, FUND_FAQ, FUND_GOVERNANCE, FUND_OPERATING_MODEL,
  FUND_READINESS, FUND_STATUS, FUND_STRATEGIES,
} from '@/lib/fundProfile';

const STATUS_TONE = {
  green: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
  blue: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-300',
  amber: 'border-[#d4af37]/25 bg-[#d4af37]/[0.06] text-[#e8c95a]',
  red: 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300',
};

function StatusPill({ children, tone = 'amber' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${STATUS_TONE[tone] || STATUS_TONE.amber}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function SectionIcon({ icon: Icon, seed = 'fund' }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[#d4af37]/20 bg-[#d4af37]/[0.06] text-[#d4af37]">
      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      <span className="sr-only">{seed}</span>
    </span>
  );
}

export default function FundPage() {
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="TradingBible Capital"
        title={<>A proposed hedge fund, <span className="tb-gold-text">built on the same record.</span></>}
        description="TradingBible Capital is the proposed asset-management and hedge-fund division of TradingBible Holdings, Inc. The operating platform is live; the fund is not. No vehicle, outside capital, AUM, track record or investor offering exists today."
        meta={['In formation', 'No fund offered', 'No AUM or track record']}
        actions={(
          <>
            <GoldButton to="/contact?topic=fund">Fund inquiry <ArrowRight className="h-4 w-4" /></GoldButton>
            <GhostButton to="/app/challenges">Prop desk</GhostButton>
          </>
        )}
      >
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Owner & operator', FUND_ENTITY.owner],
            ['Fund status', FUND_ENTITY.status],
            ['Fund vehicle', FUND_ENTITY.fundVehicle],
            ['Investor access', FUND_ENTITY.investorAccess],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
              <div className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">{label}</div>
              <div className="mt-1 text-xs font-semibold text-[#f0ecdd]">{value}</div>
            </div>
          ))}
        </div>
      </PublicPageHead>

      <div className="mx-auto w-full max-w-[84rem] px-5 pt-4 sm:px-8">
        <PublicNotice>
          <span className="font-semibold text-[#e9e7df]">This is not an offering.</span>{' '}
          No fund interest, security, token, unit or investment product is being sold. No AUM, return, Sharpe, drawdown or track record is presented. Any future fund would require a separate legal entity, approved documents, independent administration and the applicable registrations or exemptions.
        </PublicNotice>
      </div>

      <PublicSection eyebrow="Status" title="What exists today.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FUND_STATUS.map((item) => (
            <Card key={item.label} className="rounded-xl p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">{item.label}</span>
                <StatusPill tone={item.tone}>{item.value}</StatusPill>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#8a8577]">{item.note}</p>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Mandate" title="Four research sleeves. One risk budget.">
        <div className="grid gap-3 sm:grid-cols-2">
          {FUND_STRATEGIES.map((item, index) => (
            <Card key={item.title} className="rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="font-mono text-[10px] font-bold text-[#d4af37]">0{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#f0ecdd]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#8a8577]">{item.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[#d4af37]/15 bg-[#d4af37]/[0.04] px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[#d4af37]">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#6f6b60]">
          Strategy descriptions are research design, not live mandates, performance claims or a promise that any sleeve will be traded. The final mandate, limits and disclosures require approval.
        </p>
      </PublicSection>

      <PublicSection eyebrow="Operating model" title="The fund is a separate legal and operational stack.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUND_OPERATING_MODEL.map((item, index) => {
            const Icon = [Scale, ShieldCheck, BarChart3, Landmark, Wallet, Users][index] || ShieldCheck;
            return (
              <Card key={item.title} className="rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <SectionIcon icon={Icon} seed={item.title} />
                  <StatusPill tone={item.tone}>{item.status}</StatusPill>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#f0ecdd]">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{item.body}</p>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Readiness" title="What must be true before outside capital.">
        <div className="grid gap-3 lg:grid-cols-2">
          {FUND_READINESS.map(([title, status, body]) => {
            const tone = status === 'Built' ? 'green' : status === 'Designed' ? 'blue' : status === 'Pending' || status === 'Not adopted' ? 'amber' : 'red';
            return (
              <div key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {status === 'Built' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : status === 'Designed' ? <Layers className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /> : status === 'Not adopted' || status === 'Pending' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#e8c95a]" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#f0ecdd]">{title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{body}</p>
                    </div>
                  </div>
                  <StatusPill tone={tone}>{status}</StatusPill>
                </div>
              </div>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Governance" title="No commingling. No implied returns.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUND_GOVERNANCE.map((item) => (
            <Card key={item.title} className="rounded-xl p-5">
              <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
              <h3 className="mt-3 text-sm font-semibold text-[#f0ecdd]">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{item.body}</p>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Documents" title="No approved fund documents published.">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
          <Card className="rounded-xl p-5">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-[#d4af37]" />
              <h3 className="text-base font-semibold text-[#f0ecdd]">Document library</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">
              A fund document is published only after it is approved, versioned and linked to a source record. The platform does not show an unapproved working copy as if it were an executed instrument.
            </p>
            <div className="mt-4 space-y-2">
              {FUND_DOCUMENTS.map((doc) => (
                <div key={doc.title} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <span className="text-xs text-[#c9c4b4]">{doc.title}</span>
                  <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a8577]">{doc.status}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="rounded-xl p-5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-[#d4af37]" />
              <h3 className="text-base font-semibold text-[#f0ecdd]">Investor access</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">
              There is no fund subscription, capital call, investor portal or allocation. The existing investor-relations centre covers the proposed TB stock record; it is not a fund offering.
            </p>
            <div className="mt-4 space-y-2">
              {[
                ['Fund status', FUND_ENTITY.status],
                ['AUM', FUND_ENTITY.aum],
                ['Track record', FUND_ENTITY.trackRecord],
                ['Regulatory status', FUND_ENTITY.regulator],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
                  <span className="text-[10px] text-[#8a8577]">{label}</span>
                  <span className="max-w-[62%] text-right text-[10px] font-semibold text-[#c9c4b4]">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PublicSection>

      <PublicSection eyebrow="FAQ" title="Straight answers.">
        <div className="grid gap-3 lg:grid-cols-2">
          {FUND_FAQ.map((item) => (
            <Card key={item.q} className="rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#f0ecdd]">{item.q}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8a8577]">{item.a}</p>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Contact" title="The right route to the right team.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [Mail, 'Fund inquiry', 'Entity, mandate, operational due diligence and future fund questions.', '/contact?topic=fund'],
            [Briefcase, 'Prop desk', 'TradingBible Funded evaluations, rules and payouts.', '/app/challenges'],
            [Building2, 'Investor relations', 'The proposed TB stock record and company disclosures.', '/investors'],
          ].map(([Icon, title, body, to]) => (
            <Card key={title} className="rounded-xl p-5">
              <Icon className="h-4 w-4 text-[#d4af37]" />
              <h3 className="mt-3 text-sm font-semibold text-[#f0ecdd]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
              <a href={to} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">
                Open <ArrowRight className="h-3 w-3" />
              </a>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicCTA
        eyebrow="Start with the platform"
        title={<>The fund is a proposal. <span className="tb-gold-text">The platform is live.</span></>}
        body="Explore the terminal, journal, analytics, Academy and prop desk. Fund inquiries are routed to the team; no investment is offered."
        primary="Explore the platform"
        primaryTo="/features"
        secondary="Contact the team"
        secondaryTo="/contact?topic=fund"
      />
    </PublicSiteShell>
  );
}
