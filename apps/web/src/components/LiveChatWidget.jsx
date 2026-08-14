import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, BarChart3, Cable, Wallet, Target, Info, Wrench, MessageSquare, Eraser, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';
import { TRADINGBIBLE_LOGO } from '@/lib/branding';

const POS_KEY = 'tb:chat-btn-pos';
const BTN = 56; // button size in px
const MARGIN = 12;

const WELCOME = 'Hi! I\'m the TradingBible AI coach. I can help with your dashboard, brokers, charts, billing — and trading strategy. What can I do for you?';

const QUICK_PROMPTS = [
  { label: 'Analyze my trading', icon: BarChart3 },
  { label: 'Connect my broker', icon: Cable },
  { label: 'Which plan fits me?', icon: Wallet },
  { label: 'Fix my discipline', icon: Target },
];

const TABS = [
  { id: 'coach', label: 'Coach', icon: MessageSquare },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'about', label: 'About', icon: Info },
];

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

// Draggable, edge-snapping AI assistant launcher.
export default function LiveChatWidget() {
  const { isAuthed } = useAuth();
  const nav = useNavigate();
  const { messages, isStreaming, sendMessage, clearMessages } = useIntegratedAi();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('coach');
  const [pos, setPos] = useState(() => (typeof window !== 'undefined' ? loadPos() : { x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const dragState = useRef({ active: false, moved: false, offX: 0, offY: 0 });

  useEffect(() => {
    const handler = () => setOpen(true);
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
  }, [messages, isStreaming, open, tab]);

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

  const send = (override) => {
    const t = (override !== undefined ? String(override) : text).trim();
    if (!t || isStreaming) return;
    if (!isAuthed) {
      setOpen(false);
      nav('/login');
      return;
    }
    setText('');
    setTab('coach');
    sendMessage(t);
  };

  // Anchor the chat window to the side the button currently rests on.
  const onLeft = pos.x < window.innerWidth / 2;
  const visibleMessages = [{ from: 'agent', text: WELCOME }, ...messages.map((m) => ({ from: m.role === 'user' ? 'you' : 'agent', text: m.content, images: m.images }))];
  const isFirstRun = visibleMessages.length <= 1;

  return (
    <div className="tv-widget-root">
      {open && (
        <div
          className="tv-chat-panel tv-pop fixed z-[70] flex h-[34rem] max-h-[calc(100dvh-2rem)] w-[min(25rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.6rem] border border-[#d4af37]/25 bg-[#0c0c11]/85 shadow-[0_24px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(212,175,55,0.16)] backdrop-blur-xl"
          style={{ bottom: '0.75rem', [onLeft ? 'left' : 'right']: '0.75rem' }}
        >
          {/* Ambient gold glow + terminal scanlines */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(212,175,55,0.022)_0px,rgba(212,175,55,0.022)_1px,transparent_1px,transparent_3px)]" />

          {/* Frosted header */}
          <div className="relative flex items-center gap-2.5 border-b border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3.5 py-2.5 backdrop-blur-md">
            <div className="relative">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] shadow-[0_0_16px_rgba(212,175,55,0.35)]">
                <img src={TRADINGBIBLE_LOGO} alt="" className="h-5 w-5 rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-[#0c0c11] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
            <div className="leading-tight">
              <div className="gold-text text-[13px] font-bold tracking-wide">TradingBible AI</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8577]">
                <span className="text-emerald-400">●</span> live · deepseek v4 flash free
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearMessages} aria-label="Clear conversation" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd] transition-colors">
                <Eraser className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-7 w-7 place-items-center rounded-lg text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="relative flex items-center gap-1 px-3 pt-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
                className={`flex min-h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${tab === id
                  ? 'bg-[#d4af37]/12 text-[#d4af37] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]'
                  : 'text-[#8a8577] hover:bg-white/5 hover:text-[#f0ecdd]'}`}>
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'coach' && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="relative flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3">
                {!isAuthed && (
                  <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.06] p-3 text-xs text-[#c9c4b4]">
                    Sign in to chat with the AI coach — it can answer questions about your dashboard, brokers and account.
                    <Link to="/login" className="mt-2 block font-semibold text-[#d4af37] hover:underline">Sign in</Link>
                  </div>
                )}
                {isFirstRun && isAuthed && (
                  <div className="rounded-2xl border border-[#d4af37]/12 bg-gradient-to-br from-[#d4af37]/[0.1] via-[#0a0a0f]/60 to-transparent p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-[#0a0a0f] shadow-[0_0_18px_rgba(212,175,55,0.4)]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#f0ecdd]">Your AI trading coach is here</div>
                        <div className="text-[10px] text-[#8a8577]">Ask anything about performance, markets or the platform</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                        <button key={label} onClick={() => send(label)} disabled={isStreaming}
                          className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/[0.05] px-2.5 text-left text-[11px] text-[#c9c4b4] transition hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.1] hover:text-[#f0ecdd] disabled:opacity-50">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {visibleMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                    {m.text || m.images?.length ? (
                      <div className={`flex max-w-[88%] items-end gap-1.5 ${m.from === 'you' ? 'flex-row-reverse' : ''}`}>
                        {m.from === 'agent' && (
                          <div className="mb-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e]">
                            <img src={TRADINGBIBLE_LOGO} alt="" className="h-[15px] w-[15px] rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                        )}
                        <div className={`min-w-0 break-words rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${m.from === 'you'
                          ? 'rounded-br-md bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_3px_14px_rgba(212,175,55,0.3)]'
                          : 'glass rounded-bl-md border border-[#d4af37]/10 text-[#e9e7df]'}`}>
                          {m.images && m.images.length > 0 && m.images.map((img, i) => (img ? <img key={i} src={img} alt="Generated" className="mb-2 max-h-36 rounded-lg" /> : null))}
                          {m.text}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-1.5">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e]">
                        <img src={TRADINGBIBLE_LOGO} alt="" className="h-[15px] w-[15px] rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#d4af37]/10 px-3 py-2.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37] [animation-delay:0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d4af37] [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'tools' && (
            <div className="relative flex-1 space-y-2 overflow-y-auto p-3.5">
              {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                <button key={label} onClick={() => send(label)} disabled={isStreaming}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.04] px-3.5 py-3 text-left transition hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.09] disabled:opacity-50">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f4e6a8]/20 to-[#a67c1e]/20 text-[#d4af37]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#f0ecdd]">{label}</div>
                    <div className="text-[10px] text-[#8a8577]">Sends this prompt to the AI coach</div>
                  </div>
                </button>
              ))}
              {messages.length > 0 && (
                <button onClick={clearMessages}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-red-400/40 hover:bg-red-400/[0.06]">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8a8577]">
                    <Eraser className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#c9c4b4]">Clear conversation</div>
                    <div className="text-[10px] text-[#8a8577]">Start a fresh session with the coach</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="relative flex-1 space-y-3 overflow-y-auto p-3.5">
              <div className="rounded-xl border border-[#d4af37]/12 bg-[#0a0a0f]/60 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">Model</div>
                <div className="font-mono mt-1 text-[11px] leading-relaxed text-[#c9c4b4]">
                  deepseek-v4-flash-free<br />
                  <span className="text-[#8a8577]">via opencode gateway · chat-only agent</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#d4af37]/12 bg-[#0a0a0f]/60 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">Privacy</div>
                <p className="mt-1 text-[11px] leading-relaxed text-[#c9c4b4]">
                  Your conversations are stored in your account to keep history across devices. The AI never trades or moves money for you — it only gives guidance.
                </p>
              </div>
              <div className="rounded-xl border border-[#d4af37]/12 bg-[#0a0a0f]/60 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">Need help?</div>
                <a href="mailto:support@tradingbible.app" className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">
                  support@tradingbible.app <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Input */}
          {tab !== 'tools' && (
            <div className="relative border-t border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3.5 pb-3 pt-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14]/90 px-3 py-1 transition-colors focus-within:border-[#d4af37]/50 focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask your AI coach anything…" className="w-full bg-transparent py-1.5 text-[13px] text-[#e9e7df] placeholder-[#6a665a] outline-none" />
                <button onClick={() => send()} disabled={isStreaming || !text.trim()} aria-label="Send"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_2px_12px_rgba(212,175,55,0.4)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#5a564a]">
                enter to send <span className="animate-pulse text-[#d4af37]/70">▊</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!open && (
        <button
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          aria-label="Open AI assistant (drag to move)"
          title="TradingBible AI assistant"
          className={`tv-chat-btn fixed z-[70] grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#c99a25] shadow-[0_8px_28px_rgba(212,175,55,0.35),0_0_0_1px_rgba(212,175,55,0.4)] ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab transition-transform hover:scale-105 hover:shadow-[0_10px_34px_rgba(212,175,55,0.5)]'}`}
          style={{ left: pos.x, top: pos.y, height: BTN, width: BTN, touchAction: 'none' }}
        >
          <img src={TRADINGBIBLE_LOGO} alt="" className="h-9 w-9 rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c11] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
        </button>
      )}
    </div>
  );
}