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

const EMPTY_STATE = {
  settings: PLATFORM_SETTINGS_DEFAULTS,
  features: PLATFORM_FEATURES_DEFAULTS,
  planGates: PLAN_GATES_DEFAULTS,
  loaded: false,
};

// Platform settings are used by the app shell, route guards and several
// pages at once. Before this store existed each caller fetched the same row
// independently (4+ identical Supabase requests per app open). Keep one
// module-level snapshot and one in-flight request for the whole tab.
let sharedState = EMPTY_STATE;
let hydrated = false;
let inflight = null;
let lastLoadedAt = 0;
const listeners = new Set();

function readCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts >= CACHE_TTL) return null;
    return {
      settings: { ...PLATFORM_SETTINGS_DEFAULTS, ...(parsed.settings || {}) },
      features: { ...PLATFORM_FEATURES_DEFAULTS, ...(parsed.features || {}) },
      planGates: { ...PLAN_GATES_DEFAULTS, ...((parsed.settings || {}).planGates || {}) },
    };
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const cached = readCache();
  if (cached) sharedState = { ...sharedState, ...cached, loaded: true };
}

function publish(next) {
  sharedState = next;
  listeners.forEach((listener) => listener(next));
}

function loadPlatformSettings(force = false) {
  hydrate();
  if (inflight) return inflight;
  if (!force && lastLoadedAt && Date.now() - lastLoadedAt < 5000) {
    return Promise.resolve(sharedState);
  }
  inflight = (async () => {
    try {
      const rec = await pb.collection('admin_platform_settings').getFirstListItem('key = "default"');
      const next = {
        ts: Date.now(),
        settings: { ...PLATFORM_SETTINGS_DEFAULTS, ...(rec.settings || {}) },
        features: { ...PLATFORM_FEATURES_DEFAULTS, ...(rec.features || {}) },
      };
      sharedState = {
        settings: next.settings,
        features: next.features,
        planGates: { ...PLAN_GATES_DEFAULTS, ...(next.settings.planGates || {}) },
        loaded: true,
      };
      lastLoadedAt = Date.now();
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
    } catch {
      sharedState = { ...sharedState, loaded: true };
    } finally {
      const done = sharedState;
      inflight = null;
      publish(done);
    }
  })();
  return inflight;
}

export function notifyPlatformSettingsChanged() {
  lastLoadedAt = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function usePlatformSettings() {
  const [state, setState] = useState(() => {
    hydrate();
    return sharedState;
  });

  useEffect(() => {
    const listener = (next) => setState(next);
    listeners.add(listener);
    // Another component may have refreshed the store between render and
    // effect; sync once before subscribing.
    setState(sharedState);
    loadPlatformSettings();
    return () => listeners.delete(listener);
  }, []);

  return {
    ...state,
    reload: useCallback(() => loadPlatformSettings(true), []),
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => loadPlatformSettings(true));
  window.addEventListener(CHANGE_EVENT, () => loadPlatformSettings(true));
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
