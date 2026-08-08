import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';

// Fetches OHLC candles for a symbol + interval, refreshing on an interval so the
// last candle updates "live".
export function useCandles(symbol, interval, { limit = 150, refreshMs = 20000 } = {}) {
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const timer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch(`/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setCandles(data.candles || []);
      setStatus('ready');
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [symbol, interval, limit]);

  useEffect(() => {
    setStatus('loading');
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs]);

  return { candles, status, refresh: fetchData };
}

export default useCandles;
