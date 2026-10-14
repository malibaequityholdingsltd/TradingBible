import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import '@/styles/tokens.css';
import { bootWhiteLabel } from '@/lib/whitelabel';

// Apply saved white-label theme (accent + text colors) before first paint.
try { bootWhiteLabel(); } catch { /* default brand */ }

// Stale-bundle guard: after a deploy, cached HTML can reference deleted lazy
// chunks, which otherwise renders a permanent blank screen. Allow a few
// cache-busting reloads per session (matching ErrorBoundary's budget) instead
// of one plain reload that can re-serve the same stale shell.
function chunkReloadGuard() {
  const KEY = 'tb:chunk-retries';
  const isChunkError = (msg) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk/i.test(
      String(msg || ''),
    );
  const reloadOnce = () => {
    try {
      const n = parseInt(sessionStorage.getItem(KEY) || '0', 10) || 0;
      if (n >= 3) return;
      sessionStorage.setItem(KEY, String(n + 1));
    } catch { /* ignore */ }
    const done = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('rebuild', Date.now().toString(36));
        window.location.href = url.toString();
      } catch { window.location.reload(); }
    };
    if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => {}))))
        .catch(() => {})
        .finally(() => setTimeout(done, 150));
    } else {
      setTimeout(done, 150);
    }
  };
  window.addEventListener('error', (e) => { if (isChunkError(e?.message)) reloadOnce(); }, true);
  window.addEventListener('unhandledrejection', (e) => { if (isChunkError(e?.reason?.message || e?.reason)) reloadOnce(); });
}
chunkReloadGuard();

console.log('[main.jsx] Mounting App to #root');
ReactDOM.createRoot(document.getElementById('root')).render(
	<App />
);
console.log('[main.jsx] App mounted');

// PWA service worker registration (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
	});
}
