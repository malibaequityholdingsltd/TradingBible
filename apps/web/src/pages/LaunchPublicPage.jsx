import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CalendarDays, Check, GraduationCap, Landmark, Lock,
  Sparkles, Trophy, Wallet,
} from 'lucide-react';
import PublicSiteShell, { PublicNotice, PublicSection } from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
import {
  LAUNCH_LABEL, LaunchCountdown, Marquee, PageBackdrop, Parallax, Reveal,
  SectionRail, Stagger, StaggerItem,
} from '@/components/PublicMotion';

const OPEN_ITEMS = [
  [BarChart3, 'Platform accounts', 'Free and Premium accounts, the terminal, journal, analytics, SI review, alerts and broker sync.'],
  [GraduationCap, 'Academy 2.0', 'Four schools, 17 paths and 347 lessons, with read-aloud lessons and SI-hosted webinar rooms.'],
  [Trophy, 'Funded evaluations', 'Two-step, one-step and dollar-ruled futures programs, with the live catalog as the source of truth.'],
  [Landmark, 'Company record', 'The public About, team, issuer record and investor-relations pages.'],
  [Wallet, 'TBC credit wallet', 'Existing off-chain platform credits, ledger-backed and separate from the proposed TBC token.'],
  [Sparkles, 'Public launch experience', 'Programs, affiliates, launch and team pages, built around evidence rather than a countdown alone.'],
];

const GATED_ITEMS = [
  ['Live brokerage', 'No brokerage licence, bank account or live client-money permission is represented.'],
  ['Card issuance', 'No physical or virtual card is issued until an approved issuer, programme and KYC are in place.'],
  ['Fund vehicle', 'TradingBible Capital remains in formation. No fund, PPM, AUM, track record or outside capital exists.'],
  ['TBC token operations', 'No token sale, transfer, staking, governance or migration is active. TBC credits are not the proposed token.'],
  ['TB share trading', 'TB is a proposed ticker, not a reserved or approved listing. There is no public share price or market.'],
  ['Regulatory approvals', 'A launch date does not create a licence, registration, exemption or regulator approval.'],
];

const TIMELINE = [
  ['Now', 'Build, test, verify', 'The platform, Academy, funded catalog, document library and public record are being completed and tested. Every claim must have an evidence path.'],
  ['25 December 2026', 'Public launch', 'The official launch date. Christmas Day. Platform accounts, Academy, funded catalog and the public company record open together.'],
  ['After launch', 'Operate the record', 'Support, review, security, privacy and the public changelog continue. Product claims stay tied to what is actually shipped.'],
  ['Separate gates', 'Regulated expansion', 'Brokerage, cards, the fund and TBC token operations move only after the relevant legal, regulatory and operational approvals exist.'],
];

const PRINCIPLES = [
  ['01', 'A date is not an approval', 'Launching the platform does not launch a broker, a fund, a card programme or a token sale. Each regulated surface stays behind its own gate.'],
  ['02', 'Show the evidence', 'No fabricated P&L, balances, screenshots, approvals or user counts. If a number is not measured, it is not published.'],
  ['03', 'Ship the record', 'The first public version is the platform, the Academy, the funded catalog and the company record. The rest follows only when it is real.'],
];

export default function LaunchPublicPage() {
  return (
    <PublicSiteShell className="pm-page pm-page--launch">
      <PageBackdrop variant="launch" />
      <div className="relative z-[1]">
        <header className="pm-hero">
          <div className="pm-hero__inner">
            <div className="pm-hero__copy">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#7d9cff]/30 bg-[#7d9cff]/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#a8b8ff]">
                  <span className="pm-live-dot" /> Official launch · {LAUNCH_LABEL}
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <div className="pm-kicker mt-6">Christmas Day · 2026</div>
                <h1 className="pm-hero__title mt-4">
                  The public launch<br />
                  <span className="tb-gold-text">is set for Christmas.</span>
                </h1>
                <p className="pm-hero__sub mt-5">
                  TradingBible opens to the public on 25 December 2026. The platform, Academy,
                  funded catalog and company record launch together. Regulated surfaces stay
                  behind their own approvals — a launch date is not a licence.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="pm-hero__actions">
                  <GoldButton to="/signup" className="justify-center px-6 py-3.5">
                    Create a free account <ArrowRight className="h-4 w-4" />
                  </GoldButton>
                  <GhostButton href="#what-launches" className="justify-center border px-6 py-3.5 text-[#e9e7df]">
                    What launches
                  </GhostButton>
                </div>
                <div className="pm-hero__meta">
                  {['25 December 2026', 'Platform · Academy · Funded', 'No fake countdown', 'Regulated gates stay separate'].map((item) => (
                    <span key={item}><Check className="h-3.5 w-3.5 text-[#7d9cff]" />{item}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} className="pm-hero__visual">
              <Parallax distance={20}>
                <div className="pm-launch-orbit">
                  <div className="pm-launch-orbit__core">
                    <b>25 DEC</b>
                    <span>2026 · Christmas Day</span>
                    <LaunchCountdown />
                  </div>
                </div>
              </Parallax>
            </Reveal>
          </div>

          <div className="relative mx-auto mt-9 w-full max-w-[84rem] px-0 sm:mt-12">
            <Marquee
              items={['25 December 2026', 'Christmas Day', 'Public launch', 'Platform', 'Academy', 'Funded', 'Company record', 'No regulatory approval implied']}
              speed={32}
            />
          </div>

          <div className="relative mx-auto mt-7 w-full max-w-[84rem]">
            <div className="pm-stats">
              {[
                ['25', 'December 2026', 'Official public launch date'],
                ['3', 'Core surfaces', 'Platform · Academy · Funded'],
                ['0', 'Fake numbers', 'Evidence or silence'],
                ['1', 'Public standard', 'Read the record before the claim'],
              ].map(([value, label, note]) => (
                <div key={label}>
                  <div className="pm-stat__value">{value}</div>
                  <div className="pm-stat__label">{label}</div>
                  <div className="pm-stat__note">{note}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <PublicSection id="what-launches" className="pt-14">
          <Reveal>
            <SectionRail index="01" label="Launch scope" />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">What opens on Christmas Day.</h2>
                <p className="tb-sub mt-2">Six shipped surfaces. No placeholder pages, no invented balances and no promise that a regulated product is live.</p>
              </div>
              <Link to="/signup" className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">Create a free account <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>
          <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPEN_ITEMS.map(([Icon, title, body]) => (
              <StaggerItem key={title}>
                <Card className="h-full rounded-xl p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-4 w-4 text-[#7d9cff]" />
                    <span className="rounded-full border border-[#7d9cff]/25 bg-[#7d9cff]/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#a8b8ff]">Launch target</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#f0ecdd]">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </PublicSection>

        <section className="border-y border-[#d4af37]/10">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <Reveal>
                <SectionRail index="02" label="Separate gates" />
                <h2 className="mt-3 max-w-lg text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[2.7rem]">
                  What does <span className="tb-gold-text">not launch</span> on 25 December.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#8a8577]">
                  These are not footnotes. They are separate businesses and regulated activities. The platform launch does not create them, and this page will not pretend otherwise.
                </p>
                <div className="mt-5">
                  <PublicNotice>
                    <span className="font-semibold text-[#e9e7df]">No token sale. No share sale. No fund. No card.</span>{' '}
                    TBC credits are existing platform utility credits. The proposed TBC token and TB equity are separate, unissued or unlisted assets.
                  </PublicNotice>
                </div>
              </Reveal>
              <div className="grid gap-2 sm:grid-cols-2">
                {GATED_ITEMS.map(([title, body], index) => (
                  <Reveal key={title} delay={index * 0.03}>
                    <Card className="h-full rounded-xl border-dashed p-4">
                      <Lock className="h-4 w-4 text-[#6f6a5d]" />
                      <h3 className="mt-2 text-sm font-bold text-[#f0ecdd]">{title}</h3>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">{body}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <PublicSection>
          <Reveal>
            <SectionRail index="03" label="The timeline" />
            <div className="mt-3 max-w-3xl">
              <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">One date, then the work.</h2>
              <p className="tb-sub mt-2">The launch date is fixed. The gates around regulated products are not shortcuts, and the public record will show what is actually open.</p>
            </div>
          </Reveal>
          <div className="pm-timeline mt-7 max-w-4xl">
            {TIMELINE.map(([date, title, body]) => (
              <Reveal key={date}>
                <div className="pm-timeline__item">
                  <span className="pm-timeline__dot" aria-hidden />
                  <div className="pm-timeline__date">{date}</div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </PublicSection>

        <section className="border-y border-[#d4af37]/10 bg-[#07070d]/45">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-12 sm:px-8 sm:py-16">
            <Reveal>
              <SectionRail index="04" label="Launch principles" />
              <h2 className="mt-3 max-w-2xl text-balance text-[1.8rem] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-[2.5rem]">
                A launch should make the company <span className="tb-gold-text">easier to inspect.</span>
              </h2>
            </Reveal>
            <div className="pm-principles mt-6">
              {PRINCIPLES.map(([num, title, body]) => (
                <Reveal key={num}>
                  <div className="pm-principle">
                    <span>{num}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
          <Card className="relative overflow-hidden rounded-2xl border-[#7d9cff]/25 p-6 sm:p-10">
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(125,156,255,0.18), transparent 55%)' }} />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#a8b8ff]"><CalendarDays className="h-3.5 w-3.5" /> 25 December 2026 · Christmas Day</div>
                <h2 className="mt-3 max-w-2xl text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-4xl">Open the record on launch day. <span className="tb-gold-text">Bring the questions.</span></h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">Create a free account now, explore the platform and Academy, and read the company record before the public launch date.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <GoldButton to="/signup" className="justify-center px-6 py-3.5">Create a free account <ArrowRight className="h-4 w-4" /></GoldButton>
                <GhostButton to="/about" className="justify-center border px-6 py-3.5 text-[#e9e7df]">Read the company record</GhostButton>
              </div>
            </div>
            <p className="relative mt-6 border-t border-white/[0.07] pt-3 text-[9px] leading-relaxed text-[#5f5b50]">
              The 25 December 2026 date is a company launch target, not a regulatory approval, listing, funding or token issuance. Regulated services remain subject to separate legal and operational gates.
            </p>
          </Card>
        </section>
      </div>
    </PublicSiteShell>
  );
}
