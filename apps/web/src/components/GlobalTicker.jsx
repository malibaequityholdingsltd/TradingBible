import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';

function fmtPrice(n) {
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const TICKER_SYMBOLS = [
  { symbol: 'BTCUSD', price: 64200, changePercent: 2.18, live: true },
  { symbol: 'ETHUSD', price: 3480, changePercent: 1.42, live: true },
  { symbol: 'SOLUSD', price: 142.0, changePercent: 3.90, live: true },
  { symbol: 'EURUSD', price: 1.0842, changePercent: 0.12, live: false },
  { symbol: 'GBPUSD', price: 1.2695, changePercent: -0.08, live: false },
  { symbol: 'USDJPY', price: 151.32, changePercent: 0.24, live: false },
  { symbol: 'GBPJPY', price: 191.4, changePercent: 0.67, live: false },
  { symbol: 'AUDUSD', price: 0.6591, changePercent: 0.18, live: false },
  { symbol: 'NZDUSD', price: 0.5983, changePercent: -0.05, live: false },
  { symbol: 'USDCAD', price: 1.3682, changePercent: -0.14, live: false },
  { symbol: 'USDCHF', price: 0.9045, changePercent: 0.09, live: false },
  { symbol: 'EURGBP', price: 0.8542, changePercent: -0.06, live: false },
  { symbol: 'EURJPY', price: 163.85, changePercent: 0.31, live: false },
  { symbol: 'BNBUSD', price: 598.4, changePercent: 1.22, live: false },
  { symbol: 'XRPUSD', price: 0.6231, changePercent: 2.05, live: false },
  { symbol: 'DOGEUSD', price: 0.1582, changePercent: -1.44, live: false },
  { symbol: 'ADAUSD', price: 0.4521, changePercent: 0.78, live: false },
  { symbol: 'XAUUSD', price: 2384.6, changePercent: 0.55, live: false },
  { symbol: 'XAGUSD', price: 28.14, changePercent: -0.22, live: false },
  { symbol: 'USOIL', price: 78.45, changePercent: 1.10, live: false },
  { symbol: 'US30', price: 39120, changePercent: 0.34, live: false },
  { symbol: 'NAS100', price: 18240, changePercent: 1.04, live: false },
  { symbol: 'SPX500', price: 5228.4, changePercent: 0.48, live: false },
  { symbol: 'AAPL', price: 224.5, changePercent: -0.31, live: false },
  { symbol: 'NVDA', price: 118.2, changePercent: 2.64, live: false },
  { symbol: 'TSLA', price: 246.8, changePercent: -1.15, live: false },
  { symbol: 'MSFT', price: 428.9, changePercent: 0.62, live: false },
  { symbol: 'AMZN', price: 186.3, changePercent: 0.91, live: false },
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
    <div id="tb-ticker" className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-[#d4af37]/10 bg-[#0a0a0f]/95 backdrop-blur-sm" style={{ paddingTop: 'var(--safe-top)' }}>
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
