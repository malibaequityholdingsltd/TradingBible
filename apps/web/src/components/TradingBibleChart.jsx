import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart as AreaIcon,
  BarChart3,
  Baseline,
  Bell,
  BookMarked,
  Camera,
  CandlestickChart,
  ChartNoAxesCombined,
  Check,
  Circle,
  Columns2,
  Download,
  Ellipsis,
  Eraser,
  Eye,
  EyeOff,
  GitBranch,
  Grid2x2,
  History,
  Layers,
  LineChart as LineIcon,
  List,
  Loader2,
  Lock,
  Magnet,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer2,
  MoveUpRight,
  MoveVertical,
  Redo2,
  RotateCcw,
  Ruler,
  Save,
  Settings2,
  Share2,
  Spline,
  Square,
  Trash2,
  TrendingUp,
  Triangle,
  Tv,
  Type,
  Unlock,
  Waypoints,
  X,
} from 'lucide-react';
import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  createTextWatermark,
} from 'lightweight-charts';
import { createPortal } from 'react-dom';
import { useTheme } from '@/hooks/useTheme';
import { useCandles } from '@/hooks/useCandles';
import { useDrawings } from '@/hooks/useDrawings';
import { INDICATOR_DEFS } from '@/lib/indicators';
import { TIMEFRAME_GROUPS, isKnownTimeframe, timeframeMinutes } from '@/lib/chartTimeframes';
import { ALL_SYMBOLS } from '@/lib/symbols';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import IndicatorPicker from '@/components/IndicatorPicker';
import TradingViewChart from '@/components/TradingViewChart';
import { DrawingPrimitive } from '@/chart/drawing/DrawingPrimitive';
import { useDrawingInteraction } from '@/chart/drawing/useDrawingInteraction';

const CHART_TYPES = [
  { id: 'candle', label: 'Candles', icon: CandlestickChart },
  { id: 'hollow', label: 'Hollow candles', icon: CandlestickChart },
  { id: 'bar', label: 'Bars', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: LineIcon },
  { id: 'area', label: 'Area', icon: AreaIcon },
  { id: 'baseline', label: 'Baseline', icon: Baseline },
  { id: 'tradingview', label: 'TV embed', icon: Tv },
];

const DRAW_TOOLS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, clicks: 0 },
  { id: 'trend', label: 'Trend line', icon: TrendingUp, clicks: 2 },
  { id: 'hline', label: 'Horizontal line', icon: Minus, clicks: 1 },
  { id: 'vline', label: 'Vertical line', icon: MoveVertical, clicks: 1 },
  { id: 'ray', label: 'Ray', icon: Spline, clicks: 2 },
  { id: 'rect', label: 'Rectangle', icon: Square, clicks: 2 },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, clicks: 2 },
  { id: 'triangle', label: 'Triangle', icon: Triangle, clicks: 3 },
  { id: 'channel', label: 'Parallel channel', icon: GitBranch, clicks: 3 },
  { id: 'fib', label: 'Fibonacci retracement', icon: ChartNoAxesCombined, clicks: 2 },
  { id: 'path', label: 'Path', icon: Waypoints, clicks: 0 },
  { id: 'arrow', label: 'Arrow', icon: MoveUpRight, clicks: 2 },
  { id: 'text', label: 'Text label', icon: Type, clicks: 1 },
  { id: 'measure', label: 'Measure', icon: Ruler, clicks: 2 },
];

const COMPACT_TOOL_IDS = ['cursor', 'trend', 'hline', 'rect', 'fib', 'path', 'text', 'measure'];

const LAYOUTS = [
  { id: 'single', label: 'Single chart', icon: Square },
  { id: 'split', label: 'Two charts', icon: Columns2 },
  { id: 'quad', label: 'Four charts', icon: Grid2x2 },
];

const DEFAULT_SETTINGS = {
  showVolume: true,
  showGrid: true,
  showWatermark: true,
  showLastPrice: true,
  crosshair: 'magnet',
  scale: 'normal',
  upColor: '#34d399',
  downColor: '#f87171',
  lineColor: '#d4af37',
};

const SETTINGS_KEY = 'tb:chart-settings:v1';
const COMPARE_KEY = 'tb:chart-compare:v1';
const COMPARE_MAP_KEY = 'tb:chart-compare-map:v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readSettings() {
  const saved = readJson(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

function readIndicators(symbol) {
  const saved = readJson(`tb:indicators:v1:${String(symbol || '').toUpperCase()}`, []);
  return Array.isArray(saved) ? saved : [];
}

function readCompareMap() {
  const saved = readJson(COMPARE_MAP_KEY, {});
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

function writeIndicators(symbol, indicators) {
  try {
    localStorage.setItem(`tb:indicators:v1:${String(symbol || '').toUpperCase()}`, JSON.stringify((indicators || []).slice(0, 50)));
  } catch {
    /* storage full — keep in memory */
  }
}

function fmtPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

function timeLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(212,175,55,${alpha})`;
  const n = parseInt(raw, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function themeAccent() {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--tb-gold').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  } catch {
    /* server / old browser */
  }
  return '#d4af37';
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function symbolName(symbol) {
  return ALL_SYMBOLS.find((item) => item.symbol === String(symbol || '').toUpperCase())?.name || '';
}

function sameBar(left, right) {
  if (!left || !right) return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => left[key] === right[key]);
}

// Keep live feeds incremental. A full setData on every refresh destroys the
// series cache and forces the chart to rebuild every bar; update() only
// touches the changed tail.
function applySeriesData(series, next, previous) {
  if (!series) return next;
  if (!previous.length || !next.length || next.length < previous.length || next[0]?.time !== previous[0]?.time) {
    series.setData(next);
    return next;
  }
  if (next.length === previous.length) {
    if (!sameBar(next[next.length - 1], previous[previous.length - 1])) {
      series.update(next[next.length - 1]);
    }
    return next;
  }
  if (next[previous.length - 1]?.time !== previous[previous.length - 1]?.time) {
    series.setData(next);
    return next;
  }
  if (!sameBar(next[previous.length - 1], previous[previous.length - 1])) {
    series.update(next[previous.length - 1]);
  }
  for (let index = previous.length; index < next.length; index += 1) {
    series.update(next[index]);
  }
  return next;
}

function sourceLabel(source) {
  if (source === 'yahoo') return 'Yahoo Finance';
  if (source === 'binance') return 'Binance';
  if (source === 'alphavantage') return 'Alpha Vantage';
  if (source === 'close') return 'Last close';
  if (source === 'synthetic') return 'Simulated';
  return source || '—';
}

function Modal({ title, onClose, children, wide = false }) {
  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11] shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h3 className="text-sm font-bold text-[#f0ecdd]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#8a8577] hover:text-[#e9e7df]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function SettingRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="min-w-0 text-xs text-[#e9e7df]">
        {label}
        {hint ? <span className="mt-0.5 block text-[10px] leading-relaxed text-[#5f5b50]">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-[#d4af37]' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function TradingBibleChart({
  symbol = 'BTCUSD',
  timeframe = '1h',
  chartType = 'candle',
  quote = null,
  height = '',
  compact = false,
  hidePicker = true,
  showToolbar = true,
  showDrawingToolbar = true,
  onSymbolChange,
  onTimeframeChange,
  onChartTypeChange,
  onSnapshot,
  onShare,
  onOpenReplay,
  layout = 'single',
  onLayoutChange,
  className = '',
}) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const [localSymbol, setLocalSymbol] = useState(symbol);
  const [localTimeframe, setLocalTimeframe] = useState(timeframe);
  const [localChartType, setLocalChartType] = useState(chartType);
  useEffect(() => setLocalSymbol(symbol), [symbol]);
  useEffect(() => setLocalTimeframe(timeframe), [timeframe]);
  useEffect(() => setLocalChartType(chartType), [chartType]);

  const activeSymbol = onSymbolChange ? symbol : localSymbol;
  const requestedTimeframe = onTimeframeChange ? timeframe : localTimeframe;
  const activeTimeframe = isKnownTimeframe(requestedTimeframe) ? requestedTimeframe : '1h';
  const activeChartType = onChartTypeChange ? chartType : localChartType;
  const effectiveType = CHART_TYPES.some((type) => type.id === activeChartType) ? activeChartType : 'candle';
  const isTv = effectiveType === 'tradingview';

  const changeSymbol = useCallback((next) => {
    if (onSymbolChange) onSymbolChange(next);
    else setLocalSymbol(next);
  }, [onSymbolChange]);

  const changeTimeframe = useCallback((next) => {
    if (onTimeframeChange) onTimeframeChange(next);
    else setLocalTimeframe(next);
  }, [onTimeframeChange]);

  const changeChartType = useCallback((next) => {
    if (onChartTypeChange) onChartTypeChange(next);
    else setLocalChartType(next);
  }, [onChartTypeChange]);

  const candleSymbol = isTv ? null : activeSymbol;
  const { candles, status, refresh, source } = useCandles(candleSymbol, activeTimeframe, { limit: 500, refreshMs: 15000 });
  // Compare is stored per symbol. A single global value let the ETHUSD pane
  // in a split layout erase the main XAUUSD chart's ETHUSD comparison.
  const [compareMap, setCompareMap] = useState(readCompareMap);
  const [legacyCompare] = useState(() => String(readJson(COMPARE_KEY, '') || '').toUpperCase());
  const compareSymbol = String(compareMap[activeSymbol] ?? legacyCompare).toUpperCase();
  const setCompareSymbol = useCallback((next) => {
    const clean = String(next || '').toUpperCase();
    setCompareMap((previous) => ({ ...previous, [activeSymbol]: clean }));
  }, [activeSymbol]);
  const compareFeedSymbol = compareSymbol && compareSymbol !== activeSymbol ? compareSymbol : null;
  const { candles: compareCandles } = useCandles(isTv ? null : compareFeedSymbol, activeTimeframe, { limit: 500, refreshMs: 30000 });
  const dz = useDrawings(activeSymbol);

  const [indicators, setIndicators] = useState(() => readIndicators(symbol));
  const [indicatorSymbol, setIndicatorSymbol] = useState(symbol);
  useEffect(() => {
    setIndicators(readIndicators(activeSymbol));
    setIndicatorSymbol(activeSymbol);
  }, [activeSymbol]);
  useEffect(() => {
    if (indicatorSymbol !== activeSymbol) return;
    writeIndicators(activeSymbol, indicators);
  }, [indicators, activeSymbol, indicatorSymbol]);

  const [settings, setSettings] = useState(readSettings);
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);
  useEffect(() => {
    try { localStorage.setItem(COMPARE_MAP_KEY, JSON.stringify(compareMap)); } catch { /* ignore */ }
  }, [compareMap]);
  useEffect(() => {
    if (compareSymbol && compareSymbol === activeSymbol) setCompareSymbol('');
  }, [activeSymbol, compareSymbol, setCompareSymbol]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tool, setTool] = useState('cursor');
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [magnet, setMagnet] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hideDrawings, setHideDrawings] = useState(false);
  const [textPrompt, setTextPrompt] = useState(null);
  const [hover, setHover] = useState(null);
  const [accentTick, setAccentTick] = useState(0);
  const [chartEpoch, setChartEpoch] = useState(0);

  const wrapRef = useRef(null);
  const chartApi = useRef(null);
  const mainSeries = useRef(null);
  const volSeries = useRef(null);
  const compareSeries = useRef(null);
  const overlaySeries = useRef([]);
  const subPanes = useRef([]);
  const watermark = useRef(null);
  const lastPriceLine = useRef(null);
  const lastView = useRef('');
  const hoverTime = useRef(null);
  const primitiveRef = useRef(null);
  const drawingsRef = useRef(dz.drawings);
  const selectedRef = useRef(null);
  const previewRef = useRef(null);
  const hoveredHandleRef = useRef(null);
  const lockedRef = useRef(false);
  const hideDrawingsRef = useRef(false);
  const timeframeRef = useRef(activeTimeframe);
  const candlesRef = useRef(candles);
  const mainDataRef = useRef([]);
  const volDataRef = useRef([]);
  const dataKeyRef = useRef('');

  useEffect(() => {
    const bump = () => setAccentTick((value) => value + 1);
    window.addEventListener('tb:theme-changed', bump);
    return () => window.removeEventListener('tb:theme-changed', bump);
  }, []);

  useEffect(() => {
    setSelected(null);
    setPending([]);
    setTool('cursor');
    previewRef.current = null;
    primitiveRef.current?.requestUpdate();
    lastView.current = '';
  }, [activeSymbol]);

  useEffect(() => {
    drawingsRef.current = dz.drawings;
    primitiveRef.current?.requestUpdate();
  }, [dz.drawings]);

  useEffect(() => {
    selectedRef.current = selected;
    primitiveRef.current?.requestUpdate();
  }, [selected]);

  useEffect(() => {
    lockedRef.current = locked;
    hideDrawingsRef.current = hideDrawings;
    primitiveRef.current?.requestUpdate();
  }, [hideDrawings, locked]);

  useEffect(() => {
    timeframeRef.current = activeTimeframe;
    primitiveRef.current?.requestUpdate();
  }, [activeTimeframe]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Build the chart canvas. Rebuilt only when the engine, theme or fullscreen
  // host changes; data, indicators and settings update in place.
  useEffect(() => {
    if (isTv || !wrapRef.current) return undefined;
    const el = wrapRef.current;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: isLight ? '#565d68' : '#b3ae9e',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(60,55,40,0.08)' : 'rgba(212,175,55,0.06)' },
        horzLines: { color: isLight ? 'rgba(60,55,40,0.08)' : 'rgba(212,175,55,0.06)' },
      },
      rightPriceScale: {
        borderColor: isLight ? 'rgba(166,124,30,0.25)' : 'rgba(212,175,55,0.15)',
        scaleMargins: { top: 0.12, bottom: 0.18 },
      },
      timeScale: {
        borderColor: isLight ? 'rgba(166,124,30,0.25)' : 'rgba(212,175,55,0.15)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
      },
      crosshair: { mode: CrosshairMode.Magnet },
    });
    chartApi.current = chart;
    mainDataRef.current = [];
    volDataRef.current = [];
    dataKeyRef.current = '';

    const accent = themeAccent();
    let series;
    if (effectiveType === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: accent,
        topColor: hexToRgba(accent, 0.35),
        bottomColor: hexToRgba(accent, 0.02),
        lineWidth: 2,
      });
    } else if (effectiveType === 'line') {
      series = chart.addSeries(LineSeries, { color: accent, lineWidth: 2 });
    } else if (effectiveType === 'bar') {
      series = chart.addSeries(BarSeries, { upColor: '#34d399', downColor: '#f87171' });
    } else if (effectiveType === 'baseline') {
      series = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: 0 },
        topLineColor: '#34d399',
        topFillColor1: 'rgba(52,211,153,0.25)',
        topFillColor2: 'rgba(52,211,153,0.02)',
        bottomLineColor: '#f87171',
        bottomFillColor1: 'rgba(248,113,113,0.02)',
        bottomFillColor2: 'rgba(248,113,113,0.25)',
        lineWidth: 2,
      });
    } else if (effectiveType === 'hollow') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: 'rgba(0,0,0,0)',
        downColor: '#f87171',
        borderVisible: true,
        borderUpColor: '#34d399',
        borderDownColor: '#f87171',
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#34d399',
        downColor: '#f87171',
        borderVisible: false,
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
      });
    }
    mainSeries.current = series;

    const primitive = new DrawingPrimitive(() => ({
      drawings: drawingsRef.current,
      selectedId: selectedRef.current,
      preview: previewRef.current,
      hoveredHandle: hoveredHandleRef.current,
      locked: lockedRef.current,
      hide: hideDrawingsRef.current,
      accent: themeAccent(),
      isLight,
      candles: candlesRef.current,
      timeframeMinutes: timeframeMinutes(timeframeRef.current) || 1,
      formatPrice: fmtPrice,
    }));
    primitiveRef.current = primitive;
    try {
      series.attachPrimitive(primitive);
    } catch {
      primitiveRef.current = null;
    }

    const vol = chart.addSeries(HistogramSeries, {
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeries.current = vol;

    try {
      watermark.current = createTextWatermark(chart.panes()[0], {
        horzAlign: 'center',
        vertAlign: 'center',
        lines: [{
          text: 'TradingBible',
          color: isLight ? 'rgba(60,55,40,0.06)' : 'rgba(212,175,55,0.06)',
          fontSize: compact ? 34 : 54,
          fontStyle: 'bold',
          fontFamily: 'Inter, sans-serif',
        }],
      });
    } catch {
      watermark.current = null;
    }

    const onCrosshair = (param) => {
      if (!param?.time || !param?.point) {
        hoverTime.current = null;
        setHover(null);
        return;
      }
      if (hoverTime.current === param.time) return;
      hoverTime.current = param.time;
      const data = param.seriesData?.get(series);
      if (!data) {
        setHover(null);
        return;
      }
      const volume = param.seriesData?.get(vol);
      setHover({
        time: param.time,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        value: data.value,
        volume: volume?.value,
      });
    };
    chart.subscribeCrosshairMove(onCrosshair);

    // Signal the settings effect to re-apply user colours, grid and scale
    // options to the freshly-created series. The chart itself is not rebuilt.
    setChartEpoch((value) => value + 1);

    return () => {
      try { series.detachPrimitive(primitive); } catch { /* ignore */ }
      primitiveRef.current = null;
      try { watermark.current?.detach(); } catch { /* ignore */ }
      chart.remove();
      chartApi.current = null;
      mainSeries.current = null;
      volSeries.current = null;
      compareSeries.current = null;
      overlaySeries.current = [];
      subPanes.current = [];
      watermark.current = null;
      lastPriceLine.current = null;
      lastView.current = '';
    };
  }, [effectiveType, isLight, accentTick, compact, isTv]);

  // Push price data, volume, compare overlay, indicators and the last-price
  // line whenever the feed changes. The main viewport is fitted once per
  // symbol/timeframe/type; live ticks never yank the trader's zoom.
  useEffect(() => {
    const chart = chartApi.current;
    const series = mainSeries.current;
    if (!chart || !series) return;
    if (!candles.length) {
      // The feed clears its candles on symbol/interval changes. Clear the
      // canvas too, otherwise a failed or empty request leaves the previous
      // instrument's prices under the new label.
      try { series.setData([]); } catch { /* ignore */ }
      try { volSeries.current?.setData([]); } catch { /* ignore */ }
      mainDataRef.current = [];
      volDataRef.current = [];
      dataKeyRef.current = '';
      if (compareSeries.current) {
        try { chart.removeSeries(compareSeries.current); } catch { /* ignore */ }
        compareSeries.current = null;
      }
      overlaySeries.current.forEach((item) => { try { chart.removeSeries(item); } catch { /* ignore */ } });
      subPanes.current.forEach((item) => { try { chart.removeSeries(item); } catch { /* ignore */ } });
      overlaySeries.current = [];
      subPanes.current = [];
      for (let i = chart.panes().length - 1; i >= 1; i -= 1) {
        try { chart.removePane(i); } catch { /* ignore */ }
      }
      if (lastPriceLine.current) {
        try { series.removePriceLine(lastPriceLine.current); } catch { /* ignore */ }
        lastPriceLine.current = null;
      }
      lastView.current = '';
      return;
    }

    const clean = candles.filter((candle) => [candle.open, candle.high, candle.low, candle.close]
      .every((value) => Number.isFinite(Number(value)) && Number(value) > 0));
    if (!clean.length) return;

    const data = clean.map((candle) => ({
      time: Math.floor(candle.time / 1000),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }));

    const dataKey = `${activeSymbol}|${activeTimeframe}|${effectiveType}`;
    if (dataKeyRef.current !== dataKey) {
      dataKeyRef.current = dataKey;
      mainDataRef.current = [];
      volDataRef.current = [];
    }
    const nextMain = effectiveType === 'candle' || effectiveType === 'hollow' || effectiveType === 'bar'
      ? data
      : data.map((item) => ({ time: item.time, value: item.close }));
    mainDataRef.current = applySeriesData(series, nextMain, mainDataRef.current);

    const last = Number(clean[clean.length - 1].close);
    const precision = last >= 1000 ? 2 : last >= 1 ? 4 : 6;
    series.applyOptions({
      priceFormat: { type: 'price', precision, minMove: 1 / (10 ** precision) },
      priceLineVisible: false,
    });
    if (effectiveType === 'baseline') {
      series.applyOptions({ baseValue: { type: 'price', price: data[0].value ?? data[0].close } });
    }

    const nextVolume = clean.map((candle) => ({
      time: Math.floor(candle.time / 1000),
      value: Number(candle.volume) || 0,
      color: Number(candle.close) >= Number(candle.open) ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)',
    }));
    volDataRef.current = applySeriesData(volSeries.current, nextVolume, volDataRef.current);

    if (compareSeries.current) {
      try { chart.removeSeries(compareSeries.current); } catch { /* ignore */ }
      compareSeries.current = null;
    }
    if (compareSymbol && compareSymbol !== activeSymbol && compareCandles.length) {
      const compareMap = new Map(compareCandles.map((candle) => [Math.floor(candle.time / 1000), Number(candle.close)]));
      const firstMain = Number(clean[0].close);
      const firstCompare = Number(compareCandles.find((candle) => Number(candle.close) > 0)?.close);
      if (firstMain > 0 && firstCompare > 0) {
        const compareData = clean.map((candle) => {
          const value = compareMap.get(Math.floor(candle.time / 1000));
          if (value == null || !Number.isFinite(value)) return null;
          return { time: Math.floor(candle.time / 1000), value: (value / firstCompare) * firstMain };
        }).filter(Boolean);
        if (compareData.length) {
          compareSeries.current = chart.addSeries(LineSeries, {
            color: '#60a5fa',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            title: compareSymbol,
          }, 0);
          compareSeries.current.setData(compareData);
        }
      }
    }

    overlaySeries.current.forEach((item) => { try { chart.removeSeries(item); } catch { /* ignore */ } });
    subPanes.current.forEach((item) => { try { chart.removeSeries(item); } catch { /* ignore */ } });
    overlaySeries.current = [];
    subPanes.current = [];
    // Remove empty sub-panes left behind by removed indicators. Pane 0 owns
    // price and volume and must survive.
    for (let i = chart.panes().length - 1; i >= 1; i -= 1) {
      try { chart.removePane(i); } catch { /* ignore */ }
    }

    const times = clean.map((candle) => Math.floor(candle.time / 1000));
    let paneIndex = 1;
    indicators.forEach((indicator) => {
      const def = INDICATOR_DEFS[indicator.type];
      if (!def) return;
      let output;
      try {
        output = def.compute(clean, { ...def.defaults, ...indicator.params });
      } catch {
        return;
      }
      if (!output) return;
      const pane = def.pane === 'price' ? 0 : paneIndex++;
      Object.entries(output).forEach(([key, values]) => {
        if (!Array.isArray(values)) return;
        const lineData = values.map((value, index) => (
          value == null ? null : { time: times[index], value: Number(value) }
        )).filter(Boolean);
        if (!lineData.length) return;
        const line = chart.addSeries(LineSeries, {
          color: indicator.color || def.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          title: key,
        }, pane);
        line.setData(lineData);
        if (pane === 0) overlaySeries.current.push(line);
        else subPanes.current.push(line);
      });
      if (pane > 0) {
        try { chart.panes()[pane]?.setHeight(compact ? 66 : 96); } catch { /* ignore */ }
      }
    });

    if (lastPriceLine.current) {
      try { series.removePriceLine(lastPriceLine.current); } catch { /* ignore */ }
      lastPriceLine.current = null;
    }
    lastPriceLine.current = series.createPriceLine({
      price: last,
      color: Number(clean[clean.length - 1].close) >= Number(clean[clean.length - 1].open) ? '#34d399' : '#f87171',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      lineVisible: true,
      title: 'Last',
    });

    const viewKey = `${activeSymbol}-${activeTimeframe}-${effectiveType}`;
    if (viewKey !== lastView.current && data.length > 10) {
      lastView.current = viewKey;
      try {
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, data.length - 120), to: data.length + 7 });
      } catch { /* ignore */ }
    }
    try {
      chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.12, bottom: settings.showVolume ? 0.18 : 0.08 } });
    } catch { /* ignore */ }
  }, [candles, compareCandles, compareSymbol, indicators, effectiveType, activeSymbol, activeTimeframe, compact, settings.showVolume, chartEpoch]);

  // Apply display settings in place so toggling them never resets zoom.
  useEffect(() => {
    const chart = chartApi.current;
    if (!chart) return;
    chart.applyOptions({
      grid: {
        vertLines: { visible: settings.showGrid },
        horzLines: { visible: settings.showGrid },
      },
      crosshair: { mode: settings.crosshair === 'magnet' ? CrosshairMode.Magnet : CrosshairMode.Normal },
    });
    try {
      chart.priceScale('right').applyOptions({
        mode: settings.scale === 'log' ? PriceScaleMode.Logarithmic : settings.scale === 'percent' ? PriceScaleMode.Percentage : PriceScaleMode.Normal,
        scaleMargins: { top: 0.12, bottom: settings.showVolume ? 0.18 : 0.08 },
      });
    } catch { /* ignore */ }
    try { watermark.current?.applyOptions({ visible: settings.showWatermark }); } catch { /* ignore */ }
    try { volSeries.current?.applyOptions({ visible: settings.showVolume }); } catch { /* ignore */ }
    const series = mainSeries.current;
    if (series) {
      if (effectiveType === 'bar') {
        series.applyOptions({
          upColor: settings.upColor,
          downColor: settings.downColor,
        });
      } else if (effectiveType === 'candle' || effectiveType === 'hollow') {
        series.applyOptions({
          upColor: effectiveType === 'hollow' ? 'rgba(0,0,0,0)' : settings.upColor,
          downColor: settings.downColor,
          borderVisible: effectiveType === 'hollow',
          borderUpColor: settings.upColor,
          borderDownColor: settings.downColor,
          wickUpColor: settings.upColor,
          wickDownColor: settings.downColor,
        });
      } else if (effectiveType === 'area') {
        series.applyOptions({
          lineColor: settings.lineColor,
          topColor: hexToRgba(settings.lineColor, 0.35),
          bottomColor: hexToRgba(settings.lineColor, 0.02),
        });
      } else if (effectiveType === 'baseline') {
        series.applyOptions({
          topLineColor: settings.upColor,
          bottomLineColor: settings.downColor,
          topFillColor1: hexToRgba(settings.upColor, 0.25),
          topFillColor2: hexToRgba(settings.upColor, 0.02),
          bottomFillColor1: hexToRgba(settings.downColor, 0.02),
          bottomFillColor2: hexToRgba(settings.downColor, 0.25),
        });
      } else {
        series.applyOptions({ color: settings.lineColor });
      }
    }
    try {
      lastPriceLine.current?.applyOptions({
        lineVisible: settings.showLastPrice,
        axisLabelVisible: settings.showLastPrice,
      });
    } catch { /* ignore */ }
  }, [settings, effectiveType, chartEpoch]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [fullscreen]);

  const removeSelected = useCallback(() => {
    if (!selected) return;
    dz.update((previous) => previous.filter((drawing) => drawing.id !== selected));
    setSelected(null);
  }, [selected, dz]);

  const undo = useCallback(() => {
    dz.undo();
    setSelected(null);
  }, [dz]);

  const redo = useCallback(() => {
    dz.redo();
    setSelected(null);
  }, [dz]);

  const clearAll = useCallback(() => {
    if (!dz.drawings.length) return;
    if (window.confirm('Clear all drawings for this symbol?')) {
      dz.update([]);
      setSelected(null);
    }
  }, [dz]);

  const submitText = useCallback(() => {
    const text = String(textPrompt?.value || '').trim();
    if (!text || !textPrompt?.point) {
      setTextPrompt(null);
      setTool('cursor');
      return;
    }
    const id = uid();
    dz.update((previous) => [...previous, {
      id,
      type: 'text',
      color: themeAccent(),
      text,
      points: [textPrompt.point],
    }]);
    setSelected(id);
    setTextPrompt(null);
    setTool('cursor');
  }, [textPrompt, dz]);

  const { cancelInteraction, finishPath } = useDrawingInteraction({
    wrapRef,
    chartRef: chartApi,
    seriesRef: mainSeries,
    primitiveRef,
    drawingsRef,
    selected,
    setSelected,
    tool,
    setTool,
    pending,
    setPending,
    locked,
    hideDrawings,
    magnet,
    candlesRef,
    updateDrawings: dz.update,
    setTextPrompt,
    accent: themeAccent(),
    timeframeMinutes: timeframeMinutes(activeTimeframe) || 1,
    previewRef,
    hoveredHandleRef,
  });

  const saveTemplate = useCallback(async () => {
    const name = window.prompt('Template name:');
    if (!name) return;
    const shared = window.confirm('Share this template with other users?');
    try {
      await dz.saveTemplate(name, shared);
    } catch {
      /* cloud save is best-effort; the live drawing set is already local */
    }
  }, [dz]);

  const exportPng = useCallback(() => {
    const chart = chartApi.current;
    if (!chart) return;
    try {
      const canvas = chart.takeScreenshot();
      const link = document.createElement('a');
      link.download = `${activeSymbol}-${activeTimeframe}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      /* export is best-effort */
    }
  }, [activeSymbol, activeTimeframe]);

  const handleSnapshot = useCallback(() => {
    if (onSnapshot) onSnapshot();
    else exportPng();
  }, [onSnapshot, exportPng]);

  const handleShare = useCallback(async () => {
    if (onShare) {
      await onShare();
      return;
    }
    const url = `${window.location.origin}/app/terminal-pro?symbol=${encodeURIComponent(activeSymbol)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [onShare, activeSymbol]);

  const handleReplay = useCallback(() => {
    if (onOpenReplay) onOpenReplay();
    else navigate(`/app/backtest?symbol=${encodeURIComponent(activeSymbol)}`);
  }, [onOpenReplay, navigate, activeSymbol]);

  useEffect(() => {
    const onKey = (event) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Escape') {
        if (textPrompt) { setTextPrompt(null); setTool('cursor'); return; }
        if (pickerOpen) { setPickerOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (objectsOpen) { setObjectsOpen(false); return; }
        if (templatesOpen) { setTemplatesOpen(false); return; }
        if (actionsOpen) { setActionsOpen(false); return; }
        if (pending.length || tool !== 'cursor') {
          cancelInteraction();
          setTool('cursor');
          return;
        }
        if (fullscreen) { setFullscreen(false); return; }
      }
      if (event.key === 'Enter' && tool === 'path') {
        event.preventDefault();
        finishPath();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !locked) {
        event.preventDefault();
        removeSelected();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [textPrompt, pickerOpen, settingsOpen, objectsOpen, templatesOpen, actionsOpen, pending, tool, fullscreen, selected, locked, removeSelected, undo, redo, cancelInteraction, finishPath]);

  const lastCandle = candles.length ? candles[candles.length - 1] : null;
  const quotePrice = Number(quote?.price);
  const displayPrice = Number.isFinite(quotePrice) && quotePrice > 0 ? quotePrice : (lastCandle ? Number(lastCandle.close) : null);
  const rawQuoteChange = quote?.changePercent;
  const quoteChange = rawQuoteChange == null || rawQuoteChange === ''
    ? NaN
    : Number(String(rawQuoteChange).replace('%', ''));
  const previousClose = candles.length > 1 ? Number(candles[candles.length - 2].close) : NaN;
  const computedChange = Number.isFinite(previousClose) && previousClose > 0
    ? ((Number(lastCandle.close) - previousClose) / previousClose) * 100
    : null;
  const displayChange = Number.isFinite(quoteChange) ? quoteChange : computedChange;
  const up = (displayChange ?? 0) >= 0;
  const isSynthetic = quote?.source === 'synthetic' || source === 'synthetic';
  const hovered = hover || lastCandle;
  const showSim = isSynthetic || source === 'synthetic';
  const showClosed = source === 'close' || quote?.source === 'close';

  const settingsModal = settingsOpen ? (
    <Modal title="Chart settings" onClose={() => setSettingsOpen(false)}>
      <div className="space-y-2.5">
        <SettingRow label="Grid lines" hint="Show vertical and horizontal price grid." checked={settings.showGrid} onChange={(value) => setSettings((current) => ({ ...current, showGrid: value }))} />
        <SettingRow label="Volume" hint="Show the volume histogram under price." checked={settings.showVolume} onChange={(value) => setSettings((current) => ({ ...current, showVolume: value }))} />
        <SettingRow label="Watermark" hint="Show the TradingBible watermark behind the chart." checked={settings.showWatermark} onChange={(value) => setSettings((current) => ({ ...current, showWatermark: value }))} />
        <SettingRow label="Last price line" hint="Show the dashed last-price marker and axis label." checked={settings.showLastPrice} onChange={(value) => setSettings((current) => ({ ...current, showLastPrice: value }))} />
        <label className="block text-xs text-[#8a8577]">
          Price scale
          <select value={settings.scale} onChange={(event) => setSettings((current) => ({ ...current, scale: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">
            <option value="normal">Normal</option>
            <option value="log">Logarithmic</option>
            <option value="percent">Percentage</option>
          </select>
        </label>
        <label className="block text-xs text-[#8a8577]">
          Crosshair
          <select value={settings.crosshair} onChange={(event) => setSettings((current) => ({ ...current, crosshair: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">
            <option value="magnet">Magnet</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['upColor', 'Up'],
            ['downColor', 'Down'],
            ['lineColor', 'Line'],
          ].map(([key, label]) => (
            <label key={key} className="text-[10px] uppercase tracking-wide text-[#5f5b50]">
              {label}
              <input type="color" value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-8 w-full cursor-pointer rounded border border-white/10 bg-transparent" />
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setSettings(DEFAULT_SETTINGS)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-[#c9c4b4] hover:text-[#e9e7df]">
          <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
        </button>
      </div>
    </Modal>
  ) : null;

  const objectsModal = objectsOpen ? (
    <Modal title="Chart objects" onClose={() => setObjectsOpen(false)}>
      {dz.drawings.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#8a8577]">No drawings on {activeSymbol} yet.</p>
      ) : (
        <div className="space-y-1.5">
          {dz.drawings.map((drawing) => (
            <div key={drawing.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <button type="button" onClick={() => { setSelected(drawing.id); setObjectsOpen(false); }} className="min-w-0 flex-1 text-left">
                <span className="font-mono text-[11px] text-[#e9e7df]">{drawing.type}</span>
                <span className="ml-2 text-[10px] text-[#8a8577]">
                  {drawing.text || (drawing.points?.[0]?.price != null ? fmtPrice(drawing.points[0].price) : '')}
                </span>
              </button>
              <button type="button" onClick={() => dz.update((previous) => previous.filter((item) => item.id !== drawing.id))} aria-label={`Delete ${drawing.type}`} className="rounded p-1 text-red-400/70 hover:bg-red-400/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={clearAll} disabled={!dz.drawings.length} className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs text-red-400 disabled:opacity-40">Clear all</button>
        <button type="button" onClick={() => setObjectsOpen(false)} className="rounded-lg border border-[#d4af37]/25 px-3 py-1.5 text-xs font-semibold text-[#d4af37]">Done</button>
      </div>
    </Modal>
  ) : null;

  const templatesModal = templatesOpen ? (
    <Modal title="Drawing templates" onClose={() => setTemplatesOpen(false)}>
      <button type="button" onClick={saveTemplate} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d4af37]/25 px-3 py-2 text-xs font-semibold text-[#d4af37]">
        <Save className="h-3.5 w-3.5" /> Save current drawings as template
      </button>
      <div className="mt-3 space-y-1.5">
        {dz.templates.length === 0 && <p className="py-3 text-center text-xs text-[#8a8577]">No templates for {activeSymbol} yet.</p>}
        {dz.templates.map((template) => (
          <div key={template.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <button type="button" onClick={() => { dz.applyTemplate(template); setTemplatesOpen(false); }} className="min-w-0 flex-1 text-left text-xs text-[#e9e7df]">
              {template.name} {template.shared ? <span className="text-[9px] text-emerald-400">shared</span> : null}
            </button>
            <button type="button" onClick={() => dz.deleteTemplate(template.id)} aria-label={`Delete ${template.name}`} className="rounded p-1 text-[#5f5b50] hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  ) : null;

  const textModal = textPrompt ? (
    <Modal title="Text label" onClose={() => { setTextPrompt(null); setTool('cursor'); }}>
      <input
        autoFocus
        value={textPrompt.value}
        onChange={(event) => setTextPrompt((current) => ({ ...current, value: event.target.value }))}
        onKeyDown={(event) => { if (event.key === 'Enter') submitText(); }}
        placeholder="Label text"
        className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => { setTextPrompt(null); setTool('cursor'); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#8a8577]">Cancel</button>
        <button type="button" onClick={submitText} className="rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-xs font-bold text-[#0a0a0f]">Add label</button>
      </div>
    </Modal>
  ) : null;

  const actionButton = 'flex min-h-[42px] items-center justify-start gap-2 rounded-lg border border-[#d4af37]/15 px-3 text-left text-[11px] font-semibold text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#f0ecdd]';
  const actionsModal = actionsOpen ? (
    <Modal title="Chart actions" onClose={() => setActionsOpen(false)}>
      <div className="space-y-4">
        {!isTv && (
          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Compare</p>
            <SymbolSearchPicker
              value={compareSymbol || 'Add compare…'}
              onChange={(next) => setCompareSymbol(next)}
              buttonClassName="w-full justify-between"
              dropdownClassName={fullscreen ? '!z-[140]' : ''}
            />
            {compareSymbol && (
              <button type="button" onClick={() => setCompareSymbol('')} className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:underline">
                <X className="h-3 w-3" /> Clear compare
              </button>
            )}
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#5f5b50]">Compare is normalized to the first loaded close so both lines share one scale.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {!isTv && (
            <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); setSettingsOpen(true); }}>
              <Settings2 className="h-3.5 w-3.5 text-[#d4af37]" /> Settings
            </button>
          )}
          <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); handleReplay(); }}>
            <History className="h-3.5 w-3.5 text-[#d4af37]" /> Replay
          </button>
          <Link to={`/app/alerts?symbol=${encodeURIComponent(activeSymbol)}`} onClick={() => setActionsOpen(false)} className={actionButton}>
            <Bell className="h-3.5 w-3.5 text-[#d4af37]" /> Price alert
          </Link>
          <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); handleSnapshot(); }}>
            <Camera className="h-3.5 w-3.5 text-[#d4af37]" /> Snapshot
          </button>
          {!isTv && (
            <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); exportPng(); }}>
              <Download className="h-3.5 w-3.5 text-[#d4af37]" /> Export PNG
            </button>
          )}
          <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); handleShare(); }}>
            <Share2 className="h-3.5 w-3.5 text-[#d4af37]" /> Share view
          </button>
        </div>
        {onLayoutChange && (
          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Chart layout</p>
            <div className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 p-1" role="group" aria-label="Chart layout">
              {LAYOUTS.map((item) => (
                <button key={item.id} type="button" onClick={() => { onLayoutChange(item.id); setActionsOpen(false); }} className={`flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md text-[10px] font-semibold ${layout === item.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isTv && (
          <div className="border-t border-white/5 pt-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a8577]">Drawings · {dz.drawings.length}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); setObjectsOpen(true); }}>
                <List className="h-3.5 w-3.5 text-[#d4af37]" /> Objects
              </button>
              <button type="button" className={actionButton} onClick={() => { setActionsOpen(false); setTemplatesOpen(true); }}>
                <BookMarked className="h-3.5 w-3.5 text-[#d4af37]" /> Templates
              </button>
              <button type="button" disabled={!dz.drawings.length || locked} onClick={() => { setActionsOpen(false); clearAll(); }} className={`${actionButton} text-red-400 disabled:opacity-40`}>
                <Eraser className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  ) : null;

  const toolbar = showToolbar ? (
    <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto border-b border-white/8 bg-[#0c0c11]/95 px-2 py-1.5">
      {!compact && (
        <div className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex">
          {!hidePicker ? (
            <div className="min-w-0 shrink-0">
              <SymbolSearchPicker
                value={activeSymbol}
                onChange={changeSymbol}
                buttonClassName="!py-1 !text-[11px]"
                dropdownClassName={fullscreen ? '!z-[140]' : ''}
              />
            </div>
          ) : (
            <span className="font-mono text-xs font-bold text-[#f0ecdd]">{activeSymbol}</span>
          )}
          <span className="max-w-[8rem] shrink-0 truncate text-[10px] text-[#8a8577]">{symbolName(activeSymbol)}</span>
          <span className="shrink-0 font-mono text-sm font-bold text-[#f0ecdd]">{fmtPrice(displayPrice)}</span>
          <span className={`shrink-0 font-mono text-[11px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {displayChange == null ? '—' : `${up ? '+' : ''}${Number(displayChange).toFixed(2)}%`}
          </span>
          {showSim && <span className="shrink-0 rounded bg-amber-400/15 px-1 py-0.5 text-[9px] font-bold text-amber-400">SIM</span>}
          {showClosed && <span className="shrink-0 rounded bg-[#d4af37]/15 px-1 py-0.5 text-[9px] font-bold text-[#d4af37]">CLOSED</span>}
        </div>
      )}
      <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
        <select
          value={activeTimeframe}
          onChange={(event) => changeTimeframe(event.target.value)}
          aria-label="Chart timeframe"
          className="h-7 w-16 shrink-0 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 font-mono text-[11px] text-[#e9e7df] outline-none sm:w-auto"
        >
          {TIMEFRAME_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </optgroup>
          ))}
        </select>
        <select
          value={effectiveType}
          onChange={(event) => changeChartType(event.target.value)}
          aria-label="Chart type"
          className="h-7 w-[6.5rem] shrink-0 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 text-[11px] text-[#e9e7df] outline-none sm:w-auto"
        >
          {CHART_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        {!isTv && (
          <button type="button" onClick={() => setPickerOpen(true)} className="flex h-7 w-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-[#d4af37]/15 text-[11px] text-[#d4af37] hover:border-[#d4af37]/40 sm:w-auto sm:px-2" title="Configure indicators">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Indicators</span>
            <span className="hidden sm:inline">({indicators.length})</span>
          </button>
        )}
        {!compact && (
          <>
            <button type="button" onClick={handleSnapshot} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10" title="Snapshot to journal and download PNG">
              <Camera className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setActionsOpen(true)} className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#d4af37]/15 hover:text-[#e9e7df] ${compareSymbol ? 'text-[#60a5fa]' : 'text-[#8a8577]'}`} title="More chart actions" aria-label="More chart actions">
              <Ellipsis className="h-3.5 w-3.5" />
              {(compareSymbol || dz.drawings.length > 0) && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#d4af37]" />}
            </button>
          </>
        )}
        <button type="button" onClick={() => { lastView.current = ''; setFullscreen((value) => !value); }} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  ) : null;

  const drawingToolbar = !isTv && showDrawingToolbar ? (
    <div role="toolbar" aria-label="Drawing tools" className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-white/5 bg-[#0c0c11]/80 px-2 py-1">
      {(compact ? DRAW_TOOLS.filter((item) => COMPACT_TOOL_IDS.includes(item.id)) : DRAW_TOOLS).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => { cancelInteraction(); setTool(item.id); setPending([]); }}
          title={item.label}
          aria-label={item.label}
          aria-pressed={tool === item.id}
          disabled={locked}
          className={`shrink-0 rounded-lg border p-1.5 transition ${tool === item.id ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'} disabled:opacity-40`}
        >
          <item.icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <div className="mx-1 h-4 w-px shrink-0 bg-[#d4af37]/15" />
      <button type="button" onClick={() => setMagnet((value) => !value)} title="Magnet: snap to OHLC" aria-label="Magnet: snap to OHLC" aria-pressed={magnet} className={`shrink-0 rounded-lg border p-1.5 ${magnet ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}>
        <Magnet className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => setLocked((value) => !value)} title={locked ? 'Unlock drawings' : 'Lock drawings'} aria-label={locked ? 'Unlock drawings' : 'Lock drawings'} aria-pressed={locked} className={`shrink-0 rounded-lg border p-1.5 ${locked ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}>
        {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => setHideDrawings((value) => !value)} title={hideDrawings ? 'Show drawings' : 'Hide drawings'} aria-label={hideDrawings ? 'Show drawings' : 'Hide drawings'} aria-pressed={hideDrawings} className={`shrink-0 rounded-lg border p-1.5 ${hideDrawings ? 'border-[#d4af37]/50 bg-[#d4af37]/15 text-[#d4af37]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}>
        {hideDrawings ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={undo} disabled={!dz.canUndo || locked} title="Undo" aria-label="Undo drawing" className="shrink-0 rounded-lg border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df] disabled:opacity-40">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={redo} disabled={!dz.canRedo || locked} title="Redo" aria-label="Redo drawing" className="shrink-0 rounded-lg border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df] disabled:opacity-40">
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={removeSelected} disabled={!selected || locked} title="Delete selected drawing" aria-label="Delete selected drawing" className="shrink-0 rounded-lg border border-[#d4af37]/15 p-1.5 text-red-400/70 hover:text-red-400 disabled:opacity-40">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {tool === 'path' && pending.length >= 2 ? (
        <button type="button" onClick={finishPath} title="Finish path" className="shrink-0 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/15 p-1.5 text-[#d4af37]">
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button type="button" onClick={() => setActionsOpen(true)} title="More drawing actions" aria-label="More drawing actions" className="shrink-0 rounded-lg border border-[#d4af37]/15 p-1.5 text-[#8a8577] hover:text-[#e9e7df]">
        <Ellipsis className="h-3.5 w-3.5" />
      </button>
      {dz.saveError ? (
        <span className="ml-1 shrink-0 text-[10px] text-amber-400">{dz.saveError}</span>
      ) : dz.drawings.length > 0 ? (
        <span className="ml-1 shrink-0 text-[10px] text-emerald-400">✓ {dz.drawings.length}</span>
      ) : null}
    </div>
  ) : null;

  const legend = !isTv ? (
    <div className="pointer-events-none absolute left-2 top-2 z-20 hidden flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-white/8 bg-[#0a0a0f]/75 px-2 py-1 font-mono text-[10px] text-[#c9c4b4] backdrop-blur-sm sm:flex sm:text-[11px]">
      <span className="font-bold text-[#f0ecdd]">{activeSymbol}</span>
      <span className="text-[#8a8577]">{activeTimeframe}</span>
      {hovered?.open != null ? (
        <>
          <span>O <span className="text-[#f0ecdd]">{fmtPrice(hovered.open)}</span></span>
          <span>H <span className="text-emerald-400">{fmtPrice(hovered.high)}</span></span>
          <span>L <span className="text-red-400">{fmtPrice(hovered.low)}</span></span>
          <span>C <span className="text-[#f0ecdd]">{fmtPrice(hovered.close)}</span></span>
        </>
      ) : hovered?.value != null ? (
        <span>C <span className="text-[#f0ecdd]">{fmtPrice(hovered.value)}</span></span>
      ) : null}
      {hovered?.volume != null && <span className="hidden sm:inline">V <span className="text-[#8a8577]">{fmtCompact(hovered.volume)}</span></span>}
      {hovered?.time != null && <span className="hidden text-[#5f5b50] md:inline">{timeLabel(hovered.time)}</span>}
      {showSim && <span className="rounded bg-amber-400/15 px-1 text-[9px] font-bold text-amber-400">SIMULATED</span>}
      {showClosed && <span className="rounded bg-[#d4af37]/15 px-1 text-[9px] font-bold text-[#d4af37]">CLOSED</span>}
    </div>
  ) : null;

  const chartBody = (
    <div className={`relative min-h-0 ${height === 'h-full' ? 'flex-1' : ''} ${isLight ? 'bg-[#fbf9f3]' : 'bg-[#0a0a0f]'}`}>
      {isTv ? (
        <div className={height === 'h-full' ? 'h-full w-full' : `${height || 'h-[460px]'} w-full`}>
          <TradingViewChart symbol={activeSymbol} timeframe={activeTimeframe} dark={!isLight} />
        </div>
      ) : (
        <>
          <div
            ref={wrapRef}
            data-tb-chart={activeSymbol}
            data-tb-chart-type={effectiveType}
            style={{ touchAction: 'none' }}
            className={height === 'h-full' ? 'h-full w-full' : `${height || 'h-[460px]'} w-full`}
          />
          {legend}
          {tool !== 'cursor' && (
            <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-2 sm:top-3">
              <div role="status" aria-live="polite" className="max-w-full truncate rounded-full border border-[#d4af37]/35 bg-[#0a0a0f]/90 px-3 py-1 font-mono text-[10px] font-semibold text-[#e9e7df] shadow-lg backdrop-blur">
                <span className="text-[#d4af37]">{DRAW_TOOLS.find((item) => item.id === tool)?.label || 'Drawing'}</span>
                <span className="ml-2 text-[#b8b3a3]">
                  {tool === 'path'
                    ? `Click to add anchors · ${pending.length} placed · Enter/double-click to finish · Esc to cancel`
                    : `Click point ${Math.min(pending.length + 1, DRAW_TOOLS.find((item) => item.id === tool)?.clicks || 1)} of ${DRAW_TOOLS.find((item) => item.id === tool)?.clicks || 1} · Esc to cancel`}
                </span>
              </div>
            </div>
          )}
          {status === 'error' && !candles.length && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-[#0a0a0f]/60 text-center">
              <div>
                <p className="text-sm text-red-400">Could not load candles for {activeSymbol}.</p>
                <button type="button" onClick={refresh} className="mt-2 rounded-lg border border-[#d4af37]/30 px-3 py-1.5 text-xs font-semibold text-[#d4af37]">Retry</button>
              </div>
            </div>
          )}
          {status === 'loading' && !candles.length && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-[#0a0a0f]/40">
              <Loader2 className="h-5 w-5 animate-spin text-[#d4af37]" />
            </div>
          )}
          {status === 'ready' && !candles.length && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-[#0a0a0f]/40 px-4 text-center">
              <div>
                <p className="text-sm text-[#8a8577]">No candles returned for {activeSymbol} {activeTimeframe}.</p>
                <p className="mt-1 text-xs text-[#5f5b50]">The market may be closed or the provider has no history for this interval.</p>
                <button type="button" onClick={refresh} className="mt-2 rounded-lg border border-[#d4af37]/30 px-3 py-1.5 text-xs font-semibold text-[#d4af37]">Retry</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const footer = !compact && !isTv ? (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-white/5 bg-[#0c0c11]/80 px-2 py-1 font-mono text-[10px] text-[#5f5b50] sm:flex">
      <span>{candles.length} bars</span>
      <span>{sourceLabel(source)}</span>
      <span>{status}</span>
      {compareSymbol && <span className="text-[#60a5fa]">vs {compareSymbol}</span>}
      <span className="ml-auto">{dz.drawings.length} objects · {locked ? 'locked' : 'editable'}</span>
    </div>
  ) : null;

  const tvNote = isTv ? (
    <div className="border-t border-white/5 bg-[#0c0c11]/80 px-2 py-1 text-[10px] text-[#8a8577]">
      Third-party TradingView embed. Drawings and indicators live in TradingView, not in TradingBible. Switch to Candles, Line or Area to save analysis to your account.
    </div>
  ) : null;

  const content = (
    <div data-tb-chart-root={activeSymbol} className={`flex min-h-0 flex-col overflow-hidden border border-white/8 ${height === 'h-full' ? 'h-full' : ''} ${fullscreen ? 'fixed inset-0 z-[100] rounded-none border-0 bg-[#0a0a0f] p-2 pt-[max(0.5rem,env(safe-area-inset-top))]' : `rounded-xl ${isLight ? 'bg-[#fbf9f3]' : 'bg-[#0a0a0f]'} ${className}`}`}>
      {toolbar}
      {drawingToolbar}
      {chartBody}
      {footer}
      {tvNote}
    </div>
  );

  const modals = (
    <>
      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
      {settingsModal}
      {objectsModal}
      {templatesModal}
      {textModal}
      {actionsModal}
    </>
  );

  return fullscreen && typeof document !== 'undefined'
    ? createPortal(<>{content}{modals}</>, document.body)
    : <>{content}{modals}</>;
}
