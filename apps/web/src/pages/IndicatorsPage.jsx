import React, { useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AdvancedChart from '@/components/AdvancedChart';
import IndicatorPicker from '@/components/IndicatorPicker';
import { useCandles } from '@/hooks/useCandles';
import { SYMBOL_GROUPS } from '@/lib/symbols';
import { INDICATOR_DEFS } from '@/lib/indicators';

const DESCRIPTIONS = {
  sma: 'Arithmetic mean of closing prices — smooths trend direction.',
  ema: 'Weights recent prices more heavily; reacts faster than SMA.',
  wma: 'Linearly weighted average favouring the latest bars.',
  rsi: 'Momentum oscillator (0–100); >70 overbought, <30 oversold.',
  macd: 'Difference of two EMAs with a signal line and histogram.',
  stochastic: 'Compares close to the recent high/low range for momentum.',
  bollinger: 'SMA envelope ± standard deviations to gauge volatility.',
  atr: 'Average true range — pure volatility measure.',
  stddev: 'Standard deviation of price around its mean.',
  adx: 'Trend strength (0–100); >25 signals a strong trend.',
  ichimoku: 'Multi-line cloud system for trend, support and momentum.',
  obv: 'Cumulative volume flow confirming price moves.',
  vroc: 'Rate of change of volume over a lookback window.',
};

function lastValue(arr) {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

export default function IndicatorsPage() {
  const [symbol, setSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState('candle');
  const [symOpen, setSymOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [indicators, setIndicators] = useState([
    { id: 'sma-1', type: 'sma', params: { period: 20 }, color: '#d4af37' },
    { id: 'ema-1', type: 'ema', params: { period: 50 }, color: '#60a5fa' },
    { id: 'rsi-1', type: 'rsi', params: { period: 14 }, color: '#d4af37' },
    { id: 'macd-1', type: 'macd', params: { fast: 12, slow: 26, signal: 9 }, color: '#60a5fa' },
  ]);

  const { candles, status } = useCandles(symbol, timeframe, { limit: 200 });

  const liveValues = useMemo(() => {
    if (!candles.length) return [];
    return indicators.map((ind) => {
      const def = INDICATOR_DEFS[ind.type];
      const out = def.compute(candles, { ...def.defaults, ...ind.params });
      const values = Object.entries(out).map(([k, arr]) => ({ key: k.replace(/^[A-Z]+_/, ''), value: lastValue(arr) }));
      return { ind, def, values };
    });
  }, [candles, indicators]);

  return (
    <AppLayout title="Technical Indicators">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <button onClick={() => setSymOpen((o) => !o)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-1.5 text-sm font-medium text-[#e9e7df]">{symbol} <ChevronDown className="h-3.5 w-3.5" /></button>
          {symOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setSymOpen(false)} />
              <div className="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[#d4af37]/15 bg-[#0d0d12] p-2 no-scrollbar">
                {SYMBOL_GROUPS.map((g) => (
                  <div key={g.label} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">{g.label}</div>
                    {g.symbols.map((s) => (
                      <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/5 ${symbol === s.symbol ? 'text-[#d4af37]' : 'text-[#c9c4b4]'}`}>
                        <span className="font-mono">{s.symbol}</span><span className="text-[10px] text-[#8a8577]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/15 px-3 py-1.5 text-sm text-[#d4af37] hover:border-[#d4af37]/40"><Plus className="h-4 w-4" /> Configure indicators</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="glass rounded-2xl p-3 sm:p-4 xl:col-span-2">
          {status === 'error' && !candles.length
            ? <div className="grid h-64 place-items-center text-sm text-red-400/80">Failed to load market data.</div>
            : <AdvancedChart symbol={symbol} candles={candles} chartType={chartType} timeframe={timeframe}
                indicators={indicators} onChartType={setChartType} onTimeframe={setTimeframe}
                onOpenIndicators={() => setPickerOpen(true)} onRemoveIndicator={(id) => setIndicators(indicators.filter((i) => i.id !== id))} />}
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="mb-3 font-semibold text-[#f0ecdd]">Live indicator values</h3>
          <div className="space-y-3">
            {liveValues.length === 0 && <p className="text-xs text-[#8a8577]">Add indicators to see live values.</p>}
            {liveValues.map(({ ind, def, values }) => (
              <div key={ind.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ind.color || def.color }} />
                  <span className="text-sm font-medium text-[#f0ecdd]">{def.label}</span>
                  <span className="ml-auto text-[10px] text-[#8a8577]">{Object.entries(ind.params).map(([k, v]) => `${k} ${v}`).join(' · ')}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                  {values.map((v) => (
                    <span key={v.key} className="text-[#8a8577]">{v.key} <span className="text-[#e9e7df]">{v.value != null ? v.value.toLocaleString() : '—'}</span></span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#8a8577]">{DESCRIPTIONS[ind.type]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 font-semibold text-[#f0ecdd]">Indicator library</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(INDICATOR_DEFS).map(([type, def]) => (
            <div key={type} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#f0ecdd]">{def.label}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase text-[#8a8577]">{def.pane === 'price' ? 'Overlay' : 'Panel'}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">{DESCRIPTIONS[type]}</p>
            </div>
          ))}
        </div>
      </div>

      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
    </AppLayout>
  );
}
