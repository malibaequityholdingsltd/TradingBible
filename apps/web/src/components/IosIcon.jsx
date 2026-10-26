import React from 'react';

/* One icon language for the whole product.
 *
 * A quiet tinted tile with a hairline edge and an accent glyph. Tints are
 * muted so navigation and content icons feel related without turning into a
 * rainbow of app-store badges. Pass `tone` for a named colour, `tint` for an
 * exact hex, or a `seed` (usually the label) to pick a stable muted tint.
 */
export const IOS_TINTS = {
  blue: '#5B8DEF',
  orange: '#E8A44C',
  purple: '#9B7EDE',
  green: '#45BE96',
  gray: '#8B93A1',
  teal: '#4DB6AC',
  pink: '#E8789A',
  red: '#E56767',
  indigo: '#6F7DE8',
  brown: '#A98467',
  yellow: '#DDB44A',
  mint: '#63CDBD',
  cyan: '#4FAFD1',
  sky: '#6CB8E8',
  white: '#D8DCE3',
  gold: '#C6A14A',
  amber: '#D99A3E',
  warning: '#D98236',
  theme: 'var(--tb-gold, #D4AF37)',
};

export const IOS_TONE_ORDER = [
  'blue', 'orange', 'purple', 'green', 'pink', 'teal',
  'indigo', 'red', 'mint', 'brown', 'yellow', 'cyan',
];

export function iosToneFor(seed = '') {
  let hash = 0;
  const text = String(seed || 'tradingbible');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return IOS_TONE_ORDER[hash % IOS_TONE_ORDER.length];
}

export function iosTintFor(seed = '') {
  return IOS_TINTS[iosToneFor(seed)];
}

export function IosIcon({
  icon: Icon,
  tone,
  tint,
  seed,
  size = 'md',
  glyph,
  strokeWidth = 2,
  className = '',
  iconClassName = '',
  title,
  children,
  ...rest
}) {
  const resolvedTone = tone && IOS_TINTS[tone] ? tone : (seed ? iosToneFor(seed) : 'blue');
  const color = tint || IOS_TINTS[resolvedTone] || IOS_TINTS.blue;
  const explicitGlyph = typeof glyph === 'string' && glyph.startsWith('#') ? glyph : null;
  const glyphColor = explicitGlyph
    || (glyph === 'dark' || glyph === true ? '#1C1C1E' : null)
    || (glyph === 'light' ? '#FFFFFF' : null)
    || (resolvedTone === 'theme' ? 'var(--tb-theme-glyph, var(--tb-gold))' : 'var(--ios-ink)');

  return (
    <span
      className={`ios-icon ios-icon--${size} ${className}`}
      style={{ '--ios-tint': color, '--ios-glyph': glyphColor }}
      title={title}
      data-ios-tone={resolvedTone}
      {...rest}
    >
      {Icon && <Icon className={`ios-icon-glyph ${iconClassName}`} strokeWidth={strokeWidth} aria-hidden />}
      {!Icon && children != null && <span className="ios-icon-content">{children}</span>}
    </span>
  );
}

export default IosIcon;
