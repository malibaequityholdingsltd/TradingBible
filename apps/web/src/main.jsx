import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import '@/styles/tokens.css';

// Stale-bundle guard: after a deploy, cached HTML can reference deleted lazy
// chunks, which otherwise renders a permanent blank screen. On the first
// chunk-load failure per session, bust caches and reload once for a fresh
// shell instead of staying blank.
function chunkReloadGuard() {
  const KEY = 'tb:chunk-reloaded';
  const isChunkError = (msg) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(
      String(msg || ''),
    );
  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch { /* ignore */ }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
        .catch(() => {})
        .finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  };
  window.addEventListener('error', (e) => { if (isChunkError(e?.message)) reloadOnce(); }, true);
  window.addEventListener('unhandledrejection', (e) => { if (isChunkError(e?.reason?.message || e?.reason)) reloadOnce(); });
}
chunkReloadGuard();

ReactDOM.createRoot(document.getElementById('root')).render(
	<App />
);

// PWA service worker registration (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
	});
}
