import React from 'react';

/* One icon language for the whole product.
 *
 * iOS-style app tiles: a vivid squircle, a soft top gloss and a crisp white
 * glyph. Tints come from the Apple system palette so the nav, feature cards,
 * empty states and landing page all feel like the same operating system.
 * Pass `tone` for a named Apple colour, or `tint` for an exact hex. When
 * neither is supplied the seed (usually the label/title) picks a stable tint.
 */
export const IOS_TINTS = {
  blue: '#0A84FF',
  orange: '#FF9F0A',
  purple: '#BF5AF2',
  green: '#30D158',
  gray: '#8E8E93',
  teal: '#64D2FF',
  pink: '#FF375F',
  red: '#FF453A',
  indigo: '#5E5CE6',
  brown: '#AC8E68',
  yellow: '#FFD60A',
  mint: '#63E6E2',
  cyan: '#32ADE6',
  sky: '#5AC8FA',
  white: '#F2F2F7',
};

export const IOS_TONE_ORDER = [
  'blue', 'orange', 'purple', 'green', 'pink', 'teal',
  'indigo', 'red', 'mint', 'brown', 'yellow', 'cyan',
];

const DARK_GLYPH_TONES = new Set(['yellow', 'mint', 'teal', 'gray', 'white']);

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
  const darkGlyph = glyph === 'dark' || glyph === true || (!glyph && DARK_GLYPH_TONES.has(resolvedTone));
  const glyphColor = darkGlyph ? '#1C1C1E' : (typeof glyph === 'string' && glyph.startsWith('#') ? glyph : '#FFFFFF');

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
