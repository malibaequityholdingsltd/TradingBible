// One-click app theme picker — a real dialog instead of a hover submenu,
// so it opens reliably with touch, mouse and keyboard, in dark and light.
import React from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WL_PRESETS } from '@/lib/whitelabel';

export default function ThemePickerDialog({ open, onOpenChange, activeId, onPick }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tb-card max-w-sm border-[#d4af37]/20 bg-[#0c0c11] text-[#e9e7df]">
        <DialogHeader>
          <DialogTitle className="text-[#f0ecdd]">App theme</DialogTitle>
        </DialogHeader>
        <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">
          One tap recolors the full app — buttons, text, borders and charts accents — in dark and light.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {WL_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => { onPick?.(pr); onOpenChange?.(false); }}
              className={`flex min-h-[64px] items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition hover:-translate-y-px active:scale-[0.98] ${activeId === pr.id ? 'border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/[0.12] to-[#d4af37]/[0.03] shadow-[0_0_20px_-8px_rgba(212,175,55,0.6)]' : 'border-white/10 bg-white/[0.02] hover:border-[#d4af37]/35'}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-extrabold ring-1 ring-black/20" style={{ background: pr.accentColor, color: pr.primaryColor }}>Aa</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-xs font-bold text-[#f0ecdd]">{pr.label}{pr.id === 'tb-gold' && <span className="shrink-0 rounded bg-[#d4af37]/15 px-1 py-px font-mono text-[8px] font-extrabold uppercase tracking-wider text-[#d4af37]">Default</span>}</span>
                <span className="block font-mono text-[10px] text-[#6a665a]">{pr.accentColor}</span>
              </span>
              {activeId === pr.id && <span className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d4af37]"><Check className="h-3 w-3 text-[#0a0a0f]" strokeWidth={3} /></span>}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
