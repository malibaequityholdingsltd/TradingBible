import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorPlay, X, Play, Pause, Volume2, VolumeX, Radio, ChevronLeft, ChevronRight, Loader2, Shuffle, ListVideo, Lock, Crown, WifiOff, Clock } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useI18n, localizeAd } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { hardenEmbed, useLiveChannels } from '@/lib/liveChannels';
import { meetsPlan } from '@/lib/entitlements';
import YoutubePlayer from '@/components/YoutubePlayer';

const POS_KEY = 'tb:tv-btn-pos';
const BTN = 56;
const MARGIN = 12;
const PANEL_W = 344;
const PANEL_H = 396;
const DEFAULT_SETTINGS = {
  rotationSeconds: 12,
  headerText: 'TradingBible TV',
  footerText: 'Advertise with TradingBible',
  advertiserEmail: 'ads@tradingbible.app',
};

function snapToEdge(x, y) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let cx = Math.min(Math.max(x, MARGIN), w - BTN - MARGIN);
  let cy = Math.min(Math.max(y, MARGIN), h - BTN - MARGIN);
  const dl = cx - MARGIN;
  const dr = w - BTN - MARGIN - cx;
  const dt = cy - MARGIN;
  const db = h - BTN - MARGIN - cy;
  const min = Math.min(dl, dr, dt, db);
  if (min === dl) cx = MARGIN;
  else if (min === dr) cx = w - BTN - MARGIN;
  else if (min === dt) cy = MARGIN;
  else cy = h - BTN - MARGIN;
  return { x: cx, y: cy };
}

function loadPos() {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (raw && typeof raw.x === 'number' && typeof raw.y === 'number') return snapToEdge(raw.x, raw.y);
  } catch { /* ignore */ }
  return { x: MARGIN, y: MARGIN };
}

const iconBtn = 'grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]';
const iconBtnActive = 'grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37] transition-colors';

// Draggable, edge-snapping TradingBible TV launcher + mini broadcast player.
// Three stage views: rotating house ads, the live-TV channel guide, and the
// in-widget live player. Everything plays inside the panel — no new tabs.
export default function TvWidget() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('ads'); // ads | channels | player
  const [channelIndex, setChannelIndex] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef(null);
  const dragState = useRef({ active: false, moved: false, offX: 0, offY: 0 });
  const videoRef = useRef(null);

  const playing = view === 'player' ? channelIndex : null;
  const liveChannels = useLiveChannels();
  // Guide order: round-the-clock desks first, scheduled shows after.
  const ordered = useMemo(
    () => [...liveChannels.filter((c) => c.roundTheClock), ...liveChannels.filter((c) => !c.roundTheClock)],
    [liveChannels],
  );
  const ytRef = useRef(null);
  const [ytMuted, setYtMuted] = useState(true);
  const [ytStarted, setYtStarted] = useState(false);
  const [ytError, setYtError] = useState(false);
  const [ytBlocked, setYtBlocked] = useState(false);
  const [ytRetry, setYtRetry] = useState(0);
  const isYoutube = playing !== null && /youtube\.com\/embed\//.test(ordered[playing]?.embedUrl || '');

  const toggleYtSound = useCallback(() => {
    try {
      const p = ytRef.current;
      if (!p) return;
      if (p.isMuted()) { p.unMute(); p.setVolume(100); setYtMuted(false); }
      else { p.mute(); setYtMuted(true); }
    } catch { /* noop */ }
  }, []);

  // ── Data ───────────────────────────────────────────────────────
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
      } catch { /* widget stays quiet if the feed is down */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Live TV controls ───────────────────────────────────────────
  // Channel entitlements: widgets show for every plan, but individual
  // channels unlock per tier (null/pro = any paid plan). Locked channels
  // route to pricing instead of playing.
  // NOTE: canWatch/goUpgrade must stay above every consumer — a use-before-
  // declare here throws on mount and blanks the entire app (this widget
  // renders above the route error boundary).
  const canWatch = useCallback((c) => !c?.plan || meetsPlan(user, c.plan || 'pro'), [user]);

  const goUpgrade = useCallback(() => nav('/pricing'), [nav]);

  // Minimized handoff from the full TV page (/tv "minimize" button):
  // resume the same channel in the floating mini player.
  const consumeHandoff = useCallback(() => {
    try {
      const raw = localStorage.getItem('tb:tv-minimized');
      if (!raw) return false;
      localStorage.removeItem('tb:tv-minimized');
      const { i, at } = JSON.parse(raw);
      if (typeof i !== 'number' || Date.now() - Number(at || 0) > 60000) return false;
      if (i < 0 || i >= ordered.length) return false;
      const c = ordered[i];
      if (c && !canWatch(c)) return false;
      setChannelIndex(i);
      setView('player');
      setFrameLoaded(false);
      setOpen(true);
      return true;
    } catch { return false; }
  }, [canWatch, liveChannels]);

  useEffect(() => {
    consumeHandoff();
  }, [consumeHandoff]);

  useEffect(() => {
    const handler = () => { setOpen(true); setView('ads'); };
    window.addEventListener('tb:open-tv', handler);
    return () => window.removeEventListener('tb:open-tv', handler);
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => snapToEdge(p.x, p.y));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Ads rotation pauses while watching live TV.
  useEffect(() => {
    if (paused || ads.length === 0 || view !== 'ads') return;
    const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, seconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, ads.length, settings.rotationSeconds, view]);

  const ad = ads.length > 0 ? ads[index % ads.length] : null;
  const lad = ad ? localizeAd(ad, lang) : null;

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

  // Every new channel starts muted (autoplay policy) until tapped.
  // The no-touch shield engages only once playback actually starts, so
  // YouTube's own play control stays tappable if autoplay gets blocked.
  useEffect(() => { setYtMuted(true); setYtStarted(false); setYtError(false); setYtBlocked(false); }, [channelIndex]);

  const watchChannel = useCallback((i) => {
    if (typeof i !== 'number' || i < 0 || i >= ordered.length) return;
    const c = ordered[i];
    if (c && !canWatch(c)) { goUpgrade(); return; }
    setChannelIndex(i);
    setView('player');
    setFrameLoaded(false);
  }, [canWatch, goUpgrade, ordered]);

  const unlockedIdx = ordered.map((c, i) => (canWatch(c) ? i : -1)).filter((i) => i >= 0);

  const zapChannel = useCallback((dir) => {
    if (!unlockedIdx.length) { goUpgrade(); return; }
    const pos = unlockedIdx.indexOf(channelIndex);
    const next = unlockedIdx[(pos < 0 ? 0 : pos + dir + unlockedIdx.length) % unlockedIdx.length];
    setChannelIndex(next);
    setFrameLoaded(false);
    setView('player');
  }, [channelIndex, goUpgrade, liveChannels, unlockedIdx]);

  const shuffleChannel = useCallback(() => {
    if (!unlockedIdx.length) { goUpgrade(); return; }
    const pool = unlockedIdx.filter((i) => i !== channelIndex);
    const next = (pool.length ? pool : unlockedIdx)[Math.floor(Math.random() * (pool.length ? pool.length : unlockedIdx.length))];
    setChannelIndex(next);
    setFrameLoaded(false);
    setView('player');
  }, [channelIndex, goUpgrade, unlockedIdx]);

  const openChannels = useCallback(() => setView('channels'), []);
  const closePanel = useCallback(() => { setOpen(false); setView('ads'); }, []);

  const openAd = () => {
    if (!ad?.linkUrl) return;
    fetch(`${API_SERVER_URL}/ads/${encodeURIComponent(ad.id)}/click`, { method: 'POST' }).catch(() => {});
    window.open(ad.linkUrl, '_blank', 'noopener');
  };

  // ── Launcher drag ──────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    const p = e.touches ? e.touches[0] : e;
    dragState.current = { active: true, moved: false, offX: p.clientX - pos.x, offY: p.clientY - pos.y };
    setDragging(true);
  }, [pos.x, pos.y]);

  useEffect(() => {
    const move = (e) => {
      if (!dragState.current.active) return;
      const p = e.touches ? e.touches[0] : e;
      const nx = p.clientX - dragState.current.offX;
      const ny = p.clientY - dragState.current.offY;
      if (Math.abs(nx - pos.x) > 3 || Math.abs(ny - pos.y) > 3) dragState.current.moved = true;
      const w = window.innerWidth; const h = window.innerHeight;
      setPos({
        x: Math.min(Math.max(nx, MARGIN), w - BTN - MARGIN),
        y: Math.min(Math.max(ny, MARGIN), h - BTN - MARGIN),
      });
      if (e.cancelable) e.preventDefault();
    };
    const up = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      setDragging(false);
      setPos((cur) => {
        const snapped = snapToEdge(cur.x, cur.y);
        try { localStorage.setItem(POS_KEY, JSON.stringify(snapped)); } catch { /* ignore */ }
        return snapped;
      });
      if (!dragState.current.moved) setOpen(true);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [pos.x, pos.y]);

  const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));

  // Panel placement: fit inside the viewport wherever the launcher sits.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const margin = 8;
  const panelW = Math.min(PANEL_W, vw - margin * 2);
  const panelH = Math.min(PANEL_H, vh - margin * 2);
  const px = Math.max(margin, Math.min(pos.x, vw - panelW - margin));
  const py = Math.max(margin, Math.min(pos.y, vh - panelH - margin));

  const live = view === 'player' || view === 'channels';

  return (
    <div className="tv-widget-root">
      {open && (
        <div
          className="tv-pop tv-widget-panel fixed z-[70] flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#0c0c11]/85 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(212,175,55,0.12)] backdrop-blur-xl"
          style={{ left: px, top: py, width: panelW, height: panelH, maxWidth: 'calc(100vw - 1rem)' }}
        >
          {/* Header */}
          <div className="tv-widget-header flex items-center gap-2 border-b border-[#d4af37]/12 bg-[#0a0a0f]/80 backdrop-blur-md px-3 py-2">
            <img src={TRADINGBIBLE_LOGO} alt="" className="h-5 w-5 rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <span className="gold-text min-w-0 flex-1 truncate text-sm font-bold tracking-wide">{settings.headerText || 'TradingBible TV'}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff5a62]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)]" />
              {t('tv.onAir')}
            </span>
            <button onClick={() => setView((v) => (v === 'channels' ? (playing !== null ? 'player' : 'ads') : 'channels'))} className={view === 'channels' ? iconBtnActive : iconBtn} aria-label="Live TV channels" title="Live TV channels">
              <ListVideo className="h-4 w-4" />
            </button>
            <button onClick={closePanel} aria-label={t('tv.closeTv')} className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stage */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {view === 'player' && playing !== null && (
              <ErrorBoundary
                fallback={
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                    <p className="text-xs font-semibold text-[#f0ecdd]">This player hit a snag</p>
                    <button onClick={() => { setView('channels'); }} className="min-h-[40px] rounded-xl border border-[#d4af37]/30 px-5 text-xs font-bold text-[#d4af37]">
                      Back to channels
                    </button>
                  </div>
                }
              >
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-1 border-b border-[#d4af37]/10 px-2 py-1.5">
                  <button onClick={openChannels} className={iconBtn} aria-label="Back to channels">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#f0ecdd]">{ordered[playing].title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#ff5a62]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e50914]" /> Live
                  </span>
                  <button onClick={() => zapChannel(-1)} className={iconBtn} aria-label="Previous channel">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => zapChannel(1)} className={iconBtn} aria-label="Next channel">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative min-h-0 flex-1 bg-black">
                  {!frameLoaded && (
                    <div className="absolute inset-0 grid place-items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
                    </div>
                  )}
                  {isYoutube ? (
                    <YoutubePlayer
                      key={`${ordered[playing].id}-${ytRetry}`}
                      ref={ytRef}
                      src={hardenEmbed(ordered[playing].embedUrl || ordered[playing].url)}
                      title={ordered[playing].title}
                      onPlaying={(ok) => { if (ok) { setFrameLoaded(true); setYtStarted(true); setYtMuted(true); } else { setYtError(true); } }}
                      onBlocked={() => setYtBlocked(true)}
                    />
                  ) : (
                    <iframe
                      key={ordered[playing].id}
                      src={hardenEmbed(ordered[playing].embedUrl || ordered[playing].url)}
                      title={ordered[playing].title}
                      className="absolute inset-0 h-full w-full border-0"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setFrameLoaded(true)}
                    />
                  )}
                  {/* Network wall slate: this browser can't reach YouTube. */}
                  {isYoutube && ytBlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#07070a] p-4 text-center">
                      <WifiOff className="h-6 w-6 text-[#6a665a]" />
                      <p className="text-xs font-semibold text-[#f0ecdd]">Can't reach YouTube</p>
                      <p className="max-w-[240px] text-[11px] leading-relaxed text-[#8a8577]">Your network is blocking youtube.com — check connection, VPN, ad-blocker or region restrictions, then re-open the channel.</p>
                      <button onClick={() => { setYtBlocked(false); setYtError(false); setFrameLoaded(false); setYtRetry((n) => n + 1); }} className="mt-1 min-h-[40px] rounded-xl border border-[#d4af37]/30 px-5 text-xs font-bold text-[#d4af37] transition hover:bg-[#d4af37]/10">
                        Try again
                      </button>
                      <a href={ordered[playing]?.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#8a8577] hover:text-[#d4af37] hover:underline">
                        Open on YouTube instead
                      </a>
                    </div>
                  )}
                  {/* Off-air slate: this desk isn't broadcasting right now. */}
                  {isYoutube && ytError && !ytStarted && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#07070a] p-4 text-center">
                      <Radio className="h-6 w-6 text-[#6a665a]" />
                      <p className="text-xs font-semibold text-[#f0ecdd]">This desk is off-air right now</p>
                      <p className="text-[11px] text-[#8a8577]">Live shows run at set hours — Bloomberg runs 24/7.</p>
                      <button onClick={() => watchChannel(0)} className="mt-1 min-h-[40px] rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-xs font-bold text-[#0a0a0f] transition hover:opacity-90">
                        Watch Bloomberg 24/7
                      </button>
                    </div>
                  )}
                  {/* No-touch shield (engages once playing): no tap on the
                      video can pause it or open suggestions. Sound and
                      channel controls live outside the frame. */}
                  {(!isYoutube || ytStarted) && <div className="absolute inset-0 bg-transparent" />}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[#d4af37]/10 px-3 py-1.5">
                  <span className="truncate text-[10px] text-[#6a665a]">{ordered[playing].desk} · live in player</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isYoutube && frameLoaded && (
                      <button onClick={toggleYtSound} className="flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline" aria-label={ytMuted ? 'Unmute' : 'Mute'}>
                        {ytMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        {ytMuted ? 'Tap for sound' : 'Sound on'}
                      </button>
                    )}
                    <button onClick={openChannels} className="shrink-0 text-[11px] font-semibold text-[#8a8577] hover:text-[#d4af37] hover:underline">
                      All channels
                    </button>
                  </span>
                </div>
              </div>
              </ErrorBoundary>
            )}

            {view === 'channels' && (
              <div className="no-scrollbar flex h-full flex-col overflow-hidden">
                <div className="flex items-center gap-1 border-b border-[#d4af37]/10 px-2 py-1.5">
                  <button onClick={() => zapChannel(-1)} className={iconBtn} aria-label="Previous channel">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => watchChannel(channelIndex)} className="min-w-0 flex-1 rounded-lg px-1 py-1 text-center transition hover:bg-white/5">
                    <span className="block truncate text-[13px] font-bold text-[#f0ecdd]">{ordered[channelIndex].title}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-[#d4af37]">{ordered[channelIndex].desk} · tap to watch</span>
                  </button>
                  <button onClick={() => zapChannel(1)} className={iconBtn} aria-label="Next channel">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button onClick={shuffleChannel} className={iconBtn} aria-label="Random channel" title="Play a random channel">
                    <Shuffle className="h-4 w-4" />
                  </button>
                </div>
                <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-2">
                  {[
                    { id: 'live247', label: 'On air 24/7', items: ordered.map((c, i) => ({ c, i })).filter(({ c }) => c.roundTheClock) },
                    { id: 'scheduled', label: 'Scheduled live shows', items: ordered.map((c, i) => ({ c, i })).filter(({ c }) => !c.roundTheClock) },
                  ].filter((s) => s.items.length).map((section) => (
                    <div key={section.id}>
                      <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8577]">{section.label}</p>
                      <div className="space-y-1.5">
                      {section.items.map(({ c, ci }) => {
                        const locked = !canWatch(c);
                        return (
                    <button
                      key={c.id}
                      onClick={() => watchChannel(ci)}
                      className={`group flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${locked ? 'border-[#d4af37]/10 opacity-80 hover:border-[#d4af37]/40' : 'border-[#d4af37]/10 bg-white/[0.02] hover:border-[#d4af37]/40 hover:bg-[#d4af37]/[0.05]'}`}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#d4af37]/12 text-[#d4af37]">
                        {locked ? <Lock className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="block truncate text-[13px] font-semibold text-[#f0ecdd]">{c.title}</span>
                          {c.isNew && <span className="shrink-0 rounded-full bg-[#d4af37] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#0a0a0f]">New</span>}
                          {c.roundTheClock && <span className="shrink-0 rounded-full bg-emerald-400/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-emerald-400">24/7</span>}
                          {locked && <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#d4af37]"><Crown className="h-2.5 w-2.5" />{c.plan}</span>}
                        </span>
                        <span className="block truncate text-[11px] text-[#8a8577]">{c.desk} · {locked ? 'tap to upgrade' : 'tap to watch'}</span>
                        {!c.roundTheClock && c.hours && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6a665a]"><Clock className="h-2.5 w-2.5 shrink-0" /> Typically live: {c.hours}</span>
                        )}
                      </span>
                      <Play className="h-3.5 w-3.5 shrink-0 text-[#6a665a] transition group-hover:text-[#d4af37]" />
                    </button>
                        );
                      })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'ads' && (
              !ad ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <MonitorPlay className="h-9 w-9 text-[#6a665a]" />
                  <p className="text-sm text-[#8a8577]">{t('tv.noLive')}</p>
                </div>
              ) : (
                <div key={ad.id} className="absolute inset-0">
                  {ad.videoUrl ? (
                    <video
                      ref={videoRef}
                      src={ad.videoUrl}
                      className="h-full w-full object-cover opacity-90"
                      autoPlay muted={muted} loop playsInline
                    />
                  ) : ad.imageUrl ? (
                    <img src={ad.imageUrl} alt="" className="h-full w-full object-cover opacity-70" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  ) : null}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.35) 55%, rgba(10,10,15,0.6) 100%)' }}
                  />
                  <div className="tv-stage-text absolute bottom-3 left-3 right-3 flex flex-col gap-2">
                    {ad.logoUrl && (
                      <img src={ad.logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white/95 object-contain p-1 ring-1 ring-[#d4af37]/40" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <h2 className="text-lg font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ color: ad.accent || '#f0ecdd' }}>
                      {lad.title}
                    </h2>
                    {lad.headline && <p className="line-clamp-2 text-xs leading-snug text-[#e9e7df] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">{lad.headline}</p>}
                    {ad.linkUrl && (
                      <button
                        onClick={openAd}
                        className="mt-1 w-fit rounded-lg px-3.5 py-1.5 text-xs font-bold text-[#0a0a0f] shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.03]"
                        style={{ background: ad.accent || '#d4af37' }}
                      >
                        {lad.cta || t('tv.learnMore')} →
                      </button>
                    )}
                  </div>
                  <div
                    key={`${ad.id}-${index}`}
                    className="tv-progress absolute bottom-0 left-0 h-[3px] rounded-r-full bg-gradient-to-r from-[#d4af37] to-[#f0d675]"
                    style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                </div>
              )
            )}
          </div>

          {/* Footer — controls per view */}
          <div className="tv-widget-footer flex items-center justify-between gap-1 border-t border-[#d4af37]/12 bg-[#0a0a0f] px-3 py-2">
            {view === 'player' ? (
              <>
                <button onClick={openChannels} className={iconBtn} aria-label="Back to channels">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 truncate text-center text-[10px] uppercase tracking-wider text-[#8a8577]">
                  {ordered[playing]?.desk} · {playing + 1}/{ordered.length}
                </span>
                <button onClick={shuffleChannel} className={iconBtn} aria-label="Random channel" title="Play a random channel">
                  <Shuffle className="h-4 w-4" />
                </button>
              </>
            ) : view === 'channels' ? (
              <>
                <button onClick={() => setView('ads')} className={iconBtn} aria-label="Back to broadcasts">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 truncate text-center text-[10px] uppercase tracking-wider text-[#8a8577]">
                  {ordered.length} live channels
                </span>
                <button onClick={shuffleChannel} className={iconBtn} aria-label="Random channel" title="Play a random channel">
                  <Shuffle className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setPaused((p) => !p)} className={iconBtn} aria-label={paused ? t('tv.play') : t('tv.pause')}>
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
                  {ads.map((a, i) => (
                    <button key={a.id} onClick={() => setIndex(i)} aria-label={t('tv.broadcastN', { n: i + 1 })}
                      className={`${i === index % ads.length ? 'tv-tv-dot-active w-5 bg-[#d4af37]' : 'tv-tv-dot w-1.5 bg-white/15 hover:bg-white/30'} h-1.5 rounded-full transition-all`} />
                  ))}
                </div>
                <button onClick={() => setMuted((m) => !m)} className={iconBtn} aria-label={muted ? t('tv.unmute') : t('tv.mute')}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!open && (
        <button
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          aria-label={t('aiw.openLabel')}
          title={t('tv.openTv')}
          className={`tv-tv-btn fixed z-[70] grid place-items-center rounded-full bg-gradient-to-br from-[#0c0c11] to-[#0a0a0f] text-[#d4af37] shadow-2xl ring-1 ring-[#d4af37]/40 ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab transition-transform hover:scale-105'}`}
          style={{ left: pos.x, top: pos.y, height: BTN, width: BTN, touchAction: 'none' }}
        >
          <img src={TRADINGBIBLE_LOGO} alt="" className="h-8 w-8 rounded-full object-contain opacity-90" onError={e => { e.currentTarget.style.display = 'none'; }} />
          {ads.length > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-[#0c0c11] bg-[#d4af37] px-0.5 text-[9px] font-bold text-[#0a0a0f]">{ads.length > 9 ? '9+' : ads.length}</span>
          )}
        </button>
      )}
    </div>
  );
}
