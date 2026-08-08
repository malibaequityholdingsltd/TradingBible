import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries, LineStyle,
} from 'lightweight-charts';
import {
  MousePointer2, TrendingUp, Minus, Square, MoveUpRight, Type, Trash2, Maximize2,
  Minimize2, Download, ChevronDown, Save, BookMarked, X,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useCandles } from '@/hooks/useCandles';
import { useDrawings } from '@/hooks/useDrawings';
import { SYMBOL_GROUPS } from '@/lib/symbols';
import { INDICATOR_DEFS } from '@/lib/indicators';
import IndicatorPicker from '@/components/IndicatorPicker';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
const TYPES = [{ id: 'candle', label: 'Candles' }, { id: 'area', label: 'Area' }, { id: 'line', label: 'Line' }];
const TOOLS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, clicks: 0 },
  { id: 'trend', label: 'Trendline', icon: TrendingUp, clicks: 2 },
  { id: 'hline', label: 'Horizontal line', icon: Minus, clicks: 1 },
  { id: 'rect', label: 'Rectangle', icon: Square, clicks: 2 },
  { id: 'arrow', label: 'Arrow', icon: MoveUpRight, clicks: 2 },
  { id: 'text', label: 'Text label', icon: Type, clicks: 1 },
];
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function LiveChart({
  initialSymbol = 'BTCUSD', initialTimeframe = '1h', initialType = 'candle',
  initialIndicators = [], drawingsEnabled = true, compact = false,
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [chartType, setChartType] = useState(initialType);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [symOpen, setSymOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tool, setTool] = useState('cursor');
  const [pending, setPending] = useState(null); // in-progress drawing start point
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0); // forces overlay recompute on pan/zoom/resize
  const [tplOpen, setTplOpen] = useState(false);

  const wrapRef = useRef(null);
  const chartApi = useRef(null);
  const mainSeries = useRef(null);
  const overlaySeries = useRef([]);
  const subPanes = useRef([]);

  const { candles, status } = useCandles(symbol, timeframe, { limit: 300 });
  const dz = useDrawings(symbol);

  // Build / rebuild the chart when container mounts or type changes.
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#b3ae9e', fontFamily: 'Inter, sans-serif' },
      grid: { vertLines: { color: 'rgba(212,175,55,0.06)' }, horzLines: { color: 'rgba(212,175,55,0.06)' } },
      rightPriceScale: { borderColor: 'rgba(212,175,55,0.15)' },
      timeScale: { borderColor: 'rgba(212,175,55,0.15)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });
    chartApi.current = chart;

    let series;
    if (chartType === 'area') {
      series = chart.addSeries(AreaSeries, { lineColor: '#d4af37', topColor: 'rgba(212,175,55,0.4)', bottomColor: 'rgba(212,175,55,0.02)', lineWidth: 2 });
    } else if (chartType === 'line') {
      series = chart.addSeries(LineSeries, { color: '#d4af37', lineWidth: 2 });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#34d399', downColor: '#f87171', borderVisible: false,
        wickUpColor: '#34d399', wickDownColor: '#f87171',
      });
    }
    mainSeries.current = series;

    const vol = chart.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' } });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    mainSeries.volRef = vol;

    const onRange = () => setTick((t) => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);

    return () => { ro.disconnect(); chart.remove(); chartApi.current = null; mainSeries.current = null; overlaySeries.current = []; subPanes.current = []; };
  }, [chartType]);

  // Push candle + indicator data whenever candles or indicators change.
  useEffect(() => {
    const chart = chartApi.current; const series = mainSeries.current;
    if (!chart || !series || !candles.length) return;
    const data = candles.map((c) => ({ time: Math.floor(c.time / 1000), open: c.open, high: c.high, low: c.low, close: c.close }));
    if (chartType === 'candle') series.setData(data);
    else series.setData(data.map((d) => ({ time: d.time, value: d.close })));

    mainSeries.volRef?.setData(candles.map((c) => ({
      time: Math.floor(c.time / 1000), value: c.volume,
      color: c.close >= c.open ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)',
    })));

    // Clear previous indicator series.
    overlaySeries.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* */ } });
    subPanes.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* */ } });
    overlaySeries.current = []; subPanes.current = [];

    let paneIndex = 1;
    indicators.forEach((ind) => {
      const def = INDICATOR_DEFS[ind.type];
      if (!def) return;
      const params = { ...def.defaults, ...ind.params };
      const out = def.compute(candles, params);
      const times = candles.map((c) => Math.floor(c.time / 1000));
      if (def.pane === 'price') {
        Object.entries(out).forEach(([key, arr]) => {
          const ls = chart.addSeries(LineSeries, { color: ind.color || def.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, title: key });
          ls.setData(arr.map((v, i) => (v == null ? null : { time: times[i], value: v })).filter(Boolean));
          overlaySeries.current.push(ls);
        });
      } else {
        const pi = paneIndex++;
        Object.entries(out).forEach(([key, arr]) => {
          const ls = chart.addSeries(LineSeries, { color: ind.color || def.color, lineWidth: 1, priceLineVisible: false, title: key }, pi);
          ls.setData(arr.map((v, i) => (v == null ? null : { time: times[i], value: v })).filter(Boolean));
          subPanes.current.push(ls);
        });
        try { chart.panes()[pi]?.setHeight(compact ? 80 : 110); } catch { /* */ }
      }
    });
    setTick((t) => t + 1);
  }, [candles, indicators, chartType, compact]);

  // ---- Drawing coordinate helpers -------------------------------------
  const toCoord = useCallback((d) => {
    const chart = chartApi.current; const s = mainSeries.current;
    if (!chart || !s) return null;
    const ts = chart.timeScale();
    const map = (p) => {
      const x = ts.timeToCoordinate(p.time);
      const y = s.priceToCoordinate(p.price);
      return x == null || y == null ? null : { x, y };
    };
    return d.points.map(map);
  }, []);

  const fromEvent = useCallback((e) => {
    const chart = chartApi.current; const s = mainSeries.current;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = s.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time, price };
  }, []);

  const onOverlayClick = useCallback((e) => {
    if (!drawingsEnabled || tool === 'cursor') return;
    const pt = fromEvent(e);
    if (!pt) return;
    const def = TOOLS.find((t) => t.id === tool);
    if (def.clicks === 1) {
      if (tool === 'text') {
        const text = window.prompt('Label text:');
        if (!text) return;
        dz.update((prev) => [...prev, { id: uid(), type: 'text', color: '#d4af37', text, points: [pt] }]);
      } else {
        dz.update((prev) => [...prev, { id: uid(), type: 'hline', color: '#60a5fa', points: [pt] }]);
      }
      setTool('cursor');
    } else if (!pending) {
      setPending(pt);
    } else {
      dz.update((prev) => [...prev, { id: uid(), type: tool, color: tool === 'arrow' ? '#f472b6' : '#d4af37', points: [pending, pt] }]);
      setPending(null); setTool('cursor');
    }
  }, [drawingsEnabled, tool, pending, fromEvent, dz]);

  const removeSelected = useCallback(() => {
    if (!selected) return;
    dz.update((prev) => prev.filter((d) => d.id !== selected));
    setSelected(null);
  }, [selected, dz]);

  const exportPng = useCallback(() => {
    const chart = chartApi.current; if (!chart) return;
    try {
      const canvas = chart.takeScreenshot();
      const a = document.createElement('a');
      a.download = `${symbol}-${timeframe}.png`; a.href = canvas.toDataURL('image/png'); a.click();
    } catch { /* */ }
  }, [symbol, timeframe]);

  // Render SVG overlay
  const renderDrawings = () => dz.drawings.map((d) => {
    const c = toCoord(d);
    if (!c) return null;
    const sel = selected === d.id;
    const stroke = d.color || '#d4af37';
    const sw = sel ? 2.5 : 1.6;
    const onClick = (e) => { e.stopPropagation(); if (tool === 'cursor') setSelected(sel ? null : d.id); };
    if (d.type === 'hline') {
      const p = c[0]; if (!p) return null;
      return <g key={d.id} onClick={onClick} style={{ cursor: 'pointer' }}>
        <line x1={0} x2="100%" y1={p.y} y2={p.y} stroke={stroke} strokeWidth={sw} strokeDasharray="6 4" />
        <line x1={0} x2="100%" y1={p.y} y2={p.y} stroke="transparent" strokeWidth={10} />
      </g>;
    }
    if (d.type === 'text') {
      const p = c[0]; if (!p) return null;
      return <text key={d.id} x={p.x} y={p.y} fill={stroke} fontSize={13} fontWeight={600} onClick={onClick} style={{ cursor: 'pointer' }}>{d.text}</text>;
    }
    const [a, b] = c; if (!a || !b) return null;
    if (d.type === 'rect') {
      return <rect key={d.id} x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)}
        fill={`${stroke}22`} stroke={stroke} strokeWidth={sw} onClick={onClick} style={{ cursor: 'pointer' }} />;
    }
    // trend + arrow are lines
    return <g key={d.id} onClick={onClick} style={{ cursor: 'pointer' }}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={sw} markerEnd={d.type === 'arrow' ? 'url(#arrowhead)' : undefined} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={10} />
    </g>;
  });

  const symbolPicker = (
    <div className="relative">
      <button onClick={() => setSymOpen((o) => !o)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2.5 py-1 text-xs font-medium text-[#e9e7df]">
        {symbol} <ChevronDown className="h-3 w-3" />
      </button>
      {symOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setSymOpen(false)} />
          <div className="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[#d4af37]/15 bg-[#0d0d12] p-2 no-scrollbar">
            {SYMBOL_GROUPS.map((g) => (
              <div key={g.label} className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">{g.label}</div>
                {g.symbols.map((s) => (
                  <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymOpen(false); setSelected(null); }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-white/5 ${symbol === s.symbol ? 'text-[#d4af37]' : 'text-[#c9c4b4]'}`}>
                    <span className="font-mono">{s.symbol}</span><span className="text-[10px] text-[#8a8577]">{s.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className={`glass rounded-2xl p-3 sm:p-4 ${fullscreen ? 'fixed inset-2 z-[55] flex flex-col overflow-hidden' : ''}`}>
        {/* Top controls */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {symbolPicker}
          <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
            {TIMEFRAMES.map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-[11px] transition ${timeframe === tf ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{tf}</button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
            {TYPES.map((t) => (
              <button key={t.id} onClick={() => setChartType(t.id)}
                className={`px-2 py-1 text-[11px] transition ${chartType === t.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => setPickerOpen(true)} className="rounded-lg border border-[#d4af37]/15 px-2.5 py-1 text-[11px] text-[#c9c4b4] hover:text-[#e9e7df]">Indicators ({indicators.length})</button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={exportPng} title="Export PNG" className="rounded-lg border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df]"><Download className="h-3.5 w-3.5" /></button>
            <button onClick={() => setFullscreen((f) => !f)} title="Fullscreen" className="rounded-lg border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df]">{fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
          </div>
        </div>

        {/* Drawing toolbar */}
        {drawingsEnabled && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => { setTool(t.id); setPending(null); }} title={t.label}
                className={`rounded-lg border p-1.5 transition ${tool === t.id ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}>
                <t.icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-[#d4af37]/15" />
            <button onClick={removeSelected} disabled={!selected} title="Delete selected"
              className={`rounded-lg border border-[#d4af37]/15 p-1.5 ${selected ? 'text-red-400 hover:bg-red-400/10' : 'text-[#5f5b50]'}`}><Trash2 className="h-3.5 w-3.5" /></button>
            <button onClick={() => dz.update([])} title="Clear all" className="rounded-lg border border-[#d4af37]/15 px-2 py-1 text-[11px] text-[#8a8577] hover:text-[#e9e7df]">Clear</button>
            <div className="relative">
              <button onClick={() => setTplOpen((o) => !o)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 px-2 py-1 text-[11px] text-[#c9c4b4] hover:text-[#e9e7df]"><BookMarked className="h-3.5 w-3.5" /> Templates</button>
              {tplOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setTplOpen(false)} />
                  <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-[#d4af37]/15 bg-[#0d0d12] p-2">
                    <button onClick={() => { const n = window.prompt('Template name:'); if (n) dz.saveTemplate(n, window.confirm('Share this template with other users?')); setTplOpen(false); }}
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#d4af37] hover:bg-white/5"><Save className="h-3.5 w-3.5" /> Save current as template</button>
                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                      {dz.templates.length === 0 && <p className="px-2 py-2 text-[11px] text-[#5f5b50]">No templates yet.</p>}
                      {dz.templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-white/5">
                          <button onClick={() => { dz.applyTemplate(t); setTplOpen(false); }} className="flex-1 text-left text-[#c9c4b4]">
                            {t.name} {t.shared && <span className="text-[9px] text-emerald-400">shared</span>}
                          </button>
                          {t.owner === pb.authStore.record?.id && <button onClick={() => dz.deleteTemplate(t.id)} className="text-[#5f5b50] hover:text-red-400"><X className="h-3 w-3" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Chart + overlay */}
        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <div ref={wrapRef} className={compact && !fullscreen ? 'h-[300px] w-full' : fullscreen ? 'h-[calc(100vh-180px)] w-full' : 'h-[460px] w-full'} />
          {drawingsEnabled && (
            <svg
              className="absolute inset-0 h-full w-full"
              style={{ pointerEvents: tool === 'cursor' ? 'none' : 'auto' }}
              onClick={onOverlayClick}
            >
              <defs>
                <marker id="arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 9 3.5, 0 7" fill="#f472b6" />
                </marker>
              </defs>
              <g style={{ pointerEvents: 'auto' }}>{renderDrawings()}</g>
            </svg>
          )}
          {status === 'error' && !candles.length && (
            <div className="absolute inset-0 grid place-items-center text-sm text-red-400/80">Failed to load market data.</div>
          )}
          {status === 'loading' && !candles.length && (
            <div className="absolute inset-0 grid place-items-center text-sm text-[#8a8577]">Loading chart…</div>
          )}
        </div>
        {drawingsEnabled && tool !== 'cursor' && (
          <p className="mt-2 text-[11px] text-[#d4af37]">{pending ? 'Click to set the second point.' : `Click on the chart to place your ${TOOLS.find((t) => t.id === tool)?.label.toLowerCase()}.`}</p>
        )}
      </div>
      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
    </>
  );
}
