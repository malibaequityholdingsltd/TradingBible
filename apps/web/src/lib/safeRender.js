// Safe render guards — external records (PocketBase rows, server payloads,
// broker-synced trades, saved watchlists) occasionally carry nested objects
// where the UI expects a string or number. Rendering one raw throws
// "Objects are not valid as a React child" and takes down the whole page.
// Every raw render of outside data must go through txt() / num().
export function txt(v, fb = '—') {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : fb;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v == null) return fb;
  if (typeof v === 'object') {
    const inner = v.symbol ?? v.name ?? v.label ?? v.title ?? v.value ?? v.text;
    if (typeof inner === 'string' && inner) return inner;
    if (typeof inner === 'number' && Number.isFinite(inner)) return String(inner);
  }
  return fb;
}

// Numeric-or-fallback for values that feed arithmetic / .toFixed / charts.
export function num(v, fb = 0) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fb;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fb;
}

// Numeric-or-null for optional readings (change %, PnL %) where null means
// "no data" and must render the empty state instead of 0.
export function numOrNull(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export default txt;
