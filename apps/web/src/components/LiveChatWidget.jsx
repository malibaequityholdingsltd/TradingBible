import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Headphones } from 'lucide-react';

const SUPPORT_EMAIL = 'support@tradingbible.app';
const POS_KEY = 'tb:chat-btn-pos';
const BTN = 56; // button size in px
const MARGIN = 12;

// Clamp a raw {x,y} to the viewport, then snap to the nearest screen edge.
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
  return { x: window.innerWidth - BTN - MARGIN, y: window.innerHeight - BTN - MARGIN };
}

// Draggable, edge-snapping live-agent chat launcher.
export default function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const [unread, setUnread] = useState(0);
  const [msgs, setMsgs] = useState([
    { from: 'agent', text: 'Hi! You\'re connected to TradingBible support. An agent will be with you shortly. How can we help?' },
  ]);
  const [text, setText] = useState('');

  const dragState = useRef({ active: false, moved: false, offX: 0, offY: 0 });

  useEffect(() => {
    const handler = () => { setOpen(true); setUnread(0); };
    window.addEventListener('tb:open-live-chat', handler);
    return () => window.removeEventListener('tb:open-live-chat', handler);
  }, []);

  // Keep the button on-screen when the viewport resizes / rotates.
  useEffect(() => {
    const onResize = () => setPos((p) => snapToEdge(p.x, p.y));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

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
      if (!dragState.current.moved) { setOpen(true); setUnread(0); }
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

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { from: 'you', text: t }]);
    setText('');
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'agent', text: `Thanks — a live agent will reply here soon. For anything urgent, email ${SUPPORT_EMAIL}.` }]);
      if (!open) setUnread((u) => u + 1);
    }, 700);
  };

  // Anchor the chat window to the side the button currently rests on.
  const onLeft = pos.x < window.innerWidth / 2;

  return (
    <>
      {open && (
        <div
          className="fixed z-[70] flex h-[26rem] max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11] shadow-2xl"
          style={{ bottom: '1rem', [onLeft ? 'left' : 'right']: '0.75rem' }}
        >
          <div className="flex items-center justify-between border-b border-[#d4af37]/12 bg-[#0a0a0f] px-4 py-3">
            <div className="flex items-center gap-2 text-[#f0ecdd]">
              <Headphones className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm font-semibold">Live Agent Chat</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, idx) => (
              <div key={idx} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.from === 'you' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'glass text-[#e9e7df]'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#d4af37]/12 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message…" className="w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
              <button onClick={send} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          aria-label="Open live chat (drag to move)"
          className={`fixed z-[70] grid place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-2xl ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab transition-transform hover:scale-105'}`}
          style={{ left: pos.x, top: pos.y, height: BTN, width: BTN, touchAction: 'none' }}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c11] bg-emerald-400" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full border-2 border-[#0c0c11] bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      )}
    </>
  );
}
