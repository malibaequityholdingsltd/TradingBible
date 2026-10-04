import React from 'react';
import { useI18n } from '@/lib/i18n';
import CryptoBubbles from '@/components/CryptoBubbles';

const PERIODS = ['1h', '4h', '1d', '1w', '1M', '1Y'];
const CATEGORIES = [
  { id: 'all', key: 'hm.all' },
  { id: 'crypto', key: 'hm.crypto' },
  { id: 'forex', key: 'hm.forex' },
  { id: 'commodity', key: 'hm.commodity' },
  { id: 'sector', key: 'hm.sector' },
  { id: 'stock', key: 'hm.stock' },
];

export default function MarketHeatmap({ type, setType, period, setPeriod, onSelect, showCategoryTabs = true }) {
  const { t } = useI18n();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {showCategoryTabs && (
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setType(c.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${type === c.id ? 'bg-[#d4af37]/18 text-[#d4af37]' : 'border border-[#d4af37]/12 text-[#8a8577] hover:text-[#e9e7df]'}`}>
                {t(c.key)}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[#d4af37]/15">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs transition ${period === p ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <CryptoBubbles key={type} type={type} period={period} onSelect={onSelect} />
    </div>
  );
}
