import React, { useMemo } from 'react';
import { useQuotes } from '@/hooks/useQuotes';

function fmtPrice(n) {
  if (n == null) return '—';
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

// Every symbol resolves live: crypto + stocks + forex + metals + indices,
// one Yahoo-first feed via /quotes (Binance fallback for crypto). The numbers
// below are skeleton placeholders shown for a heartbeat before live data
// arrives — never presented as prices (no change shown until live).
const TICKER_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY',
  'AUDUSD', 'XAUUSD', 'XAGUSD', 'WTIUSD', 'NAS100', 'US30', 'SPX500',
  'AAPL', 'NVDA', 'TSLA', 'MSFT',
];

// Slim top strip (36px + safe-area). Height comes from --header-h, which
// every page offset derives from — so the strip, headers and content
// padding all shrink together. Never hardcode the height here.
export default function GlobalTicker() {
  const { quotes } = useQuotes(TICKER_SYMBOLS, { refreshMs: 30000 });

  const rows = useMemo(() => TICKER_SYMBOLS.map((s) => {
    const q = quotes[s];
    return {
      symbol: s,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      live: Boolean(q) && q.source !== 'synthetic',
    };
  }), [quotes]);

  return (
    <div id="tb-ticker" className="tb-ticker fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-[#d4af37]/10 bg-[#0a0a0f]" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className="flex h-full items-center overflow-hidden">
        <div className="flex h-full w-max animate-marquee items-center gap-2 whitespace-nowrap px-2 font-mono text-[11px] leading-none sm:gap-4 sm:px-3 sm:text-xs">
          {[...rows, ...rows].map((t, i) => (
            <span key={`${t.symbol}-${i}`} className={`flex items-center gap-1 ${(t.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="tk-sym text-[#c9c4b4]">{t.symbol}</span>
              <span className="tk-px text-[#f0ecdd]">{fmtPrice(t.price)}</span>
              {t.changePercent == null
                ? <span className="text-[#5f5b50]">···</span>
                : <span>{t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%</span>}
              <span aria-hidden className="pl-1 text-[#3a372f]">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
