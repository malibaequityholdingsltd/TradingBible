import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Square, Columns2, Grid2x2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import LiveChart from '@/components/LiveChart';
import AddToWatchlist from '@/components/AddToWatchlist';

const LAYOUTS = [
  { id: 'single', label: 'Single', icon: Square },
  { id: 'split', label: 'Split', icon: Columns2 },
  { id: 'grid', label: '4-Grid', icon: Grid2x2 },
];

const GRID_DEFAULTS = [
  { symbol: 'BTCUSD', tf: '1h', type: 'candle' },
  { symbol: 'ETHUSD', tf: '1h', type: 'candle' },
  { symbol: 'XAUUSD', tf: '4h', type: 'area' },
  { symbol: 'AAPL', tf: '1d', type: 'line' },
];

export default function ChartsPage() {
  const [layout, setLayout] = useState('single');
  const [params] = useSearchParams();
  const qsSymbol = (params.get('symbol') || 'BTCUSD').toUpperCase();

  return (
    <AppLayout title="Advanced Charts">
      <div className="mb-4 flex items-center justify-between">
        <p className="hidden text-sm text-[#8a8577] sm:block">TradingView-grade live charts — draw trendlines, levels and annotations that save to your account per symbol.</p>
        <div className="flex items-center gap-2">
          {layout === 'single' && <AddToWatchlist symbol={qsSymbol} />}
          <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => setLayout(l.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition ${layout === l.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                <l.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {layout === 'single' && (
        <LiveChart key={qsSymbol} initialSymbol={qsSymbol} initialTimeframe="1h"
          initialIndicators={[{ id: 'sma-1', type: 'sma', params: { period: 20 }, color: '#d4af37' }, { id: 'rsi-1', type: 'rsi', params: { period: 14 }, color: '#d4af37' }]} />
      )}

      {layout === 'split' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <LiveChart initialSymbol="BTCUSD" initialTimeframe="1h" compact drawingsEnabled={false}
            initialIndicators={[{ id: 'ema-1', type: 'ema', params: { period: 21 }, color: '#60a5fa' }]} />
          <LiveChart initialSymbol="ETHUSD" initialTimeframe="1h" compact drawingsEnabled={false}
            initialIndicators={[{ id: 'bb-1', type: 'bollinger', params: { period: 20, mult: 2 }, color: '#34d399' }]} />
        </div>
      )}

      {layout === 'grid' && (
        <div className="grid gap-4 xl:grid-cols-2">
          {GRID_DEFAULTS.map((g, i) => (
            <LiveChart key={i} initialSymbol={g.symbol} initialTimeframe={g.tf} initialType={g.type} compact drawingsEnabled={false} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
