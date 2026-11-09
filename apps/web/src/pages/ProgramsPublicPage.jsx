import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, ArrowRight, BadgeDollarSign, Check, ChevronRight, CircleDollarSign,
  Filter, Lock, Scale, ShieldCheck, Target, Trophy, Wallet,
} from 'lucide-react';
import PublicSiteShell, {
  PublicCTA, PublicNotice, PublicSection,
} from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
import {
  CountUp, LaunchPill, Marquee, PageBackdrop, Parallax, Reveal, SectionRail,
  SpotlightCard, Stagger, StaggerItem,
} from '@/components/PublicMotion';
import { API_SERVER_URL } from '@/lib/apiServerClient';

const MODES = [
  ['all', 'All programs'],
  ['two-step', 'Two-step'],
  ['one-step', 'One-step'],
  ['futures', 'Dollar-ruled futures'],
];

const FALLBACK = [
  {
    key: 'two-step',
    name: 'Two-step evaluation',
    description: 'Two structured stages. The first proves the process; the second verifies it under the same written rails.',
    mode: 'two-step',
    fallback: true,
  },
  {
    key: 'one-step',
    name: 'One-step evaluation',
    description: 'One evaluation stage for traders who want a shorter path and accept tighter consistency rails.',
    mode: 'one-step',
    fallback: true,
  },
  {
    key: 'futures',
    name: 'Dollar-ruled futures',
    description: 'Futures evaluations sized in dollars, with contract limits and exchange-hours rules stated up front.',
    mode: 'futures',
    fallback: true,
  },
];

const MODE_LABEL = {
  'two-step': 'Two-step',
  'one-step': 'One-step',
  futures: 'Dollar-ruled futures',
};

const money = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Shown in app';
  return `$${number.toLocaleString('en-US')}`;
};

const modeOf = (product) => product?.mode || product?.phase || 'two-step';

function formatLabel(product) {
  return MODE_LABEL[modeOf(product)] || 'Evaluation';
}

function lossLabel(product) {
  const rules = product?.rules || {};
  return modeOf(product) === 'futures'
    ? money(rules.maxDdUsd)
    : `${Number(rules.maxDrawdownPct) || 0}% max`;
}

function targetLabel(product) {
  const rules = product?.rules || {};
  if (modeOf(product) === 'futures') return money(rules.targetUsd);
  if (modeOf(product) === 'two-step') return `${Number(rules.targetPct) || 0}% / ${Number(rules.target2Pct) || 0}%`;
  return `${Number(rules.targetPct) || 0}%`;
}

function ProgramCard({ product }) {
  const mode = modeOf(product);
  const rules = product?.rules || {};
  const funded = product?.funded || {};
  const fee = Number(product?.fee) || 0;
  const isFutures = mode === 'futures';
  return (
    <SpotlightCard className="pm-program-card h-full">
      <div className="pm-program-card__bar" />
      <div className="pm-program-card__body">
        <div className="flex items-start justify-between gap-3">
          <span className="pm-program-card__format">{formatLabel(product)}</span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#6f6a5d]">
            {product?.fallback ? 'Live terms in app' : 'Live catalog'}
          </span>
        </div>
        <h3 className="pm-program-card__title">{product.name}</h3>
        <p className="pm-program-card__copy">
          {product.description || (product?.fallback
            ? 'The catalog is loading. Read the exact balance, fee, target and drawdown rails in the app before buying.'
            : 'The exact rails, fee and account terms are shown in the app before purchase.')}
        </p>

        <dl className="pm-program-card__grid">
          <div>
            <dt>Balance</dt>
            <dd>{product?.fallback ? 'Shown in app' : money(product.accountSize)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{product?.fallback ? 'Shown in app' : targetLabel(product)}</dd>
          </div>
          <div>
            <dt>Max loss</dt>
            <dd>{product?.fallback ? 'Shown in app' : lossLabel(product)}</dd>
          </div>
          <div>
            <dt>Profit split</dt>
            <dd>{product?.fallback ? 'Up to 90%' : `Up to ${Number(funded.maxSplitPct) || 90}%`}</dd>
          </div>
          <div>
            <dt>Payout cycle</dt>
            <dd>{product?.fallback ? 'Shown in app' : `${Number(funded.payoutCycleDays) || 14} days`}</dd>
          </div>
          <div>
            <dt>{isFutures ? 'Contracts' : 'Daily rail'}</dt>
            <dd>
              {product?.fallback ? 'Shown in app' : isFutures
                ? (product.maxContracts ? `${product.maxContracts} max` : 'Contract limit')
                : `${Number(rules.dailyLossPct) || 0}% daily`}
            </dd>
          </div>
        </dl>

        <div className="pm-program-card__foot">
          <div>
            <div className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#6f6a5d]">Entry fee</div>
            <div className="pm-program-card__price">{fee > 0 ? `$${fee.toLocaleString('en-US')}` : 'Shown in app'}</div>
          </div>
          <Link to="/app/challenges" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[#d4af37]/25 px-3 text-[11px] font-bold text-[#e8c95a] transition hover:border-[#d4af37]/55 hover:bg-[#d4af37]/10">
            Open in app <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </SpotlightCard>
  );
}

function ProgramExplorer({ products, loading }) {
  const [filter, setFilter] = useState('all');
  const cards = products.length ? products : FALLBACK;
  const filtered = cards.filter((product) => filter === 'all' || modeOf(product) === filter);
  const counts = MODES.reduce((acc, [key]) => {
    acc[key] = key === 'all' ? cards.length : cards.filter((product) => modeOf(product) === key).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="pm-filter" role="tablist" aria-label="Filter funded programs">
          {MODES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              data-active={filter === key}
              className="pm-filter__btn"
              onClick={() => setFilter(key)}
            >
              {key === 'all' ? <Filter className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {label}
              <span className="pm-filter__count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">
          {loading ? 'Loading live catalog…' : products.length ? `${products.length} live products` : 'Catalog unavailable · showing formats'}
        </div>
      </div>

      <motion.div layout className="pm-program-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((product) => (
            <motion.div
              key={product.key || product.name}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProgramCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!filtered.length && (
        <div className="rounded-xl border border-dashed border-[#d4af37]/25 p-6 text-center text-sm text-[#8a8577]">
          No live products in this format right now. The in-app catalog is the source of truth.
        </div>
      )}
    </div>
  );
}

function ModeSummary({ products }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {['two-step', 'one-step', 'futures'].map((mode) => {
        const rows = products.filter((product) => modeOf(product) === mode);
        const sizes = rows.map((product) => Number(product.accountSize)).filter(Boolean);
        const splits = rows.map((product) => Number(product?.funded?.maxSplitPct)).filter(Boolean);
        return (
          <Card key={mode} className="rounded-xl p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="pm-program-card__format">{MODE_LABEL[mode]}</span>
              <span className="font-mono text-[9px] text-[#6f6a5d]">{rows.length ? `${rows.length} live` : 'Format'}</span>
            </div>
            <h3 className="mt-3 text-base font-bold text-[#f0ecdd]">
              {mode === 'futures' ? 'Dollar targets. Contract limits.' : mode === 'one-step' ? 'Shorter path. Tighter rails.' : 'Two stages. One standard.'}
            </h3>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5"><dt className="text-[#8a8577]">Sizes</dt><dd className="font-semibold text-[#e2ddcf]">{sizes.length ? `${money(Math.min(...sizes))} – ${money(Math.max(...sizes))}` : 'Shown in app'}</dd></div>
              <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5"><dt className="text-[#8a8577]">Max split</dt><dd className="font-semibold text-[#e2ddcf]">{splits.length ? `Up to ${Math.max(...splits)}%` : 'Up to 90%'}</dd></div>
              <div className="flex justify-between gap-3 border-t border-white/[0.06] pt-1.5"><dt className="text-[#8a8577]">Live seats</dt><dd className="font-semibold text-[#e2ddcf]">One per balance</dd></div>
            </dl>
            <Link to="/app/challenges" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">Read live terms <ArrowRight className="h-3 w-3" /></Link>
          </Card>
        );
      })}
    </div>
  );
}

export default function ProgramsPublicPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`${API_SERVER_URL}/challenges/products`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((payload) => {
        if (!active) return;
        setProducts(Array.isArray(payload?.products) ? payload.products.filter((product) => product?.enabled !== false) : []);
      })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, []);

  const maxSize = products.length
    ? Math.max(...products.map((product) => Number(product.accountSize) || 0))
    : 0;
  const maxSizeLabel = maxSize > 0 ? `$${Math.round(maxSize / 1000)}K` : null;
  const maxSplit = products.length
    ? Math.max(...products.map((product) => Number(product?.funded?.maxSplitPct) || 0))
    : 90;
  const formats = useMemo(() => new Set(products.map(modeOf)).size || 3, [products]);

  return (
    <PublicSiteShell className="pm-page pm-page--programs">
      <PageBackdrop variant="programs" />
      <div className="relative z-[1]">
        <header className="pm-hero">
          <div className="pm-hero__inner">
            <div>
              <Reveal>
                <LaunchPill />
              </Reveal>
              <Reveal delay={0.05}>
                <div className="pm-kicker mt-6">Funded programs · Rules before payment</div>
                <h1 className="pm-hero__title mt-4">
                  Pick the desk.<br />
                  <span className="tb-gold-text">Pass the rails.</span>
                </h1>
                <p className="pm-hero__sub mt-5">
                  Two-step, one-step and dollar-ruled futures evaluations{products.length ? ` up to ${maxSizeLabel}` : ''}.
                  One live seat per balance. Every target, drawdown rail and payout term
                  is visible before you pay — and the in-app catalog is the source of truth.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="pm-hero__actions">
                  <GoldButton to="/app/challenges" className="justify-center px-6 py-3.5">
                    See live programs <ArrowRight className="h-4 w-4" />
                  </GoldButton>
                  <GhostButton href="#rails" className="justify-center border px-6 py-3.5 text-[#e9e7df]">
                    Read the rails
                  </GhostButton>
                </div>
                <div className="pm-hero__meta">
                  {['One live seat per balance', 'Terms shown before purchase', 'TBC payouts to your wallet', 'No guaranteed funding'].map((item) => (
                    <span key={item}><Check className="h-3.5 w-3.5 text-[#d4af37]" />{item}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} className="pm-hero__visual">
              <Parallax distance={16}>
                <div className="pm-arena">
                  <div className="pm-arena__head">
                    <span className="pm-arena__tag">Seat map · live catalog</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff9b54]/25 bg-[#ff9b54]/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#ffb27d]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff9b54]" /> Open
                    </span>
                  </div>
                  <div className="pm-arena__ring">
                    <div className="text-center">
                      <strong>{products.length ? <CountUp value={maxSize / 1000} prefix="$" suffix="K" /> : 'Live'}</strong>
                      <span>maximum evaluation</span>
                    </div>
                  </div>
                  <div className="pm-arena__rows">
                    <div className="pm-arena__row"><span>Formats</span><b>{formats} program lines</b></div>
                    <div className="pm-arena__row"><span>Profit split</span><b>Up to {maxSplit}%</b></div>
                    <div className="pm-arena__row"><span>Live seat rule</span><b>One per balance</b></div>
                    <div className="pm-arena__row"><span>Payouts</span><b>TBC credit wallet</b></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[9px] leading-relaxed text-[#8a8577]">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#ff9b54]" />
                    A pass is not guaranteed. Evaluation fees, rails and payout terms apply.
                  </div>
                </div>
              </Parallax>
            </Reveal>
          </div>

          <div className="relative mx-auto mt-9 w-full max-w-[84rem] px-0 sm:mt-12">
            <Marquee
              items={['Two-step', 'One-step', 'Dollar-ruled futures', 'One live seat per balance', 'Rules before payment', 'TBC payouts']}
              speed={28}
            />
          </div>

          <div className="relative mx-auto mt-7 w-full max-w-[84rem]">
            <div className="pm-stats">
              {[
                [products.length ? <CountUp key="size" value={maxSize / 1000} prefix="$" suffix="K" /> : 'Live', 'Maximum evaluation', products.length ? 'Live catalog maximum' : 'Shown in the app'],
                [<CountUp key="formats" value={formats} />, 'Program formats', 'Two-step · one-step · futures'],
                ['1', 'Live seat per size', 'No duplicate balance'],
                [<CountUp key="split" value={maxSplit} suffix="%" />, 'Maximum split', 'Terms apply'],
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

        <PublicSection id="programs" className="pt-14">
          <Reveal>
            <SectionRail index="01" label="The floor" />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">Choose the format that matches the way you trade.</h2>
                <p className="tb-sub mt-2">Every card below comes from the live product catalog when available. If the catalog is unavailable, the page shows the format only — never an invented price or payout.</p>
              </div>
              <Link to="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">Compare platform plans <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>
          <div className="mt-6">
            <ProgramExplorer products={products} loading={loading} />
          </div>
        </PublicSection>

        <section id="rails" className="scroll-mt-28 border-y border-[#d4af37]/10">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
            <div className="pm-sticky">
              <div className="pm-sticky__aside">
                <Reveal>
                  <SectionRail index="02" label="The rails" />
                  <h2 className="mt-3 max-w-md text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[2.7rem]">
                    The rules are the product.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8a8577]">
                    A funded evaluation should be readable before it is buyable. These are the four things that matter — no hidden daily reset, no invented payout screenshot.
                  </p>
                  <div className="mt-5">
                    <PublicNotice>
                      <span className="font-semibold text-[#e9e7df]">One live seat per balance.</span>{' '}
                      You can hold different balances at once, but never two live attempts of the same size. Rebuy opens if an attempt breaches or pays.
                    </PublicNotice>
                  </div>
                </Reveal>
              </div>

              <div>
                {[
                  ['01', 'Pick the balance and the format', 'Two-step, one-step or dollar-ruled futures. The in-app product page shows the exact account size and fee before the wallet debit.'],
                  ['02', 'Read every rail before payment', 'Profit target, maximum loss, daily loss, minimum days, consistency gate, contract limits and payout cycle. If a rule matters, it belongs on the page before the buy button.'],
                  ['03', 'Evaluate on live rules', 'Trades are reviewed against the stated rules. A consistency gate is not a breach; exceeding a loss rail ends that attempt.'],
                  ['04', 'Funded desk, visible payout route', 'Passing opens the funded stage subject to desk confirmation. Payouts settle through the rails shown in the app; nothing here promises a pass or a return.'],
                ].map(([num, title, body]) => (
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
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {[
                    [Target, 'Targets in writing', 'The profit target and verification target are shown before purchase.'],
                    [Scale, 'Loss rails in writing', 'Daily and maximum loss rules are part of the product, not a surprise.'],
                    [BadgeDollarSign, 'Split in writing', 'The maximum split and payout cycle come from the catalog, not a marketing card.'],
                    [Wallet, 'Settlement in TBC', 'Payouts land in the credit wallet at the published rate.'],
                  ].map(([Icon, title, body]) => (
                    <div key={title} className="flex gap-2.5 rounded-xl border border-[#d4af37]/12 bg-[#d4af37]/[0.035] p-3.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff9b54]" />
                      <div>
                        <div className="text-xs font-bold text-[#f0ecdd]">{title}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-[#8a8577]">{body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicSection>
          <Reveal>
            <SectionRail index="03" label="At a glance" />
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="tb-h2 text-[1.8rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.5rem]">Three formats. One standard of disclosure.</h2>
                <p className="tb-sub mt-2">A compact comparison built from the same live catalog. If a number is not published, it says so.</p>
              </div>
              <Link to="/app/challenges" className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">Open the live catalog <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>
          <div className="mt-6"><ModeSummary products={products} /></div>
        </PublicSection>

        <section className="border-y border-[#d4af37]/10 bg-[#070708]/35">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-12 sm:px-8 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[1fr_.9fr] lg:items-center">
              <Reveal>
                <SectionRail index="04" label="The desk standard" />
                <h2 className="mt-3 max-w-2xl text-balance text-[1.8rem] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-[2.5rem]">
                  Capital is earned. <span className="tb-gold-text">The record is the proof.</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
                  The evaluation tests execution, not storytelling. The same journal, risk tools and review that run inside TradingBible are the record behind every attempt.
                </p>
              </Reveal>
              <Stagger className="grid gap-2 sm:grid-cols-2">
                {[
                  [Trophy, 'Scaling ceiling', 'Some catalog descriptions cite scaling to $400K. The live product page carries the current balance and terms.'],
                  [Activity, 'Live rules', 'Targets and rails tracked against the attempt.'],
                  [Lock, 'No shortcuts', 'No signal service, no guaranteed pass, no synthetic P&L.'],
                  [CircleDollarSign, 'TBC settlement', 'Payouts settle in the platform credit wallet.'],
                ].map(([Icon, title, body]) => (
                  <StaggerItem key={title}>
                    <Card className="h-full rounded-xl p-4">
                      <Icon className="h-4 w-4 text-[#ff9b54]" />
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
          eyebrow="Next step"
          title={<>Read the live terms, <span className="tb-gold-text">then choose a desk.</span></>}
          body="The catalog is the source of truth for price, balance, targets and payout rules. No evaluation is an investment product, and no pass is promised."
          primary="See live programs"
          primaryTo="/app/challenges"
          secondary="Compare platform plans"
          secondaryTo="/pricing"
        />
      </div>
    </PublicSiteShell>
  );
}
