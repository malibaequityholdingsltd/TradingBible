import React, { useEffect, useRef, useState } from 'react';
import { MonitorPlay, Play, Pause, Volume2, VolumeX, Maximize, ExternalLink } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';

const DEFAULT_SETTINGS = {
  rotationSeconds: 12,
  autoOpenIntervalMinutes: 0,
  headerText: 'TradingBible TV',
  footerText: 'Advertise with TradingBible',
  advertiserEmail: 'ads@tradingbible.app',
};

export default function TvPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
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
    const track = (id, kind) => {
      fetch(`${API_SERVER_URL}/ads/${encodeURIComponent(id)}/${kind}`, { method: 'POST' }).catch(() => {});
    };
    track(ad.id, 'view');
  }, [index, ad, muted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) el.pause();
    else { el.play().catch(() => {}); }
    el.muted = muted;
  }, [paused, muted, ad]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-14 w-14 rounded-xl object-contain animate-pulse" onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div className="text-sm tracking-[0.3em] text-[#d4af37] uppercase">Loading feed…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050507] text-[#f0ecdd]">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-[#d4af37]/10 bg-black/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <img src={TRADINGBIBLE_LOGO} alt="" className="h-9 w-9 rounded-lg object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <MonitorPlay className="h-4 w-4 text-[#d4af37]" />
              {settings.headerText || 'TradingBible TV'}
            </div>
            <div className="text-[11px] text-[#6a665a]">{ads.length} active broadcast{ads.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted((m) => !m)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-[#8a8577] hover:text-[#f0ecdd] transition-colors" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setPaused((p) => !p)} className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-[#8a8577] hover:text-[#f0ecdd] transition-colors" aria-label={paused ? 'Play' : 'Pause'}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button onClick={toggleFullscreen} className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-[#8a8577] hover:text-[#f0ecdd] transition-colors" aria-label="Fullscreen">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Stage */}
      <main className="flex flex-1 items-center justify-center p-6">
        {error ? (
          <div className="text-center text-sm text-[#8a8577]">{error}</div>
        ) : !ad ? (
          <div className="text-center">
            <MonitorPlay className="mx-auto mb-3 h-10 w-10 text-[#6a665a]" />
            <p className="text-sm text-[#8a8577]">No broadcasts are live right now.</p>
            <a href={`mailto:${settings.advertiserEmail}`} className="mt-2 inline-block text-xs text-[#d4af37] hover:underline">
              {settings.footerText} — contact {settings.advertiserEmail}
            </a>
          </div>
        ) : (
          <div key={ad.id} className="tv-ad-card relative w-full max-w-5xl overflow-hidden rounded-3xl border border-[#d4af37]/15 bg-gradient-to-br from-[#101014] via-[#0c0c11] to-[#0a0a0f] shadow-[0_0_80px_rgba(212,175,55,0.06)]">
            {ad.videoUrl ? (
              <div className="absolute inset-0">
                <video
                  ref={videoRef}
                  src={ad.videoUrl}
                  className="h-full w-full object-cover opacity-50"
                  autoPlay muted={muted} loop playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/45 to-[#0a0a0f]/70" />
              </div>
            ) : ad.imageUrl ? (
              <div className="absolute inset-0">
                <img src={ad.imageUrl} alt="" className="h-full w-full object-cover opacity-25" onError={e => { e.currentTarget.style.display = 'none'; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/60" />
              </div>
            ) : null}
            <div className="relative flex flex-col items-center gap-6 px-8 py-16 text-center sm:px-14">
              {ad.logoUrl && (
                <img src={ad.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl" style={{ color: ad.accent || '#d4af37' }}>
                {ad.title}
              </h1>
              {ad.headline && <p className="max-w-2xl text-base leading-relaxed text-[#c9c4b4] sm:text-lg">{ad.headline}</p>}
              {ad.snippet && <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-[#8a8577]">{ad.snippet}</p>}
              {ad.linkUrl && (
                <button onClick={openAd} className="mt-2 inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
                  style={{ background: ad.accent || '#d4af37' }}>
                  {ad.cta || 'Learn more'} <ExternalLink className="h-4 w-4" />
                </button>
              )}
              <div className="mt-4 text-[11px] uppercase tracking-[0.25em] text-[#6a665a]">
                {settings.headerText} · {index + 1} / {ads.length}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#d4af37]/10 bg-black/40 px-5 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-[11px] text-[#6a665a]">
          <span>{settings.footerText}</span>
          <div className="flex items-center gap-4">
            <a href={`mailto:${settings.advertiserEmail}`} className="hover:text-[#d4af37] transition-colors">{settings.advertiserEmail}</a>
            <span className="hidden sm:inline">tradingbible.app/tv</span>
          </div>
        </div>
      </footer>

      {/* Progress dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5">
          {ads.map((a, i) => (
            <button key={a.id} onClick={() => setIndex(i)} aria-label={`Broadcast ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index % ads.length ? 'w-6 bg-[#d4af37]' : 'w-1.5 bg-white/15 hover:bg-white/30'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
