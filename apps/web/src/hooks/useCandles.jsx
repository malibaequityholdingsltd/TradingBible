import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { aggregateCandles, baseTimeframeFor } from '@/lib/chartTimeframes';

// Small in-memory cache so a chart remount (notably the fullscreen portal)
// paints the last honest candles immediately while the refresh runs. Without
// it, expanding the terminal dropped back to a spinner for several seconds.
const CANDLE_CACHE = new Map();
const CANDLE_CACHE_LIMIT = 12;

function cacheKey(symbol, interval, limit, full) {
  return `${String(symbol || '').toUpperCase()}|${interval}|${limit}|${full ? 'full' : 'tail'}`;
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

function mergeCandles(existing, incoming, max) {
  if (!incoming.length) return existing;
  const byTime = new Map(existing.map((candle) => [Number(candle.time), candle]));
  for (const candle of incoming) byTime.set(Number(candle.time), candle);
  return [...byTime.values()]
    .sort((a, b) => Number(a.time) - Number(b.time))
    .slice(-max);
}

// Fetches OHLC candles for a symbol + interval, refreshing on an interval so the
// last candle updates "live".
//
// The API exposes a fixed base interval set. Custom chart intervals are
// aggregated client-side from the nearest supported base interval, so every
// consumer (terminal, replay, indicators, backtest preview) gets the same
// honest OHLCV data.
//
// `full` asks for the longest available history. The first request carries the
// full limit; later refreshes only pull a small tail and merge it, so a 15s
// live update never re-downloads thousands of bars.
export function useCandles(symbol, interval = '1h', { limit = 150, full = false, refreshMs = 20000 } = {}) {
  const key = cacheKey(symbol, interval, limit, full);
  const cached = readCandles(key);
  const [candles, setCandles] = useState(() => cached?.candles || []);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading'); // idle | loading | ready | error
  const [source, setSource] = useState(cached?.source || '');
  const timer = useRef(null);
  const candlesRef = useRef(candles);
  const fullLoaded = useRef(Boolean(cached && full));
  const baseInterval = baseTimeframeFor(interval);
  const tailLimit = Math.min(500, limit);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setCandles([]);
      candlesRef.current = [];
      setStatus('idle');
      setSource('');
      return;
    }
    // After the first full page, only refresh the tail. This keeps full
    // history fast to open and cheap to keep live.
    const requestLimit = full && fullLoaded.current && candlesRef.current.length
      ? tailLimit
      : limit;
    try {
      const res = await apiServerClient.fetch(`/candles?symbol=${encodeURIComponent(symbol)}&interval=${baseInterval}&limit=${requestLimit}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data.candles) ? data.candles : [];
      const aggregated = aggregateCandles(raw, baseInterval, interval);
      const next = requestLimit === tailLimit && full && candlesRef.current.length
        ? mergeCandles(candlesRef.current, aggregated, limit)
        : aggregated.slice(-limit);
      const nextSource = data.source || '';
      if (!(full && fullLoaded.current)) fullLoaded.current = true;
      candlesRef.current = next;
      setCandles(next);
      setSource(nextSource);
      setStatus('ready');
      writeCandles(key, { candles: next, source: nextSource });
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [symbol, interval, baseInterval, limit, full, tailLimit, key]);

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
    fullLoaded.current = Boolean(previous && full);
    if (previous) {
      candlesRef.current = previous.candles;
      setCandles(previous.candles);
      setSource(previous.source);
      setStatus('ready');
    } else {
      candlesRef.current = [];
      setCandles([]);
      setSource('');
      setStatus('loading');
    }
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs, symbol, key, full]);

  return { candles, status, refresh: fetchData, source, baseInterval };
}

export default useCandles;
