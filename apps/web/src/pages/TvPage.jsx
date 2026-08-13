import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ExternalLink } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';

const DEFAULT_SETTINGS = {
  rotationSeconds: 12,
  autoOpenIntervalMinutes: 0,
  headerText: 'TradingBible TV',
  footerText: 'Advertise with TradingBible',
  advertiserEmail: 'ads@tradingbible.app',
};

const HIDE_UI_MS = 3500;

export default function TvPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uiHidden, setUiHidden] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
        if (!cancelled) setError('TradingBible TV is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ad = ads.length > 0 ? ads[index % ads.length] : null;

  useEffect(() => {
    if (paused || ads.length === 0) return;
    const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, seconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, ads.length, settings.rotationSeconds]);

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
      else if (e.key === 'ArrowRight' && ads.length > 1) setIndex((i) => (i + 1) % ads.length);
      else if (e.key === 'ArrowLeft' && ads.length > 1) setIndex((i) => (i - 1 + ads.length) % ads.length);
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
  }, [ads.length, wakeUi]);

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
          <div className="text-xs tracking-[0.35em] text-[#d4af37] uppercase">Tuning in…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0f] text-[#f0ecdd]" onClick={wakeUi}>
      {/* ── Full-bleed stage ─────────────────────────────────────── */}
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <MonitorPlay className="h-10 w-10 text-[#6a665a]" />
          <p className="text-sm text-[#8a8577]">{error}</p>
        </div>
      ) : !ad ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5">
            <MonitorPlay className="h-7 w-7 text-[#d4af37]" />
          </div>
          <p className="text-lg font-semibold">No broadcasts are live right now</p>
          <p className="text-sm text-[#8a8577]">Check back soon — new broadcasts are added regularly.</p>
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
            <span className="gold-text text-lg font-bold tracking-wide">{settings.headerText || 'TradingBible TV'}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff5a62]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)] animate-pulse" />
              On Air
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted((m) => !m)} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setPaused((p) => !p)} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label={paused ? 'Play' : 'Pause'}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button onClick={toggleFullscreen} className="grid h-10 w-10 place-items-center rounded-xl bg-black/50 text-[#e9e7df] backdrop-blur-sm transition-colors hover:bg-black/70" aria-label="Fullscreen">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────── */}
      {ad && (
        <main className="tv-stage-text relative z-10 flex flex-1 flex-col justify-end px-6 pb-10 sm:px-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              {ad.logoUrl && (
                <img src={ad.logoUrl} alt="" className="h-14 w-14 rounded-2xl bg-white/95 object-contain p-1.5 ring-1 ring-[#d4af37]/40" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#f0d675]">{ad.brand || 'Featured broadcast'}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:text-5xl" style={{ color: ad.accent || '#f0ecdd' }}>
              {ad.title}
            </h1>
            {ad.headline && (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[#e9e7df] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-lg">{ad.headline}</p>
            )}
            {ad.snippet && (
              <>
                <button onClick={() => setDetailsOpen((o) => !o)} className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37] hover:underline">
                  {detailsOpen ? 'Hide details ▲' : 'Show details ▼'}
                </button>
                {detailsOpen && (
                  <p className="mt-2 max-w-xl whitespace-pre-line rounded-xl bg-black/50 p-4 text-sm leading-relaxed text-[#c9c4b4] backdrop-blur-sm">{ad.snippet}</p>
                )}
              </>
            )}
            {ad.linkUrl && (
              <button onClick={openAd} className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#0a0a0f] shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.03]" style={{ background: ad.accent || '#d4af37' }}>
                {ad.cta || 'Learn more'} <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>
      )}

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <footer className={`relative z-10 px-5 pb-5 transition-all duration-500 sm:px-8 ${uiHidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between text-[11px] text-[#8a8577]">
            <span className="truncate">{settings.footerText}</span>
            <span className="hidden rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] tracking-widest text-[#d4af37] sm:inline">{index + 1} / {ads.length}</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              key={`${ad?.id}-${index}`}
              className="tv-progress h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f0d675]"
              style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? 'paused' : 'running' }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
