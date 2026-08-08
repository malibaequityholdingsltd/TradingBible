import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { useToast } from '@/hooks/use-toast';

const NotifContext = createContext(null);

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

function triggered(alert, quote) {
  if (!quote) return false;
  switch (alert.alertType) {
    case 'above': return quote.price >= alert.target;
    case 'below': return quote.price <= alert.target;
    case 'pct_up': return quote.changePercent >= alert.target;
    case 'pct_down': return quote.changePercent <= -Math.abs(alert.target);
    default: return false;
  }
}

function cooledDown(alert) {
  if (!alert.lastTriggered) return true;
  const last = new Date(alert.lastTriggered).getTime();
  const now = Date.now();
  if (alert.frequency === 'daily') return now - last > 86400000;
  if (alert.frequency === 'weekly') return now - last > 604800000;
  return true;
}

export function NotificationsProvider({ children }) {
  const [history, setHistory] = useState([]);
  const timer = useRef(null);
  const { toast } = useToast();

  const loadHistory = useCallback(async () => {
    if (!pb.authStore.isValid) { setHistory([]); return; }
    try {
      const h = await pb.collection('alert_history').getFullList({ sort: '-created', requestKey: 'notif-hist' });
      setHistory(h);
    } catch { /* ignore */ }
  }, []);

  const check = useCallback(async () => {
    if (!pb.authStore.isValid) return;
    let active;
    try {
      active = await pb.collection('price_alerts').getFullList({ filter: 'status = "active"', requestKey: 'notif-active' });
    } catch { return; }
    const now = Date.now();
    const live = active.filter((a) => !a.expiresAt || new Date(a.expiresAt).getTime() > now).filter(cooledDown);
    if (!live.length) return;
    const symbols = [...new Set(live.map((a) => a.symbol))];
    let quotes = {};
    try {
      const res = await apiServerClient.fetch(`/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
      if (!res.ok) return;
      const data = await res.json();
      (data.quotes || []).forEach((q) => { quotes[q.symbol] = q; });
    } catch { return; }

    let fired = false;
    for (const alert of live) {
      const q = quotes[alert.symbol];
      if (triggered(alert, q)) {
        fired = true;
        const labelMap = { above: 'rose above', below: 'fell below', pct_up: 'gained', pct_down: 'dropped' };
        const isPct = alert.alertType.startsWith('pct');
        const targetStr = isPct ? `${alert.target}%` : alert.target;
        const message = `${alert.symbol} ${labelMap[alert.alertType]} ${targetStr} (now ${q.price})`;
        try {
          await pb.collection('alert_history').create({
            symbol: alert.symbol, alertType: alert.alertType, target: alert.target,
            triggerPrice: q.price, message, seen: false, owner: pb.authStore.record.id,
          }, { requestKey: `hist-${alert.id}` });
          await pb.collection('price_alerts').update(alert.id, {
            lastTriggered: new Date().toISOString(),
            triggerPrice: q.price,
            status: alert.frequency === 'once' ? 'triggered' : 'active',
          }, { requestKey: `upd-${alert.id}` });
          toast({ title: 'Price Alert Triggered', description: message });
          if (alert.sound) beep();
        } catch { /* ignore */ }
      }
    }
    if (fired) loadHistory();
  }, [toast, loadHistory]);

  useEffect(() => {
    loadHistory();
    check();
    timer.current = setInterval(() => { check(); }, 30000);
    const unsub = pb.authStore.onChange(() => { loadHistory(); });
    return () => { clearInterval(timer.current); unsub(); };
  }, [check, loadHistory]);

  const unseen = history.filter((h) => !h.seen).length;

  const markAllSeen = useCallback(async () => {
    const toMark = history.filter((h) => !h.seen);
    await Promise.all(toMark.map((h, i) =>
      pb.collection('alert_history').update(h.id, { seen: true }, { requestKey: `seen-${i}` }).catch(() => {}),
    ));
    loadHistory();
  }, [history, loadHistory]);

  return (
    <NotifContext.Provider value={{ history, unseen, markAllSeen, reload: loadHistory }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) return { history: [], unseen: 0, markAllSeen: () => {}, reload: () => {} };
  return ctx;
}

export default useNotifications;
