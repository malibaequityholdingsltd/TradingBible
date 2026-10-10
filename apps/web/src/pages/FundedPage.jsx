// Funded — prospectus design.
// The rulebook as an editorial spread: split hero with featured ticket,
// journey timeline, line banners, pricing ledger table, objectives ledger,
// payout band, allow/forbid ledger, FAQ index, gold CTA band.
// All data, helpers and copy logic unchanged — presentation only.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, CheckCircle2, ArrowRight, ShieldCheck, Zap, XCircle,
  BadgeDollarSign, TrendingUp, CalendarClock, Scale, Landmark, ChevronDown, FlaskConical, Gauge,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GoldButton, GhostButton, EmptyState, Note } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { TbcMoney } from '@/components/TbcSign';

// Fallback catalog (original TradingBible Funded pricing) shown only when the
// admin has not published programs yet. Live products from the API win.
const FALLBACK = [
  { key: 'tb-100k', name: 'Funded $100K', fee: 479, accountSize: 100000, phase: 'two-step', mode: 'two-step', leverage: '1:100', rules: { mode: 'two-step', targetPct: 10, target2Pct: 5, maxDrawdownPct: 10, maxLossMode: 'static', dailyLossPct: 5, minDays: 4 }, funded: { profitSplitPct: 80, maxSplitPct: 90, payoutCycleDays: 14 } },
  { key: 'tb1-100k', name: 'Funded One-Step $100K', fee: 549, accountSize: 100000, phase: 'one-step', mode: 'one-step', leverage: '1:100', rules: { mode: 'one-step', targetPct: 10, maxDrawdownPct: 10, maxLossMode: 'eod-trailing', dailyLossPct: 3, minDays: 4, bestDayMaxPct: 50 }, funded: { profitSplitPct: 90, maxSplitPct: 90, payoutCycleDays: 14 } },
  { key: 'tbf-g100', name: 'Futures Growth $100K', fee: 179, accountSize: 100000, phase: 'futures', mode: 'futures', leverage: 'Futures margin', rules: { mode: 'futures', targetUsd: 6000, maxDdUsd: 3500, maxLossMode: 'eod-trailing', dailyLossUsd: 0, minDays: 4, consistencyMaxPct: 40, consistencyBase: 'total' }, funded: { profitSplitPct: 80, maxSplitPct: 90, payoutCycleDays: 7 }, maxContracts: 10 },
];

const LINES = [
  { id: 'two-step', label: 'CFD · 2-Step', icon: FlaskConical },
  { id: 'one-step', label: 'CFD · 1-Step', icon: Gauge },
  { id: 'futures', label: 'Futures', icon: Landmark },
];

const LINE_INTRO = {
  'two-step': 'The classic path: prove consistency across two phases, then trade firm capital with a scaling split.',
  'one-step': 'One phase, tighter rails, fixed 90% split. For traders who want the funded seat with no verification round.',
  'futures': 'Dollar-based rules on regulated futures. Growth for softer rails, Pro for full withdrawals and higher caps.',
};

const PHASES = [
  { icon: FlaskConical, step: 'Evaluation', title: 'Prove the edge', body: 'Hit the profit target without breaking the loss rails. Minimum 4 trading days — no rush, no expiry on your first window.' },
  { icon: ShieldCheck, step: 'Verification / funded', title: 'Confirm, then earn', body: 'Two-step confirms discipline at half the target; one-step and futures move straight toward the funded seat. Funded accounts carry no target — just the rails and your share of every split.' },
  { icon: Landmark, step: 'Funded · Real capital', title: 'Trade firm money', body: 'Up to $200K CFD or $150K futures per seat. Keep up to 90%, scale further, withdraw on schedule.' },
];

const RULES_OK = [
  'Trade your edge: scalping, day trading and swing trading are all welcome — news trading is Swing-only (not allowed on Standard)',
  'EAs and trade copiers are welcome in evaluation — funded accounts trade manual only',
  'Hold overnight and over weekends on Swing — Standard stays intraday, flat by close',
  'Every instrument: forex, metals, indices, crypto and stocks',
  'Trade on MT5, cTrader or the TradingBible Terminal',
];
const RULES_NO = [
  'No martingale averaging or grid stuffing to dodge the loss rails',
  'No latency arbitrage, tick-scalping exploits or price-feed manipulation',
  'No account sharing — one trader per evaluation',
  'No hedging across evaluations to lock in a pass',
  'No exceeding futures max contracts (5 / 10 / 15 by account size)',
  'No bots, EAs, algos or copiers on funded accounts — manual trading only',
];

const FAQ = [
  { q: 'How does the 2-step evaluation work?', a: 'Phase 1: reach a 10% profit target while staying inside a 5% max daily loss and a 10% static max loss, across at least 4 trading days. Phase 2 (verification): same rails, 5% target. Pass both and the funded account is yours.' },
  { q: 'How does the 1-step evaluation work?', a: 'A single 10% target with tighter rails: 3% max daily loss and a 10% maximum that trails end-of-day and locks at your starting balance once you grow. The Best-Day gate applies — your biggest day must stay at or under 50% of your winning days. It never fails you; you simply keep trading until consistency shows.' },
  { q: 'How do futures evaluations work?', a: 'Dollar-based rules instead of percentages. Growth ($50K/$100K/$150K): $3K/$6K/$9K targets, $2K/$3.5K/$5K end-of-day trailing maximums that lock at start, no daily limit, 40% consistency rule, 5/10/15 max contracts. Pro: same targets with $3K/$4.5K/$6K maximums, hard $1K/$1.5K/$2K daily limits and a 50% consistency rule. Futures trading days run 6pm–4:10pm ET.' },
  { q: 'What is the Best-Day / consistency rule?', a: 'A consistency gate, not a breach. On 1-step CFD your best day must be ≤50% of your winning-days profit; on futures ≤40% (Growth) or ≤50% (Pro) of total profit. Exceeding it never ends the attempt — you keep trading until the numbers show steadiness.' },
  { q: 'What happens if I break a loss rail?', a: 'Breaching the max daily loss or max loss ends that attempt — the dashboard shows exactly which rail broke and when. Consistency gates never end attempts. You can start fresh any time.' },
  { q: 'Do I get the entry fee back?', a: 'Yes on CFD lines: your first funded payout includes a full refund of the entry fee. Passing costs you nothing in the end.' },
  { q: 'How and when do I get paid?', a: 'CFD: withdraw every 14 days to your connected bank — 80% standard split, rising to 90% through scaling (1-step pays a fixed 90%). Hit Request payout on a passed evaluation and the desk approves straight to your bank; your first payout refunds the entry fee in TBC. Futures Sim-Funded: up to 90% with its own payout rhythm.' },
  { q: 'Can I use bots or EAs?', a: 'In evaluation, expert advisors and trade copiers are allowed on your own accounts. Once funded, all trading is manual — bots, EAs, algos and copiers are banned, and bot trading on a funded account ends it.' },
  { q: 'Can I buy two of the same account size?', a: 'No — one live seat per balance. You can hold 200K, 100K, 50K and 25K at the same time, but never two live 200Ks. A same-size rebuy opens only after that contract breaches or pays out — the checkout blocks doubles automatically.' },
  { q: 'Can I trade news and hold weekends?', a: 'Depends on your account type. Swing: yes to everything — news, overnight and weekend holding with no blackouts. Standard: news trading NOT ALLOWED and NO weekend holding — intraday only, flat by close, no overnight positions. Futures follows CME hours and the contract calendar.' },
  { q: 'Which platforms can I use?', a: 'MT5 and cTrader, plus the TradingBible Terminal for journaling, analytics and live evaluation tracking. CFD leverage up to 1:100; futures trade on exchange margin.' },
];

function money(n) {
  return `$${Number(n || 0).toLocaleString()}`;
}

function feeFor(p, acctType) {
  if ((p.mode || p.phase) === 'futures') return Number(p.fee) || 0;
  const fees = p.fees || {};
  if (acctType === 'swing') return Number(fees.swing ?? p.fee) || 0;
  return Number(fees.standard ?? p.fee) || 0;
}

// The big $200,000 figure stays — the "$200K" inside the product name
// is trimmed so the size never prints twice.
function shortName(p) {
  return String(p?.name || '').replace(/\s*\$[\d,]+K?\b/g, '').trim() || String(p?.name || '');
}

function targetLabel(p) {
  const r = p.rules || {};
  if (r.targetUsd > 0) return `$${Number(r.targetUsd).toLocaleString()}`;
  if ((p.mode || p.phase) === 'two-step') return `${r.targetPct ?? 10}% → ${r.target2Pct ?? 5}%`;
  return `${r.targetPct ?? 10}%`;
}

function riskLabel(p) {
  const r = p.rules || {};
  if (r.maxDdUsd > 0) return `$${Number(r.maxDdUsd).toLocaleString()} EOD`;
  return `${r.maxDrawdownPct ?? 10}%${r.maxLossMode === 'eod-trailing' ? ' trail' : ''}`;
}

function dailyLabel(p) {
  const r = p.rules || {};
  if (r.dailyLossUsd > 0) return `$${Number(r.dailyLossUsd).toLocaleString()}`;
  if ((p.mode || p.phase) === 'futures' && !(r.dailyLossPct > 0)) return 'None';
  return `${r.dailyLossPct ?? 5}%`;
}

function typeInfo(p, acctType) {
  const types = Array.isArray(p.accountTypes) ? p.accountTypes : [];
  const found = types.find((t) => t.id === acctType) || types[0];
  if (found) return found;
  return acctType === 'swing'
    ? { id: 'swing', label: 'Swing', leverage: '1:30', holding: 'Overnight + weekend holding allowed', news: 'No news restrictions' }
    : { id: 'standard', label: 'Standard', leverage: '1:100', holding: 'Intraday only — NO overnight / NO weekend holding (flat by close)', news: 'News trading NOT ALLOWED' };
}

export default function FundedPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState('two-step');
  const [faqOpen, setFaqOpen] = useState(null);
  const [acctType, setAcctType] = useState('standard'); // standard | swing (CFD lines)
  const [tbcPerUsd, setTbcPerUsd] = useState(1 / 3.25); // 1 TBC = 1 KWD
  const tbcFor = (usd) => Math.round(Number(usd || 0) * tbcPerUsd * 100) / 100;

  const load = useCallback(async () => {
    try {
      const data = await fetch(`${API_SERVER_URL}/challenges/products`).then((r) => r.json()).catch(() => ({}));
      setProducts(data.products || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`${API_SERVER_URL}/tbc/econ`).then((r) => r.json()).then((e) => {
      const rt = Number(e?.tbcPerUsd);
      if (rt > 0.15 && rt < 0.6) setTbcPerUsd(rt); // 1 TBC = 1 KWD — reject 1:1
      else if (Number(e?.usdPerKwd) >= 2 && Number(e?.usdPerKwd) <= 5) setTbcPerUsd(1 / Number(e.usdPerKwd));
    }).catch(() => {});
  }, []);

  const catalog = products.length ? products : FALLBACK;
  const modeOf = (p) => p.mode || p.phase || 'two-step';
  const lineProducts = useMemo(() => catalog.filter((p) => modeOf(p) === line), [catalog, line]);
  const hero = useMemo(() => lineProducts[Math.min(3, lineProducts.length - 1)] || lineProducts[0] || FALLBACK[0], [lineProducts]);
  const heroSplit = hero.funded?.profitSplitPct ?? 80;
  const hr = hero.rules || {};
  const heroType = line === 'futures' ? (hero.accountTypes?.[0] || {}) : typeInfo(hero, acctType);
  const fromStd = useMemo(() => lineProducts.length ? Math.min(...lineProducts.map((p) => feeFor(p, 'standard'))) : 0, [lineProducts]);
  const fromSwing = useMemo(() => lineProducts.length ? Math.min(...lineProducts.map((p) => feeFor(p, 'swing'))) : 0, [lineProducts]);

  return (
    <AppLayout title={t('nav.propfirms')}>
      <div className="tb-page !max-w-[1400px]">
        {/* ── Split hero: manifesto left, featured ticket right ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95 p-6 sm:p-9">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_100%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
            <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
              <Trophy className="h-4 w-4" /> TradingBible Funded
            </p>
            <h1 className="relative mt-3 max-w-xl text-4xl font-extrabold leading-[1.05] text-[#f0ecdd] sm:text-5xl">
              Pass the test.<br /><span className="text-[#d4af37]">Trade firm capital.</span>
            </h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
              Three ways in: classic 2-step CFD, single-phase 1-step CFD at a fixed 90% split, or dollar-ruled futures (Growth & Pro). One rulebook per line, published below — no fine print anywhere else.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2.5">
              <GoldButton to="/app/challenges" className="!px-6 !py-3 !text-sm">Start an evaluation <ArrowRight className="h-4 w-4" /></GoldButton>
              <GhostButton to="/app/paper" className="!px-6 !py-3 !text-sm">Try it free on paper</GhostButton>
            </div>
            <div className="relative mt-6 flex divide-x divide-white/8 border-t border-white/8 pt-4">
              {[
                ['Max CFD capital', '$200K → $400K'],
                ['Max futures seat', '$150K × 3'],
                ['Best split', '90%'],
              ].map(([k, v]) => (
                <div key={k} className="flex-1 px-4 first:pl-0">
                  <div className="font-mono text-lg font-extrabold text-[#f0ecdd] sm:text-xl">{v}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5f5b50]">{k}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Featured ticket — solid ink on gold in both themes for readability */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#7a5c12] bg-gradient-to-b from-[#f4e6a8] to-[#c99a25] p-6 text-[#0a0a0f] shadow-[0_18px_50px_-16px_rgba(166,124,30,0.65)] sm:p-7">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#4a3a08]">Featured · {line === 'two-step' ? 'Two-step' : line === 'one-step' ? 'One-step' : 'Futures'}</p>
            <div className="mt-2 font-mono text-5xl font-extrabold tracking-tight text-[#0a0a0f]">{money(hero.accountSize)}</div>
            <div className="mt-1 truncate text-sm font-bold text-[#1d1a08]">{shortName(hero)}</div>
            <div className="mt-4 space-y-1.5 border-t-2 border-[#0a0a0f]/15 pt-4 font-mono text-[13px] font-bold text-[#0a0a0f]">
              <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Target</span><span>{targetLabel(hero)}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Max loss</span><span>{riskLabel(hero)}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Split</span><span>{heroSplit}%</span></div>
              <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Entry · TBC only</span><span>{tbcFor(line === 'futures' ? hero.fee : feeFor(hero, acctType)).toLocaleString()} TBC (${(line === 'futures' ? hero.fee : feeFor(hero, acctType)).toLocaleString()})</span></div>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[#4a3a08]">Convert, swap, buy or receive TBC first</p>
            <Link to="/app/challenges" className="funded-start-btn mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#0a0a0f] text-sm font-bold text-[#f4e6a8] transition hover:opacity-90">
              Start this evaluation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── Journey timeline ── */}
        <div className="mt-4 rounded-3xl border border-white/8 bg-black/20 p-6 sm:p-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PHASES.map((s, i) => (
              <div key={s.step} className="relative">
                {i < PHASES.length - 1 && <span aria-hidden className="absolute left-12 right-[-1.25rem] top-6 hidden h-px bg-gradient-to-r from-[#d4af37]/50 to-transparent sm:block" />}
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><s.icon className="h-5 w-5" /></span>
                  <span className="font-mono text-xs font-bold text-[#5f5b50]">0{i + 1}</span>
                </div>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#d4af37]">{s.step}</div>
                <h3 className="mt-0.5 font-semibold text-[#f0ecdd]">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#8a8577]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Line banners ── */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {LINES.filter((l) => products.length === 0 || (l.id === 'two-step' ? true : products.some((p) => modeOf(p) === l.id))).map((l) => {
            const active = line === l.id;
            return (
              <button key={l.id} onClick={() => setLine(l.id)}
                className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-5 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${active ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.09] shadow-[0_0_30px_-10px_rgba(212,175,55,0.5)]' : 'border-white/8 bg-black/20 hover:border-[#d4af37]/30'}`}>
                <l.icon className={`h-5 w-5 shrink-0 ${active ? 'text-[#d4af37]' : 'text-[#5f5b50]'}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${active ? 'text-[#f0ecdd]' : 'text-[#c9c4b4]'}`}>{l.label}</span>
                  <span className="block truncate text-xs text-[#8a8577]">{LINE_INTRO[l.id]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Account-type switch (CFD lines) ── */}
        {line !== 'futures' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-5 py-3.5">
            <div className="min-w-0">
              <span className="text-sm font-bold text-[#f0ecdd]">{acctType === 'swing' ? 'Swing' : 'Standard'}</span>
              <span className="ml-2 text-xs text-[#8a8577]">
                {acctType === 'swing'
                  ? 'Overnight + weekends, no news blackouts · 1:30'
                  : 'Full 1:100 · NO news · NO weekends — flat by close'}
              </span>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/25 text-xs font-bold">
              {[
                ['standard', 'Standard', fromStd],
                ['swing', 'Swing', fromSwing],
              ].map(([id, label, from]) => (
                <button key={id} onClick={() => setAcctType(id)} className={`whitespace-nowrap px-5 py-2.5 ${acctType === id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  {label} <span className="font-mono">· from {money(from)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Pricing ledger ── */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">The ledger — sizes & entry fees</h3>
          <span className="text-xs text-[#8a8577]">{line === 'futures' ? 'One-time fee per evaluation' : 'One-time fee · CFD fees refunded with your first payout'}</span>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-[#8a8577]">Loading programs…</p>
        ) : lineProducts.length === 0 ? (
          <EmptyState icon={Trophy} title="No programs on this line yet" sub="Switch lines or check back soon." />
        ) : (
          <Card className="!p-0 mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/15 text-left text-[11px] uppercase tracking-wider text-[#6a665a]">
                    <th className="px-5 py-3 font-medium">Program</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                    <th className="px-5 py-3 font-medium">Max · Daily</th>
                    <th className="px-5 py-3 font-medium">Split</th>
                    <th className="px-5 py-3 font-medium">Entry · TBC</th>
                    <th className="px-5 py-3 font-medium"><span className="sr-only">Start</span></th>
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-b [&_tr]:border-white/5 [&_tr:last-child]:border-0">
                  {lineProducts.map((p) => (
                    <tr key={p.key} className="transition hover:bg-[#d4af37]/[0.04]">
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-[#f0ecdd]">{shortName(p)}</div>
                        <div className="mt-0.5 font-mono text-xs text-[#d4af37]">{money(p.accountSize)} · {line === 'two-step' ? 'Two-step' : line === 'one-step' ? 'One-step · 90%' : (/pro/i.test(p.name) ? 'Pro' : 'Growth')} · {p.leverage || '1:100'}</div>
                        {line !== 'futures' && (p.fees?.standard !== p.fees?.swing) && (
                          <div className="mt-0.5 font-mono text-[11px] text-[#5f5b50]">
                            {acctType === 'swing' ? `Standard ${money(p.fees?.standard ?? p.fee)}` : `Swing ${money(p.fees?.swing ?? p.fee)}`}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-[#f0ecdd]">{targetLabel(p)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[#c9c4b4]">{riskLabel(p)} · {dailyLabel(p)}</td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-400">{p.funded?.profitSplitPct ?? 80}%</td>
                      <td className="px-5 py-4"><div className="font-mono text-lg font-extrabold text-[#d4af37]">{tbcFor(line === 'futures' ? p.fee : feeFor(p, acctType)).toLocaleString()} TBC</div><div className="font-mono text-[11px] text-[#8a8577]">${(line === 'futures' ? p.fee : feeFor(p, acctType)).toLocaleString()} list</div></td>
                      <td className="px-5 py-4 text-right">
                        <Link to="/app/challenges" className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-sm font-bold text-[#0a0a0f] transition hover:opacity-90">
                          Start <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Objectives ledger ── */}
        <Card className="!p-0 mt-4 overflow-hidden">
          <div className="border-b border-[#d4af37]/12 px-5 py-4 sm:px-7">
            <h3 className="font-semibold text-[#f0ecdd]">Trading objectives — {line === 'two-step' ? 'CFD 2-Step' : line === 'one-step' ? 'CFD 1-Step' : 'Futures (Growth & Pro)'}</h3>
            <p className="mt-0.5 text-xs text-[#8a8577]">{line === 'futures' ? 'Dollar-based rails. Growth has no daily limit; Pro enforces a hard daily. Trading day: 6pm–4:10pm ET.' : 'Identical rails on all sizes. Targets are measured on closed balance; loss rails watch equity intraday.'}</p>
          </div>
          <div className="overflow-x-auto">
            {line === 'two-step' && (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/10 text-left text-[11px] uppercase tracking-wider text-[#6a665a]">
                    <th className="px-5 py-3 font-medium sm:px-7">Objective</th>
                    <th className="px-5 py-3 font-medium">Phase 1 · Evaluation</th>
                    <th className="px-5 py-3 font-medium">Phase 2 · Verification</th>
                    <th className="px-5 py-3 font-medium">Funded account</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-white/5">
                  <tr><td className="text-[#8a8577]">Profit target</td><td className="font-mono font-bold text-[#f0ecdd]">{hr.targetPct ?? 10}%</td><td className="font-mono font-bold text-[#f0ecdd]">{hr.target2Pct ?? 5}%</td><td className="text-[#8a8577]">No target — just grow</td></tr>
                  <tr><td className="text-[#8a8577]">Maximum daily loss</td><td className="font-mono text-[#e9e7df]">{hr.dailyLossPct ?? 5}% of start, off day-start equity</td><td className="font-mono text-[#e9e7df]">{hr.dailyLossPct ?? 5}%</td><td className="font-mono text-[#e9e7df]">{hr.dailyLossPct ?? 5}%</td></tr>
                  <tr><td className="text-[#8a8577]">Maximum loss</td><td className="font-mono text-[#e9e7df]">{hr.maxDrawdownPct ?? 10}% static</td><td className="font-mono text-[#e9e7df]">{hr.maxDrawdownPct ?? 10}% static</td><td className="font-mono text-[#e9e7df]">{hr.maxDrawdownPct ?? 10}% static</td></tr>
                  <tr><td className="text-[#8a8577]">Minimum trading days</td><td className="font-mono text-[#e9e7df]">{hr.minDays ?? 4} days</td><td className="font-mono text-[#e9e7df]">{hr.minDays ?? 4} days</td><td className="text-[#8a8577]">—</td></tr>
                  <tr><td className="text-[#8a8577]">Account type</td><td className="font-mono text-[#e9e7df]" colSpan={3}>{heroType.label || 'Standard'} · leverage {heroType.leverage || '1:100'}</td></tr>
                  <tr><td className="text-[#8a8577]">Overnight + weekends</td><td className="text-[#e9e7df]" colSpan={3}>{heroType.holding || '—'}</td></tr>
                  <tr><td className="text-[#8a8577]">News trading</td><td className="text-[#e9e7df]" colSpan={3}>{heroType.news || '—'}</td></tr>
                  <tr><td className="text-[#8a8577]">EAs + copiers</td><td className="text-emerald-400" colSpan={3}>Allowed on your own accounts</td></tr>
                  <tr><td className="text-[#8a8577]">Profit split</td><td className="text-[#8a8577]">—</td><td className="text-[#8a8577]">—</td><td className="font-mono font-bold text-[#d4af37]">{heroSplit}% → 90%</td></tr>
                </tbody>
              </table>
            )}
            {line === 'one-step' && (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/10 text-left text-[11px] uppercase tracking-wider text-[#6a665a]">
                    <th className="px-5 py-3 font-medium sm:px-7">Objective</th>
                    <th className="px-5 py-3 font-medium">Evaluation (single phase)</th>
                    <th className="px-5 py-3 font-medium">Funded account</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-white/5">
                  <tr><td className="text-[#8a8577]">Profit target</td><td className="font-mono font-bold text-[#f0ecdd]">{hr.targetPct ?? 10}%</td><td className="text-[#8a8577]">No target — just grow</td></tr>
                  <tr><td className="text-[#8a8577]">Maximum daily loss</td><td className="font-mono text-[#e9e7df]">{hr.dailyLossPct ?? 3}% of start, off day-start equity</td><td className="font-mono text-[#e9e7df]">{hr.dailyLossPct ?? 3}%</td></tr>
                  <tr><td className="text-[#8a8577]">Maximum loss</td><td className="font-mono text-[#e9e7df]">{hr.maxDrawdownPct ?? 10}% EOD-trailing — locks at start once reached</td><td className="font-mono text-[#e9e7df]">{hr.maxDrawdownPct ?? 10}% EOD-trailing</td></tr>
                  <tr><td className="text-[#8a8577]">Best-Day gate</td><td className="font-mono text-[#e9e7df]">Best day ≤ {hr.bestDayMaxPct ?? 50}% of winning days <span className="text-[#8a8577]">(gate, never a breach)</span></td><td className="font-mono text-[#e9e7df]">Best day ≤ {hr.bestDayMaxPct ?? 50}% for payouts</td></tr>
                  <tr><td className="text-[#8a8577]">Minimum trading days</td><td className="font-mono text-[#e9e7df]">{hr.minDays ?? 4} days</td><td className="text-[#8a8577]">—</td></tr>
                  <tr><td className="text-[#8a8577]">Account type</td><td className="font-mono text-[#e9e7df]" colSpan={2}>{heroType.label || 'Standard'} · leverage {heroType.leverage || '1:100'}</td></tr>
                  <tr><td className="text-[#8a8577]">Overnight + weekends</td><td className="text-[#e9e7df]" colSpan={2}>{heroType.holding || '—'}</td></tr>
                  <tr><td className="text-[#8a8577]">News trading</td><td className="text-[#e9e7df]" colSpan={2}>{heroType.news || '—'}</td></tr>
                  <tr><td className="text-[#8a8577]">EAs + copiers</td><td className="text-emerald-400" colSpan={2}>Allowed on your own accounts</td></tr>
                  <tr><td className="text-[#8a8577]">Profit split</td><td className="text-[#8a8577]">—</td><td className="font-mono font-bold text-[#d4af37]">Fixed {heroSplit}%</td></tr>
                </tbody>
              </table>
            )}
            {line === 'futures' && (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[#d4af37]/10 text-left text-[11px] uppercase tracking-wider text-[#6a665a]">
                    <th className="px-5 py-3 font-medium sm:px-7">Objective</th>
                    <th className="px-5 py-3 font-medium">Growth Evaluation</th>
                    <th className="px-5 py-3 font-medium">Pro Evaluation</th>
                    <th className="px-5 py-3 font-medium">Sim-Funded</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-white/5">
                  <tr><td className="text-[#8a8577]">Profit target</td><td className="font-mono text-[#e9e7df]">$3K / $6K / $9K by size</td><td className="font-mono text-[#e9e7df]">$3K / $6K / $9K by size</td><td className="text-[#8a8577]">No target — just grow</td></tr>
                  <tr><td className="text-[#8a8577]">Max drawdown</td><td className="font-mono text-[#e9e7df]">$2K / $3.5K / $5K EOD-trailing, locks at start</td><td className="font-mono text-[#e9e7df]">$3K / $4.5K / $6K EOD-trailing, locks at start</td><td className="font-mono text-[#e9e7df]">Same, locks for life</td></tr>
                  <tr><td className="text-[#8a8577]">Daily loss limit</td><td className="text-emerald-400">None in evaluation</td><td className="font-mono text-[#e9e7df]">$1K / $1.5K / $2K hard daily</td><td className="text-[#8a8577]">Per plan</td></tr>
                  <tr><td className="text-[#8a8577]">Consistency rule</td><td className="font-mono text-[#e9e7df]">Best day ≤ 40% of total <span className="text-[#8a8577]">(gate, never a breach)</span></td><td className="font-mono text-[#e9e7df]">Best day ≤ 50% of total <span className="text-[#8a8577]">(gate)</span></td><td className="text-[#8a8577]">—</td></tr>
                  <tr><td className="text-[#8a8577]">Max contracts</td><td className="font-mono text-[#e9e7df]">5 / 10 / 15 by size</td><td className="font-mono text-[#e9e7df]">5 / 10 / 15 by size</td><td className="font-mono text-[#e9e7df]">5 / 10 / 15 by size</td></tr>
                  <tr><td className="text-[#8a8577]">Minimum trading days</td><td className="font-mono text-[#e9e7df]">4 days</td><td className="font-mono text-[#e9e7df]">4 days</td><td className="text-[#8a8577]">—</td></tr>
                  <tr><td className="text-[#8a8577]">Trading day</td><td className="font-mono text-[#e9e7df]" colSpan={3}>6:00pm ET → 4:10pm ET next day</td></tr>
                  <tr><td className="text-[#8a8577]">Profit split</td><td className="text-[#8a8577]">—</td><td className="text-[#8a8577]">—</td><td className="font-mono font-bold text-[#d4af37]">Up to 90% · up to 3 seats · $450K combined</td></tr>
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* ── Payout band ── */}
        <div className="mt-4 grid grid-cols-1 divide-y divide-white/5 rounded-3xl border border-white/8 bg-black/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: BadgeDollarSign, t: `Keep ${line === 'one-step' ? 'a fixed 90%' : `${heroSplit}–90%`}`, s: line === 'one-step' ? 'One-step pays a flat 90% from the first withdrawal — performance is the only variable.' : line === 'futures' ? 'Sim-Funded keeps up to 90% across up to 3 seats and $450K combined capital.' : `Start at ${heroSplit}% from day one. Consistent traders scale toward 90% — the firm only wins when you win.` },
            { icon: TrendingUp, t: line === 'futures' ? 'Scale to $450K' : 'Scale to $400K', s: line === 'futures' ? 'Add seats up to 3 Sim-Funded accounts. More steady profit, more capital — reviewed on record, not on promises.' : 'Every 4 months of disciplined growth adds 25% more capital, up to $400K. No extra fee, no re-evaluation — automatic review.' },
            { icon: CalendarClock, t: line === 'futures' ? 'Fast payouts' : 'Paid every 14 days', s: line === 'futures' ? 'Withdraw to your connected bank on the Sim-Funded rhythm, from the first eligible window.' : 'Withdraw to your connected bank on a 14-day cycle. Your first payout also refunds the full entry fee.' },
          ].map((b) => (
            <div key={b.t} className="flex gap-3.5 p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><b.icon className="h-5 w-5" /></span>
              <span>
                <span className="block font-semibold text-[#f0ecdd]">{b.t}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-[#8a8577]">{b.s}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ── Allow / forbid ledger ── */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/8">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="bg-emerald-400/[0.05] p-6">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Always allowed</h3>
              <ul className="mt-3 space-y-2.5">
                {RULES_OK.map((r, i) => (
                  <li key={r} className="flex items-start gap-3 text-sm text-[#c9c4b4]">
                    <span className="w-6 shrink-0 whitespace-nowrap font-mono text-xs font-extrabold tabular-nums text-emerald-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-400/[0.05] p-6">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-red-400"><XCircle className="h-4 w-4" /> Ends an attempt</h3>
              <ul className="mt-3 space-y-2.5">
                {RULES_NO.map((r, i) => (
                  <li key={r} className="flex items-start gap-3 text-sm text-[#c9c4b4]">
                    <span className="w-6 shrink-0 whitespace-nowrap font-mono text-xs font-extrabold tabular-nums text-red-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Note icon={Scale}>
          Evaluations run on your journaled fills inside TradingBible — targets, drawdowns, trading days and consistency gates are computed live from real trades, visible to you and to our risk desk. No manual reporting, no screenshots.
        </Note>

        {/* ── FAQ index ── */}
        <div className="mt-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Questions, answered <span className="ml-2 font-mono text-[11px] font-normal text-[#5f5b50]">{FAQ.length}</span></h3>
          <div className="mt-2 divide-y divide-white/5 rounded-2xl border border-white/8 bg-black/20 px-5">
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center gap-4 py-3.5 text-left">
                  <span className="font-mono text-[11px] text-[#5f5b50]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#f0ecdd] sm:whitespace-normal">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-[#d4af37] transition ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && <p className="pb-4 pl-9 pr-2 text-sm leading-relaxed text-[#8a8577]">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Gold CTA band ── */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-r from-[#f4e6a8] via-[#d4af37] to-[#c99a25] p-6 text-[#0a0a0f] sm:p-7">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-14 w-14 shrink-0 rounded-2xl object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="min-w-0 flex-1 basis-60">
            <div className="text-xl font-extrabold sm:text-2xl">One firm. Three ways in. Real capital.</div>
            <div className="mt-0.5 text-sm font-medium opacity-75">Start from {money(Math.min(...catalog.map((p) => p.fee ?? 99)))} — CFD fees refunded with your first payout. Practice free on paper first.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/challenges" className="funded-start-btn inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0a0a0f] px-6 text-sm font-bold text-[#f4e6a8] transition hover:opacity-90">
              Start an evaluation <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/app/challenges" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-[#0a0a0f]/25 px-6 text-sm font-bold transition hover:bg-black/5">
              <Zap className="h-4 w-4" /> My attempts
            </Link>
          </div>
        </div>

        {products.length === 0 && !loading && (
          <EmptyState icon={Trophy} title="Admin programs not published yet" sub="Showing standard catalog. The admin publishes live programs from Admin → Content → Challenges." />
        )}
      </div>
    </AppLayout>
  );
}
