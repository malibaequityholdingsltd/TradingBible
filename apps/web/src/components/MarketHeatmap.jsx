import React, { useRef, useCallback } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useHeatmap } from '@/hooks/useHeatmap';

const PERIODS = ['1h', '4h', '1d', '1w', '1M'];
const CATEGORIES = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'forex', label: 'Forex' },
  { id: 'commodity', label: 'Commodities' },
  { id: 'sector', label: 'Sectors' },
  { id: 'stock', label: 'Stocks' },
];

function cellColor(pct) {
  const cap = Math.min(Math.abs(pct) / 8, 1); // 8% saturates
  const alpha = 0.18 + cap * 0.62;
  return pct >= 0 ? `rgba(52,211,153,${alpha})` : `rgba(224,102,102,${alpha})`;
}

function fmtPrice(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export default function MarketHeatmap({ type, setType, period, setPeriod, onSelect, showCategoryTabs = true }) {
  const { cells, status } = useHeatmap(type, period);
  const gridRef = useRef(null);

  const exportImage = useCallback(() => {
    const cols = Math.min(cells.length, type === 'stock' ? 10 : 5);
    const rows = Math.ceil(cells.length / cols);
    const cw = 150, ch = 84, pad = 8;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cw + pad * 2;
    canvas.height = rows * ch + pad * 2 + 30;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d4af37'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${type.toUpperCase()} Heatmap · ${period}`, pad, 22);
    cells.forEach((c, i) => {
      const x = pad + (i % cols) * cw; const y = 30 + pad + Math.floor(i / cols) * ch;
      ctx.fillStyle = cellColor(c.changePercent); ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      ctx.fillStyle = '#f0ecdd'; ctx.font = 'bold 14px monospace'; ctx.fillText(c.symbol, x + 10, y + 26);
      ctx.font = '12px monospace'; ctx.fillStyle = '#c9c4b4'; ctx.fillText(fmtPrice(c.price), x + 10, y + 46);
      ctx.fillStyle = c.changePercent >= 0 ? '#34d399' : '#e06666';
      ctx.fillText(`${c.changePercent >= 0 ? '+' : ''}${c.changePercent}%`, x + 10, y + 66);
    });
    const a = document.createElement('a');
    a.download = `${type}_heatmap_${period}.png`; a.href = canvas.toDataURL('image/png'); a.click();
  }, [cells, type, period]);

  const gridCols = type === 'stock'
    ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10'
    : type === 'crypto'
      ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {showCategoryTabs && (
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setType(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${type === c.id ? 'bg-[#d4af37]/18 text-[#d4af37]' : 'border border-[#d4af37]/12 text-[#8a8577] hover:text-[#e9e7df]'}`}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs transition ${period === p ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{p}</button>
            ))}
          </div>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ready' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-[#d4af37]'}`} />
          <button onClick={exportImage} title="Export image" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><Download className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {status === 'loading' && !cells.length ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading heatmap…</div>
      ) : (
        <div ref={gridRef} className={`grid gap-2 ${gridCols}`}>
          {cells.map((c) => (
            <button key={c.symbol} onClick={() => onSelect?.(c)} title={`${c.name}\n${fmtPrice(c.price)}  ${c.changePercent >= 0 ? '+' : ''}${c.changePercent}% (${c.changeAmount >= 0 ? '+' : ''}${c.changeAmount})`}
              className="group flex aspect-[4/3] flex-col justify-between rounded-lg p-2 text-left transition hover:ring-1 hover:ring-[#d4af37]/60" style={{ background: cellColor(c.changePercent) }}>
              <div>
                <div className="font-mono text-xs font-bold text-[#f5f2e8]">{c.symbol}</div>
                <div className="truncate text-[9px] text-[#f0ecdd]/70">{c.name}</div>
              </div>
              <div>
                <div className="font-mono text-[11px] text-[#f5f2e8]">{fmtPrice(c.price)}</div>
                <div className={`font-mono text-xs font-semibold ${c.changePercent >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>{c.changePercent >= 0 ? '+' : ''}{c.changePercent}%</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
