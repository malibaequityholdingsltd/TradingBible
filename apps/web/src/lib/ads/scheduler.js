export class AdScheduler {
  constructor(options = {}) {
    this.campaigns = new Map();
    this.timezone = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  addCampaign(campaign) {
    this.campaigns.set(campaign.id, campaign);
  }

  removeCampaign(campaignId) {
    this.campaigns.delete(campaignId);
  }

  getCampaign(campaignId) {
    return this.campaigns.get(campaignId);
  }

  getActiveCampaigns(now = new Date()) {
    const active = [];
    for (const campaign of this.campaigns.values()) {
      if (this.isCampaignActive(campaign, now)) {
        active.push(campaign);
      }
    }
    return active;
  }

  isCampaignActive(campaign, now = new Date()) {
    if (campaign.status !== 'active') return false;
    if (campaign.startDate && now < new Date(campaign.startDate)) return false;
    if (campaign.endDate && now > new Date(campaign.endDate)) return false;
    if (!this.matchesDayparting(campaign, now)) return false;
    return true;
  }

  matchesDayparting(campaign, now) {
    if (!campaign.dayparting || campaign.dayparting.length === 0) return true;

    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    for (const dp of campaign.dayparting) {
      if (dp.days && !dp.days.includes(dayOfWeek)) continue;
      if (dp.hours) {
        const [start, end] = dp.hours.split('-').map(Number);
        if (hour >= start && hour < end) return true;
      } else {
        return true;
      }
    }

    return false;
  }

  getPacing(campaign, now = new Date()) {
    if (!campaign.pacing) return { enabled: false };

    const start = campaign.startDate ? new Date(campaign.startDate) : now;
    const end = campaign.endDate ? new Date(campaign.endDate) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const totalDuration = end - start;
    const elapsed = now - start;
    const progress = Math.max(0, Math.min(1, elapsed / totalDuration));

    const totalBudget = campaign.budget || campaign.impressions || 1000;
    const delivered = campaign.delivered || 0;
    const expected = totalBudget * progress;

    return {
      enabled: true,
      progress,
      totalBudget,
      delivered,
      expected,
      ahead: delivered > expected,
      pace: expected > 0 ? delivered / expected : 1,
      dailyCap: campaign.dailyCap || null,
      hourlyCap: campaign.hourlyCap || null,
    };
  }

  shouldDeliver(campaign, now = new Date()) {
    if (!this.isCampaignActive(campaign, now)) return false;

    const pacing = this.getPacing(campaign, now);
    if (!pacing.enabled) return true;

    if (pacing.dailyCap) {
      const todayStart = new Date(now).setHours(0, 0, 0, 0);
      const todayDelivered = campaign.dailyDelivered?.[todayStart] || 0;
      if (todayDelivered >= pacing.dailyCap) return false;
    }

    if (pacing.hourlyCap) {
      const hourStart = new Date(now).setMinutes(0, 0, 0);
      const hourDelivered = campaign.hourlyDelivered?.[hourStart] || 0;
      if (hourDelivered >= pacing.hourlyCap) return false;
    }

    if (pacing.ahead && campaign.pacingAlgorithm === 'even') {
      return Math.random() < (1 / pacing.pace);
    }

    return true;
  }

  recordDelivery(campaignId, count = 1, now = new Date()) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    campaign.delivered = (campaign.delivered || 0) + count;

    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    campaign.dailyDelivered = campaign.dailyDelivered || {};
    campaign.dailyDelivered[todayStart] = (campaign.dailyDelivered[todayStart] || 0) + count;

    const hourStart = new Date(now).setMinutes(0, 0, 0);
    campaign.hourlyDelivered = campaign.hourlyDelivered || {};
    campaign.hourlyDelivered[hourStart] = (campaign.hourlyDelivered[hourStart] || 0) + count;

    this.cleanupOldDeliveryData(campaign, now);
  }

  cleanupOldDeliveryData(campaign, now) {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    if (campaign.dailyDelivered) {
      for (const key of Object.keys(campaign.dailyDelivered)) {
        if (Number(key) < cutoff) delete campaign.dailyDelivered[key];
      }
    }

    if (campaign.hourlyDelivered) {
      for (const key of Object.keys(campaign.hourlyDelivered)) {
        if (Number(key) < cutoff) delete campaign.hourlyDelivered[key];
      }
    }
  }

  getUpcomingCampaigns(limit = 10, now = new Date()) {
    const upcoming = [];
    for (const campaign of this.campaigns.values()) {
      if (campaign.status !== 'active') continue;
      if (campaign.startDate && now < new Date(campaign.startDate)) {
        upcoming.push({ campaign, startsAt: campaign.startDate });
      }
    }
    return upcoming.sort((a, b) => a.startsAt - b.startsAt).slice(0, limit);
  }
}

export function createScheduler(options) {
  return new AdScheduler(options);
}

export function createCampaign(config) {
  return {
    id: config.id || `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: config.name || 'Unnamed Campaign',
    status: config.status || 'draft',
    startDate: config.startDate || null,
    endDate: config.endDate || null,
    budget: config.budget || null,
    impressions: config.impressions || null,
    dailyCap: config.dailyCap || null,
    hourlyCap: config.hourlyCap || null,
    pacing: config.pacing !== false,
    pacingAlgorithm: config.pacingAlgorithm || 'even',
    dayparting: config.dayparting || [],
    targeting: config.targeting || [],
    ads: config.ads || [],
    delivered: 0,
    dailyDelivered: {},
    hourlyDelivered: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createDaypartingRule(days, hours) {
  return { days, hours };
}

export const DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const COMMON_DAYPARTS = {
  MORNING: { hours: '6-12' },
  AFTERNOON: { hours: '12-18' },
  EVENING: { hours: '18-24' },
  NIGHT: { hours: '0-6' },
  BUSINESS_HOURS: { hours: '9-17', days: [1, 2, 3, 4, 5] },
  WEEKEND: { days: [0, 6] },
  WEEKDAY: { days: [1, 2, 3, 4, 5] },
  PRIME_TIME: { hours: '19-23' },
  LATE_NIGHT: { hours: '23-6' },
};