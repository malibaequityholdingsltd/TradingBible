import { useCallback, useEffect, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

export const PLATFORM_SETTINGS_DEFAULTS = {
  platformName: 'TradingBible',
  tagline: 'TradingBible',
  supportEmail: 'support@tradingbible.app',
  // trialDays is legacy (no free trial). Kept at 0 so old cached settings
  // never re-enable a trial anywhere.
  trialDays: 0,
  signupsOpen: true,
  maintenance: false,
  twoFARequired: false,
  emailVerification: true,
  enforceBrokerSync: true,
  allowManualPropAccounts: false,
  digestEnabled: false,
  digestHourUTC: 18,
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

// Minimum plan per PlanProtected route. Admin-editable in Settings —
// changing these re-gates the user portal with no code deploy.
export const PLAN_GATES_DEFAULTS = {
  reports: 'elite',
  coach: 'elite',
  apiDocs: 'professional',
  branding: 'professional',
  apiKeys: 'professional',
};

const CACHE_KEY = 'tb:platform-settings-v2';
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
  const [planGates, setPlanGates] = useState(PLAN_GATES_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) {
          setSettings({ ...PLATFORM_SETTINGS_DEFAULTS, ...(parsed.settings || {}) });
          setFeatures({ ...PLATFORM_FEATURES_DEFAULTS, ...(parsed.features || {}) });
          setPlanGates({ ...PLAN_GATES_DEFAULTS, ...((parsed.settings || {}).planGates || {}) });
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
      setPlanGates({ ...PLAN_GATES_DEFAULTS, ...(next.settings.planGates || {}) });
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

  return { settings, features, planGates, loaded, reload: load };
}

export const FEATURE_ROUTES = {
  aiCoach: ['/app/coach'],
  academy: ['/app/academy'],
  community: ['/app/community'],
  economicCalendar: ['/app/economic-calendar'],
  riskTools: ['/app/tools'],
  chartBuilder: ['/app/terminal-pro', '/app/indicators', '/app/heatmaps'],
  signals: ['/app/signals', '/app/alerts'],
  wallet: ['/app/wallet'],
};

export function featureForRoute(pathname) {
  for (const [feature, routes] of Object.entries(FEATURE_ROUTES)) {
    if (routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return feature;
  }
  return null;
}
