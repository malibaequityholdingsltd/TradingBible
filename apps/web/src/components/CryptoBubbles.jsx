import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, Move3d, BarChart3, TrendingUp, TrendingDown, Flame, RefreshCw } from 'lucide-react';
import { useHeatmap } from '@/hooks/useHeatmap';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/lib/i18n';

// CryptoBubbles — cryptobubbles.net-style interactive 3D bubble visualization
// for every market (crypto, forex, commodities, sectors, stocks).
// Every asset is a draggable glossy 3D sphere: size tracks the move (or volume),
// color shows direction with intensity (green up / red down, brighter = bigger).
// Search fades non-matches, hover shows price/volume tooltip, click opens chart.

function bubbleFill(pct) {
  const cap = Math.min(Math.abs(pct) / 8, 1);
  const alpha = 0.30 + cap * 0.60;
  return pct >= 0 ? `rgba(52,211,153,${alpha.toFixed(2)})` : `rgba(224,102,102,${alpha.toFixed(2)})`;
}

function bubbleStroke(pct) {
  const cap = Math.min(Math.abs(pct) / 8, 1);
  if (cap < 0.55) return 'rgba(255,255,255,0.14)';
  return pct >= 0 ? 'rgba(52,211,153,0.75)' : 'rgba(224,102,102,0.75)';
}

function fmtPrice(n) {
  if (n == null) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtVol(qv) {
  if (!qv) return '—';
  if (qv >= 1e9) return `$${(qv / 1e9).toFixed(2)}B`;
  if (qv >= 1e6) return `$${(qv / 1e6).toFixed(1)}M`;
  if (qv >= 1e3) return `$${(qv / 1e3).toFixed(0)}K`;
  return `$${qv.toFixed(0)}`;
}

function radiusFor(cell, mode, volStats) {
  if (mode === 'volume') {
    const { min, max } = volStats;
    const v = Math.log10(Math.max(cell.quoteVolume || 0, 1));
    const t = max > min ? (v - min) / (max - min) : 0.5;
    return 24 + t * 60; // 24–84
  }
  const cap = Math.min(Math.abs(cell.changePercent || 0) / 8, 1);
  return 28 + cap * 52; // 28–80, bigger move = bigger bubble
}

export default function CryptoBubbles({ type = 'crypto', period, onSelect }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { cells, status, retry } = useHeatmap(type, period, 15000);
  const [mode, setMode] = useState('move'); // 'move' | 'volume'
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState(null); // {cell, x, y}
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const nodesRef = useRef(new Map());
  const [, force] = useState(0);

  const volStats = useMemo(() => {
    const logs = cells.map((c) => Math.log10(Math.max(c.quoteVolume || 0, 1)));
    return { min: Math.min(...logs, 0), max: Math.max(...logs, 1) };
  }, [cells]);

  const q = query.trim().toLowerCase();
  const matchSet = useMemo(() => {
    if (!q) return null;
    return new Set(cells.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).map((c) => c.symbol));
  }, [cells, q]);

  // Measure container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(300, r.width), h: 520 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync nodes with fresh cells (keep positions across refreshes).
  useEffect(() => {
    const map = nodesRef.current;
    const seen = new Set();
    cells.forEach((c) => {
      seen.add(c.symbol);
      const r = radiusFor(c, mode, volStats);
      const n = map.get(c.symbol);
      if (n) { n.cell = c; n.r = r; }
      else {
        map.set(c.symbol, {
          cell: c, r,
          x: Math.random() * size.w, y: Math.random() * size.h,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        });
      }
    });
    [...map.keys()].forEach((k) => { if (!seen.has(k)) map.delete(k); });
  }, [cells, mode, volStats, size.w, size.h]);

  // Physics loop: gentle drift + collision + centering + damping + bounds.
  useEffect(() => {
    let raf;
    const step = () => {
      const map = nodesRef.current;
      const nodes = [...map.values()];
      const cx = size.w / 2; const cy = size.h / 2;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.drag) continue;
        a.vx += (cx - a.x) * 0.0016;
        a.vy += (cy - a.y) * 0.0016;
        // Slight float so the field feels alive.
        a.vx += (Math.random() - 0.5) * 0.05;
        a.vy += (Math.random() - 0.5) * 0.05;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (b.drag) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const min = a.r + b.r + 6;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < min * min) {
            const d = Math.sqrt(d2);
            const push = ((min - d) / d) * 0.06;
            a.vx -= dx * push; a.vy -= dy * push;
            b.vx += dx * push; b.vy += dy * push;
          }
        }
      }
      nodes.forEach((n) => {
        if (n.drag) return;
        n.vx *= 0.92; n.vy *= 0.92;
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.r) { n.x = n.r; n.vx *= -0.6; }
        if (n.x > size.w - n.r) { n.x = size.w - n.r; n.vx *= -0.6; }
        if (n.y < n.r) { n.y = n.r; n.vy *= -0.6; }
        if (n.y > size.h - n.r) { n.y = size.h - n.r; n.vy *= -0.6; }
      });
      force((f) => f + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h]);

  const toLocal = useCallback((e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e, node) => {
    e.stopPropagation();
    node.drag = true;
    const move = (ev) => {
      const p = toLocal(ev);
      node.x = Math.max(node.r, Math.min(size.w - node.r, p.x));
      node.y = Math.max(node.r, Math.min(size.h - node.r, p.y));
      node.vx = 0; node.vy = 0;
    };
    const up = () => {
      node.drag = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [toLocal, size.w]);

  const stats = useMemo(() => {
    if (!cells.length) return { gainer: null, loser: null, active: null };
    const byPct = [...cells].sort((a, b) => b.changePercent - a.changePercent);
    const byVol = [...cells].sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
    return { gainer: byPct[0], loser: byPct[byPct.length - 1], active: byVol[0] };
  }, [cells]);

  const nodes = [...nodesRef.current.values()];
  const labelColor = isLight ? '#2d3440' : '#ffffff';

  return (
    <div>
      {/* Controls: search + size mode */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8577]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('hm.searchPh', null, `Search ${type}…`)}
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none placeholder:text-[#5f5b50] focus:border-[#d4af37]/40"
          />
        </div>
        <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/15">
          <button
            onClick={() => setMode('move')}
            title={t('hm.sizeMove', null, 'Bubble size = move size')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${mode === 'move' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
          >
            <Move3d className="h-3.5 w-3.5" />{t('hm.move', null, 'Move')}
          </button>
          <button
            onClick={() => setMode('volume')}
            title={t('hm.sizeVol', null, 'Bubble size = 24h volume')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${mode === 'volume' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
          >
            <BarChart3 className="h-3.5 w-3.5" />{t('hm.volume', null, 'Volume')}
          </button>
        </div>
        <span className={`ml-auto flex items-center gap-1.5 text-[11px] text-[#8a8577]`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ready' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-[#d4af37]'}`} />
          {t('hm.live15s', null, 'Live · refreshes every 15s')}
        </span>
      </div>

      {/* Movers strip */}
      {cells.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, label: t('hm.topGainer', null, 'Top gainer'), cell: stats.gainer, cls: 'text-emerald-400' },
            { icon: TrendingDown, label: t('hm.topLoser', null, 'Top loser'), cell: stats.loser, cls: 'text-red-400' },
            { icon: Flame, label: t('hm.mostActive', null, 'Most active'), cell: stats.active, cls: 'text-[#d4af37]' },
          ].map(({ icon: Icon, label, cell, cls }) => (
            <button
              key={label}
              onClick={() => cell && onSelect?.(cell)}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[#d4af37]/12 bg-white/[0.02] px-3 py-2 text-left transition hover:border-[#d4af37]/40"
            >
              <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] uppercase tracking-wider text-[#8a8577]">{label}</span>
                <span className="block truncate font-mono text-xs font-semibold text-[#f0ecdd]">
                  {cell ? `${cell.symbol.replace('USD', '')} ${cell.changePercent >= 0 ? '+' : ''}${cell.changePercent}%` : '—'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bubble field */}
      <div ref={wrapRef} className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-[#d4af37]/10" style={{ height: 520 }}>
        <div className="pointer-events-none absolute inset-0 grain opacity-20" />
        {status === 'loading' && !cells.length ? (
          <div className="grid h-full place-items-center text-sm text-[#8a8577]">{t('mkt.loadingHeat')}</div>
        ) : status === 'error' && !cells.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-xs text-sm text-[#8a8577]">{t('mkt.heatFail', null, 'Could not load market data. Start the API server, then retry.')}</p>
            <button onClick={retry} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-xs font-semibold text-[#d4af37] transition hover:border-[#d4af37]/60"><RefreshCw className="h-3.5 w-3.5" />{t('c.retry', null, 'Retry')}</button>
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`}>
            <defs>
              {/* 3D sphere shading: clear center → darkened rim */}
              <radialGradient id="bbShade" cx="50%" cy="42%" r="72%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
                <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
              </radialGradient>
              <radialGradient id="bbGloss" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            {nodes.map((n) => {
              const dim = matchSet && !matchSet.has(n.cell.symbol);
              const big = Math.abs(n.cell.changePercent) >= 5;
              const fontSize = Math.max(10, Math.min(15, n.r / 4.2));
              const isHover = hover?.cell.symbol === n.cell.symbol;
              return (
                <g
                  key={n.cell.symbol}
                  transform={`translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`}
                  opacity={dim ? 0.14 : 1}
                  style={{ cursor: 'grab', transition: 'opacity .25s' }}
                  onPointerDown={(e) => onPointerDown(e, n)}
                  onClick={() => onSelect?.(n.cell)}
                  onMouseEnter={(e) => { const p = toLocal(e); setHover({ cell: n.cell, x: p.x, y: p.y }); }}
                  onMouseMove={(e) => { const p = toLocal(e); setHover({ cell: n.cell, x: p.x, y: p.y }); }}
                  onMouseLeave={() => setHover(null)}
                >
                  <g transform={isHover ? 'scale(1.07)' : undefined} style={{ transition: 'transform .18s ease-out' }}>
                    {big && !dim && (
                      <circle r={n.r + 5} fill="none" stroke={bubbleStroke(n.cell.changePercent)} strokeWidth="1.5" opacity="0.45" />
                    )}
                    {/* sphere body */}
                    <circle r={n.r} fill={bubbleFill(n.cell.changePercent)} />
                    <circle r={n.r} fill="url(#bbShade)" />
                    {/* bounced floor light */}
                    <ellipse cx={0} cy={n.r * 0.58} rx={n.r * 0.52} ry={n.r * 0.15} fill="rgba(255,255,255,0.10)" />
                    {/* glossy highlight */}
                    <ellipse cx={-n.r * 0.33} cy={-n.r * 0.42} rx={n.r * 0.30} ry={n.r * 0.17} fill="url(#bbGloss)" opacity="0.55" transform={`rotate(-18)`} />
                    {/* rim */}
                    <circle r={n.r} fill="none" stroke={bubbleStroke(n.cell.changePercent)} strokeWidth="1.2" />
                    <text textAnchor="middle" dy={-2} fill={labelColor} fontSize={fontSize} fontWeight="800" fontFamily="JetBrains Mono, monospace" pointerEvents="none">
                      {n.cell.symbol.replace('USD', '')}
                    </text>
                    <text textAnchor="middle" dy={fontSize + 2} fill={labelColor} fontSize={Math.max(9, fontSize - 3)} fontWeight="600" fontFamily="JetBrains Mono, monospace" opacity="0.85" pointerEvents="none">
                      {n.cell.changePercent >= 0 ? '+' : ''}{n.cell.changePercent}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}
        {/* Hover tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 min-w-[160px] rounded-xl border border-[#d4af37]/25 bg-[#0d0d12]/95 p-3 shadow-xl backdrop-blur"
            style={{ left: Math.min(hover.x + 16, size.w - 180), top: Math.max(hover.y - 20, 8) }}
          >
            <div className="font-mono text-sm font-bold text-[#f0ecdd]">{hover.cell.symbol.replace('USD', '')} <span className="font-normal text-[#8a8577]">· {hover.cell.name}</span></div>
            <div className="mt-1 font-mono text-xs text-[#c9c4b4]">${fmtPrice(hover.cell.price)}</div>
            <div className={`font-mono text-xs font-semibold ${hover.cell.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {hover.cell.changePercent >= 0 ? '+' : ''}{hover.cell.changePercent}% · {period}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[#8a8577]">{type === 'crypto' ? 'Vol 24h' : 'Activity'}: {fmtVol(hover.cell.quoteVolume)}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8a8577]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(52,211,153,0.8)' }} />{t('hm.up', null, 'Up')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(224,102,102,0.8)' }} />{t('hm.down', null, 'Down')}</span>
        <span>{t('hm.legendSize', null, 'Size = move (or volume in Volume mode) · brighter = bigger move · drag to move')}</span>
      </div>
    </div>
  );
}
