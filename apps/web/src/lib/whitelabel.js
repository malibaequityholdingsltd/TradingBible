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

// One-click accent override: every hard-coded gold Tailwind utility follows
// --tb-gold / --tb-gold-hi / --tb-gold-deep, so presets recolor the FULL app
// (buttons, text, borders, gradients) instead of token surfaces only.
// Light mode uses the deep mix for text so contrast never spoils; dark keeps
// the raw accent. Translucent washes use color-mix at matching strengths.
function applyAccentOverride() {
  if (typeof document === 'undefined') return;
  const ID = 'tb-accent-override';
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement('style');
    el.id = ID;
    document.head.appendChild(el);
  }
  const pct = [5, 8, 10, 12, 14, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80];
  const bracket = [['[0.03]', 3], ['[0.04]', 4], ['[0.05]', 5], ['[0.06]', 6], ['[0.07]', 7], ['[0.08]', 8], ['[0.09]', 9], ['[0.1]', 10], ['[0.12]', 12]];
  let css = ':root:not(.light){--tb-ink:var(--wl-ink,#f0ecdd);--tb-body:var(--wl-body,#c9c4b4);--tb-muted:var(--wl-muted,#8a8577);}\n';
  // Solid gold text → accent (dark) / deep (light for contrast)
  for (const hex of ['#d4af37', '#c99a25', '#a67c1e']) {
    css += `[class*="text-[${hex}]"]{color:var(--tb-gold) !important;}\n`;
    css += `html.light [class*="text-[${hex}]"]{color:var(--tb-gold-deep) !important;}\n`;
  }
  for (const hex of ['#f4e6a8', '#f0d675']) {
    css += `[class*="text-[${hex}]"]{color:var(--tb-gold-hi) !important;}\n`;
    css += `html.light [class*="text-[${hex}]"]{color:var(--tb-gold-deep) !important;}\n`;
  }
  // Redesign gold tint (buttons, headings) follows the theme too
  css += `[class*="text-[#e8c95a]"]{color:var(--tb-gold-hi) !important;}\n`;
  css += `html.light [class*="text-[#e8c95a]"]{color:var(--tb-gold-deep) !important;}\n`;
  for (const hex of ['#9a7a1e', '#8a6d1b']) {
    css += `[class*="text-[${hex}]"]{color:var(--tb-gold-deep) !important;}\n`;
  }
  // Gold text with opacity
  for (const o of [60, 70, 80]) {
    css += `[class*="text-[#d4af37]/${o}"]{color:color-mix(in srgb, var(--tb-gold) ${o}%, transparent) !important;}\n`;
    css += `html.light [class*="text-[#d4af37]/${o}"]{color:color-mix(in srgb, var(--tb-gold-deep) ${o}%, transparent) !important;}\n`;
  }
  css += `[class*="text-[#d4af37]/[0.05]"]{color:color-mix(in srgb, var(--tb-gold) 5%, transparent) !important;}\n`;
  // Solid gold backgrounds + borders (+ deep-gold variants)
  for (const hex of ['#d4af37', '#f4e6a8', '#c99a25']) {
    const v = hex === '#f4e6a8' ? 'var(--tb-gold-hi)' : hex === '#c99a25' ? 'var(--tb-gold-deep)' : 'var(--tb-gold)';
    css += `[class*="bg-[${hex}]"]{background-color:${v} !important;}\n`;
  }
  css += `[class*="bg-[#a67c1e]"]{background-color:var(--tb-gold-deep) !important;}\n`;
  css += `[class*="bg-[#a67c1e]/30"]{background-color:color-mix(in srgb, var(--tb-gold-deep) 30%, transparent) !important;}\n`;
  css += `[class*="border-[#d4af37]"]{border-color:var(--tb-gold) !important;}\n`;
  css += `[class*="border-[#a67c1e]"]{border-color:var(--tb-gold-deep) !important;}\n`;
  css += `[class*="border-[#a67c1e]/40"]{border-color:color-mix(in srgb, var(--tb-gold-deep) 40%, transparent) !important;}\n`;
  // Translucent gold washes — every strength the codebase uses
  for (const o of pct) {
    css += `[class*="bg-[#d4af37]/${o}"]{background-color:color-mix(in srgb, var(--tb-gold) ${o}%, transparent) !important;}\n`;
    css += `[class*="border-[#d4af37]/${o}"]{border-color:color-mix(in srgb, var(--tb-gold) ${o}%, transparent) !important;}\n`;
  }
  for (const [br, o] of bracket) {
    css += `[class*="bg-[#d4af37]/${br}"]{background-color:color-mix(in srgb, var(--tb-gold) ${o}%, transparent) !important;}\n`;
  }
  // Gold gradient stops → theme vars
  css += `[class*="from-[#f4e6a8]"]{--tw-gradient-from:var(--tb-gold-hi) var(--tw-gradient-from-position) !important;}\n`;
  css += `[class*="from-[#e8c95a]"]{--tw-gradient-from:var(--tb-gold-hi) var(--tw-gradient-from-position) !important;}\n`;
  css += `[class*="via-[#e8c95a]"]{--tw-gradient-stops:var(--tw-gradient-from), var(--tb-gold-hi) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;}\n`;
  css += `[class*="to-[#b8912a]"]{--tw-gradient-to:var(--tb-gold-deep) var(--tw-gradient-to-position) !important;}\n`;
  for (const o of [25, 30, 40]) {
    css += `[class*="border-[#b8912a]/${o}"]{border-color:color-mix(in srgb, var(--tb-gold-deep) ${o}%, transparent) !important;}\n`;
  }
  css += `[class*="from-[#f0d675]"]{--tw-gradient-from:var(--tb-gold-hi) var(--tw-gradient-from-position) !important;}\n`;
  css += `[class*="from-[#d4af37]"]{--tw-gradient-from:var(--tb-gold) var(--tw-gradient-from-position) !important;}\n`;
  css += `[class*="via-[#d4af37]"]{--tw-gradient-stops:var(--tw-gradient-from), var(--tb-gold) var(--tw-gradient-via-position), var(--tw-gradient-to) !important;}\n`;
  css += `[class*="to-[#d4af37]"]{--tw-gradient-to:var(--tb-gold) var(--tw-gradient-to-position) !important;}\n`;
  css += `[class*="to-[#c99a25]"]{--tw-gradient-to:var(--tb-gold-deep) var(--tw-gradient-to-position) !important;}\n`;
  css += `[class*="to-[#a67c1e]"]{--tw-gradient-to:var(--tb-gold-deep) var(--tw-gradient-to-position) !important;}\n`;
  css += `[class*="to-[#f0d675]"]{--tw-gradient-to:var(--tb-gold-hi) var(--tw-gradient-to-position) !important;}\n`;
  // Gradient stops with opacity — hi stops use hi, deep stops use deep
  const gstop = [
    ['from-[#f4e6a8]/20', 'from', 20, 'var(--tb-gold-hi)'], ['from-[#f4e6a8]/25', 'from', 25, 'var(--tb-gold-hi)'],
    ['from-[#d4af37]/20', 'from', 20, 'var(--tb-gold)'], ['from-[#d4af37]/25', 'from', 25, 'var(--tb-gold)'],
    ['from-[#d4af37]/30', 'from', 30, 'var(--tb-gold)'],
    ['from-[#d4af37]/[0.07]', 'from', 7, 'var(--tb-gold)'], ['from-[#d4af37]/[0.08]', 'from', 8, 'var(--tb-gold)'],
    ['from-[#d4af37]/[0.12]', 'from', 12, 'var(--tb-gold)'], ['from-[#d4af37]/[0.14]', 'from', 14, 'var(--tb-gold)'],
    ['via-[#d4af37]/70', 'via', 70, 'var(--tb-gold)'],
    ['to-[#c99a25]/10', 'to', 10, 'var(--tb-gold-deep)'],
    ['to-[#d4af37]/5', 'to', 5, 'var(--tb-gold)'], ['to-[#d4af37]/[0.03]', 'to', 3, 'var(--tb-gold)'],
    ['to-[#a67c1e]/20', 'to', 20, 'var(--tb-gold-deep)'],
  ];
  for (const [cls, kind, o, v] of gstop) {
    const mixed = `color-mix(in srgb, ${v} ${o}%, transparent)`;
    if (kind === 'from') css += `[class*="${cls}"]{--tw-gradient-from:${mixed} var(--tw-gradient-from-position) !important;}\n`;
    else if (kind === 'to') css += `[class*="${cls}"]{--tw-gradient-to:${mixed} var(--tw-gradient-to-position) !important;}\n`;
    else css += `[class*="${cls}"]{--tw-gradient-stops:var(--tw-gradient-from), ${mixed} var(--tw-gradient-via-position), var(--tw-gradient-to) !important;}\n`;
  }
  // Terminal segmented tabs: active segment follows the theme too
  css += `.tb-term-tab--active{color:var(--tb-gold) !important;background:linear-gradient(180deg,color-mix(in srgb,var(--tb-gold) 24%,transparent),color-mix(in srgb,var(--tb-gold) 12%,transparent)) !important;border-color:color-mix(in srgb,var(--tb-gold) 50%,transparent) !important;box-shadow:0 2px 10px -2px var(--tb-gold-glow),inset 0 1px 0 rgba(255,255,255,0.2) !important;}\n`;
  css += `html.light .tb-term-tab--active{color:#fffdf8 !important;background:linear-gradient(180deg,var(--tb-gold-deep),var(--tb-gold)) !important;border-color:var(--tb-gold-deep) !important;}\n`;
  // Gold rings
  css += `[class*="ring-[#d4af37]"]{--tw-ring-color:var(--tb-gold) !important;}\n`;
  for (const o of [25, 30, 40, 50]) {
    css += `[class*="ring-[#d4af37]/${o}"]{--tw-ring-color:color-mix(in srgb, var(--tb-gold) ${o}%, transparent) !important;}\n`;
  }
  // Gold glows + shadows: exact geometry, theme color (generated — covers
  // every rgba(212,175,55,…) shadow/background the codebase uses, so the SI
  // widget and every gold glow follow the theme too)
  css += `[class*="bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent)]"]{background-image:radial-gradient(60% 100% at 50% 0%,color-mix(in srgb, var(--tb-gold) 10%, transparent),transparent) !important;}\n[class*="bg-[radial-gradient(70%_120%_at_15%_0%,rgba(212,175,55,0.14),transparent_60%)]"]{background-image:radial-gradient(70% 120% at 15% 0%,color-mix(in srgb, var(--tb-gold) 14%, transparent),transparent 60%) !important;}\n[class*="bg-[radial-gradient(80%_100%_at_100%_0%,rgba(212,175,55,0.12),transparent_55%)]"]{background-image:radial-gradient(80% 100% at 100% 0%,color-mix(in srgb, var(--tb-gold) 12%, transparent),transparent 55%) !important;}\n[class*="bg-[repeating-linear-gradient(0deg,rgba(212,175,55,0.022)_0px,rgba(212,175,55,0.022)_1px,transparent_1px,transparent_3px)]"]{background-image:repeating-linear-gradient(0deg,color-mix(in srgb, var(--tb-gold) 2%, transparent) 0px,color-mix(in srgb, var(--tb-gold) 2%, transparent) 1px,transparent 1px,transparent 3px) !important;}\n[class*="shadow-[0_0_0_3px_rgba(212,175,55,0.08)]"]{box-shadow:[0 0 0 3px color-mix(in srgb, var(--tb-gold) 8%, transparent)] !important;}\n[class*="shadow-[0_0_18px_rgba(212,175,55,0.4)]"]{box-shadow:[0 0 18px color-mix(in srgb, var(--tb-gold) 40%, transparent)] !important;}\n[class*="shadow-[0_0_24px_-6px_rgba(212,175,55,0.4)]"]{box-shadow:[0 0 24px -6px color-mix(in srgb, var(--tb-gold) 40%, transparent)] !important;}\n[class*="shadow-[0_0_24px_-8px_rgba(212,175,55,0.5)]"]{box-shadow:[0 0 24px -8px color-mix(in srgb, var(--tb-gold) 50%, transparent)] !important;}\n[class*="shadow-[0_0_40px_-12px_rgba(212,175,55,0.45)]"]{box-shadow:[0 0 40px -12px color-mix(in srgb, var(--tb-gold) 45%, transparent)] !important;}\n[class*="shadow-[0_0_80px_rgba(212,175,55,0.10),0_24px_80px_rgba(0,0,0,0.5)]"]{box-shadow:[0 0 80px color-mix(in srgb, var(--tb-gold) 10%, transparent),0 24px 80px rgba(0,0,0,0.5)] !important;}\n[class*="shadow-[0_10px_26px_rgba(212,175,55,0.45)]"]{box-shadow:[0 10px 26px color-mix(in srgb, var(--tb-gold) 45%, transparent)] !important;}\n[class*="shadow-[0_10px_30px_-10px_rgba(212,175,55,0.7),inset_0_1px_0_rgba(255,255,255,0.5)]"]{box-shadow:[0 10px 30px -10px color-mix(in srgb, var(--tb-gold) 70%, transparent),inset 0 1px 0 rgba(255,255,255,0.5)] !important;}\n[class*="shadow-[0_10px_34px_rgba(212,175,55,0.5)]"]{box-shadow:[0 10px 34px color-mix(in srgb, var(--tb-gold) 50%, transparent)] !important;}\n[class*="shadow-[0_14px_36px_rgba(212,175,55,0.15)]"]{box-shadow:[0 14px 36px color-mix(in srgb, var(--tb-gold) 15%, transparent)] !important;}\n[class*="shadow-[0_16px_50px_-12px_rgba(212,175,55,0.55)]"]{box-shadow:[0 16px 50px -12px color-mix(in srgb, var(--tb-gold) 55%, transparent)] !important;}\n[class*="shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_24px_rgba(212,175,55,0.08)]"]{box-shadow:[0 16px 50px rgba(0,0,0,0.6),0 0 24px color-mix(in srgb, var(--tb-gold) 8%, transparent)] !important;}\n[class*="shadow-[0_24px_80px_-24px_rgba(212,175,55,0.45)]"]{box-shadow:[0 24px 80px -24px color-mix(in srgb, var(--tb-gold) 45%, transparent)] !important;}\n[class*="shadow-[0_24px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(212,175,55,0.16)]"]{box-shadow:[0 24px 80px rgba(0,0,0,0.75),0 0 60px color-mix(in srgb, var(--tb-gold) 16%, transparent)] !important;}\n[class*="shadow-[0_2px_10px_rgba(212,175,55,0.3)]"]{box-shadow:[0 2px 10px color-mix(in srgb, var(--tb-gold) 30%, transparent)] !important;}\n[class*="shadow-[0_2px_12px_rgba(212,175,55,0.4)]"]{box-shadow:[0 2px 12px color-mix(in srgb, var(--tb-gold) 40%, transparent)] !important;}\n[class*="shadow-[0_2px_14px_rgba(212,175,55,0.4)]"]{box-shadow:[0 2px 14px color-mix(in srgb, var(--tb-gold) 40%, transparent)] !important;}\n[class*="shadow-[0_3px_14px_rgba(212,175,55,0.3)]"]{box-shadow:[0 3px 14px color-mix(in srgb, var(--tb-gold) 30%, transparent)] !important;}\n[class*="shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(212,175,55,0.12)]"]{box-shadow:[0 40px 120px rgba(0,0,0,0.8),0 0 80px color-mix(in srgb, var(--tb-gold) 12%, transparent)] !important;}\n[class*="shadow-[0_4px_16px_rgba(212,175,55,0.35)]"]{box-shadow:[0 4px 16px color-mix(in srgb, var(--tb-gold) 35%, transparent)] !important;}\n[class*="shadow-[0_8px_24px_-10px_rgba(212,175,55,0.7)]"]{box-shadow:[0 8px 24px -10px color-mix(in srgb, var(--tb-gold) 70%, transparent)] !important;}\n[class*="shadow-[0_8px_24px_-8px_rgba(212,175,55,0.6)]"]{box-shadow:[0 8px 24px -8px color-mix(in srgb, var(--tb-gold) 60%, transparent)] !important;}\n[class*="shadow-[0_8px_28px_-8px_rgba(212,175,55,0.6)]"]{box-shadow:[0 8px 28px -8px color-mix(in srgb, var(--tb-gold) 60%, transparent)] !important;}\n[class*="shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,175,55,0.4)]"]{box-shadow:[0 8px 28px rgba(0,0,0,0.5),0 0 0 1px color-mix(in srgb, var(--tb-gold) 40%, transparent)] !important;}\n[class*="shadow-[0_8px_32px_-12px_rgba(212,175,55,0.5)]"]{box-shadow:[0 8px 32px -12px color-mix(in srgb, var(--tb-gold) 50%, transparent)] !important;}\n[class*="shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]"]{box-shadow:[inset 0 0 0 1px color-mix(in srgb, var(--tb-gold) 25%, transparent)] !important;}\n[class*="shadow-[inset_0_0_12px_rgba(212,175,55,0.15)]"]{box-shadow:[inset 0 0 12px color-mix(in srgb, var(--tb-gold) 15%, transparent)] !important;}`;
  el.textContent = css;
}

// Push the theme into :root vars so every surface re-themes live.
export function applyWhiteLabel(t = {}) {
  if (typeof document === 'undefined') return;
  const th = { ...WL_DEFAULTS, ...t };
  const root = document.documentElement;
  const accent = th.accentColor || WL_DEFAULTS.accentColor;
  root.style.setProperty('--tb-gold', accent);
  root.style.setProperty('--tb-gold-hi', mix(accent, [255, 255, 255], 0.45));
  root.style.setProperty('--tb-gold-deep', mix(accent, [0, 0, 0], 0.35));
  root.style.setProperty('--tb-gold-glow', rgba(accent, 0.4));
  root.style.setProperty('--wl-ink', th.headingColor || WL_DEFAULTS.headingColor);
  root.style.setProperty('--wl-body', th.bodyColor || WL_DEFAULTS.bodyColor);
  root.style.setProperty('--wl-muted', th.mutedColor || WL_DEFAULTS.mutedColor);
  root.setAttribute('data-whitelabel', th.companyName || 'TradingBible');
  applyAccentOverride();
  try { window.dispatchEvent(new Event('tb:theme-changed')); } catch { /* ignore */ }
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
// Always installs the accent override so one-click themes recolor the full
// app even on the default brand.
export function bootWhiteLabel() {
  const t = loadLocalTheme();
  applyWhiteLabel(t || WL_DEFAULTS);
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
