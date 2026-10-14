// Funded Challenges — arena design.
// Pick a ticket, pass the rails, get firm capital. All purchase + evaluation
// logic is unchanged; only the presentation is the new floor layout.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Loader2, ArrowRight, ShieldCheck, BadgeDollarSign, Target, Wallet, Zap, CheckCircle2, XCircle, ChevronDown, TrendingUp, CalendarClock, Scale } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GoldButton, EmptyState, Note } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { txt, numOrNull } from '@/lib/safeRender';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcMoney } from '@/components/TbcSign';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

function headers() {
  return { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' };
}

const modeOf = (p) => p.mode || p.phase || 'two-step';

function categoryOf(p) {
  const mode = modeOf(p);
  if (mode === 'futures') {
    return /pro/i.test(p.name) ? { line: 'futures', id: 'pro', label: 'Futures · Pro' } : { line: 'futures', id: 'growth', label: 'Futures · Growth' };
  }
  const size = Number(p.accountSize) || 0;
  if (size <= 25000) return { line: mode, id: 'starter', label: `${mode === 'one-step' ? 'One-Step' : 'Two-Step'} · Starter` };
  if (size <= 100000) return { line: mode, id: 'professional', label: `${mode === 'one-step' ? 'One-Step' : 'Two-Step'} · Professional` };
  return { line: mode, id: 'institutional', label: `${mode === 'one-step' ? 'One-Step' : 'Two-Step'} · Institutional` };
}

const GROUP_ORDER = [
  'two-step:starter', 'two-step:professional', 'two-step:institutional',
  'one-step:starter', 'one-step:professional', 'one-step:institutional',
  'futures:growth', 'futures:pro',
];

function feeFor(p, type) {
  if ((p.mode || p.phase) === 'futures') return Number(p.fee) || 0;
  const fees = p.fees || {};
  return Number(type === 'swing' ? (fees.swing ?? p.fee) : (fees.standard ?? p.fee)) || 0;
}

// The big $200,000 figure stays — the "$200K" inside the product name
// is trimmed so the size never prints twice.
function shortName(p) {
  return String(p?.name || '').replace(/\s*\$[\d,]+K?\b/g, '').trim() || String(p?.name || '');
}

const STEPS = [
  { n: '01', t: 'Pick your ticket', s: 'Size + line — fee leaves your wallet' },
  { n: '02', t: 'Pass the rails', s: 'Targets, drawdown, days — tracked live' },
  { n: '03', t: 'Verify & fund', s: 'Desk confirms, firm capital lands' },
  { n: '04', t: 'Withdraw to bank', s: 'Keep up to 90% of the upside' },
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
  { q: 'How and when do I get paid?', a: 'CFD: withdraw every 14 days to your TBC wallet — 80% standard split, rising to 90% through scaling (1-step pays a fixed 90%). Hit Request payout on a passed evaluation and the desk approves straight to your TBC wallet; your first payout refunds the entry fee in TBC. Futures Sim-Funded: up to 90% with its own payout rhythm.' },
  { q: 'Can I use bots or EAs?', a: 'In evaluation, expert advisors and trade copiers are allowed on your own accounts. Once funded, all trading is manual — bots, EAs, algos and copiers are banned, and bot trading on a funded account ends it.' },
  { q: 'Do I need my own broker for evaluations?', a: 'No. Evaluations trade on your own dedicated TradingBible account inside the terminal, on live market prices — entry, management and funding are all in-house. Connecting an outside broker is optional, only if you want its fills journaled too.' },
  { q: 'Can I buy two of the same account size?', a: 'No — one live seat per balance. You can hold 200K, 100K, 50K and 25K at the same time, but never two live 200Ks. A same-size rebuy opens only after that contract breaches or pays out — the checkout blocks doubles automatically.' },
  { q: 'Can I trade news and hold weekends?', a: 'Depends on your account type. Swing: yes to everything — news, overnight and weekend holding with no blackouts. Standard: news trading NOT ALLOWED and NO weekend holding — intraday only, flat by close, no overnight positions. Futures follows CME hours and the contract calendar.' },
  { q: 'Which platforms can I use?', a: 'MT5 and cTrader, plus the TradingBible Terminal for journaling, analytics and live evaluation tracking. CFD leverage up to 1:100; futures trade on exchange margin.' },
  { q: 'What happens the second I breach a rule?', a: 'Instant fail — no warnings, no softness. The moment a hard rail (daily loss, max loss) breaks in your journal, the attempt locks, later trades stop counting, and the seat frees for rebuy. Close your live broker orders yourself at once: platform keys are read-only, so we lock the evaluation but cannot flatten exchange positions. Consistency gates never breach — they only gate payouts.' },
  { q: 'Can I hedge across accounts?', a: 'No — buy on one account and sell on another (same symbol, overlapping time) is an automatic fail on every active account at once. One offence, all seats locked.' },
];

function typeInfo(p, acctType) {
  const types = Array.isArray(p?.accountTypes) ? p.accountTypes : [];
  const found = types.find((t) => t.id === acctType) || types[0];
  if (found) return found;
  return acctType === 'swing'
    ? { id: 'swing', label: 'Swing', leverage: '1:30', holding: 'Overnight + weekend holding allowed', news: 'No news restrictions' }
    : { id: 'standard', label: 'Standard', leverage: '1:100', holding: 'Intraday only — NO overnight / NO weekend holding (flat by close)', news: 'News trading NOT ALLOWED' };
}

export default function ChallengesPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [tbcPerUsd, setTbcPerUsd] = useState(1 / 3.25); // 1 TBC = 1 KWD peg
  const tbcFor = (usd) => Math.round(Number(usd || 0) * tbcPerUsd * 100) / 100;

  const load = useCallback(async () => {
    try {
      const [p, a, py] = await Promise.all([
        fetch(`${API_SERVER_URL}/challenges/products`).then((r) => r.json()).catch(() => ({ products: [] })),
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/challenges/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({ attempts: [] }))
          : { attempts: [] },
        pb.authStore.token
          ? fetch(`${API_SERVER_URL}/challenges/payouts/my`, { headers: headers() }).then((r) => r.json()).catch(() => ({ payouts: [] }))
          : { payouts: [] },
      ]);
      setProducts(p.products || []);
      setAttempts(a.attempts || []);
      setPayouts(py.payouts || []);
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

  const [faqOpen, setFaqOpen] = useState(null);
  const [acctType, setAcctType] = useState('standard'); // standard | swing (CFD rulebook)
  const [line, setLine] = useState('two-step'); // two-step | one-step | futures

  const lines = useMemo(() => {
    const has = (l) => products.some((p) => (modeOf(p) === l) || (l === 'two-step' && !['one-step', 'futures'].includes(modeOf(p))));
    return [
      { id: 'two-step', label: 'Two-Step', hint: 'Phase 1 → verification' },
      { id: 'one-step', label: 'One-Step', hint: 'Single phase · fixed 90%' },
      { id: 'futures', label: 'Futures', hint: 'Dollar-ruled' },
    ].filter((l) => products.length === 0 || has(l.id));
  }, [products]);

  useEffect(() => {
    if (lines.length && !lines.some((l) => l.id === line)) setLine(lines[0].id);
  }, [lines, line]);

  const grouped = useMemo(() => {
    const groups = [];
    for (const gid of GROUP_ORDER) {
      const [ln, id] = gid.split(':');
      const items = products.filter((p) => {
        const c = categoryOf(p);
        return c.line === ln && c.id === id;
      });
      if (items.length) groups.push({ id: gid, label: categoryOf(items[0]).label, items });
    }
    const rest = products.filter((p) => !GROUP_ORDER.includes(`${categoryOf(p).line}:${categoryOf(p).id}`));
    if (rest.length) groups.push({ id: 'other', label: 'More programs', items: rest });
    return groups;
  }, [products]);

  const lineGroups = useMemo(
    () => grouped.filter((g) => g.id.split(':')[0] === line),
    [grouped, line],
  );

  const heroStats = useMemo(() => {
    if (!products.length) return null;
    const sizes = products.map((p) => Number(p.accountSize) || 0).filter(Boolean);
    const splits = products.map((p) => Number(p.funded?.profitSplitPct)).filter((n) => Number.isFinite(n));
    return [
      { icon: Wallet, top: sizes.length ? `$${Math.max(...sizes).toLocaleString()}` : '—', sub: 'max account' },
      { icon: BadgeDollarSign, top: splits.length ? `${Math.max(...splits)}%` : '—', sub: 'top profit split' },
      { icon: Target, top: String(products.length), sub: 'programs live' },
    ];
  }, [products]);

  // Rulebook figures follow the active line (defaults keep tables live
  // even before the desk publishes programs).
  const lineProducts = useMemo(() => products.filter((p) => modeOf(p) === line), [products, line]);
  const featured = useMemo(() => lineProducts.reduce((best, p) => (!best || Number(p.accountSize) > Number(best.accountSize) ? p : best), null), [lineProducts]);
  const hero = lineProducts[Math.min(3, Math.max(lineProducts.length - 1, 0))] || lineProducts[0] || {};
  const heroSplit = hero.funded?.profitSplitPct ?? 80;
  const hr = hero.rules || {};
  const heroType = line === 'futures' ? (hero.accountTypes?.[0] || {}) : typeInfo(hero, acctType);

  const buy = async (key, accountTypes) => {
    const ids = (accountTypes || []).map((t) => t.id);
    const prod = products.find((x) => x.key === key);
    const accountType = (prod && ((prod.mode || prod.phase) === 'futures')) ? (ids[0] || 'standard') : acctType;
    if (!window.confirm(`Start this evaluation now (${accountType})? The entry fee is debited in TBC from your till. One live seat per balance — same-size rebuy opens only if it breaches.`)) return;
    setBusy(`buy:${key}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/challenges/buy`, { method: 'POST', headers: headers(), body: JSON.stringify({ productKey: key, accountType }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'purchase failed');
      toast({ title: 'Evaluation started', description: 'Trade and log fills in your journal — targets track live.' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Purchase failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <AppLayout title="Funded Challenges">
      <div className="tb-page !max-w-[1400px]">
        {/* ── Split hero: manifesto left, featured ticket right ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95 p-6 sm:p-9">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_100%_0%,rgba(212,175,55,0.12),transparent_55%)]" />
            <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
              <Trophy className="h-4 w-4" /> TradingBible Funded · Evaluations
            </p>
            <h1 className="relative mt-3 max-w-xl text-4xl font-extrabold leading-[1.05] text-[#f0ecdd] sm:text-5xl">
              Earn the seat.<br /><span className="text-[#d4af37]">Keep the split.</span>
            </h1>
            <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">
              Two-step CFD, one-step CFD or dollar-ruled futures — traded and evaluated inside TradingBible on live prices, paid to your TBC wallet.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-bold text-[#0a0a0f] transition hover:opacity-90">
                Start an evaluation <ArrowRight className="h-4 w-4" />
              </button>
              <GoldButton to="/app/paper" className="!px-6 !py-3 !text-sm">Try it free on paper</GoldButton>
            </div>
            {heroStats && (
              <div className="relative mt-6 flex divide-x divide-white/8 border-t border-white/8 pt-4">
                {heroStats.map((st) => (
                  <div key={st.sub} className="flex-1 px-4 first:pl-0">
                    <div className="font-mono text-lg font-extrabold text-[#f0ecdd] sm:text-xl">{st.top}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#5f5b50]">{st.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {featured ? (
            (() => {
              const fFee = feeFor(featured, (featured.mode || featured.phase) === 'futures' ? undefined : acctType);
              const fr = featured.rules || {};
              const fTarget = fr.targetUsd > 0 ? `$${Number(fr.targetUsd).toLocaleString()}` : (modeOf(featured) === 'two-step' ? `${fr.targetPct ?? 10}% → ${fr.target2Pct ?? 5}%` : `${fr.targetPct ?? 10}%`);
              const fRisk = fr.maxDdUsd > 0 ? `$${Number(fr.maxDdUsd).toLocaleString()} EOD` : `${fr.maxDrawdownPct ?? 10}%${fr.maxLossMode === 'eod-trailing' ? ' trail' : ''}`;
              return (
                <div className="relative overflow-hidden rounded-3xl border-2 border-[#7a5c12] bg-gradient-to-b from-[#f4e6a8] to-[#c99a25] p-6 text-[#0a0a0f] shadow-[0_18px_50px_-16px_rgba(166,124,30,0.65)] sm:p-7">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#4a3a08]">Featured · {line === 'two-step' ? 'Two-step' : line === 'one-step' ? 'One-step' : 'Futures'}</p>
                  <div className="mt-2 font-mono text-5xl font-extrabold tracking-tight text-[#0a0a0f]">${Number(featured.accountSize).toLocaleString()}</div>
                  <div className="mt-1 truncate text-sm font-bold text-[#1d1a08]">{shortName(featured)}</div>
                  <div className="mt-4 space-y-1.5 border-t-2 border-[#0a0a0f]/15 pt-4 font-mono text-[13px] font-bold text-[#0a0a0f]">
                    <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Target</span><span>{fTarget}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Max loss</span><span>{fRisk}</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Split</span><span>{featured.funded?.profitSplitPct ?? 80}%</span></div>
                    <div className="flex justify-between"><span className="font-semibold text-[#4a3a08]">Entry · TBC only</span><span>{tbcFor(fFee).toLocaleString()} TBC (${fFee.toLocaleString()})</span></div>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#4a3a08]">Convert, swap, buy or receive TBC first</p>
                  <button disabled={busy === `buy:${featured.key}`} onClick={() => buy(featured.key, featured.accountTypes)} className="funded-start-btn mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0f] text-sm font-bold text-[#f4e6a8] transition hover:opacity-90 disabled:opacity-50">
                    {busy === `buy:${featured.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start this evaluation <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="grid place-items-center rounded-3xl border border-dashed border-[#d4af37]/30 p-6 text-center text-sm text-[#8a8577]">
              {loading ? 'Loading programs…' : 'Featured seat appears here once the desk publishes programs.'}
            </div>
          )}
        </div>
        {/* ── Journey strip ── */}
        <div className="relative mt-4 overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95">
          <div className="relative grid grid-cols-2 gap-px border-t border-[#d4af37]/15 bg-[#d4af37]/15 lg:grid-cols-4">
            {STEPS.map((st) => (
              <div key={st.n} className="bg-[#0c0c11] px-5 py-4">
                <span className="font-mono text-[11px] font-bold tracking-widest text-[#d4af37]/70">{st.n}</span>
                <span className="mt-0.5 block text-sm font-bold text-[#f0ecdd]">{st.t}</span>
                <span className="mt-0.5 block text-xs text-[#8a8577]">{st.s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Line switch (segmented control) ── */}
        {lines.length > 1 && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="grid w-fit max-w-full grid-cols-3 gap-1.5 rounded-[10px] border border-white/10 bg-black/30 p-1.5">
              {lines.map((l) => (
                <button key={l.id} onClick={() => setLine(l.id)}
                  className={`flex min-w-0 flex-col items-start gap-0.5 whitespace-nowrap rounded-[8px] px-3 py-2 text-left transition ${line === l.id ? 'bg-gradient-to-b from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_4px_16px_-6px_rgba(212,175,55,0.6)]' : 'text-[#8a8577] hover:bg-white/5 hover:text-[#e9e7df]'}`}>
                  <span className="text-xs font-extrabold">{l.label}</span>
                  <span className={`hidden font-mono text-[10px] sm:inline ${line === l.id ? 'text-[#0a0a0f]/70' : 'text-[#5f5b50]'}`}>{l.hint}</span>
                </button>
              ))}
            </div>
            <span className="hidden text-center font-mono text-[11px] text-[#5f5b50] lg:inline">One live seat per size · payouts to TBC wallet</span>
          </div>
        )}

        {/* ── Standard / Swing rulebook switch (CFD lines) ── */}
        {line !== 'futures' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-5 py-3.5">
            <div className="min-w-0">
              <span className="text-sm font-bold text-[#f0ecdd]">{acctType === 'swing' ? 'Swing' : 'Standard'}</span>
              <span className="ml-2 text-xs text-[#8a8577]">
                {acctType === 'swing'
                  ? 'Overnight + weekends, no news blackouts · 1:30'
                  : 'Full 1:100 · NO news · NO weekends — flat by close'}
              </span>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/25 text-xs font-bold">
              {['standard', 'swing'].map((id) => (
                <button key={id} onClick={() => setAcctType(id)} className={`whitespace-nowrap px-5 py-2.5 ${acctType === id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  {id === 'standard' ? 'Standard' : 'Swing'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tickets ── */}
        <div id="tickets" className="mt-4 flex scroll-mt-24 items-center gap-3">
          <h3 className="flex items-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">
            <Zap className="h-4 w-4 text-[#d4af37]" />
            {lines.find((l) => l.id === line)?.label || 'Evaluation programs'}
          </h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <button onClick={() => document.getElementById('objectives')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="shrink-0 text-xs font-semibold text-[#d4af37] hover:underline">Full rules & pricing</button>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-[#8a8577]">Loading programs…</p>
        ) : products.length === 0 ? (
          <div className="mt-3"><EmptyState icon={Trophy} title="Programs opening soon" sub="The desk publishes evaluations here — check back soon." /></div>
        ) : lineGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[#8a8577]">No programs on this line right now.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[10px] border border-white/10 bg-[#0c0c11]/95">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#f0ecdd]">{line === 'futures' ? 'Futures programs' : line === 'one-step' ? 'One-Step programs' : 'Two-Step programs'}</span>
                <span className="font-mono text-[10px] text-[#5f5b50]">{line === 'futures' ? 'Dollar rails → Funded' : line === 'one-step' ? 'Single phase → Funded' : 'Phase 1 → Verification → Funded'}</span>
                {line !== 'futures' && <span className="rounded-md bg-[#d4af37]/12 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#d4af37]">{acctType === 'swing' ? 'Swing · 1:30' : 'Standard · 1:100'}</span>}
                <span className="ml-auto font-mono text-[10px] text-[#5f5b50]">{lineGroups.reduce((n, g) => n + g.items.length, 0)} sizes</span>
              </div>
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {lineGroups.flatMap((g) => g.items).map((p) => {
                      const popular = /professional/i.test(categoryOf(p).label);
                      const fee = feeFor(p, (p.mode || p.phase) === 'futures' ? undefined : acctType);
                      const rails = [
                        ['Target', p.rules.targetUsd > 0 ? `$${Number(p.rules.targetUsd).toLocaleString()}` : `${p.rules.targetPct}%${(p.mode || p.phase) === 'two-step' ? ` → ${p.rules.target2Pct}%` : ''}`],
                        ['Max DD', p.rules.maxDdUsd > 0 ? `$${Number(p.rules.maxDdUsd).toLocaleString()}` : `${p.rules.maxDrawdownPct}%`],
                        ['Daily loss', p.rules.dailyLossUsd > 0 ? `$${Number(p.rules.dailyLossUsd).toLocaleString()}` : (p.mode || p.phase) === 'futures' && !(p.rules.dailyLossPct > 0) ? 'None' : `${p.rules.dailyLossPct}%`],
                        ['Split', `${p.funded?.profitSplitPct ?? 80}%`],
                        ['Leverage', p.leverage || '1:100'],
                        ['Gate', p.rules.bestDayMaxPct > 0 ? `Best ≤${p.rules.bestDayMaxPct}%` : p.rules.consistencyMaxPct > 0 ? `Cons ≤${p.rules.consistencyMaxPct}%` : `${p.rules.minDays}d min`],
                      ];
                      return (
                        <div key={p.key} className={`relative overflow-hidden rounded-[10px] border bg-black/20 p-3 transition hover:-translate-y-px ${popular ? 'border-[#d4af37]/60 shadow-[0_0_28px_-10px_rgba(212,175,55,0.55)]' : 'border-white/10 hover:border-[#d4af37]/40'}`}>
                          {popular && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#f4e6a8] via-[#d4af37] to-[#c99a25]" />}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xl font-extrabold tabular-nums text-[#f0ecdd]">${Number(p.accountSize).toLocaleString()}</span>
                            {popular && <span className="rounded bg-[#d4af37] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-[#0a0a0f]">Popular</span>}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[#8a8577]">{shortName(p)}</div>
                          <div className="mt-2 grid grid-cols-3 gap-1">
                            {rails.map(([k, v]) => (
                              <div key={k} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1">
                                <div className="text-[8px] font-bold uppercase tracking-wider text-[#5f5b50]">{k}</div>
                                <div className={`mt-0.5 truncate font-mono text-[11px] font-bold tabular-nums ${k === 'Split' ? 'text-emerald-400' : 'text-[#e9e7df]'}`}>{v}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="grid flex-1 grid-cols-2 items-center gap-1 rounded-[8px] border border-[#d4af37]/20 bg-[#d4af37]/[0.05] px-2 py-1.5">
                              <span className="font-mono text-sm font-extrabold tabular-nums text-[#d4af37]"><TbcMoney amount={tbcFor(fee)} /></span>
                              <span className="text-right font-mono text-[10px] tabular-nums text-[#6a665a]">${fee.toLocaleString()}</span>
                            </div>
                            <button disabled={busy === `buy:${p.key}`} onClick={() => buy(p.key, p.accountTypes)}
                              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-xs font-bold text-[#0a0a0f] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50">
                              {busy === `buy:${p.key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="flex items-center gap-1.5">Start <ArrowRight className="h-3.5 w-3.5" /></span>}</button>
                          </div>
                        </div>
                      );
                  })}
              </div>
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-1.5 text-[10px] text-[#6a665a]">Entry fees in TBC only · $ list price · refunded at first payout{line !== 'futures' && (acctType === 'swing' ? ' · News, overnight + weekends allowed' : ' · No news · no overnight / weekends')}</div>
            </div>
        )}

        <Note icon={ShieldCheck}>
          Targets, drawdowns, days and consistency gates evaluate automatically from trades logged after purchase. A broken hard rail fails and locks the attempt instantly — later fills never count. Standard: news trading NOT ALLOWED, NO overnight / NO weekend holding (flat by close). Swing: news, overnight + weekends allowed. Bots/EAs never on funded accounts — manual only once funded. Rules apply once funded and are confirmed by the desk — pick your type when you start.
        </Note>

        {/* ── Trading objectives — full rulebook for the active line ── */}
        <Card id="objectives" className="!p-0 mt-4 scroll-mt-24 overflow-hidden">
          <div className="border-b border-[#d4af37]/12 px-5 py-4 sm:px-7">
            <h3 className="font-semibold text-[#f0ecdd]">Trading objectives — {line === 'two-step' ? 'CFD 2-Step' : line === 'one-step' ? 'CFD 1-Step' : 'Futures (Growth & Pro)'}{line !== 'futures' ? ` · ${acctType === 'swing' ? 'Swing' : 'Standard'}` : ''}</h3>
            <p className="mt-0.5 text-xs text-[#8a8577]">{line === 'futures' ? 'Dollar-based rails. Growth has no daily limit; Pro enforces a hard daily. Trading day: 6pm–4:10pm ET.' : 'Identical rails on all sizes. Targets are measured on closed balance; loss rails watch equity intraday.'}</p>
          </div>
          <div className="overflow-x-auto">
            {line === 'two-step' && (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0c0c11] text-left text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-semibold text-[#8a8577] sm:px-7">Objective</th>
                    <th className="px-5 py-3.5 font-semibold"><span className="inline-flex items-center gap-1.5 text-[#d4af37]"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />Phase 1 · Evaluation</span></th>
                    <th className="px-5 py-3.5 font-semibold"><span className="inline-flex items-center gap-1.5 text-[#38bdf8]"><span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]" />Phase 2 · Verification</span></th>
                    <th className="px-5 py-3.5 font-semibold"><span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Funded account</span></th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3.5 [&_td:first-child]:font-semibold [&_td:first-child]:text-[#c9c4b4] [&_tr]:border-b [&_tr]:border-white/5 [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.02] [&_tr:last-child]:border-b-0">
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
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0c0c11] text-left text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3.5 font-semibold text-[#8a8577] sm:px-7">Objective</th>
                    <th className="px-5 py-3.5 font-semibold"><span className="inline-flex items-center gap-1.5 text-[#d4af37]"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />Evaluation · single phase</span></th>
                    <th className="px-5 py-3.5 font-semibold"><span className="inline-flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Funded account</span></th>
                  </tr>
                </thead>
                <tbody className="[&_td]:px-5 [&_td]:py-3.5 [&_td:first-child]:font-semibold [&_td:first-child]:text-[#c9c4b4] [&_tr]:border-b [&_tr]:border-white/5 [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.02] [&_tr:last-child]:border-b-0">
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
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
                {[
                  { tag: 'Growth Evaluation', color: 'text-[#d4af37]', dot: 'bg-[#d4af37]', rows: [['Profit target', '$3K / $6K / $9K by size'], ['Max drawdown', '$2K / $3.5K / $5K EOD-trailing, locks at start'], ['Daily loss limit', 'None in evaluation'], ['Consistency rule', 'Best day ≤ 40% of total (gate, never a breach)'], ['Max contracts', '5 / 10 / 15 by size'], ['Minimum trading days', '4 days'], ['Profit split', '—']] },
                  { tag: 'Pro Evaluation', color: 'text-[#38bdf8]', dot: 'bg-[#38bdf8]', rows: [['Profit target', '$3K / $6K / $9K by size'], ['Max drawdown', '$3K / $4.5K / $6K EOD-trailing, locks at start'], ['Daily loss limit', '$1K / $1.5K / $2K hard daily'], ['Consistency rule', 'Best day ≤ 50% of total (gate)'], ['Max contracts', '5 / 10 / 15 by size'], ['Minimum trading days', '4 days'], ['Profit split', '—']] },
                  { tag: 'Sim-Funded', color: 'text-emerald-400', dot: 'bg-emerald-400', rows: [['Profit target', 'No target — just grow'], ['Max drawdown', 'Same, locks for life'], ['Daily loss limit', 'Per plan'], ['Consistency rule', '—'], ['Max contracts', '5 / 10 / 15 by size'], ['Minimum trading days', '—'], ['Profit split', 'Up to 90% · up to 3 seats · $450K combined']] },
                ].map((col) => (
                  <div key={col.tag} className="overflow-hidden rounded-[10px] border border-white/10 bg-black/20">
                    <div className={`flex items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider ${col.color}`}><span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />{col.tag}</div>
                    <div className="divide-y divide-white/5">
                      {col.rows.map(([k, v]) => (
                        <div key={k} className="px-3 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#5f5b50]">{k}</div>
                          <div className={`mt-0.5 text-xs font-semibold leading-relaxed ${k === 'Profit split' && v !== '—' ? 'font-mono text-[#d4af37]' : 'text-[#e9e7df]'}`}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {line === 'futures' && (
              <div className="border-t border-white/[0.07] bg-white/[0.02] px-4 py-1.5 font-mono text-[10px] tabular-nums text-[#6a665a]">Trading day 6:00pm ET → 4:10pm ET next day</div>
            )}
          </div>
        </Card>

        {/* ── Payout band ── */}
        <div className="mt-4 grid grid-cols-1 divide-y divide-white/5 rounded-3xl border border-white/8 bg-black/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: BadgeDollarSign, t: `Keep ${line === 'one-step' ? 'a fixed 90%' : `${heroSplit}–90%`}`, s: line === 'one-step' ? 'One-step pays a flat 90% from the first withdrawal — performance is the only variable.' : line === 'futures' ? 'Sim-Funded keeps up to 90% across up to 3 seats and $450K combined capital.' : `Start at ${heroSplit}% from day one. Consistent traders scale toward 90% — the firm only wins when you win.` },
            { icon: TrendingUp, t: line === 'futures' ? 'Scale to $450K' : 'Scale to $400K', s: line === 'futures' ? 'Add seats up to 3 Sim-Funded accounts. More steady profit, more capital — reviewed on record, not on promises.' : 'Every 4 months of disciplined growth adds 25% more capital, up to $400K. No extra fee, no re-evaluation — automatic review.' },
            { icon: CalendarClock, t: line === 'futures' ? 'Fast payouts' : 'Paid every 14 days', s: line === 'futures' ? 'Withdraw to your TBC wallet on the Sim-Funded rhythm, from the first eligible window.' : 'Withdraw to your TBC wallet on a 14-day cycle. Your first payout also refunds the full entry fee.' },
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
            <div className="mt-0.5 text-sm font-medium opacity-75">Practice free on paper first — then pick a ticket above and start.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/app/paper" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#0a0a0f] px-6 text-sm font-bold text-[#f4e6a8] transition hover:opacity-90">
              Try it free on paper
            </a>
            <a href="/app/journal#evaluations" className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-[#0a0a0f]/25 px-6 text-sm font-bold transition hover:bg-black/5">
              <Zap className="h-4 w-4" /> My attempts
            </a>
          </div>
        </div>

        {/* ── My evaluations now live in the Trading Journal ── */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.05] px-4 py-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]"><Trophy className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1 basis-48">
            <div className="text-sm font-bold text-[#f0ecdd]">My evaluations · {attempts.length}</div>
            <div className="text-xs text-[#8a8577]">{attempts.length === 0 ? 'No evaluations yet — pick a ticket above to start. Tracking lives in your journal.' : 'Active seats track in your Trading Journal — evaluate, pass and request payouts there.'}</div>
          </div>
          <GoldButton to="/app/journal#evaluations" className="!px-4 !py-2 !text-xs">Open journal <ArrowRight className="h-4 w-4" /></GoldButton>
        </div>
        <p className="mt-4 text-center text-xs text-[#6a665a]">Full objectives, payout rhythm and house rules tabled above — your seats track in the journal.</p>

        {/* ── Payout history ── */}
        {payouts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <h3 className="whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">Payouts</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
              <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{payouts.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-4 py-2.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.kind === 'refund' ? 'bg-[#d4af37]/15 text-[#d4af37]' : p.status === 'pending' ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'bg-emerald-400/15 text-emerald-400'}`}>
                    {p.kind === 'refund' ? 'fee refund' : p.kind === 'payout_request' ? 'requested' : 'paid'}
                  </span>
                  <span className="font-mono font-bold text-[#f0ecdd]">{txt(p.asset, '') === 'TBC' ? `${(numOrNull(p.amount) ?? 0).toLocaleString()} TBC` : `$${(numOrNull(p.amount) ?? 0).toLocaleString()}`}</span>
                  <span className="ml-auto font-mono text-[11px] text-[#5f5b50]">{p.created ? new Date(p.created).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
