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
  const textClass = `ml-2 font-extrabold tracking-tight text-[#f0ecdd] ${showText ? '' : 'hidden'}`;

  if (showText) {
    return (
      <span className={logoClass} style={{ width: 'auto', height }}>
        <LogoSVG width={width} height={height} />
        <span className={textClass} style={{ fontSize: textSize || size * 0.4 }}>
          {brandLogo.name}
        </span>
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
  tagline = 'maliba-admin',
}) {
  const width = typeof size === 'number' ? `${size}px` : size;
  const height = typeof size === 'number' ? `${size}px` : size;
  const fontSize = typeof size === 'number' ? size * 0.45 : '1rem';
  const taglineSize = typeof size === 'number' ? size * 0.22 : '0.6rem';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ height }}>
      <LogoSVG width={width} height={height} />
      <span className="flex flex-col leading-none min-w-0">
        <span className="font-extrabold tracking-tight text-[#f0ecdd] truncate" style={{ fontSize }}>
          Trading<span className="text-[#d4af37]">Bible</span>
        </span>
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
export const TESTIMONIALS = [];