import { describe, it, expect } from 'vitest';
import { ABTestingEngine } from './abtesting.js';

function memStore() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
  };
}

describe('ABTestingEngine statistics', () => {
  it('detects a strong effect with the two-proportion z-test', () => {
    const e = new ABTestingEngine({ storage: memStore() });
    const r = e.twoProportionTest(100, 1000, 150, 1000);
    expect(r.method).toBe('two_proportion_z');
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.controlRate).toBeCloseTo(0.1);
    expect(r.variantRate).toBeCloseTo(0.15);
  });

  it('does not flag noise as significant', () => {
    const e = new ABTestingEngine({ storage: memStore() });
    const r = e.twoProportionTest(100, 1000, 102, 1000);
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it('falls back to the binomial count test without exposures', () => {
    const e = new ABTestingEngine({ storage: memStore() });
    expect(e.binomialCountTest(10, 30).pValue).toBeLessThan(0.05);
    expect(e.binomialCountTest(20, 22).pValue).toBeGreaterThan(0.05);
  });

  it('keeps the legacy calculatePValue signature working', () => {
    const e = new ABTestingEngine({ storage: memStore() });
    expect(e.calculatePValue(10, 30)).toBeLessThan(0.05);
    expect(e.calculatePValue(0, 0)).toBe(1);
  });

  it('runs the full track → results flow with exposures', () => {
    const e = new ABTestingEngine({ storage: memStore() });
    e.createExperiment({ id: 'x', status: 'running', metrics: ['conv'], variants: [{ id: 'a' }, { id: 'b' }] });
    e.trackExposure('x', 'a', 1000);
    e.trackExposure('x', 'b', 1000);
    for (let i = 0; i < 100; i++) e.trackConversion('x', 'a', 'conv');
    for (let i = 0; i < 150; i++) e.trackConversion('x', 'b', 'conv');
    const out = e.getResults('x');
    expect(out.results.a.exposures).toBe(1000);
    expect(out.significance['b.conv'].significant).toBe(true);
    expect(out.significance['b.conv'].method).toBe('two_proportion_z');
  });
});
