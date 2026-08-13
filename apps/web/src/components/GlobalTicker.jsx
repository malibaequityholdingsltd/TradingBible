import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';

function fmtPrice(n) {
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const TICKER_SYMBOLS = [
  { symbol: 'BTCUSD', price: 64200, changePercent: 2.18, live: true },
  { symbol: 'AAPL', price: 224.5, changePercent: -0.31, live: false },
  { symbol: 'NQ', price: 19560, changePercent: 1.04, live: false },
  { symbol: 'GBPJPY', price: 191.4, changePercent: 0.67, live: false },
  { symbol: 'SOLUSD', price: 142.0, changePercent: 3.90, live: true },
];

// Fixed total height (h-16 = 64px) shared with every page's top offset.
// Keep the two inner rows' heights summing to 64px so layout math elsewhere stays correct.
export default function GlobalTicker() {
  const { tickers } = useMarketData();

  const rows = TICKER_SYMBOLS.map((s) => {
    if (!s.live) return s;
    const t = tickers.find((x) => x.symbol === s.symbol);
    return t ? { ...s, price: t.price, changePercent: t.changePercent } : s;
  });

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-[#d4af37]/10 bg-[#0a0a0f]/95 backdrop-blur-sm" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="flex h-full items-center overflow-hidden">
        <div className="flex h-full w-max animate-marquee items-center gap-8 whitespace-nowrap px-4 font-mono text-xs sm:gap-10 sm:px-6 sm:text-sm">
          {[...rows, ...rows].map((t, i) => (
            <span key={`${t.symbol}-${i}`} className={`flex items-center gap-1.5 sm:gap-2 ${t.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp className={`h-3.5 w-3.5 shrink-0 ${t.changePercent >= 0 ? '' : 'rotate-180'}`} />
              <span className="text-[#c9c4b4]">{t.symbol}</span>
              <span className="text-[#f0ecdd]">{fmtPrice(t.price)}</span>
              {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
