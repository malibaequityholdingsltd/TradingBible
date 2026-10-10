// @tradingbible/sdk (in-app incubator) — reusable terminal module.
// Brokers can later buy Charts only, Charts + OrderFlow + Heatmap, or the
// full terminal. Props mirror the future B2B contract:
//
//   <TradingBibleTerminal symbol="XAUUSD" account={account}
//     features={["charts","orderflow","footprint","heatmap","dom","replay","journal","alerts"]}
//     autosave restoreWorkspace />
//
// Attribution: embedded charts show "TB · Chart by TradingBible";
// the full workstation shows "Powered by TradingBible".
import React from 'react';
import LiveChart from '@/components/LiveChart';
import OrderflowChart from '@/components/OrderflowChart';
import FootprintChart from '@/components/FootprintChart';
import AdvancedChart from '@/components/AdvancedChart';
import IndicatorPicker from '@/components/IndicatorPicker';
import NewsPanel from '@/terminal/panels/NewsPanel';
import { useCandles } from '@/hooks/useCandles';
import { INDICATOR_DEFS } from '@/lib/indicators';
import MarketHeatmap from '@/components/MarketHeatmap';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { PREMIUM_FEATURES } from '@/terminal/premiumStore';

export function hasFeature(features, f) {
  if (!features || !features.length) return true;
  return features.includes(f);
}

export function Attribution({ full = false }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8a8577]">
      <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-4 w-4 rounded object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <span>{full ? 'Powered by TradingBible' : 'Chart by TradingBible'}</span>
    </div>
  );
}

// Headless building blocks for future @tradingbible/charts, @tradingbible/orderflow,
// @tradingbible/heatmap, @tradingbible/dom, @tradingbible/replay packages.
export function TBChart({ symbol, timeframe, chartType, onSnapshot, onShare, onSymbolChange }) {
  const type = chartType || 'candle';
  return (
    <div>
      {/* Key includes the chart type: LiveChart snapshots its initial props
          into internal state, so a new key is the only reliable way to make
          symbol / timeframe / type switches actually take effect. */}
      {/* The terminal owns symbol switching (header picker, strip,
          watchlists, palette) — the chart's own picker button is hidden
          here so there is exactly one way to switch per surface. */}
      <LiveChart key={`${symbol}-${timeframe}-${type}`} initialSymbol={symbol} initialTimeframe={timeframe} initialType={type} compact hidePicker onSnapshot={onSnapshot} onShare={onShare} onSymbolChange={onSymbolChange} />
      <div className="mt-1.5 flex justify-end"><Attribution /></div>
    </div>
  );
}

export function TBOrderflow({ symbol }) {
  return (
    <div>
      {/* Order-flow canvas is engineered as a dark pro stage (like a
          Bloomberg panel) — intentionally dark in both themes so the
          heat cells, delta and auction graphics stay exactly calibrated. */}
      <div className="term-stage overflow-hidden rounded-xl border border-[#d4af37]/25">
        <OrderflowChart symbol={symbol} />
      </div>
      <div className="mt-1.5 flex justify-between gap-2">
        <span className="term-faint text-xs">Pro dark stage · calibrated for microstructure contrast</span>
        <Attribution />
      </div>
    </div>
  );
}

export function TBFootprint({ symbol, onSymbolChange }) {
  return (
    <div>
      {/* Footprint is tape-built, not a second order-flow pane: each 5-minute
          candle stacks live bid x ask prints per price level with POC. */}
      <div className="term-stage overflow-hidden rounded-xl border border-[#d4af37]/25 p-2">
        <FootprintChart symbol={symbol} onSymbolChange={onSymbolChange} />
      </div>
      <div className="mt-1.5 flex justify-between gap-2">
        <span className="term-faint text-xs">Live tape · bid×ask per level · gold line = POC</span>
        <Attribution />
      </div>
    </div>
  );
}

export function TBHeatmap({ category, period, onSelect }) {
  const [type, setType] = React.useState(category || 'all');
  const [per, setPer] = React.useState(period || '1d');
  return (
    <div>
      <MarketHeatmap type={type} setType={setType} period={per} setPeriod={setPer} onSelect={onSelect} />
      <div className="mt-1.5 flex justify-end"><Attribution /></div>
    </div>
  );
}

// News desk: high-impact calendar events + headlines + news TV channels.
export function TBNews({ symbol }) {
  return (
    <div>
      <NewsPanel symbol={symbol} headlineLimit={8} channelLimit={8} />
      <div className="mt-1.5 flex justify-end"><Attribution full /></div>
    </div>
  );
}

const DEFAULT_TB_INDS = [
  { id: 'sma-1', type: 'sma', params: { period: 20 }, color: '#d4af37' },
  { id: 'ema-1', type: 'ema', params: { period: 50 }, color: '#60a5fa' },
  { id: 'rsi-1', type: 'rsi', params: { period: 14 }, color: '#d4af37' },
  { id: 'macd-1', type: 'macd', params: { fast: 12, slow: 26, signal: 9 }, color: '#60a5fa' },
];

function lastTBValue(arr) {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

// Indicators desk: full indicator chart + configure picker + live values.
export function TBIndicators({ symbol, timeframe }) {
  const [chartType, setChartType] = React.useState('candle');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [indicators, setIndicators] = React.useState(DEFAULT_TB_INDS);
  const { candles, status } = useCandles(symbol, timeframe, { limit: 200 });
  const liveValues = React.useMemo(() => {
    if (!candles.length) return [];
    return indicators.map((ind) => {
      const def = INDICATOR_DEFS[ind.type];
      if (!def || typeof def.compute !== 'function') return { ind, def: def || { label: ind.type }, values: [] };
      try {
        const out = def.compute(candles, { ...def.defaults, ...ind.params });
        if (!out) return { ind, def, values: [] };
        const values = Object.entries(out).map(([k, arr]) => ({ key: k.replace(/^[A-Z]+_/, ''), value: lastTBValue(arr) }));
        return { ind, def, values };
      } catch {
        return { ind, def, values: [] };
      }
    });
  }, [candles, indicators]);
  return (
    <div>
      <div className="grid gap-2 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          {status === 'error' && !candles.length
            ? <div className="grid h-64 place-items-center text-sm text-red-400/80">Could not load candles.</div>
            : <AdvancedChart symbol={symbol} candles={candles} chartType={chartType} timeframe={timeframe}
                indicators={indicators} onChartType={setChartType}
                onOpenIndicators={() => setPickerOpen(true)} onRemoveIndicator={(id) => setIndicators(indicators.filter((i) => i.id !== id))} />}
        </div>
        <div className="min-w-0 space-y-2">
          <button onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 px-3 py-2.5 text-sm font-semibold text-[#d4af37]">
            Configure indicators ({indicators.length})
          </button>
          {liveValues.map(({ ind, def, values }) => (
            <div key={ind.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ind.color || '#d4af37' }} />
                <span className="truncate text-sm font-medium text-[#f0ecdd]">{def.label}</span>
                <button onClick={() => setIndicators(indicators.filter((i) => i.id !== ind.id))}
                  aria-label={`Remove ${def.label}`} className="ml-auto shrink-0 text-xs text-[#5f5b50] hover:text-red-400">✕</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                {values.map((v) => (
                  <span key={v.key} className="text-[#8a8577]">{v.key} <span className="text-[#e9e7df]">{v.value != null ? Number(v.value).toLocaleString() : '—'}</span></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
      <div className="mt-1.5 flex justify-end"><Attribution /></div>
    </div>
  );
}

// Full workstation building block. Layout is composed by the app; this keeps
// the module boundary clean for later extraction to @tradingbible/react.
export default function TradingBibleTerminal({ symbol = 'XAUUSD', features = PREMIUM_FEATURES, children }) {
  return (
    <div data-tb-terminal={symbol} data-tb-features={(features || []).join(',')}>
      {children}
    </div>
  );
}
