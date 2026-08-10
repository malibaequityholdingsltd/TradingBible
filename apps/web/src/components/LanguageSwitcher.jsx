import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useI18n, SUPPORTED_LANGS } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Floating language picker — always reachable from the app header.
export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t('lang.switcher')}
          title={t('lang.switcher')}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60 ${className}`}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden text-xs font-medium uppercase sm:inline">{lang}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[80] max-h-[70vh] w-44 overflow-y-auto border-[#d4af37]/15 bg-[#111113] text-[#e9e7df]">
        <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{t('lang.switcher')}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          onClick={() => setLang('auto')}
          className={`min-h-[44px] cursor-pointer gap-2.5 ${lang ? '' : ''}`}
        >
          <span className="flex-1">{t('lang.auto')} — {SUPPORTED_LANGS.find((l) => l.code === detectNow())?.label}</span>
          {!localStorage.getItem('tb_lang') && <Check className="h-4 w-4 text-[#d4af37]" />}
        </DropdownMenuItem>
        {SUPPORTED_LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="min-h-[44px] cursor-pointer gap-2.5"
          >
            <span className="flex-1">{l.label}</span>
            {lang === l.code && <Check className="h-4 w-4 text-[#d4af37]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function detectNow() {
  try {
    return (navigator.language || 'en').toLowerCase().split('-')[0];
  } catch {
    return 'en';
  }
}