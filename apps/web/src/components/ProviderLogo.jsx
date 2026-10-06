import React, { useState } from 'react';

// Official brand logo with a two-stage fallback chain:
// Clearbit logo API → Google favicon service → colored initials tile.
// Nothing is bundled, so brand refreshes need no maintenance. If the network
// blocks logo services (strict CSP/offline), the initials tile shows instead.
export default function ProviderLogo({ domain, name, color, size = 44 }) {
  const [stage, setStage] = useState(0);
  const initials = (String(name || '?').match(/[A-Za-z0-9]/g) || ['?']).slice(0, 2).join('').toUpperCase();
  const px = { width: size, height: size };

  if (!domain || stage >= 2) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-xl font-mono font-bold"
        style={{ ...px, background: `${color || '#d4af37'}22`, color: color || '#d4af37', fontSize: size * 0.28 }}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  const src = stage === 0
    ? `https://logo.clearbit.com/${domain}?size=128`
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <img
      src={src}
      alt={`${name || 'provider'} logo`}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setStage((s) => s + 1)}
      className="shrink-0 rounded-xl bg-white object-contain"
      style={{ ...px, padding: size * 0.12 }}
    />
  );
}
