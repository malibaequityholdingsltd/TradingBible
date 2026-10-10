// Risk Panel — pre-order calculator. Pure math; submits nothing.
import React, { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { calcRisk, checkAccountRules } from '@/terminal/riskEngine';

const input = 'mt-1 w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50';
const lab = 'term-faint text-xs font-semibold';

export default function RiskPanel({ price, balance = 0 }) {
  const [riskPct, setRiskPct] = useState('1');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');

  const r = useMemo(() => calcRisk({
    balance, riskPct: Number(riskPct) || 0,
    entry: Number(price) || 0, stop: Number(stop) || 0, target: Number(target) || 0,
  }), [balance, riskPct, price, stop, target]);

  const warnings = checkAccountRules({ riskPct, qty: r.qty, balance, rules: { maxRiskPct: 2 } });
  const cells = [
    ['Position size', r.qty || '—', 'text-[#f0ecdd]'],
    ['Reward : risk', r.rr || '—', 'text-[#d4af37]'],
    ['Risk amount', `-$${r.riskMoney}`, 'text-red-400'],
    ['Max loss', `-$${r.maxLoss}`, 'text-red-400'],
    ['Max gain', `+$${r.maxGain}`, 'text-emerald-400'],
    ['Stop distance', r.slDist || '—', 'text-[#e9e7df]'],
  ];

  return (
    <div className="term-inset rounded-xl border border-white/8 p-4">
      <div className="term-label mb-3 flex items-center gap-1.5 text-[#d4af37]">
        <ShieldAlert className="h-4 w-4" /> Risk engine
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={lab}>Entry (live)<input className={input} value={price ?? ''} readOnly /></label>
        <label className={lab}>Balance<input className={input} value={balance} readOnly /></label>
        <label className={lab}>Risk %<input className={input} type="number" min="0" max="100" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} /></label>
        <label className={lab}>Stop price<input className={input} type="number" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="SL price" /></label>
        <label className={`${lab} col-span-2`}>Target price<input className={input} type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="TP price" /></label>
      </div>
      <div className="term-data mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cells.map(([k, v, tone]) => (
          <div key={k} className="rounded-lg bg-black/25 px-2.5 py-2">
            <div className="term-faint font-sans text-[11px] font-semibold uppercase tracking-wide">{k}</div>
            <div className={`mt-0.5 font-mono text-sm font-bold ${tone}`}>{v}</div>
          </div>
        ))}
      </div>
      {warnings.map((w) => <p key={w} className="term-help mt-2 text-[#d4af37]">⚠ {w}</p>)}
      <p className="term-help term-faint mt-2">Calculator only — orders route through your connected broker or firm.</p>
    </div>
  );
}
