import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { aggregateCandles, baseTimeframeFor } from '@/lib/chartTimeframes';

// Small in-memory cache so a chart remount (notably the fullscreen portal)
// paints the last honest candles immediately while the refresh runs. Without
// it, expanding the terminal dropped back to a spinner for several seconds.
const CANDLE_CACHE = new Map();
const CANDLE_CACHE_LIMIT = 60;

function cacheKey(symbol, interval, limit) {
  return `${String(symbol || '').toUpperCase()}|${interval}|${limit}`;
}

function readCandles(key) {
  return CANDLE_CACHE.get(key) || null;
}

function writeCandles(key, value) {
  if (CANDLE_CACHE.size >= CANDLE_CACHE_LIMIT) {
    CANDLE_CACHE.delete(CANDLE_CACHE.keys().next().value);
  }
  CANDLE_CACHE.set(key, value);
}

// Fetches OHLC candles for a symbol + interval, refreshing on an interval so the
// last candle updates "live".
//
// The API exposes a fixed base interval set. Custom chart intervals are
// aggregated client-side from the nearest supported base interval, so every
// consumer (terminal, replay, indicators, backtest preview) gets the same
// honest OHLCV data.
export function useCandles(symbol, interval = '1h', { limit = 150, refreshMs = 20000 } = {}) {
  const key = cacheKey(symbol, interval, limit);
  const cached = readCandles(key);
  const [candles, setCandles] = useState(() => cached?.candles || []);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading'); // idle | loading | ready | error
  const [source, setSource] = useState(cached?.source || '');
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
      const next = aggregateCandles(raw, baseInterval, interval);
      const nextSource = data.source || '';
      setCandles(next);
      setSource(nextSource);
      setStatus('ready');
      writeCandles(key, { candles: next, source: nextSource });
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [symbol, interval, baseInterval, limit, key]);

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
    const previous = readCandles(key);
    if (previous) {
      setCandles(previous.candles);
      setSource(previous.source);
      setStatus('ready');
    } else {
      setCandles([]);
      setSource('');
      setStatus('loading');
    }
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs, symbol, key]);

  return { candles, status, refresh: fetchData, source, baseInterval };
}

export default useCandles;
