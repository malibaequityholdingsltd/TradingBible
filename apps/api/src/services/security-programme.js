import { randomUUID } from 'crypto';
import { readFile, writeFile, rename, mkdir, chmod, access } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import {
  SECURITY_ACCEPTANCE_STATUSES,
  SECURITY_ACCEPTANCE_TESTS,
  SECURITY_BUDGET,
  SECURITY_CONTROLS,
  SECURITY_CONTROL_STATUSES,
  SECURITY_DOCUMENTS,
  SECURITY_INCIDENT_SEVERITIES,
  SECURITY_INCIDENT_STATUSES,
  SECURITY_LAYERS,
  SECURITY_NOTES,
  SECURITY_PROGRAMME_PROFILE,
  SECURITY_RISKS,
  SECURITY_RISK_STATUSES,
  SECURITY_ROADMAP,
  SECURITY_ROLES,
  SECURITY_STACK,
  SECURITY_STANDARDS,
  SECURITY_VENDOR_STATUSES,
} from '../data/security-programme.js';

// ─────────────────────────────────────────────────────────────────────────
// Security programme register
//
// The register stores control state, evidence references, risk decisions,
// incident summaries, supplier assessments, training completion and access
// reviews. It must not store credentials, private keys, customer records,
// identity documents or full incident evidence. Put those in a controlled
// location and record the reference here.
// ─────────────────────────────────────────────────────────────────────────

const STORE_PATH = fileURLToPath(new URL('../../storage/security/programme.json', import.meta.url));
const STORE_DIR = dirname(STORE_PATH);
const DOCS_DIR = fileURLToPath(new URL('../../../../docs/security/', import.meta.url));
const MAX_AUDIT = 2500;

const CONTROL_BY_ID = new Map(SECURITY_CONTROLS.map((row) => [row.id, row]));
const ACCEPTANCE_BY_ID = new Map(SECURITY_ACCEPTANCE_TESTS.map((row) => [row.id, row]));
const DOCUMENT_BY_ID = new Map(SECURITY_DOCUMENTS.map((row) => [row.id, row]));

let cache = null;
let queue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value, max = 4000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function dateOnly(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
}

function dateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString();
}

function clampScore(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(1, Math.min(5, number)) : 1;
}

function assertStatus(value, allowed) {
  const status = String(value || '').toLowerCase();
  if (!allowed.includes(status)) {
    const err = new Error(`Unknown status. Use one of: ${allowed.join(', ')}.`);
    err.status = 422;
    throw err;
  }
  return status;
}

function requireText(value, label, max = 500) {
  const text = cleanText(value, max);
  if (!text) {
    const err = new Error(`${label} is required.`);
    err.status = 422;
    throw err;
  }
  return text;
}

function emptyStore() {
  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    controls: Object.fromEntries(SECURITY_CONTROLS.map((row) => [row.id, {
      status: row.status || 'not_started',
      evidence: row.evidence || '',
      note: row.note || '',
      owner: row.owner || '',
      reviewedAt: row.reviewedAt || '',
      nextReview: row.nextReview || '',
      updatedBy: '',
      updatedAt: '',
    }])),
    risks: SECURITY_RISKS.map((row) => ({
      ...row,
      score: clampScore(row.likelihood) * clampScore(row.impact),
      acceptanceReference: '',
      closureEvidence: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: 'programme-seed',
    })),
    incidents: [],
    vendors: [],
    acceptance: Object.fromEntries(SECURITY_ACCEPTANCE_TESTS.map((row) => [row.id, {
      status: 'not_run',
      evidence: '',
      note: '',
      tester: '',
      testedAt: '',
      updatedBy: '',
      updatedAt: '',
    }])),
    training: [],
    accessReviews: [],
    audit: [],
  };
}

function normalizeStore(raw) {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  const merged = {
    ...base,
    ...raw,
    controls: { ...base.controls, ...(raw.controls && typeof raw.controls === 'object' ? raw.controls : {}) },
    acceptance: { ...base.acceptance, ...(raw.acceptance && typeof raw.acceptance === 'object' ? raw.acceptance : {}) },
    risks: Array.isArray(raw.risks) ? raw.risks : base.risks,
    incidents: Array.isArray(raw.incidents) ? raw.incidents : [],
    vendors: Array.isArray(raw.vendors) ? raw.vendors : [],
    training: Array.isArray(raw.training) ? raw.training : [],
    accessReviews: Array.isArray(raw.accessReviews) ? raw.accessReviews : [],
    audit: Array.isArray(raw.audit) ? raw.audit : [],
  };
  for (const control of SECURITY_CONTROLS) {
    if (!merged.controls[control.id]) merged.controls[control.id] = base.controls[control.id];
  }
  for (const test of SECURITY_ACCEPTANCE_TESTS) {
    if (!merged.acceptance[test.id]) merged.acceptance[test.id] = base.acceptance[test.id];
  }
  return merged;
}

async function ensureDir() {
  await mkdir(STORE_DIR, { recursive: true, mode: 0o700 });
  await chmod(STORE_DIR, 0o700).catch(() => {});
}

async function persist(store) {
  await ensureDir();
  store.updatedAt = nowIso();
  const temp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await chmod(temp, 0o600).catch(() => {});
  await rename(temp, STORE_PATH);
  await chmod(STORE_PATH, 0o600).catch(() => {});
  cache = store;
}

async function loadStore() {
  if (cache) return cache;
  await ensureDir();
  try {
    const text = await readFile(STORE_PATH, 'utf8');
    cache = normalizeStore(JSON.parse(text));
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      logger.warn('[security] register read failed; starting a new controlled register', String(err?.message || err));
    }
    cache = emptyStore();
    await persist(cache);
  }
  return cache;
}

function withStore(mutator) {
  const run = queue.then(async () => {
    const store = await loadStore();
    const result = await mutator(store);
    if (store.audit.length > MAX_AUDIT) store.audit = store.audit.slice(-MAX_AUDIT);
    await persist(store);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

function auditEntry(actor, action, target, detail = '') {
  return {
    id: randomUUID(),
    at: nowIso(),
    actor: cleanText(actor || 'admin', 200) || 'admin',
    action,
    target: String(target || ''),
    detail: cleanText(detail, 1000),
  };
}

function controlView(row, state) {
  return {
    ...row,
    status: state?.status || row.status || 'not_started',
    evidence: state?.evidence || '',
    note: state?.note || '',
    owner: state?.owner || row.owner || '',
    reviewedAt: state?.reviewedAt || '',
    nextReview: state?.nextReview || '',
    updatedBy: state?.updatedBy || '',
    updatedAt: state?.updatedAt || '',
  };
}

function isComplete(status) {
  return status === 'implemented' || status === 'verified' || status === 'not_applicable';
}

function isVerified(status) {
  return status === 'verified';
}

function layerStats(controls) {
  return SECURITY_LAYERS.map((layer) => {
    const rows = controls.filter((row) => row.layerId === layer.id);
    const complete = rows.filter((row) => isComplete(row.status)).length;
    const verified = rows.filter((row) => isVerified(row.status)).length;
    const critical = rows.filter((row) => row.launchCritical);
    return {
      ...layer,
      total: rows.length,
      complete,
      verified,
      critical: critical.length,
      criticalComplete: critical.filter((row) => isComplete(row.status)).length,
      notStarted: rows.filter((row) => row.status === 'not_started').length,
      blocked: rows.filter((row) => row.status === 'blocked').length,
    };
  });
}

function statusCounts(rows, statuses) {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}

function riskCounts(risks) {
  const open = risks.filter((row) => row.status !== 'closed');
  return {
    total: risks.length,
    open: open.length,
    critical: open.filter((row) => Number(row.score) >= 20).length,
    high: open.filter((row) => Number(row.score) >= 12 && Number(row.score) < 20).length,
    medium: open.filter((row) => Number(row.score) >= 6 && Number(row.score) < 12).length,
    low: open.filter((row) => Number(row.score) < 6).length,
    accepted: open.filter((row) => row.status === 'accepted').length,
  };
}

function documentAvailability() {
  return SECURITY_DOCUMENTS.map((doc) => ({ ...doc, available: false }));
}

async function documentsWithAvailability() {
  const rows = [];
  for (const doc of documentAvailability()) {
    try {
      await access(resolve(DOCS_DIR, doc.file));
      rows.push({ ...doc, available: true });
    } catch {
      rows.push(doc);
    }
  }
  return rows;
}

export async function getSecurityOverview() {
  const store = await loadStore();
  const controls = SECURITY_CONTROLS.map((row) => controlView(row, store.controls[row.id]));
  const acceptance = SECURITY_ACCEPTANCE_TESTS.map((row) => ({
    ...row,
    ...store.acceptance[row.id],
    controls: row.controls,
  }));
  const counts = {
    controls: {
      total: controls.length,
      ...statusCounts(controls, SECURITY_CONTROL_STATUSES),
      complete: controls.filter((row) => isComplete(row.status)).length,
      verified: controls.filter((row) => isVerified(row.status)).length,
      critical: controls.filter((row) => row.launchCritical).length,
      criticalComplete: controls.filter((row) => row.launchCritical && isComplete(row.status)).length,
      readiness: controls.length ? Math.round((controls.filter((row) => isComplete(row.status)).length / controls.length) * 100) : 0,
    },
    risks: riskCounts(store.risks),
    incidents: {
      total: store.incidents.length,
      open: store.incidents.filter((row) => row.status !== 'closed').length,
      sev1: store.incidents.filter((row) => row.status !== 'closed' && row.severity === 'sev1').length,
      sev2: store.incidents.filter((row) => row.status !== 'closed' && row.severity === 'sev2').length,
    },
    vendors: {
      total: store.vendors.length,
      assessed: store.vendors.filter((row) => row.assessmentStatus === 'approved' || row.assessmentStatus === 'rejected').length,
      approved: store.vendors.filter((row) => row.assessmentStatus === 'approved').length,
      critical: store.vendors.filter((row) => row.criticality === 'critical').length,
    },
    acceptance: {
      total: acceptance.length,
      passed: acceptance.filter((row) => row.status === 'passed').length,
      failed: acceptance.filter((row) => row.status === 'failed').length,
      blocked: acceptance.filter((row) => row.status === 'blocked').length,
      notRun: acceptance.filter((row) => row.status === 'not_run').length,
    },
  };
  const documents = await documentsWithAvailability();
  return {
    profile: SECURITY_PROGRAMME_PROFILE,
    notes: SECURITY_NOTES,
    layers: layerStats(controls),
    controls,
    counts,
    criticalGaps: controls
      .filter((row) => row.launchCritical && !isComplete(row.status))
      .sort((a, b) => (a.priority === b.priority ? a.title.localeCompare(b.title) : a.priority === 'critical' ? -1 : 1)),
    risks: [...store.risks].sort((a, b) => Number(b.score) - Number(a.score)),
    incidents: [...store.incidents].sort((a, b) => String(b.detectedAt).localeCompare(String(a.detectedAt))),
    vendors: [...store.vendors].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    acceptance,
    training: [...store.training].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))),
    accessReviews: [...store.accessReviews].sort((a, b) => String(b.reviewDate).localeCompare(String(a.reviewDate))),
    standards: SECURITY_STANDARDS,
    stack: SECURITY_STACK,
    budget: SECURITY_BUDGET,
    roles: SECURITY_ROLES,
    roadmap: SECURITY_ROADMAP,
    documents,
    audit: [...store.audit].reverse().slice(0, 100),
    updatedAt: store.updatedAt,
    generatedAt: nowIso(),
  };
}

export async function updateSecurityControl(id, patch, actor = 'admin') {
  const control = CONTROL_BY_ID.get(String(id));
  if (!control) {
    const err = new Error('Security control not found.');
    err.status = 404;
    throw err;
  }
  const status = assertStatus(patch?.status, SECURITY_CONTROL_STATUSES);
  const evidence = cleanMultiline(patch?.evidence, 2000);
  const note = cleanMultiline(patch?.note, 3000);
  if ((status === 'implemented' || status === 'verified') && evidence.length < 8) {
    const err = new Error('An implemented or verified control requires a real evidence reference. Describe the document, test, configuration export or system location.');
    err.status = 422;
    throw err;
  }
  if (status === 'not_applicable' && note.length < 8) {
    const err = new Error('A not-applicable control requires an explanatory note and an approval reference.');
    err.status = 422;
    throw err;
  }
  if (status === 'verified' && evidence.length < 8) {
    const err = new Error('Verified status requires dated test evidence, not only a configuration claim.');
    err.status = 422;
    throw err;
  }
  return withStore(async (store) => {
    const previous = store.controls[id] || {};
    const next = {
      status,
      evidence,
      note,
      owner: cleanText(patch?.owner || previous.owner || control.owner, 240),
      reviewedAt: dateOnly(patch?.reviewedAt) || (status === 'verified' ? today() : previous.reviewedAt || ''),
      nextReview: dateOnly(patch?.nextReview) || previous.nextReview || '',
      updatedBy: cleanText(actor, 200),
      updatedAt: nowIso(),
    };
    store.controls[id] = next;
    store.audit.push(auditEntry(actor, 'control.update', id, `${previous.status || 'unknown'} → ${status}${evidence ? ` · evidence: ${evidence}` : ''}`));
    return { ok: true, control: controlView(control, next) };
  });
}

export async function createSecurityRisk(input, actor = 'admin') {
  const likelihood = clampScore(input?.likelihood);
  const impact = clampScore(input?.impact);
  const status = input?.status ? assertStatus(input.status, SECURITY_RISK_STATUSES) : 'open';
  if (status === 'accepted') {
    if (!cleanText(input?.acceptanceReference, 500) || !dateOnly(input?.nextReview)) {
      const err = new Error('An accepted risk requires an acceptance reference and a review date.');
      err.status = 422;
      throw err;
    }
  }
  return withStore(async (store) => {
    const row = {
      id: `risk-${randomUUID().slice(0, 8)}`,
      title: requireText(input?.title, 'Risk title', 240),
      description: cleanMultiline(input?.description, 4000),
      category: cleanText(input?.category || 'Uncategorised', 120),
      likelihood,
      impact,
      score: likelihood * impact,
      owner: cleanText(input?.owner, 240),
      treatment: cleanMultiline(input?.treatment, 3000),
      relatedControls: Array.isArray(input?.relatedControls)
        ? input.relatedControls.map((value) => cleanText(value, 120)).filter((value) => CONTROL_BY_ID.has(value))
        : [],
      status,
      acceptanceReference: cleanText(input?.acceptanceReference, 500),
      closureEvidence: cleanText(input?.closureEvidence, 500),
      nextReview: dateOnly(input?.nextReview),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.risks.push(row);
    store.audit.push(auditEntry(actor, 'risk.create', row.id, row.title));
    return { ok: true, risk: row };
  });
}

export async function updateSecurityRisk(id, patch, actor = 'admin') {
  return withStore(async (store) => {
    const row = store.risks.find((item) => item.id === id);
    if (!row) {
      const err = new Error('Risk not found.');
      err.status = 404;
      throw err;
    }
    const status = patch?.status ? assertStatus(patch.status, SECURITY_RISK_STATUSES) : row.status;
    const acceptanceReference = cleanText(patch?.acceptanceReference ?? row.acceptanceReference, 500);
    const closureEvidence = cleanText(patch?.closureEvidence ?? row.closureEvidence, 500);
    if (status === 'accepted' && (!acceptanceReference || !cleanText(patch?.nextReview ?? row.nextReview, 20))) {
      const err = new Error('An accepted risk requires an acceptance reference and a review date.');
      err.status = 422;
      throw err;
    }
    if (status === 'closed' && !closureEvidence) {
      const err = new Error('A closed risk requires closure evidence.');
      err.status = 422;
      throw err;
    }
    const likelihood = patch?.likelihood !== undefined ? clampScore(patch.likelihood) : Number(row.likelihood);
    const impact = patch?.impact !== undefined ? clampScore(patch.impact) : Number(row.impact);
    Object.assign(row, {
      title: patch?.title !== undefined ? requireText(patch.title, 'Risk title', 240) : row.title,
      description: patch?.description !== undefined ? cleanMultiline(patch.description, 4000) : row.description,
      category: patch?.category !== undefined ? cleanText(patch.category, 120) : row.category,
      likelihood,
      impact,
      score: likelihood * impact,
      owner: patch?.owner !== undefined ? cleanText(patch.owner, 240) : row.owner,
      treatment: patch?.treatment !== undefined ? cleanMultiline(patch.treatment, 3000) : row.treatment,
      relatedControls: Array.isArray(patch?.relatedControls)
        ? patch.relatedControls.map((value) => cleanText(value, 120)).filter((value) => CONTROL_BY_ID.has(value))
        : row.relatedControls,
      status,
      acceptanceReference,
      closureEvidence,
      nextReview: patch?.nextReview !== undefined ? dateOnly(patch.nextReview) : row.nextReview,
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    });
    store.audit.push(auditEntry(actor, 'risk.update', row.id, `${row.title} · ${status}`));
    return { ok: true, risk: row };
  });
}

export async function createSecurityIncident(input, actor = 'admin') {
  const severity = assertStatus(input?.severity, SECURITY_INCIDENT_SEVERITIES);
  const customerDataAffected = ['unknown', 'no', 'yes'].includes(String(input?.customerDataAffected || 'unknown'))
    ? String(input?.customerDataAffected || 'unknown')
    : 'unknown';
  return withStore(async (store) => {
    const row = {
      id: `inc-${randomUUID().slice(0, 8)}`,
      title: requireText(input?.title, 'Incident title', 240),
      severity,
      status: 'open',
      detectedAt: dateTime(input?.detectedAt) || nowIso(),
      containedAt: '',
      resolvedAt: '',
      systems: cleanText(input?.systems, 1000),
      customerDataAffected,
      notificationAssessment: cleanMultiline(input?.notificationAssessment, 3000),
      evidenceReference: cleanText(input?.evidenceReference, 1000),
      lessons: cleanMultiline(input?.lessons, 3000),
      owner: cleanText(input?.owner || actor, 240),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.incidents.push(row);
    store.audit.push(auditEntry(actor, 'incident.create', row.id, `${row.severity} · ${row.title}`));
    return { ok: true, incident: row };
  });
}

export async function updateSecurityIncident(id, patch, actor = 'admin') {
  return withStore(async (store) => {
    const row = store.incidents.find((item) => item.id === id);
    if (!row) {
      const err = new Error('Incident not found.');
      err.status = 404;
      throw err;
    }
    const status = patch?.status ? assertStatus(patch.status, SECURITY_INCIDENT_STATUSES) : row.status;
    const resolvedAt = dateTime(patch?.resolvedAt ?? row.resolvedAt);
    const evidenceReference = cleanText(patch?.evidenceReference ?? row.evidenceReference, 1000);
    const lessons = cleanMultiline(patch?.lessons ?? row.lessons, 3000);
    if (status === 'closed' && (!resolvedAt || !evidenceReference || !lessons)) {
      const err = new Error('Closing an incident requires a resolution time, an evidence reference and recorded lessons.');
      err.status = 422;
      throw err;
    }
    if (status === 'contained' && !dateTime(patch?.containedAt ?? row.containedAt)) {
      const err = new Error('A contained incident requires a containment time.');
      err.status = 422;
      throw err;
    }
    Object.assign(row, {
      title: patch?.title !== undefined ? requireText(patch.title, 'Incident title', 240) : row.title,
      severity: patch?.severity !== undefined ? assertStatus(patch.severity, SECURITY_INCIDENT_SEVERITIES) : row.severity,
      status,
      detectedAt: patch?.detectedAt !== undefined ? (dateTime(patch.detectedAt) || row.detectedAt) : row.detectedAt,
      containedAt: patch?.containedAt !== undefined ? dateTime(patch.containedAt) : row.containedAt,
      resolvedAt,
      systems: patch?.systems !== undefined ? cleanText(patch.systems, 1000) : row.systems,
      customerDataAffected: patch?.customerDataAffected !== undefined
        ? (['unknown', 'no', 'yes'].includes(String(patch.customerDataAffected)) ? String(patch.customerDataAffected) : row.customerDataAffected)
        : row.customerDataAffected,
      notificationAssessment: patch?.notificationAssessment !== undefined ? cleanMultiline(patch.notificationAssessment, 3000) : row.notificationAssessment,
      evidenceReference,
      lessons,
      owner: patch?.owner !== undefined ? cleanText(patch.owner, 240) : row.owner,
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    });
    store.audit.push(auditEntry(actor, 'incident.update', row.id, `${row.severity} · ${status}`));
    return { ok: true, incident: row };
  });
}

export async function createSecurityVendor(input, actor = 'admin') {
  const criticality = ['critical', 'high', 'medium', 'low'].includes(String(input?.criticality || 'medium')) ? String(input?.criticality || 'medium') : 'medium';
  const relationship = ['current', 'proposed', 'former'].includes(String(input?.relationship || 'current')) ? String(input?.relationship || 'current') : 'current';
  return withStore(async (store) => {
    const row = {
      id: `vendor-${randomUUID().slice(0, 8)}`,
      name: requireText(input?.name, 'Vendor name', 240),
      purpose: cleanText(input?.purpose, 1000),
      criticality,
      relationship,
      dataCategories: cleanText(input?.dataCategories, 1000),
      mfa: cleanText(input?.mfa, 200),
      encryption: cleanText(input?.encryption, 200),
      certificationEvidence: cleanText(input?.certificationEvidence, 1000),
      dpaStatus: cleanText(input?.dpaStatus, 500),
      incidentNotification: cleanText(input?.incidentNotification, 500),
      assessmentStatus: 'not_assessed',
      assessmentReference: '',
      reviewDate: dateOnly(input?.reviewDate),
      notes: cleanMultiline(input?.notes, 3000),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.vendors.push(row);
    store.audit.push(auditEntry(actor, 'vendor.create', row.id, row.name));
    return { ok: true, vendor: row };
  });
}

export async function updateSecurityVendor(id, patch, actor = 'admin') {
  return withStore(async (store) => {
    const row = store.vendors.find((item) => item.id === id);
    if (!row) {
      const err = new Error('Vendor not found.');
      err.status = 404;
      throw err;
    }
    const assessmentStatus = patch?.assessmentStatus !== undefined
      ? assertStatus(patch.assessmentStatus, SECURITY_VENDOR_STATUSES)
      : row.assessmentStatus;
    const assessmentReference = cleanText(patch?.assessmentReference ?? row.assessmentReference, 1000);
    if (assessmentStatus === 'approved' && !assessmentReference) {
      const err = new Error('Vendor approval requires a dated assessment reference. A product badge is not sufficient evidence.');
      err.status = 422;
      throw err;
    }
    if (assessmentStatus === 'rejected' && !cleanText(patch?.notes ?? row.notes, 3000)) {
      const err = new Error('A rejected vendor requires a reason in the notes.');
      err.status = 422;
      throw err;
    }
    Object.assign(row, {
      name: patch?.name !== undefined ? requireText(patch.name, 'Vendor name', 240) : row.name,
      purpose: patch?.purpose !== undefined ? cleanText(patch.purpose, 1000) : row.purpose,
      criticality: patch?.criticality !== undefined ? (['critical', 'high', 'medium', 'low'].includes(String(patch.criticality)) ? String(patch.criticality) : row.criticality) : row.criticality,
      relationship: patch?.relationship !== undefined ? (['current', 'proposed', 'former'].includes(String(patch.relationship)) ? String(patch.relationship) : row.relationship) : row.relationship,
      dataCategories: patch?.dataCategories !== undefined ? cleanText(patch.dataCategories, 1000) : row.dataCategories,
      mfa: patch?.mfa !== undefined ? cleanText(patch.mfa, 200) : row.mfa,
      encryption: patch?.encryption !== undefined ? cleanText(patch.encryption, 200) : row.encryption,
      certificationEvidence: patch?.certificationEvidence !== undefined ? cleanText(patch.certificationEvidence, 1000) : row.certificationEvidence,
      dpaStatus: patch?.dpaStatus !== undefined ? cleanText(patch.dpaStatus, 500) : row.dpaStatus,
      incidentNotification: patch?.incidentNotification !== undefined ? cleanText(patch.incidentNotification, 500) : row.incidentNotification,
      assessmentStatus,
      assessmentReference,
      reviewDate: patch?.reviewDate !== undefined ? dateOnly(patch.reviewDate) : row.reviewDate,
      notes: patch?.notes !== undefined ? cleanMultiline(patch.notes, 3000) : row.notes,
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    });
    store.audit.push(auditEntry(actor, 'vendor.update', row.id, `${row.name} · ${assessmentStatus}`));
    return { ok: true, vendor: row };
  });
}

export async function updateSecurityAcceptance(id, patch, actor = 'admin') {
  const test = ACCEPTANCE_BY_ID.get(String(id));
  if (!test) {
    const err = new Error('Acceptance test not found.');
    err.status = 404;
    throw err;
  }
  const status = assertStatus(patch?.status, SECURITY_ACCEPTANCE_STATUSES);
  const evidence = cleanMultiline(patch?.evidence, 2000);
  const note = cleanMultiline(patch?.note, 3000);
  if ((status === 'passed' || status === 'failed') && evidence.length < 8) {
    const err = new Error('A passed or failed test requires a real evidence reference.');
    err.status = 422;
    throw err;
  }
  if ((status === 'blocked' || status === 'not_applicable') && note.length < 8) {
    const err = new Error('A blocked or not-applicable test requires an explanatory note.');
    err.status = 422;
    throw err;
  }
  return withStore(async (store) => {
    const previous = store.acceptance[id] || {};
    const next = {
      status,
      evidence,
      note,
      tester: cleanText(patch?.tester || previous.tester, 240),
      testedAt: status === 'passed' || status === 'failed' ? (dateTime(patch?.testedAt) || nowIso()) : (dateTime(patch?.testedAt) || previous.testedAt || ''),
      updatedBy: cleanText(actor, 200),
      updatedAt: nowIso(),
    };
    store.acceptance[id] = next;
    store.audit.push(auditEntry(actor, 'acceptance.update', id, `${previous.status || 'not_run'} → ${status}`));
    return { ok: true, acceptance: { ...test, ...next } };
  });
}

export async function createSecurityTraining(input, actor = 'admin') {
  const person = cleanText(input?.person, 240);
  const team = cleanText(input?.team, 240);
  if (!person && !team) {
    const err = new Error('A training record needs a person or team.');
    err.status = 422;
    throw err;
  }
  return withStore(async (store) => {
    const row = {
      id: `training-${randomUUID().slice(0, 8)}`,
      person,
      team,
      module: requireText(input?.module, 'Training module', 240),
      completedAt: dateTime(input?.completedAt) || nowIso(),
      evidence: requireText(input?.evidence, 'Training evidence reference', 1000),
      status: input?.status === 'not_completed' ? 'not_completed' : 'completed',
      notes: cleanMultiline(input?.notes, 2000),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.training.push(row);
    store.audit.push(auditEntry(actor, 'training.create', row.id, `${row.module} · ${person || team}`));
    return { ok: true, training: row };
  });
}

export async function createAccessReview(input, actor = 'admin') {
  const status = input?.status === 'complete' ? 'complete' : 'planned';
  const findings = cleanMultiline(input?.findings, 3000);
  const evidence = cleanText(input?.evidence, 1000);
  if (status === 'complete' && (!findings || !evidence)) {
    const err = new Error('A completed access review requires findings and evidence.');
    err.status = 422;
    throw err;
  }
  return withStore(async (store) => {
    const row = {
      id: `access-${randomUUID().slice(0, 8)}`,
      scope: requireText(input?.scope, 'Review scope', 500),
      reviewer: requireText(input?.reviewer, 'Reviewer', 240),
      reviewDate: dateOnly(input?.reviewDate) || today(),
      status,
      findings,
      evidence,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.accessReviews.push(row);
    store.audit.push(auditEntry(actor, 'access_review.create', row.id, `${row.scope} · ${status}`));
    return { ok: true, accessReview: row };
  });
}

export async function getSecurityAudit() {
  const store = await loadStore();
  return [...store.audit].reverse();
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function getSecurityRegisterCsv() {
  const data = await getSecurityOverview();
  const lines = [];
  lines.push('TradingBible Holdings, Inc. — Security and resilience register');
  lines.push(`Generated,${csvCell(data.generatedAt)}`);
  lines.push(`Framework,${csvCell(data.profile.framework)}`);
  lines.push(`Boundary,${csvCell(data.profile.certificationBoundary)}`);
  lines.push('');
  lines.push('Section,ID,Title,Layer,Priority,Status,Owner,Evidence,Next review,Note');
  for (const row of data.controls) {
    lines.push([
      'Control', row.id, row.title, row.layerId, row.priority, row.status, row.owner, row.evidence, row.nextReview, row.note,
    ].map(csvCell).join(','));
  }
  for (const row of data.risks) {
    lines.push([
      'Risk', row.id, row.title, row.category, `L${row.likelihood}/I${row.impact}=${row.score}`, row.status, row.owner, row.treatment, row.nextReview, row.description,
    ].map(csvCell).join(','));
  }
  for (const row of data.incidents) {
    lines.push([
      'Incident', row.id, row.title, row.severity, row.status, row.detectedAt, row.owner, row.evidenceReference, row.containedAt, row.lessons,
    ].map(csvCell).join(','));
  }
  for (const row of data.vendors) {
    lines.push([
      'Vendor', row.id, row.name, row.criticality, row.assessmentStatus, row.relationship, row.purpose, row.assessmentReference, row.reviewDate, row.certificationEvidence,
    ].map(csvCell).join(','));
  }
  for (const row of data.acceptance) {
    lines.push([
      'Acceptance test', row.id, row.title, '', row.status, row.tester, row.evidence, row.testedAt, row.expected, row.note,
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function securityDocumentFor(id) {
  const doc = DOCUMENT_BY_ID.get(String(id || ''));
  if (!doc) return null;
  return { ...doc, path: resolve(DOCS_DIR, doc.file) };
}

export function securityDocumentManifest() {
  return SECURITY_DOCUMENTS.map((doc) => ({ ...doc, available: false }));
}

export { STORE_PATH as SECURITY_STORE_PATH, DOCS_DIR as SECURITY_DOCS_DIR };
