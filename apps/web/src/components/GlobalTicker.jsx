import React, { useEffect, useMemo, useState } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import { numOrNull } from '@/lib/safeRender';

function fmtPrice(n) {
  if (n == null) return '—';
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

// Every symbol resolves live: crypto + stocks + forex + metals + indices,
// one Yahoo-first feed via /quotes (Binance fallback for crypto). The numbers
// below are skeleton placeholders shown for a heartbeat before live data
// arrives — never presented as prices (no change shown until live).
const TICKER_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD',
  'XAUUSD', 'NAS100', 'SPX500', 'US30',
];

// One natural set is roughly 900px wide. Repeat the set until it is wider
// than the viewport, then render two identical sets. The CSS animation moves
// exactly one set (-50%), so the strip is seamless on phones, laptops and
// ultrawide displays instead of leaving blank gutters at either edge.
const SET_WIDTH_ESTIMATE = 820;

// Slim top strip (36px + safe-area). Height comes from --header-h, which
// every page offset derives from — so the strip, headers and content
// padding all shrink together. Never hardcode the height here.
export default function GlobalTicker() {
  const { quotes } = useQuotes(TICKER_SYMBOLS, { refreshMs: 30000 });
  const [repeats, setRepeats] = useState(1);

  useEffect(() => {
    const update = () => {
      const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
      setRepeats(Math.max(1, Math.ceil(width / SET_WIDTH_ESTIMATE)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const rows = useMemo(() => TICKER_SYMBOLS.map((s) => {
    const q = quotes[s];
    return {
      symbol: s,
      price: q?.price ?? null,
      changePercent: q?.changePercent ?? null,
      live: Boolean(q) && q.source !== 'synthetic',
    };
  }), [quotes]);

  const items = useMemo(() => {
    const next = [];
    for (let index = 0; index < repeats; index += 1) next.push(...rows);
    return next;
  }, [repeats, rows]);

  const spoken = rows.map((row) => {
    const change = numOrNull(row.changePercent);
    return `${row.symbol} ${fmtPrice(row.price)}${change == null ? '' : ` ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)} percent`}`;
  }).join('; ');

  return (
    <div id="tb-ticker" className="tb-ticker fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-[#d4af37]/10 bg-[#0a0a0f]" style={{ paddingTop: 'var(--safe-top)' }}>
      <p className="sr-only">Market prices: {spoken}</p>
      <div className="flex h-full w-full items-center overflow-hidden">
        <div
          className="tb-ticker__track flex h-full w-max items-center animate-marquee"
          style={{ animationDuration: `${Math.max(32, 20 + repeats * 10)}s` }}
          aria-hidden="true"
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="tb-ticker__set flex h-full shrink-0 items-center gap-2 whitespace-nowrap px-2 font-mono text-[11px] leading-none sm:gap-4 sm:px-3 sm:text-xs"
            >
              {items.map((t, i) => {
                const chg = numOrNull(t.changePercent);
                return (
                  <span key={`${copy}-${t.symbol}-${i}`} className={`flex items-center gap-1 ${(chg ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="tk-sym text-[#c9c4b4]">{t.symbol}</span>
                    <span className="tk-px text-[#f0ecdd]">{fmtPrice(t.price)}</span>
                    {chg == null
                      ? <span className="text-[#5f5b50]">···</span>
                      : <span>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>}
                    <span aria-hidden className="pl-1 text-[#3a372f]">•</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
