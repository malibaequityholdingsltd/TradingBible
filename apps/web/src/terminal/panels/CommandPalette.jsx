// Command palette — terminal-local. Searches instruments, jumps pages,
// switches timeframe, opens brokers, loads desks. Does NOT replace GlobalSearch.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ALL_SYMBOLS } from '@/lib/symbols';
import { DESK_PRESETS } from '@/terminal/premiumStore';

const PAGES = [
  ['Terminal Pro', '/app/terminal-pro'], ['Order Flow', '/app/orderflow'], ['Heatmaps', '/app/heatmaps'],
  ['Journal', '/app/journal'], ['Backtest', '/app/backtest'], ['Paper', '/app/paper'],
  ['Challenges', '/app/challenges'], ['Brokers', '/app/brokers'], ['Funded', '/app/funded'],
];

export default function CommandPalette({ open, onClose, onSymbol, onTimeframe, onDesk }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const syms = ALL_SYMBOLS.filter((x) => `${x.symbol} ${x.name}`.toLowerCase().includes(s)).slice(0, 6)
      .map((x) => ({ kind: 'symbol', label: `${x.symbol} — ${x.name}`, run: () => onSymbol(x.symbol) }));
    const tfs = ['1m', '5m', '15m', '1h', '4h', '1d'].filter((t) => t.includes(s))
      .map((t) => ({ kind: 'tf', label: `Timeframe ${t}`, run: () => onTimeframe(t) }));
    const desks = Object.entries(DESK_PRESETS).filter(([, d]) => d.name.toLowerCase().includes(s))
      .map(([id, d]) => ({ kind: 'desk', label: `Load ${d.name}`, run: () => onDesk(id) }));
    const pages = PAGES.filter(([n]) => n.toLowerCase().includes(s))
      .map(([n, to]) => ({ kind: 'page', label: `Go to ${n}`, run: () => nav(to) }));
    return [...syms, ...tfs, ...desks, ...pages].slice(0, 12);
  }, [q, onSymbol, onTimeframe, onDesk, nav]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-[#d4af37]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Symbol, timeframe, desk, page…"
            className="w-full bg-transparent text-sm text-[#f0ecdd] outline-none placeholder:text-[#5f5b50]" />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.map((r, i) => (
            <button key={i} onClick={() => { r.run(); onClose(); setQ(''); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#e9e7df] hover:bg-[#d4af37]/10">
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#8a8577]">{r.kind}</span>{r.label}
            </button>
          ))}
          {q && !results.length && <p className="px-3 py-4 text-center text-xs text-[#5f5b50]">No matches</p>}
        </div>
      </div>
    </div>
  );
}
