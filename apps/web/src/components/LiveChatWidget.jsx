import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';

const POS_KEY = 'tb:chat-btn-pos';
const BTN = 56; // button size in px
const MARGIN = 12;

const WELCOME = 'Hi! I\'m the TradingBible AI assistant. I can help with your dashboard, brokers, charts, billing — and trading strategy. What can I do for you?';
const QUICK_PROMPTS = ['How do I connect my broker?', 'What plans are available?', 'Explain my chart to me'];

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

// Draggable, edge-snapping AI assistant chat launcher.
export default function LiveChatWidget() {
  const { isAuthed } = useAuth();
  const nav = useNavigate();
  const { messages, isStreaming, sendMessage, clearMessages } = useIntegratedAi();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

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

  // Auto-scroll the transcript while streaming.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, open]);

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

  const send = (override) => {
    const t = (override !== undefined ? String(override) : text).trim();
    if (!t || isStreaming) return;
    if (!isAuthed) {
      setOpen(false);
      nav('/login');
      return;
    }
    setText('');
    sendMessage(t);
  };

  // Anchor the chat window to the side the button currently rests on.
  const onLeft = pos.x < window.innerWidth / 2;
  const visibleMessages = [{ from: 'agent', text: WELCOME }, ...messages.map((m) => ({ from: m.role === 'user' ? 'you' : 'agent', text: m.content, images: m.images }))];

  return (
    <>
      {open && (
        <div
          className="fixed z-[70] flex h-[26rem] max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11] shadow-2xl"
          style={{ bottom: '1rem', [onLeft ? 'left' : 'right']: '0.75rem' }}
        >
          <div className="flex items-center justify-between border-b border-[#d4af37]/12 bg-[#0a0a0f] px-4 py-3">
            <div className="flex items-center gap-2 text-[#f0ecdd]">
              <Sparkles className="h-4 w-4 text-[#d4af37]" />
              <span className="text-sm font-semibold">AI Assistant</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearMessages} aria-label="Clear conversation" className="min-h-[44px] min-w-[44px] px-2 text-xs text-[#8a8577] hover:text-[#e9e7df]">Clear</button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid min-h-[44px] min-w-[44px] place-items-center text-[#8a8577] hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {!isAuthed && (
              <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.06] p-3 text-xs text-[#c9c4b4]">
                Sign in to chat with the AI assistant — it can answer questions about your dashboard, brokers and account.
                <Link to="/login" className="mt-2 block font-semibold text-[#d4af37] hover:underline">Sign in</Link>
              </div>
            )}
            {visibleMessages.map((m, idx) => (
              <div key={idx} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                {m.text || m.images?.length ? (
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.from === 'you' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'glass text-[#e9e7df]'}`}>
                    {m.images && m.images.length > 0 && m.images.map((img, i) => (img ? <img key={i} src={img} alt="Generated" className="mb-2 max-h-40 rounded-lg" /> : null))}
                    {m.text}
                  </div>
                ) : null}
              </div>
            ))}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="glass flex items-center gap-1 rounded-2xl px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37] [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37] [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-[#d4af37]/12 p-3">
            {visibleMessages.length <= 1 && isAuthed && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} onClick={() => send(q)} disabled={isStreaming} className="min-h-[36px] rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:opacity-50">{q}</button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message…" className="w-full bg-transparent py-1.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
              <button onClick={() => send()} disabled={isStreaming || !text.trim()} aria-label="Send" className="grid h-9 min-h-[44px] w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
      {!open && (
        <button
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          aria-label="Open AI assistant (drag to move)"
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