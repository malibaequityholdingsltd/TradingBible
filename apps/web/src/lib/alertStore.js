import pb from '@/lib/pocketbaseClient';

// The production price_alerts table predates the alert UI. It stores
// direction/price/active/triggered and has no columns for frequency, channels,
// sound, target, alertType, lastTriggered or triggerPrice. Keep the richer
// alert model in the existing `note` column so the UI works without a schema
// migration, and still read rows written by the older client.
const META_TAG = '__tbAlert';
const HISTORY_SEEN_PREFIX = 'tb:alert-history-seen:';
const DEFAULT_FREQUENCY = 'once';
const DEFAULT_CHANNELS = ['in_app'];

function parseMeta(note) {
  const text = typeof note === 'string' ? note.trim() : '';
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed[META_TAG] === 1) return parsed;
    } catch { /* legacy free-text note */ }
  }
  return { userNote: text };
}

function serializeMeta(meta) {
  return JSON.stringify({ [META_TAG]: 1, ...meta });
}

function normalizeChannels(value) {
  if (Array.isArray(value) && value.length) return value.map(String);
  return [...DEFAULT_CHANNELS];
}

function normalizeStatus(row) {
  if (row?.triggered === true) return 'triggered';
  if (row?.active === false) return 'paused';
  return 'active';
}

export function mapAlertRow(row) {
  if (!row) return null;
  const meta = parseMeta(row.note);
  return {
    ...row,
    symbol: String(row.symbol || '').toUpperCase(),
    alertType: row.direction || meta.alertType || 'above',
    target: row.price ?? meta.target ?? null,
    status: normalizeStatus(row),
    frequency: meta.frequency || DEFAULT_FREQUENCY,
    channels: normalizeChannels(meta.channels),
    sound: meta.sound !== false,
    basePrice: meta.basePrice ?? null,
    expiresAt: meta.expiresAt || null,
    lastTriggered: meta.lastTriggered || null,
    triggerPrice: meta.triggerPrice ?? null,
    note: meta.userNote || '',
    updated: row.updated || row.created || null,
  };
}

function buildRowPatch(data, existingMeta = {}) {
  const meta = { ...existingMeta };
  for (const key of ['frequency', 'channels', 'sound', 'basePrice', 'expiresAt', 'lastTriggered', 'triggerPrice']) {
    if (data[key] !== undefined) meta[key] = data[key];
  }
  if (data.note !== undefined) meta.userNote = String(data.note || '');

  const patch = {};
  if (data.symbol !== undefined) patch.symbol = String(data.symbol || '').toUpperCase();
  if (data.alertType !== undefined) patch.direction = data.alertType;
  if (data.target !== undefined) patch.price = Number(data.target);
  if (data.status !== undefined) {
    patch.active = data.status === 'active';
    patch.triggered = data.status === 'triggered';
  }
  if (Object.keys(meta).length) patch.note = serializeMeta(meta);
  return patch;
}

async function rawAlert(id) {
  const rows = await pb.collection('price_alerts').getFullList({
    filter: `id = "${String(id).replace(/"/g, '')}"`,
    requestKey: `alert-row-${id}`,
  });
  return rows[0] || null;
}

export async function listAlerts() {
  if (!pb.authStore.isValid) return [];
  const rows = await pb.collection('price_alerts').getFullList({
    sort: '-created',
    requestKey: 'alerts-list',
  });
  return rows.map(mapAlertRow);
}

export async function createAlert(data = {}) {
  const record = {
    status: 'active',
    frequency: DEFAULT_FREQUENCY,
    channels: [...DEFAULT_CHANNELS],
    sound: true,
    ...data,
  };
  const patch = buildRowPatch(record, {});
  if (pb.authStore.record?.id) patch.owner = pb.authStore.record.id;
  const row = await pb.collection('price_alerts').create(patch);
  return mapAlertRow(row);
}

export async function updateAlert(id, data = {}) {
  const current = await rawAlert(id);
  const meta = parseMeta(current?.note);
  const patch = buildRowPatch(data, meta);
  if (!Object.keys(patch).length) return mapAlertRow(current);
  const row = await pb.collection('price_alerts').update(id, patch);
  return mapAlertRow(row);
}

export async function removeAlert(id) {
  await pb.collection('price_alerts').delete(id);
}

export async function triggerAlert(alert, triggerPrice) {
  if (!alert?.id) return null;
  const nextStatus = alert.frequency === 'once' ? 'triggered' : 'active';
  return updateAlert(alert.id, {
    status: nextStatus,
    triggerPrice,
    lastTriggered: new Date().toISOString(),
  });
}

function historySeenKey() {
  return `${HISTORY_SEEN_PREFIX}${pb.authStore.record?.id || 'anon'}:v1`;
}

function readSeenHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(historySeenKey()) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function writeSeenHistory(ids) {
  try {
    localStorage.setItem(historySeenKey(), JSON.stringify([...ids].slice(-500)));
  } catch { /* storage may be unavailable */ }
}

export async function listAlertHistory() {
  if (!pb.authStore.isValid) return [];
  const rows = await pb.collection('alert_history').getFullList({
    sort: '-created',
    requestKey: 'notif-hist',
  });
  const seen = readSeenHistory();
  return rows.map((row) => ({
    ...row,
    alertType: row.direction || 'above',
    target: row.price ?? null,
    seen: seen.has(row.id),
  }));
}

export async function createAlertHistory(data = {}) {
  const patch = {
    symbol: String(data.symbol || '').toUpperCase(),
    direction: data.alertType || 'above',
    price: data.target ?? null,
    message: data.message || '',
  };
  if (pb.authStore.record?.id) patch.owner = pb.authStore.record.id;
  const row = await pb.collection('alert_history').create(patch);
  return row;
}

export function markAlertHistorySeen(rows = []) {
  const seen = readSeenHistory();
  rows.forEach((row) => { if (row?.id) seen.add(row.id); });
  writeSeenHistory(seen);
}
