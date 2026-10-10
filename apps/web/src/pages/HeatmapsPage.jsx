import React, { useRef, useState } from 'react';
import { ArrowUpRight, Grid2x2, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import MarketHeatmap from '@/components/MarketHeatmap';
import ChartPanel from '@/components/ChartPanel';
import AddToWatchlist from '@/components/AddToWatchlist';
import { PageHero, Card, GoldButton, GhostButton } from '@/components/ui-kit';
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
      <div className="tb-page">
        <PageHero
          kicker={t('nav.heatmaps')}
          kickerIcon={Grid2x2}
          title={t('mkt.liveHeat')}
          subtitle={t('mkt.heatSub')}
          actions={
            <GhostButton to="/app/terminal-pro?view=heatmap" className="!px-3.5 !py-2 !text-xs">Terminal Pro</GhostButton>
          }
        />
        <Card>
          <MarketHeatmap type={type} setType={setType} period={period} setPeriod={setPeriod} onSelect={select} />
        </Card>

        {selected && (
          <div ref={chartRef} className="scroll-mt-24">
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#f0ecdd]">{selected.name} <span className="font-mono text-[#8a8577]">({selected.symbol})</span></h3>
                  <p className={`text-xs ${selected.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{selected.changePercent >= 0 ? '+' : ''}{selected.changePercent}% · {period}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AddToWatchlist symbol={selected.symbol} />
                  <GoldButton to={`/app/terminal-pro?symbol=${encodeURIComponent(selected.symbol)}`} className="!min-h-[36px] !px-3 !py-1.5 !text-xs">{t('mkt.openFull')} <ArrowUpRight className="h-3.5 w-3.5" /></GoldButton>
                  <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <ChartPanel key={selected.symbol} initialSymbol={selected.symbol} initialTimeframe="1h" compact />
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
