import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Building2, Check, Landmark, Lock, Users,
} from 'lucide-react';
import PublicSiteShell, { PublicCTA, PublicNotice, PublicSection } from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
import {
  CountUp, Marquee, PageBackdrop, Parallax, Reveal, SectionRail, SpotlightCard,
  Stagger, StaggerItem,
} from '@/components/PublicMotion';

const PUBLIC_TEAM = [
  {
    name: 'Malik Nlem',
    role: 'Founder & CEO',
    img: '/images/malik-nlem-full.png',
    bio: 'Sets product, capital and company direction. The public record names the role; private execution details and signatory records stay inside the controlled vault.',
    tag: 'Leadership',
  },
  {
    name: 'Victor Okechukwu',
    role: 'Vice President',
    img: '/images/victor-okechukwu-full.png',
    bio: 'Works across operations, commercial delivery and the operating rhythm of the platform. Role shown as documented; no invented scope.',
    tag: 'Leadership',
  },
  {
    name: 'Maliba SI',
    role: 'Head of Quantitative Research',
    initials: 'SI',
    bio: 'The platform’s SI research function: journal review, quantitative education and the SI Coach. This is an AI research function, not a human officer.',
    tag: 'SI research · AI',
  },
];

const PRIORITY_SEATS = [
  ['COO', 'Chief Operating Officer', 'Operations', 'Own the operating cadence, service levels, vendor map and cross-team delivery.'],
  ['CFO', 'Chief Financial Officer', 'Finance', 'Own reporting, controls, treasury discipline and the audit-ready company record.'],
  ['CTO', 'Chief Technology Officer', 'Engineering', 'Own architecture, reliability, security and the build-versus-buy roadmap.'],
  ['CRO', 'Chief Risk & Compliance Officer', 'Risk & compliance', 'Own the risk framework, regulatory mapping and approval gates across products.'],
  ['GC', 'General Counsel', 'Legal', 'Own corporate, commercial, privacy and regulated-activity review with external counsel.'],
  ['HOT', 'Head of Trading', 'Markets', 'Own market structure, execution standards and the trading education standard.'],
  ['HOA', 'Head of Academy', 'Education', 'Own curriculum quality, tutor standards, webinars and certificate integrity.'],
  ['HOIR', 'Head of Investor Relations', 'Capital markets', 'Own the public company record, investor questions and disclosure discipline.'],
  ['HOP', 'Head of Partnerships', 'Growth', 'Own broker, prop-desk, enterprise and affiliate relationships without overstated claims.'],
  ['HOS', 'Head of Security', 'Security', 'Own identity, application security, incident response and responsible disclosure.'],
  ['HOPE', 'Head of People', 'People', 'Own hiring, employment records, onboarding and the standards behind every public title.'],
  ['HOMD', 'Head of Market Data', 'Data', 'Own provider licensing, data quality, entitlements and the public symbol catalog.'],
];

const PRINCIPLES = [
  ['01', 'Named only when documented', 'A public team card requires a real role and a real person. Open priority seats are marked open, never filled with a placeholder face.'],
  ['02', 'Titles without theatre', 'No “global head” title for a team of one. The public title reflects the actual operating scope and the company record.'],
  ['03', 'Execution stays private', 'Signatory identities, personal contact details and execution records are kept out of the public team page and public documents.'],
];

function TeamClock() {
  return (
    <div className="pm-team-hero__board">
      <div className="pm-clock" aria-label="Trading sessions run around the clock">
        <span className="pm-clock__label pm-clock__label--n">New York</span>
        <span className="pm-clock__label pm-clock__label--e">London</span>
        <span className="pm-clock__label pm-clock__label--s">Dubai</span>
        <span className="pm-clock__label pm-clock__label--w">Singapore</span>
        <span className="pm-clock__hand pm-clock__hand--hour" aria-hidden />
        <span className="pm-clock__hand pm-clock__hand--minute" aria-hidden />
        <span className="pm-clock__center">24/7</span>
      </div>
      <p className="absolute bottom-4 left-4 right-4 text-center font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">
        Market sessions, not office locations
      </p>
    </div>
  );
}

function PersonCard({ person }) {
  return (
    <SpotlightCard className="pm-person h-full">
      <div className="pm-person__photo">
        {person.img ? (
          <img src={person.img} alt={person.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        ) : (
          <span className="pm-person__initials">{person.initials || person.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
        )}
      </div>
      <div className="pm-person__body">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="pm-person__name">{person.name}</div>
            <div className="pm-person__role">{person.role}</div>
          </div>
          <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[#d4af37]">{person.tag}</span>
        </div>
        <p className="pm-person__bio">{person.bio}</p>
      </div>
    </SpotlightCard>
  );
}

export default function TeamPage() {
  return (
    <PublicSiteShell className="pm-page pm-page--team">
      <PageBackdrop variant="team" />
      <div className="relative z-[1]">
        <header className="pm-hero">
          <div className="pm-hero__inner">
            <div className="pm-hero__copy">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                  <Users className="h-3 w-3" /> Company · The desk
                </span>
              </Reveal>
              <Reveal delay={0.05}>
                <div className="pm-kicker mt-6">Team & priority seats</div>
                <h1 className="pm-hero__title mt-4">
                  The desk behind<br />
                  <span className="tb-gold-text">the record.</span>
                </h1>
                <p className="pm-hero__sub mt-5">
                  A small documented team, plus the priority seats we are hiring for.
                  Names appear only when a role is real. Open seats stay marked open —
                  no placeholder faces and no invented biographies.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="pm-hero__actions">
                  <GoldButton to="/careers" className="justify-center px-6 py-3.5">
                    See open roles <ArrowRight className="h-4 w-4" />
                  </GoldButton>
                  <GhostButton href="#priority-seats" className="justify-center border px-6 py-3.5 text-[#e9e7df]">
                    Priority seats
                  </GhostButton>
                </div>
                <div className="pm-hero__meta">
                  {['Documented roles only', 'Delaware company', 'SI research is AI', 'Signatory details private'].map((item) => (
                    <span key={item}><Check className="h-3.5 w-3.5 text-[#d4af37]" />{item}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} className="pm-hero__visual">
              <Parallax distance={16}><TeamClock /></Parallax>
            </Reveal>
          </div>

          <div className="relative mx-auto mt-9 w-full max-w-[84rem] px-0 sm:mt-12">
            <Marquee
              items={['Documented team', 'Priority seats open', 'No placeholder profiles', 'Execution stays private', 'Delaware company', 'SI research is AI']}
              speed={30}
              reverse
            />
          </div>

          <div className="relative mx-auto mt-7 w-full max-w-[84rem]">
            <div className="pm-stats">
              {[
                [<CountUp key="team" value={PUBLIC_TEAM.length} />, 'Documented team', 'Named public roles'],
                [<CountUp key="seats" value={PRIORITY_SEATS.length} />, 'Priority seats', 'Hiring priorities, not appointments'],
                ['DE', 'Delaware company', 'TradingBible Holdings, Inc.'],
                ['0', 'Invented profiles', 'No fabricated people or titles'],
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

        <PublicSection id="team" className="pt-14">
          <Reveal>
            <SectionRail index="01" label="The documented team" />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">Small team. Direct accountability.</h2>
                <p className="tb-sub mt-2">The public record names three roles. The rest of the leadership map is intentionally open until an appointment is real.</p>
              </div>
              <Link to="/about" className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">Company overview <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>
          <Stagger className="pm-team-grid mt-6">
            {PUBLIC_TEAM.map((person) => <StaggerItem key={person.name}><PersonCard person={person} /></StaggerItem>)}
          </Stagger>
          <Reveal delay={0.08}>
            <div className="mt-4">
              <PublicNotice>
                <span className="font-semibold text-[#e9e7df]">Maliba SI is an AI research function.</span>{' '}
                It is not a human officer, director or employee. The role is shown because the SI review and education function is part of the product, not because a person has been appointed.
              </PublicNotice>
            </div>
          </Reveal>
        </PublicSection>

        <section id="priority-seats" className="scroll-mt-28 border-y border-[#d4af37]/10">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
            <Reveal>
              <SectionRail index="02" label="The open map" />
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">Priority seats.</h2>
                  <p className="tb-sub mt-2">These are hiring priorities, not appointments. Each seat has a written mandate and will be published as filled only after the appointment is recorded.</p>
                </div>
                <GhostButton to="/careers" className="border px-5 py-3 text-[#e9e7df]">See all open roles</GhostButton>
              </div>
            </Reveal>
            <Stagger className="pm-priority-grid mt-6">
              {PRIORITY_SEATS.map(([code, title, department, mandate]) => (
                <StaggerItem key={code}>
                  <div className="pm-priority">
                    <div className="flex items-center justify-between gap-2">
                      <span className="pm-priority__status"><span className="pm-priority__dot" /> Open · priority</span>
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#6f6a5d]">{code}</span>
                    </div>
                    <h3>{title}</h3>
                    <div className="mt-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">{department}</div>
                    <p>{mandate}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
            <p className="mt-4 max-w-3xl text-[10px] leading-relaxed text-[#6f6a5d]">
              Priority seats are open roles and do not represent current officers, directors or employees. Compensation, title and start date are confirmed only in a written offer and the company record.
            </p>
          </div>
        </section>

        <PublicSection>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <Reveal>
              <SectionRail index="03" label="How the desk works" />
              <h2 className="mt-3 max-w-lg text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[2.7rem]">
                The org map should be <span className="tb-gold-text">as honest as the journal.</span>
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#8a8577]">
                TradingBible is a private, pre-IPO company. The public team page is a record, not a recruitment brochure. When a seat is filled, the role and the company record change together.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['No fake faces', 'No borrowed titles', 'No hidden authority'].map((tag) => (
                  <span key={tag} className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.04] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#d4af37]">{tag}</span>
                ))}
              </div>
            </Reveal>
            <div className="pm-principles">
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
        </PublicSection>

        <section className="border-y border-[#d4af37]/10 bg-[#080705]/40">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-12 sm:px-8 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[1fr_.9fr] lg:items-center">
              <Reveal>
                <SectionRail index="04" label="Governance" />
                <h2 className="mt-3 max-w-2xl text-balance text-[1.8rem] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-[2.5rem]">
                  The board is not presented as complete.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
                  TradingBible Holdings, Inc. is a Delaware corporation. Board composition, committee appointments and officer records will be published only when adopted and verified. Until then, the public page marks the gaps.
                </p>
              </Reveal>
              <Stagger className="grid gap-2 sm:grid-cols-2">
                {[
                  [Building2, 'Delaware entity', 'TradingBible Holdings, Inc. is the operator and securities issuer.'],
                  [Landmark, 'Pre-IPO', 'TB is a proposed ticker; no listing, price or market exists.'],
                  [Lock, 'Private execution', 'Signatory identities and execution records stay in the controlled vault.'],
                  [BadgeCheck, 'Published only when verified', 'Titles and appointments follow the company record, not a marketing deck.'],
                ].map(([Icon, title, body]) => (
                  <StaggerItem key={title}>
                    <Card className="h-full rounded-xl p-4">
                      <Icon className="h-4 w-4 text-[#d4af37]" />
                      <div className="mt-2 text-sm font-bold text-[#f0ecdd]">{title}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{body}</div>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        <PublicCTA
          eyebrow="Build the desk"
          title={<>The next seat is <span className="tb-gold-text">a written mandate.</span></>}
          body="If you can own a function with evidence, read the open roles and apply. No invented titles, no placeholder profiles, no shortcuts around the record."
          primary="See open roles"
          primaryTo="/careers"
          secondary="Talk to the company"
          secondaryTo="/contact"
        />
      </div>
    </PublicSiteShell>
  );
}
