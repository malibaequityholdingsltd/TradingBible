import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { SYMBOL_GROUPS } from '@/lib/symbols';
import { useI18n } from '@/lib/i18n';

// Searchable pair picker shared by every charting surface (LiveChart,
// ChartPanel, Indicators, Alerts). Type a symbol or name to jump straight
// to it instead of scrolling through hundreds of pairs.
export default function SymbolSearchPicker({ value, onChange, buttonClassName = '', dropdownClassName = '' }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open ]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open ]);

  const query = q.trim().toLowerCase();
  const groups = SYMBOL_GROUPS.map((g) => ({
    ...g,
    items: query
      ? g.symbols.filter((s) => `${s.symbol} ${s.name}`.toLowerCase().includes(query))
      : g.symbols,
  })).filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2.5 py-1 text-xs font-medium text-[#e9e7df] ${buttonClassName}`}
      >
        <span className="font-mono">{value}</span> <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className={`absolute left-0 z-30 mt-1 flex max-h-80 w-64 flex-col overflow-hidden rounded-xl border border-[#d4af37]/15 bg-[#0d0d12]/90 shadow-xl backdrop-blur-xl ${dropdownClassName}`}>
            <div className="relative border-b border-[#d4af37]/10 p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8577]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('hm.searchPh', null, 'Search pairs…')}
                className="w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] py-1.5 pl-8 pr-2 text-xs text-[#e9e7df] outline-none placeholder:text-[#5f5b50] focus:border-[#d4af37]/40"
              />
            </div>
            <div className="overflow-y-auto p-2 no-scrollbar">
              {total === 0 && (
                <p className="px-2 py-4 text-center text-xs text-[#8a8577]">{t('c.noResults', null, 'No pairs match your search.')}</p>
              )}
              {groups.map((g) => (
                <div key={g.label} className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5f5b50]">{g.label}</div>
                  {g.items.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => { onChange(s.symbol); setOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-white/5 ${value === s.symbol ? 'text-[#d4af37]' : 'text-[#c9c4b4]'}`}
                    >
                      <span className="font-mono">{s.symbol}</span><span className="ml-2 truncate text-[10px] text-[#8a8577]">{s.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
