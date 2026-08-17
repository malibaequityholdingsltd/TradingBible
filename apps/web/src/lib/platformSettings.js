import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

export const PLATFORM_SETTINGS_DEFAULTS = {
  platformName: 'TradingBible',
  tagline: 'Trade like the 1%. Journal like a fund.',
  supportEmail: 'support@tradingbible.app',
  trialDays: 7,
  signupsOpen: true,
  maintenance: false,
  twoFARequired: false,
  emailVerification: true,
};

export const PLATFORM_FEATURES_DEFAULTS = {
  aiCoach: true,
  academy: true,
  community: true,
  economicCalendar: true,
  riskTools: true,
  chartBuilder: true,
  signals: true,
  wallet: true,
};

const CACHE_KEY = 'tb:platform-settings';
const CACHE_TTL = 30 * 60 * 1000;
const CHANGE_EVENT = 'tb:platform-settings:changed';

export function notifyPlatformSettingsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState(PLATFORM_SETTINGS_DEFAULTS);
  const [features, setFeatures] = useState(PLATFORM_FEATURES_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) {
          setSettings({ ...PLATFORM_SETTINGS_DEFAULTS, ...(parsed.settings || {}) });
          setFeatures({ ...PLATFORM_FEATURES_DEFAULTS, ...(parsed.features || {}) });
          setLoaded(true);
        }
      }
    } catch {}
    try {
      const rec = await pb.collection('admin_platform_settings').getFirstListItem('key = "default"');
      const next = {
        ts: Date.now(),
        settings: { ...PLATFORM_SETTINGS_DEFAULTS, ...(rec.settings || {}) },
        features: { ...PLATFORM_FEATURES_DEFAULTS, ...(rec.features || {}) },
      };
      setSettings(next.settings);
      setFeatures(next.features);
      setLoaded(true);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {}
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('focus', onRefresh);
    window.addEventListener(CHANGE_EVENT, onRefresh);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener(CHANGE_EVENT, onRefresh);
    };
  }, [load]);

  return { settings, features, loaded, reload: load };
}

export const FEATURE_ROUTES = {
  aiCoach: ['/app/coach'],
  academy: ['/app/academy'],
  community: ['/app/community'],
  economicCalendar: ['/app/economic-calendar'],
  riskTools: ['/app/tools'],
  chartBuilder: ['/app/charts', '/app/indicators', '/app/heatmaps'],
  signals: ['/app/signals', '/app/alerts'],
  wallet: ['/app/wallet'],
};

export function featureForRoute(pathname) {
  for (const [feature, routes] of Object.entries(FEATURE_ROUTES)) {
    if (routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return feature;
  }
  return null;
}
