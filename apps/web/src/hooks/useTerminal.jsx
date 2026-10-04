import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

const DEFAULT_DISPLAY = {
  showPrice: true,
  showChangePercent: true,
  showChangeAmount: true,
  showVolume: true,
  showHigh: false,
};

const DEFAULT_SYMBOLS = [
  { symbol: 'BTCUSD', group: 'crypto' },
  { symbol: 'ETHUSD', group: 'crypto' },
  { symbol: 'SOLUSD', group: 'crypto' },
  { symbol: 'AAPL', group: 'stocks' },
  { symbol: 'NVDA', group: 'stocks' },
  { symbol: 'EURUSD', group: 'forex' },
  { symbol: 'GBPJPY', group: 'forex' },
  { symbol: 'XAUUSD', group: null },
];

const DEFAULT_GROUPS = [
  { id: 'crypto', name: 'Crypto', collapsed: false },
  { id: 'stocks', name: 'Stocks', collapsed: false },
  { id: 'forex', name: 'Forex', collapsed: false },
];

const gid = () => `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// The real table only guarantees (id, owner, name, layout jsonb) —
// symbols/groups/display/isActive live INSIDE layout. This maps any row
// (legacy or new) into the shape the UI needs, so reads never crash and
// writes always hit real columns.
const normalize = (r) => ({
  id: r.id,
  name: r.name || 'My Terminal',
  isActive: r.isActive ?? r.layout?.isActive ?? false,
  symbols: r.symbols ?? r.layout?.symbols ?? [],
  groups: r.groups ?? r.layout?.groups ?? [],
  display: r.display ?? r.layout?.display ?? {},
});

const layoutJson = (l) => ({
  symbols: l.symbols || [],
  groups: l.groups || [],
  display: l.display || {},
  isActive: !!l.isActive,
});

// Manages the user's customizable terminal watchlists (layouts). Each layout
// stores its symbols, groups and display preferences inside the `layout`
// jsonb column (the only shape the real table guarantees) with a debounced
// auto-save. Logged-out traders get a full in-memory layout instead.
export function useTerminal() {
  const [layouts, setLayouts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const uid = pb.authStore.record?.id;

  const active = layouts.find((l) => l.id === activeId) || layouts[0] || null;

  // Load layouts, seeding a default one for first-time users. Logged-out
  // traders get a full local layout (same defaults) that works in-memory —
  // every button works, only cloud sync waits for sign-in.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!uid) {
        if (!live) return;
        const local = {
          id: gid(), name: 'My Terminal', isActive: true,
          symbols: DEFAULT_SYMBOLS, groups: DEFAULT_GROUPS, display: DEFAULT_DISPLAY,
        };
        setLayouts([local]);
        setActiveId(local.id);
        setLoaded(true);
        return;
      }
      try {
        const list = await pb.collection('terminal_layouts').getFullList({
          filter: `owner = "${uid}"`,
          sort: 'created',
          requestKey: 'terminal-load',
        });
        if (!live) return;
        if (list.length === 0) {
          const rec = await pb.collection('terminal_layouts').create({
            owner: uid, name: 'My Terminal',
            layout: { symbols: DEFAULT_SYMBOLS, groups: DEFAULT_GROUPS, display: DEFAULT_DISPLAY, isActive: true },
          });
          const first = normalize(rec);
          setLayouts([first]);
          setActiveId(first.id);
        } else {
          const rows = list.map(normalize);
          setLayouts(rows);
          setActiveId((rows.find((l) => l.isActive) || rows[0]).id);
        }
      } catch { /* ignore */ }
      if (live) setLoaded(true);
    })();
    return () => { live = false; };
  }, [uid]);

  const persist = useCallback((id, full) => {
    if (!uid || !id) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pb.collection('terminal_layouts').update(id, { layout: layoutJson(full) }, { requestKey: `terminal-save-${id}` }).catch(() => {});
    }, 500);
  }, [uid]);

  // Patch the active layout in state + queue a save.
  const patchActive = useCallback((patch) => {
    if (!active) return;
    const merged = { ...active, ...patch };
    setLayouts((prev) => prev.map((l) => (l.id === active.id ? merged : l)));
    persist(active.id, merged);
  }, [active, persist]);

  const addSymbol = useCallback((symbol, group = null) => {
    if (!active) return;
    if (active.symbols.some((s) => s.symbol === symbol)) return;
    patchActive({ symbols: [...active.symbols, { symbol, group }] });
  }, [active, patchActive]);

  const removeSymbol = useCallback((symbol) => {
    if (!active) return;
    patchActive({ symbols: active.symbols.filter((s) => s.symbol !== symbol) });
  }, [active, patchActive]);

  const moveSymbol = useCallback((symbol, dir) => {
    if (!active) return;
    const arr = [...active.symbols];
    const i = arr.findIndex((s) => s.symbol === symbol);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    patchActive({ symbols: arr });
  }, [active, patchActive]);

  const assignGroup = useCallback((symbol, group) => {
    if (!active) return;
    patchActive({ symbols: active.symbols.map((s) => (s.symbol === symbol ? { ...s, group } : s)) });
  }, [active, patchActive]);

  const createGroup = useCallback((name) => {
    if (!active || !name) return;
    patchActive({ groups: [...(active.groups || []), { id: gid(), name, collapsed: false }] });
  }, [active, patchActive]);

  const renameGroup = useCallback((id, name) => {
    if (!active) return;
    patchActive({ groups: (active.groups || []).map((g) => (g.id === id ? { ...g, name } : g)) });
  }, [active, patchActive]);

  const toggleGroup = useCallback((id) => {
    if (!active) return;
    patchActive({ groups: (active.groups || []).map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)) });
  }, [active, patchActive]);

  const deleteGroup = useCallback((id) => {
    if (!active) return;
    patchActive({
      groups: (active.groups || []).filter((g) => g.id !== id),
      symbols: active.symbols.map((s) => (s.group === id ? { ...s, group: null } : s)),
    });
  }, [active, patchActive]);

  const setDisplay = useCallback((key, val) => {
    if (!active) return;
    patchActive({ display: { ...DEFAULT_DISPLAY, ...active.display, [key]: val } });
  }, [active, patchActive]);

  const saveLayout = useCallback(async (name) => {
    if (!active) return;
    const snapshot = { name: name || 'Layout', isActive: false, symbols: active.symbols, groups: active.groups, display: active.display };
    if (!uid) {
      const local = { ...snapshot, id: gid(), owner: null };
      setLayouts((prev) => [...prev, local]);
      setActiveId(local.id);
      return;
    }
    const rec = await pb.collection('terminal_layouts').create({
      owner: uid, name: snapshot.name,
      layout: { symbols: snapshot.symbols, groups: snapshot.groups, display: snapshot.display, isActive: false },
    });
    const row = normalize(rec);
    setLayouts((prev) => [...prev, row]);
    setActiveId(row.id);
  }, [uid, active]);

  const selectLayout = useCallback((id) => {
    setActiveId(id);
    if (uid) {
      layouts.forEach((l) => {
        const shouldBe = l.id === id;
        if (!!l.isActive !== shouldBe) {
          pb.collection('terminal_layouts').update(l.id, { layout: layoutJson({ ...l, isActive: shouldBe }) }, { requestKey: `terminal-active-${l.id}` }).catch(() => {});
        }
      });
    }
    setLayouts((prev) => prev.map((l) => ({ ...l, isActive: l.id === id })));
  }, [layouts, uid]);

  const renameLayout = useCallback((id, name) => {
    setLayouts((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
    pb.collection('terminal_layouts').update(id, { name }, { requestKey: `terminal-rename-${id}` }).catch(() => {});
  }, []);

  const deleteLayout = useCallback((id) => {
    if (layouts.length <= 1) return;
    pb.collection('terminal_layouts').delete(id).catch(() => {});
    setLayouts((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (activeId === id && next[0]) setActiveId(next[0].id);
      return next;
    });
  }, [layouts.length, activeId]);

  const display = { ...DEFAULT_DISPLAY, ...(active?.display || {}) };

  return {
    loaded, layouts, active, activeId,
    symbols: active?.symbols || [], groups: active?.groups || [], display,
    addSymbol, removeSymbol, moveSymbol, assignGroup,
    createGroup, renameGroup, toggleGroup, deleteGroup,
    setDisplay, saveLayout, selectLayout, renameLayout, deleteLayout,
  };
}

export default useTerminal;
