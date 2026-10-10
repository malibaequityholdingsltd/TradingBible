import { describe, it, expect } from 'vitest';
import { FrequencyCapEngine } from './frequency.js';
import { FREQUENCY_CAP_TYPES } from './types.js';

function memStore() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
  };
}

describe('FrequencyCapEngine', () => {
  it('allows then blocks at the cap', () => {
    const e = new FrequencyCapEngine({
      storage: memStore(),
      caps: [{ id: 'c1', type: FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY, max: 2 }],
    });
    const ctx = { userId: 'u1', sessionId: 's1' };
    expect(e.checkCap('ad1', ctx).allowed).toBe(true);
    e.increment('ad1', ctx);
    expect(e.checkCap('ad1', ctx).allowed).toBe(true);
    e.increment('ad1', ctx);
    const blocked = e.checkCap('ad1', ctx);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('scopes caps per user', () => {
    const e = new FrequencyCapEngine({
      storage: memStore(),
      caps: [{ id: 'c1', type: FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY, max: 1 }],
    });
    e.increment('ad1', { userId: 'u1', sessionId: 's1' });
    expect(e.checkCap('ad1', { userId: 'u1', sessionId: 's1' }).allowed).toBe(false);
    expect(e.checkCap('ad1', { userId: 'u2', sessionId: 's1' }).allowed).toBe(true);
  });

  it('scopes caps to the matching ad only', () => {
    const e = new FrequencyCapEngine({
      storage: memStore(),
      caps: [{ id: 'c1', type: FREQUENCY_CAP_TYPES.IMPRESSIONS_PER_DAY, max: 1, adId: 'ad1' }],
    });
    e.increment('ad1', { userId: 'u1', sessionId: 's1' });
    expect(e.checkCap('ad1', { userId: 'u1', sessionId: 's1' }).allowed).toBe(false);
    expect(e.checkCap('ad2', { userId: 'u1', sessionId: 's1' }).allowed).toBe(true);
  });
});
