import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import liveFeed, { isCryptoSymbol } from '@/lib/liveFeed';

// Fetches live quotes for a list of symbols. Crypto symbols stream tick-by-tick
// over the Binance WebSocket; everything else falls back to REST polling.
export function useQuotes(symbols, { refreshMs = 30000 } = {}) {
  const [quotes, setQuotes] = useState({});
  const [status, setStatus] = useState('loading'); // loading | live | error
  const timer = useRef(null);
  const backoffUntil = useRef(0);
  const key = (symbols || []).join(',');

  const list = key.split(',').filter(Boolean);
  const cryptoList = list.filter(isCryptoSymbol);
  const restList = list.filter((s) => !isCryptoSymbol(s));
  const restKey = restList.join(',');
  const cryptoKey = cryptoList.join(',');

  const fetchData = useCallback(async () => {
    if (!restKey) { setStatus('live'); return; }
    if (Date.now() < backoffUntil.current) return;
    try {
      const res = await apiServerClient.fetch(`/quotes?symbols=${encodeURIComponent(restKey)}`);
      if (!res.ok) {
        if (res.status === 429) backoffUntil.current = Date.now() + 45000;
        throw new Error(`status ${res.status}`);
      }
      const data = await res.json();
      setQuotes((prev) => {
        const map = { ...prev };
        (data.quotes || []).forEach((q) => { map[q.symbol] = q; });
        return map;
      });
      backoffUntil.current = 0;
      setStatus('live');
    } catch {
      setStatus((prev) => (prev === 'live' ? 'live' : 'error'));
    }
  }, [restKey]);

  // REST polling for keyed providers (stocks/forex/commodities).
  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs]);

  // WebSocket ticks for crypto — seed from any cached tick then live-update.
  useEffect(() => {
    if (!cryptoKey) return undefined;
    const syms = cryptoKey.split(',');
    setStatus('live');
    setQuotes((prev) => {
      const map = { ...prev };
      syms.forEach((s) => { const t = liveFeed.getTick(s); if (t) map[s] = { symbol: s, ...t }; });
      return map;
    });
    const unsubTick = liveFeed.onTick((symbol, tick) => {
      if (!syms.includes(symbol)) return;
      setQuotes((prev) => ({ ...prev, [symbol]: { symbol, ...tick } }));
    });
    const unsubStatus = liveFeed.subscribe(syms);
    return () => { unsubTick(); unsubStatus(); };
  }, [cryptoKey]);

  return { quotes, status, refresh: fetchData };
}

export default useQuotes;
