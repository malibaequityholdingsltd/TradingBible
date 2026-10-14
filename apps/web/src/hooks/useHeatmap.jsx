import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';

// A malformed upstream cell must never white-screen the page — coerce
// every field to a safe primitive before it reaches render.
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v) => (typeof v === 'string' ? v : '');
function cleanCell(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    symbol: str(c.symbol), name: str(c.name),
    price: num(c.price), changePercent: num(c.changePercent),
    changeAmount: num(c.changeAmount), volume: num(c.volume),
    quoteVolume: num(c.quoteVolume), live: c.live === true,
    source: str(c.source), market: str(c.market),
  };
}

// Fetches heatmap cells for a category + period, refreshing periodically.
export function useHeatmap(type, period, refreshMs = 25000) {
  const [cells, setCells] = useState([]);
  const [status, setStatus] = useState('loading');
  const [nonce, setNonce] = useState(0);
  const timer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiServerClient.fetch(`/heatmap?type=${type}&period=${period}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setCells((data.cells || []).map(cleanCell).filter(Boolean));
      setStatus('ready');
    } catch {
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [type, period, nonce]);

  useEffect(() => {
    setStatus('loading');
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs]);

  const retry = useCallback(() => {
    setStatus('loading');
    setNonce((n) => n + 1);
  }, []);

  return { cells, status, retry };
}

export default useHeatmap;
