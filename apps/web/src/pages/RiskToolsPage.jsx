import React, { useMemo, useState } from 'react';
import { Calculator, Scale, Flame, Target } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const input = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';
const label = 'mb-1.5 block text-xs text-[#8a8577]';

function Field({ children, text }) {
  return <div><label className={label}>{text}</label>{children}</div>;
}

function Section({ icon: Icon, title, sub, children }) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-5 w-5" /></div>
        <div><h3 className="font-semibold text-[#f0ecdd]">{title}</h3><p className="text-xs text-[#8a8577]">{sub}</p></div>
      </div>
      {children}
    </div>
  );
}

function PositionSizer() {
  const [v, setV] = useState({ balance: 100000, riskPct: 1, entry: 100, stop: 98 });
  const set = (k) => (e) => setV({ ...v, [k]: parseFloat(e.target.value) || 0 });
  const r = useMemo(() => {
    const riskAmt = v.balance * (v.riskPct / 100);
    const perUnit = Math.abs(v.entry - v.stop);
    const units = perUnit > 0 ? riskAmt / perUnit : 0;
    return { riskAmt, perUnit, units, notional: units * v.entry };
  }, [v]);
  return (
    <Section icon={Calculator} title="Position Size Calculator" sub="How many units to trade for a fixed risk">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field text="Account balance ($)"><input className={input} type="number" value={v.balance} onChange={set('balance')} /></Field>
        <Field text="Risk per trade (%)"><input className={input} type="number" step="0.1" value={v.riskPct} onChange={set('riskPct')} /></Field>
        <Field text="Entry price"><input className={input} type="number" step="any" value={v.entry} onChange={set('entry')} /></Field>
        <Field text="Stop-loss price"><input className={input} type="number" step="any" value={v.stop} onChange={set('stop')} /></Field>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'Risk amount', v: `$${r.riskAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { l: 'Risk / unit', v: `$${r.perUnit.toFixed(2)}` },
          { l: 'Position size', v: `${r.units.toLocaleString(undefined, { maximumFractionDigits: 2 })} u` },
          { l: 'Notional', v: `$${r.notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ].map((o) => (
          <div key={o.l} className="rounded-xl bg-[#d4af37]/[0.06] p-3 text-center">
            <div className="text-[10px] uppercase tracking-wide text-[#8a8577]">{o.l}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-[#d4af37]">{o.v}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RiskReward() {
  const [v, setV] = useState({ entry: 100, stop: 98, target: 106, size: 100 });
  const set = (k) => (e) => setV({ ...v, [k]: parseFloat(e.target.value) || 0 });
  const r = useMemo(() => {
    const risk = Math.abs(v.entry - v.stop);
    const reward = Math.abs(v.target - v.entry);
    const rr = risk > 0 ? reward / risk : 0;
    const breakeven = rr > 0 ? 100 / (1 + rr) : 0;
    return { risk, reward, rr, breakeven, potLoss: risk * v.size, potGain: reward * v.size };
  }, [v]);
  return (
    <Section icon={Scale} title="Risk / Reward Calculator" sub="Evaluate the payoff before you enter">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field text="Entry price"><input className={input} type="number" step="any" value={v.entry} onChange={set('entry')} /></Field>
        <Field text="Stop-loss"><input className={input} type="number" step="any" value={v.stop} onChange={set('stop')} /></Field>
        <Field text="Target price"><input className={input} type="number" step="any" value={v.target} onChange={set('target')} /></Field>
        <Field text="Position size (units)"><input className={input} type="number" step="any" value={v.size} onChange={set('size')} /></Field>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-[#d4af37]/30">
          <div className="text-center"><div className="font-mono text-xl font-bold text-[#d4af37]">{r.rr.toFixed(2)}</div><div className="text-[10px] text-[#8a8577]">R:R</div></div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-red-400/10 p-3 text-center"><div className="text-[10px] uppercase text-[#8a8577]">Potential loss</div><div className="mt-1 font-mono text-sm font-semibold text-red-400">-${r.potLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
          <div className="rounded-xl bg-emerald-400/10 p-3 text-center"><div className="text-[10px] uppercase text-[#8a8577]">Potential gain</div><div className="mt-1 font-mono text-sm font-semibold text-emerald-400">+${r.potGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
          <div className="rounded-xl bg-[#d4af37]/[0.06] p-3 text-center"><div className="text-[10px] uppercase text-[#8a8577]">Breakeven win %</div><div className="mt-1 font-mono text-sm font-semibold text-[#d4af37]">{r.breakeven.toFixed(1)}%</div></div>
        </div>
      </div>
    </Section>
  );
}

function PortfolioHeat() {
  const [rows, setRows] = useState([
    { sym: 'EURUSD', risk: 1.0, corr: 'FX' },
    { sym: 'GBPJPY', risk: 1.5, corr: 'FX' },
    { sym: 'BTCUSD', risk: 2.0, corr: 'Crypto' },
    { sym: 'AAPL', risk: 0.8, corr: 'Equity' },
  ]);
  const total = rows.reduce((s, r) => s + (r.risk || 0), 0);
  const update = (i, k, val) => setRows(rows.map((r, idx) => idx === i ? { ...r, [k]: k === 'risk' ? parseFloat(val) || 0 : val } : r));
  const level = total <= 4 ? { t: 'Healthy', c: '#34d399' } : total <= 7 ? { t: 'Elevated', c: '#d4af37' } : { t: 'Overexposed', c: '#e06666' };
  return (
    <Section icon={Flame} title="Portfolio Heat Map" sub="Total open risk across positions (% of account)">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <input className={`${input} w-24 sm:w-32`} value={r.sym} onChange={(e) => update(i, 'sym', e.target.value)} />
            <div className="h-2.5 flex-1 rounded-full bg-white/8">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.risk / 3) * 100)}%`, background: r.risk <= 1 ? '#34d399' : r.risk <= 2 ? '#d4af37' : '#e06666' }} />
            </div>
            <input className={`${input} w-16 text-right`} type="number" step="0.1" value={r.risk} onChange={(e) => update(i, 'risk', e.target.value)} />
            <span className="w-14 text-right text-xs text-[#8a8577]">{r.corr}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.05] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[#c9c4b4]"><Target className="h-4 w-4 text-[#d4af37]" /> Total portfolio heat</div>
        <div className="flex items-center gap-3"><span className="font-mono text-lg font-bold text-[#f0ecdd]">{total.toFixed(1)}%</span><span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${level.c}22`, color: level.c }}>{level.t}</span></div>
      </div>
    </Section>
  );
}

export default function RiskToolsPage() {
  return (
    <AppLayout title="Risk Management Tools">
      <div className="grid gap-5 xl:grid-cols-2">
        <PositionSizer />
        <RiskReward />
        <div className="xl:col-span-2"><PortfolioHeat /></div>
      </div>
    </AppLayout>
  );
}
