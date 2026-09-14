import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Square, Columns2, Grid2x2, CandlestickChart } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import LiveChart from '@/components/LiveChart';
import AddToWatchlist from '@/components/AddToWatchlist';
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
  const qsSymbol = (params.get('symbol') || 'BTCUSD').toUpperCase();

  return (
    <AppLayout title={t('nav.charts')}>
      <PageHeader
        icon={CandlestickChart}
        kicker={t('mkt.liveCharts')}
        description={t('mkt.chartsSub')}
        actions={
          <>
            {layout === 'single' && <AddToWatchlist symbol={qsSymbol} />}
            <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
              {LAYOUTS.map((l) => (
                <button key={l.id} onClick={() => setLayout(l.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition ${layout === l.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  <l.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t(l.key)}</span>
                </button>
              ))}
            </div>
          </>
        }
      />

      {layout === 'single' && (
        <LiveChart key={qsSymbol} initialSymbol={qsSymbol} initialTimeframe="1h"
          initialIndicators={[{ id: 'sma-1', type: 'sma', params: { period: 20 }, color: '#d4af37' }, { id: 'rsi-1', type: 'rsi', params: { period: 14 }, color: '#d4af37' }]} />
      )}

      {layout === 'split' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <LiveChart initialSymbol="BTCUSD" initialTimeframe="1h" compact
            initialIndicators={[{ id: 'ema-1', type: 'ema', params: { period: 21 }, color: '#60a5fa' }]} />
          <LiveChart initialSymbol="ETHUSD" initialTimeframe="1h" compact
            initialIndicators={[{ id: 'bb-1', type: 'bollinger', params: { period: 20, mult: 2 }, color: '#34d399' }]} />
        </div>
      )}

      {layout === 'grid' && (
        <div className="grid gap-4 xl:grid-cols-2">
          {GRID_DEFAULTS.map((g, i) => (
            <LiveChart key={i} initialSymbol={g.symbol} initialTimeframe={g.tf} initialType={g.type} compact />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
