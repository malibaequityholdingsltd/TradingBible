import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';

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

// Draggable, edge-snapping TradingBible TV launcher — opens a mini
// broadcast player with the rotating ad feed (same UX as the AI chat bubble).
export default function TvWidget() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const timerRef = useRef(null);
  const dragState = useRef({ active: false, moved: false, offX: 0, offY: 0 });
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
      } catch { /* widget stays quiet if the feed is down */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
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

  useEffect(() => {
    if (paused || ads.length === 0) return;
    const seconds = Math.max(4, Math.min(60, Number(settings.rotationSeconds) || 12));
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, seconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [paused, ads.length, settings.rotationSeconds]);

  const ad = ads.length > 0 ? ads[index % ads.length] : null;

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

  const openAd = () => {
    if (!ad?.linkUrl) return;
    fetch(`${API_SERVER_URL}/ads/${encodeURIComponent(ad.id)}/click`, { method: 'POST' }).catch(() => {});
    window.open(ad.linkUrl, '_blank', 'noopener');
  };

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

  // Panel placement: fit the panel inside the viewport regardless of where
  // the launcher bubble is snapped (important on phones / narrow screens).
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const margin = 8;
  const panelW = Math.min(PANEL_W, vw - margin * 2);
  const panelH = Math.min(PANEL_H, vh - margin * 2);
  const px = Math.max(margin, Math.min(pos.x, vw - panelW - margin));
  const py = Math.max(margin, Math.min(pos.y, vh - panelH - margin));

  return (
    <div className="tv-widget-root">
      {open && (
        <div
          className="tv-pop tv-widget-panel fixed z-[70] flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-[#0c0c11] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(212,175,55,0.12)]"
          style={{ left: px, top: py, width: panelW, height: panelH, maxWidth: 'calc(100vw - 1rem)' }}
        >
          <div className="tv-widget-header flex items-center gap-2 border-b border-[#d4af37]/12 bg-[#0a0a0f] px-3 py-2">
            <img src={TRADINGBIBLE_LOGO} alt="" className="h-5 w-5 rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
            <span className="gold-text text-sm font-bold tracking-wide">{settings.headerText || 'TradingBible TV'}</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#e50914]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ff5a62]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e50914] shadow-[0_0_6px_rgba(229,9,20,0.9)] animate-pulse" />
              On Air
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close TV" className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {!ad ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <MonitorPlay className="h-9 w-9 text-[#6a665a]" />
                <p className="text-sm text-[#8a8577]">No broadcasts are live right now.</p>
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
                    {ad.title}
                  </h2>
                  {ad.headline && <p className="line-clamp-2 text-xs leading-snug text-[#e9e7df] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">{ad.headline}</p>}
                  {ad.linkUrl && (
                    <button
                      onClick={openAd}
                      className="mt-1 w-fit rounded-lg px-3.5 py-1.5 text-xs font-bold text-[#0a0a0f] shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.03]"
                      style={{ background: ad.accent || '#d4af37' }}
                    >
                      {ad.cta || 'Learn more'} →
                    </button>
                  )}
                </div>
                <div
                  key={`${ad.id}-${index}`}
                  className="tv-progress absolute bottom-0 left-0 h-[3px] rounded-r-full bg-gradient-to-r from-[#d4af37] to-[#f0d675]"
                  style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? 'paused' : 'running' }}
                />
              </div>
            )}
          </div>

          <div className="tv-widget-footer flex items-center justify-between border-t border-[#d4af37]/12 bg-[#0a0a0f] px-3 py-2">
            <button onClick={() => setPaused((p) => !p)} className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd] transition-colors" aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1.5">
              {ads.map((a, i) => (
                <button key={a.id} onClick={() => setIndex(i)} aria-label={`Broadcast ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index % ads.length ? 'w-5 bg-[#d4af37]' : 'w-1.5 bg-white/15 hover:bg-white/30'}`} />
              ))}
            </div>
            <button onClick={() => setMuted((m) => !m)} className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd] transition-colors" aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          aria-label="Open TradingBible TV (drag to move)"
          title={ads.length > 0 ? `${ads.length} live broadcast${ads.length === 1 ? '' : 's'}` : 'TradingBible TV'}
          className={`fixed z-[70] grid place-items-center rounded-full bg-gradient-to-br from-[#0c0c11] to-[#0a0a0f] text-[#d4af37] shadow-2xl ring-1 ring-[#d4af37]/40 ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab transition-transform hover:scale-105'}`}
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
