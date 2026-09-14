import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import MarketHeatmap from '@/components/MarketHeatmap';
import ChartPanel from '@/components/ChartPanel';
import AddToWatchlist from '@/components/AddToWatchlist';
import { useI18n } from '@/lib/i18n';

export default function HeatmapsPage() {
  const { t } = useI18n();
  const [type, setType] = useState('crypto');
  const [period, setPeriod] = useState('1d');
  const [selected, setSelected] = useState(null);
  const chartRef = useRef(null);

  const select = (cell) => {
    setSelected(cell);
    // Bring the chart into view so the click clearly "opens" it.
    requestAnimationFrame(() => {
      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <AppLayout title={t('nav.heatmaps')}>
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-[#f0ecdd]">{t('mkt.liveHeat')}</h3>
          <p className="mt-0.5 text-xs text-[#8a8577]">{t('mkt.heatSub')}</p>
        </div>
        <MarketHeatmap type={type} setType={setType} period={period} setPeriod={setPeriod} onSelect={select} />
      </div>

      {selected && (
        <div ref={chartRef} className="mt-5 glass scroll-mt-24 rounded-2xl p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#f0ecdd]">{selected.name} <span className="font-mono text-[#8a8577]">({selected.symbol})</span></h3>
              <p className={`text-xs ${selected.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{selected.changePercent >= 0 ? '+' : ''}{selected.changePercent}% · {period}</p>
            </div>
            <div className="flex items-center gap-2">
              <AddToWatchlist symbol={selected.symbol} />
              <Link to={`/app/charts?symbol=${encodeURIComponent(selected.symbol)}`} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1.5 text-xs font-semibold text-[#0a0a0f] transition hover:opacity-90">{t('mkt.openFull')} <ArrowUpRight className="h-3.5 w-3.5" /></Link>
              <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <ChartPanel key={selected.symbol} initialSymbol={selected.symbol} initialTimeframe="1h" compact />
        </div>
      )}
    </AppLayout>
  );
}
