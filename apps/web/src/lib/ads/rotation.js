import { ROTATION_ALGORITHMS } from './types.js';

export class RotationEngine {
  constructor(algorithm = ROTATION_ALGORITHMS.WEIGHTED) {
    this.algorithm = algorithm;
    this.ads = [];
    this.index = 0;
    this.weights = new Map();
    this.history = [];
    this.maxHistory = 100;
  }

  setAlgorithm(algorithm) {
    this.algorithm = algorithm;
  }

  setAds(ads) {
    this.ads = ads.filter(ad => ad.enabled !== false);
    this.index = 0;
    this.calculateWeights();
  }

  addAd(ad) {
    if (ad.enabled !== false) {
      this.ads.push(ad);
      this.calculateWeights();
    }
  }

  removeAd(adId) {
    this.ads = this.ads.filter(ad => ad.id !== adId);
    this.weights.delete(adId);
  }

  calculateWeights() {
    this.weights.clear();
    let totalWeight = 0;

    for (const ad of this.ads) {
      const weight = ad.weight || ad.priority || 1;
      this.weights.set(ad.id, weight);
      totalWeight += weight;
    }

    for (const [id, weight] of this.weights) {
      this.weights.set(id, weight / totalWeight);
    }
  }

  getNext(context = {}) {
    if (this.ads.length === 0) return null;

    switch (this.algorithm) {
      case ROTATION_ALGORITHMS.WEIGHTED:
        return this.weightedRandom(context);
      case ROTATION_ALGORITHMS.ROUND_ROBIN:
        return this.roundRobin();
      case ROTATION_ALGORITHMS.PRIORITY:
        return this.priorityFirst();
      case ROTATION_ALGORITHMS.EVEN_PACING:
        return this.evenPacing(context);
      case ROTATION_ALGORITHMS.OPTIMIZE_CTR:
        return this.optimizeCtr();
      case ROTATION_ALGORITHMS.OPTIMIZE_REVENUE:
        return this.optimizeRevenue();
      default:
        return this.weightedRandom(context);
    }
  }

  weightedRandom(context) {
    const eligible = this.getEligibleAds(context);
    if (eligible.length === 0) return null;

    let random = Math.random();
    for (const ad of eligible) {
      const weight = this.weights.get(ad.id) || (1 / eligible.length);
      random -= weight;
      if (random <= 0) {
        this.recordSelection(ad.id);
        return ad;
      }
    }
    const ad = eligible[eligible.length - 1];
    this.recordSelection(ad.id);
    return ad;
  }

  roundRobin() {
    const ad = this.ads[this.index % this.ads.length];
    this.index = (this.index + 1) % this.ads.length;
    this.recordSelection(ad.id);
    return ad;
  }

  priorityFirst() {
    const sorted = [...this.ads].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const ad = sorted[0];
    this.recordSelection(ad.id);
    return ad;
  }

  evenPacing(context) {
    const eligible = this.getEligibleAds(context);
    if (eligible.length === 0) return null;

    const now = Date.now();
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    const dayProgress = (now - dayStart) / (24 * 60 * 60 * 1000);

    let bestAd = null;
    let bestScore = -1;

    for (const ad of eligible) {
      const impressions = this.getImpressionsToday(ad.id);
      const targetImpressions = ad.dailyCap || 1000;
      const expectedImpressions = targetImpressions * dayProgress;
      const paceScore = expectedImpressions > 0 ? impressions / expectedImpressions : 0;

      if (paceScore < bestScore || bestScore === -1) {
        bestScore = paceScore;
        bestAd = ad;
      }
    }

    if (bestAd) this.recordSelection(bestAd.id);
    return bestAd;
  }

  optimizeCtr() {
    const eligible = this.ads.filter(ad => ad.ctr !== undefined);
    if (eligible.length === 0) return this.weightedRandom({});

    const sorted = eligible.sort((a, b) => (b.ctr || 0) - (a.ctr || 0));
    const ad = sorted[0];
    this.recordSelection(ad.id);
    return ad;
  }

  optimizeRevenue() {
    const eligible = this.ads.filter(ad => ad.ecpm !== undefined);
    if (eligible.length === 0) return this.weightedRandom({});

    const sorted = eligible.sort((a, b) => (b.ecpm || 0) - (a.ecpm || 0));
    const ad = sorted[0];
    this.recordSelection(ad.id);
    return ad;
  }

  getEligibleAds(context) {
    return this.ads.filter(ad => {
      if (ad.targeting && ad.targeting.length > 0) {
        const engine = new TargetingEngine();
        const result = engine.evaluate(ad, context);
        return result.match;
      }
      return true;
    });
  }

  recordSelection(adId) {
    this.history.push({ adId, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getImpressionsToday(adId) {
    const dayStart = new Date().setHours(0, 0, 0, 0);
    return this.history.filter(h => h.adId === adId && h.timestamp >= dayStart).length;
  }

  getHistory() {
    return [...this.history];
  }

  getStats() {
    const counts = {};
    for (const h of this.history) {
      counts[h.adId] = (counts[h.adId] || 0) + 1;
    }
    return {
      totalSelections: this.history.length,
      byAd: counts,
      adsCount: this.ads.length,
    };
  }
}

import { TargetingEngine } from './targeting.js';

export function createRotationEngine(algorithm) {
  return new RotationEngine(algorithm);
}