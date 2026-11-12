import { randomUUID } from 'crypto';
import { readFile, writeFile, rename, mkdir, chmod } from 'fs/promises';
import { dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { mergeStaffCard, staffCardFromApplication } from '../utils/staffCard.js';
import {
  BENEFIT_TIERS,
  DEPARTMENTS,
  EMPLOYEE_ITEMS,
  EMPLOYEE_ITEM_STATUSES,
  EMPLOYER_ITEMS,
  EMPLOYER_ITEM_STATUSES,
  JURISDICTIONS,
  LAUNCH_CHECKLIST,
  OFFBOARDING_ITEMS,
  ONBOARDING_ITEMS,
  POLICY_DOCUMENTS,
  POLICY_STATUSES,
  RECORD_CATEGORIES,
  WORKFORCE_CADENCE,
  WORKFORCE_POLICY_NOTES,
  WORKFORCE_PROFILE,
} from '../data/workforce-compliance.js';

// ─────────────────────────────────────────────────────────────────────────
// Workforce compliance register
//
// This service stores evidence references and adoption decisions. It does not
// store identity documents, medical records, bank details or tax identifiers.
// Those belong in the controlled HR file, outside this register.
// ─────────────────────────────────────────────────────────────────────────

const STORE_PATH = fileURLToPath(new URL('../../storage/workforce/compliance.json', import.meta.url));
const STORE_DIR = dirname(STORE_PATH);
const DOCS_DIR = fileURLToPath(new URL('../../storage/hr-documents/', import.meta.url));
const MAX_AUDIT = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMPLOYER_BY_ID = new Map(EMPLOYER_ITEMS.map((row) => [row.id, row]));
const EMPLOYEE_BY_ID = new Map(EMPLOYEE_ITEMS.map((row) => [row.id, row]));
const ONBOARDING_BY_ID = new Map(ONBOARDING_ITEMS.map((row) => [row.id, row]));
const OFFBOARDING_BY_ID = new Map(OFFBOARDING_ITEMS.map((row) => [row.id, row]));
const POLICY_BY_ID = new Map(POLICY_DOCUMENTS.map((row) => [row.id, row]));

let cache = null;
let queue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMultiline(value, max = 2000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 240);
}

function dateOnly(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
}

function emptyStore() {
  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    employer: {},
    employees: {},
    policies: {},
    audit: [],
  };
}

function normalizeStore(raw) {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    employer: raw.employer && typeof raw.employer === 'object' ? raw.employer : {},
    employees: raw.employees && typeof raw.employees === 'object' ? raw.employees : {},
    policies: raw.policies && typeof raw.policies === 'object' ? raw.policies : {},
    audit: Array.isArray(raw.audit) ? raw.audit : [],
  };
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
      logger.warn('[workforce] register read failed; starting a new controlled register', String(err?.message || err));
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

function assertStatus(value, allowed) {
  const status = String(value || '').toLowerCase();
  if (!allowed.includes(status)) {
    const err = new Error(`Unknown status. Use one of: ${allowed.join(', ')}.`);
    err.status = 422;
    throw err;
  }
  return status;
}

function normalizeJurisdiction(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america'].includes(text)) return 'US';
  if (['ng', 'nigeria', 'nigerian'].includes(text)) return 'NG';
  if (!text) return 'UNRECORDED';
  return 'OTHER';
}

function jurisdictionLabel(value) {
  if (value === 'US') return 'United States';
  if (value === 'NG') return 'Nigeria';
  if (value === 'OTHER') return 'Other country';
  return 'Not recorded';
}

function applicableEmployeeItems(jurisdiction) {
  return EMPLOYEE_ITEMS.filter((item) => {
    if (!item.jurisdiction) return true;
    return item.jurisdiction === jurisdiction;
  });
}

function stateFor(store, email) {
  const key = normalizeEmail(email);
  if (!store.employees[key]) {
    store.employees[key] = {
      profile: {},
      items: {},
      onboarding: {},
      offboarding: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }
  return store.employees[key];
}

function itemState(state, id) {
  const row = state?.items?.[id];
  return {
    id,
    status: row?.status || 'not_started',
    reference: row?.reference || '',
    note: row?.note || '',
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy || '',
  };
}

function processState(sectionState, id, catalog) {
  const row = sectionState?.[id];
  return {
    id,
    status: row?.status || 'not_started',
    reference: row?.reference || '',
    note: row?.note || '',
    updatedAt: row?.updatedAt || null,
    updatedBy: row?.updatedBy || '',
    title: catalog?.title || id,
    owner: catalog?.owner || '',
    when: catalog?.when || '',
  };
}

function summarizeEmployee(employee, state) {
  const items = applicableEmployeeItems(employee.jurisdiction).map((item) => itemState(state, item.id));
  const done = items.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length;
  const blocked = items.filter((item) => item.status === 'blocked').length;
  const inProgress = items.filter((item) => item.status === 'in_progress').length;
  const applicable = items.length;
  const complete = applicable > 0 && done === applicable;
  const onboarding = ONBOARDING_ITEMS.map((item) => processState(state?.onboarding, `onboarding.${item.id}`, item));
  const offboarding = OFFBOARDING_ITEMS.map((item) => processState(state?.offboarding, `offboarding.${item.id}`, item));
  return {
    ...employee,
    manager: state?.profile?.manager || '',
    probationEnd: state?.profile?.probationEnd || '',
    employmentType: state?.profile?.employmentType || '',
    workLocation: state?.profile?.workLocation || '',
    hrNotes: state?.profile?.hrNotes || '',
    fileTotal: applicable,
    fileDone: done,
    fileBlocked: blocked,
    fileInProgress: inProgress,
    fileComplete: complete,
    fileStatus: blocked ? 'blocked' : complete ? 'complete' : (done || inProgress ? 'in_progress' : 'not_started'),
    onboardingTotal: onboarding.length,
    onboardingDone: onboarding.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length,
    offboardingTotal: offboarding.length,
    offboardingDone: offboarding.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length,
    missing: items.filter((item) => item.status !== 'complete' && item.status !== 'not_applicable').slice(0, 8).map((item) => EMPLOYEE_BY_ID.get(item.id)?.title || item.id),
    updatedAt: state?.updatedAt || null,
  };
}

async function listEmployees() {
  let apps = [];
  let postings = [];
  let users = [];
  try {
    apps = await supabaseRest('/rest/v1/job_applications', {
      query: {
        select: 'id,name,email,status,jobId,created,checks,compliance',
        status: 'eq.hired',
        order: 'created.asc',
        limit: 500,
      },
    });
  } catch (err) {
    if (!/compliance|column/i.test(String(err?.message || err))) {
      logger.warn('[workforce] employee roster unavailable', String(err?.message || err));
      return [];
    }
    apps = await supabaseRest('/rest/v1/job_applications', {
      query: { select: 'id,name,email,status,jobId,created,checks', status: 'eq.hired', order: 'created.asc', limit: 500 },
    }).catch(() => []);
  }
  const ids = [...new Set((apps || []).map((row) => row.jobId).filter(Boolean))];
  if (ids.length) {
    postings = await supabaseRest('/rest/v1/job_postings', {
      query: {
        select: 'id,title,department,hiring',
        id: `in.(${ids.map((id) => encodeURIComponent(id)).join(',')})`,
        limit: 300,
      },
    }).catch(() => []);
  }
  const emails = [...new Set((apps || []).map((row) => normalizeEmail(row.email)).filter(Boolean))];
  if (emails.length) {
    users = await supabaseRest('/rest/v1/users', {
      query: {
        select: 'id,email,name,user_settings',
        email: `in.(${emails.map((email) => encodeURIComponent(email)).join(',')})`,
        limit: 500,
      },
    }).catch(() => []);
  }
  const userByEmail = Object.fromEntries((users || []).map((user) => [normalizeEmail(user.email), user]));
  const postingById = Object.fromEntries((postings || []).map((posting) => [posting.id, posting]));
  return (apps || []).map((app) => {
    const user = userByEmail[normalizeEmail(app.email)] || {};
    const userStaff = user.user_settings?.staff && typeof user.user_settings.staff === 'object' ? user.user_settings.staff : {};
    const staff = mergeStaffCard(userStaff, staffCardFromApplication(app));
    const compliance = app.compliance && typeof app.compliance === 'object' ? app.compliance : {};
    const posting = postingById[app.jobId] || {};
    const countryRaw = compliance.workCountry || staff.workCountry || '';
    const jurisdiction = normalizeJurisdiction(countryRaw);
    return {
      id: app.id,
      appId: app.id,
      userId: user.id || staff.userId || null,
      name: staff.profileName || user.name || app.name || 'Unnamed employee',
      email: normalizeEmail(app.email),
      title: staff.title || posting.title || 'Opening',
      department: staff.department || posting.department || 'Company',
      employeeId: staff.employeeId || null,
      hiredAt: staff.hiredAt || app.created || null,
      startDate: staff.startDate || compliance.startDate || null,
      salaryTbc: Number(staff.salary_tbc) || Number(posting.hiring?.salary_tbc) || 0,
      salaryFrequency: staff.salary_freq || posting.hiring?.salary_freq || 'monthly',
      workCountry: countryRaw,
      workRegion: compliance.workRegion || staff.workRegion || '',
      arrangement: compliance.arrangement || staff.arrangement || '',
      jurisdiction,
      jurisdictionLabel: jurisdictionLabel(jurisdiction),
      emergencyContact: staff.emergencyContact && typeof staff.emergencyContact === 'object' ? staff.emergencyContact : null,
    };
  });
}

export async function getWorkforceOverview() {
  const store = await loadStore();
  const employeeRows = await listEmployees();
  const employees = employeeRows
    .map((employee) => summarizeEmployee(employee, store.employees[normalizeEmail(employee.email)]))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const employer = EMPLOYER_ITEMS.map((item) => {
    const state = store.employer[item.id] || {};
    return {
      ...item,
      status: state.status || 'not_started',
      evidence: state.evidence || '',
      owner: state.owner || item.owner || '',
      dueDate: state.dueDate || '',
      note: state.note || '',
      updatedAt: state.updatedAt || null,
      updatedBy: state.updatedBy || '',
    };
  });
  const employerById = Object.fromEntries(employer.map((item) => [item.id, item]));
  const launch = LAUNCH_CHECKLIST.map((row) => {
    const target = employerById[row.employerItemId];
    return {
      ...row,
      status: target?.status || 'not_started',
      evidence: target?.evidence || '',
      owner: target?.owner || '',
      updatedAt: target?.updatedAt || null,
    };
  });
  const policies = POLICY_DOCUMENTS.map((doc) => {
    const state = store.policies[doc.id] || {};
    return {
      ...doc,
      status: state.status || 'template',
      adoptedAt: state.adoptedAt || '',
      approvalReference: state.approvalReference || '',
      note: state.note || '',
      updatedAt: state.updatedAt || null,
      updatedBy: state.updatedBy || '',
    };
  });
  const employerCounts = {
    total: employer.length,
    complete: employer.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length,
    inProgress: employer.filter((item) => item.status === 'in_progress').length,
    blocked: employer.filter((item) => item.status === 'blocked').length,
    notStarted: employer.filter((item) => item.status === 'not_started').length,
  };
  const launchCounts = {
    total: launch.length,
    complete: launch.filter((item) => item.status === 'complete' || item.status === 'not_applicable').length,
    blocked: launch.filter((item) => item.status === 'blocked').length,
  };
  const employeeCounts = {
    total: employees.length,
    filesComplete: employees.filter((row) => row.fileComplete).length,
    filesBlocked: employees.filter((row) => row.fileBlocked > 0).length,
    filesInProgress: employees.filter((row) => row.fileStatus === 'in_progress').length,
    filesNotStarted: employees.filter((row) => row.fileStatus === 'not_started').length,
    us: employees.filter((row) => row.jurisdiction === 'US').length,
    ng: employees.filter((row) => row.jurisdiction === 'NG').length,
    other: employees.filter((row) => row.jurisdiction === 'OTHER').length,
    unrecorded: employees.filter((row) => row.jurisdiction === 'UNRECORDED').length,
  };
  const policyCounts = {
    total: policies.length,
    template: policies.filter((row) => row.status === 'template').length,
    inReview: policies.filter((row) => row.status === 'in_review').length,
    adopted: policies.filter((row) => row.status === 'adopted').length,
    notApplicable: policies.filter((row) => row.status === 'not_applicable').length,
  };
  return {
    ok: true,
    profile: WORKFORCE_PROFILE,
    notes: WORKFORCE_POLICY_NOTES,
    counts: {
      employer: employerCounts,
      launch: launchCounts,
      employees: employeeCounts,
      policies: policyCounts,
    },
    employer,
    launch,
    employees,
    policies,
    departments: DEPARTMENTS,
    benefitTiers: BENEFIT_TIERS,
    jurisdictions: JURISDICTIONS,
    cadence: WORKFORCE_CADENCE,
    records: RECORD_CATEGORIES,
    onboarding: ONBOARDING_ITEMS,
    offboarding: OFFBOARDING_ITEMS,
    audit: store.audit.slice(-40).reverse(),
    config: {
      registerPath: 'apps/api/storage/workforce/compliance.json',
      documentsAvailable: await documentsAvailable(),
      documentsDir: 'apps/api/storage/hr-documents',
      employerStatuses: EMPLOYER_ITEM_STATUSES,
      employeeStatuses: EMPLOYEE_ITEM_STATUSES,
      policyStatuses: POLICY_STATUSES,
    },
  };
}

async function documentsAvailable() {
  try {
    const manifest = JSON.parse(await readFile(`${DOCS_DIR}manifest.json`, 'utf8'));
    return Array.isArray(manifest.documents) && manifest.documents.length > 0;
  } catch {
    return false;
  }
}

export async function getEmployeeFile(email) {
  const key = normalizeEmail(email);
  if (!EMAIL_RE.test(key)) {
    const err = new Error('A valid employee email is required.');
    err.status = 422;
    throw err;
  }
  const employees = await listEmployees();
  const employee = employees.find((row) => row.email === key);
  if (!employee) {
    const err = new Error('Employee not found in the hired-employee register.');
    err.status = 404;
    throw err;
  }
  const store = await loadStore();
  const state = stateFor(store, key);
  const applicable = applicableEmployeeItems(employee.jurisdiction);
  const sections = [...new Set(applicable.map((item) => item.sectionId))].map((sectionId) => {
    const rows = applicable.filter((item) => item.sectionId === sectionId);
    return {
      id: sectionId,
      title: rows[0]?.sectionTitle || sectionId,
      items: rows.map((item) => ({
        ...item,
        ...itemState(state, item.id),
      })),
    };
  });
  const onboarding = ONBOARDING_ITEMS.map((item) => processState(state?.onboarding, `onboarding.${item.id}`, item));
  const offboarding = OFFBOARDING_ITEMS.map((item) => processState(state?.offboarding, `offboarding.${item.id}`, item));
  return {
    ok: true,
    employee: summarizeEmployee(employee, state),
    profile: state.profile || {},
    sections,
    onboarding,
    offboarding,
    audit: store.audit.filter((row) => row.target === key).slice(-25).reverse(),
    jurisdiction: employee.jurisdiction,
    jurisdictionLabel: employee.jurisdictionLabel,
    note: employee.jurisdiction === 'OTHER'
      ? 'This employee works outside the United States and Nigeria. Only the global file items are shown. Engage local employment counsel and add jurisdiction-specific requirements before the start date.'
      : '',
  };
}

export async function updateEmployerItem(id, body, actor = 'admin') {
  const target = EMPLOYER_BY_ID.get(String(id || ''));
  if (!target) {
    const err = new Error('Employer compliance item not found.');
    err.status = 404;
    throw err;
  }
  const status = assertStatus(body?.status, EMPLOYER_ITEM_STATUSES);
  return withStore((store) => {
    const current = store.employer[target.id] || {};
    const evidence = body?.evidence !== undefined ? cleanText(body.evidence, 500) : (current.evidence || '');
    const note = body?.note !== undefined ? cleanMultiline(body.note, 1000) : (current.note || '');
    if (status === 'complete' && !evidence) {
      const err = new Error('A complete control needs an evidence reference. Record the document, filing, policy or approval that proves the control exists.');
      err.status = 422;
      throw err;
    }
    if (status === 'not_applicable' && !note) {
      const err = new Error('A not-applicable control needs a note explaining why the obligation does not apply.');
      err.status = 422;
      throw err;
    }
    store.employer[target.id] = {
      ...current,
      status,
      evidence,
      owner: body?.owner !== undefined ? cleanText(body.owner, 160) : (current.owner || target.owner || ''),
      dueDate: body?.dueDate !== undefined ? dateOnly(body.dueDate) : (current.dueDate || ''),
      note,
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.audit.push(auditEntry(actor, 'employer_item_updated', target.id, `${target.title} · ${status}`));
    return { ok: true, item: { ...target, ...store.employer[target.id] } };
  });
}

export async function updatePolicy(id, body, actor = 'admin') {
  const target = POLICY_BY_ID.get(String(id || ''));
  if (!target) {
    const err = new Error('Policy document not found.');
    err.status = 404;
    throw err;
  }
  const status = assertStatus(body?.status, POLICY_STATUSES);
  const adoptedAt = dateOnly(body?.adoptedAt);
  const approvalReference = cleanText(body?.approvalReference, 300);
  if (status === 'adopted' && (!adoptedAt || !approvalReference)) {
    const err = new Error('An adopted policy needs the adoption date and the board, counsel or officer approval reference.');
    err.status = 422;
    throw err;
  }
  return withStore((store) => {
    const current = store.policies[target.id] || {};
    store.policies[target.id] = {
      ...current,
      status,
      adoptedAt: adoptedAt || current.adoptedAt || '',
      approvalReference: approvalReference || current.approvalReference || '',
      note: body?.note !== undefined ? cleanMultiline(body.note, 1000) : (current.note || ''),
      updatedAt: nowIso(),
      updatedBy: cleanText(actor, 200),
    };
    store.audit.push(auditEntry(actor, 'policy_updated', target.id, `${target.title} · ${status}`));
    return { ok: true, policy: { ...target, ...store.policies[target.id] } };
  });
}

export async function updateEmployeeFile(email, body, actor = 'admin') {
  const key = normalizeEmail(email);
  if (!EMAIL_RE.test(key)) {
    const err = new Error('A valid employee email is required.');
    err.status = 422;
    throw err;
  }
  const employees = await listEmployees();
  const employee = employees.find((row) => row.email === key);
  if (!employee) {
    const err = new Error('Employee not found in the hired-employee register.');
    err.status = 404;
    throw err;
  }
  const itemId = body?.itemId ? String(body.itemId) : '';
  const onboardingId = body?.onboardingId ? String(body.onboardingId) : '';
  const offboardingId = body?.offboardingId ? String(body.offboardingId) : '';
  if (itemId && !EMPLOYEE_BY_ID.has(itemId)) {
    const err = new Error('Employee-file item not found.');
    err.status = 404;
    throw err;
  }
  if (itemId) {
    const item = EMPLOYEE_BY_ID.get(itemId);
    if (item.jurisdiction && item.jurisdiction !== employee.jurisdiction) {
      const err = new Error(`This item applies to ${item.jurisdiction} employees, not ${employee.jurisdictionLabel}.`);
      err.status = 422;
      throw err;
    }
  }
  if (onboardingId && !ONBOARDING_BY_ID.has(onboardingId)) {
    const err = new Error('Onboarding item not found.');
    err.status = 404;
    throw err;
  }
  if (offboardingId && !OFFBOARDING_BY_ID.has(offboardingId)) {
    const err = new Error('Offboarding item not found.');
    err.status = 404;
    throw err;
  }
  return withStore((store) => {
    const state = stateFor(store, key);
    const currentRow = itemId
      ? state.items?.[itemId]
      : onboardingId
        ? state.onboarding?.[`onboarding.${onboardingId}`]
        : offboardingId
          ? state.offboarding?.[`offboarding.${offboardingId}`]
          : null;
    const nextReference = body?.reference !== undefined ? cleanText(body.reference, 300) : (currentRow?.reference || '');
    const nextNote = body?.note !== undefined ? cleanMultiline(body.note, 1000) : (currentRow?.note || '');
    if ((itemId || onboardingId || offboardingId) && String(body?.status || '').toLowerCase() === 'complete' && !nextReference) {
      const err = new Error('A complete employee-file item needs an evidence reference. Record the signed document, verification note or file reference.');
      err.status = 422;
      throw err;
    }
    if ((itemId || onboardingId || offboardingId) && String(body?.status || '').toLowerCase() === 'not_applicable' && !nextNote) {
      const err = new Error('A not-applicable employee-file item needs a note explaining why it does not apply.');
      err.status = 422;
      throw err;
    }
    if (body?.profile && typeof body.profile === 'object') {
      state.profile = {
        ...(state.profile || {}),
        manager: body.profile.manager !== undefined ? cleanText(body.profile.manager, 160) : (state.profile?.manager || ''),
        probationEnd: body.profile.probationEnd !== undefined ? dateOnly(body.profile.probationEnd) : (state.profile?.probationEnd || ''),
        employmentType: body.profile.employmentType !== undefined ? cleanText(body.profile.employmentType, 80) : (state.profile?.employmentType || ''),
        workLocation: body.profile.workLocation !== undefined ? cleanText(body.profile.workLocation, 160) : (state.profile?.workLocation || ''),
        hrNotes: body.profile.hrNotes !== undefined ? cleanMultiline(body.profile.hrNotes, 2000) : (state.profile?.hrNotes || ''),
      };
    }
    if (itemId) {
      const status = assertStatus(body?.status, EMPLOYEE_ITEM_STATUSES);
      state.items = state.items || {};
      state.items[itemId] = {
        status,
        reference: body?.reference !== undefined ? cleanText(body.reference, 300) : (state.items[itemId]?.reference || ''),
        note: body?.note !== undefined ? cleanMultiline(body.note, 1000) : (state.items[itemId]?.note || ''),
        updatedAt: nowIso(),
        updatedBy: cleanText(actor, 200),
      };
      store.audit.push(auditEntry(actor, 'employee_file_item_updated', key, `${itemId} · ${status}`));
    }
    if (onboardingId) {
      const status = assertStatus(body?.status, EMPLOYEE_ITEM_STATUSES);
      state.onboarding = state.onboarding || {};
      state.onboarding[`onboarding.${onboardingId}`] = {
        status,
        reference: body?.reference !== undefined ? cleanText(body.reference, 300) : (state.onboarding[`onboarding.${onboardingId}`]?.reference || ''),
        note: body?.note !== undefined ? cleanMultiline(body.note, 1000) : (state.onboarding[`onboarding.${onboardingId}`]?.note || ''),
        updatedAt: nowIso(),
        updatedBy: cleanText(actor, 200),
      };
      store.audit.push(auditEntry(actor, 'onboarding_item_updated', key, `${onboardingId} · ${status}`));
    }
    if (offboardingId) {
      const status = assertStatus(body?.status, EMPLOYEE_ITEM_STATUSES);
      state.offboarding = state.offboarding || {};
      state.offboarding[`offboarding.${offboardingId}`] = {
        status,
        reference: body?.reference !== undefined ? cleanText(body.reference, 300) : (state.offboarding[`offboarding.${offboardingId}`]?.reference || ''),
        note: body?.note !== undefined ? cleanMultiline(body.note, 1000) : (state.offboarding[`offboarding.${offboardingId}`]?.note || ''),
        updatedAt: nowIso(),
        updatedBy: cleanText(actor, 200),
      };
      store.audit.push(auditEntry(actor, 'offboarding_item_updated', key, `${offboardingId} · ${status}`));
    }
    state.updatedAt = nowIso();
    return { ok: true, email: key, profile: state.profile, itemId, onboardingId, offboardingId };
  });
}

export async function getWorkforceRegisterCsv() {
  const store = await loadStore();
  const employees = await listEmployees();
  const header = ['name', 'email', 'employee_id', 'title', 'department', 'jurisdiction', 'work_country', 'work_region', 'arrangement', 'manager', 'file_status', 'file_done', 'file_total', 'file_blocked', 'onboarding_done', 'onboarding_total'];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [header.join(',')];
  for (const employee of employees) {
    const summary = summarizeEmployee(employee, store.employees[normalizeEmail(employee.email)]);
    lines.push([
      summary.name, summary.email, summary.employeeId || '', summary.title, summary.department,
      summary.jurisdictionLabel, summary.workCountry, summary.workRegion, summary.arrangement,
      summary.manager, summary.fileStatus, summary.fileDone, summary.fileTotal, summary.fileBlocked,
      summary.onboardingDone, summary.onboardingTotal,
    ].map(escape).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export async function getWorkforceAudit() {
  const store = await loadStore();
  return store.audit.slice(-200).reverse();
}

export async function getDocumentManifest() {
  try {
    const manifest = JSON.parse(await readFile(`${DOCS_DIR}manifest.json`, 'utf8'));
    return {
      ok: true,
      available: Array.isArray(manifest.documents) && manifest.documents.length > 0,
      ...manifest,
    };
  } catch {
    return {
      ok: true,
      available: false,
      documents: [],
      note: 'Run `node scripts/build-workforce-documents.mjs` to build the controlled document pack.',
    };
  }
}

export function documentPathFor(id, format) {
  const doc = POLICY_BY_ID.get(String(id || ''));
  if (!doc) return null;
  const safeFormat = String(format || '').toLowerCase();
  if (!['docx', 'pdf', 'md'].includes(safeFormat)) return null;
  const base = basename(doc.file, '.md');
  const ext = safeFormat;
  return {
    path: `${DOCS_DIR}${ext}/${base}.${ext}`,
    filename: `${base}.${ext}`,
    title: doc.title,
    format: safeFormat,
  };
}

export { STORE_PATH, DOCS_DIR };
