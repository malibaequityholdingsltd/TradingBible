import React, { useMemo, useState } from 'react';
import { Clapperboard, Radio, Search, Tv } from 'lucide-react';
import { TV_PROVIDERS, TV_PROVIDER_STATUS, TV_STREAMING_SERVICES } from '@/lib/tvProviders';
import { useI18n } from '@/lib/i18n';

const STATUS_STYLES = {
  inactive: 'border-white/10 bg-white/[0.04] text-[#8a8577]',
  uncertain: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  restricted: 'border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#38bdf8]',
};

function StatusBadge({ status, t }) {
  if (!status) return null;
  const key = TV_PROVIDER_STATUS[status];
  const fallback = status === 'inactive'
    ? 'Inactive'
    : status === 'uncertain'
      ? 'Availability uncertain'
      : 'Region restricted';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLES[status] || STATUS_STYLES.inactive}`}>
      {t(key, null, fallback)}
    </span>
  );
}

function ServiceRow({ item, t, streaming = false }) {
  const Icon = streaming ? Clapperboard : (item.type || '').toLowerCase().includes('digital') ? Tv : Radio;
  return (
    <div className="tv-guide-row grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:px-4">
      <span className="pt-0.5 font-mono text-[11px] tabular-nums text-[#8a8577] sm:pt-0">{String(item.no).padStart(2, '0')}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-semibold leading-tight text-[#f0ecdd]">{item.name}</span>
          <StatusBadge status={item.status} t={t} />
        </div>
        <span className="mt-1 block text-[11px] leading-relaxed text-[#8a8577] sm:hidden">{item.type}</span>
      </div>
      <span className="hidden truncate text-[11px] text-[#c9c4b4] sm:block">{item.type}</span>
      <span className="hidden justify-self-end text-[#8a8577] sm:flex" aria-hidden>
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export default function TvProviderGuide() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();
  const providers = useMemo(() => TV_PROVIDERS.filter((item) => {
    if (!normalized) return true;
    return `${item.no} ${item.name} ${item.type}`.toLowerCase().includes(normalized);
  }), [normalized]);
  const streaming = useMemo(() => TV_STREAMING_SERVICES.filter((item) => {
    if (!normalized) return true;
    return `${item.no} ${item.name} ${item.type}`.toLowerCase().includes(normalized);
  }), [normalized]);
  const total = providers.length + streaming.length;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <label className="tv-guide-search flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#8a8577]" aria-hidden />
          <span className="sr-only">{t('tv.searchProviders', null, 'Search providers or types')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('tv.searchProviders', null, 'Search providers or types…')}
            className="w-full bg-transparent text-[12px] text-[#f0ecdd] outline-none placeholder:text-[#8a8577]"
          />
        </label>
        <span className="shrink-0 rounded-full border border-[#d4af37]/15 bg-[#d4af37]/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-[#c9c4b4]">
          {t('tv.serviceCount', { n: total }, `${total} services`)}
        </span>
      </div>

      <div className="mt-3 hidden shrink-0 grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 border-b border-white/[0.07] px-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#6a665a] sm:grid">
        <span>{t('tv.colNo', null, 'No.')}</span>
        <span>{t('tv.colProvider', null, 'Provider')}</span>
        <span>{t('tv.colType', null, 'Type')}</span>
        <span className="justify-self-end">{t('tv.colStatus', null, 'Status')}</span>
      </div>

      <div className="no-scrollbar scroll-contain mt-1 flex-1 space-y-1.5 overflow-y-auto pb-2">
        {providers.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {t('tv.tvProviders', null, 'TV providers')}
              <span className="font-mono text-[9px] tracking-normal text-[#6a665a]">{providers.length}</span>
            </div>
            {providers.map((item) => <ServiceRow key={`tv-${item.no}`} item={item} t={t} />)}
          </>
        )}

        {streaming.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden />
              {t('tv.streamingServices', null, 'Streaming services')}
              <span className="font-mono text-[9px] tracking-normal text-[#6a665a]">{streaming.length}</span>
            </div>
            {streaming.map((item) => <ServiceRow key={`stream-${item.no}`} item={item} t={t} streaming />)}
          </>
        )}

        {total === 0 && (
          <p className="px-2 py-8 text-center text-xs text-[#8a8577]">{t('tv.noProviders', null, 'No providers match your search.')}</p>
        )}

        <p className="px-1 pb-1 pt-3 text-[10px] leading-relaxed text-[#6a665a]">
          {t('tv.providerDisclaimer', null, 'Availability and channel line-ups are controlled by each provider and vary by country, package and date. TradingBible does not rebroadcast or sell these services.')}
        </p>
      </div>
    </div>
  );
}
