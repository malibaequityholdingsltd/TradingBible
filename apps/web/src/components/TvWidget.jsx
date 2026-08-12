import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, X, Play, Pause, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';

const POS_KEY = 'tb:tv-btn-pos';
const BTN = 56; // button size in px
const MARGIN = 12;
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

  return (
    <>
      {open && (
        <div
          className="fixed z-[70] flex h-[22rem] max-h-[calc(100dvh-2rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11] shadow-2xl"
          style={{ bottom: '1rem', right: '0.75rem' }}
        >
          <div className="flex items-center justify-between border-b border-[#d4af37]/12 bg-[#0a0a0f] px-4 py-3">
            <div className="flex items-center gap-2 text-[#f0ecdd]">
              <MonitorPlay className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm font-semibold">{settings.headerText || 'TradingBible TV'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/tv" className="min-h-[44px] min-w-[44px] px-2 text-xs text-[#8a8577] hover:text-[#e9e7df]" onClick={() => setOpen(false)}>Fullscreen</Link>
              <button onClick={() => setOpen(false)} aria-label="Close TV" className="grid min-h-[44px] min-w-[44px] place-items-center text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-3">
            {!ad ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <MonitorPlay className="mx-auto mb-3 h-10 w-10 text-[#6a665a]" />
                  <p className="text-sm text-[#8a8577]">No broadcasts are live right now.</p>
                  <a href={`mailto:${settings.advertiserEmail}`} className="mt-2 inline-block text-xs text-[#d4af37] hover:underline">
                    {settings.footerText} — contact {settings.advertiserEmail}
                  </a>
                </div>
              </div>
            ) : (
              <div key={ad.id} className="tv-ad-card relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[#d4af37]/15 bg-gradient-to-br from-[#101014] via-[#0c0c11] to-[#0a0a0f] p-5 text-center">
                {ad.imageUrl && (
                  <div className="absolute inset-0">
                    <img src={ad.imageUrl} alt="" className="h-full w-full object-cover opacity-20" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/60" />
                  </div>
                )}
                <div className="relative flex flex-col items-center gap-3">
                  {ad.logoUrl && (
                    <img src={ad.logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <h2 className="max-w-full text-xl font-bold leading-tight" style={{ color: ad.accent || '#d4af37' }}>
                    {ad.title}
                  </h2>
                  {ad.headline && <p className="max-w-full text-sm leading-relaxed text-[#c9c4b4]">{ad.headline}</p>}
                  {ad.linkUrl && (
                    <button onClick={openAd} className="mt-1 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90"
                      style={{ background: ad.accent || '#d4af37' }}>
                      {ad.cta || 'Learn more'} <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[#6a665a]">
                    {settings.headerText} · {index + 1} / {ads.length}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#d4af37]/12 bg-[#0a0a0f] px-3 py-2">
            <button onClick={() => setPaused((p) => !p)} className="grid h-9 min-h-[44px] min-w-[44px] place-items-center rounded-lg text-[#8a8577] hover:text-[#f0ecdd] transition-colors" aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1.5">
              {ads.map((a, i) => (
                <button key={a.id} onClick={() => setIndex(i)} aria-label={`Broadcast ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index % ads.length ? 'w-6 bg-[#d4af37]' : 'w-1.5 bg-white/15 hover:bg-white/30'}`} />
              ))}
            </div>
            <button onClick={() => setMuted((m) => !m)} className="grid h-9 min-h-[44px] min-w-[44px] place-items-center rounded-lg text-[#8a8577] hover:text-[#f0ecdd] transition-colors" aria-label={muted ? 'Unmute' : 'Mute'}>
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
          className={`fixed z-[70] grid place-items-center rounded-full bg-gradient-to-br from-[#1b1b22] to-[#0a0a0f] text-[#d4af37] shadow-2xl ring-1 ring-[#d4af37]/40 ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab transition-transform hover:scale-105'}`}
          style={{ left: pos.x, top: pos.y, height: BTN, width: BTN, touchAction: 'none' }}
        >
          <img src={TRADINGBIBLE_LOGO} alt="" className="h-8 w-8 rounded-full object-contain opacity-90" onError={e => { e.currentTarget.style.display = 'none'; }} />
          {ads.length > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-[#0c0c11] bg-[#d4af37] px-0.5 text-[9px] font-bold text-[#0a0a0f]">{ads.length > 9 ? '9+' : ads.length}</span>
          )}
        </button>
      )}
    </>
  );
}
