import { EXPERIMENT_STATUS, EXPERIMENT_ASSIGNMENT_METHODS } from './types.js';

// Storage suffix for per-variant exposure (trial) counts. Kept out of the
// metric namespace so exposure counters never collide with metric names.
const EXPOSURE_SUFFIX = '__exposures';

export class ABTestingEngine {
  constructor(options = {}) {
    this.experiments = new Map();
    this.assignments = new Map();
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.storageKey = 'tb:ab-assignments';
    // Optional server sync: (payload) => Promise. Assignment stays
    // client-side in localStorage; exposures/conversions are mirrored
    // best-effort so the admin report aggregates across devices.
    this.sync = typeof options.sync === 'function' ? options.sync : null;
    this.loadAssignments();
  }

  syncEvent(payload) {
    if (!this.sync) return;
    try {
      const out = this.sync(payload);
      if (out && typeof out.catch === 'function') out.catch(() => {});
    } catch { /* best effort */ }
  }

  loadAssignments() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        for (const [key, value] of Object.entries(data)) {
          this.assignments.set(key, value);
        }
      }
    } catch {
      // Ignore
    }
  }

  saveAssignments() {
    if (!this.storage) return;
    try {
      const data = Object.fromEntries(this.assignments);
      this.storage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }

  createExperiment(config) {
    const experiment = {
      id: config.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: config.name || 'Unnamed Experiment',
      description: config.description || '',
      status: config.status || EXPERIMENT_STATUS.DRAFT,
      variants: config.variants || [],
      trafficAllocation: config.trafficAllocation || 100,
      assignmentMethod: config.assignmentMethod || EXPERIMENT_ASSIGNMENT_METHODS.HASH_USER_ID,
      targeting: config.targeting || [],
      startDate: config.startDate || null,
      endDate: config.endDate || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metrics: config.metrics || [],
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  getExperiment(id) {
    return this.experiments.get(id);
  }

  getAllExperiments() {
    return Array.from(this.experiments.values());
  }

  updateExperiment(id, updates) {
    const experiment = this.experiments.get(id);
    if (!experiment) return null;

    Object.assign(experiment, updates, { updatedAt: Date.now() });
    this.experiments.set(id, experiment);
    return experiment;
  }

  deleteExperiment(id) {
    this.experiments.delete(id);
  }

  getVariant(experimentId, context = {}) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    if (experiment.status !== EXPERIMENT_STATUS.RUNNING) return null;

    if (!this.isExperimentActive(experiment)) return null;
    if (!this.matchesTargeting(experiment, context)) return null;

    const assignmentKey = `${experimentId}:${this.getAssignmentKey(experiment, context)}`;
    let assignment = this.assignments.get(assignmentKey);

    if (assignment) {
      const variant = experiment.variants.find(v => v.id === assignment.variantId);
      if (variant) return variant;
    }

    assignment = this.assignVariant(experiment, context);
    this.assignments.set(assignmentKey, assignment);
    this.saveAssignments();

    const variant = experiment.variants.find(v => v.id === assignment.variantId);
    return variant;
  }

  getAssignmentKey(experiment, context) {
    switch (experiment.assignmentMethod) {
      case EXPERIMENT_ASSIGNMENT_METHODS.HASH_USER_ID:
        return context.userId || this.getAnonymousId();
      case EXPERIMENT_ASSIGNMENT_METHODS.HASH_SESSION_ID:
        return context.sessionId || this.getSessionId();
      case EXPERIMENT_ASSIGNMENT_METHODS.RANDOM:
        return `random_${Math.random()}`;
      case EXPERIMENT_ASSIGNMENT_METHODS.CONDITIONAL:
        return context.conditionKey || 'default';
      default:
        return context.userId || this.getAnonymousId();
    }
  }

  getAnonymousId() {
    if (!this.storage) return `anon_${Math.random()}`;
    let id = this.storage.getItem('tb:anon-id');
    if (!id) {
      id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      this.storage.setItem('tb:anon-id', id);
    }
    return id;
  }

  getSessionId() {
    if (typeof sessionStorage !== 'undefined') {
      let id = sessionStorage.getItem('tb:session-id');
      if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        sessionStorage.setItem('tb:session-id', id);
      }
      return id;
    }
    return `sess_${Math.random()}`;
  }

  assignVariant(experiment, context) {
    const eligibleVariants = experiment.variants.filter(v => v.enabled !== false);
    if (eligibleVariants.length === 0) return { variantId: null };

    const totalWeight = eligibleVariants.reduce((sum, v) => sum + (v.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const variant of eligibleVariants) {
      random -= (variant.weight || 1);
      if (random <= 0) {
        return { variantId: variant.id, assignedAt: Date.now() };
      }
    }

    return { variantId: eligibleVariants[eligibleVariants.length - 1].id, assignedAt: Date.now() };
  }

  isExperimentActive(experiment) {
    const now = Date.now();
    if (experiment.startDate && now < experiment.startDate) return false;
    if (experiment.endDate && now > experiment.endDate) return false;
    return true;
  }

  matchesTargeting(experiment, context) {
    if (!experiment.targeting || experiment.targeting.length === 0) return true;

    for (const rule of experiment.targeting) {
      const engine = new TargetingEngine();
      const result = engine.evaluate({ targeting: [rule] }, context);
      if (!result.match) return false;
    }
    return true;
  }

  trackConversion(experimentId, variantId, metric, value = 1) {
    const key = `${experimentId}:${variantId}:${metric}`;
    const current = this.getMetric(key);
    this.setMetric(key, current + value);
    this.syncEvent({ experimentId, variantId, event: 'conversion', metric, value });
  }

  // Record that a variant was shown (an exposure / trial). Conversion-rate
  // significance testing needs both conversions AND exposures per variant;
  // call this when the variant is actually rendered.
  trackExposure(experimentId, variantId, value = 1) {
    const key = `${experimentId}:${variantId}:${EXPOSURE_SUFFIX}`;
    const current = this.getMetric(key);
    this.setMetric(key, current + value);
    this.syncEvent({ experimentId, variantId, event: 'exposure', value });
  }

  getExposure(experimentId, variantId) {
    return this.getMetric(`${experimentId}:${variantId}:${EXPOSURE_SUFFIX}`);
  }

  getMetric(key) {
    if (!this.storage) return 0;
    try {
      const raw = this.storage.getItem(`tb:ab-metric:${key}`);
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  }

  setMetric(key, value) {
    if (!this.storage) return;
    try {
      this.storage.setItem(`tb:ab-metric:${key}`, String(value));
    } catch {
      // Ignore
    }
  }

  getResults(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const results = {};
    for (const variant of experiment.variants) {
      results[variant.id] = {
        variant,
        metrics: {},
        exposures: this.getExposure(experimentId, variant.id),
      };
      for (const metric of experiment.metrics) {
        const key = `${experimentId}:${variant.id}:${metric}`;
        results[variant.id].metrics[metric] = this.getMetric(key);
      }
    }

    return {
      experiment,
      results,
      significance: this.calculateSignificance(experiment, results),
    };
  }

  calculateSignificance(experiment, results) {
    if (experiment.variants.length < 2) return null;

    const [control, ...variants] = experiment.variants;
    const controlData = results[control.id];
    if (!controlData) return null;

    const significance = {};
    for (const variant of variants) {
      const variantData = results[variant.id];
      if (!variantData) continue;

      for (const metric of experiment.metrics) {
        const controlValue = Math.max(0, controlData.metrics[metric] || 0);
        const variantValue = Math.max(0, variantData.metrics[metric] || 0);

        if (controlValue === 0 && variantValue === 0) continue;

        const n1 = Math.max(0, Math.round(controlData.exposures || 0));
        const n2 = Math.max(0, Math.round(variantData.exposures || 0));

        const test = n1 > 0 && n2 > 0
          ? this.twoProportionTest(controlValue, n1, variantValue, n2)
          : this.binomialCountTest(controlValue, variantValue);

        significance[`${variant.id}.${metric}`] = {
          pValue: test.pValue,
          significant: test.pValue < 0.05,
          lift: test.lift,
          method: test.method,
          controlRate: test.controlRate ?? null,
          variantRate: test.variantRate ?? null,
          exposures: [n1, n2],
        };
      }
    }

    return significance;
  }

  // Two-sample pooled z-test for proportions. x1/x2 are conversion counts,
  // n1/n2 are exposure counts (must be > 0). Counts are clamped to exposures
  // so a mis-instrumented caller can never produce rates above 1.
  twoProportionTest(x1, n1, x2, n2) {
    const c1 = Math.min(x1, n1);
    const c2 = Math.min(x2, n2);
    const p1 = c1 / n1;
    const p2 = c2 / n2;
    const pooled = (c1 + c2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    // se === 0 means both arms are all-convert or all-not: no evidence either way.
    const pValue = se === 0 ? 1 : 2 * (1 - this.normalCDF(Math.abs((p1 - p2) / se)));
    return {
      pValue,
      lift: p1 > 0 ? ((p2 - p1) / p1) * 100 : (p2 > 0 ? Infinity : 0),
      method: 'two_proportion_z',
      controlRate: p1,
      variantRate: p2,
    };
  }

  // Fallback when exposures were never tracked: conditional binomial test on
  // raw counts. Under H0 (equal rates AND equal exposure) variant conversions
  // out of the total are Binomial(total, 0.5). Exact for small totals,
  // normal approximation with continuity correction above EXACT_LIMIT.
  binomialCountTest(controlValue, variantValue) {
    const c = Math.round(controlValue);
    const v = Math.round(variantValue);
    const total = c + v;
    if (total === 0) return { pValue: 1, lift: 0, method: 'binomial_counts' };

    let pValue;
    if (total <= 200) {
      // Exact two-sided: sum P(X=i) for outcomes no likelier than observed.
      let pmf = Math.pow(0.5, total);
      const probs = [pmf];
      for (let i = 0; i < total; i++) {
        pmf = (pmf * (total - i)) / (i + 1);
        probs.push(pmf);
      }
      const observed = probs[v];
      pValue = Math.min(1, probs.reduce((sum, p) => (p <= observed + 1e-12 ? sum + p : sum), 0));
    } else {
      const mean = total / 2;
      const sd = Math.sqrt(total / 4);
      const z = (Math.abs(v - mean) - 0.5) / sd;
      pValue = 2 * (1 - this.normalCDF(Math.max(0, z)));
    }

    return {
      pValue,
      lift: c > 0 ? ((v - c) / c) * 100 : (v > 0 ? Infinity : 0),
      method: 'binomial_counts',
    };
  }

  // Back-compat wrapper: compares two raw counts assuming equal exposure.
  // Prefer twoProportionTest with real exposure counts when available.
  calculatePValue(control, variant) {
    return this.binomialCountTest(control, variant).pValue;
  }

  normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * x);
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return 1 - prob;
  }

  resetAssignment(experimentId, context = {}) {
    const key = `${experimentId}:${this.getAssignmentKey(this.experiments.get(experimentId), context)}`;
    this.assignments.delete(key);
    this.saveAssignments();
  }
}

import { TargetingEngine } from './targeting.js';

export function createABTestingEngine(options) {
  return new ABTestingEngine(options);
}

export function createExperiment(config) {
  const engine = new ABTestingEngine();
  return engine.createExperiment(config);
}

export function createVariant(id, name, config = {}) {
  return {
    id,
    name,
    weight: config.weight || 1,
    enabled: config.enabled !== false,
    payload: config.payload || {},
    description: config.description || '',
  };
}