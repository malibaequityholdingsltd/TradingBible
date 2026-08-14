import React from 'react';

// Premium page hero used across the terminal: icon chip + description +
// optional actions. Replaces the plain one-line intro paragraphs.
export default function PageHeader({ icon: Icon, kicker, description, actions, className = '' }) {
  return (
    <div className={`tint-hero mb-6 flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl border border-[#d4af37]/15 p-4 sm:p-5 ${className}`}>
      <div className="flex max-w-3xl items-start gap-3.5">
        {Icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10 shadow-[0_0_24px_-6px_rgba(212,175,55,0.4)]">
            <Icon className="h-5 w-5 text-[#d4af37]" />
          </div>
        )}
        <div>
          {kicker && <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]">{kicker}</div>}
          <p className="text-sm leading-relaxed text-[#c9c4b4]">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
