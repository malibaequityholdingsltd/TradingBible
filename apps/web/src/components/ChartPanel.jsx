import React, { useState } from 'react';
import { useCandles } from '@/hooks/useCandles';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import AdvancedChart from '@/components/AdvancedChart';
import IndicatorPicker from '@/components/IndicatorPicker';
import { useI18n } from '@/lib/i18n';

// One chart tile: symbol picker + AdvancedChart + indicator modal.
export default function ChartPanel({
  initialSymbol = 'BTCUSD', initialTimeframe = '1h', initialType = 'candle',
  initialIndicators = [], compact = false, className = '',
}) {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [chartType, setChartType] = useState(initialType);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
    <SymbolSearchPicker value={symbol} onChange={setSymbol} />
  );

  return (
    <>
      <div className={`glass rounded-2xl p-3 sm:p-4 ${className} ${fullscreen ? 'fixed inset-2 z-[55] overflow-y-auto' : ''}`}>
        <div className="mb-2">{symbolPicker}</div>
        {status === 'error' && !candles.length
          ? <div className="grid h-48 place-items-center text-sm text-red-400/80">{t('cp.loadFail')}</div>
          : chart}
      </div>
      <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
    </>
  );
}
