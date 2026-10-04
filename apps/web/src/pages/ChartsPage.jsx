import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Square, Columns2, Grid2x2, CandlestickChart } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AddToWatchlist from '@/components/AddToWatchlist';
import WatchlistStrip from '@/components/WatchlistStrip';
import { PageHero, Tabs } from '@/components/ui-kit';
import LiveChart from '@/components/LiveChart';
import { useI18n } from '@/lib/i18n';

const LAYOUTS = [
  { id: 'single', key: 'mkt.single', icon: Square },
  { id: 'split', key: 'mkt.split', icon: Columns2 },
  { id: 'grid', key: 'mkt.grid4', icon: Grid2x2 },
];

const GRID_DEFAULTS = [
  { symbol: 'BTCUSD', tf: '1h', type: 'candle' },
  { symbol: 'ETHUSD', tf: '1h', type: 'candle' },
  { symbol: 'XAUUSD', tf: '4h', type: 'area' },
  { symbol: 'AAPL', tf: '1d', type: 'line' },
];

export default function ChartsPage() {
  const { t } = useI18n();
  const [layout, setLayout] = useState('single');
  const [params] = useSearchParams();
  const [symbol, setSymbol] = useState(() => ((params.get('symbol') || 'BTCUSD').toUpperCase()));

  return (
    <AppLayout title={t('nav.charts')}>
      <div className="tb-page">
        <PageHero
          kicker={t('nav.charts')}
          kickerIcon={CandlestickChart}
          title={t('mkt.liveCharts')}
          subtitle={t('mkt.chartsSub')}
          actions={layout === 'single' ? <AddToWatchlist symbol={symbol} /> : null}
        />

        <Tabs
          tabs={LAYOUTS.map((l) => ({ id: l.id, label: t(l.key), icon: l.icon }))}
          active={layout}
          onChange={setLayout}
        />

        {layout === 'single' && (
          <>
            <div className="tb-card p-3 sm:p-4">
              <WatchlistStrip bare active={symbol} onSelect={setSymbol} />
            </div>
            <LiveChart key={symbol} initialSymbol={symbol} initialTimeframe="1h"
              onSymbolChange={setSymbol}
              initialIndicators={[{ id: 'sma-1', type: 'sma', params: { period: 20 }, color: '#d4af37' }, { id: 'rsi-1', type: 'rsi', params: { period: 14 }, color: '#d4af37' }]} />
          </>
        )}

        {layout === 'split' && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
            <LiveChart initialSymbol="BTCUSD" initialTimeframe="1h" compact
              initialIndicators={[{ id: 'ema-1', type: 'ema', params: { period: 21 }, color: '#60a5fa' }]} />
            <LiveChart initialSymbol="ETHUSD" initialTimeframe="1h" compact
              initialIndicators={[{ id: 'bb-1', type: 'bollinger', params: { period: 20, mult: 2 }, color: '#34d399' }]} />
          </div>
        )}

        {layout === 'grid' && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
            {GRID_DEFAULTS.map((g, i) => (
              <LiveChart key={i} initialSymbol={g.symbol} initialTimeframe={g.tf} initialType={g.type} compact />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
