import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCandles } from '@/hooks/useCandles';
import { SYMBOL_GROUPS } from '@/lib/symbols';
import AdvancedChart from '@/components/AdvancedChart';
import IndicatorPicker from '@/components/IndicatorPicker';

// One chart tile: symbol picker + AdvancedChart + indicator modal.
export default function ChartPanel({
  initialSymbol = 'BTCUSD', initialTimeframe = '1h', initialType = 'candle',
  initialIndicators = [], compact = false, className = '',
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [chartType, setChartType] = useState(initialType);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [symOpen, setSymOpen] = useState(false);

  const { candles, status } = useCandles(symbol, timeframe, { limit: 200 });

  const chart = (
    <AdvancedChart
      symbol={symbol} candles={candles} chartType={chartType} timeframe={timeframe}
      indicators={indicators} compact={compact && !fullscreen}
      onChartType={setChartType} onTimeframe={setTimeframe}
      onOpenIndicators={() => setPickerOpen(true)} onRemoveIndicator={(id) => setIndicators(indicators.filter((i) => i.id !== id))}
      fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen((f) => !f)}
    />
  );

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
                  <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymOpen(false); }}
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
      <div className={`glass rounded-2xl p-3 sm:p-4 ${className} ${fullscreen ? 'fixed inset-2 z-[55] overflow-y-auto' : ''}`}>
        <div className="mb-2">{symbolPicker}</div>
        {status === 'error' && !candles.length
          ? <div className="grid h-48 place-items-center text-sm text-red-400/80">Failed to load market data.</div>
          : chart}
      </div>
      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
    </>
  );
}
