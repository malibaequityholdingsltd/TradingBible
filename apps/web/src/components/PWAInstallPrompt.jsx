import React, { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = navigator.standalone === true;
    setIsInstalled(isStandalone || isInWebAppiOS);

    if (isInstalled) return;

    // Listen for beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS - show after delay if not installed
    if (isIOS && !isInstalled) {
      const timer = setTimeout(() => setShow(true), 10000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS fallback - show instructions
      alert('To install: Tap Share → Add to Home Screen');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    }
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  // Check if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      setShow(false);
    }
  }, []);

  // Force inclusion in bundle
  console.log('[PWA] Install prompt component loaded');

  if (!deferredPrompt && !isIOS) return null;
  if (isInstalled) return null;
  if (!show) return null;

  return (
    <div id="pwa-install-banner" role="dialog" aria-labelledby="pwa-banner-title" aria-describedby="pwa-banner-desc">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <div className="content">
        <div className="title" id="pwa-banner-title">Install TradingBible</div>
        <div className="desc">Get instant access, offline support & push notifications</div>
        <div className="actions">
          <button className="dismiss-btn" onClick={handleDismiss}>Not now</button>
          <button className="install-btn" onClick={handleInstall}>Install App</button>
        </div>
      </div>
    </div>
  );
}
console.log('PWA component loaded at top level');
console.log('PWA component loaded at module level');
