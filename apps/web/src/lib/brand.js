// TradingBible Brand System — Single source of truth for name, logo, colors, copy
// Change here to rebrand the entire app

export const BRAND = {
  // Core identity
  name: 'TradingBible',
  shortName: 'TB',
  tagline: 'TradingBible',

  // Legal entity
  legalName: 'TradingBible LLC',
  legalEntity: 'TradingBible LLC',

  // Logo assets (SVG preferred for crisp scaling)
  logo: {
    // Primary logo - SVG markup for inline use (crisp at any size)
    svg: `
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#0a0a0f"/>
        <rect x="1" y="1" width="30" height="30" rx="7" stroke="#d4af37" stroke-width="1.5"/>
        <path d="M16 6L24 16L16 26" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 16H24" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="4" fill="#d4af37"/>
      </svg>
    `,
    // Fallback external URL (CDN)
    url: 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png',
    // Dark mode variant (if needed)
    urlDark: 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png',
  },

  // Color palette
  colors: {
    gold: '#d4af37',
    goldLight: '#f4e6a8',
    goldDark: '#a67c1e',
    goldGlow: 'rgba(212, 175, 55, 0.4)',
    dark: '#0a0a0f',
    darkElevated: '#0c0c11',
    darkCard: '#0f0f14',
    text: '#f0ecdd',
    textMuted: '#8a8577',
    textDim: '#6a665a',
    border: '#ffffff0d',
    borderGold: '#d4af37',
    success: '#34d399',
    error: '#fb7185',
    live: '#e50914',
  },

  // Typography scale
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },

  // Spacing scale (4px base)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Border radius
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    gold: '0 12px 40px -12px rgba(212, 175, 55, 0.45)',
    goldSm: '0 4px 16px -4px rgba(212, 175, 55, 0.3)',
    card: '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
  },

  // Animation durations
  transition: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
  },

  // Contact
  contact: {
    supportEmail: 'support@tradingbible.app',
    legalEmail: 'legal@tradingbible.app',
    privacyEmail: 'privacy@tradingbible.app',
    adsEmail: 'ads@tradingbible.app',
  },

  // Social / external
  urls: {
    website: 'https://tradingbible.app',
    twitter: 'https://twitter.com/tradingbible',
    discord: 'https://discord.gg/tradingbible',
    github: 'https://github.com/tradingbible',
  },
};

// Type-safe accessors
export const brand = BRAND;
export const brandName = BRAND.name;
export const brandShortName = BRAND.shortName;
export const brandTagline = BRAND.tagline;
export const brandLegalName = BRAND.legalName;
export const brandColors = BRAND.colors;
export const brandLogo = BRAND.logo;