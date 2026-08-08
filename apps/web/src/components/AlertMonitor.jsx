import { useEffect, useRef } from 'react';
import pb from '@/lib/pocketbaseClient';
import liveFeed, { isCryptoSymbol } from '@/lib/liveFeed';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Background service: watches live WebSocket ticks for crypto price alerts and
// fires them the instant a target is crossed. Runs app-wide while signed in.
export default function AlertMonitor() {
  const { isAuthed } = useAuth();
  const { toast } = useToast();
  const alertsRef = useRef([]);
  const firingRef = useRef(new Set());

  const loadAlerts = async () => {
    if (!pb.authStore.isValid) { alertsRef.current = []; return; }
    try {
      const a = await pb.collection('price_alerts').getFullList({ requestKey: 'alert-monitor' });
      alertsRef.current = a.filter((x) => x.status === 'active' && isCryptoSymbol(x.symbol));
    } catch { alertsRef.current = []; }
  };

  useEffect(() => {
    if (!isAuthed) { alertsRef.current = []; return undefined; }
    loadAlerts();
    const poll = setInterval(loadAlerts, 30000);

    const symbols = () => [...new Set(alertsRef.current.map((a) => a.symbol))];
    const unsubStatus = liveFeed.subscribe(['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'AVAXUSD']);

    const hit = (a, price) => {
      const base = a.basePrice || price;
      if (a.alertType === 'above') return price >= a.target;
      if (a.alertType === 'below') return price <= a.target;
      if (a.alertType === 'pct_up') return base > 0 && ((price - base) / base) * 100 >= a.target;
      if (a.alertType === 'pct_down') return base > 0 && ((base - price) / base) * 100 >= a.target;
      return false;
    };

    const unsubTick = liveFeed.onTick(async (symbol, tick) => {
      if (!symbols().includes(symbol)) return;
      for (const a of alertsRef.current) {
        if (a.symbol !== symbol || a.status !== 'active') continue;
        if (firingRef.current.has(a.id)) continue;
        if (!hit(a, tick.price)) continue;
        firingRef.current.add(a.id);
        a.status = 'triggered';
        try {
          await pb.collection('price_alerts').update(a.id, {
            status: 'triggered', triggerPrice: tick.price, lastTriggered: new Date().toISOString(),
          }, { requestKey: `alert-fire-${a.id}` });
        } catch { /* best effort */ }
        toast({ title: `Alert: ${a.symbol}`, description: `${a.alertType.replace('_', ' ')} ${a.target} hit at ${tick.price}` });
        if (a.sound && typeof window !== 'undefined' && window.AudioContext) {
          try {
            const ctx = new AudioContext();
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.15, ctx.currentTime); o.start();
            o.stop(ctx.currentTime + 0.18);
          } catch { /* noop */ }
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(200); } catch { /* noop */ } }
      }
    });

    return () => { clearInterval(poll); unsubTick(); unsubStatus(); };
  }, [isAuthed]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
