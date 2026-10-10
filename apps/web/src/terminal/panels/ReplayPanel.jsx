// Replay Panel — step through loaded candles, paper-only simulation.
// Replay trades go to a SEPARATE practice journal (localStorage), never the
// real journal or ledger.
import React, { useMemo, useState } from 'react';
import { Play, Pause, StepForward, StepBack, RotateCcw } from 'lucide-react';
import { useCandles } from '@/hooks/useCandles';

const LS_REPLAY = 'tb:replay-journal:v1';
const btn = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-[#8a8577] hover:text-[#e9e7df]';

export default function ReplayPanel({ symbol, timeframe }) {
  const { candles, status } = useCandles(symbol, timeframe, { limit: 200, refreshMs: 60000 });
  const [cursor, setCursor] = useState(40);
  const [playing, setPlaying] = useState(false);
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_REPLAY) || '[]'); } catch { return []; }
  });

  const visible = useMemo(() => candles.slice(0, Math.max(1, Math.min(cursor, candles.length))), [candles, cursor]);
  const last = visible[visible.length - 1];

  React.useEffect(() => {
    if (!playing || !candles.length) return undefined;
    const id = setInterval(() => setCursor((c) => (c >= candles.length ? candles.length : c + 1)), 1200);
    return () => clearInterval(id);
  }, [playing, candles.length]);

  const sim = (side) => {
    if (!last) return;
    const entry = { id: `${Date.now()}`, symbol, side, price: last.close, time: last.time || Date.now(), practice: true };
    const next = [entry, ...log].slice(0, 100);
    setLog(next);
    try { localStorage.setItem(LS_REPLAY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <div className="term-inset rounded-xl border border-white/8 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="term-label text-[#d4af37]">Replay · {symbol} · {timeframe}</span>
        <span className="term-data font-mono text-xs text-[#8a8577]">{status === 'ready' ? `${visible.length} of ${candles.length} candles` : status}</span>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Step back" onClick={() => setCursor((c) => Math.max(1, c - 1))} className={btn}><StepBack className="h-4 w-4" /></button>
        <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d4af37]/40 text-[#d4af37]"><span>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span></button>
        <button aria-label="Step forward" onClick={() => setCursor((c) => Math.min(candles.length, c + 1))} className={btn}><StepForward className="h-4 w-4" /></button>
        <button aria-label="Restart" onClick={() => { setCursor(40); setPlaying(false); }} className={btn}><RotateCcw className="h-4 w-4" /></button>
        <input type="range" aria-label="Replay position" min="1" max={Math.max(1, candles.length)} value={Math.min(cursor, Math.max(1, candles.length))}
          onChange={(e) => setCursor(Number(e.target.value))} className="ml-1 min-w-0 flex-1 accent-[#d4af37]" />
      </div>
      {last && <p className="term-data mt-2.5 font-mono text-[13px] text-[#e9e7df]">O {last.open} · H {last.high} · L {last.low} · C {last.close}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button onClick={() => sim('buy')} className="min-h-[44px] rounded-xl bg-emerald-500/15 text-sm font-bold text-emerald-400">SIM BUY</button>
        <button onClick={() => sim('sell')} className="min-h-[44px] rounded-xl bg-red-500/15 text-sm font-bold text-red-400">SIM SELL</button>
      </div>
      <p className="term-help term-faint mt-2.5">Practice journal ({log.length} sim trades) — fully separate from real trades.</p>
    </div>
  );
}
