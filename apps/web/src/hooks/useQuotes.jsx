import { useEffect, useRef, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';

// Single-source quotes: every symbol resolves through GET /quotes (Yahoo
// primary, keyed providers and Binance fallback server-side). One feed means
// one price everywhere — no mixed WebSocket/REST ticks, no sourceless quotes.
// (Realtime Binance streaming still lives in liveFeed for AlertMonitor.)
export function useQuotes(symbols, { refreshMs = 30000 } = {}) {
  const [quotes, setQuotes] = useState({});
  const [status, setStatus] = useState('loading'); // loading | live | error
  const timer = useRef(null);
  const backoffUntil = useRef(0);
  const key = (symbols || []).join(',');

  const fetchData = useCallback(async () => {
    const list = key.split(',').filter(Boolean);
    if (!list.length) { setStatus('live'); return; }
    if (Date.now() < backoffUntil.current) return;
    try {
      const res = await apiServerClient.fetch(`/quotes?symbols=${encodeURIComponent(list.join(','))}`);
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
  }, [key]);

  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, refreshMs);
    return () => clearInterval(timer.current);
  }, [fetchData, refreshMs]);

  return { quotes, status, refresh: fetchData };
}

export default useQuotes;
