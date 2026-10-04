import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MonitorPlay, X, Play, Pause, Volume2, VolumeX, Radio, ChevronLeft, ChevronRight, Loader2, ListVideo, Lock, Crown, WifiOff, Clock, Bell, BellRing, Search, Maximize, Minimize } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useI18n, localizeAd } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';
import { hardenEmbed, useLiveChannels, ytVideoEmbed } from '@/lib/liveChannels';
import { useLiveStatus } from '@/lib/useLiveStatus';
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
  // New users start bottom-right — clear of headers, heatmaps and content.
  return snapToEdge(
    Math.max(MARGIN, window.innerWidth - BTN - MARGIN),
    Math.max(MARGIN, window.innerHeight - BTN - MARGIN),
  );
}

const iconBtn = 'grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37]/15 text-[#d4af37] transition-colors hover:bg-[#d4af37]/25 hover:text-[#f0d675]';
const iconBtnActive = 'grid h-7 w-7 place-items-center rounded-lg bg-[#d4af37] text-[#0a0a0f] transition-colors hover:opacity-90';

// Draggable, edge-snapping TradingBible TV launcher + mini broadcast player.
// Three stage views: rotating house ads, the live-TV channel guide, and the
// in-widget live player. Everything plays inside the panel — no new tabs.
export default function TvWidget() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  // On the full /tv page the page's own bottom bar carries the sound pill —
  // the floating widget hides its duplicate there.
  const { pathname } = useLocation();
  const onTvPage = pathname === '/tv';
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('ads'); // ads | channels | player
  // Zoom: mini floating panel, or full TV filling the screen below the app
  // header — headings, search bar and top bars stay visible, never covered.
  const [expanded, setExpanded] = useState(() => {
    try {
      if (localStorage.getItem('tb:tv-expanded') === '1') return true;
      return localStorage.getItem('tb:tv-zoom') === 'full';
    } catch { return false; }
  });
  const toggleExpanded = useCallback(() => {
    setExpanded((e) => {
      try {
        localStorage.setItem('tb:tv-expanded', e ? '0' : '1');
        localStorage.setItem('tb:tv-zoom', e ? 'mini' : 'full');
      } catch { /* ignore */ }
      return !e;
    });
  }, []);
  const [channelIndex, setChannelIndex] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef(null);
  const dragState = useRef({ active: false, moved: false, offX: 0, offY: 0 });
  const videoRef = useRef(null);

  const playing = view === 'player' ? channelIndex : null;
  const liveChannels = useLiveChannels();
  // Real broadcast state: confirmed-live desks float to the top of the
  // guide; the order freezes while watching so the player never retargets.
  const { states: liveStates, liveOf, liveCount, bell, toggleBell, markConfirmed } = useLiveStatus(liveChannels, { notify: true });
  const [guideQuery, setGuideQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const liveOrdered = useMemo(() => {
    const live = [];
    const clock = [];
    const sched = [];
    liveChannels.forEach((c) => {
      if (liveOf(c) === true) live.push(c);
      else if (c.roundTheClock) clock.push(c);
      else sched.push(c);
    });
    return [...live, ...clock, ...sched];
  }, [liveChannels, liveStates]);
  const frozenRef = useRef([]);
  // Freeze the order while watching OR browsing: probe updates still flip
  // badges/counts live in place, but rows never jump under a scrolling
  // finger. Re-syncs on the ads view and whenever desks are added/removed.
  if (liveOrdered.length && (view === 'ads' || frozenRef.current.length !== liveOrdered.length)) frozenRef.current = liveOrdered;
  const ordered = view !== 'ads' && frozenRef.current.length ? frozenRef.current : liveOrdered;
  const ytRef = useRef(null);
  const [ytMuted, setYtMuted] = useState(true);
  const [ytStarted, setYtStarted] = useState(false);
  const [ytError, setYtError] = useState(false);
  const [ytBlocked, setYtBlocked] = useState(false);
  const [ytRetry, setYtRetry] = useState(0);
  const [ytApi, setYtApi] = useState(false);
  // Direct-first playback: when the probe confirmed this desk's live video
  // id, play it direct (some owners restrict the generic live_stream
  // endpoint while the video itself plays — proven on WION). Falls back to
  // the endpoint if direct errors, then auto-advances.
  const [useEndpoint, setUseEndpoint] = useState(false);
  // Dead-desk memory: channels that failed this session are auto-skipped,
  // so playback never sits on a slate asking for a tap.
  const attemptsRef = useRef(new Set());
  const advanceTimer = useRef(null);
  // Self-retry: when every desk is exhausted the slate keeps a 30s timer
  // that silently clears the dead-desk memory and remounts — playback
  // recovers with zero taps the moment anything becomes playable.
  const retryTimer = useRef(null);
  const retryId = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const channelIndexRef = useRef(channelIndex);
  channelIndexRef.current = channelIndex;

  const scheduleAutoRetry = useCallback(() => {
    clearTimeout(retryTimer.current);
    const id = String(ordered[channelIndexRef.current]?.id || '');
    retryId.current = id;
    retryTimer.current = setTimeout(() => {
      if (viewRef.current !== 'player') return;
      if (String(ordered[channelIndexRef.current]?.id || '') !== retryId.current) return;
      attemptsRef.current.clear();
      setUseEndpoint(false); setYtError(false); setYtBlocked(false); setFrameLoaded(false);
      setYtRetry((n) => n + 1);
    }, 30000);
  }, [ordered]);
  const isYoutube = playing !== null && /(youtube\.com|youtube-nocookie\.com)\/embed\//.test(ordered[playing]?.embedUrl || '');

  const toggleYtSound = useCallback(() => {
    try {
      const p = ytRef.current;
      if (!p) return;
      if (p.isMuted()) { p.unMute(); p.setVolume(100); setYtMuted(false); }
      else { p.mute(); setYtMuted(true); }
    } catch { /* noop */ }
  }, []);

  // Auto-sound: the channel-row tap counts as a user gesture, and its
  // activation is still valid when the player API attaches moments later —
  // so sound starts with the picture and no second tap is ever needed.
  // Browsers without a valid activation simply stay muted (their law).
  const tryAutoSound = useCallback(() => {
    try {
      const ua = navigator.userActivation;
      if (!ua || (!ua.isActive && !ua.hasBeenActive)) return;
      const p = ytRef.current;
      if (!p || typeof p.unMute !== 'function') return;
      if (typeof p.isMuted === 'function' && !p.isMuted()) { setYtMuted(false); return; }
      p.unMute();
      if (typeof p.setVolume === 'function') p.setVolume(100);
      setYtMuted(false);
    } catch { /* stays muted */ }
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

  // Next playable desk from `from`, in three passes: confirmed-live first,
  // then not-yet-checked, then known off-air as a last resort. Dead desks
  // auto-skip — no tap-to-retry slates while anything else can play.
  const findNextPlayable = useCallback((from) => {
    const tried = attemptsRef.current;
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 1; k <= ordered.length; k++) {
        const i = (from + k) % ordered.length;
        const c = ordered[i];
        if (!c || !canWatch(c) || tried.has(String(c.id))) continue;
        const st = liveOf(c);
        if (pass === 0 && st !== true) continue;
        if (pass === 1 && st === false) continue;
        return i;
      }
    }
    return -1;
  }, [ordered, canWatch, liveStates]);

  // Stream failure chain: endpoint fallback when direct fails → auto-
  // advance to the next playable desk → slate only when nothing is left.
  const handleStreamError = useCallback((blocked) => {
    const c = ordered[channelIndex];
    const id = c ? String(c.id) : '';
    const probeVid = (id && liveStates[id]?.videoId) || null;
    if (probeVid && !useEndpoint) {
      setUseEndpoint(true);
      setYtError(false); setYtBlocked(false); setFrameLoaded(false);
      return;
    }
    if (id) attemptsRef.current.add(id);
    const next = findNextPlayable(channelIndex);
    if (next >= 0) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        setChannelIndex(next); setView('player'); setFrameLoaded(false); setYtError(false); setYtBlocked(false);
      }, 1200);
    } else if (blocked) {
      setYtBlocked(true);
      scheduleAutoRetry();
    } else {
      setYtError(true);
      scheduleAutoRetry();
    }
  }, [ordered, channelIndex, useEndpoint, liveStates, findNextPlayable, scheduleAutoRetry]);

  // Instant live on open: the launcher jumps straight into the best desk
  // (live → 24/7 → first unlocked) — motion starts with zero extra taps.
  const openTv = useCallback(() => {
    let idx = (channelIndex >= 0 && channelIndex < ordered.length && canWatch(ordered[channelIndex])) ? channelIndex : -1;
    if (idx < 0) {
      const live = ordered.findIndex((cc) => liveOf(cc) === true && canWatch(cc));
      const clock = live >= 0 ? live : ordered.findIndex((cc) => cc.roundTheClock && canWatch(cc));
      idx = clock >= 0 ? clock : ordered.findIndex((cc) => canWatch(cc));
    }
    if (idx < 0) { setOpen(true); setView('ads'); return; }
    attemptsRef.current.delete(String(ordered[idx]?.id));
    setChannelIndex(idx);
    setView('player');
    setFrameLoaded(false);
    setOpen(true);
  }, [channelIndex, ordered, canWatch, liveStates]);

  // Minimized handoff from the full TV page (/tv "minimize" button):
  // resume the same channel in the floating mini player (id-based, so
  // guide reorders can never retarget it; legacy numeric index accepted).
  const consumeHandoff = useCallback(() => {
    try {
      const raw = localStorage.getItem('tb:tv-minimized');
      if (!raw) return false;
      localStorage.removeItem('tb:tv-minimized');
      const { i, id, at } = JSON.parse(raw);
      if (Date.now() - Number(at || 0) > 60000) return false;
      let idx = typeof id !== 'undefined'
        ? ordered.findIndex((c) => String(c.id) === String(id))
        : -1;
      if (idx < 0 && typeof i === 'number') idx = (i >= 0 && i < ordered.length) ? i : -1;
      if (idx < 0) return false;
      const c = ordered[idx];
      if (c && !canWatch(c)) return false;
      setChannelIndex(idx);
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
    const handler = () => openTv();
    window.addEventListener('tb:open-tv', handler);
    return () => window.removeEventListener('tb:open-tv', handler);
  }, [openTv]);

  // Go-live alerts: a desk flipping off-air → live raises an in-widget
  // toast (tap to jump straight to it). Browser notifications fire from the
  // shared hook when the bell is on.
  useEffect(() => {
    const onGoLive = (e) => {
      const { channelId, id, title, liveTitle } = e.detail || {};
      const cid = channelId || id;
      if (!cid) return;
      const key = `${cid}-${Date.now()}`;
      setToasts((ts) => [...ts.slice(-2), { key, channelId: String(cid), title: title || 'A channel', liveTitle: liveTitle || null }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.key !== key)), 9000);
    };
    window.addEventListener('tb:tv-golive', onGoLive);
    return () => window.removeEventListener('tb:tv-golive', onGoLive);
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
  useEffect(() => { setYtMuted(true); setYtStarted(false); setYtError(false); setYtBlocked(false); setYtApi(false); setUseEndpoint(false); return () => { clearTimeout(advanceTimer.current); clearTimeout(retryTimer.current); }; }, [channelIndex]);

  const watchChannel = useCallback((i) => {
    if (typeof i !== 'number' || i < 0 || i >= ordered.length) return;
    const c = ordered[i];
    if (c && !canWatch(c)) { goUpgrade(); return; }
    attemptsRef.current.clear();
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

  const openChannels = useCallback(() => setView('channels'), []);
  const closePanel = useCallback(() => { setOpen(false); setView('ads'); }, []);

  const watchToastChannel = useCallback((channelId) => {
    const idx = ordered.findIndex((c) => String(c.id) === String(channelId));
    if (idx < 0) return;
    setToasts([]);
    attemptsRef.current.clear();
    setChannelIndex(idx);
    setView('player');
    setFrameLoaded(false);
    setOpen(true);
  }, [ordered]);

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
      if (!dragState.current.moved) openTv();
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
  }, [pos.x, pos.y, openTv]);

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
    <div className="tv-widget-root" style={{ display: 'contents' }}>
      {open && (
        <div
          className={`tv-pop tv-widget-panel sheen-panel fixed flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#0c0c11]/85 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(212,175,55,0.12)] backdrop-blur-xl ${expanded ? 'z-[90]' : 'z-[70]'}`}
          style={expanded
            ? { left: 8, top: 64, width: 'calc(100vw - 16px)', height: 'calc(100dvh - 72px)', maxWidth: 'none' }
            : { left: px, top: py, width: panelW, height: panelH, maxWidth: 'calc(100vw - 1rem)' }}
        >
          {/* Header */}
          <div className="tv-widget-header relative flex items-center gap-2 border-b border-[#d4af37]/12 bg-[#0a0a0f]/80 backdrop-blur-md px-3 py-2">
            <span className={expanded ? 'pointer-events-none absolute left-1/2 flex max-w-[46vw] -translate-x-1/2 items-center gap-2' : 'flex min-w-0 flex-1 items-center gap-2'}>
              <img src={TRADINGBIBLE_LOGO} alt="" className="h-5 w-5 shrink-0 rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
              <span className="gold-text truncate text-sm font-bold tracking-wide">{settings.headerText || 'TradingBible TV'}</span>
            </span>
            {liveCount > 0 ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff5a62]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)]" />
                {liveCount} live
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff5a62]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)]" />
                {t('tv.onAir')}
              </span>
            )}
            <button onClick={toggleExpanded} className={`${expanded ? 'ml-auto ' : ''}${expanded ? iconBtnActive : iconBtn}`} aria-label={expanded ? 'Zoom out TV' : 'Zoom TV big'} title={expanded ? 'Zoom out' : 'Zoom big (keeps header visible)'}>
              {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
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
                </div>
                <div className="relative min-h-0 flex-1 bg-black">
                  {!frameLoaded && (
                    <div className="absolute inset-0 grid place-items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" />
                    </div>
                  )}
                  {isYoutube ? (
                    <YoutubePlayer
                      key={`${ordered[playing].id}-${liveStates[ordered[playing]?.id]?.videoId || 'live'}-${useEndpoint ? 'ep' : 'd'}-${ytRetry}`}
                      ref={ytRef}
                      src={(liveStates[ordered[playing]?.id]?.videoId && !useEndpoint) ? ytVideoEmbed(liveStates[ordered[playing].id].videoId) : hardenEmbed(ordered[playing].embedUrl || ordered[playing].url)}
                      title={ordered[playing].title}
                      onPlaying={(ok, proven) => { if (ok) { setFrameLoaded(true); setYtStarted(true); try { setYtMuted(ytRef.current?.isMuted?.() ?? true); } catch { setYtMuted(true); } if (proven) markConfirmed(ordered[playing]?.id); } else { handleStreamError(false); } }}
                      onBlocked={() => handleStreamError(true)}
                      onApiReady={(ready) => { setYtApi(!!ready); if (ready) tryAutoSound(); }}
                      onLoaded={() => setFrameLoaded(true)}
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
                      <p className="text-[10px] uppercase tracking-wider text-[#6a665a]">Retrying automatically…</p>
                      <button onClick={() => { attemptsRef.current.clear(); setUseEndpoint(false); setYtBlocked(false); setYtError(false); setFrameLoaded(false); setYtRetry((n) => n + 1); }} className="mt-1 min-h-[40px] rounded-xl border border-[#d4af37]/30 px-5 text-xs font-bold text-[#d4af37] transition hover:bg-[#d4af37]/10">
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
                      <p className="max-w-[240px] text-[11px] leading-relaxed text-[#8a8577]">Live shows run at set hours — pick a desk with a LIVE badge in the guide.</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => { attemptsRef.current.clear(); setUseEndpoint(false); setYtError(false); setFrameLoaded(false); setYtRetry((n) => n + 1); }} className="min-h-[40px] rounded-xl border border-[#d4af37]/30 px-5 text-xs font-bold text-[#d4af37] transition hover:bg-[#d4af37]/10">
                          Try again
                        </button>
                        <button onClick={openChannels} className="min-h-[40px] rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 text-xs font-bold text-[#0a0a0f] transition hover:opacity-90">
                          All channels
                        </button>
                      </div>
                      <p className="max-w-[240px] text-[10px] leading-relaxed text-[#6a665a]">Tip: tap the bell in the guide — we'll ping you the moment a desk goes live.</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#6a665a]">Retrying automatically…</p>
                    </div>
                  )}
                  {/* No-touch shield — always on from the first frame: no tap
                      on the video can pause it, start it, or open
                      suggestions. Playback is fully automatic; sound and
                      channel controls live outside the frame. Slates stay
                      tappable because the shield hides while one shows. */}
                  {!ytBlocked && !ytError && <div aria-hidden className="absolute inset-0 bg-transparent" />}
                </div>
              </div>
              </ErrorBoundary>
            )}

            {view === 'channels' && (
              <div className="no-scrollbar flex h-full flex-col overflow-hidden">
                {/* Search + live alerts */}
                <div className="border-b border-[#d4af37]/10 px-2 pb-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-[#d4af37]/15 bg-white/[0.03] px-2 py-1.5">
                      <Search className="h-3.5 w-3.5 shrink-0 text-[#6a665a]" />
                      <input
                        value={guideQuery}
                        onChange={(e) => setGuideQuery(e.target.value)}
                        placeholder="Search desks…"
                        className="min-w-0 flex-1 bg-transparent text-xs text-[#f0ecdd] placeholder:text-[#6a665a] focus:outline-none"
                      />
                      {guideQuery && (
                        <button onClick={() => setGuideQuery('')} aria-label="Clear search" className="text-[#6a665a] hover:text-[#f0ecdd]">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <button onClick={toggleBell} title={bell ? 'Live alerts on — tap to mute' : 'Notify me when a desk goes live'} aria-label="Toggle go-live alerts" className={bell ? iconBtnActive : iconBtn}>
                      {bell ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </button>
                  </div>
                  {bell && (
                    <p className="mt-1 px-1 text-[10px] leading-snug text-[#8a8577]">Alerts on — a toast (and a system ping, if allowed) the moment a desk goes live.</p>
                  )}
                </div>
                <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-2">
                  {(() => {
                    const q = guideQuery.trim().toLowerCase();
                    const matches = (c) => !q || `${c.title || ''} ${c.desk || ''}`.toLowerCase().includes(q);
                    // Every desk always lists — confirmed off-air ones sit in
                    // their own dimmed section, so visible rows always add
                    // up to the channel count.
                    const withIdx = ordered.map((c, i) => ({ c, ci: i })).filter(({ c }) => matches(c));
                    const sections = [
                      { id: 'live', label: `Live now${liveCount > 0 ? ` · ${liveCount}` : ''}`, dot: 'bg-[#e50914]', items: withIdx.filter(({ c }) => liveOf(c) === true) },
                      { id: 'live247', label: 'On air 24/7', dot: 'bg-emerald-400', items: withIdx.filter(({ c }) => c.roundTheClock && c.desk !== 'Music' && liveOf(c) !== true && liveOf(c) !== false) },
                      { id: 'music', label: 'Music', dot: 'bg-violet-400', items: withIdx.filter(({ c }) => c.desk === 'Music' && liveOf(c) !== true && liveOf(c) !== false) },
                      { id: 'scheduled', label: 'Scheduled live shows', dot: 'bg-[#d4af37]', items: withIdx.filter(({ c }) => !c.roundTheClock && c.desk !== 'Music' && liveOf(c) !== true && liveOf(c) !== false) },
                      { id: 'offair', label: 'Currently off-air', dot: 'bg-[#6a665a]', items: withIdx.filter(({ c }) => liveOf(c) === false) },
                    ].filter((s) => s.items.length).map((s) => (s.id === 'live' ? s : { ...s, label: `${s.label} · ${s.items.length}` }));
                    if (!sections.length) {
                      return (
                        <div className="px-1 py-6 text-center">
                          <p className="text-xs text-[#8a8577]">{guideQuery ? `No desks match “${guideQuery}”.` : 'No desks to show.'}</p>
                          {!guideQuery && (
                            <p className="mt-1 text-[11px] text-[#6a665a]">Turn on the bell above — we'll ping you the moment one starts.</p>
                          )}
                        </div>
                      );
                    }
                    return sections.map((section) => (
                      <div key={section.id}>
                        <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8577]">
                          <span className={`h-1.5 w-1.5 rounded-full ${section.dot} ${section.id === 'live' ? 'animate-pulse' : ''}`} />
                          {section.label}
                        </p>
                        <div className="space-y-1.5">
                        {section.items.map(({ c, ci }) => {
                          const locked = !canWatch(c);
                          const st = liveOf(c);
                          const watching = ci === channelIndex;
                          // Current broadcast name when confirmed live —
                          // refreshes every poll as desks rename streams.
                          const liveTitle = st === true ? liveStates[c.id]?.title || null : null;
                          return (
                      <button
                        key={c.id}
                        onClick={() => watchChannel(ci)}
                        className={`group flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${st === true ? 'tv-live-row border-[#e50914]/40 bg-[#e50914]/[0.06] shadow-[0_0_18px_rgba(229,9,20,0.12)] hover:border-[#e50914]/70' : locked ? 'border-[#d4af37]/10 opacity-80 hover:border-[#d4af37]/40' : 'border-[#d4af37]/10 bg-white/[0.02] hover:border-[#d4af37]/40 hover:bg-[#d4af37]/[0.05]'} ${st === false ? 'opacity-60' : ''}`}
                      >
                        <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg ${st === true ? 'bg-[#e50914]/15 text-[#ff5a62]' : 'bg-[#d4af37]/12 text-[#d4af37]'}`}>
                          {locked ? <Lock className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                          {st === true && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[#0c0c11] bg-[#e50914]" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="block truncate text-[13px] font-semibold text-[#f0ecdd]">{c.title}</span>
                            {st === true && <span className="shrink-0 rounded-full bg-[#e50914] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-white">Live</span>}
                            {st === false && <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#8a8577]">Off-air</span>}
                            {watching && <span className="shrink-0 rounded-full bg-[#d4af37]/20 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#d4af37]">Watching</span>}
                            {c.isNew && <span className="shrink-0 rounded-full bg-[#d4af37] px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#0a0a0f]">New</span>}
                            {c.roundTheClock && st !== true && <span className="shrink-0 rounded-full bg-emerald-400/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-emerald-400">24/7</span>}
                            {locked && <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-[#d4af37]"><Crown className="h-2.5 w-2.5" />{c.plan}</span>}
                          </span>
                          <span className="block truncate text-[11px] text-[#8a8577]" title={liveTitle || undefined}>{locked ? `${c.desk} · tap to upgrade` : liveTitle || (st === false ? `${c.desk} · tap to retry` : `${c.desk} · tap to watch`)}</span>
                          {!c.roundTheClock && c.hours && st !== true && (
                            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6a665a]"><Clock className="h-2.5 w-2.5 shrink-0" /> Typically live: {c.hours}</span>
                          )}
                        </span>
                        <Play className="h-3.5 w-3.5 shrink-0 text-[#d4af37] transition group-hover:scale-110" />
                      </button>
                          );
                        })}
                        </div>
                      </div>
                    ));
                  })()}
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
                <button onClick={() => zapChannel(-1)} className={iconBtn} aria-label="Previous channel" title="Previous channel">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[#8a8577]">
                    {ordered[playing]?.desk} · {playing + 1}/{ordered.length}
                  </span>
                  {isYoutube && ytApi && !onTvPage && (
                    <button onClick={toggleYtSound} className="btn-sheen flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f4e6a8] via-[#d4af37] to-[#c99a25] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0a0a0f] shadow-[0_2px_10px_rgba(212,175,55,0.3)] transition hover:opacity-95 active:scale-95" aria-label={ytMuted ? 'Unmute' : 'Mute'}>
                      {ytMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {ytMuted ? 'Tap for sound' : 'Tap to play'}
                    </button>
                  )}
                </span>
                <button onClick={() => zapChannel(1)} className={iconBtn} aria-label="Next channel" title="Next channel">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : view === 'channels' ? (
              <>
                <button onClick={() => setView('ads')} className={iconBtn} aria-label="Back to broadcasts">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 truncate text-center text-[10px] uppercase tracking-wider text-[#8a8577]">
                  {liveCount > 0 ? `${liveCount} live · ${ordered.length} channels` : `${ordered.length} live channels`}
                </span>
                <button onClick={() => watchChannel(channelIndex)} className={iconBtn} aria-label="Resume watching" title="Resume watching">
                  <Play className="h-4 w-4" />
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

      {/* Go-live toasts: a desk just started broadcasting — tap to jump in. */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[95] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2">
          {toasts.map((toast) => (
            <button
              key={toast.key}
              onClick={() => watchToastChannel(toast.channelId)}
              className="tv-pop flex items-center gap-2.5 rounded-2xl border border-[#e50914]/40 bg-[#0c0c11]/95 p-3 text-left shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_24px_rgba(229,9,20,0.15)] backdrop-blur-xl transition hover:border-[#e50914]/70"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e50914]/15 text-[#ff5a62]">
                <Radio className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#f0ecdd]">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#e50914]" />
                  <span className="truncate">{toast.liveTitle || `${toast.title} is live`}</span>
                </span>
                <span className="block truncate text-[11px] text-[#8a8577]">{toast.liveTitle ? `${toast.title} · tap to watch now` : 'Tap to watch now on TradingBible TV'}</span>
              </span>
              <Play className="h-4 w-4 shrink-0 text-[#d4af37]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
