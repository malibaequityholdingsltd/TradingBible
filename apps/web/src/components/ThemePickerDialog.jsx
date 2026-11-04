// One-click app theme picker — a real dialog instead of a hover submenu,
// so it opens reliably with touch, mouse and keyboard, in dark and light.
import React from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WL_PRESETS } from '@/lib/whitelabel';

export default function ThemePickerDialog({ open, onOpenChange, activeId, onPick }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-picker-dialog tb-card max-w-sm border border-[var(--ex-line)] bg-[var(--ex-panel)] text-[var(--ex-text)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--ex-text)]">App theme</DialogTitle>
        </DialogHeader>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ex-muted)]">
          One tap recolors the full app — buttons, text, borders and charts accents — in dark and light.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {WL_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => { onPick?.(pr); onOpenChange?.(false); }}
              className={`theme-option flex min-h-[64px] items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition hover:-translate-y-px active:scale-[0.98] ${activeId === pr.id ? 'theme-option--active border-[var(--ex-accent)] bg-[var(--ex-panel-2)]' : 'border-[var(--ex-line)] bg-[var(--ex-panel-2)] hover:border-[var(--ex-line-2)]'}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-extrabold ring-1 ring-black/20" style={{ background: pr.accentColor, color: pr.primaryColor }}>Aa</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-xs font-bold text-[var(--ex-text)]">{pr.label}{pr.id === 'tb-gold' && <span className="shrink-0 rounded bg-[var(--ex-accent)]/15 px-1 py-px font-mono text-[9px] font-extrabold uppercase tracking-wider text-[var(--ex-accent)]">Default</span>}</span>
                <span className="block font-mono text-[10px] text-[var(--ex-faint)]">{pr.accentColor}</span>
              </span>
              {activeId === pr.id && <span className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ex-accent)]"><Check className="h-3 w-3 text-[var(--ex-accent-ink)]" strokeWidth={3} /></span>}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
