import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Scale, Flame, Target, ShieldCheck, Plus, Trash2, Crosshair, Wallet, History } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { PageHero, Card, GhostButton, Note } from '@/components/ui-kit';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { useQuotes } from '@/hooks/useQuotes';
import { useTrades, computeStats } from '@/hooks/useTrades';

const input = 'w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 min-h-[44px]';
const lab = 'mb-1.5 block text-xs font-semibold text-[#8a8577]';
const money = (n, d = 2) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 })}`;

function Field({ text, children }) {
  return <div className="min-w-0"><label className={lab}>{text}</label>{children}</div>;
}

function Section({ icon: Icon, title, sub, children }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0"><h3 className="text-base font-semibold text-[#f0ecdd]">{title}</h3><p className="mt-0.5 text-[13px] leading-relaxed text-[#8a8577]">{sub}</p></div>
      </div>
      {children}
    </Card>
  );
}

function Result({ l, v, tone }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#d4af37]/[0.06] p-3 text-center">
      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#8a8577]">{l}</div>
      <div className={`mt-1 truncate font-mono text-sm font-bold sm:text-base ${tone || 'text-[#d4af37]'}`}>{v}</div>
    </div>
  );
}

/* ── 1 · Live position sizer ─────────────────────────────────────── */
function PositionSizer() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState('XAUUSD');
  const { quotes } = useQuotes([symbol], { refreshMs: 15000 });
  const live = quotes[symbol]?.price;
  const [v, setV] = useState({ balance: '100000', riskPct: '1', entry: '', stop: '', target: '', leverage: '100' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const useLive = () => { if (live != null) setV({ ...v, entry: String(live) }); };

  const r = useMemo(() => {
    const balance = parseFloat(v.balance) || 0;
    const entry = parseFloat(v.entry) || 0;
    const stop = parseFloat(v.stop) || 0;
    const target = parseFloat(v.target) || 0;
    const lev = Math.max(1, parseFloat(v.leverage) || 1);
    const riskAmt = balance * ((parseFloat(v.riskPct) || 0) / 100);
    const perUnit = Math.abs(entry - stop);
    const units = perUnit > 0 ? riskAmt / perUnit : 0;
    const notional = units * entry;
    const margin = notional / lev;
    const stopDistPct = entry > 0 ? (perUnit / entry) * 100 : 0;
    const reward = Math.abs(target - entry);
    const rr = perUnit > 0 && reward > 0 ? reward / perUnit : 0;
    return { riskAmt, perUnit, units, notional, margin, stopDistPct, rr };
  }, [v]);

  return (
    <Section icon={Calculator} title={t('risk.posTitle')} sub={t('risk.posSub')}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-[10rem] flex-1"><SymbolSearchPicker value={symbol} onChange={setSymbol} /></div>
        <GhostButton onClick={useLive} disabled={live == null} className="!min-h-[44px] !px-3.5 !py-2 !text-xs">
          <Crosshair className="h-4 w-4" /> {live != null ? `Use live ${live}` : 'Waiting for quote…'}
        </GhostButton>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field text={t('risk.fBalance')}><input className={input} type="number" min="0" value={v.balance} onChange={set('balance')} /></Field>
        <Field text={t('risk.fRiskPct')}><input className={input} type="number" min="0" step="0.1" value={v.riskPct} onChange={set('riskPct')} /></Field>
        <Field text="Leverage (e.g. 100 = 1:100)"><input className={input} type="number" min="1" value={v.leverage} onChange={set('leverage')} /></Field>
        <Field text={t('risk.fEntry')}><input className={input} type="number" step="any" value={v.entry} onChange={set('entry')} placeholder={live != null ? String(live) : '—'} /></Field>
        <Field text={t('risk.fStop')}><input className={input} type="number" step="any" value={v.stop} onChange={set('stop')} /></Field>
        <Field text={t('risk.fTarget')}><input className={input} type="number" step="any" value={v.target} onChange={set('target')} /></Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Result l={t('risk.rRiskAmt')} v={money(r.riskAmt)} />
        <Result l={t('risk.rRiskUnit')} v={money(r.perUnit)} />
        <Result l={t('risk.rPosSize')} v={`${r.units.toLocaleString(undefined, { maximumFractionDigits: 2 })} u`} />
        <Result l={t('risk.rNotional')} v={money(r.notional, 0)} tone="text-[#f0ecdd]" />
        <Result l="Est. margin" v={money(r.margin)} tone="text-[#f0ecdd]" />
        <Result l="Stop distance" v={`${r.stopDistPct.toFixed(2)}%`} tone="text-[#f0ecdd]" />
      </div>
      {r.rr > 0 && <p className="mt-3 text-[13px] text-[#8a8577]">Payoff on this setup: <span className="font-mono font-bold text-[#d4af37]">1 : {r.rr.toFixed(2)}</span></p>}
    </Section>
  );
}

/* ── 2 · Trade evaluator: R:R + breakeven + expectancy + ruin ─────── */
function ruinApprox(winPct, rr, riskPct) {
  // Gambler's-ruin style approximation, educational only.
  const p = winPct / 100;
  const q = 1 - p;
  if (p <= 0.5 && rr <= 1) return 100;
  if (p >= 1) return 0;
  const edge = p * rr - q;
  if (edge <= 0) return 100;
  const r = Math.min(0.99, Math.max(0.01, q / (p * Math.max(rr, 0.01))));
  const units = 100 / Math.max(riskPct, 0.01);
  return Math.min(100, Math.max(0, Math.pow(r, units) * 100));
}

function TradeEvaluator({ actuals }) {
  const { t } = useI18n();
  const [v, setV] = useState({ entry: '100', stop: '98', target: '106', size: '100', winRate: actuals ? String(actuals.winRate) : '45' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const r = useMemo(() => {
    const entry = parseFloat(v.entry) || 0, stop = parseFloat(v.stop) || 0;
    const target = parseFloat(v.target) || 0, size = parseFloat(v.size) || 0;
    const winRate = Math.min(100, Math.max(0, parseFloat(v.winRate) || 0));
    const risk = Math.abs(entry - stop), reward = Math.abs(target - entry);
    const rr = risk > 0 ? reward / risk : 0;
    const breakeven = rr > 0 ? 100 / (1 + rr) : 0;
    const potLoss = risk * size, potGain = reward * size;
    const expectancy = (winRate / 100) * potGain - (1 - winRate / 100) * potLoss;
    return { risk, reward, rr, breakeven, potLoss, potGain, expectancy, winRate, ruin: ruinApprox(winRate, rr, 1) };
  }, [v]);

  return (
    <Section icon={Scale} title={t('risk.rrTitle')} sub={t('risk.rrSub')}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field text={t('risk.fEntry')}><input className={input} type="number" step="any" value={v.entry} onChange={set('entry')} /></Field>
        <Field text={t('risk.fStopShort')}><input className={input} type="number" step="any" value={v.stop} onChange={set('stop')} /></Field>
        <Field text={t('risk.fTarget')}><input className={input} type="number" step="any" value={v.target} onChange={set('target')} /></Field>
        <Field text={t('risk.fSize')}><input className={input} type="number" step="any" value={v.size} onChange={set('size')} /></Field>
        <div className="col-span-2 sm:col-span-2">
          <label className={lab}>Win rate % {actuals ? <span className="font-normal">(your journal: {actuals.winRate}% over {actuals.totalTrades} trades)</span> : '(assumption)'}</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="100" step="1" value={v.winRate} onChange={set('winRate')} className="min-w-0 flex-1 accent-[#d4af37]" />
            <input className={`${input} w-20 shrink-0`} type="number" min="0" max="100" value={v.winRate} onChange={set('winRate')} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-[#d4af37]/30">
          <div className="text-center"><div className="font-mono text-2xl font-bold text-[#d4af37]">{r.rr.toFixed(2)}</div><div className="text-[10px] font-semibold text-[#8a8577]">R:R</div></div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2.5 min-[480px]:grid-cols-4">
          <Result l={t('risk.potLoss')} v={`-${money(r.potLoss, 0)}`} tone="text-red-400" />
          <Result l={t('risk.potGain')} v={`+${money(r.potGain, 0)}`} tone="text-emerald-400" />
          <Result l={t('risk.breakeven')} v={`${r.breakeven.toFixed(1)}%`} />
          <Result l="Expectancy / trade" v={`${r.expectancy >= 0 ? '+' : ''}${money(r.expectancy, 0)}`} tone={r.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
        <span className="text-[13px] text-[#8a8577]">Ruin estimate at 1% risk/trade <span className="text-[#6a665a]">(educational — assumes fixed size & win rate)</span></span>
        <span className={`ml-auto font-mono text-base font-bold ${r.ruin < 1 ? 'text-emerald-400' : r.ruin < 10 ? 'text-[#d4af37]' : 'text-red-400'}`}>{r.ruin < 0.05 ? '<0.05' : r.ruin.toFixed(1)}%</span>
      </div>
      {actuals && r.winRate < r.breakeven && (
        <p className="mt-3 text-[13px] text-[#d4af37]">⚠ Your journal win rate ({actuals.winRate}%) is below this setup's breakeven ({r.breakeven.toFixed(1)}%) — it needs a better entry, wider target, or no trade.</p>
      )}
    </Section>
  );
}

/* ── 3 · Drawdown guard (works for any account + funded rails) ────── */
function DrawdownGuard() {
  const { t } = useI18n();
  const [v, setV] = useState({ balance: '100000', peak: '105000', equity: '102000', dailyStart: '103000', maxDaily: '5', maxTotal: '10' });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const r = useMemo(() => {
    const bal = parseFloat(v.balance) || 0, peak = parseFloat(v.peak) || 0;
    const eq = parseFloat(v.equity) || 0, day0 = parseFloat(v.dailyStart) || 0;
    const maxD = parseFloat(v.maxDaily) || 0, maxT = parseFloat(v.maxTotal) || 0;
    const ddPct = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
    const dayLossPct = day0 > 0 ? ((day0 - eq) / day0) * 100 : 0;
    const roomTotal = bal * (maxT / 100) - (peak - eq);
    const roomDaily = day0 * (maxD / 100) - (day0 - eq);
    return { ddPct, dayLossPct, roomTotal, roomDaily };
  }, [v]);
  const tone = (used, max) => (max <= 0 ? 'text-[#8a8577]' : used / max >= 0.9 ? 'text-red-400' : used / max >= 0.7 ? 'text-[#d4af37]' : 'text-emerald-400');

  return (
    <Section icon={ShieldCheck} title={t('risk.guardTitle', null, 'Drawdown Guard')} sub={t('risk.guardSub', null, 'How much room is left before the rails — personal or funded')}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field text="Account size ($)"><input className={input} type="number" min="0" value={v.balance} onChange={set('balance')} /></Field>
        <Field text="Peak equity ($)"><input className={input} type="number" min="0" value={v.peak} onChange={set('peak')} /></Field>
        <Field text="Current equity ($)"><input className={input} type="number" min="0" value={v.equity} onChange={set('equity')} /></Field>
        <Field text="Day-start equity ($)"><input className={input} type="number" min="0" value={v.dailyStart} onChange={set('dailyStart')} /></Field>
        <Field text="Max daily loss %"><input className={input} type="number" min="0" step="0.1" value={v.maxDaily} onChange={set('maxDaily')} /></Field>
        <Field text="Max total loss %"><input className={input} type="number" min="0" step="0.1" value={v.maxTotal} onChange={set('maxTotal')} /></Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Result l="Drawdown used" v={`${Math.max(0, r.ddPct).toFixed(2)}%`} tone={tone(r.ddPct, parseFloat(v.maxTotal) || 0)} />
        <Result l="Daily loss used" v={`${Math.max(0, r.dayLossPct).toFixed(2)}%`} tone={tone(r.dayLossPct, parseFloat(v.maxDaily) || 0)} />
        <Result l="Room to max loss" v={money(Math.max(0, r.roomTotal), 0)} tone="text-[#f0ecdd]" />
        <Result l="Room today" v={money(Math.max(0, r.roomDaily), 0)} tone="text-[#f0ecdd]" />
      </div>
      <p className="mt-3 text-[13px] text-[#8a8577]">Funded rails preset: 5% daily / 10% total. Set both to your own numbers for personal accounts.</p>
    </Section>
  );
}

/* ── 4 · Portfolio heat ────────────────────────────────────────────── */
function PortfolioHeat() {
  const { t } = useI18n();
  const [rows, setRows] = useState([
    { sym: 'EURUSD', risk: 1.0 },
    { sym: 'GBPJPY', risk: 1.5 },
    { sym: 'BTCUSD', risk: 2.0 },
    { sym: 'AAPL', risk: 0.8 },
  ]);
  const total = rows.reduce((s, r) => s + (parseFloat(r.risk) || 0), 0);
  const update = (i, k, val) => setRows(rows.map((r, idx) => idx === i ? { ...r, [k]: val } : r));
  const barColor = (v) => (v || 0) <= 1 ? '#34d399' : (v || 0) <= 2 ? '#d4af37' : '#e06666';
  const level = total <= 4 ? { t: t('risk.healthy'), c: '#34d399' } : total <= 7 ? { t: t('risk.elevated'), c: '#d4af37' } : { t: t('risk.overexposed'), c: '#e06666' };
  return (
    <Section icon={Flame} title={t('risk.heatTitle')} sub={t('risk.heatSub')}>
      <div className="mb-2 grid grid-cols-[7rem_1fr_5.5rem_2.75rem] items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#8a8577] sm:grid-cols-[9rem_1fr_6.5rem_2.75rem]">
        <span>Symbol</span><span>Exposure</span><span className="text-right">Risk %</span><span />
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const v = parseFloat(r.risk) || 0;
          return (
            <div key={i} className="grid grid-cols-[7rem_1fr_5.5rem_2.75rem] items-center gap-2 sm:grid-cols-[9rem_1fr_6.5rem_2.75rem]">
              <input aria-label="Symbol" className={`${input} min-w-0 font-mono`} value={r.sym} onChange={(e) => update(i, 'sym', e.target.value.toUpperCase())} placeholder="EURUSD" />
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (v / 3) * 100)}%`, background: barColor(v) }} />
                </div>
                <span className="shrink-0 font-mono text-xs font-bold" style={{ color: barColor(v) }}>{v.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-2 focus-within:border-[#d4af37]/50">
                <input aria-label="Risk percent" className="w-full bg-transparent py-2.5 font-mono text-sm text-[#e9e7df] outline-none" type="number" min="0" max="100" step="0.1" value={r.risk} onChange={(e) => update(i, 'risk', e.target.value)} />
                <span className="shrink-0 font-mono text-xs text-[#8a8577]">%</span>
              </div>
              <button aria-label="Remove row" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="grid h-11 w-11 place-items-center rounded-xl text-[#8a8577] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
      <button onClick={() => setRows([...rows, { sym: '', risk: 1 }])} className="mt-3 inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-[#d4af37]/25 px-4 text-sm font-semibold text-[#d4af37]">
        <Plus className="h-4 w-4" /> Add position
      </button>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.05] px-4 py-3.5">
        <div className="flex items-center gap-2 text-sm text-[#c9c4b4]"><Target className="h-4 w-4 shrink-0 text-[#d4af37]" /> {t('risk.totalHeat')}</div>
        <div className="flex items-center gap-3"><span className="font-mono text-xl font-bold text-[#f0ecdd]">{total.toFixed(1)}%</span><span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${level.c}22`, color: level.c }}>{level.t}</span></div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#8a8577]">Rule of thumb: keep total heat under 4%. Correlated pairs (two JPY longs, two tech stocks) share the same risk — count them once, not twice.</p>
    </Section>
  );
}

export default function RiskToolsPage() {
  const { t } = useI18n();
  const { trades } = useTrades();
  const actuals = useMemo(() => {
    const s = computeStats(trades || []);
    if (!s || !s.totalTrades) return null;
    return { winRate: s.winRate, totalTrades: s.totalTrades, profitFactor: s.profitFactor };
  }, [trades]);

  return (
    <AppLayout title={t('risk.pageTitle')}>
      <div className="tb-page">
        <PageHero
          kickerIcon={ShieldCheck}
          kicker={t('risk.pageTitle')}
          title="Size every trade"
          accent="like a professional"
          subtitle="Live-price position sizing, payoff math against your real journal stats, drawdown rails, and portfolio heat — the four numbers that decide whether you survive."
          stats={actuals ? [
            { label: 'Journal win rate', value: `${actuals.winRate}%` },
            { label: 'Profit factor', value: actuals.profitFactor, color: '#d4af37' },
            { label: 'Trades', value: actuals.totalTrades },
          ] : []}
          actions={<GhostButton to="/app/journal" className="!px-4 !py-2 !text-xs"><History className="h-4 w-4" /> Log trades to sharpen these</GhostButton>}
        />
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <PositionSizer />
          <TradeEvaluator actuals={actuals} />
          <DrawdownGuard />
          <PortfolioHeat />
        </div>
        <Note icon={Wallet}>
          Calculators only — nothing here places orders. Live prices come from the same feeds as your charts; sizing math runs 100% in your browser and never leaves the page.
        </Note>
        <p className="text-center text-xs text-[#6a665a]">Evaluating for TradingBible Funded? The guard rails match the <Link to="/app/funded" className="font-semibold text-[#d4af37] hover:underline">program rulebook</Link>.</p>
      </div>
    </AppLayout>
  );
}
