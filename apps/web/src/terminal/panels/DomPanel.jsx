// DOM / Ladder — honest depth + gated execution.
// Shows an indicative ladder centered on the live quote (mid-price ± ticks)
// because most spot/CFD feeds expose L1 only. One-click execution appears
// ONLY for paper accounts; live providers stay read-only until an
// authorized order router exists. Never fakes a fill.
import React, { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

function tickFor(p) {
  if (!Number.isFinite(p) || p <= 0) return 1;
  const raw = p / 200;
  const steps = [1, 2, 2.5, 5, 10];
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  for (const s of steps) if (s * base >= raw) return s * base;
  return 10 * base;
}

export default function DomPanel({ symbol, price, onPaperOrder, compact = false }) {
  const [qty, setQty] = useState('0.10');
  const count = compact ? 7 : 11;
  const midIdx = Math.floor(count / 2);
  const rows = useMemo(() => {
    const mid = Number(price) || 0;
    if (!mid) return [];
    const tick = tickFor(mid);
    return Array.from({ length: count }, (_, i) => {
      const p = mid + (midIdx - i) * tick;
      // Depth bars are an illustrative distribution around mid (no L2 feed).
      const depth = Math.max(6, 100 - Math.abs(midIdx - i) * 16);
      return { price: p, depth, side: i < midIdx ? 'ask' : i > midIdx ? 'bid' : 'mid' };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, count]);

  return (
    <div className={compact ? '' : 'term-inset rounded-xl border border-white/8 p-4'}>
      {!compact && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="term-label text-[#d4af37]">DOM · {symbol}</span>
          <span className="term-faint flex items-center gap-1 text-xs"><Lock className="h-3.5 w-3.5" /> L1 quote · ladder indicative</span>
        </div>
      )}
      <div className="mb-2.5 flex items-center gap-2.5">
        <label className="term-faint text-xs font-semibold">Size
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="0" step="0.01"
            className="ml-2 w-28 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50" />
        </label>
        {compact && <span className="term-faint ml-auto flex items-center gap-1 text-xs"><Lock className="h-3.5 w-3.5" /> indicative</span>}
      </div>
      <div className="term-data space-y-1 font-mono text-[13px]">
        {rows.length === 0 && <p className="term-help term-faint">Waiting for a live quote…</p>}
        {rows.map((r, i) => (
          <div key={i} className={`relative flex min-h-[40px] items-center justify-between gap-2 overflow-hidden rounded-lg px-3 py-1.5 ${r.side === 'mid' ? 'bg-[#d4af37]/15 font-bold text-[#d4af37]' : 'text-[#c9c4b4]'}`}>
            <span className="absolute inset-y-0 left-0 opacity-20" style={{ width: `${r.depth}%`, background: r.side === 'ask' ? '#fb7185' : r.side === 'bid' ? '#34d399' : '#d4af37' }} />
            <span className="relative">{r.price.toFixed(2)}</span>
            <span className="relative">
              {r.side !== 'mid' && onPaperOrder ? (
                <button onClick={() => onPaperOrder({ symbol, side: r.side === 'ask' ? 'sell' : 'buy', price: r.price, qty: Number(qty) || 0 })}
                  className={`min-h-[32px] rounded-lg px-3 text-xs font-bold ${r.side === 'ask' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {r.side === 'ask' ? 'SELL' : 'BUY'}
                </button>
              ) : <span className="term-faint text-xs font-semibold">{r.side === 'mid' ? 'MID' : r.side.toUpperCase()}</span>}
            </span>
          </div>
        ))}
      </div>
      <p className="term-help term-faint mt-2.5">
        {onPaperOrder ? 'Paper simulator — fills at your quoted price with slippage. Live routers stay read-only.' : 'Read-only. Connect a supported router to enable execution.'}
      </p>
    </div>
  );
}
