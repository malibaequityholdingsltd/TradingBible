import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ExternalLink, Radio, X, Shuffle, Loader2, ChevronLeft } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useI18n, localizeAd } from '@/lib/i18n';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { hardenEmbed, useLiveChannels } from '@/lib/liveChannels';
import { EmptyState, GhostButton } from '@/components/ui-kit';

const DEFAULT_SETTINGS = {
  rotationSeconds: 12,
  autoOpenIntervalMinutes: 0,
  headerText: 'TradingBible TV',
  footerText: 'Advertise with TradingBible',
  advertiserEmail: 'ads@tradingbible.app',
};

const HIDE_UI_MS = 3500;

export default function TvPage() {
  const { t, lang } = useI18n();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uiHidden, setUiHidden] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(0);
  const [playChannel, setPlayChannel] = useState(null); // index into live channels, or null for ads rotation
  const [frameLoaded, setFrameLoaded] = useState(false);
  const liveChannels = useLiveChannels();

  // Play a live channel full-stage inside the TV (no new tab, no login).
  const playLiveChannel = useCallback((i) => {
    setActiveChannel(i);
    setPlayChannel(i);
    setChannelsOpen(false);
    setFrameLoaded(false);
  }, []);

  const exitLiveChannel = useCallback(() => {
    setPlayChannel(null);
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/ads`);
        if (!res.ok) throw new Error('failed to load feed');
        const data = await res.json();
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
        setAds(Array.isArray(data.ads) ? data.ads : []);
      } catch {
        if (!cancelled) setError(t('tv.unavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ad = ads.length > 0 ? ads[index % ads.length] : null;
  const lad = ad ? localizeAd(ad, lang) : null;

  useEffect(() => {
    if (paused || ads.length === 0 || playChannel !== null) return;
    const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, seconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, ads.length, settings.rotationSeconds, playChannel]);

  useEffect(() => {
    if (!ad || muted) return;
    fetch(`${API_SERVER_URL}/ads/${encodeURIComponent(ad.id)}/view`, { method: 'POST' }).catch(() => {});
  }, [index, ad, muted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else { el.play().catch(() => {}); }
    el.muted = muted;
  }, [paused, muted, ad]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [index]);

  useEffect(() => {
    if (!channelsOpen) return undefined;
    const cols = window.innerWidth >= 640 ? 2 : 1;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveChannel((a) => Math.min(a + cols, liveChannels.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveChannel((a) => Math.max(a - cols, 0)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveChannel((a) => Math.min(a + 1, liveChannels.length - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveChannel((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); playLiveChannel(activeChannel); }
      else if (e.key === 'Escape') { setChannelsOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [channelsOpen, activeChannel, playLiveChannel, liveChannels.length]);

  // Keep the keyboard-selected channel visible.
  useEffect(() => {
    if (!channelsOpen) return undefined;
    document.querySelector(`[data-chidx="${activeChannel}"]`)?.scrollIntoView({ block: 'nearest' });
    return undefined;
  }, [channelsOpen, activeChannel]);

  const shuffleTvChannel = useCallback(() => {
    if (liveChannels.length < 2) { playLiveChannel(0); return; }
    let next = Math.floor(Math.random() * (liveChannels.length - 1));
    if (next >= activeChannel) next += 1;
    playLiveChannel(next);
  }, [activeChannel, playLiveChannel, liveChannels.length]);
  const wakeUi = useCallback(() => {
    setUiHidden(false);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiHidden(true), HIDE_UI_MS);
  }, []);

  useEffect(() => {
    wakeUi();
    window.addEventListener('mousemove', wakeUi);
    window.addEventListener('touchstart', wakeUi, { passive: true });
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'ArrowRight' && !channelsOpen && ads.length > 1) setIndex((i) => (i + 1) % ads.length);
      else if (e.key === 'ArrowLeft' && !channelsOpen && ads.length > 1) setIndex((i) => (i - 1 + ads.length) % ads.length);
    };
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('mousemove', wakeUi);
      window.removeEventListener('touchstart', wakeUi);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
      clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads.length, wakeUi, channelsOpen]);

  const openAd = () => {
    if (!ad?.linkUrl) return;
    fetch(`${API_SERVER_URL}/ads/${encodeURIComponent(ad.id)}/click`, { method: 'POST' }).catch(() => {});
    window.open(ad.linkUrl, '_blank', 'noopener');
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute -inset-6 animate-ping rounded-full border border-[#d4af37]/20" />
            <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-16 w-16 rounded-2xl object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="text-xs tracking-[0.35em] text-[#d4af37] uppercase">{t('tv.tuning')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0f] text-[#f0ecdd]" onClick={wakeUi}>
      {/* ── Full-bleed stage: live channel or ads rotation ────────── */}
      {playChannel !== null ? (
        <div key={liveChannels[playChannel].id} className="absolute inset-0 bg-black">
          {!frameLoaded && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
                <span className="text-xs tracking-[0.25em] text-[#d4af37] uppercase">Tuning in…</span>
              </div>
            </div>
          )}
          <iframe
            src={hardenEmbed(liveChannels[playChannel].embedUrl || liveChannels[playChannel].url)}
            title={liveChannels[playChannel].title}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setFrameLoaded(true)}
          />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <EmptyState icon={MonitorPlay} title={error} />
        </div>
      ) : !ad ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <EmptyState icon={MonitorPlay} title={t('tv.noLive')} sub={t('tv.checkBack')} />
        </div>
      ) : (
        <div key={ad.id} className="absolute inset-0">
          {ad.videoUrl ? (
            <video
              ref={videoRef}
              src={ad.videoUrl}
              className="h-full w-full object-cover"
              autoPlay muted={muted} loop playsInline
            />
          ) : ad.imageUrl ? (
            <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
          ) : null}
          <div className="absolute inset-0 bg-black/10" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.25) 22%, rgba(5,5,7,0) 45%, rgba(5,5,7,0.55) 78%, rgba(5,5,7,0.94) 100%)' }}
          />
          <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 220px rgba(5,5,7,0.75)' }} />
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header
        className={`relative z-10 flex items-center justify-between gap-4 px-5 py-4 transition-all duration-500 sm:px-8 ${uiHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
        style={{ background: 'linear-gradient(to bottom, rgba(5,5,7,0.85), rgba(5,5,7,0))' }}
      >
        <div className="flex items-center gap-3">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-10 w-10 rounded-xl object-contain ring-1 ring-[#d4af37]/30" onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div className="flex items-center gap-2.5">
            <span className="tb-gold-text text-lg font-bold tracking-wide">{settings.headerText || 'TradingBible TV'}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff5a62]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)] animate-pulse" />
              {t('tv.onAir')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setChannelsOpen((o) => !o)} className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-sm transition-colors ${channelsOpen ? 'bg-[#d4af37] text-[#0a0a0f]' : 'bg-black/50 text-[#e9e7df] hover:bg-black/70'}`} aria-label="Live channels">
            <Radio className="h-4 w-4" />
          </button>
          {playChannel !== null ? (
            <>
              <button onClick={() => { setChannelsOpen(true); }} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label="All channels">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={exitLiveChannel} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label="Close live TV">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
          <button onClick={() => setMuted((m) => !m)} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label={muted ? t('tv.unmute') : t('tv.mute')}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setPaused((p) => !p)} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label={paused ? t('tv.play') : t('tv.pause')}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
            </>
          )}
          <button onClick={toggleFullscreen} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label={t('tv.fullscreen')}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      {ad && playChannel === null && (
        <main className="tv-stage-text relative z-10 flex flex-1 flex-col justify-end px-6 pb-10 sm:px-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              {ad.logoUrl && (
                <img src={ad.logoUrl} alt="" className="h-14 w-14 rounded-2xl bg-white/95 object-contain p-1.5 ring-1 ring-[#d4af37]/40" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#f0d675]">{ad.brand || t('tv.featured')}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:text-5xl" style={{ color: ad.accent || '#f0ecdd' }}>
              {lad.title}
            </h1>
            {lad.headline && (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[#e9e7df] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-lg">{lad.headline}</p>
            )}
            {lad.snippet && (
              <>
                <button onClick={() => setDetailsOpen((o) => !o)} className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37] hover:underline">
                  {detailsOpen ? t('tv.hideDetails') : t('tv.showDetails')}
                </button>
                {detailsOpen && (
                  <p className="mt-2 max-w-xl whitespace-pre-line rounded-xl bg-black/50 p-4 text-sm leading-relaxed text-[#c9c4b4] backdrop-blur-sm">{lad.snippet}</p>
                )}
              </>
            )}
            {ad.linkUrl && (
              <button onClick={openAd} className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#0a0a0f] shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.03]" style={{ background: ad.accent || '#d4af37' }}>
                {lad.cta || t('tv.learnMore')} <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>
      )}

      {/* ── Live channel guide (Bloomberg live desks) ─────────────── */}
      {channelsOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-[#07070a]/85 backdrop-blur-xl" onClick={() => setChannelsOpen(false)}>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 py-6 sm:px-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                  <Radio className="h-4 w-4" /> Live TV
                </div>
                <h2 className="mt-1 text-xl font-bold text-[#f0ecdd] sm:text-2xl">Bloomberg live desks</h2>
                <p className="mt-1 text-xs text-[#8a8577]">Plays right here on TradingBible TV · {liveChannels.length} channels · <span className="font-mono">↑↓←→</span> browse · <span className="font-mono">Enter</span> watch</p>
              </div>
              <button onClick={() => setChannelsOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <GhostButton onClick={shuffleTvChannel}>
                <Shuffle className="h-4 w-4" /> Surprise me — random channel
              </GhostButton>
            </div>
            <div className="no-scrollbar mt-5 grid flex-1 content-start gap-2 overflow-y-auto pb-4 sm:grid-cols-2">
              {liveChannels.map((c, ci) => (
                <button
                  key={c.id}
                  data-chidx={ci}
                  onClick={() => playLiveChannel(ci)}
                  onMouseEnter={() => setActiveChannel(ci)}
                  className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left backdrop-blur-md transition ${ci === activeChannel ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.08]' : 'border-[#d4af37]/15 bg-white/[0.03] hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.06]'}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]">
                    <Radio className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-semibold text-[#f0ecdd]">{c.title}</span>
                      {c.isNew && <span className="shrink-0 rounded-full bg-[#d4af37] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#0a0a0f]">New</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#8a8577]">{c.blurb}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#ff5a62]">{c.desk}</span>
                    <Play className="h-3.5 w-3.5 text-[#6a665a] transition group-hover:text-[#d4af37]" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <footer className={`relative z-10 px-5 pb-5 transition-all duration-500 sm:px-8 ${uiHidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        {playChannel !== null ? (
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 truncate text-[11px] text-[#e9e7df]">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#e50914]" />
              <span className="truncate">LIVE TV · {liveChannels[playChannel].title}</span>
            </span>
            <button onClick={() => setChannelsOpen(true)} className="shrink-0 rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] tracking-widest text-[#d4af37] backdrop-blur-sm">ALL CHANNELS</button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] text-[#8a8577]">
              <span className="truncate">{settings.footerText && settings.footerText !== 'Advertise with TradingBible' ? settings.footerText : t('tv.advertise')}</span>
              <span className="hidden rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] tracking-widest text-[#d4af37] backdrop-blur-sm sm:inline">{index + 1} / {ads.length}</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                key={`${ad?.id}-${index}`}
                className="tv-progress h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f0d675]"
                style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? 'paused' : 'running' }}
              />
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
