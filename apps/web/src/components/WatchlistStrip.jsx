import React, { useState } from 'react';
import { Star, Plus } from 'lucide-react';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useQuotes } from '@/hooks/useQuotes';
import { useI18n } from '@/lib/i18n';

// Horizontal watchlist strip with live prices. Selecting a symbol drives the
// connected chart (two-way synced via active/onSelect). Used on Charts.
// `bare` renders content without the outer card for embedding in a deck.
export default function WatchlistStrip({ active, onSelect, bare }) {
  const { lists, loading, createList } = useWatchlists();
  const { t } = useI18n();
  const [listId, setListId] = useState(null);

  const list = (lists || []).find((l) => l.id === listId) || (lists || [])[0] || null;
  const syms = Array.isArray(list?.symbols) ? list.symbols : [];
  const { quotes } = useQuotes(syms, { refreshMs: 15000 });

  const ensureList = async () => {
    const rec = await createList('Favorites', active ? [active] : []).catch(() => null);
    if (rec) setListId(rec.id);
  };

  const body = (
    <>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8a8577]">
          <Star className="h-3.5 w-3.5 text-[#d4af37]" /> {t('nav.watchlists')}
        </span>
        {(lists || []).length > 1 && (
          <select
            value={list?.id || ''}
            onChange={(e) => setListId(e.target.value)}
            className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1 text-xs text-[#e9e7df] outline-none"
          >
            {(lists || []).map((l) => <option key={l.id} value={l.id} className="bg-[#0f0f14]">{l.name}</option>)}
          </select>
        )}
        <span className="ml-auto text-[10px] text-[#5f5b50]">{syms.length > 0 ? `${syms.length} symbols · tap to chart` : ''}</span>
      </div>

      {loading ? (
        <p className="py-3 text-center text-xs text-[#8a8577]">{t('c.loading')}</p>
      ) : syms.length === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-[#8a8577]">{t('wl.noSymbols')}</p>
          <button onClick={ensureList} className="flex items-center gap-1 rounded-lg border border-[#d4af37]/25 px-2.5 py-1.5 text-xs text-[#d4af37] transition hover:bg-[#d4af37]/10">
            <Plus className="h-3.5 w-3.5" /> {t('wl.createNew')}
          </button>
        </div>
      ) : (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {syms.map((s) => {
            const q = quotes[s];
            const up = (q?.changePercent || 0) >= 0;
            const isActive = s === active;
            return (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className={`min-w-[118px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${isActive ? 'border-[#d4af37]/60 bg-[#d4af37]/10' : 'border-[#d4af37]/12 bg-white/[0.02] hover:border-[#d4af37]/40'}`}
              >
                <span className={`block truncate font-mono text-xs font-bold ${isActive ? 'text-[#d4af37]' : 'text-[#f0ecdd]'}`}>{s}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-[#e9e7df]">
                  {q?.price != null ? q.price : '—'}{' '}
                  <span className={up ? 'text-emerald-400' : 'text-red-400'}>
                    {q?.changePercent != null ? `${up ? '+' : ''}${q.changePercent}%` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (bare) return <>{body}</>;
  return (
    <div className="glass rounded-2xl p-3 sm:p-4">
      {body}
    </div>
  );
}
