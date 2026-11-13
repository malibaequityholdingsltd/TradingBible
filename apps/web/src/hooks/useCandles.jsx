import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { aggregateCandles, baseTimeframeFor } from '@/lib/chartTimeframes';

// Fetches OHLC candles for a symbol + interval, refreshing on an interval so the
// last candle updates "live".
//
// The API exposes a fixed base interval set. Custom chart intervals are
// aggregated client-side from the nearest supported base interval, so every
// consumer (terminal, replay, indicators, backtest preview) gets the same
// honest OHLCV data.
export function useCandles(symbol, interval = '1h', { limit = 150, refreshMs = 20000 } = {}) {
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState('loading'); // idle | loading | ready | error
  const [source, setSource] = useState('');
  const timer = useRef(null);
  const baseInterval = baseTimeframeFor(interval);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setCandles([]);
      setStatus('idle');
      setSource('');
      return;
    }
    try {
      const res = await apiServerClient.fetch(`/candles?symbol=${encodeURIComponent(symbol)}&interval=${baseInterval}&limit=${limit}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data.candles) ? data.candles : [];
      setCandles(aggregateCandles(raw, baseInterval, interval));
      setSource(data.source || '');
      setStatus('ready');
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [symbol, interval, baseInterval, limit]);

  useEffect(() => {
    if (!symbol) {
      setCandles([]);
      setSource('');
      setStatus('idle');
      return undefined;
    }
    // Never leave the previous instrument's candles under a new symbol or
    // interval label while the first request is in flight. A failed request
    // must show an error, not stale prices from another market.
    setCandles([]);
    setSource('');
    setStatus('loading');
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs, symbol]);

  return { candles, status, refresh: fetchData, source, baseInterval };
}

export default useCandles;
