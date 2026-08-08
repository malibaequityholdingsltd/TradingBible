import React, { useState } from 'react';
import { X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import MarketHeatmap from '@/components/MarketHeatmap';
import ChartPanel from '@/components/ChartPanel';
import AddToWatchlist from '@/components/AddToWatchlist';
import { ALL_SYMBOLS } from '@/lib/symbols';

export default function HeatmapsPage() {
  const [type, setType] = useState('crypto');
  const [period, setPeriod] = useState('1d');
  const [selected, setSelected] = useState(null);

  const known = selected && ALL_SYMBOLS.some((s) => s.symbol === selected.symbol);

  return (
    <AppLayout title="Market Heatmaps">
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-[#f0ecdd]">Live market heatmap</h3>
          <p className="mt-0.5 text-xs text-[#8a8577]">Green gainers, red losers — intensity scales with the move. Click any cell for a detailed chart.</p>
        </div>
        <MarketHeatmap type={type} setType={setType} period={period} setPeriod={setPeriod} onSelect={setSelected} />
      </div>

      {selected && (
        <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#f0ecdd]">{selected.name} <span className="font-mono text-[#8a8577]">({selected.symbol})</span></h3>
              <p className={`text-xs ${selected.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{selected.changePercent >= 0 ? '+' : ''}{selected.changePercent}% · {period}</p>
            </div>
            <div className="flex items-center gap-2">
              <AddToWatchlist symbol={selected.symbol} />
              <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><X className="h-4 w-4" /></button>
            </div>
          </div>
          {known
            ? <ChartPanel key={selected.symbol} initialSymbol={selected.symbol} initialTimeframe="1h" compact />
            : <p className="py-8 text-center text-sm text-[#8a8577]">Detailed candles for {selected.symbol} are available via a connected broker feed.</p>}
        </div>
      )}
    </AppLayout>
  );
}
