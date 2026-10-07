import { useCallback, useEffect, useState } from 'react';
import { API_SERVER_URL } from './apiServerClient';

// Site-copy overrides: admin-curated i18n key → value pairs served by
// GET /admin/content-copy. Merged over built-in ENGLISH strings only (other
// languages keep shipped translations). Cached 30 min in localStorage;
// the admin portal busts the cache on save via notifySiteCopyChanged().

const CACHE_KEY = 'tb:site-copy-v1';
const CACHE_TTL = 30 * 60 * 1000;
const CHANGE_EVENT = 'tb:site-copy:changed';

export function notifySiteCopyChanged() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return parsed.overrides || {};
  } catch { /* ignore */ }
  return null;
}

export function useSiteCopy() {
  const [overrides, setOverrides] = useState(() => readCache() || {});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_SERVER_URL}/admin/content-copy`);
      if (res.ok) {
        const data = await res.json();
        const next = data?.overrides && typeof data.overrides === 'object' ? data.overrides : {};
        setOverrides(next);
        try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), overrides: next })); } catch { /* ignore */ }
      }
    } catch { /* keep cache/defaults */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, [load]);

  return { overrides, loaded, reload: load };
}
