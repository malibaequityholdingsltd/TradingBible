// In-app prompt dialog — the branded replacement for native window.prompt
// everywhere user-facing. Native prompts look broken on phones and block
// the whole tab; this sheet matches the app theme in dark and light.
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoldButton, GhostButton } from '@/components/ui-kit';

export default function PromptDialog({
  open, onOpenChange, title, sub, label, placeholder,
  defaultValue = '', confirmLabel = 'Save', inputProps = {}, onSubmit,
}) {
  const [value, setValue] = useState(defaultValue || '');
  useEffect(() => { if (open) setValue(defaultValue || ''); }, [open, defaultValue]);
  const close = () => onOpenChange?.(false);
  const submit = (e) => {
    e?.preventDefault?.();
    onSubmit?.(value);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tb-card max-w-sm border-[#d4af37]/20 bg-[#0c0c11] text-[#e9e7df]">
        <DialogHeader>
          <DialogTitle className="text-[#f0ecdd]">{title}</DialogTitle>
        </DialogHeader>
        {sub && <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">{sub}</p>}
        <form onSubmit={submit} className="mt-3 space-y-3">
          {label && <label className="block text-xs font-semibold text-[#8a8577]">{label}</label>}
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50"
            {...inputProps}
          />
          <div className="flex gap-2">
            <GhostButton type="button" onClick={close} className="flex-1 !min-h-[44px] !py-2 !text-xs">Cancel</GhostButton>
            <GoldButton type="submit" className="flex-1 !min-h-[44px] !py-2 !text-xs">{confirmLabel}</GoldButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
