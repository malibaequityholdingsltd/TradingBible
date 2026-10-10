import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Bot, Plug, Trophy, Landmark, BarChart3, Bell,
  GraduationCap, Calculator, ShieldCheck, ArrowRight, Check, Compass, CircleDollarSign,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PageHero, Card, GoldButton, GhostButton } from '@/components/ui-kit';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAccounts } from '@/hooks/useAccounts';
import { useWallet } from '@/hooks/useWallet';

const STORE_KEY = 'tb:guide-done-v1';

// Full-portal Pro Guide: chapter checklists with deep links. Steps tagged
// `auto` complete themselves from live account state; the rest are manual
// check-offs persisted in localStorage.
const CHAPTERS = [
  {
    id: 'trade',
    icon: LayoutDashboard,
    title: 'Trade like a desk',
    sub: 'Connect capital, log executions, build the record.',
    steps: [
      { id: 'trade.plan', title: 'Pick your plan', body: 'Pro unlocks the terminal, Elite adds the SI coach, Professional adds API + white-label.', to: '/pricing', cta: 'Compare plans' },
      { id: 'trade.broker', title: 'Connect a live broker', body: 'Sync executions automatically — no manual entry, no missing fills.', to: '/app/brokers', cta: 'Connect broker', auto: 'broker' },
      { id: 'trade.trade', title: 'Log your first trades', body: 'Three logged trades unlocks your P&L curve, win rate and trader score.', to: '/app/journal', cta: 'Open journal', auto: 'trades' },
      { id: 'trade.terminal', title: 'Set up the terminal', body: 'Watchlists, quotes and one-tap tickets arranged your way.', to: '/app/terminal-pro', cta: 'Open terminal' },
    ],
  },
  {
    id: 'analyze',
    icon: BarChart3,
    title: 'Analyze the record',
    sub: 'Turn fills into edge: stats, alerts and machine review.',
    steps: [
      { id: 'analyze.dashboard', title: 'Read your dashboard', body: 'Equity curve, profit factor, drawdown — the five numbers that matter.', to: '/app', cta: 'Open dashboard' },
      { id: 'analyze.alerts', title: 'Set a price alert', body: 'Get pinged instead of screen-watching. Start with one level.', to: '/app/alerts', cta: 'Create alert' },
      { id: 'analyze.coach', title: 'Meet the SI coach', body: 'It reads your journal and names the pattern costing you money. Elite and up.', to: '/app/coach', cta: 'Ask the coach' },
      { id: 'analyze.tools', title: 'Size with Risk Tools', body: 'Position-size calculator, R-multiples and drawdown guardrails.', to: '/app/tools', cta: 'Open tools' },
    ],
  },
  {
    id: 'markets',
    icon: Bell,
    title: 'Work the markets',
    sub: 'Charts, signals and the calendar — your daily loop.',
    steps: [
      { id: 'markets.tv', title: 'Tune into TradingBible TV', body: 'Live desks, 24/7. Minimize it and it keeps playing while you work.', to: '/tv', cta: 'Open TV' },
      { id: 'markets.signals', title: 'Follow a signal', body: 'Entry, stop and targets with live status — paper-trade it first.', to: '/app/signals', cta: 'View signals' },
      { id: 'markets.calendar', title: 'Check the calendar', body: 'CPI, NFP, FOMC — never hold size through red-folders blind again.', to: '/app/economic-calendar', cta: 'Open calendar' },
      { id: 'markets.charts', title: 'Work the Terminal Pro desk', body: 'Multi-chart layouts, indicators, drawings and timeframes that persist across sessions.', to: '/app/terminal-pro', cta: 'Open Terminal Pro' },
    ],
  },
  {
    id: 'learn',
    icon: GraduationCap,
    title: 'Learn the craft',
    sub: 'Structured paths, live webinars and a verifiable certificate.',
    steps: [
      { id: 'learn.path', title: 'Enroll in a path', body: 'Forex or crypto, beginner to funded — the SI writes lessons around you.', to: '/app/academy', cta: 'Browse Academy' },
      { id: 'learn.lesson', title: 'Finish lesson one + quiz', body: 'Ten minutes. Quizzes lock in the concept; the tutor fills gaps.', to: '/app/academy', cta: 'Start learning' },
      { id: 'learn.webinar', title: 'RSVP to a webinar', body: 'Weekly live sessions with Q&A across every track.', to: '/app/academy', cta: 'See schedule' },
      { id: 'learn.community', title: 'Introduce yourself', body: 'Post your first win — or your best expensive lesson.', to: '/app/community', cta: 'Join community' },
    ],
  },
  {
    id: 'money',
    icon: Landmark,
    title: 'Money in, money out',
    sub: 'Fund once, pay for plans with balance, withdraw to your bank.',
    steps: [
      { id: 'money.fund', title: 'Fund your wallet', body: 'Top up with Stripe. Balance pays for plans and academy.', to: '/app/wallet', cta: 'Fund wallet', auto: 'funded' },
      { id: 'money.kyc', title: 'Verify your identity', body: 'One-time document check — required before the first payout.', to: '/app/wallet', cta: 'Verify identity' },
      { id: 'money.bank', title: 'Connect your bank', body: 'Stripe Connect onboarding. Payouts land in 2–5 business days.', to: '/app/wallet', cta: 'Connect bank' },
      { id: 'money.affiliate', title: 'Grab your referral link', body: 'Earn on every trader you bring. Payouts to the same wallet.', to: '/app/affiliate', cta: 'Get link' },
    ],
  },
  {
    id: 'secure',
    icon: ShieldCheck,
    title: 'Lock it down',
    sub: 'Security and records that survive audits and tax season.',
    steps: [
      { id: 'secure.profile', title: 'Complete your profile', body: 'Username, market, experience — personalizes coaching and stats.', to: '/app/profile', cta: 'Edit profile' },
      { id: 'secure.2fa', title: 'Enable 2FA + passkeys', body: 'TOTP and WebAuthn under Security. Five minutes, permanent peace.', to: '/app/security', cta: 'Secure account' },
      { id: 'secure.reports', title: 'Export your first report', body: 'Tax-ready P&L exports. Elite and up.', to: '/app/reports', cta: 'Open reports' },
      { id: 'secure.prop', title: 'Enter a Funded evaluation', body: 'Pass on real journaled fills and trade firm capital.', to: '/app/funded', cta: 'Get funded' },
    ],
  },
];

function loadDone() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch { return new Set(); }
}

export default function ProGuidePage() {
  const { trades } = useTrades();
  const { live } = useAccounts();
  const { ledger } = useWallet();
  const [manual, setManual] = useState(loadDone);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...manual])); } catch { /* ignore */ }
  }, [manual]);

  const stats = useMemo(() => computeStats(trades || []) || { totalTrades: 0 }, [trades]);
  const autoDone = useMemo(() => ({
    broker: (live || []).length > 0,
    trades: (stats.totalTrades || 0) > 0,
    funded: (ledger?.balances?.USD || 0) > 0,
  }), [live, stats, ledger]);

  const isDone = (step) => (step.auto && autoDone[step.auto]) || manual.has(step.id);

  const toggle = (id) => setManual((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const all = CHAPTERS.flatMap((c) => c.steps);
  const doneCount = all.filter(isDone).length;
  const pct = Math.round((doneCount / all.length) * 100);

  return (
    <AppLayout title="Pro Guide">
      <div className="tb-page">
        <PageHero
          kickerIcon={Compass}
          kicker="Pro Guide"
          title="From signup to"
          accent="funded-desk ready"
          subtitle="Twenty-four missions across the full portal. Auto-detected steps check themselves; the rest take one tap."
        >
          <div className="mt-4 flex items-center gap-4">
            <div className="h-2.5 w-48 overflow-hidden rounded-full bg-white/10 sm:w-64">
              <div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-sm font-bold text-[#d4af37]">{doneCount}/{all.length} · {pct}%</span>
          </div>
        </PageHero>

        {pct === 100 && (
          <Card className="flex flex-wrap items-center gap-3 border-[#d4af37]/40 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]"><CircleDollarSign className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[#f0ecdd]">Portal mastered. Now get funded.</div>
              <div className="text-xs text-[#8a8577]">Compare prop firms and log your evaluation in the journal.</div>
            </div>
            <GoldButton to="/app/funded" className="!px-4 !py-2 !text-xs">See programs <ArrowRight className="h-4 w-4" /></GoldButton>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {CHAPTERS.map((ch) => {
            const chDone = ch.steps.filter(isDone).length;
            const Icon = ch.icon;
            return (
              <Card key={ch.id} className="p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#f0ecdd]">{ch.title}</h3>
                    <p className="truncate text-xs text-[#8a8577]">{ch.sub}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-[#d4af37]">{chDone}/{ch.steps.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {ch.steps.map((s) => {
                    const done = isDone(s);
                    const auto = s.auto && autoDone[s.auto];
                    return (
                      <div key={s.id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${done ? 'border-emerald-400/25 bg-emerald-400/[0.04]' : 'border-white/[0.07] bg-black/20'}`}>
                        <button
                          onClick={() => toggle(s.id)}
                          aria-label={done && !auto ? 'Mark as not done' : 'Mark as done'}
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${done ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400' : 'border-[#d4af37]/30 text-transparent hover:border-[#d4af37]'}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${done ? 'text-[#8a8577] line-through' : 'text-[#f0ecdd]'}`}>{s.title}</span>
                            {auto && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">auto</span>}
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-[#8a8577]">{s.body}</p>
                          {!done && (
                            <Link to={s.to} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:underline">
                              {s.cta} <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GhostButton to="/app">Back to dashboard</GhostButton>
          <ErrorBoundary fallback={null}>
            <span className="text-xs text-[#6a665a]">Prefer the quick tour? It lives under your profile menu.</span>
          </ErrorBoundary>
        </div>
      </div>
    </AppLayout>
  );
}
