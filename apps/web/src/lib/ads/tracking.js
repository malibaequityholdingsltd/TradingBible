export const TRACKING_EVENTS = {
  IMPRESSION: 'impression',
  CLICK: 'click',
  VIEWABLE: 'viewable',
  CONVERSION: 'conversion',
  CLOSE: 'close',
  DISMISS: 'dismiss',
  REWARD_GRANTED: 'reward_granted',
  VIDEO_START: 'video_start',
  VIDEO_FIRST_QUARTILE: 'video_first_quartile',
  VIDEO_MIDPOINT: 'video_midpoint',
  VIDEO_THIRD_QUARTILE: 'video_third_quartile',
  VIDEO_COMPLETE: 'video_complete',
  VIDEO_PAUSE: 'video_pause',
  VIDEO_RESUME: 'video_resume',
  VIDEO_MUTE: 'video_mute',
  VIDEO_UNMUTE: 'video_unmute',
  VIDEO_FULLSCREEN: 'video_fullscreen',
  VIDEO_ERROR: 'video_error',
  VIDEO_SKIP: 'video_skip',
  LOAD_START: 'load_start',
  LOAD_COMPLETE: 'load_complete',
  LOAD_ERROR: 'load_error',
};

export class TrackingEngine {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/ads/track';
    this.batchSize = options.batchSize || 10;
    this.batchInterval = options.batchInterval || 5000;
    this.queue = [];
    this.timer = null;
    this.enabled = options.enabled !== false;
    this.consent = options.consent || {};
    this.sessionId = this.generateSessionId();
    this.userId = options.userId || null;
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  setConsent(consent) {
    this.consent = consent;
  }

  track(event, data = {}) {
    if (!this.enabled) return Promise.resolve();

    if (!this.hasConsent(event)) return Promise.resolve();

    const payload = {
      event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...data,
    };

    this.queue.push(payload);
    this.scheduleFlush();

    return Promise.resolve();
  }

  hasConsent(event) {
    if (Object.keys(this.consent).length === 0) return true;
    if (event.startsWith('video_')) return this.consent.analytics !== false;
    if (event === TRACKING_EVENTS.CONVERSION) return this.consent.marketing !== false;
    return this.consent.analytics !== false;
  }

  scheduleFlush() {
    if (this.timer) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.batchInterval);

    if (this.queue.length >= this.batchSize) {
      clearTimeout(this.timer);
      this.timer = null;
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
    } catch (error) {
      this.queue.unshift(...batch);
    }
  }

  trackImpression(adId, placementId, data = {}) {
    return this.track(TRACKING_EVENTS.IMPRESSION, { adId, placementId, ...data });
  }

  trackClick(adId, placementId, data = {}) {
    return this.track(TRACKING_EVENTS.CLICK, { adId, placementId, ...data });
  }

  trackViewable(adId, placementId, data = {}) {
    return this.track(TRACKING_EVENTS.VIEWABLE, { adId, placementId, ...data });
  }

  trackConversion(adId, placementId, conversionData = {}) {
    return this.track(TRACKING_EVENTS.CONVERSION, { adId, placementId, ...conversionData });
  }

  trackVideoEvent(adId, event, data = {}) {
    return this.track(event, { adId, ...data });
  }

  trackLoadStart(adId, placementId) {
    return this.track(TRACKING_EVENTS.LOAD_START, { adId, placementId });
  }

  trackLoadComplete(adId, placementId, loadTime) {
    return this.track(TRACKING_EVENTS.LOAD_COMPLETE, { adId, placementId, loadTime });
  }

  trackLoadError(adId, placementId, error) {
    return this.track(TRACKING_EVENTS.LOAD_ERROR, { adId, placementId, error: String(error) });
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

let globalTracker = null;

export function getTracker(options) {
  if (!globalTracker) {
    globalTracker = new TrackingEngine(options);
  }
  return globalTracker;
}

export function initTracker(options) {
  globalTracker = new TrackingEngine(options);
  return globalTracker;
}

export function trackImpression(adId, placementId, data) {
  return getTracker().trackImpression(adId, placementId, data);
}

export function trackClick(adId, placementId, data) {
  return getTracker().trackClick(adId, placementId, data);
}

export function trackViewable(adId, placementId, data) {
  return getTracker().trackViewable(adId, placementId, data);
}

export function trackConversion(adId, placementId, data) {
  return getTracker().trackConversion(adId, placementId, data);
}

export function trackVideoEvent(adId, event, data) {
  return getTracker().trackVideoEvent(adId, event, data);
}

export class ViewabilityTracker {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.5;
    this.minDuration = options.minDuration || 1000;
    this.observer = null;
    this.trackedElements = new Map();
    this.callbacks = new Map();
  }

  observe(element, adId, placementId, callback) {
    if (!element || this.trackedElements.has(element)) return;

    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
      );
    }

    this.trackedElements.set(element, {
      adId,
      placementId,
      callback,
      visible: false,
      visibleSince: null,
      reported: false,
    });

    this.observer.observe(element);
  }

  unobserve(element) {
    if (!this.observer || !this.trackedElements.has(element)) return;
    this.observer.unobserve(element);
    this.trackedElements.delete(element);

    if (this.trackedElements.size === 0) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  handleIntersection(entries) {
    const now = Date.now();

    for (const entry of entries) {
      const data = this.trackedElements.get(entry.target);
      if (!data) continue;

      const ratio = entry.intersectionRatio;
      const isVisible = ratio >= this.threshold;

      if (isVisible && !data.visible) {
        data.visible = true;
        data.visibleSince = now;
      } else if (!isVisible && data.visible) {
        if (data.visibleSince && now - data.visibleSince >= this.minDuration && !data.reported) {
          data.reported = true;
          this.fireCallback(data, ratio);
        }
        data.visible = false;
        data.visibleSince = null;
      } else if (isVisible && data.visible && data.visibleSince && !data.reported) {
        if (now - data.visibleSince >= this.minDuration) {
          data.reported = true;
          this.fireCallback(data, ratio);
        }
      }
    }
  }

  fireCallback(data, ratio) {
    if (data.callback) {
      data.callback(data.adId, data.placementId, ratio);
    }
    trackViewable(data.adId, data.placementId, { viewabilityRatio: ratio });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.trackedElements.clear();
  }
}

export function createViewabilityTracker(options) {
  return new ViewabilityTracker(options);
}