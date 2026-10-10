// Funded Challenges — arena design.
// Pick a ticket, pass the rails, get firm capital. All purchase + evaluation
// logic is unchanged; only the presentation is the new floor layout.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck, BadgeDollarSign, Target, Wallet, Landmark, Zap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { PageHero, Card, GoldButton, GhostButton, EmptyState, Note } from '@/components/ui-kit';
import { useToast } from '@/hooks/use-toast';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TbcSign, TbcMoney } from '@/components/TbcSign';

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

  const [typeByKey, setTypeByKey] = useState({});
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

  const buy = async (key, accountTypes) => {
    const ids = (accountTypes || []).map((t) => t.id);
    const accountType = typeByKey[key] || ids[0] || 'standard';
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

  const evaluate = async (id) => {
    setBusy(`eval:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/challenges/evaluate/${id}`, { method: 'POST', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'evaluation failed');
      const r = data.result;
      toast({ title: r.status === 'passed' ? 'Phase passed — well traded' : r.failed ? 'Rail breached — attempt ended' : 'Still in play', description: r ? `+${r.profitPct}% · DD ${r.maxDdPct}% · worst day ${r.worstDayPct}% · ${r.days}d` : '' });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Evaluation failed', description: e.message }); }
    finally { setBusy(''); }
  };

  const pendingPayoutFor = (attemptId) => payouts.some((p) => p.kind === 'payout_request' && p.status === 'pending' && String(p.reference || '').startsWith(`payout_req:${attemptId}:`));

  const requestPayout = async (id) => {
    if (!window.confirm('Request your payout now? It goes to your connected bank once the desk approves — entry fee refunded in TBC on your first payout.')) return;
    setBusy(`payout:${id}`);
    try {
      const res = await fetch(`${API_SERVER_URL}/challenges/payout/request`, { method: 'POST', headers: headers(), body: JSON.stringify({ attemptId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'request failed');
      toast({ title: 'Payout requested', description: `$${data.payout?.toLocaleString()} on its way — desk review, then straight to your bank.` });
      await load();
    } catch (e) { toast({ variant: 'destructive', title: 'Payout request failed', description: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <AppLayout title="Funded Challenges">
      <div className="tb-page !max-w-[1400px]">
        {/* ── Arena hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/25 bg-[#0c0c11]/95">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(212,175,55,0.14),transparent_60%)]" />
          <div className="relative flex flex-wrap items-end gap-5 p-6 sm:p-8">
            <div className="min-w-0 flex-1 basis-72">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">
                <Trophy className="h-4 w-4" /> TradingBible Funded · Evaluations
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#f0ecdd] sm:text-4xl">
                Earn the seat.<br />Keep the split.
              </h1>
              <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-[#8a8577]">
                Two-step CFD, one-step CFD or dollar-ruled futures — evaluated on your journaled fills, paid to your connected bank.
              </p>
            </div>
            {heroStats && (
              <div className="flex shrink-0 gap-2.5">
                {heroStats.map((s) => (
                  <div key={s.sub} className="min-w-[6.5rem] rounded-2xl border border-[#d4af37]/20 bg-black/40 px-4 py-3 text-center">
                    <s.icon className="mx-auto h-4 w-4 text-[#d4af37]" />
                    <div className="mt-1 font-mono text-xl font-extrabold text-[#f0ecdd]">{s.top}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#5f5b50]">{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {/* ── Line tabs (underline style) ── */}
        {lines.length > 1 && (
          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/8">
            {lines.map((l) => (
              <button key={l.id} onClick={() => setLine(l.id)}
                className={`relative whitespace-nowrap px-4 pb-2.5 pt-1 text-sm font-bold transition ${line === l.id ? 'text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                {l.label}
                <span className="ml-2 hidden font-mono text-[11px] font-normal text-[#5f5b50] sm:inline">{l.hint}</span>
                {line === l.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#d4af37]" aria-hidden />}
              </button>
            ))}
          </div>
        )}

        {/* ── Tickets ── */}
        <div className="mt-4 flex items-center gap-3">
          <h3 className="flex items-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">
            <Zap className="h-4 w-4 text-[#d4af37]" />
            {lines.find((l) => l.id === line)?.label || 'Evaluation programs'}
          </h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <Link to="/app/funded" className="shrink-0 text-xs font-semibold text-[#d4af37] hover:underline">Full rules & pricing</Link>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-[#8a8577]">Loading programs…</p>
        ) : products.length === 0 ? (
          <div className="mt-3"><EmptyState icon={Trophy} title="Programs opening soon" sub="The desk publishes evaluations here. Read the full rulebook meanwhile." action={<GoldButton to="/app/funded" className="!px-4 !py-2 !text-xs">Rulebook & pricing</GoldButton>} /></div>
        ) : lineGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[#8a8577]">No programs on this line right now.</p>
        ) : (
          lineGroups.map((g) => (
            <div key={g.id} className="mt-4">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#8a8577]">{g.label}</p>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {g.items.map((p) => {
                  const popular = /professional/i.test(categoryOf(p).label);
                  const fee = feeFor(p, typeByKey[p.key] || (p.accountTypes?.[0]?.id) || 'standard');
                  const rails = [
                    ['Target', p.rules.targetUsd > 0 ? `$${Number(p.rules.targetUsd).toLocaleString()}` : `${p.rules.targetPct}%${(p.mode || p.phase) === 'two-step' ? ` → ${p.rules.target2Pct}%` : ''}`],
                    ['Max DD', p.rules.maxDdUsd > 0 ? `$${Number(p.rules.maxDdUsd).toLocaleString()}` : `${p.rules.maxDrawdownPct}%`],
                    ['Daily loss', p.rules.dailyLossUsd > 0 ? `$${Number(p.rules.dailyLossUsd).toLocaleString()}` : (p.mode || p.phase) === 'futures' && !(p.rules.dailyLossPct > 0) ? 'None' : `${p.rules.dailyLossPct}%`],
                    ['Split', `${p.funded?.profitSplitPct ?? 80}%`],
                    ['Leverage', p.leverage || '1:100'],
                    ['Gate', p.rules.bestDayMaxPct > 0 ? `Best ≤${p.rules.bestDayMaxPct}%` : p.rules.consistencyMaxPct > 0 ? `Cons ≤${p.rules.consistencyMaxPct}%` : `${p.rules.minDays}d min`],
                  ];
                  return (
                    <div key={p.key} className={`term-panel group relative grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border bg-[#0c0c11]/95 transition-all duration-200 hover:-translate-y-1 sm:grid-cols-[1fr_12rem] ${popular ? 'border-[#d4af37]/50 shadow-[0_0_40px_-12px_rgba(212,175,55,0.45)] hover:shadow-[0_16px_50px_-12px_rgba(212,175,55,0.55)]' : 'border-white/8 hover:border-[#d4af37]/35 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]'}`}>
                      <div className="min-w-0 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#d4af37]/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#d4af37]">
                            {(p.mode || p.phase) === 'one-step' ? 'One-step' : (p.mode || p.phase) === 'futures' ? (/pro/i.test(p.name) ? 'Futures Pro' : 'Futures Growth') : 'Two-step'}
                          </span>
                          {popular && <span className="rounded-full bg-[#d4af37] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0a0a0f]">Most popular</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className="font-mono text-4xl font-extrabold tracking-tight text-[#f0ecdd]">${Number(p.accountSize).toLocaleString()}</span>
                          <span className="text-sm font-semibold text-[#c9c4b4]">{shortName(p)}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
                          {rails.map(([k, v]) => (
                            <div key={k} className="rounded-xl border border-white/5 bg-black/30 px-2.5 py-2">
                              <div className="text-[9px] font-bold uppercase tracking-wider text-[#5f5b50]">{k}</div>
                              <div className={`mt-0.5 font-mono text-[13px] font-bold ${k === 'Split' ? 'text-emerald-400' : 'text-[#f0ecdd]'}`}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {(p.accountTypes || []).length > 1 && (
                          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                            {p.accountTypes.map((at) => {
                              const sel = (typeByKey[p.key] || p.accountTypes[0].id) === at.id;
                              return (
                                <button key={at.id} type="button" role="radio" aria-checked={sel}
                                  onClick={() => setTypeByKey({ ...typeByKey, [p.key]: at.id })}
                                  className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] ${sel ? 'border-[#d4af37]/60 bg-[#d4af37]/10' : 'border-white/8 bg-black/30 hover:border-[#d4af37]/30'}`}>
                                  <div className={`text-xs font-extrabold ${sel ? 'text-[#d4af37]' : 'text-[#c9c4b4]'}`}>{at.label}</div>
                                  <div className="mt-0.5 font-mono text-[11px] text-[#8a8577]">{at.leverage}</div>
                                  <div className="mt-0.5 font-mono text-[11px] font-bold text-[#f0ecdd]">{tbcFor(feeFor(p, at.id)).toLocaleString()} TBC</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row items-center justify-between gap-3 border-t border-white/5 bg-black/30 p-5 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0 sm:text-center">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5f5b50]">Entry fee · TBC only</div>
                          <div className="font-mono text-3xl font-extrabold text-[#d4af37]"><TbcMoney amount={tbcFor(fee)} /></div>
                          <div className="mt-0.5 whitespace-nowrap text-[11px] text-[#8a8577]">${fee.toLocaleString()} list · refunded at payout</div>
                        </div>
                        <button disabled={busy === `buy:${p.key}`} onClick={() => buy(p.key, p.accountTypes)}
                          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-bold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-50">
                          {busy === `buy:${p.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1.5">Start <ArrowRight className="h-4 w-4" /></span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <Note icon={ShieldCheck}>
          Targets, drawdowns, days and consistency gates evaluate automatically from trades logged after purchase. Standard: news trading NOT ALLOWED, NO overnight / NO weekend holding (flat by close). Swing: news, overnight + weekends allowed. Bots/EAs never on funded accounts — manual only once funded. Rules apply once funded and are confirmed by the desk — pick your type when you start.
        </Note>

        {/* ── My evaluations: pipeline ── */}
        <div className="mt-6 flex items-center gap-3">
          <h3 className="whitespace-nowrap text-sm font-bold uppercase tracking-wide text-[#f0ecdd]">My evaluations</h3>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
          <span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[11px] text-[#d4af37]">{attempts.length}</span>
        </div>
        {attempts.length === 0 ? (
          <p className="mt-3 text-sm text-[#8a8577]">No evaluations yet — pick a ticket above to start.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {attempts.map((a) => {
              const s = a.stats || {};
              const checks = s.checks || [];
              const passed = checks.filter((c) => c.pass).length;
              const tone = a.status === 'passed' || a.status === 'paid' ? 'emerald' : a.status === 'failed' ? 'red' : 'gold';
              return (
                <Card key={a.id} className="overflow-hidden !p-0">
                  <div className={`flex items-center justify-between gap-2 px-5 py-3 ${tone === 'emerald' ? 'bg-emerald-400/10' : tone === 'red' ? 'bg-red-400/10' : 'bg-[#d4af37]/10'}`}>
                    <div className="min-w-0 truncate text-sm font-bold text-[#f0ecdd]">{a.product_name}</div>
                    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${tone === 'emerald' ? 'bg-emerald-400/15 text-emerald-400' : tone === 'red' ? 'bg-red-400/15 text-red-400' : 'bg-[#d4af37]/15 text-[#d4af37]'}`}>
                      {a.status === 'passed' || a.status === 'paid' ? <CheckCircle2 className="h-3.5 w-3.5" /> : a.status === 'failed' ? <XCircle className="h-3.5 w-3.5" /> : null}
                      {a.status}
                    </span>
                  </div>
                  <div className="p-5 pt-4">
                    <div className="font-mono text-[11px] text-[#5f5b50]">
                      {a.account_type && a.account_type !== 'standard' ? `${a.account_type} · ` : ''}{checks.length > 0 ? `${passed}/${checks.length} gates cleared` : 'Awaiting first evaluation'}
                    </div>
                    {checks.length > 0 && (
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className={`h-full rounded-full transition-all ${tone === 'emerald' ? 'bg-emerald-400' : tone === 'red' ? 'bg-red-400' : 'bg-[#d4af37]'}`} style={{ width: `${Math.round((passed / checks.length) * 100)}%` }} />
                      </div>
                    )}
                    <div className="mt-2.5 font-mono text-[13px] text-[#c9c4b4]">
                      {s.equity !== undefined ? `Equity $${s.equity?.toLocaleString()} · +${s.profitPct}% · DD ${s.maxDdPct}% · worst day ${s.worstDayPct}% · ${s.days}d · ${s.trades} trades` : 'Log trades in your journal, then re-evaluate.'}
                    </div>
                    {checks.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
                        {checks.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-xs">
                            <span className={c.pass ? 'text-emerald-400' : c.soft ? 'text-[#d4af37]' : 'text-red-400'}>{c.pass ? '✓' : c.soft ? '◷' : '✕'}</span>
                            <span className="min-w-0 flex-1 truncate text-[#c9c4b4]">{c.label}</span>
                            <span className="shrink-0 font-mono text-[#8a8577]">{typeof c.value === 'number' ? c.value : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {a.status === 'active' && (
                      <div className="mt-3.5">
                        <GhostButton disabled={busy === `eval:${a.id}`} onClick={() => evaluate(a.id)} className="!px-4 !py-2 !text-xs">
                          {busy === `eval:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-evaluate now'}
                        </GhostButton>
                      </div>
                    )}
                    {a.status === 'passed' && (
                      <div className="mt-2.5">
                        <p className="flex items-center gap-1.5 text-xs text-emerald-400"><BadgeDollarSign className="h-3.5 w-3.5" /> Passed — {pendingPayoutFor(a.id) ? 'payout requested, desk is reviewing.' : 'request your payout to your connected bank.'}</p>
                        {!pendingPayoutFor(a.id) && (
                          <GoldButton disabled={busy === `payout:${a.id}`} onClick={() => requestPayout(a.id)} className="mt-2 !px-4 !py-2 !text-xs">
                            {busy === `payout:${a.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request payout'}
                          </GoldButton>
                        )}
                      </div>
                    )}
                    {a.status === 'paid' && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400"><Landmark className="h-3.5 w-3.5" /> Reward paid — check your wallet ledger and bank.</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-[#6a665a]">Full objectives, scaling plan and FAQ live on the <Link to="/app/funded" className="font-semibold text-[#d4af37] hover:underline">Funded page</Link>.</p>

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
                  <span className="font-mono font-bold text-[#f0ecdd]">{p.asset === 'TBC' ? `${Number(p.amount).toLocaleString()} TBC` : `$${Number(p.amount).toLocaleString()}`}</span>
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
