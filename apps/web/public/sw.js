// Service worker kill switch.
//
// The previous cache-first/network-first worker occasionally served a stale
// or empty candle body to the terminal, leaving the desk on "LOADING". Live
// market data must never be proxied through a cache. This worker clears every
// cache, unregisters itself, and reloads open tabs once; main.jsx no longer
// registers a service worker.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch { /* ignore */ }
    try { await self.registration.unregister(); } catch { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        try { client.navigate(client.url); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  })());
});
