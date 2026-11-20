import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import {
  createAlert as createCompatAlert,
  listAlerts,
  removeAlert as removeCompatAlert,
  updateAlert as updateCompatAlert,
} from '@/lib/alertStore';

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid) { setLoading(false); return; }
    try {
      const next = await listAlerts();
      setAlerts(next);
      // The Alerts page history is derived from triggered alerts. In-app
      // notification history comes from alert_history; the old schema has no
      // lastTriggered column, so the compatibility layer reads it from note.
      setHistory(next.filter((x) => x.status === 'triggered').map((x) => ({
        id: x.id,
        message: `${x.symbol} ${String(x.alertType || '').replace('_', ' ')} ${x.target ?? ''} triggered at ${x.triggerPrice ?? ''}`.trim(),
        created: x.lastTriggered || x.updated || x.created,
      })));
    } catch {
      setAlerts([]); setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAlert = useCallback(async (data) => {
    const rec = await createCompatAlert({ ...data, owner: pb.authStore.record?.id });
    await load();
    return rec;
  }, [load]);

  const updateAlert = useCallback(async (id, data) => {
    const rec = await updateCompatAlert(id, data);
    await load();
    return rec;
  }, [load]);

  const removeAlert = useCallback(async (id) => {
    await removeCompatAlert(id);
    await load();
  }, [load]);

  return { alerts, history, loading, reload: load, createAlert, updateAlert, removeAlert };
}

export default useAlerts;
