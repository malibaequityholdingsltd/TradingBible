import { TARGETING_TYPES } from './types.js';

export class TargetingEngine {
  constructor() {
    this.rules = [];
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  removeRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  clearRules() {
    this.rules = [];
  }

  evaluate(ad, context) {
    if (!ad.targeting || ad.targeting.length === 0) {
      return { match: true, score: 1, matchedRules: [] };
    }

    let score = 0;
    const matchedRules = [];
    let requiredMatches = 0;
    let requiredTotal = 0;

    for (const rule of ad.targeting) {
      const result = this.evaluateRule(rule, context);
      if (result.match) {
        score += rule.weight || 1;
        matchedRules.push({ ruleId: rule.id, type: rule.type, score: rule.weight || 1 });
      }
      if (rule.required) {
        requiredTotal++;
        if (result.match) requiredMatches++;
      }
    }

    const allRequiredMet = requiredTotal === 0 || requiredMatches === requiredTotal;
    const match = allRequiredMet && score > 0;

    return { match, score, matchedRules, allRequiredMet };
  }

  evaluateRule(rule, context) {
    switch (rule.type) {
      case TARGETING_TYPES.USER_SEGMENT:
        return this.evaluateUserSegment(rule, context);
      case TARGETING_TYPES.GEO:
        return this.evaluateGeo(rule, context);
      case TARGETING_TYPES.DEVICE:
        return this.evaluateDevice(rule, context);
      case TARGETING_TYPES.BROWSER:
        return this.evaluateBrowser(rule, context);
      case TARGETING_TYPES.TIME:
        return this.evaluateTime(rule, context);
      case TARGETING_TYPES.RETARGETING:
        return this.evaluateRetargeting(rule, context);
      case TARGETING_TYPES.FREQUENCY:
        return this.evaluateFrequency(rule, context);
      case TARGETING_TYPES.CONTEXTUAL:
        return this.evaluateContextual(rule, context);
      default:
        return { match: true };
    }
  }

  evaluateUserSegment(rule, context) {
    if (!context.user) return { match: false };
    const userSegments = context.user.segments || [];
    const plan = context.user.plan || 'free';
    const values = rule.values || [];

    if (values.includes('*')) return { match: true };

    if (values.includes(plan)) return { match: true };

    for (const segment of values) {
      if (userSegments.includes(segment)) return { match: true };
    }

    return { match: false };
  }

  evaluateGeo(rule, context) {
    if (!context.geo) return { match: false };
    const values = rule.values || [];
    const country = context.geo.country?.toUpperCase();
    const region = context.geo.region?.toUpperCase();
    const city = context.geo.city?.toLowerCase();

    if (values.includes('*')) return { match: true };

    for (const value of values) {
      const v = value.toUpperCase();
      if (country && country === v) return { match: true };
      if (region && region === v) return { match: true };
      if (city && city === value.toLowerCase()) return { match: true };
    }

    return { match: false };
  }

  evaluateDevice(rule, context) {
    if (!context.device) return { match: false };
    const values = rule.values || [];
    const deviceType = context.device.type?.toLowerCase();

    if (values.includes('*')) return { match: true };
    if (deviceType && values.includes(deviceType)) return { match: true };

    return { match: false };
  }

  evaluateBrowser(rule, context) {
    if (!context.browser) return { match: false };
    const values = rule.values || [];
    const browserName = context.browser.name?.toLowerCase();

    if (values.includes('*')) return { match: true };
    if (browserName && values.some(v => browserName.includes(v.toLowerCase()))) return { match: true };

    return { match: false };
  }

  evaluateTime(rule, context) {
    const now = context.time || new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const values = rule.values || [];

    if (values.includes('*')) return { match: true };

    for (const value of values) {
      if (value.startsWith('hour:')) {
        const [, range] = value.split(':');
        const [start, end] = range.split('-').map(Number);
        if (hour >= start && hour < end) return { match: true };
      }
      if (value.startsWith('dow:')) {
        const [, days] = value.split(':');
        const dayList = days.split(',').map(Number);
        if (dayList.includes(dayOfWeek)) return { match: true };
      }
    }

    return { match: false };
  }

  evaluateRetargeting(rule, context) {
    if (!context.user || !context.user.retargeting) return { match: false };
    const values = rule.values || [];
    const userRetargeting = context.user.retargeting;

    for (const value of values) {
      if (userRetargeting[value]) return { match: true };
    }

    return { match: false };
  }

  evaluateFrequency(rule, context) {
    if (!context.frequency) return { match: true };
    const values = rule.values || [];
    const freq = context.frequency;

    for (const value of values) {
      const [capType, max] = value.split(':');
      const current = freq[capType] || 0;
      if (current < Number(max)) return { match: true };
    }

    return { match: false };
  }

  evaluateContextual(rule, context) {
    if (!context.page) return { match: false };
    const values = rule.values || [];
    const pageUrl = context.page.url?.toLowerCase() || '';
    const pageCategory = context.page.category?.toLowerCase() || '';
    const pageTags = context.page.tags || [];

    for (const value of values) {
      if (pageUrl.includes(value.toLowerCase())) return { match: true };
      if (pageCategory === value.toLowerCase()) return { match: true };
      if (pageTags.some(t => t.toLowerCase() === value.toLowerCase())) return { match: true };
    }

    return { match: false };
  }
}

export function createTargetingRule(type, values, options = {}) {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    values: Array.isArray(values) ? values : [values],
    weight: options.weight || 1,
    required: options.required || false,
    operator: options.operator || 'in',
  };
}

export function createUserSegmentRule(segments, options = {}) {
  return createTargetingRule(TARGETING_TYPES.USER_SEGMENT, segments, options);
}

export function createGeoRule(locations, options = {}) {
  return createTargetingRule(TARGETING_TYPES.GEO, locations, options);
}

export function createDeviceRule(devices, options = {}) {
  return createTargetingRule(TARGETING_TYPES.DEVICE, devices, options);
}

export function createTimeRule(timeRanges, options = {}) {
  return createTargetingRule(TARGETING_TYPES.TIME, timeRanges, options);
}

export function createRetargetingRule(segments, options = {}) {
  return createTargetingRule(TARGETING_TYPES.RETARGETING, segments, options);
}

export function createFrequencyRule(caps, options = {}) {
  return createTargetingRule(TARGETING_TYPES.FREQUENCY, caps, options);
}

export function createContextualRule(keywords, options = {}) {
  return createTargetingRule(TARGETING_TYPES.CONTEXTUAL, keywords, options);
}