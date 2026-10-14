import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

// Symbol entries are always plain uppercase strings in memory. Older saved
// lists may hold full quote objects ({symbol, name, price, …}) — those crash
// any raw render, so every entry is normalized on load and on write.
export function normWatchSym(x) {
  const v = typeof x === 'string' ? x : x?.symbol;
  return String(v ?? '').trim().toUpperCase();
}

function normList(l) {
  const seen = new Set();
  const symbols = (Array.isArray(l?.symbols) ? l.symbols : []).map(normWatchSym).filter((sym) => {
    if (!sym || seen.has(sym)) return false;
    seen.add(sym);
    return true;
  });
  return { ...l, symbols };
}

export function useWatchlists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid) { setLoading(false); return; }
    try {
      // '-isDefault,created' breaks on DBs without the isDefault column.
      // Default list is tracked locally instead (see setDefault).
      const items = await pb.collection('watchlists').getFullList({ sort: '-created' });
      const defId = (() => { try { return localStorage.getItem('tb:watchlist-default'); } catch { return null; } })();
      const normed = items.map(normList);
      normed.sort((a, b) => (b.id === defId) - (a.id === defId));
      setLists(normed);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createList = useCallback(async (name, symbols = []) => {
    const rec = await pb.collection('watchlists').create({
      name, symbols, owner: pb.authStore.record.id,
    });
    await load();
    return rec;
  }, [load]);

  const updateList = useCallback(async (id, data) => {
    const rec = await pb.collection('watchlists').update(id, data);
    await load();
    return rec;
  }, [load]);

  const removeList = useCallback(async (id) => {
    await pb.collection('watchlists').delete(id);
    await load();
  }, [load]);

  const setDefault = useCallback(async (id) => {
    try { localStorage.setItem('tb:watchlist-default', id); } catch { /* ignore */ }
    setLists((prev) => {
      const next = [...prev];
      next.sort((a, b) => (b.id === id) - (a.id === id));
      return next;
    });
    try {
      await Promise.all(lists.map((l, i) =>
        pb.collection('watchlists').update(l.id, { isDefault: l.id === id }, { requestKey: `def-${i}` }),
      ));
    } catch { /* older DBs without isDefault: local default stands */ }
    await load();
  }, [lists, load]);

  const addSymbol = useCallback(async (id, symbol) => {
    const list = lists.find((l) => l.id === id);
    if (!list) return;
    const target = normWatchSym(symbol);
    if (!target) return;
    const syms = (Array.isArray(list.symbols) ? list.symbols : []).map(normWatchSym).filter(Boolean);
    if (syms.includes(target)) return;
    await updateList(id, { symbols: [...syms, target] });
  }, [lists, updateList]);

  const removeSymbol = useCallback(async (id, symbol) => {
    const list = lists.find((l) => l.id === id);
    if (!list) return;
    const target = normWatchSym(symbol);
    const syms = (Array.isArray(list.symbols) ? list.symbols : []).map(normWatchSym).filter((s) => s && s !== target);
    await updateList(id, { symbols: syms });
  }, [lists, updateList]);

  return { lists, loading, reload: load, createList, updateList, removeList, setDefault, addSymbol, removeSymbol };
}

export default useWatchlists;
