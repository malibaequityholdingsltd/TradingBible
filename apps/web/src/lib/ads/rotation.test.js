import { describe, it, expect } from 'vitest';
import { RotationEngine } from './rotation.js';
import { ROTATION_ALGORITHMS } from './types.js';

const ADS = [
  { id: 'a', weight: 1, priority: 1 },
  { id: 'b', weight: 1, priority: 5 },
  { id: 'c', weight: 8, priority: 0 },
];

describe('RotationEngine', () => {
  it('round-robins in order', () => {
    const r = new RotationEngine(ROTATION_ALGORITHMS.ROUND_ROBIN);
    r.setAds(ADS);
    expect(r.getNext().id).toBe('a');
    expect(r.getNext().id).toBe('b');
    expect(r.getNext().id).toBe('c');
    expect(r.getNext().id).toBe('a');
  });

  it('serves highest priority first', () => {
    const r = new RotationEngine(ROTATION_ALGORITHMS.PRIORITY);
    r.setAds(ADS);
    expect(r.getNext().id).toBe('b');
  });

  it('weights selection toward heavy ads over many draws', () => {
    const r = new RotationEngine(ROTATION_ALGORITHMS.WEIGHTED);
    r.setAds(ADS);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 1000; i++) counts[r.getNext().id]++;
    expect(counts.c).toBeGreaterThan(counts.a);
    expect(counts.c).toBeGreaterThan(counts.b);
  });

  it('returns null with no ads', () => {
    const r = new RotationEngine(ROTATION_ALGORITHMS.ROUND_ROBIN);
    r.setAds([]);
    expect(r.getNext()).toBeNull();
  });
});
