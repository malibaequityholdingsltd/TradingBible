import { TargetingEngine } from './targeting.js';
import { RotationEngine } from './rotation.js';
import { FrequencyCapEngine } from './frequency.js';
import { TrackingEngine, ViewabilityTracker, trackImpression, trackClick, trackViewable, trackConversion, trackVideoEvent, getTracker } from './tracking.js';
import { ABTestingEngine } from './abtesting.js';
import { AdScheduler } from './scheduler.js';
import { parseVAST, parseVMAP } from './vast.js';
import { AD_TYPES, AD_PLACEMENTS, createAdId, createPlacementId } from './types.js';

export class AdsService {
  constructor(options = {}) {
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    this.apiUrl = options.apiUrl || (isDev ? 'http://localhost:3001/ads' : '/ads');
    this.targetingEngine = new TargetingEngine();
    this.rotationEngine = new RotationEngine(options.rotationAlgorithm);
    this.frequencyEngine = new FrequencyCapEngine(options.frequencyOptions);
    this.trackingEngine = new TrackingEngine(options.trackingOptions);
    this.abOptions = options.abTestingOptions || {};
    this.abTestingEngine = new ABTestingEngine({
      ...this.abOptions,
      sync: (payload) => this.syncExperiment(payload),
    });
    this.scheduler = new AdScheduler(options.schedulerOptions);
    this.viewabilityTracker = new ViewabilityTracker(options.viewabilityOptions);
    this.ads = new Map();
    this.placements = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await this.fetchAds();
    await this.fetchPlacements();
    this.initialized = true;
  }

  async fetchAds() {
    try {
      const response = await fetch(`${this.apiUrl}`);
      if (!response.ok) throw new Error('Failed to fetch ads');
      const data = await response.json();

      this.ads.clear();
      for (const ad of data.ads || []) {
        this.ads.set(ad.id, this.normalizeAd(ad));
      }

      if (data.settings) {
        this.rotationEngine.setAds(Array.from(this.ads.values()));
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    }
  }

  async fetchPlacements() {
    try {
      const response = await fetch(`${this.apiUrl}/placements`);
      if (!response.ok) return;
      const data = await response.json();

      this.placements.clear();
      for (const placement of data.placements || []) {
        this.placements.set(placement.id, placement);
      }
    } catch (error) {
      console.error('Failed to fetch placements:', error);
    }
  }

  normalizeAd(ad) {
    return {
      id: ad.id,
      key: ad.key,
      type: ad.type || AD_TYPES.BANNER,
      provider: ad.provider || 'brand',
      title: ad.title || '',
      headline: ad.headline || '',
      imageUrl: ad.imageUrl || '',
      videoUrl: ad.videoUrl || '',
      vastXml: ad.vastXml || '',
      vmapXml: ad.vmapXml || '',
      logoUrl: ad.logoUrl || '',
      linkUrl: ad.linkUrl || '',
      cta: ad.cta || 'Learn more',
      accent: ad.accent || '#d4af37',
      durationSeconds: ad.durationSeconds || 12,
      snippet: ad.snippet || '',
      pages: Array.isArray(ad.pages) ? ad.pages : [],
      storyDurationSeconds: ad.storyDurationSeconds || 5,
      ampWidth: ad.ampWidth || 320,
      ampHeight: ad.ampHeight || 100,
      ampSlot: ad.ampSlot || '',
      i18n: ad.i18n || {},
      weight: ad.weight || 1,
      priority: ad.priority || 0,
      enabled: ad.enabled !== false,
      targeting: ad.targeting || [],
      frequencyCaps: ad.frequencyCaps || [],
      dailyCap: ad.dailyCap,
      hourlyCap: ad.hourlyCap,
      ctr: ad.ctr,
      ecpm: ad.ecpm,
      placementIds: ad.placementIds || [],
      campaignId: ad.campaignId,
      startDate: ad.startDate,
      endDate: ad.endDate,
      dayparting: ad.dayparting || [],
      vastData: ad.vastXml ? parseVAST(ad.vastXml) : null,
      vmapData: ad.vmapXml ? parseVMAP(ad.vmapXml) : null,
    };
  }

  getAd(adId) {
    return this.ads.get(adId);
  }

  getAdsForPlacement(placementId, context = {}) {
    // Unknown placement (e.g. /placements endpoint missing): serve as an
    // open slot instead of rendering nothing. House ads with an empty
    // placementIds list are eligible everywhere by design.
    const placement = this.placements.get(placementId) || {
      id: placementId,
      allowedAdTypes: Object.values(AD_TYPES),
    };

    const eligibleAds = Array.from(this.ads.values()).filter(ad => {
      if (ad.enabled === false) return false;
      if (Array.isArray(ad.placementIds) && ad.placementIds.length > 0 && !ad.placementIds.includes(placementId)) return false;
      if (Array.isArray(placement.allowedAdTypes) && placement.allowedAdTypes.length > 0 && !placement.allowedAdTypes.includes(ad.type)) return false;
      if (ad.startDate && new Date() < new Date(ad.startDate)) return false;
      if (ad.endDate && new Date() > new Date(ad.endDate)) return false;

      const freqCheck = this.frequencyEngine.checkCap(ad.id, context);
      if (!freqCheck.allowed) return false;

      if (!this.scheduler.isCampaignActive({ ...ad, status: 'active' })) return false;
      if (!this.scheduler.shouldDeliver({ ...ad, status: 'active' })) return false;

      if (ad.targeting && ad.targeting.length > 0) {
        const result = this.targetingEngine.evaluate(ad, context);
        if (!result.match) return false;
      }

      return true;
    });

    return eligibleAds;
  }

  getNextAd(placementId, context = {}) {
    const ads = this.getAdsForPlacement(placementId, context);
    this.rotationEngine.setAds(ads);
    return this.rotationEngine.getNext(context);
  }

  async trackImpression(adId, placementId, data = {}) {
    const ad = this.ads.get(adId);
    if (!ad) return;

    this.frequencyEngine.increment(adId, { placementId, ...data });
    this.scheduler.recordDelivery(ad.campaignId || adId);
    await this.trackingEngine.trackImpression(adId, placementId, data);
  }

  async trackClick(adId, placementId, data = {}) {
    await this.trackingEngine.trackClick(adId, placementId, data);
  }

  async trackViewable(adId, placementId, data = {}) {
    await this.trackingEngine.trackViewable(adId, placementId, data);
  }

  async trackConversion(adId, placementId, data = {}) {
    await this.trackingEngine.trackConversion(adId, placementId, data);
  }

  observeViewability(element, adId, placementId) {
    this.viewabilityTracker.observe(element, adId, placementId, (adId, placementId, ratio) => {
      this.trackViewable(adId, placementId, { viewabilityRatio: ratio });
    });
  }

  unobserveViewability(element) {
    this.viewabilityTracker.unobserve(element);
  }

  getVariant(experimentId, context = {}) {
    return this.abTestingEngine.getVariant(experimentId, context);
  }

  // Best-effort mirror of experiment exposure/conversion counts for the
  // admin report. Never throws; assignment truth stays in localStorage.
  async syncExperiment(payload) {
    try {
      const token = typeof this.abOptions?.getToken === 'function' ? this.abOptions.getToken() : null;
      if (!token) return;
      await fetch(`${this.apiUrl}/experiments/track`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch { /* best effort */ }
  }

  createPlacement(config) {
    const placement = {
      id: config.id || createPlacementId(),
      name: config.name || 'Unnamed Placement',
      type: config.type || AD_PLACEMENTS.IN_FEED,
      size: config.size || { width: '100%', height: 'auto' },
      allowedAdTypes: config.allowedAdTypes || Object.values(AD_TYPES),
      targeting: config.targeting || [],
      frequencyCaps: config.frequencyCaps || [],
      refreshInterval: config.refreshInterval || 0,
      lazyLoad: config.lazyLoad !== false,
      viewabilityThreshold: config.viewabilityThreshold || 0.5,
      createdAt: Date.now(),
    };
    this.placements.set(placement.id, placement);
    return placement;
  }

  getPlacement(placementId) {
    return this.placements.get(placementId);
  }

  getAllPlacements() {
    return Array.from(this.placements.values());
  }

  destroy() {
    this.trackingEngine.destroy();
    this.viewabilityTracker.destroy();
  }
}

let globalAdsService = null;

export function getAdsService(options) {
  if (!globalAdsService) {
    globalAdsService = new AdsService(options);
  }
  return globalAdsService;
}

export function initAdsService(options) {
  globalAdsService = new AdsService(options);
  return globalAdsService;
}

export async function initializeAds(options) {
  const service = getAdsService(options);
  await service.initialize();
  return service;
}

export { trackImpression, trackClick, trackViewable, trackConversion, trackVideoEvent, getTracker };