import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Download } from 'lucide-react';

// Offline indicator + service-worker update prompt. Purely additive overlay
// pinned to the bottom of the viewport; safe on every route.
export default function PwaStatus() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let reg;

    const trackWaiting = (registration) => {
      if (registration.waiting) setWaitingWorker(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const nw = registration.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(nw);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        reg = registration;
        trackWaiting(registration);
      }
    });

    const onControllerChange = () => {
      if (reloading) return;
      setReloading(true);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, [reloading]);

  const applyUpdate = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  if (online && !waitingWorker) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {!online && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#0f0f14]/95 px-4 py-2 text-sm text-[#e9e7df] shadow-lg backdrop-blur">
          <WifiOff className="h-4 w-4 text-[#d4af37]" />
          You are offline — showing cached data. Actions will sync when you reconnect.
        </div>
      )}
      {waitingWorker && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#d4af37]/35 bg-[#0f0f14]/95 px-4 py-2 text-sm text-[#e9e7df] shadow-lg backdrop-blur">
          <Download className="h-4 w-4 text-[#d4af37]" />
          A new version of TradingBible is available.
          <button
            onClick={applyUpdate}
            disabled={reloading}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-1 text-xs font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60"
          >
            {reloading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Update
          </button>
        </div>
      )}
    </div>
  );
}
