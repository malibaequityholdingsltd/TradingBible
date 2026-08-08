import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { CandlestickChart, LineChart as LineIcon, BarChart3, AreaChart as AreaIcon, ZoomIn, ZoomOut, Maximize2, Minimize2, Download, RotateCcw, Plus, X } from 'lucide-react';
import { INDICATOR_DEFS } from '@/lib/indicators';

const GOLD = '#d4af37';
const GREEN = '#34d399';
const RED = '#e06666';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
const CHART_TYPES = [
  { id: 'candle', label: 'Candles', icon: CandlestickChart },
  { id: 'line', label: 'Line', icon: LineIcon },
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'area', label: 'Area', icon: AreaIcon },
];

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// A single fully interactive chart: candle/line/bar/area, overlays + sub-panes,
// crosshair, wheel-zoom, drag-pan, and PNG export.
export default function AdvancedChart({
  symbol, candles, chartType, timeframe, indicators = [], compact = false,
  onChartType, onTimeframe, onOpenIndicators, onRemoveIndicator,
  fullscreen = false, onToggleFullscreen, showControls = true,
}) {
  const GRID = '#1c1c22';
  const TXT = '#6a665a';
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: compact ? 260 : 460 });
  const [view, setView] = useState(null); // {start,end} index window
  const [hover, setHover] = useState(null); // index
  const drag = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setDims({ w: Math.max(320, rect.width), h: fullscreen ? Math.max(420, window.innerHeight - 220) : (compact ? 240 : 440) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, fullscreen]);

  // Default view = all candles; reset when data length changes materially.
  useEffect(() => {
    if (candles.length) setView({ start: 0, end: candles.length - 1 });
  }, [candles.length, symbol, timeframe]);

  const subPanes = useMemo(() => indicators.filter((i) => INDICATOR_DEFS[i.type]?.pane === 'sub'), [indicators]);
  const overlays = useMemo(() => indicators.filter((i) => INDICATOR_DEFS[i.type]?.pane === 'price'), [indicators]);

  const computed = useMemo(() => {
    const map = {};
    indicators.forEach((ind) => {
      const def = INDICATOR_DEFS[ind.type];
      if (!def) return;
      const params = { ...def.defaults, ...ind.params };
      Object.assign(map, def.compute(candles, params));
    });
    return map;
  }, [indicators, candles]);

  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = dims.w * scale; canvas.height = dims.h * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `${symbol}_${timeframe}_chart.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  }, [dims, symbol, timeframe]);

  if (!candles.length || !view) {
    return <div ref={wrapRef} className="grid h-64 place-items-center text-sm text-[#8a8577]">Loading chart data…</div>;
  }

  const start = Math.max(0, Math.min(view.start, candles.length - 2));
  const end = Math.max(start + 1, Math.min(view.end, candles.length - 1));
  const visible = candles.slice(start, end + 1);
  const n = visible.length;

  const padL = 8;
  const padR = 58;
  const padT = 10;
  const volH = compact ? 34 : 56;
  const subPaneH = compact ? 70 : 96;
  const totalSubH = subPanes.length * subPaneH;
  const priceH = Math.max(120, dims.h - padT - volH - totalSubH - 24);
  const plotW = dims.w - padL - padR;

  // Price scale considers candles + visible overlay values.
  let hi = -Infinity, lo = Infinity;
  visible.forEach((c) => { hi = Math.max(hi, c.high); lo = Math.min(lo, c.low); });
  overlays.forEach((ind) => {
    const def = INDICATOR_DEFS[ind.type];
    Object.keys(def.compute(candles, { ...def.defaults, ...ind.params })).forEach((key) => {
      for (let i = start; i <= end; i++) { const v = computed[key]?.[i]; if (v != null) { hi = Math.max(hi, v); lo = Math.min(lo, v); } }
    });
  });
  const range = hi - lo || 1;
  hi += range * 0.05; lo -= range * 0.05;

  const xOf = (localIdx) => padL + (n === 1 ? plotW / 2 : (localIdx / (n - 1)) * plotW);
  const yOf = (price) => padT + (1 - (price - lo) / (hi - lo)) * priceH;
  const candleW = Math.max(1.5, (plotW / n) * 0.62);

  const maxVol = Math.max(...visible.map((c) => c.volume), 1);
  const volTop = padT + priceH + 12;
  const yVol = (v) => volTop + (1 - v / maxVol) * volH;

  // ---- interaction ----
  const idxFromX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * dims.w - padL;
    const local = Math.round((x / plotW) * (n - 1));
    return Math.max(0, Math.min(n - 1, local));
  };
  const onMove = (e) => {
    if (drag.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((e.clientX - drag.current.x) / rect.width) * dims.w;
      const shift = Math.round((dx / plotW) * n);
      if (shift !== 0) {
        const span = end - start;
        let ns = drag.current.start - shift;
        ns = Math.max(0, Math.min(candles.length - 1 - span, ns));
        setView({ start: ns, end: ns + span });
      }
    } else {
      setHover(idxFromX(e.clientX));
    }
  };
  const onDown = (e) => { drag.current = { x: e.clientX, start }; };
  const endDrag = () => { drag.current = null; };
  const onWheel = (e) => {
    e.preventDefault();
    const span = end - start;
    const center = start + Math.round((idxFromX(e.clientX) / (n - 1)) * span);
    const factor = e.deltaY > 0 ? 1.2 : 0.8;
    let newSpan = Math.round(span * factor);
    newSpan = Math.max(15, Math.min(candles.length - 1, newSpan));
    let ns = Math.max(0, center - Math.round(newSpan / 2));
    let ne = Math.min(candles.length - 1, ns + newSpan);
    ns = Math.max(0, ne - newSpan);
    setView({ start: ns, end: ne });
  };
  const zoom = (factor) => {
    const span = end - start;
    let newSpan = Math.round(span * factor);
    newSpan = Math.max(15, Math.min(candles.length - 1, newSpan));
    const center = Math.round((start + end) / 2);
    let ns = Math.max(0, center - Math.round(newSpan / 2));
    const ne = Math.min(candles.length - 1, ns + newSpan);
    ns = Math.max(0, ne - newSpan);
    setView({ start: ns, end: ne });
  };
  const reset = () => setView({ start: 0, end: candles.length - 1 });

  const hovered = hover != null ? visible[hover] : visible[n - 1];
  const priceGridLines = 5;
  const last = visible[n - 1];
  const first = visible[0];
  const change = last && first ? ((last.close - first.open) / first.open) * 100 : 0;

  // sub-pane geometry
  const subMeta = subPanes.map((ind, pi) => {
    const def = INDICATOR_DEFS[ind.type];
    const params = { ...def.defaults, ...ind.params };
    const keys = Object.keys(def.compute(candles, params));
    const top = padT + priceH + volH + 12 + pi * subPaneH;
    let sHi = -Infinity, sLo = Infinity;
    keys.forEach((k) => { for (let i = start; i <= end; i++) { const v = computed[k]?.[i]; if (v != null) { sHi = Math.max(sHi, v); sLo = Math.min(sLo, v); } } });
    if (def.range) { sLo = Math.min(sLo, def.range[0]); sHi = Math.max(sHi, def.range[1]); }
    if (sHi === -Infinity) { sHi = 1; sLo = 0; }
    const sr = sHi - sLo || 1;
    const yS = (v) => top + 20 + (1 - (v - sLo) / sr) * (subPaneH - 30);
    return { ind, def, keys, top, yS, sHi, sLo, params };
  });

  const pathFor = (key, yFn, colorIdx = 0) => {
    let d = '';
    let started = false;
    for (let i = 0; i < n; i++) {
      const v = computed[key]?.[start + i];
      if (v == null) { started = false; continue; }
      d += `${started ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yFn(v).toFixed(1)} `;
      started = true;
    }
    return d;
  };

  return (
    <div ref={wrapRef} className="w-full">
      {showControls && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#f0ecdd]">{symbol}</span>
            <span className="font-mono text-sm text-[#c9c4b4]">{fmt(last?.close)}</span>
            <span className={`font-mono text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
              {CHART_TYPES.map((t) => (
                <button key={t.id} onClick={() => onChartType?.(t.id)} title={t.label}
                  className={`grid h-7 w-7 place-items-center transition ${chartType === t.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  <t.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <select value={timeframe} onChange={(e) => onTimeframe?.(e.target.value)}
              className="h-7 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 text-xs text-[#e9e7df] outline-none">
              {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
            {onOpenIndicators && (
              <button onClick={onOpenIndicators} className="flex h-7 items-center gap-1 rounded-lg border border-[#d4af37]/15 px-2 text-xs text-[#d4af37] hover:border-[#d4af37]/40"><Plus className="h-3 w-3" /> Indicators</button>
            )}
            <button onClick={() => zoom(0.7)} title="Zoom in" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><ZoomIn className="h-3.5 w-3.5" /></button>
            <button onClick={() => zoom(1.4)} title="Zoom out" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button onClick={reset} title="Reset" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><RotateCcw className="h-3.5 w-3.5" /></button>
            <button onClick={exportPng} title="Export PNG" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><Download className="h-3.5 w-3.5" /></button>
            {onToggleFullscreen && (
              <button onClick={onToggleFullscreen} title="Fullscreen" className="grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]">{fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
            )}
          </div>
        </div>
      )}

      {overlays.length > 0 && showControls && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {overlays.map((ind) => {
            const def = INDICATOR_DEFS[ind.type];
            return (
              <span key={ind.id} className="flex items-center gap-1 rounded-full border border-[#d4af37]/15 bg-white/5 px-2 py-0.5 text-[10px]" style={{ color: ind.color || def.color }}>
                {def.label} {ind.params?.period ? `(${ind.params.period})` : ''}
                {onRemoveIndicator && <button onClick={() => onRemoveIndicator(ind.id)}><X className="h-2.5 w-2.5" /></button>}
              </span>
            );
          })}
        </div>
      )}

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${dims.w} ${dims.h}`} style={{ touchAction: 'none', cursor: drag.current ? 'grabbing' : 'crosshair' }}
        onMouseMove={onMove} onMouseDown={onDown} onMouseUp={endDrag} onMouseLeave={() => { endDrag(); setHover(null); }} onWheel={onWheel}>
        <rect x="0" y="0" width={dims.w} height={dims.h} fill={isLight ? '#f8fafc' : '#0a0a0f'} />
        {/* price grid + labels */}
        {Array.from({ length: priceGridLines + 1 }).map((_, i) => {
          const price = lo + (i / priceGridLines) * (hi - lo);
          const y = yOf(price);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={padL + plotW + 5} y={y + 3} fill={TXT} fontSize="10" fontFamily="monospace">{fmt(price)}</text>
            </g>
          );
        })}

        {/* price series */}
        {chartType === 'candle' && visible.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? GREEN : RED;
          const x = xOf(i);
          return (
            <g key={i}>
              <line x1={x} y1={yOf(c.high)} x2={x} y2={yOf(c.low)} stroke={color} strokeWidth="1" />
              <rect x={x - candleW / 2} y={yOf(Math.max(c.open, c.close))} width={candleW} height={Math.max(1, Math.abs(yOf(c.open) - yOf(c.close)))} fill={color} />
            </g>
          );
        })}
        {chartType === 'bar' && visible.map((c, i) => {
          const up = c.close >= c.open; const color = up ? GREEN : RED; const x = xOf(i); const t = candleW / 1.6;
          return (
            <g key={i} stroke={color} strokeWidth="1.4">
              <line x1={x} y1={yOf(c.high)} x2={x} y2={yOf(c.low)} />
              <line x1={x - t} y1={yOf(c.open)} x2={x} y2={yOf(c.open)} />
              <line x1={x} y1={yOf(c.close)} x2={x + t} y2={yOf(c.close)} />
            </g>
          );
        })}
        {(chartType === 'line' || chartType === 'area') && (() => {
          let d = ''; visible.forEach((c, i) => { d += `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${yOf(c.close).toFixed(1)} `; });
          const area = `${d}L${xOf(n - 1)} ${padT + priceH} L${xOf(0)} ${padT + priceH} Z`;
          return (
            <g>
              {chartType === 'area' && (
                <>
                  <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity="0.35" /><stop offset="100%" stopColor={GOLD} stopOpacity="0" /></linearGradient></defs>
                  <path d={area} fill="url(#areaFill)" />
                </>
              )}
              <path d={d} fill="none" stroke={GOLD} strokeWidth="1.8" />
            </g>
          );
        })()}

        {/* price-pane overlays */}
        {overlays.map((ind) => {
          const def = INDICATOR_DEFS[ind.type];
          const color = ind.color || def.color;
          if (def.kind === 'bands') {
            return <g key={ind.id}>
              <path d={pathFor('BB_upper', yOf)} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.7" />
              <path d={pathFor('BB_mid', yOf)} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
              <path d={pathFor('BB_lower', yOf)} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.7" />
            </g>;
          }
          if (def.kind === 'ichimoku') {
            return <g key={ind.id}>
              <path d={pathFor('ICH_spanA', yOf)} fill="none" stroke="#34d399" strokeWidth="1" strokeOpacity="0.6" />
              <path d={pathFor('ICH_spanB', yOf)} fill="none" stroke="#e06666" strokeWidth="1" strokeOpacity="0.6" />
              <path d={pathFor('ICH_tenkan', yOf)} fill="none" stroke="#60a5fa" strokeWidth="1.2" />
              <path d={pathFor('ICH_kijun', yOf)} fill="none" stroke="#f472b6" strokeWidth="1.2" />
            </g>;
          }
          const key = def.kind === 'line' ? def.label.split(' ')[0].toUpperCase() : Object.keys(def.compute(candles, { ...def.defaults, ...ind.params }))[0];
          return <path key={ind.id} d={pathFor(key, yOf)} fill="none" stroke={color} strokeWidth="1.6" />;
        })}

        {/* volume */}
        {visible.map((c, i) => {
          const up = c.close >= c.open;
          return <rect key={i} x={xOf(i) - candleW / 2} y={yVol(c.volume)} width={candleW} height={volTop + volH - yVol(c.volume)} fill={up ? GREEN : RED} fillOpacity="0.35" />;
        })}
        <text x={padL} y={volTop + 2} fill={TXT} fontSize="9" fontFamily="monospace">Vol</text>

        {/* sub-panes */}
        {subMeta.map(({ ind, def, keys, top, yS, sHi, sLo }) => (
          <g key={ind.id}>
            <line x1={padL} y1={top + 14} x2={padL + plotW} y2={top + 14} stroke={GRID} />
            <line x1={padL} y1={top + subPaneH - 8} x2={padL + plotW} y2={top + subPaneH - 8} stroke={GRID} />
            <text x={padL} y={top + 10} fill={def.color} fontSize="9" fontFamily="monospace">{def.label}</text>
            <text x={padL + plotW + 5} y={top + 18} fill={TXT} fontSize="9" fontFamily="monospace">{fmt(sHi)}</text>
            <text x={padL + plotW + 5} y={top + subPaneH - 8} fill={TXT} fontSize="9" fontFamily="monospace">{fmt(sLo)}</text>
            {def.levels?.map((lv) => (
              <line key={lv} x1={padL} y1={yS(lv)} x2={padL + plotW} y2={yS(lv)} stroke={GOLD} strokeWidth="0.6" strokeDasharray="2 3" strokeOpacity="0.4" />
            ))}
            {def.kind === 'macd' && keys.includes('MACD_hist') && visible.map((_, i) => {
              const v = computed.MACD_hist?.[start + i]; if (v == null) return null;
              const zero = yS(0);
              return <rect key={i} x={xOf(i) - candleW / 2} y={Math.min(zero, yS(v))} width={candleW} height={Math.abs(yS(v) - zero)} fill={v >= 0 ? GREEN : RED} fillOpacity="0.5" />;
            })}
            {keys.filter((k) => k !== 'MACD_hist').map((k, ki) => (
              <path key={k} d={pathFor(k, yS)} fill="none" stroke={ki === 0 ? def.color : '#60a5fa'} strokeWidth="1.3" />
            ))}
          </g>
        ))}

        {/* crosshair */}
        {hover != null && (
          <g>
            <line x1={xOf(hover)} y1={padT} x2={xOf(hover)} y2={dims.h - 6} stroke="#d4af37" strokeWidth="0.6" strokeDasharray="3 3" strokeOpacity="0.5" />
          </g>
        )}
      </svg>

      {/* OHLC readout */}
      {hovered && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 font-mono text-[11px]">
          <span className="text-[#8a8577]">{new Date(hovered.time).toLocaleString()}</span>
          <span className="text-[#c9c4b4]">O <span className="text-[#f0ecdd]">{fmt(hovered.open)}</span></span>
          <span className="text-[#c9c4b4]">H <span className="text-emerald-400">{fmt(hovered.high)}</span></span>
          <span className="text-[#c9c4b4]">L <span className="text-red-400">{fmt(hovered.low)}</span></span>
          <span className="text-[#c9c4b4]">C <span className="text-[#f0ecdd]">{fmt(hovered.close)}</span></span>
          <span className="text-[#c9c4b4]">V <span className="text-[#8a8577]">{hovered.volume.toLocaleString()}</span></span>
        </div>
      )}
    </div>
  );
}
