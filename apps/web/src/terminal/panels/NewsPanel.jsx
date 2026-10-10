// NewsPanel — the combined news desk: top high-impact Economic Calendar
// events for the symbol, live symbol headlines, and news TV channels with
// their subtitles. Shared by the Terminal Pro news view and the dock's
// news tab so both stay identical.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Tv, Flame } from 'lucide-react';
import { generateEvents } from '@/lib/econEvents';
import { useLiveChannels } from '@/lib/liveChannels';
import apiServerClient from '@/lib/apiServerClient';

export function useHeadlines(symbol) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!symbol) return undefined;
    let live = true;
    setLoading(true);
    apiServerClient.fetch(`/market-news?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => { if (live) setItems(d.headlines || []); })
      .catch(() => {})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [symbol]);
  return { items, loading };
}

export default function NewsPanel({ symbol, headlineLimit = 6, channelLimit = 8 }) {
  const highImpact = useMemo(() => {
    const now = Date.now() - 6 * 3600000;
    return generateEvents({ startOffset: -2, endOffset: 7 })
      .filter((e) => e.importance === 'high' && new Date(e.time).getTime() >= now && (!symbol || (e.affects || []).includes(symbol)))
      .slice(0, 5);
  }, [symbol]);
  const channels = useLiveChannels();
  const newsChannels = useMemo(() => channels.filter((c) => c.desk !== 'Music').slice(0, channelLimit), [channels, channelLimit]);
  const { items: headlines, loading: newsLoading } = useHeadlines(symbol);

  return (
    <div className="space-y-4">
      {/* High-impact economic events affecting this symbol */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
            <Flame className="h-3.5 w-3.5" /> High-impact · {symbol}
          </p>
          <Link to="/app/economic-calendar" className="shrink-0 text-xs font-semibold text-[#d4af37] hover:underline">Full calendar</Link>
        </div>
        {highImpact.length === 0
          ? <p className="term-muted text-[13px]">No high-impact events for {symbol} this week.</p>
          : (
            <div className="space-y-1">
              {highImpact.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-400/15 bg-red-400/[0.04] px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#e9e7df]">{e.name} <span className="text-[#8a8577]">({e.currency})</span></span>
                  <span className="shrink-0 font-mono text-[11px] text-[#8a8577]">
                    {new Date(e.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
      {/* Symbol headlines */}
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">Headlines · {symbol}</p>
        {headlines.length === 0
          ? (newsLoading
            ? <p className="term-muted text-[13px]">Loading {symbol} headlines…</p>
            : <p className="term-muted text-[13px]">No fresh headlines for {symbol} right now.</p>)
          : (
            <div className="space-y-1.5">
              {headlines.slice(0, headlineLimit).map((h, i) => (
                <a key={i} href={h.link} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3 rounded-lg px-1 py-1 hover:bg-white/[0.03]">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#c9c4b4] group-hover:text-[#f0ecdd]">{h.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-[#5f5b50]">
                    {h.pubDate ? new Date(h.pubDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              ))}
            </div>
          )}
      </div>
      {/* News TV channels with subtitles */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#d4af37]">
            <Tv className="h-3.5 w-3.5" /> News TV
          </p>
          <Link to="/tv" className="shrink-0 text-xs font-semibold text-[#d4af37] hover:underline">Watch live</Link>
        </div>
        <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
          {newsChannels.map((c) => (
            <Link key={c.id} to="/tv" className="group rounded-lg border border-white/8 bg-black/20 px-2.5 py-2 hover:border-[#d4af37]/30">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-[#f0ecdd] group-hover:text-[#d4af37]">{c.title}</span>
                <span className="ml-auto shrink-0 rounded bg-[#d4af37]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">{c.desk}</span>
              </span>
              {c.blurb ? <span className="mt-0.5 block truncate text-xs text-[#8a8577]">{c.blurb}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
