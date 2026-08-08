import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import liveFeed from '@/lib/liveFeed';

const TICKER_CRYPTO = ['BTCUSD', 'ETHUSD', 'SOLUSD'];

// Live crypto market data. Crypto streams tick-by-tick over the Binance
// WebSocket; a REST poll seeds initial values and covers reconnection gaps.
export function useMarketData(intervalMs = 30000) {
  const [tickers, setTickers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | live | error
  const timer = useRef(null);
  const backoffUntil = useRef(0);

  const fetchData = useCallback(async () => {
    if (Date.now() < backoffUntil.current) return;
    try {
      const res = await apiServerClient.fetch('/market-data');
      if (!res.ok) {
        if (res.status === 429) backoffUntil.current = Date.now() + 45000;
        throw new Error(`status ${res.status}`);
      }
      const data = await res.json();
      setTickers((prev) => (data.tickers && data.tickers.length ? data.tickers : prev));
      backoffUntil.current = 0;
      setStatus('live');
    } catch {
      setStatus((prev) => (prev === 'live' ? 'live' : 'error'));
    }
  }, []);

  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, intervalMs);
    return () => clearInterval(timer.current);
  }, [fetchData, intervalMs]);

  // Real-time tick overlay for the ticker's crypto symbols.
  useEffect(() => {
    const unsubTick = liveFeed.onTick((symbol, tick) => {
      if (!TICKER_CRYPTO.includes(symbol)) return;
      setTickers((prev) => {
        const next = prev.slice();
        const i = next.findIndex((t) => t.symbol === symbol);
        const row = { symbol, price: tick.price, changePercent: tick.changePercent };
        if (i >= 0) next[i] = { ...next[i], ...row }; else next.push(row);
        return next;
      });
      setStatus('live');
    });
    const unsubStatus = liveFeed.subscribe(TICKER_CRYPTO);
    return () => { unsubTick(); unsubStatus(); };
  }, []);

  return { tickers, status };
}

export default useMarketData;
