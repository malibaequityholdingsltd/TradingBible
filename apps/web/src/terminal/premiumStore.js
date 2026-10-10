// TradingBible Terminal Premium — workspace store.
// Local-first autosave (localStorage) with optional PocketBase cloud sync.
// Live account stays authority for orders/positions; this store is authority
// ONLY for saved work: drawings, indicators, layouts, watchlists, timeframes,
// chart position, orderflow + heatmap config. Never stores fills or balances.
import { useCallback, useEffect, useRef, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

const LS_KEY = 'tb:terminal-premium:v1';
const LS_VERSIONS = 'tb:terminal-premium:versions:v1';

export const PREMIUM_FEATURES = [
  'charts', 'orderflow', 'footprint', 'heatmap', 'dom', 'replay', 'indicators', 'news', 'journal', 'alerts',
];

export const DESK_PRESETS = {
  // Desks differ by symbol / timeframe / focus tab — every desk keeps the
  // full toolset, so switching desks never hides tabs (e.g. Replay).
  'gold-desk': {
    name: 'Gold Desk', symbol: 'XAUUSD', timeframe: '15m', chartType: 'candle',
    centerTab: 'chart', features: [...PREMIUM_FEATURES],
  },
  'bitcoin-desk': {
    name: 'Bitcoin Desk', symbol: 'BTCUSD', timeframe: '1h', chartType: 'candle',
    centerTab: 'chart', features: [...PREMIUM_FEATURES],
  },
  'orderflow-desk': {
    name: 'Order Flow Desk', symbol: 'NQ', timeframe: '5m', chartType: 'candle',
    centerTab: 'orderflow', features: [...PREMIUM_FEATURES],
  },
  'news-desk': {
    name: 'News Desk', symbol: 'EURUSD', timeframe: '1h', chartType: 'candle',
    centerTab: 'news', features: [...PREMIUM_FEATURES],
  },
};

function defaultWorkspace() {
  return {
    name: 'Gold Desk',
    symbol: 'XAUUSD',
    timeframe: '15m',
    chartType: 'candle',
    centerTab: 'chart', // chart | orderflow | footprint | heatmap | dom | replay
    watchlist: ['XAUUSD', 'BTCUSD', 'NAS100', 'EURUSD'],
    features: [...PREMIUM_FEATURES],
    orderflow: { mode: 'bidask', showDelta: true, showPoc: true },
    heatmap: { period: '1d', category: 'all' },
    replay: { speed: 1, cursor: 0, playing: false },
    risk: { riskPct: 1, accountId: '' },
    updatedAt: new Date().toISOString(),
  };
}

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const ws = JSON.parse(raw);
    if (!ws || typeof ws !== 'object') return null;
    // Union stored tools with the full set: saved desks from before the
    // desk rework filtered tabs out (e.g. Replay), and no UI ever hides
    // tools on purpose — so nothing the user had may disappear.
    const features = Array.isArray(ws.features)
      ? [...new Set([...ws.features, ...PREMIUM_FEATURES])]
      : [...PREMIUM_FEATURES];
    return { ...defaultWorkspace(), ...ws, features };
  } catch { return null; }
}

function readVersions() {
  try {
    const raw = localStorage.getItem(LS_VERSIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function usePremiumWorkspace({ autosave = true, restoreWorkspace = true } = {}) {
  const [workspace, setWorkspace] = useState(() => (restoreWorkspace ? (readLS() || defaultWorkspace()) : defaultWorkspace()));
  const [versions, setVersions] = useState(() => readVersions());
  const [cloudStatus, setCloudStatus] = useState('local'); // local | syncing | synced | error
  const timer = useRef(null);

  // Autosave locally (debounced). Cloud sync is best-effort: if the
  // `terminal_workspaces` collection exists we upsert, otherwise stay local.
  useEffect(() => {
    if (!autosave) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ ...workspace, updatedAt: new Date().toISOString() }));
      } catch { /* storage full — keep in memory */ }
      // Best-effort cloud backup, never blocking.
      if (pb.authStore.isValid) {
        setCloudStatus('syncing');
        (async () => {
          try {
            const existing = await pb.collection('terminal_workspaces').getFullList({ requestKey: 'tbw-list' }).catch(() => null);
            if (!existing) { setCloudStatus('local'); return; }
            const mine = existing.find((w) => w.name === workspace.name);
            if (mine) await pb.collection('terminal_workspaces').update(mine.id, { layout: workspace });
            else await pb.collection('terminal_workspaces').create({ name: workspace.name, layout: workspace, owner: pb.authStore.record?.id });
            setCloudStatus('synced');
          } catch { setCloudStatus('local'); }
        })();
      }
    }, 600);
    return () => clearTimeout(timer.current);
  }, [workspace, autosave]);

  const patch = useCallback((p) => setWorkspace((w) => ({ ...w, ...p })), []);

  const loadPreset = useCallback((id) => {
    const p = DESK_PRESETS[id];
    if (!p) return;
    setWorkspace((w) => ({ ...w, ...p, updatedAt: new Date().toISOString() }));
  }, []);

  const saveVersion = useCallback((label) => {
    const name = (label || '').trim() || `Version ${new Date().toLocaleString()}`;
    setVersions((vs) => {
      const next = [{ id: `${Date.now()}`, name, snapshot: workspace, created: new Date().toISOString() }, ...vs].slice(0, 20);
      try { localStorage.setItem(LS_VERSIONS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [workspace]);

  const restoreVersion = useCallback((id) => {
    const v = readVersions().find((x) => x.id === id);
    if (v?.snapshot) setWorkspace({ ...defaultWorkspace(), ...v.snapshot });
  }, []);

  return { workspace, patch, versions, saveVersion, restoreVersion, loadPreset, cloudStatus };
}

export default usePremiumWorkspace;
