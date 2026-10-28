import React from 'react';
import { brandLogo } from '@/lib/brand';

/** @typedef {Object} LogoProps
 * @property {'primary'|'wordmark'} [variant]
 * @property {number|string} [size]
 * @property {string} [className]
 * @property {string} [alt]
 * @property {boolean} [showText]
 * @property {number} [textSize]
 */

function LogoSVG({ width, height, className }) {
  return (
    <div
      className={className}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: brandLogo.svg }}
      aria-hidden="true"
    />
  );
}

/**
 * The brand split is deliberate: "Trading" follows the active theme so it
 * stays legible, while "Bible" stays brand gold in both themes.
 */
export function BrandName({ name = 'TradingBible', className = '', style }) {
  const brand = String(name || 'TradingBible').trim() || 'TradingBible';
  const match = brand.match(/^(.*?)(Bible)(.*)$/i);

  if (match) {
    return (
      <span className={`brand-wordmark ${className}`} style={style}>
        <span className="brand-wordmark__lead">{match[1]}</span>
        <span className="brand-wordmark__gold">{match[2]}</span>
        {match[3] && <span className="brand-wordmark__tail">{match[3]}</span>}
      </span>
    );
  }

  const words = brand.split(/\s+/);
  if (words.length > 1) {
    const tail = words.pop();
    return (
      <span className={`brand-wordmark ${className}`} style={style}>
        <span className="brand-wordmark__lead">{words.join(' ')} </span>
        <span className="brand-wordmark__gold">{tail}</span>
      </span>
    );
  }

  return <span className={`brand-wordmark ${className}`} style={style}>{brand}</span>;
}

export function BrandLogo({
  variant = 'primary',
  size = 32,
  className = '',
  alt,
  showText = false,
  textSize,
}) {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size}px` : size;

  const logoClass = `inline-flex items-center justify-center ${className}`;
  const textClass = `ml-2 font-extrabold tracking-tight ${showText ? '' : 'hidden'}`;

  if (showText) {
    return (
      <span className={logoClass} style={{ width: 'auto', height }}>
        <LogoSVG width={width} height={height} />
        <BrandName name={brandLogo.name} className={textClass} style={{ fontSize: textSize || size * 0.4 }} />
      </span>
    );
  }

  return (
    <span className={logoClass} style={{ width, height }}>
      <LogoSVG width={width} height={height} />
    </span>
  );
}

// Wordmark: logo + name inline
export function BrandWordmark({
  size = 28,
  className = '',
  showTagline = false,
  tagline = 'TradingBible',
}) {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size}px` : size;
  const fontSize = typeof size === 'number' ? size * 0.45 : '1rem';
  const taglineSize = typeof size === 'number' ? size * 0.22 : '0.6rem';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ height }}>
      <LogoSVG width={width} height={height} />
      <span className="flex flex-col leading-none min-w-0">
        <BrandName name="TradingBible" className="font-extrabold tracking-tight truncate" style={{ fontSize }} />
        {showTagline && (
          <span className="uppercase tracking-[0.15em] text-[#8a8577] truncate" style={{ fontSize: taglineSize }}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

// Favicon / app icon helper
export function Favicon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#0a0a0f"/>
      <rect x="1" y="1" width="30" height="30" rx="7" stroke="#d4af37" strokeWidth="1.5"/>
      <path d="M16 6L24 16L16 26" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 16H24" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="4" fill="#d4af37"/>
    </svg>
  );
}

// Legacy compatibility exports
export const TRADINGBIBLE_LOGO = brandLogo.url;
export const TESTIMONIALS = [
  {
    quote: 'TradingBible turned my scattered notes into a real process. The SI review flags mistakes I never noticed myself making.',
    qk: 'abt.tm1q',
    name: 'Sofia R.',
    role: 'Full-time forex trader',
    rk: 'abt.tm1r',
  },
  {
    quote: 'The broker sync and analytics feel genuinely institutional. It is the first journal that keeps up with my volume.',
    qk: 'abt.tm2q',
    name: 'Daniel K.',
    role: 'Crypto swing trader',
    rk: 'abt.tm2r',
  },
  {
    quote: 'Discipline scoring changed how I review. Fewer revenge trades, tighter risk, calmer sessions.',
    qk: 'abt.tm3q',
    name: 'Aisha B.',
    role: 'Prop firm trader',
    rk: 'abt.tm3r',
  },
];