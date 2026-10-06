import { FREQUENCY_CAP_TYPES } from './types.js';

const STORAGE_KEY = 'tb:ad-frequency';
const SESSION_KEY = 'tb:ad-frequency-session';

export class FrequencyCapEngine {
  constructor(options = {}) {
    this.caps = options.caps || [];
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.sessionStorage = options.sessionStorage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    this.syncInterval = options.syncInterval || 60000;
    this.lastSync = 0;
    this.pendingSync = new Map();
  }

  setCaps(caps) {
    this.caps = caps;
  }

  addCap(cap) {
    this.caps.push(cap);
  }

  removeCap(capId) {
    this.caps = this.caps.filter(c => c.id !== capId);
  }

  checkCap(adId, context = {}) {
    const userId = context.userId || this.getUserId();
    const sessionId = context.sessionId || this.getSessionId();
    const now = Date.now();

    for (const cap of this.caps) {
      if (cap.adId && cap.adId !== adId) continue;
      if (cap.campaignId && cap.campaignId !== context.campaignId) continue;
      if (cap.placementId && cap.placementId !== context.placementId) continue;

      const current = this.getCurrentCount(cap, userId, sessionId, now);
      if (current >= cap.max) {
        return {
          allowed: false,
          cap,
          current,
          remaining: 0,
          resetAt: this.getResetTime(cap.type, now),
        };
      }
    }

    return { allowed: true, current: 0, remaining: Infinity };
  }

  increment(adId, context = {}) {
    const userId = context.userId || this.getUserId();
    const sessionId = context.sessionId || this.getSessionId();
    const now = Date.now();

    for (const cap of this.caps) {
      if (cap.adId && cap.adId !== adId) continue;
      if (cap.campaignId && cap.campaignId !== context.campaignId) continue;
      if (cap.placementId && cap.placementId !== context.placementId) continue;

      this.incrementCount(cap, userId, sessionId, now);
    }

    this.scheduleSync();
  }

  getCurrentCount(cap, userId, sessionId, now) {
    const key = this.getStorageKey(cap, userId, sessionId);
    const data = this.getStorageData(key);

    if (!data || this.isExpired(cap.type, data.windowStart, now)) {
      return 0;
    }

    return data.count || 0;
  }

  incrementCount(cap, userId, sessionId, now) {
    const key = this.getStorageKey(cap, userId, sessionId);
    let data = this.getStorageData(key);

    if (!data || this.isExpired(cap.type, data.windowStart, now)) {
      data = { count: 0, windowStart: this.getWindowStart(cap.type, now) };
    }

    data.count = (data.count || 0) + 1;
    this.setStorageData(key, data);
    this.pendingSync.set(key, data);
  }

  getStorageKey(cap, userId, sessionId) {
    const scope = cap.scope || 'user';
    switch (scope) {
      case 'global':
        return `global:${cap.id}`;
      case 'session':
        return `session:${sessionId}:${cap.id}`;
      case 'user':
      default:
        return `user:${userId}:${cap.id}`;
    }
  }

  getWindowStart(type, now) {
    switch (type) {
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_HOUR:
        return new Date(now).setMinutes(0, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY:
        return new Date(now).setHours(0, 0, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_WEEK:
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        return d.setHours(0, 0, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_SESSION:
        return now;
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_USER:
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_GLOBAL:
      default:
        return 0;
    }
  }

  getResetTime(type, now) {
    switch (type) {
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_HOUR:
        return new Date(now).setMinutes(60, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY:
        return new Date(now + 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_WEEK:
        const d = new Date(now);
        d.setDate(d.getDate() + (7 - d.getDay()));
        return d.setHours(0, 0, 0, 0);
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_SESSION:
        return now + 30 * 60 * 1000;
      default:
        return now + 24 * 60 * 60 * 1000;
    }
  }

  isExpired(type, windowStart, now) {
    if (type === FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_USER ||
        type === FREQUENCY_CAP_TYPES.IMPRESSIONS_GLOBAL) {
      return false;
    }
    return now - windowStart > this.getWindowDuration(type);
  }

  getWindowDuration(type) {
    switch (type) {
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_HOUR:
        return 60 * 60 * 1000;
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY:
        return 24 * 60 * 60 * 1000;
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_WEEK:
        return 7 * 24 * 60 * 60 * 1000;
      case FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_SESSION:
        return 30 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  getStorageData(key) {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(`${STORAGE_KEY}:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setStorageData(key, data) {
    if (!this.storage) return;
    try {
      this.storage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  getUserId() {
    if (!this.storage) return 'anon';
    try {
      let id = this.storage.getItem('tb:user-id');
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.storage.setItem('tb:user-id', id);
      }
      return id;
    } catch {
      return 'anon';
    }
  }

  getSessionId() {
    if (!this.sessionStorage) return 'session';
    try {
      let id = this.sessionStorage.getItem('tb:session-id');
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.sessionStorage.setItem('tb:session-id', id);
      }
      return id;
    } catch {
      return 'session';
    }
  }

  scheduleSync() {
    const now = Date.now();
    if (now - this.lastSync > this.syncInterval) {
      this.sync();
    }
  }

  async sync() {
    this.lastSync = Date.now();
    if (this.pendingSync.size === 0) return;

    const updates = Object.fromEntries(this.pendingSync);
    this.pendingSync.clear();

    try {
      const response = await fetch('/api/ads/frequency/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error('Sync failed');
    } catch {
      for (const [key, data] of Object.entries(updates)) {
        this.pendingSync.set(key, data);
      }
    }
  }

  getAllCounts(context = {}) {
    const userId = context.userId || this.getUserId();
    const sessionId = context.sessionId || this.getSessionId();
    const now = Date.now();

    const counts = {};
    for (const cap of this.caps) {
      const key = this.getStorageKey(cap, userId, sessionId);
      const data = this.getStorageData(key);
      const current = data && !this.isExpired(cap.type, data.windowStart, now) ? data.count : 0;
      counts[cap.id] = {
        cap,
        current,
        remaining: Math.max(0, cap.max - current),
        percentUsed: cap.max > 0 ? (current / cap.max) * 100 : 0,
      };
    }
    return counts;
  }

  reset(capId) {
    if (!this.storage) return;
    const userId = this.getUserId();
    const sessionId = this.getSessionId();

    for (const cap of this.caps) {
      if (capId && cap.id !== capId) continue;
      const key = this.getStorageKey(cap, userId, sessionId);
      this.storage.removeItem(`${STORAGE_KEY}:${key}`);
    }
  }
}

export function createFrequencyCap(type, max, options = {}) {
  return {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    max,
    scope: options.scope || 'user',
    adId: options.adId || null,
    campaignId: options.campaignId || null,
    placementId: options.placementId || null,
    enabled: options.enabled !== false,
  };
}

export function createUserCap(type, max, options = {}) {
  return createFrequencyCap(type, max, { ...options, scope: 'user' });
}

export function createSessionCap(type, max, options = {}) {
  return createFrequencyCap(type, max, { ...options, scope: 'session' });
}

export function createGlobalCap(type, max, options = {}) {
  return createFrequencyCap(type, max, { ...options, scope: 'global' });
}

export function createPacingEngine(caps, options = {}) {
  const engine = new FrequencyCapEngine({ caps, ...options });
  return engine;
}