import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

export function useWatchlists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pb.authStore.isValid) { setLoading(false); return; }
    try {
      const items = await pb.collection('watchlists').getFullList({ sort: '-isDefault,created' });
      setLists(items);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createList = useCallback(async (name, symbols = []) => {
    const rec = await pb.collection('watchlists').create({
      name, symbols, isDefault: false, owner: pb.authStore.record.id,
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
    await Promise.all(lists.map((l, i) =>
      pb.collection('watchlists').update(l.id, { isDefault: l.id === id }, { requestKey: `def-${i}` }),
    ));
    await load();
  }, [lists, load]);

  const addSymbol = useCallback(async (id, symbol) => {
    const list = lists.find((l) => l.id === id);
    if (!list) return;
    const syms = Array.isArray(list.symbols) ? list.symbols : [];
    if (syms.includes(symbol)) return;
    await updateList(id, { symbols: [...syms, symbol] });
  }, [lists, updateList]);

  const removeSymbol = useCallback(async (id, symbol) => {
    const list = lists.find((l) => l.id === id);
    if (!list) return;
    const syms = (Array.isArray(list.symbols) ? list.symbols : []).filter((s) => s !== symbol);
    await updateList(id, { symbols: syms });
  }, [lists, updateList]);

  return { lists, loading, reload: load, createList, updateList, removeList, setDefault, addSymbol, removeSymbol };
}

export default useWatchlists;
