import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';

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
      setCells(data.cells || []);
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
