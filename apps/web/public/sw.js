// TradingBible Service Worker - Offline First, Push Notifications, Background Sync
const CACHE_NAME = 'tradingbible-v1.2.1';
const STATIC_CACHE = 'tradingbible-static-v1.2.1';
const DYNAMIC_CACHE = 'tradingbible-dynamic-v1.2.1';
const API_CACHE = 'tradingbible-api-v1.2.1';

const STATIC_ASSETS = [
  '/',
  '/app',
  '/app/wallet',
  '/app/tv',
  '/app/prop-firms',
  '/app/brokers',
  '/app/analytics',
  '/app/journal',
  '/icons/favicon.svg',
  '/icons/favicon-16x16.svg',
  '/icons/favicon-32x32.svg',
  '/icons/apple-touch-icon.svg',
  '/icons/favicon-192.png',
  '/icons/favicon-512.png',
  '/manifest.webmanifest'
];

const API_PATTERNS = [
  /^https?:\/\/.*\/api\/.*/,
  /^https?:\/\/.*\/ads/,
  /^https?:\/\/.*\/ads\/channels/,
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
      })
    }).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network First for API, Cache First for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip browser extensions, chrome-extension, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // API requests - Network First with cache fallback
  if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    return;
  }

  // Navigation requests - Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }

  // Static assets - Cache First
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.startsWith(asset))) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Other assets - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE));
});

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network First with cache fallback
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network First with offline fallback page
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match('/');
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cache.match(request));

  return cached || fetchPromise;
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-wallet') {
    event.waitUntil(syncWallet());
  } else if (event.tag === 'sync-journal') {
    event.waitUntil(syncJournal());
  }
});

async function syncWallet() {
  // Sync pending wallet transactions
  console.log('[SW] Syncing wallet...');
}

async function syncJournal() {
  // Sync pending journal entries
  console.log('[SW] Syncing journal...');
}

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from TradingBible',
    icon: '/icons/favicon-192.png',
    badge: '/icons/favicon-72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'tradingbible-notification',
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TradingBible', options)
  );
});

/* global clients */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus existing window
      for (const client of clients) {
        if (client.url.includes('tradingbible') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(event.notification.data?.url || '/app');
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Message from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'getVersion') {
    event.ports[0].postMessage({ version: '1.2.1' });
  }
});

console.log('[SW] TradingBible Service Worker v1.2.1 loaded');
