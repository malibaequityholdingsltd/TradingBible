import React, { useState } from 'react';
import { Star, Check, Plus } from 'lucide-react';
import { useWatchlists } from '@/hooks/useWatchlists';

// Compact "add this symbol to a watchlist" dropdown, usable from charts/heatmaps.
export default function AddToWatchlist({ symbol }) {
  const { lists, addSymbol, createList } = useWatchlists();
  const [open, setOpen] = useState(false);

  const handleAdd = async (id) => { await addSymbol(id, symbol); setOpen(false); };
  const handleNew = async () => {
    const rec = await createList('Favorites', [symbol]).catch(() => null);
    if (rec) setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/20 px-2.5 py-1.5 text-xs text-[#d4af37] transition hover:border-[#d4af37]/50">
        <Star className="h-3.5 w-3.5" /> Watchlist
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14] p-1.5 shadow-xl">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#5f5b50]">Add {symbol} to…</div>
            {lists.length === 0 && <button onClick={handleNew} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[#d4af37] hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> New "Favorites" list</button>}
            {lists.map((l) => {
              const has = (Array.isArray(l.symbols) ? l.symbols : []).includes(symbol);
              return (
                <button key={l.id} disabled={has} onClick={() => handleAdd(l.id)} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${has ? 'text-emerald-400' : 'text-[#e9e7df] hover:bg-white/5'}`}>
                  <span className="truncate">{l.name}</span>{has ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 text-[#d4af37]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
