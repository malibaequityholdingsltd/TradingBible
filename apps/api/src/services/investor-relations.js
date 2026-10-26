import { createHash, randomBytes, randomUUID } from 'crypto';
import { createTransport } from 'nodemailer';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { brandShell, escapeHtml } from '../utils/email-brand.js';

// ─────────────────────────────────────────────────────────────────────────
// TB investor relations data service
//
// The investor API is the only public door into these tables. This service
// deliberately keeps public reads narrow and sensitive reads behind the route
// layer's admin/shareholder checks. It does not mint shares, set a stock price,
// execute transfers or mark an IPO milestone complete without evidence.
// ─────────────────────────────────────────────────────────────────────────

export const TABLES = Object.freeze({
  announcements: 'tb_investor_announcements',
  documents: 'tb_investor_documents',
  financials: 'tb_financial_reports',
  milestones: 'tb_ipo_milestones',
  shareClasses: 'tb_share_classes',
  shareholders: 'tb_shareholders',
  positions: 'tb_share_positions',
  proposals: 'tb_equity_proposals',
  approvals: 'tb_equity_approvals',
  meetings: 'tb_shareholder_meetings',
  voting: 'tb_voting_records',
  subscriptions: 'tb_investor_subscriptions',
  contacts: 'tb_investor_contacts',
  audit: 'tb_equity_audit_events',
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9-]{2,90}$/;
const MAX = 12000;

export const MILESTONE_STATUS = Object.freeze(['not_started', 'in_progress', 'blocked', 'complete']);
export const PROPOSAL_TYPES = Object.freeze(['issuance', 'option_pool', 'transfer', 'conversion', 'dividend', 'split', 'governance', 'other']);
export const PROPOSAL_STATUS = Object.freeze(['draft', 'pending_approval', 'approved', 'rejected', 'executed']);

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim().toLowerCase());
}

export function cleanText(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

export function cleanMultiline(value, max = MAX) {
  return String(value == null ? '' : value).replace(/\r\n/g, '\n').trim().slice(0, max);
}

export function slugify(value, fallback = 'item') {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return SLUG_RE.test(slug) ? slug : `${fallback}-${randomBytes(4).toString('hex')}`;
}

function dateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bool(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      if (value[key] !== undefined) out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stable(value));
}

async function rows(table, query = {}) {
  const result = await supabaseRest(`/rest/v1/${table}`, { query });
  return Array.isArray(result) ? result : [];
}

async function one(table, query = {}) {
  const result = await rows(table, { ...query, limit: 1 });
  return result[0] || null;
}

async function insert(table, body) {
  const result = await supabaseRest(`/rest/v1/${table}`, {
    method: 'POST',
    body,
    prefer: 'return=representation',
  });
  return Array.isArray(result) ? result[0] : result;
}

async function patch(table, idColumn, id, body) {
  const result = await supabaseRest(`/rest/v1/${table}?${idColumn}=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
    prefer: 'return=representation',
  });
  return Array.isArray(result) ? result[0] : null;
}

async function safeRows(label, table, query) {
  try {
    return { rows: await rows(table, query), warning: null };
  } catch (error) {
    logger.warn(`[investor] ${label} unavailable`, String(error?.message || error));
    return { rows: [], warning: `${label} is temporarily unavailable.` };
  }
}

function publicAnnouncement(row) {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    title: row.title,
    summary: row.summary,
    body: row.body,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    isDemo: Boolean(row.is_demo),
  };
}

function publicDocument(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    documentType: row.document_type,
    summary: row.summary,
    url: row.url || null,
    version: row.version,
    checksumSha256: row.checksum_sha256 || null,
    publishedAt: row.published_at,
    isDemo: Boolean(row.is_demo),
  };
}

function publicFinancial(row) {
  return {
    id: row.id,
    periodLabel: row.period_label,
    periodEnd: row.period_end,
    reportType: row.report_type,
    title: row.title,
    auditorStatus: row.auditor_status,
    currency: row.currency,
    revenue: numberOrNull(row.revenue),
    operatingExpenses: numberOrNull(row.operating_expenses),
    netIncome: numberOrNull(row.net_income),
    totalAssets: numberOrNull(row.total_assets),
    totalLiabilities: numberOrNull(row.total_liabilities),
    cashFlowOperating: numberOrNull(row.cash_flow_operating),
    shareholdersEquity: numberOrNull(row.shareholders_equity),
    eps: numberOrNull(row.eps),
    sourceNote: row.source_note || null,
    documentUrl: row.document_url || null,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    isDemo: Boolean(row.is_demo),
  };
}

function publicMilestone(row) {
  return {
    id: row.id,
    slug: row.slug,
    phase: row.phase,
    title: row.title,
    description: row.description,
    status: row.status,
    evidence: row.evidence || null,
    owner: row.owner || null,
    dueDate: row.due_date,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    isDemo: Boolean(row.is_demo),
  };
}

function publicShareClass(row) {
  return {
    id: row.id,
    classCode: row.class_code,
    name: row.name,
    authorizedShares: numberOrNull(row.authorized_shares),
    issuedShares: numberOrNull(row.issued_shares),
    outstandingShares: numberOrNull(row.outstanding_shares),
    treasuryShares: numberOrNull(row.treasury_shares),
    votesPerShare: numberOrNull(row.votes_per_share),
    rights: row.rights || null,
    effectiveDate: row.effective_date,
    approvedAt: row.approved_at,
    isDemo: Boolean(row.is_demo),
  };
}

export async function getPublicOverview() {
  const warnings = [];
  const [announcements, documents, financials, milestones, shareClasses, meetings] = await Promise.all([
    safeRows('Announcements', TABLES.announcements, {
      select: '*', status: 'eq.published', order: 'published_at.desc', limit: 30,
    }),
    safeRows('Document library', TABLES.documents, {
      select: '*', status: 'eq.published', visibility: 'eq.public', order: 'published_at.desc', limit: 60,
    }),
    safeRows('Financial reports', TABLES.financials, {
      select: '*', status: 'eq.published', approved_at: 'not.is.null', order: 'period_end.desc', limit: 30,
    }),
    safeRows('IPO milestones', TABLES.milestones, {
      select: '*', is_public: 'eq.true', order: 'sort_order.asc', limit: 100,
    }),
    safeRows('Share classes', TABLES.shareClasses, {
      select: '*', is_public: 'eq.true', status: 'eq.authorized', order: 'class_code.asc', limit: 20,
    }),
    safeRows('Shareholder meetings', TABLES.meetings, {
      select: '*', is_public: 'eq.true', order: 'meeting_date.desc', limit: 20,
    }),
  ]);

  for (const result of [announcements, documents, financials, milestones, shareClasses, meetings]) {
    if (result.warning) warnings.push(result.warning);
  }

  const publicClasses = shareClasses.rows.map(publicShareClass);
  const publicMilestones = milestones.rows.map(publicMilestone);
  const complete = publicMilestones.filter((m) => m.status === 'complete').length;
  const active = publicMilestones.filter((m) => m.status === 'in_progress').length;
  const blocked = publicMilestones.filter((m) => m.status === 'blocked').length;

  return {
    generatedAt: new Date().toISOString(),
    status: {
      ticker: 'TB',
      tickerStatus: 'Proposed — not reserved or approved',
      exchange: 'Nasdaq',
      exchangeStatus: 'Target only — no listing application or approval',
      listingStatus: 'Pre-IPO — not publicly traded',
      price: 'Not available',
      marketCap: 'Not available',
      volume: 'Not available',
      shareTrading: 'Not active',
      dataLicensing: 'Not active',
      currentEntity: 'TradingBible LLC',
      proposedIssuer: 'TradingBible, Inc.',
    },
    announcements: announcements.rows.map(publicAnnouncement),
    documents: documents.rows.map(publicDocument),
    financials: financials.rows.map(publicFinancial),
    milestones: publicMilestones,
    capital: publicClasses.length ? {
      classes: publicClasses,
      authorizedShares: publicClasses.reduce((sum, row) => sum + (Number(row.authorizedShares) || 0), 0),
      issuedShares: publicClasses.reduce((sum, row) => sum + (Number(row.issuedShares) || 0), 0),
      outstandingShares: publicClasses.reduce((sum, row) => sum + (Number(row.outstandingShares) || 0), 0),
      treasuryShares: publicClasses.reduce((sum, row) => sum + (Number(row.treasuryShares) || 0), 0),
    } : null,
    meetings: meetings.rows.map((row) => ({
      id: row.id,
      title: row.title,
      meetingDate: row.meeting_date,
      recordDate: row.record_date,
      status: row.status,
      noticeUrl: row.notice_url || null,
      details: row.details || null,
    })),
    ipo: {
      total: publicMilestones.length,
      complete,
      inProgress: active,
      blocked,
      notStarted: publicMilestones.filter((m) => m.status === 'not_started').length,
      progressPct: publicMilestones.length ? Math.round((complete / publicMilestones.length) * 100) : 0,
    },
    warnings,
  };
}

function latestBy(rowsList, key = 'created_at') {
  return [...rowsList].sort((a, b) => String(b[key] || '').localeCompare(String(a[key] || '')))[0] || null;
}

export async function getAdminOverview() {
  const warnings = [];
  const names = [
    ['announcements', TABLES.announcements, { select: '*', order: 'created_at.desc', limit: 200 }],
    ['documents', TABLES.documents, { select: '*', order: 'created_at.desc', limit: 200 }],
    ['financials', TABLES.financials, { select: '*', order: 'period_end.desc.nullslast,created_at.desc', limit: 200 }],
    ['milestones', TABLES.milestones, { select: '*', order: 'sort_order.asc', limit: 200 }],
    ['shareClasses', TABLES.shareClasses, { select: '*', order: 'class_code.asc', limit: 100 }],
    ['shareholders', TABLES.shareholders, { select: '*', order: 'created_at.desc', limit: 300 }],
    ['positions', TABLES.positions, { select: '*', order: 'created_at.desc', limit: 500 }],
    ['proposals', TABLES.proposals, { select: '*', order: 'created_at.desc', limit: 200 }],
    ['approvals', TABLES.approvals, { select: '*', order: 'decided_at.desc', limit: 500 }],
    ['meetings', TABLES.meetings, { select: '*', order: 'meeting_date.desc', limit: 100 }],
    ['voting', TABLES.voting, { select: '*', order: 'recorded_at.desc', limit: 500 }],
    ['subscriptions', TABLES.subscriptions, { select: '*', order: 'created_at.desc', limit: 500 }],
    ['contacts', TABLES.contacts, { select: '*', order: 'created_at.desc', limit: 500 }],
    ['audit', TABLES.audit, { select: '*', order: 'seq.desc', limit: 500 }],
  ];

  const results = await Promise.all(names.map(async ([key, table, query]) => {
    const result = await safeRows(key, table, query);
    if (result.warning) warnings.push(result.warning);
    return [key, result.rows];
  }));
  const data = Object.fromEntries(results);

  const positions = data.positions.map((row) => {
    const holder = data.shareholders.find((s) => s.id === row.shareholder_id);
    const shareClass = data.shareClasses.find((c) => c.id === row.share_class_id);
    return {
      ...row,
      shareholder_name: holder?.legal_name || 'Unknown shareholder',
      shareholder_email: holder?.email || '',
      class_code: shareClass?.class_code || '—',
      class_name: shareClass?.name || '—',
    };
  });

  const audit = data.audit;
  const chain = verifyAuditRows(audit);

  return {
    generatedAt: new Date().toISOString(),
    policy: {
      listed: false,
      ticker: 'TB',
      tickerStatus: 'Proposed — not reserved or approved',
      price: 'Not available',
      execution: 'No share issuance, transfer or trading execution is enabled by this portal.',
    },
    metrics: {
      publishedAnnouncements: data.announcements.filter((r) => r.status === 'published').length,
      draftAnnouncements: data.announcements.filter((r) => r.status === 'draft').length,
      publishedReports: data.financials.filter((r) => r.status === 'published').length,
      approvedReports: data.financials.filter((r) => r.status === 'approved').length,
      verifiedShareholders: data.shareholders.filter((r) => r.verification_status === 'verified' && r.access_status === 'approved').length,
      pendingAccess: data.shareholders.filter((r) => r.access_status === 'requested').length,
      activePositions: positions.filter((r) => r.status === 'active').length,
      pendingProposals: data.proposals.filter((r) => r.status === 'pending_approval').length,
      auditEvents: audit.length,
      auditChainValid: chain.valid,
      subscribers: data.subscriptions.filter((r) => r.status === 'confirmed').length,
      newContacts: data.contacts.filter((r) => r.status === 'new').length,
    },
    announcements: data.announcements,
    documents: data.documents,
    financials: data.financials,
    milestones: data.milestones,
    shareClasses: data.shareClasses,
    shareholders: data.shareholders,
    positions,
    proposals: data.proposals,
    approvals: data.approvals,
    meetings: data.meetings,
    voting: data.voting,
    subscriptions: data.subscriptions,
    contacts: data.contacts,
    audit,
    auditChain: chain,
    warnings,
  };
}

// ── Audit chain ──────────────────────────────────────────────────────────
export function auditHash({ seq, actorEmail, action, entityType, entityId, summary, detail, prevHash }) {
  return createHash('sha256').update(stableStringify({
    seq: Number(seq),
    actorEmail: actorEmail || null,
    action,
    entityType,
    entityId: entityId || null,
    summary,
    detail: detail || {},
    prevHash: prevHash || null,
  })).digest('hex');
}

export function verifyAuditRows(rowsDescending = []) {
  const rows = [...rowsDescending].sort((a, b) => Number(a.seq) - Number(b.seq));
  let prevHash = null;
  const failures = [];
  for (const row of rows) {
    const expected = auditHash({
      seq: row.seq,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      detail: row.detail,
      prevHash,
    });
    if (String(row.prev_hash || '') !== String(prevHash || '')) {
      failures.push({ seq: row.seq, error: 'previous hash mismatch' });
    }
    if (String(row.hash || '') !== expected) {
      failures.push({ seq: row.seq, error: 'event hash mismatch' });
    }
    prevHash = row.hash;
  }
  return {
    valid: failures.length === 0,
    checked: rows.length,
    failures,
    head: prevHash,
  };
}

export async function appendAudit({ actor, action, entityType, entityId = null, summary, detail = {} }) {
  const latest = await one(TABLES.audit, { select: 'seq,hash', order: 'seq.desc' });
  const seq = Number(latest?.seq || 0) + 1;
  const prevHash = latest?.hash || null;
  const event = {
    seq,
    actor_email: cleanText(actor, 220) || null,
    action: cleanText(action, 120),
    entity_type: cleanText(entityType, 80),
    entity_id: isUuid(entityId) ? entityId : null,
    summary: cleanText(summary, 500),
    detail: detail || {},
    prev_hash: prevHash,
    hash: auditHash({
      seq,
      actorEmail: cleanText(actor, 220) || null,
      action: cleanText(action, 120),
      entityType: cleanText(entityType, 80),
      entityId: isUuid(entityId) ? entityId : null,
      summary: cleanText(summary, 500),
      detail,
      prevHash,
    }),
  };
  try {
    return await insert(TABLES.audit, event);
  } catch (error) {
    // A concurrent append can collide on seq. Retry once against the new head.
    logger.warn('[investor] audit append retry', String(error?.message || error));
    const retryLatest = await one(TABLES.audit, { select: 'seq,hash', order: 'seq.desc' });
    const retrySeq = Number(retryLatest?.seq || 0) + 1;
    const retryPrev = retryLatest?.hash || null;
    return insert(TABLES.audit, {
      ...event,
      seq: retrySeq,
      prev_hash: retryPrev,
      hash: auditHash({
        seq: retrySeq,
        actorEmail: event.actor_email,
        action: event.action,
        entityType: event.entity_type,
        entityId: event.entity_id,
        summary: event.summary,
        detail: event.detail,
        prevHash: retryPrev,
      }),
    });
  }
}

async function audited(actor, action, entityType, entityId, summary, detail, work) {
  const result = await work();
  let event = null;
  let warning = '';
  try {
    event = await appendAudit({ actor, action, entityType, entityId: entityId || result?.id, summary, detail });
  } catch (error) {
    warning = 'The record was saved, but the audit event could not be appended. Review the audit log before relying on this change.';
    logger.error('[investor] audit append failed after action', action, String(error?.message || error));
  }
  return { result, audit: event, warning };
}

// ── Announcements ────────────────────────────────────────────────────────
export async function createAnnouncement(actor, body = {}) {
  const title = cleanText(body.title, 240);
  if (!title) {
    const error = new Error('Announcement title is required.');
    error.status = 422;
    throw error;
  }
  const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  const row = {
    slug: cleanText(body.slug, 90) && SLUG_RE.test(cleanText(body.slug, 90)) ? cleanText(body.slug, 90) : slugify(title, 'announcement'),
    title,
    category: cleanText(body.category, 80) || 'Corporate',
    summary: cleanMultiline(body.summary, 1200),
    body: cleanMultiline(body.body, MAX),
    status,
    published_at: status === 'published' ? (isoOrNull(body.publishedAt) || new Date().toISOString()) : null,
    created_by: cleanText(actor, 220) || null,
    is_demo: bool(body.isDemo),
  };
  const { result, audit, warning } = await audited(actor, 'announcement.created', 'announcement', null, `Created announcement: ${title}`, { status, category: row.category }, () => insert(TABLES.announcements, row));
  return { announcement: result, audit, warning };
}

export async function updateAnnouncement(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid announcement id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.announcements, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Announcement not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['title', 'category', 'summary', 'body', 'slug']) {
    if (body[key] !== undefined) patchRow[key] = key === 'body' ? cleanMultiline(body[key]) : cleanText(body[key], key === 'summary' ? 1200 : 240);
  }
  if (body.status !== undefined && ['draft', 'published', 'archived'].includes(body.status)) {
    patchRow.status = body.status;
    if (body.status === 'published' && !current.published_at) patchRow.published_at = isoOrNull(body.publishedAt) || new Date().toISOString();
    if (body.status === 'draft') patchRow.published_at = null;
  }
  if (body.isDemo !== undefined) patchRow.is_demo = bool(body.isDemo);
  const { result, audit, warning } = await audited(actor, 'announcement.updated', 'announcement', id, `Updated announcement: ${patchRow.title || current.title}`, { fields: Object.keys(patchRow) }, () => patch(TABLES.announcements, 'id', id, patchRow));
  return { announcement: result, audit, warning };
}

// ── IPO milestones ───────────────────────────────────────────────────────
export async function createMilestone(actor, body = {}) {
  const title = cleanText(body.title, 240);
  if (!title) {
    const error = new Error('Milestone title is required.');
    error.status = 422;
    throw error;
  }
  const status = MILESTONE_STATUS.includes(body.status) ? body.status : 'not_started';
  const evidence = cleanMultiline(body.evidence, 4000) || null;
  if (status === 'complete' && !evidence) {
    const error = new Error('A milestone cannot be marked complete without an evidence record.');
    error.status = 422;
    throw error;
  }
  const row = {
    slug: cleanText(body.slug, 90) && SLUG_RE.test(cleanText(body.slug, 90)) ? cleanText(body.slug, 90) : slugify(title, 'milestone'),
    phase: cleanText(body.phase, 80) || 'Preparation',
    title,
    description: cleanMultiline(body.description, 4000),
    status,
    evidence,
    owner: cleanText(body.owner, 180) || null,
    due_date: dateOnly(body.dueDate),
    sort_order: Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 100,
    is_public: bool(body.isPublic, true),
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'ipo_milestone.created', 'ipo_milestone', null, `Created IPO milestone: ${title}`, { status, public: row.is_public }, () => insert(TABLES.milestones, row));
  return { milestone: result, audit, warning };
}

export async function updateMilestone(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid milestone id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.milestones, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Milestone not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['title', 'phase', 'description', 'owner']) {
    if (body[key] !== undefined) patchRow[key] = key === 'description' ? cleanMultiline(body[key], 4000) : cleanText(body[key], key === 'owner' ? 180 : 240);
  }
  if (body.status !== undefined) {
    if (!MILESTONE_STATUS.includes(body.status)) {
      const error = new Error('Invalid milestone status.');
      error.status = 422;
      throw error;
    }
    const evidence = body.evidence !== undefined ? cleanMultiline(body.evidence, 4000) : (current.evidence || '');
    if (body.status === 'complete' && !evidence) {
      const error = new Error('A milestone cannot be marked complete without an evidence record.');
      error.status = 422;
      throw error;
    }
    patchRow.status = body.status;
  }
  if (body.evidence !== undefined) patchRow.evidence = cleanMultiline(body.evidence, 4000) || null;
  if (body.dueDate !== undefined) patchRow.due_date = dateOnly(body.dueDate);
  if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) patchRow.sort_order = Math.trunc(Number(body.sortOrder));
  if (body.isPublic !== undefined) patchRow.is_public = bool(body.isPublic);
  if (patchRow.status === 'complete') {
    patchRow.approved_by = cleanText(actor, 220) || null;
    patchRow.approved_at = new Date().toISOString();
  }
  const { result, audit, warning } = await audited(actor, 'ipo_milestone.updated', 'ipo_milestone', id, `Updated IPO milestone: ${patchRow.title || current.title}`, { fields: Object.keys(patchRow), status: patchRow.status || current.status }, () => patch(TABLES.milestones, 'id', id, patchRow));
  return { milestone: result, audit, warning };
}

// ── Documents ────────────────────────────────────────────────────────────
export async function createDocument(actor, body = {}) {
  const title = cleanText(body.title, 240);
  if (!title) {
    const error = new Error('Document title is required.');
    error.status = 422;
    throw error;
  }
  const url = cleanText(body.url, 1000) || null;
  const status = ['draft', 'approved', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  if (status === 'published' && !url && !cleanText(body.storagePath, 500)) {
    const error = new Error('A published document needs a URL or storage path.');
    error.status = 422;
    throw error;
  }
  const row = {
    slug: cleanText(body.slug, 90) && SLUG_RE.test(cleanText(body.slug, 90)) ? cleanText(body.slug, 90) : slugify(title, 'document'),
    title,
    category: cleanText(body.category, 80) || 'Corporate',
    document_type: cleanText(body.documentType, 30) || 'PDF',
    summary: cleanMultiline(body.summary, 1200),
    visibility: body.visibility === 'restricted' ? 'restricted' : 'public',
    status,
    url,
    storage_path: cleanText(body.storagePath, 500) || null,
    version: cleanText(body.version, 30) || '1.0',
    checksum_sha256: cleanText(body.checksumSha256, 80) || null,
    source_note: cleanMultiline(body.sourceNote, 1000) || null,
    approved_by: status === 'approved' || status === 'published' ? cleanText(actor, 220) : null,
    approved_at: status === 'approved' || status === 'published' ? new Date().toISOString() : null,
    published_at: status === 'published' ? (isoOrNull(body.publishedAt) || new Date().toISOString()) : null,
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'investor_document.created', 'investor_document', null, `Created investor document: ${title}`, { status, visibility: row.visibility }, () => insert(TABLES.documents, row));
  return { document: result, audit, warning };
}

export async function updateDocument(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid document id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.documents, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Document not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['title', 'category', 'documentType', 'summary', 'url', 'storagePath', 'version', 'checksumSha256', 'sourceNote', 'slug']) {
    if (body[key] !== undefined) {
      const map = { documentType: 'document_type', storagePath: 'storage_path', checksumSha256: 'checksum_sha256', sourceNote: 'source_note' };
      patchRow[map[key] || key] = key === 'summary' || key === 'sourceNote' ? cleanMultiline(body[key], key === 'summary' ? 1200 : 1000) : cleanText(body[key], key === 'url' ? 1000 : 500);
    }
  }
  if (body.visibility !== undefined) patchRow.visibility = body.visibility === 'restricted' ? 'restricted' : 'public';
  if (body.status !== undefined && ['draft', 'approved', 'published', 'archived'].includes(body.status)) {
    if (body.status === 'published' && !(patchRow.url || current.url) && !(patchRow.storage_path || current.storage_path)) {
      const error = new Error('A published document needs a URL or storage path.');
      error.status = 422;
      throw error;
    }
    patchRow.status = body.status;
    if (body.status === 'approved' || body.status === 'published') {
      patchRow.approved_by = cleanText(actor, 220);
      patchRow.approved_at = new Date().toISOString();
    }
    if (body.status === 'published') patchRow.published_at = current.published_at || new Date().toISOString();
    if (body.status === 'draft') patchRow.published_at = null;
  }
  const { result, audit, warning } = await audited(actor, 'investor_document.updated', 'investor_document', id, `Updated investor document: ${patchRow.title || current.title}`, { fields: Object.keys(patchRow), status: patchRow.status || current.status }, () => patch(TABLES.documents, 'id', id, patchRow));
  return { document: result, audit, warning };
}

// ── Financial reports ────────────────────────────────────────────────────
const FINANCIAL_FIELDS = {
  revenue: 'revenue',
  operatingExpenses: 'operating_expenses',
  netIncome: 'net_income',
  totalAssets: 'total_assets',
  totalLiabilities: 'total_liabilities',
  cashFlowOperating: 'cash_flow_operating',
  shareholdersEquity: 'shareholders_equity',
  eps: 'eps',
};

export async function createFinancialReport(actor, body = {}) {
  const title = cleanText(body.title, 240);
  const periodLabel = cleanText(body.periodLabel, 80);
  if (!title || !periodLabel) {
    const error = new Error('Financial report title and period are required.');
    error.status = 422;
    throw error;
  }
  const status = ['draft', 'under_review', 'approved', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  const sourceNote = cleanMultiline(body.sourceNote, 2000) || null;
  if ((status === 'approved' || status === 'published') && !sourceNote) {
    const error = new Error('An approved or published financial report needs a source note describing the accounting record it came from.');
    error.status = 422;
    throw error;
  }
  const row = {
    period_label: periodLabel,
    period_end: dateOnly(body.periodEnd),
    report_type: ['annual', 'quarterly', 'monthly', 'other'].includes(body.reportType) ? body.reportType : 'annual',
    title,
    status,
    auditor_status: ['unaudited', 'reviewed', 'audited'].includes(body.auditorStatus) ? body.auditorStatus : 'unaudited',
    currency: cleanText(body.currency, 8).toUpperCase() || 'USD',
    source_note: sourceNote,
    document_url: cleanText(body.documentUrl, 1000) || null,
    approved_by: status === 'approved' || status === 'published' ? cleanText(actor, 220) : null,
    approved_at: status === 'approved' || status === 'published' ? new Date().toISOString() : null,
    published_at: status === 'published' ? (isoOrNull(body.publishedAt) || new Date().toISOString()) : null,
    created_by: cleanText(actor, 220) || null,
    is_demo: bool(body.isDemo),
  };
  for (const [apiKey, column] of Object.entries(FINANCIAL_FIELDS)) row[column] = numberOrNull(body[apiKey]);
  const { result, audit, warning } = await audited(actor, 'financial_report.created', 'financial_report', null, `Created financial report: ${title}`, { status, period: periodLabel }, () => insert(TABLES.financials, row));
  return { report: result, audit, warning };
}

export async function updateFinancialReport(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid financial report id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.financials, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Financial report not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['periodLabel', 'title', 'sourceNote', 'documentUrl', 'currency', 'periodEnd']) {
    if (body[key] !== undefined) {
      const map = { periodLabel: 'period_label', sourceNote: 'source_note', documentUrl: 'document_url', periodEnd: 'period_end' };
      patchRow[map[key] || key] = key === 'periodEnd' ? dateOnly(body[key]) : key === 'sourceNote' ? cleanMultiline(body[key], 2000) : cleanText(body[key], key === 'documentUrl' ? 1000 : 240);
    }
  }
  if (body.reportType !== undefined && ['annual', 'quarterly', 'monthly', 'other'].includes(body.reportType)) patchRow.report_type = body.reportType;
  if (body.auditorStatus !== undefined && ['unaudited', 'reviewed', 'audited'].includes(body.auditorStatus)) patchRow.auditor_status = body.auditorStatus;
  for (const [apiKey, column] of Object.entries(FINANCIAL_FIELDS)) {
    if (body[apiKey] !== undefined) patchRow[column] = numberOrNull(body[apiKey]);
  }
  if (body.isDemo !== undefined) patchRow.is_demo = bool(body.isDemo);
  if (body.status !== undefined && ['draft', 'under_review', 'approved', 'published', 'archived'].includes(body.status)) {
    const sourceNote = patchRow.source_note !== undefined ? patchRow.source_note : current.source_note;
    if ((body.status === 'approved' || body.status === 'published') && !sourceNote) {
      const error = new Error('An approved or published financial report needs a source note describing the accounting record it came from.');
      error.status = 422;
      throw error;
    }
    patchRow.status = body.status;
    if (body.status === 'approved' || body.status === 'published') {
      patchRow.approved_by = cleanText(actor, 220);
      patchRow.approved_at = current.approved_at || new Date().toISOString();
    }
    if (body.status === 'published') patchRow.published_at = current.published_at || new Date().toISOString();
    if (body.status === 'draft' || body.status === 'under_review') patchRow.published_at = null;
  }
  const { result, audit, warning } = await audited(actor, 'financial_report.updated', 'financial_report', id, `Updated financial report: ${patchRow.title || current.title}`, { fields: Object.keys(patchRow), status: patchRow.status || current.status }, () => patch(TABLES.financials, 'id', id, patchRow));
  return { report: result, audit, warning };
}

// ── Share classes ────────────────────────────────────────────────────────
export async function createShareClass(actor, body = {}) {
  const classCode = cleanText(body.classCode, 40).toUpperCase();
  const name = cleanText(body.name, 120);
  if (!classCode || !name) {
    const error = new Error('Share class code and name are required.');
    error.status = 422;
    throw error;
  }
  const status = ['proposed', 'authorized', 'retired'].includes(body.status) ? body.status : 'proposed';
  const effectiveDate = dateOnly(body.effectiveDate);
  if (status === 'authorized' && (!effectiveDate || !cleanText(body.approvedBy, 220))) {
    const error = new Error('An authorized share class needs an effective date and an approving authority.');
    error.status = 422;
    throw error;
  }
  const row = {
    class_code: classCode,
    name,
    authorized_shares: numberOrNull(body.authorizedShares) ?? 0,
    issued_shares: numberOrNull(body.issuedShares) ?? 0,
    outstanding_shares: numberOrNull(body.outstandingShares) ?? 0,
    treasury_shares: numberOrNull(body.treasuryShares) ?? 0,
    votes_per_share: numberOrNull(body.votesPerShare) ?? 1,
    rights: cleanMultiline(body.rights, 4000) || null,
    status,
    effective_date: effectiveDate,
    approved_by: status === 'authorized' ? cleanText(body.approvedBy || actor, 220) : null,
    approved_at: status === 'authorized' ? new Date().toISOString() : null,
    is_public: bool(body.isPublic),
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'share_class.created', 'share_class', null, `Created share class: ${classCode}`, { status, authorized: row.authorized_shares }, () => insert(TABLES.shareClasses, row));
  return { shareClass: result, audit, warning };
}

export async function updateShareClass(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid share class id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.shareClasses, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Share class not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['classCode', 'name', 'rights']) {
    if (body[key] !== undefined) patchRow[key === 'classCode' ? 'class_code' : key] = key === 'rights' ? cleanMultiline(body[key], 4000) : cleanText(body[key], key === 'classCode' ? 40 : 120);
  }
  for (const key of ['authorizedShares', 'issuedShares', 'outstandingShares', 'treasuryShares', 'votesPerShare']) {
    if (body[key] !== undefined) {
      const column = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      patchRow[column] = numberOrNull(body[key]);
    }
  }
  if (body.effectiveDate !== undefined) patchRow.effective_date = dateOnly(body.effectiveDate);
  if (body.isPublic !== undefined) patchRow.is_public = bool(body.isPublic);
  if (body.status !== undefined && ['proposed', 'authorized', 'retired'].includes(body.status)) {
    const effectiveDate = patchRow.effective_date !== undefined ? patchRow.effective_date : current.effective_date;
    if (body.status === 'authorized' && !effectiveDate) {
      const error = new Error('An authorized share class needs an effective date.');
      error.status = 422;
      throw error;
    }
    patchRow.status = body.status;
    if (body.status === 'authorized') {
      patchRow.approved_by = cleanText(body.approvedBy || current.approved_by || actor, 220);
      patchRow.approved_at = current.approved_at || new Date().toISOString();
    }
  }
  const { result, audit, warning } = await audited(actor, 'share_class.updated', 'share_class', id, `Updated share class: ${patchRow.class_code || current.class_code}`, { fields: Object.keys(patchRow), status: patchRow.status || current.status }, () => patch(TABLES.shareClasses, 'id', id, patchRow));
  return { shareClass: result, audit, warning };
}

// ── Shareholders and access ──────────────────────────────────────────────
function shareholderPatch(body = {}) {
  const patchRow = {};
  for (const key of ['legalName', 'email', 'jurisdiction', 'verificationNote']) {
    if (body[key] !== undefined) {
      const map = { legalName: 'legal_name', verificationNote: 'verification_note' };
      patchRow[map[key] || key] = key === 'verificationNote' ? cleanMultiline(body[key], 2000) : cleanText(body[key], key === 'email' ? 220 : 240);
    }
  }
  if (body.entityType !== undefined && ['individual', 'entity', 'trust', 'custodian', 'other'].includes(body.entityType)) patchRow.entity_type = body.entityType;
  return patchRow;
}

export async function createShareholder(actor, body = {}) {
  const legalName = cleanText(body.legalName, 240);
  const email = cleanText(body.email, 220).toLowerCase();
  if (!legalName || !isValidEmail(email)) {
    const error = new Error('A legal name and valid email are required.');
    error.status = 422;
    throw error;
  }
  const row = {
    legal_name: legalName,
    email,
    user_id: isUuid(body.userId) ? body.userId : null,
    entity_type: ['individual', 'entity', 'trust', 'custodian', 'other'].includes(body.entityType) ? body.entityType : 'individual',
    jurisdiction: cleanText(body.jurisdiction, 120) || null,
    verification_status: 'pending',
    access_status: 'requested',
    verification_note: cleanMultiline(body.verificationNote, 2000) || null,
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'shareholder.created', 'shareholder', null, `Created shareholder record: ${legalName}`, { email }, () => insert(TABLES.shareholders, row));
  return { shareholder: result, audit, warning };
}

export async function updateShareholder(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid shareholder id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.shareholders, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Shareholder not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = shareholderPatch(body);
  if (body.accessStatus !== undefined) {
    if (!['requested', 'approved', 'suspended', 'revoked'].includes(body.accessStatus)) {
      const error = new Error('Invalid access status.');
      error.status = 422;
      throw error;
    }
    patchRow.access_status = body.accessStatus;
  }
  if (body.verificationStatus !== undefined) {
    if (!['pending', 'verified', 'rejected'].includes(body.verificationStatus)) {
      const error = new Error('Invalid verification status.');
      error.status = 422;
      throw error;
    }
    patchRow.verification_status = body.verificationStatus;
    if (body.verificationStatus === 'verified') {
      patchRow.verified_by = cleanText(actor, 220);
      patchRow.verified_at = new Date().toISOString();
    }
  }
  if (patchRow.access_status === 'approved' && (patchRow.verification_status || current.verification_status) !== 'verified') {
    const error = new Error('A shareholder must be verified before portal access is approved.');
    error.status = 422;
    throw error;
  }
  if (patchRow.access_status === 'approved' && !(patchRow.verification_status === 'verified' || current.verified_at)) {
    patchRow.verification_status = 'verified';
    patchRow.verified_by = cleanText(actor, 220);
    patchRow.verified_at = new Date().toISOString();
  }
  if (patchRow.access_status === 'revoked' || patchRow.access_status === 'suspended') {
    patchRow.verified_by = cleanText(actor, 220);
  }
  const { result, audit, warning } = await audited(actor, 'shareholder.updated', 'shareholder', id, `Updated shareholder access: ${current.legal_name}`, { fields: Object.keys(patchRow), access: patchRow.access_status || current.access_status }, () => patch(TABLES.shareholders, 'id', id, patchRow));
  return { shareholder: result, audit, warning };
}

export async function requestShareholderAccess(actor, body = {}) {
  const email = cleanText(body.email, 220).toLowerCase();
  const legalName = cleanText(body.legalName, 240);
  if (!legalName || !isValidEmail(email)) {
    const error = new Error('Enter your full legal name and a valid email address.');
    error.status = 422;
    throw error;
  }
  const existingRows = await rows(TABLES.shareholders, {
    select: '*',
    or: `(user_id.eq.${encodeURIComponent(actor.userId)},email.eq.${encodeURIComponent(email)})`,
    limit: 10,
  });
  const existing = existingRows.find((row) => row.user_id === actor.userId || String(row.email).toLowerCase() === email);
  if (existing && ['approved', 'requested'].includes(existing.access_status)) {
    return { shareholder: existing, alreadyRequested: existing.access_status === 'requested', alreadyApproved: existing.access_status === 'approved' };
  }
  const row = {
    legal_name: legalName,
    email,
    user_id: actor.userId,
    entity_type: ['individual', 'entity', 'trust', 'custodian', 'other'].includes(body.entityType) ? body.entityType : 'individual',
    jurisdiction: cleanText(body.jurisdiction, 120) || null,
    verification_status: 'pending',
    access_status: 'requested',
    verification_note: cleanMultiline(body.note, 2000) || null,
    created_by: cleanText(actor.email, 220) || null,
  };
  const saved = existing
    ? await patch(TABLES.shareholders, 'id', existing.id, {
      legal_name: row.legal_name,
      user_id: row.user_id,
      entity_type: row.entity_type,
      jurisdiction: row.jurisdiction,
      verification_status: 'pending',
      access_status: 'requested',
      verification_note: row.verification_note,
    })
    : await insert(TABLES.shareholders, row);
  let audit = null;
  let warning = '';
  try {
    audit = await appendAudit({
      actor: actor.email || actor.userId,
      action: 'shareholder.access_requested',
      entityType: 'shareholder',
      entityId: saved.id,
      summary: `Shareholder access requested: ${legalName}`,
      detail: { email },
    });
  } catch (error) {
    warning = 'Your request was saved, but the audit record is pending. IR can still review it.';
    logger.warn('[investor] access request audit failed', String(error?.message || error));
  }
  return { shareholder: saved, alreadyRequested: false, alreadyApproved: false, audit, warning };
}

export async function createPosition(actor, body = {}) {
  const shareholderId = cleanText(body.shareholderId, 40);
  const shareClassId = cleanText(body.shareClassId, 40);
  const shares = numberOrNull(body.shares);
  const sourceReference = cleanMultiline(body.sourceReference, 2000);
  const approvedBy = cleanText(body.approvedBy, 220);
  if (!isUuid(shareholderId) || !isUuid(shareClassId) || !shares || shares <= 0) {
    const error = new Error('Select a shareholder and share class, and enter a positive share amount.');
    error.status = 422;
    throw error;
  }
  if (!sourceReference || !approvedBy) {
    const error = new Error('An equity entry needs a source reference and the approving authority.');
    error.status = 422;
    throw error;
  }
  const [holder, shareClass] = await Promise.all([
    one(TABLES.shareholders, { select: '*', id: `eq.${shareholderId}` }),
    one(TABLES.shareClasses, { select: '*', id: `eq.${shareClassId}` }),
  ]);
  if (!holder || !shareClass) {
    const error = new Error('Shareholder or share class not found.');
    error.status = 404;
    throw error;
  }
  if (holder.verification_status !== 'verified') {
    const error = new Error('Verify the shareholder before recording a position.');
    error.status = 422;
    throw error;
  }
  const row = {
    shareholder_id: shareholderId,
    share_class_id: shareClassId,
    certificate_number: cleanText(body.certificateNumber, 80) || null,
    shares,
    ownership_pct: numberOrNull(body.ownershipPct),
    issued_date: dateOnly(body.issuedDate),
    vesting_start: dateOnly(body.vestingStart),
    vesting_cliff_months: Number.isFinite(Number(body.vestingCliffMonths)) ? Math.max(0, Math.trunc(Number(body.vestingCliffMonths))) : null,
    vesting_months: Number.isFinite(Number(body.vestingMonths)) ? Math.max(0, Math.trunc(Number(body.vestingMonths))) : null,
    transfer_restrictions: cleanMultiline(body.transferRestrictions, 4000) || null,
    status: 'active',
    source_reference: sourceReference,
    source_document_id: isUuid(body.sourceDocumentId) ? body.sourceDocumentId : null,
    proposal_id: isUuid(body.proposalId) ? body.proposalId : null,
    approved_by: approvedBy,
    approved_at: isoOrNull(body.approvedAt) || new Date().toISOString(),
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'share_position.recorded', 'share_position', null, `Recorded ${shares} ${shareClass.class_code} shares for ${holder.legal_name}`, { sourceReference, proposalId: row.proposal_id }, () => insert(TABLES.positions, row));
  return { position: result, audit, warning };
}

export async function updatePosition(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid position id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.positions, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Position not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['certificateNumber', 'sourceReference', 'transferRestrictions']) {
    if (body[key] !== undefined) {
      const map = { certificateNumber: 'certificate_number', sourceReference: 'source_reference', transferRestrictions: 'transfer_restrictions' };
      patchRow[map[key]] = key === 'certificateNumber' ? cleanText(body[key], 80) : cleanMultiline(body[key], 4000);
    }
  }
  if (body.status !== undefined) {
    if (!['active', 'transferred', 'cancelled'].includes(body.status)) {
      const error = new Error('Invalid position status.');
      error.status = 422;
      throw error;
    }
    if (body.status !== current.status) {
      const sourceReference = cleanMultiline(body.sourceReference, 2000);
      const approvingAuthority = cleanText(body.approvedBy, 220);
      if (!sourceReference || !approvingAuthority) {
        const error = new Error('Changing a position status requires an execution source reference and the approving authority.');
        error.status = 422;
        throw error;
      }
      patchRow.source_reference = sourceReference;
      patchRow.approved_by = approvingAuthority;
      patchRow.approved_at = new Date().toISOString();
    }
    patchRow.status = body.status;
  }
  if (body.approvedBy !== undefined && patchRow.approved_by === undefined) patchRow.approved_by = cleanText(body.approvedBy, 220) || current.approved_by;
  if (body.ownershipPct !== undefined) patchRow.ownership_pct = numberOrNull(body.ownershipPct);
  if (Object.keys(patchRow).length === 0) {
    const error = new Error('No supported fields were supplied.');
    error.status = 422;
    throw error;
  }
  const { result, audit, warning } = await audited(actor, 'share_position.updated', 'share_position', id, `Updated share position ${current.certificate_number || id}`, { fields: Object.keys(patchRow), previousStatus: current.status, status: patchRow.status || current.status }, () => patch(TABLES.positions, 'id', id, patchRow));
  return { position: result, audit, warning };
}

// ── Proposals and approvals ──────────────────────────────────────────────
export async function createProposal(actor, body = {}) {
  const title = cleanText(body.title, 240);
  if (!title) {
    const error = new Error('Proposal title is required.');
    error.status = 422;
    throw error;
  }
  const row = {
    title,
    proposal_type: PROPOSAL_TYPES.includes(body.proposalType) ? body.proposalType : 'other',
    summary: cleanMultiline(body.summary, 8000),
    status: 'draft',
    proposed_by: cleanText(body.proposedBy || actor, 220) || null,
    supporting_document_id: isUuid(body.supportingDocumentId) ? body.supportingDocumentId : null,
    supporting_document_url: cleanText(body.supportingDocumentUrl, 1000) || null,
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'equity_proposal.created', 'equity_proposal', null, `Created equity proposal: ${title}`, { type: row.proposal_type }, () => insert(TABLES.proposals, row));
  return { proposal: result, audit, warning };
}

export async function updateProposal(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid proposal id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.proposals, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Proposal not found.');
    error.status = 404;
    throw error;
  }
  if (['approved', 'rejected', 'executed'].includes(current.status)) {
    const error = new Error('A decided proposal is immutable. Record a new proposal instead.');
    error.status = 409;
    throw error;
  }
  const patchRow = {};
  for (const key of ['title', 'summary', 'proposedBy', 'supportingDocumentUrl']) {
    if (body[key] !== undefined) {
      const map = { proposedBy: 'proposed_by', supportingDocumentUrl: 'supporting_document_url' };
      patchRow[map[key] || key] = key === 'summary' ? cleanMultiline(body[key], 8000) : cleanText(body[key], key === 'supportingDocumentUrl' ? 1000 : 240);
    }
  }
  if (body.proposalType !== undefined && PROPOSAL_TYPES.includes(body.proposalType)) patchRow.proposal_type = body.proposalType;
  if (body.status !== undefined && ['draft', 'pending_approval'].includes(body.status)) patchRow.status = body.status;
  if (body.supportingDocumentId !== undefined) patchRow.supporting_document_id = isUuid(body.supportingDocumentId) ? body.supportingDocumentId : null;
  const { result, audit, warning } = await audited(actor, 'equity_proposal.updated', 'equity_proposal', id, `Updated equity proposal: ${patchRow.title || current.title}`, { fields: Object.keys(patchRow), status: patchRow.status || current.status }, () => patch(TABLES.proposals, 'id', id, patchRow));
  return { proposal: result, audit, warning };
}

export async function decideProposal(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid proposal id.');
    error.status = 422;
    throw error;
  }
  const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : '';
  if (!decision) {
    const error = new Error('Decision must be approve or reject.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.proposals, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Proposal not found.');
    error.status = 404;
    throw error;
  }
  if (!['draft', 'pending_approval'].includes(current.status)) {
    const error = new Error('This proposal has already been decided.');
    error.status = 409;
    throw error;
  }
  const note = cleanMultiline(body.note, 4000);
  const approvedAt = new Date().toISOString();
  const saved = await patch(TABLES.proposals, 'id', id, {
    status: decision === 'approve' ? 'approved' : 'rejected',
    decision_note: note || null,
    approved_by: cleanText(actor, 220) || null,
    approved_at: approvedAt,
  });
  const approval = await insert(TABLES.approvals, {
    proposal_id: id,
    approver_email: cleanText(actor, 220) || 'admin',
    decision,
    note: note || null,
    decided_at: approvedAt,
  });
  let audit = null;
  let warning = '';
  try {
    audit = await appendAudit({
      actor,
      action: `equity_proposal.${decision === 'approve' ? 'approved' : 'rejected'}`,
      entityType: 'equity_proposal',
      entityId: id,
      summary: `${decision === 'approve' ? 'Approved' : 'Rejected'} equity proposal: ${current.title}`,
      detail: { decision, note },
    });
  } catch (error) {
    warning = 'The decision was recorded, but the audit event could not be appended. Review the audit log before relying on it.';
    logger.error('[investor] proposal decision audit failed', String(error?.message || error));
  }
  return { proposal: saved, approval, audit, warning };
}

export async function markProposalExecuted(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid proposal id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.proposals, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Proposal not found.');
    error.status = 404;
    throw error;
  }
  if (current.status !== 'approved') {
    const error = new Error('Only an approved proposal can be marked executed.');
    error.status = 409;
    throw error;
  }
  const reference = cleanMultiline(body.executionReference, 2000);
  if (!reference) {
    const error = new Error('An external execution reference is required. This portal records an approved legal action; it does not execute it.');
    error.status = 422;
    throw error;
  }
  const saved = await patch(TABLES.proposals, 'id', id, {
    status: 'executed',
    execution_reference: reference,
    executed_at: isoOrNull(body.executedAt) || new Date().toISOString(),
  });
  const { audit, warning } = await audited(actor, 'equity_proposal.executed', 'equity_proposal', id, `Recorded external execution: ${current.title}`, { executionReference: reference }, async () => saved);
  return { proposal: saved, audit, warning };
}

// ── Meetings ─────────────────────────────────────────────────────────────
export async function createMeeting(actor, body = {}) {
  const title = cleanText(body.title, 240);
  if (!title) {
    const error = new Error('Meeting title is required.');
    error.status = 422;
    throw error;
  }
  const row = {
    title,
    meeting_date: isoOrNull(body.meetingDate),
    record_date: dateOnly(body.recordDate),
    status: ['scheduled', 'completed', 'cancelled'].includes(body.status) ? body.status : 'scheduled',
    notice_url: cleanText(body.noticeUrl, 1000) || null,
    details: cleanMultiline(body.details, 6000) || null,
    is_public: bool(body.isPublic, true),
    created_by: cleanText(actor, 220) || null,
  };
  const { result, audit, warning } = await audited(actor, 'shareholder_meeting.created', 'shareholder_meeting', null, `Created shareholder meeting: ${title}`, { status: row.status }, () => insert(TABLES.meetings, row));
  return { meeting: result, audit, warning };
}

export async function updateMeeting(actor, id, body = {}) {
  if (!isUuid(id)) {
    const error = new Error('Invalid meeting id.');
    error.status = 422;
    throw error;
  }
  const current = await one(TABLES.meetings, { select: '*', id: `eq.${id}` });
  if (!current) {
    const error = new Error('Meeting not found.');
    error.status = 404;
    throw error;
  }
  const patchRow = {};
  for (const key of ['title', 'noticeUrl', 'details']) {
    if (body[key] !== undefined) {
      const map = { noticeUrl: 'notice_url' };
      patchRow[map[key] || key] = key === 'details' ? cleanMultiline(body[key], 6000) : cleanText(body[key], key === 'noticeUrl' ? 1000 : 240);
    }
  }
  if (body.meetingDate !== undefined) patchRow.meeting_date = isoOrNull(body.meetingDate);
  if (body.recordDate !== undefined) patchRow.record_date = dateOnly(body.recordDate);
  if (body.status !== undefined && ['scheduled', 'completed', 'cancelled'].includes(body.status)) patchRow.status = body.status;
  if (body.isPublic !== undefined) patchRow.is_public = bool(body.isPublic);
  const { result, audit, warning } = await audited(actor, 'shareholder_meeting.updated', 'shareholder_meeting', id, `Updated shareholder meeting: ${patchRow.title || current.title}`, { status: patchRow.status || current.status }, () => patch(TABLES.meetings, 'id', id, patchRow));
  return { meeting: result, audit, warning };
}

// ── Portal ───────────────────────────────────────────────────────────────
function vestingSnapshot(position) {
  if (!position.vesting_start || !position.vesting_months || position.vesting_months <= 0) return null;
  const start = new Date(`${position.vesting_start}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  const months = Math.max(0, (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth()));
  const cliff = Number(position.vesting_cliff_months) || 0;
  if (months < cliff) {
    return { monthsElapsed: months, cliffMonths: cliff, vestingMonths: position.vesting_months, vestedPct: 0, note: 'Cliff not reached' };
  }
  const vestedPct = Math.min(100, ((months - cliff) / Math.max(1, position.vesting_months - cliff)) * 100);
  return { monthsElapsed: months, cliffMonths: cliff, vestingMonths: position.vesting_months, vestedPct: Math.round(vestedPct * 100) / 100, note: 'Schedule estimate only — contract and plan documents control.' };
}

export async function getShareholderPortal(user) {
  if (!user?.id) {
    const error = new Error('Sign in to access the shareholder portal.');
    error.status = 401;
    throw error;
  }
  const email = String(user.email || '').toLowerCase();
  const found = await rows(TABLES.shareholders, {
    select: '*',
    or: `(user_id.eq.${encodeURIComponent(user.id)},email.eq.${encodeURIComponent(email)})`,
    limit: 20,
  });
  const shareholder = found.find((row) => row.user_id === user.id) || found.find((row) => String(row.email).toLowerCase() === email) || null;
  if (!shareholder) {
    return { status: 'not_requested', shareholder: null, positions: [], meetings: [], voting: [], documents: [], statements: [], security: { mfaRecommended: true } };
  }
  if (shareholder.access_status !== 'approved' || shareholder.verification_status !== 'verified') {
    return {
      status: shareholder.access_status === 'requested' ? 'pending' : shareholder.access_status,
      shareholder: { id: shareholder.id, legal_name: shareholder.legal_name, email: shareholder.email, access_status: shareholder.access_status, verification_status: shareholder.verification_status, created_at: shareholder.created_at, verification_note: shareholder.verification_note || null },
      positions: [],
      meetings: [],
      voting: [],
      documents: [],
      statements: [],
      security: { mfaRecommended: true },
    };
  }

  const [positions, classes, meetings, votes, documents] = await Promise.all([
    rows(TABLES.positions, { select: '*', shareholder_id: `eq.${shareholder.id}`, order: 'issued_date.asc.nullslast,created_at.asc', limit: 500 }),
    rows(TABLES.shareClasses, { select: '*', order: 'class_code.asc', limit: 50 }),
    rows(TABLES.meetings, { select: '*', is_public: 'eq.true', order: 'meeting_date.desc', limit: 50 }),
    rows(TABLES.voting, { select: '*', shareholder_id: `eq.${shareholder.id}`, order: 'recorded_at.desc', limit: 200 }),
    rows(TABLES.documents, { select: '*', status: 'eq.published', visibility: 'eq.public', order: 'published_at.desc', limit: 100 }),
  ]);
  const byClass = new Map(classes.map((row) => [row.id, row]));
  const enriched = positions.map((row) => {
    const shareClass = byClass.get(row.share_class_id);
    const computedPct = Number(shareClass?.outstanding_shares) > 0
      ? (Number(row.shares) / Number(shareClass.outstanding_shares)) * 100
      : null;
    return {
      id: row.id,
      certificateNumber: row.certificate_number,
      shares: Number(row.shares),
      ownershipPct: row.ownership_pct != null ? Number(row.ownership_pct) : computedPct,
      issuedDate: row.issued_date,
      vestingStart: row.vesting_start,
      vestingCliffMonths: row.vesting_cliff_months,
      vestingMonths: row.vesting_months,
      transferRestrictions: row.transfer_restrictions,
      status: row.status,
      sourceReference: row.source_reference,
      approvedAt: row.approved_at,
      shareClass: shareClass ? publicShareClass(shareClass) : null,
      vesting: vestingSnapshot(row),
    };
  });
  return {
    status: 'approved',
    shareholder: {
      id: shareholder.id,
      legal_name: shareholder.legal_name,
      email: shareholder.email,
      entity_type: shareholder.entity_type,
      jurisdiction: shareholder.jurisdiction,
      access_status: shareholder.access_status,
      verification_status: shareholder.verification_status,
      verified_at: shareholder.verified_at,
    },
    positions: enriched,
    totals: {
      positions: enriched.filter((row) => row.status === 'active').length,
      shares: enriched.filter((row) => row.status === 'active').reduce((sum, row) => sum + (Number(row.shares) || 0), 0),
      classes: [...new Set(enriched.filter((row) => row.status === 'active').map((row) => row.shareClass?.classCode).filter(Boolean))],
    },
    meetings: meetings.map((row) => ({
      id: row.id,
      title: row.title,
      meetingDate: row.meeting_date,
      recordDate: row.record_date,
      status: row.status,
      noticeUrl: row.notice_url || null,
      details: row.details || null,
    })),
    voting: votes.map((row) => ({
      id: row.id,
      meetingId: row.meeting_id,
      agendaItem: row.agenda_item,
      vote: row.vote,
      recordedAt: row.recorded_at,
    })),
    documents: documents.map(publicDocument),
    statements: [],
    security: { mfaRecommended: true },
  };
}

// ── Subscriptions and contact ────────────────────────────────────────────
const smtp = (() => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return host && user && pass
    ? createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user, pass },
    })
    : null;
})();

const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@tradingbible.app';
const fromName = process.env.SMTP_FROM_NAME || 'TradingBible';
const appUrl = (process.env.APP_URL || 'https://tradingbible.app').replace(/\/+$/, '');

async function sendMail({ to, subject, html, text }) {
  if (!smtp) return { sent: false, reason: 'SMTP not configured' };
  try {
    await smtp.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      envelope: { from: process.env.SMTP_USER || fromEmail, to },
      to,
      subject,
      html,
      text,
    });
    return { sent: true };
  } catch (error) {
    logger.warn('[investor] email send failed', String(error?.message || error));
    return { sent: false, reason: 'Email delivery failed' };
  }
}

export async function subscribeInvestor(body = {}) {
  const email = cleanText(body.email, 220).toLowerCase();
  const name = cleanText(body.name, 160) || null;
  if (!isValidEmail(email)) {
    const error = new Error('Enter a valid email address.');
    error.status = 422;
    throw error;
  }
  if (!bool(body.consent)) {
    const error = new Error('Consent to receive investor updates is required.');
    error.status = 422;
    throw error;
  }
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const existing = await one(TABLES.subscriptions, { select: '*', email: `eq.${email}` });
  if (existing?.status === 'confirmed') {
    return { status: 'already_confirmed', emailSent: false, message: 'This email is already subscribed to investor updates.' };
  }
  const patchRow = {
    name,
    status: 'pending',
    consent_at: new Date().toISOString(),
    confirmation_token_hash: tokenHash,
    source: cleanText(body.source, 80) || 'investor-site',
  };
  if (existing) await patch(TABLES.subscriptions, 'id', existing.id, patchRow);
  else await insert(TABLES.subscriptions, { email, ...patchRow });
  const confirmUrl = `${appUrl}/api/investor/subscribe/confirm?token=${encodeURIComponent(token)}`;
  const mail = await sendMail({
    to: email,
    subject: 'Confirm your TradingBible investor updates',
    text: `Confirm your subscription to TradingBible investor updates: ${confirmUrl}\n\nIf you did not request this, ignore this email.`,
    html: brandShell({
      title: 'Confirm investor updates',
      body: `<p>You asked to receive TradingBible investor relations updates.</p><p style="margin:22px 0"><a href="${confirmUrl}" style="display:inline-block;background:#d4af37;color:#0a0a0f;padding:12px 18px;border-radius:10px;font-weight:700;text-decoration:none">Confirm subscription</a></p><p style="color:#8a8577;font-size:13px">If you did not request this, ignore this email. No investor update will be sent until you confirm.</p>`,
    }),
  });
  return {
    status: 'pending',
    emailSent: mail.sent,
    message: mail.sent
      ? 'Check your inbox to confirm your investor update subscription.'
      : 'Your request was recorded. Confirmation email delivery is temporarily unavailable; contact support@tradingbible.app to confirm.',
  };
}

export async function confirmSubscription(token) {
  const clean = cleanText(token, 200);
  if (!clean) {
    const error = new Error('Missing confirmation token.');
    error.status = 422;
    throw error;
  }
  const hash = createHash('sha256').update(clean).digest('hex');
  const row = await one(TABLES.subscriptions, { select: '*', confirmation_token_hash: `eq.${hash}` });
  if (!row) {
    const error = new Error('This confirmation link is invalid or has expired.');
    error.status = 404;
    throw error;
  }
  if (row.status === 'confirmed') return { status: 'confirmed', email: row.email };
  await patch(TABLES.subscriptions, 'id', row.id, {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    confirmation_token_hash: null,
  });
  return { status: 'confirmed', email: row.email };
}

export async function createInvestorContact(body = {}) {
  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 220).toLowerCase();
  const message = cleanMultiline(body.message, 5000);
  const inquiryType = cleanText(body.inquiryType, 80) || 'General';
  if (!name || !isValidEmail(email) || !message) {
    const error = new Error('Name, a valid email address and a message are required.');
    error.status = 422;
    throw error;
  }
  if (cleanText(body.website, 300)) {
    // Honeypot: silently accept without storing or emailing.
    return { ok: true, emailed: false };
  }
  const saved = await insert(TABLES.contacts, {
    name,
    email,
    organization: cleanText(body.organization, 200) || null,
    inquiry_type: inquiryType,
    message,
  });
  const mail = await sendMail({
    to: process.env.SUPPORT_EMAIL || 'support@tradingbible.app',
    subject: `[Investor Relations] ${inquiryType} — ${name}`,
    text: `From: ${name} <${email}>\nOrganization: ${cleanText(body.organization, 200) || '—'}\nType: ${inquiryType}\n\n${message}`,
    html: brandShell({
      title: `Investor relations inquiry — ${escapeHtml(inquiryType)}`,
      body: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><strong>Organization:</strong> ${escapeHtml(cleanText(body.organization, 200) || '—')}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    }),
  });
  return { ok: true, id: saved.id, emailed: mail.sent };
}

// ── Grounded assistant context ───────────────────────────────────────────
export async function investorAssistantContext() {
  const overview = await getPublicOverview();
  const lines = [
    'Issuer: TradingBible LLC (current operating entity). Proposed public issuer: TradingBible, Inc. (not yet formed).',
    'Proposed ticker: TB. Target exchange: Nasdaq. Status: pre-IPO, not publicly traded. No stock price, market capitalization, volume or order book is available.',
    'TB is equity (proposed). TBC is a separate proposed blockchain asset. TBC does not represent equity or ownership in TradingBible.',
    `IPO readiness: ${overview.ipo.complete} of ${overview.ipo.total} milestones complete; ${overview.ipo.inProgress} in progress; ${overview.ipo.blocked} blocked.`,
  ];
  if (overview.announcements.length) {
    lines.push('Published announcements:');
    for (const item of overview.announcements.slice(0, 10)) lines.push(`- ${item.title}: ${item.summary}`);
  } else lines.push('Published announcements: none.');
  if (overview.financials.length) {
    lines.push('Published financial reports:');
    for (const item of overview.financials.slice(0, 8)) lines.push(`- ${item.title} (${item.periodLabel}, ${item.auditorStatus}). Source: ${item.sourceNote || 'published report'}`);
  } else lines.push('Published financial reports: none. Do not invent financial figures.');
  if (overview.milestones.length) {
    lines.push('IPO milestones:');
    for (const item of overview.milestones.slice(0, 30)) lines.push(`- ${item.title}: ${item.status}${item.evidence ? ` — evidence: ${item.evidence}` : ''}`);
  }
  if (overview.documents.length) {
    lines.push('Published documents:');
    for (const item of overview.documents.slice(0, 20)) lines.push(`- ${item.title} (${item.category}, ${item.documentType})`);
  }
  return { text: lines.join('\n'), overview };
}

export function investorAssistantFallback(question, overview) {
  const q = String(question || '').toLowerCase();
  if (/\b(price|market cap|market capitalization|volume|quote|share price|trading price)\b/.test(q)) {
    return 'TB is not publicly traded. TradingBible does not publish a share price, market capitalisation or trading volume because no listed security or licensed market-data feed exists.';
  }
  if (/\b(buy|sell|invest|return|profit|guarantee|recommendation)\b/.test(q)) {
    return 'I can explain published company information, but I cannot give investment advice, recommend a transaction or guarantee returns. TB is not publicly traded and no purchase or sale is available through TradingBible.';
  }
  if (/\b(tbc|coin|token)\b/.test(q)) {
    return 'TBC is a separate proposed blockchain asset. It does not represent equity, shares or ownership in TradingBible, and its supply, balances and risks are not combined with TB equity. No TBC sale or transfer is active.';
  }
  if (/\b(publicly traded|publicly listed|listed|listing|exchange|ticker|stock market)\b/.test(q)) {
    return 'TB is a proposed future ticker. It is not publicly traded, and no shares can be bought or sold through TradingBible. TradingBible LLC is the current operating entity; TradingBible, Inc. is a proposed issuer that has not been formed. No share price, market capitalisation, volume, Nasdaq approval or regulatory approval is available.';
  }
  if (/\b(inc\b|llc|entity|issuer|formed|incorporat)\b/.test(q)) {
    return 'TradingBible LLC is the current operating entity. TradingBible, Inc. is a proposed issuer that has not yet been formed. No shares have been issued by the proposed entity, and it has no Nasdaq listing or registration statement.';
  }
  if (/\b(ipo|nasdaq|milestone)\b/.test(q)) {
    return `IPO preparation is not complete. ${overview.ipo.complete} of ${overview.ipo.total} milestones are complete, ${overview.ipo.inProgress} are in progress and ${overview.ipo.blocked} are blocked. No Nasdaq listing or regulatory approval is implied.`;
  }
  if (/\b(financial|revenue|audit|report)\b/.test(q)) {
    return overview.financials.length
      ? `The latest published report is “${overview.financials[0].title}” for ${overview.financials[0].periodLabel}. Only approved reports are shown.`
      : 'No approved financial report has been published yet. TradingBible does not generate or publish unaudited figures as if they were audited results.';
  }
  return 'The public investor relations library does not contain a verified answer to that question. Please use the IR contact form or email support@tradingbible.app.';
}
