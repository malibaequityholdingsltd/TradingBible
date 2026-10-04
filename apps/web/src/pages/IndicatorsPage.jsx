import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import AdvancedChart from '@/components/AdvancedChart';
import IndicatorPicker from '@/components/IndicatorPicker';
import AddToWatchlist from '@/components/AddToWatchlist';
import WatchlistStrip from '@/components/WatchlistStrip';
import { useCandles } from '@/hooks/useCandles';
import { INDICATOR_DEFS } from '@/lib/indicators';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { Card, EmptyState, PageHero, SectionHead } from '@/components/ui-kit';

const DESC_KEYS = {
  sma: 'ind.d.sma', ema: 'ind.d.ema', wma: 'ind.d.wma', rsi: 'ind.d.rsi', macd: 'ind.d.macd',
  stochastic: 'ind.d.stochastic', bollinger: 'ind.d.bollinger', atr: 'ind.d.atr', stddev: 'ind.d.stddev',
  adx: 'ind.d.adx', ichimoku: 'ind.d.ichimoku', obv: 'ind.d.obv', vroc: 'ind.d.vroc',
};

function lastValue(arr) {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

export default function IndicatorsPage() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState('BTCUSD');
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState('candle');
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
      if (!def || typeof def.compute !== 'function') return { ind: ind, def: def || { label: ind.type, color: '#d4af37' }, values: [] };
      try {
        const out = def.compute(candles, { ...def.defaults, ...ind.params });
        if (!out) return { ind, def, values: [] };
        const values = Object.entries(out).map(([k, arr]) => ({ key: k.replace(/^[A-Z]+_/, ''), value: lastValue(arr) }));
        return { ind, def, values };
      } catch {
        return { ind, def, values: [] };
      }
    });
  }, [candles, indicators]);

  return (
    <AppLayout title={t('ind.title')}>
      <div className="tb-page">
        <PageHero
          kicker={t('ind.title')}
          title={t('ind.pick')}
          actions={<AddToWatchlist symbol={symbol} />}
        />

        <WatchlistStrip active={symbol} onSelect={setSymbol} />

        <div className="flex flex-wrap items-center gap-2">
          <SymbolSearchPicker value={symbol} onChange={setSymbol} buttonClassName="px-3 py-1.5 text-sm" />
          <button onClick={() => setPickerOpen(true)} className="flex min-h-[42px] items-center gap-1 rounded-lg border border-[#d4af37]/15 px-3 py-1.5 text-sm text-[#d4af37] transition hover:border-[#d4af37]/40"><Plus className="h-4 w-4" /> {t('ind.configure')}</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-3 sm:p-4 xl:col-span-2">
            {status === 'error' && !candles.length
              ? <div className="grid h-64 place-items-center text-sm text-red-400/80">{t('mkt.failLoad')}</div>
              : <AdvancedChart symbol={symbol} candles={candles} chartType={chartType} timeframe={timeframe}
                  indicators={indicators} onChartType={setChartType} onTimeframe={setTimeframe}
                  onOpenIndicators={() => setPickerOpen(true)} onRemoveIndicator={(id) => setIndicators(indicators.filter((i) => i.id !== id))} />}
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHead title={t('ind.liveValues')} />
            <div className="space-y-3">
              {liveValues.length === 0 && <p className="text-xs text-[#8a8577]">{t('ind.addForValues')}</p>}
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
                  <p className="mt-2 text-[11px] leading-relaxed text-[#8a8577]">{t(DESC_KEYS[ind.type] || 'ind.title')}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4 sm:p-6">
          <SectionHead title={t('ind.library')} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(INDICATOR_DEFS).map(([type, def]) => (
              <div key={type} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#f0ecdd]">{def.label}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] uppercase text-[#8a8577]">{def.pane === 'price' ? t('ind.overlay') : t('ind.panel')}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a8577]">{t(DESC_KEYS[type] || 'ind.title')}</p>
              </div>
            ))}
          </div>
        </Card>

        <IndicatorPicker open={pickerOpen} onClose={() => setPickerOpen(false)} indicators={indicators} setIndicators={setIndicators} />
      </div>
    </AppLayout>
  );
}
