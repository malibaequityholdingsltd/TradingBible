import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid) { setLoading(false); return; }
    try {
      const a = await pb.collection('price_alerts').getFullList({ sort: '-created', requestKey: 'alerts-list' });
      setAlerts(a);
      // Triggered alerts double as the notification history — no separate collection needed.
      setHistory(a.filter((x) => x.status === 'triggered').map((x) => ({
        id: x.id,
        message: `${x.symbol} ${x.alertType.replace('_', ' ')} ${x.target} triggered at ${x.triggerPrice ?? ''}`.trim(),
        created: x.lastTriggered || x.updated,
      })));
    } catch {
      setAlerts([]); setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAlert = useCallback(async (data) => {
    const rec = await pb.collection('price_alerts').create({
      status: 'active', frequency: 'once', channels: ['in_app'],
      ...data, owner: pb.authStore.record.id,
    });
    await load();
    return rec;
  }, [load]);

  const updateAlert = useCallback(async (id, data) => {
    const rec = await pb.collection('price_alerts').update(id, data);
    await load();
    return rec;
  }, [load]);

  const removeAlert = useCallback(async (id) => {
    await pb.collection('price_alerts').delete(id);
    await load();
  }, [load]);

  return { alerts, history, loading, reload: load, createAlert, updateAlert, removeAlert };
}

export default useAlerts;
