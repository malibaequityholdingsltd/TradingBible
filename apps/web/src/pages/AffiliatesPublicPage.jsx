import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, BarChart3, Check, Link2, ShieldCheck, TrendingUp,
  Users, Wallet,
} from 'lucide-react';
import PublicSiteShell, { PublicCTA, PublicNotice, PublicSection } from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
import {
  CountUp, LaunchPill, Marquee, PageBackdrop, Parallax, Reveal, SectionRail,
  SpotlightCard, Stagger, StaggerItem,
} from '@/components/PublicMotion';

const PREMIUM_MONTHLY = 19.99;
const PREMIUM_ANNUAL = 199;
const COMMISSION_RATE = 0.15;

const STEPS = [
  ['01', 'Create a TradingBible account', 'The affiliate dashboard lives inside the platform. Your code is tied to your account, not a separate marketing profile.'],
  ['02', 'Share work you would stand behind', 'Use your code on content, a newsletter, a community or a direct recommendation. No spam, no fake screenshots, no income claims.'],
  ['03', 'Track eligible referrals', 'The dashboard shows clicks, signups, eligible subscriptions and pending commissions. Refunds and chargebacks are removed before payout.'],
  ['04', 'Claim in TBC', 'Approved USD commissions convert to TBC at the published rate and land in your credit wallet. Nothing is paid until the referred subscription clears.'],
];

const RULES = [
  ['15% recurring', 'On eligible referred Premium subscriptions, for as long as the referred subscription remains active and paid.'],
  ['Premium only', 'Free accounts do not earn a commission. Academy, enterprise and one-time purchases are excluded unless a written term says otherwise.'],
  ['Clear attribution', 'A referral is attributed through your affiliate code. Self-referrals, duplicate accounts and manipulated signups are excluded.'],
  ['TBC settlement', 'Approved commissions settle in the platform credit wallet at the published TBC rate. TBC is not equity and has no promised market value.'],
  ['No income promise', 'This is a marketing programme, not a job, investment, passive income or a guarantee of earnings. Results depend on eligible sales.'],
  ['Brand-safe promotion', 'Do not bid on the TradingBible brand, run misleading ads, promise profits or present the platform as a broker or adviser.'],
];

function Calculator() {
  const [referrals, setReferrals] = useState(5);
  const [plan, setPlan] = useState('monthly');
  const monthlyPerReferral = plan === 'monthly' ? PREMIUM_MONTHLY : PREMIUM_ANNUAL / 12;
  const monthly = useMemo(() => monthlyPerReferral * COMMISSION_RATE * referrals, [monthlyPerReferral, referrals]);
  const annual = monthly * 12;
  return (
    <div className="pm-calc">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="pm-kicker">Illustrative calculator</div>
          <h3 className="mt-2 text-lg font-bold text-[#f0ecdd]">Model the eligible subscription value.</h3>
        </div>
        <div className="inline-flex rounded-full border border-[#56e0a4]/25 bg-black/20 p-0.5" role="group" aria-label="Billing period">
          {['monthly', 'annual'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPlan(option)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold capitalize transition ${plan === option ? 'bg-[#56e0a4] text-[#07110c]' : 'text-[#a9a494] hover:text-[#e9e7df]'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <label className="pm-calc__label mt-5" htmlFor="affiliate-referrals">
        <span>Active referred Premium subscriptions</span>
        <output>{referrals}</output>
      </label>
      <input
        id="affiliate-referrals"
        type="range"
        min="1"
        max="50"
        step="1"
        value={referrals}
        onChange={(event) => setReferrals(Number(event.target.value))}
        aria-valuetext={`${referrals} active referrals`}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#56e0a4]/18 bg-[#56e0a4]/[0.055] p-4">
          <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a8577]">Illustrative monthly commission</div>
          <div className="pm-calc__value">${monthly.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          <div className="pm-calc__sub">15% × {referrals} active {plan} referral{referrals === 1 ? '' : 's'} at the current list price. Before refunds, chargebacks and exclusions.</div>
        </div>
        <div className="rounded-xl border border-[#d4af37]/18 bg-[#d4af37]/[0.045] p-4">
          <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#8a8577]">Illustrative annual value</div>
          <div className="pm-calc__value text-[#e8c95a]">${annual.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
          <div className="pm-calc__sub">The same {referrals} referrals retained for 12 months. Not a forecast, promise or guarantee.</div>
        </div>
      </div>
      <p className="mt-3 text-[9px] leading-relaxed text-[#6f6a5d]">
        Illustrative only. Actual commissions depend on eligible referred subscriptions, the current price, refunds, chargebacks, fraud review and the affiliate terms. TBC settlement is converted at the published rate.
      </p>
    </div>
  );
}

export default function AffiliatesPublicPage() {
  return (
    <PublicSiteShell className="pm-page pm-page--affiliates">
      <PageBackdrop variant="affiliates" />
      <div className="relative z-[1]">
        <header className="pm-hero">
          <div className="pm-hero__inner">
            <div>
              <Reveal><LaunchPill /></Reveal>
              <Reveal delay={0.05}>
                <div className="pm-kicker mt-6">Affiliates · Refer the work</div>
                <h1 className="pm-hero__title mt-4">
                  Share the record.<br />
                  <span className="tb-gold-text">Earn the share.</span>
                </h1>
                <p className="pm-hero__sub mt-5">
                  A 15% recurring commission on eligible referred Premium subscriptions.
                  No downline, no income promise and no fake performance. Just a clear code,
                  a dashboard and TBC settlement at the published rate.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="pm-hero__actions">
                  <GoldButton to="/app/affiliate" className="justify-center px-6 py-3.5">
                    Open affiliate dashboard <ArrowRight className="h-4 w-4" />
                  </GoldButton>
                  <GhostButton href="#calculator" className="justify-center border px-6 py-3.5 text-[#e9e7df]">
                    Model the value
                  </GhostButton>
                </div>
                <div className="pm-hero__meta">
                  {['15% recurring', 'TBC settlement', 'Refund-aware', 'No earnings guarantee'].map((item) => (
                    <span key={item}><Check className="h-3.5 w-3.5 text-[#56e0a4]" />{item}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} className="pm-hero__visual">
              <Parallax distance={18}>
                <div className="pm-growth-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="pm-kicker !text-[#56e0a4]">Referral revenue map</div>
                      <h2 className="mt-1 text-lg font-semibold text-[#f0ecdd]">Recurring, not a one-time bounty.</h2>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#56e0a4]/25 bg-[#56e0a4]/10 text-[#56e0a4]"><TrendingUp className="h-4 w-4" /></span>
                  </div>
                  <div className="pm-bars" aria-hidden>
                    {[38, 52, 44, 63, 58, 72, 66, 84, 78, 93, 88, 100].map((height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ['15%', 'recurring'],
                      ['TBC', 'settlement'],
                      ['0', 'downline levels'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                        <div className="font-mono text-lg font-bold text-[#56e0a4]">{value}</div>
                        <div className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#8a8577]">{label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-[#8a8577]">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#56e0a4]" />
                    The bars are a visual metaphor, not performance data. No affiliate earnings history is represented.
                  </p>
                </div>
              </Parallax>
            </Reveal>
          </div>

          <div className="relative mx-auto mt-9 w-full max-w-[84rem] px-0 sm:mt-12">
            <Marquee
              items={['15% recurring', 'Eligible Premium subscriptions', 'TBC settlement', 'Refund-aware', 'No downline', 'No income promise']}
              speed={30}
              reverse
            />
          </div>

          <div className="relative mx-auto mt-7 w-full max-w-[84rem]">
            <div className="pm-stats">
              {[
                [<CountUp key="rate" value={15} suffix="%" />, 'Recurring commission', 'On eligible Premium subscriptions'],
                ['$19.99', 'Premium monthly', 'Or $199 per year'],
                ['TBC', 'Settlement asset', 'At the published rate'],
                ['0', 'Earnings promised', 'Results depend on sales'],
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

        <PublicSection id="calculator" className="pt-14">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <Reveal>
              <SectionRail index="01" label="The numbers" />
              <h2 className="mt-3 max-w-lg text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[2.7rem]">
                A real revenue share, <span className="tb-gold-text">not a promise.</span>
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#8a8577]">
                Affiliates earn on eligible paid subscriptions, not clicks or free signups.
                The calculator is deliberately simple: active referrals × eligible price × 15%.
                It is not a forecast.
              </p>
              <div className="mt-5">
                <PublicNotice tone="gold">
                  <span className="font-semibold text-[#e9e7df]">No passive-income claim.</span>{' '}
                  This is a marketing programme. Commissions depend on eligible sales, retention, refunds and the affiliate terms. Never present it as an investment or guaranteed income.
                </PublicNotice>
              </div>
            </Reveal>
            <Reveal delay={0.08}><Calculator /></Reveal>
          </div>
        </PublicSection>

        <section className="border-y border-[#d4af37]/10">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
            <div className="pm-sticky">
              <div className="pm-sticky__aside">
                <Reveal>
                  <SectionRail index="02" label="How it works" />
                  <h2 className="mt-3 max-w-md text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[2.7rem]">
                    One code. Four steps.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8a8577]">
                    Built for people who already explain trading well: educators, analysts,
                    newsletter writers and community operators. The dashboard keeps attribution,
                    eligibility and payout status in one place.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {['Educators', 'Analysts', 'Newsletters', 'Communities'].map((tag) => (
                      <span key={tag} className="rounded-full border border-[#56e0a4]/20 bg-[#56e0a4]/[0.05] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[#56e0a4]">{tag}</span>
                    ))}
                  </div>
                </Reveal>
              </div>
              <div>
                {STEPS.map(([num, title, body]) => (
                  <Reveal key={num} delay={Number(num) * 0.04}>
                    <div className="pm-step">
                      <div className="pm-step__num">{num}</div>
                      <div>
                        <h3>{title}</h3>
                        <p>{body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
                <div className="mt-6 flex flex-wrap gap-2">
                  <GoldButton to="/app/affiliate" className="px-5 py-3">Get my code <Link2 className="h-4 w-4" /></GoldButton>
                  <GhostButton to="/pricing" className="border px-5 py-3 text-[#e9e7df]">See Premium terms</GhostButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicSection>
          <Reveal>
            <SectionRail index="03" label="Programme terms" />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">The parts that matter, in writing.</h2>
                <p className="tb-sub mt-2">A short, plain-language summary. The affiliate terms and platform terms control if there is any conflict.</p>
              </div>
              <Link to="/terms" className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">Read the terms <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>
          <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map(([title, body]) => (
              <StaggerItem key={title}>
                <Card className="h-full rounded-xl p-4 sm:p-5">
                  <BadgeCheck className="h-4 w-4 text-[#56e0a4]" />
                  <h3 className="mt-2 text-sm font-bold text-[#f0ecdd]">{title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </PublicSection>

        <section className="border-y border-[#d4af37]/10 bg-[#070908]/35">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-12 sm:px-8 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[1fr_.9fr] lg:items-center">
              <Reveal>
                <SectionRail index="04" label="What you get" />
                <h2 className="mt-3 max-w-2xl text-balance text-[1.8rem] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-[2.5rem]">
                  A dashboard that shows <span className="tb-gold-text">the whole route.</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
                  Your code, referred signups, subscription status, pending commissions and payout history in one place. If a payment is refunded, the commission is reversed before it is paid.
                </p>
              </Reveal>
              <Stagger className="grid gap-2 sm:grid-cols-2">
                {[
                  [BarChart3, 'Referral dashboard', 'Clicks, signups and eligible subscriptions.'],
                  [Users, 'Attribution', 'One code tied to your own account.'],
                  [Wallet, 'TBC payouts', 'Approved commissions settle in the credit wallet.'],
                  [ShieldCheck, 'Review before payout', 'Refunds, chargebacks and fraud are excluded.'],
                ].map(([Icon, title, body]) => (
                  <StaggerItem key={title}>
                    <Card className="h-full rounded-xl p-4">
                      <Icon className="h-4 w-4 text-[#56e0a4]" />
                      <div className="mt-2 font-mono text-lg font-bold text-[#e8c95a]">{title}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{body}</div>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        <PublicCTA
          eyebrow="Join the programme"
          title={<>Refer the work. <span className="tb-gold-text">Keep the share recurring.</span></>}
          body="Open the affiliate dashboard, get your code and read the eligibility rules before you share it. No income is promised."
          primary="Open affiliate dashboard"
          primaryTo="/app/affiliate"
          secondary="Talk to the team"
          secondaryTo="/contact"
        />
      </div>
    </PublicSiteShell>
  );
}
