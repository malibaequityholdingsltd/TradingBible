// White-label theme engine — applies a reseller's brand live via CSS vars.
// Controls: brand identity (name/tagline/logo), accent color, and TEXT colors
// (heading/body/muted). Persisted to localStorage for instant boot apply +
// PocketBase `branding_settings` for the account record.
import pb from '@/lib/pocketbaseClient';

const LS_KEY = 'tb-whitelabel';

export const WL_DEFAULTS = {
  companyName: 'TradingBible',
  tagline: 'TradingBible',
  logoUrl: '',
  primaryColor: '#0a0a0f',
  accentColor: '#d4af37',
  headingColor: '#f0ecdd',
  bodyColor: '#c9c4b4',
  mutedColor: '#8a8577',
};

export const WL_PRESETS = [
  { id: 'tb-gold', label: 'TradingBible Gold', accentColor: '#d4af37', headingColor: '#f0ecdd', bodyColor: '#c9c4b4', mutedColor: '#8a8577', primaryColor: '#0a0a0f' },
  { id: 'midnight', label: 'Midnight Blue', accentColor: '#38bdf8', headingColor: '#eef4ff', bodyColor: '#b9c6dd', mutedColor: '#7c8aa0', primaryColor: '#070b14' },
  { id: 'emerald', label: 'Emerald Desk', accentColor: '#34d399', headingColor: '#ecfdf5', bodyColor: '#b8d4c7', mutedColor: '#759084', primaryColor: '#07110d' },
  { id: 'crimson', label: 'Crimson Bull', accentColor: '#fb7185', headingColor: '#fff1f2', bodyColor: '#d8b9be', mutedColor: '#93737b', primaryColor: '#120709' },
  { id: 'violet', label: 'Violet Quant', accentColor: '#a78bfa', headingColor: '#f1edff', bodyColor: '#c2badd', mutedColor: '#857c9e', primaryColor: '#0c0916' },
  { id: 'amber', label: 'Amber Pit', accentColor: '#f59e0b', headingColor: '#fdf6e9', bodyColor: '#d3c4a6', mutedColor: '#8f8065', primaryColor: '#100c06' },
];

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  if (!Number.isFinite(n) || v.length !== 6) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex, target, amt) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const m = c.map((v, i) => Math.round(v + (target[i] - v) * amt));
  return `#${m.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

function rgba(hex, alpha) {
  const c = hexToRgb(hex);
  if (!c) return `rgba(212, 175, 55, ${alpha})`;
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

// Push the theme into :root vars so every token-driven surface re-themes live.
export function applyWhiteLabel(t = {}) {
  if (typeof document === 'undefined') return;
  const th = { ...WL_DEFAULTS, ...t };
  const root = document.documentElement;
  const accent = th.accentColor || WL_DEFAULTS.accentColor;
  root.style.setProperty('--tb-gold', accent);
  root.style.setProperty('--tb-gold-hi', mix(accent, [255, 255, 255], 0.45));
  root.style.setProperty('--tb-gold-deep', mix(accent, [0, 0, 0], 0.35));
  root.style.setProperty('--tb-gold-glow', rgba(accent, 0.4));
  root.style.setProperty('--tb-ink', th.headingColor || WL_DEFAULTS.headingColor);
  root.style.setProperty('--tb-body', th.bodyColor || WL_DEFAULTS.bodyColor);
  root.style.setProperty('--tb-muted', th.mutedColor || WL_DEFAULTS.mutedColor);
  root.setAttribute('data-whitelabel', th.companyName || 'TradingBible');
}

export function loadLocalTheme() {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return { ...WL_DEFAULTS, ...JSON.parse(raw) };
  } catch { return null; }
}

export function saveLocalTheme(t) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

export function clearLocalTheme() {
  try { window.localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// Apply stored theme before first paint (call from main.jsx).
export function bootWhiteLabel() {
  const t = loadLocalTheme();
  if (t) applyWhiteLabel(t);
}

export async function loadAccountTheme(userId) {
  if (!userId) return null;
  try {
    const rec = await pb.collection('branding_settings').getFirstListItem(`owner = "${userId}"`);
    return {
      recordId: rec.id,
      companyName: rec.companyName || WL_DEFAULTS.companyName,
      tagline: rec.tagline || WL_DEFAULTS.tagline,
      logoUrl: rec.logoUrl || '',
      primaryColor: rec.primaryColor || WL_DEFAULTS.primaryColor,
      accentColor: rec.accentColor || WL_DEFAULTS.accentColor,
      headingColor: rec.headingColor || WL_DEFAULTS.headingColor,
      bodyColor: rec.bodyColor || WL_DEFAULTS.bodyColor,
      mutedColor: rec.mutedColor || WL_DEFAULTS.mutedColor,
    };
  } catch { return null; }
}

export async function saveAccountTheme(userId, recordId, theme) {
  const data = { ...theme, owner: userId };
  delete data.recordId;
  if (recordId) {
    await pb.collection('branding_settings').update(recordId, data);
    return recordId;
  }
  const rec = await pb.collection('branding_settings').create(data);
  return rec.id;
}
