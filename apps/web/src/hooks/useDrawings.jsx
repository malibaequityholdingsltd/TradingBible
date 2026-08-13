import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

// Persists per-user, per-symbol chart drawings in the PocketBase
// `chart_drawings` collection. The "live" set for a symbol is the single
// non-template record; templates are additional named records.
export function useDrawings(symbol) {
  const [drawings, setDrawings] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const uid = pb.authStore.record?.id;

  const loadTemplates = useCallback(async () => {
    if (!uid) return;
    try {
      const list = await pb.collection('chart_drawings').getFullList({
        filter: `symbol = "${symbol}" && isTemplate = true`,
        sort: '-created',
        requestKey: `tpl-${symbol}`,
      });
      setTemplates(list);
    } catch { /* ignore */ }
  }, [symbol, uid]);

  // Load the live drawing set for this symbol.
  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      if (!uid) { setDrawings([]); setRecordId(null); setLoaded(true); return; }
      try {
        const rec = await pb.collection('chart_drawings').getFirstListItem(
          `owner = "${uid}" && symbol = "${symbol}" && isTemplate = false`,
          { requestKey: `live-${symbol}` },
        );
        if (!active) return;
        setRecordId(rec.id);
        setDrawings(Array.isArray(rec.data) ? rec.data : []);
      } catch {
        if (!active) return;
        setRecordId(null);
        setDrawings([]);
      }
      if (active) setLoaded(true);
    })();
    loadTemplates();
    return () => { active = false; };
  }, [symbol, uid, loadTemplates]);

  // Debounced auto-save of the live set.
  const persist = useCallback((next) => {
    if (!uid) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (recordId) {
          await pb.collection('chart_drawings').update(recordId, { data: next }, { requestKey: `save-${symbol}` });
        } else {
          const rec = await pb.collection('chart_drawings').create({
            owner: uid, symbol, isTemplate: false, shared: false, data: next, name: 'live',
          }, { requestKey: `save-${symbol}` });
          setRecordId(rec.id);
        }
      } catch { /* ignore transient */ }
    }, 600);
  }, [uid, recordId, symbol]);

  const update = useCallback((updater) => {
    setDrawings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, [persist]);

  const saveTemplate = useCallback(async (name, shared) => {
    if (!uid) return;
    await pb.collection('chart_drawings').create({
      owner: uid, symbol, isTemplate: true, shared: !!shared, name: name || 'Template', data: drawings,
    });
    loadTemplates();
  }, [uid, symbol, drawings, loadTemplates]);

  const applyTemplate = useCallback((tpl) => {
    const data = Array.isArray(tpl?.data) ? tpl.data : [];
    update(() => data.map((d) => ({ ...d, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })));
  }, [update]);

  const deleteTemplate = useCallback(async (id) => {
    try { await pb.collection('chart_drawings').delete(id); } catch { /* ignore */ }
    loadTemplates();
  }, [loadTemplates]);

  return { drawings, update, loaded, templates, saveTemplate, applyTemplate, deleteTemplate };
}

export default useDrawings;
