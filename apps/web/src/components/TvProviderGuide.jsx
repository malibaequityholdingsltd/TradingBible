import React, { useMemo, useState } from 'react';
import { Clapperboard, Radio, Search, Tv } from 'lucide-react';
import { TV_PROVIDERS, TV_PROVIDER_STATUS, TV_STREAMING_SERVICES } from '@/lib/tvProviders';
import { useI18n } from '@/lib/i18n';

const STATUS_STYLES = {
  inactive: 'border-white/10 bg-white/[0.04] text-[#8a8577]',
  uncertain: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  restricted: 'border-[#38bdf8]/25 bg-[#38bdf8]/10 text-[#38bdf8]',
};

const PROVIDER_COLORS = {
  DStv: '#2f8cff',
  GOtv: '#8cc63f',
  StarTimes: '#f58220',
  'SLTV (Metro Digital)': '#e30613',
  'TStv Africa': '#8b95a5',
  'Luft Pay TV': '#d4af37',
  'FreeTV Nigeria': '#0ea5e9',
  'Strong TV / Free-to-Air': '#16a34a',
  'Canal+': '#e11d48',
  'Zuku TV': '#7c3aed',
  'Azam TV': '#dc2626',
  StarSat: '#f59e0b',
  Openview: '#14b8a6',
  'Metro Digital TV': '#6366f1',
  'Consat TV': '#0f766e',
  Netflix: '#e50914',
  'Amazon Prime Video': '#00a8e1',
  'DStv Stream': '#2f8cff',
  'StarTimes ON': '#f58220',
  'YouTube TV': '#ff0000',
  'Apple TV': '#a3a3a3',
  'Pluto TV': '#facc15',
};

function initials(name) {
  const words = String(name || '')
    .replace(/[()+/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function StatusBadge({ status, t }) {
  if (!status) return null;
  const key = TV_PROVIDER_STATUS[status];
  const fallback = status === 'inactive'
    ? 'Inactive'
    : status === 'uncertain'
      ? 'Availability uncertain'
      : 'Region restricted';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLES[status] || STATUS_STYLES.inactive}`}>
      {t(key, null, fallback)}
    </span>
  );
}

function ProviderCard({ item, t, streaming = false }) {
  const accent = PROVIDER_COLORS[item.name] || '#d4af37';
  const Icon = streaming ? Clapperboard : (item.type || '').toLowerCase().includes('digital') ? Tv : Radio;
  return (
    <article className="tv-provider-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition-colors hover:border-[#d4af37]/35 hover:bg-[#d4af37]/[0.045]">
      <div className="flex items-start gap-2.5">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-[12px] font-black tracking-tight"
          style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}18` }}
          aria-hidden
        >
          {initials(item.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[12px] font-semibold leading-tight text-[#f0ecdd]">{item.name}</h3>
          <p className="mt-1 truncate text-[10px] leading-snug text-[#8a8577]">{item.type}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#6a665a]">
          <Icon className="h-3 w-3" aria-hidden />
          {streaming ? t('tv.streaming', null, 'Streaming') : t('tv.liveTv', null, 'TV')}
        </span>
        <StatusBadge status={item.status} t={t} />
      </div>
    </article>
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

      <div className="no-scrollbar scroll-contain mt-3 flex-1 space-y-5 overflow-y-auto pb-2">
        {providers.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {t('tv.tvProviders', null, 'TV providers')}
              <span className="font-mono text-[9px] tracking-normal text-[#6a665a]">{providers.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {providers.map((item) => <ProviderCard key={`tv-${item.no}`} item={item} t={t} />)}
            </div>
          </section>
        )}

        {streaming.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden />
              {t('tv.streamingServices', null, 'Streaming services')}
              <span className="font-mono text-[9px] tracking-normal text-[#6a665a]">{streaming.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {streaming.map((item) => <ProviderCard key={`stream-${item.no}`} item={item} t={t} streaming />)}
            </div>
          </section>
        )}

        {total === 0 && (
          <p className="px-2 py-8 text-center text-xs text-[#8a8577]">{t('tv.noProviders', null, 'No providers match your search.')}</p>
        )}

        <p className="px-1 pb-1 pt-1 text-[10px] leading-relaxed text-[#6a665a]">
          {t('tv.providerDisclaimer', null, 'Availability and channel line-ups are controlled by each provider and vary by country, package and date. TradingBible does not rebroadcast or sell these services.')}
        </p>
      </div>
    </div>
  );
}
