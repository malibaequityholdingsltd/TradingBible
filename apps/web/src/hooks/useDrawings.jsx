import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

// Persists per-user, per-symbol chart drawings.
// Cloud: PocketBase `chart_drawings` (single non-template live record per
// owner+symbol, plus named templates).
// Local: localStorage mirror `tb:drawings:v1:{uid||anon}:{symbol}` —
// write-through on every update + hydrate before cloud load, so refresh
// survives logged-out / offline / RLS failures. Cloud wins when it loads
// with data; local is kept as fallback.
function lsKey(symbol, uid) {
  return `tb:drawings:v1:${uid || 'anon'}:${String(symbol || '').toUpperCase()}`;
}

function readLocal(symbol, uid) {
  try {
    const raw = localStorage.getItem(lsKey(symbol, uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeLocal(symbol, uid, next) {
  try {
    localStorage.setItem(lsKey(symbol, uid), JSON.stringify(next.slice(0, 500)));
  } catch { /* storage full — keep in memory */ }
}

export function useDrawings(symbol) {
  const [uid, setUid] = useState(() => pb.authStore.record?.id || null);
  const [drawings, setDrawings] = useState(() => readLocal(symbol, pb.authStore.record?.id || null));
  const [recordId, setRecordId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const saveTimer = useRef(null);

  // Reactive auth: late session resolution must reload, not stay logged-out.
  useEffect(() => {
    const unsub = pb.authStore.onChange?.((_t, record) => {
      setUid(record?.id || null);
    });
    pb.authStore.ready?.then(() => setUid(pb.authStore.record?.id || null)).catch(() => {});
    return unsub;
  }, []);

  // Re-hydrate local mirror when symbol/uid changes (before cloud load).
  useEffect(() => {
    setDrawings(readLocal(symbol, uid));
    setRecordId(null);
  }, [symbol, uid]);

  const loadTemplates = useCallback(async () => {
    if (!uid) return;
    try {
      const list = await pb.collection('chart_drawings').getFullList({
        filter: `symbol = "${symbol}" && is_template = true`,
        sort: '-created',
        requestKey: `tpl-${symbol}`,
      });
      setTemplates(list);
    } catch { /* ignore */ }
  }, [symbol, uid]);

  // Load the live drawing set for this symbol. Cloud wins if non-empty;
  // otherwise keep the local mirror (never wipe to [] blindly).
  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      if (!uid) { if (active) setLoaded(true); return; }
      try {
        const rec = await pb.collection('chart_drawings').getFirstListItem(
          `owner = "${uid}" && symbol = "${symbol}" && is_template = false`,
          { requestKey: `live-${symbol}` },
        );
        if (!active) return;
        setRecordId(rec.id);
        const cloud = Array.isArray(rec.data) ? rec.data : [];
        if (cloud.length) {
          setDrawings(cloud);
          writeLocal(symbol, uid, cloud);
        } else {
          // Cloud empty — keep local mirror (may hold unsynced work).
          setDrawings(readLocal(symbol, uid));
        }
        setSaveError(null);
      } catch {
        if (!active) return;
        // No cloud row / RLS / offline — keep local mirror as-is.
        setRecordId(null);
        setDrawings(readLocal(symbol, uid));
      }
      if (active) setLoaded(true);
    })();
    loadTemplates();
    return () => { active = false; };
  }, [symbol, uid, loadTemplates]);

  // Debounced cloud auto-save (local already written synchronously).
  const persist = useCallback((next) => {
    if (!uid) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (recordId) {
          await pb.collection('chart_drawings').update(recordId, { data: next }, { requestKey: `save-${symbol}` });
        } else {
          const rec = await pb.collection('chart_drawings').create({
            owner: uid, symbol, is_template: false, shared: false, data: next, name: 'live',
          }, { requestKey: `save-${symbol}` });
          setRecordId(rec.id);
        }
        setSaveError(null);
      } catch (e) {
        // Local mirror already kept the work — surface for UI hint.
        setSaveError('cloud save failed — kept on this device');
      }
    }, 600);
  }, [uid, recordId, symbol]);

  const update = useCallback((updater) => {
    setDrawings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const safe = Array.isArray(next) ? next : [];
      writeLocal(symbol, pb.authStore.record?.id || uid, safe);
      persist(safe);
      return safe;
    });
  }, [persist, symbol, uid]);

  const saveTemplate = useCallback(async (name, shared) => {
    if (!uid) return;
    await pb.collection('chart_drawings').create({
      owner: uid, symbol, is_template: true, shared: !!shared, name: name || 'Template', data: drawings,
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

  return { drawings, update, loaded, templates, saveTemplate, applyTemplate, deleteTemplate, saveError };
}

export default useDrawings;
