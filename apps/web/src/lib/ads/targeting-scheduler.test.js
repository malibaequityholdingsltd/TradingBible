import { describe, it, expect } from 'vitest';
import { TargetingEngine, createUserSegmentRule, createGeoRule } from './targeting.js';
import { AdScheduler } from './scheduler.js';

describe('TargetingEngine', () => {
  it('matches everything with no rules', () => {
    const e = new TargetingEngine();
    expect(e.evaluate({ targeting: [] }, {}).match).toBe(true);
  });

  it('matches user plan segments', () => {
    const e = new TargetingEngine();
    const rule = createUserSegmentRule(['pro']);
    expect(e.evaluate({ targeting: [rule] }, { user: { plan: 'pro', segments: [] } }).match).toBe(true);
    expect(e.evaluate({ targeting: [rule] }, { user: { plan: 'free', segments: [] } }).match).toBe(false);
  });

  it('matches geo rules case-insensitively', () => {
    const e = new TargetingEngine();
    const rule = createGeoRule(['US']);
    expect(e.evaluate({ targeting: [rule] }, { geo: { country: 'us' } }).match).toBe(true);
    expect(e.evaluate({ targeting: [rule] }, { geo: { country: 'DE' } }).match).toBe(false);
  });

  it('fails closed on required-rule misses', () => {
    const e = new TargetingEngine();
    const rule = createUserSegmentRule(['elite'], { required: true });
    expect(e.evaluate({ targeting: [rule] }, { user: { plan: 'pro', segments: [] } }).match).toBe(false);
  });
});

describe('AdScheduler', () => {
  it('rejects inactive campaigns', () => {
    const s = new AdScheduler();
    expect(s.isCampaignActive({ id: 'c', status: 'paused' })).toBe(false);
    expect(s.isCampaignActive({ id: 'c', status: 'active' })).toBe(true);
  });

  it('respects date windows', () => {
    const s = new AdScheduler();
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(s.isCampaignActive({ id: 'c', status: 'active', endDate: past })).toBe(false);
    expect(s.isCampaignActive({ id: 'c', status: 'active', startDate: future })).toBe(false);
    expect(s.isCampaignActive({ id: 'c', status: 'active', startDate: past, endDate: future })).toBe(true);
  });
});
