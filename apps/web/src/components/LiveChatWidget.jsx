import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, BarChart3, Cable, Wallet, Target, Info, Wrench, MessageSquare, MessageCircle, Eraser, ExternalLink, Crown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { meetsPlan } from '@/lib/entitlements';
import { useI18n } from '@/lib/i18n';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

const BTN = 56; // button size in px
const MARGIN = 12;

const QUICK_PROMPTS = [
  { key: 'aiw.q1', icon: BarChart3 },
  { key: 'aiw.q2', icon: Cable },
  { key: 'aiw.q3', icon: Wallet },
  { key: 'aiw.q4', icon: Target },
];

const TABS = [
  { id: 'coach', key: 'aiw.coach', icon: MessageSquare },
  { id: 'tools', key: 'aiw.tools', icon: Wrench },
  { id: 'about', key: 'aiw.about', icon: Info },
];

const iconBtn = 'grid h-7 w-7 place-items-center rounded-lg border border-[#d4af37]/12 text-[#8a8577] transition-colors hover:border-[#d4af37]/35 hover:bg-white/5 hover:text-[#f0ecdd]';

function MessageBubble({ from, text, images, tag, t }) {
  const you = from === 'you';
  return (
    <div className={`flex ${you ? 'justify-end' : 'justify-start'}`}>
      {(text || images?.length) ? (
        <div className={`flex max-w-[88%] items-end gap-1.5 ${you ? 'flex-row-reverse' : ''}`}>
          {!you && (
            <div className="mb-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0c0c11]/80 border border-[#d4af37]/30">
              <img src={TRADINGBIBLE_LOGO} alt="" className="h-[15px] w-[15px] rounded-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
          <div className="min-w-0">
            {!you && tag && (
              <div className="mb-1 ml-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]/80">
                <Sparkles className="h-2.5 w-2.5" /> {tag}
              </div>
            )}
            <div className={`break-words rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${you
              ? 'rounded-br-md bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_3px_14px_rgba(212,175,55,0.3)]'
              : 'glass rounded-bl-md border border-[#d4af37]/10 text-[#e9e7df] shadow-[0_2px_12px_rgba(0,0,0,0.35)]'}`}>
              {images && images.length > 0 && images.map((img, i) => (img ? <img key={i} src={img} alt="Generated" className="mb-2 max-h-36 rounded-lg" /> : null))}
              {text}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Draggable, edge-snapping SI assistant launcher + chat panel.
// Mounted once at app root, so chats survive page navigation.
export default function LiveChatWidget() {
  const { isAuthed, user } = useAuth();
  // The bubble shows on every plan; only Elite+ may actually chat.
  // Below-Elite users get an upgrade panel instead (the API enforces too).
  const coachLocked = isAuthed && !meetsPlan(user, 'elite');
  const { t } = useI18n();
  const nav = useNavigate();
  const { messages, isStreaming, sendMessage, clearMessages } = useIntegratedAi();
  const WELCOME = t('aiw.welcome');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('coach');
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('tb:open-live-chat', handler);
    return () => window.removeEventListener('tb:open-live-chat', handler);
  }, []);

  // Auto-scroll the transcript while streaming.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, open, tab]);

  // Unread badge: agent replied while the panel was closed.
  const lastRole = messages.length ? messages[messages.length - 1]?.role : null;
  useEffect(() => {
    if (!open && lastRole === 'assistant' && !isStreaming) setUnread(true);
    if (open) setUnread(false);
  }, [open, lastRole, isStreaming]);

  const send = (override) => {
    const body = (override !== undefined ? String(override) : text).trim();
    if (!body || isStreaming) return;
    if (!isAuthed) {
      setOpen(false);
      nav('/login');
      return;
    }
    if (coachLocked) return; // upsell panel handles the CTA
    setText('');
    setTab('coach');
    sendMessage(body);
  };

  // Launcher + panel are pinned bottom-right.
  const visibleMessages = [{ from: 'agent', text: WELCOME }, ...messages.map((m) => ({ from: m.role === 'user' ? 'you' : 'agent', text: m.content, images: m.images }))];
  const isFirstRun = visibleMessages.length <= 1;
  const coachTag = `${t('aiw.coach')} · Muse Spark`;

  return (
    <div className="tv-widget-root">
      {open && (
        <div
          className="tv-chat-panel tv-pop fixed z-[70] flex h-[34rem] max-h-[calc(100dvh-2rem)] w-[min(25rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.6rem] border border-[#d4af37]/25 bg-[#0c0c11]/85 shadow-[0_24px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(212,175,55,0.16)] backdrop-blur-xl"
          style={{ bottom: '0.75rem', right: '0.75rem' }}
        >
          {/* Gold top-edge accent + ambient glow + terminal scanlines */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(212,175,55,0.022)_0px,rgba(212,175,55,0.022)_1px,transparent_1px,transparent_3px)]" />

          {/* Frosted header */}
          <div className="relative flex items-center gap-2.5 border-b border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3.5 py-2.5 backdrop-blur-md">
            <div className="relative">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-10 w-10 object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0f] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="gold-text font-display truncate text-base">TradingBible SI</div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearMessages} aria-label={t('aiw.clearChat')} className={`${iconBtn} ml-auto`}>
                <Eraser className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label={t('aiw.closeChat')} className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab bar — segmented control */}
          <div className="px-3 pt-2">
            <div className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-black/30 p-1">
              {TABS.map(({ id, key, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} disabled={coachLocked && id !== 'about'}
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-all disabled:opacity-40 ${tab === id
                    ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]'
                    : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          {coachLocked ? (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-[#f0ecdd]">SI Coach is an Elite feature</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8a8577]">Upgrade to Elite SI for 24/7 trade reviews, mistake detection and reports.</p>
              </div>
              <button
                onClick={() => { setOpen(false); nav('/pricing'); }}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 text-sm font-bold text-[#0a0a0f] transition hover:opacity-90"
              >
                <Crown className="h-4 w-4" /> Upgrade to Elite
              </button>
            </div>
          ) : (
          <>
          {tab === 'coach' && (
            <div ref={scrollRef} className="relative flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3">
              {!isAuthed && (
                <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.06] p-3 text-xs text-[#c9c4b4]">
                  {t('aiw.signin')}
                  <Link to="/login" className="mt-2 block font-semibold text-[#d4af37] hover:underline">{t('aiw.signinBtn')}</Link>
                </div>
              )}
              {isFirstRun && isAuthed && (
                <div className="tint-soft rounded-2xl border border-[#d4af37]/12 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f4e6a8] to-[#a67c1e] text-[#0a0a0f] shadow-[0_0_18px_rgba(212,175,55,0.4)]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#f0ecdd]">{t('aiw.heroT')}</div>
                      <div className="text-[10px] text-[#8a8577]">{t('aiw.heroS')}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {QUICK_PROMPTS.map(({ key, icon: Icon }) => (
                      <button key={key} onClick={() => send(t(key))} disabled={isStreaming}
                        className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/[0.05] px-2.5 text-left text-[11px] text-[#c9c4b4] transition hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.1] hover:text-[#f0ecdd] disabled:opacity-50">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {visibleMessages.map((m, idx) => (
                <MessageBubble key={idx} from={m.from} text={m.text} images={m.images} tag={m.from === 'agent' && idx > 0 ? coachTag : null} t={t} />
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-1.5">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0c0c11]/80 border border-[#d4af37]/30">
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
          )}

          {tab === 'tools' && (
            <div className="relative flex-1 space-y-2 overflow-y-auto p-3.5">
              {QUICK_PROMPTS.map(({ key, icon: Icon }) => (
                <button key={key} onClick={() => send(t(key))} disabled={isStreaming}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.04] px-3.5 py-3 text-left transition hover:border-[#d4af37]/45 hover:bg-[#d4af37]/[0.09] disabled:opacity-50">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#f4e6a8]/20 to-[#a67c1e]/20 text-[#d4af37]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#f0ecdd]">{t(key)}</div>
                    <div className="text-[10px] text-[#8a8577]">{t('aiw.sendsPrompt')}</div>
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
                    <div className="text-[13px] font-semibold text-[#c9c4b4]">{t('aiw.clear')}</div>
                    <div className="text-[10px] text-[#8a8577]">{t('aiw.clearSub')}</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {tab === 'about' && (
            <div className="relative flex-1 space-y-3 overflow-y-auto p-3.5">
              {[
                { h: t('aiw.model'), body: (<div className="font-mono mt-1 text-[11px] leading-relaxed text-[#c9c4b4]">muse-spark-1.3-contributor-free<br /><span className="text-[#8a8577]">{t('aiw.via')}</span></div>) },
                { h: t('aiw.privacy'), body: (<p className="mt-1 text-[11px] leading-relaxed text-[#c9c4b4]">{t('aiw.privacyB')}</p>) },
                { h: t('aiw.help'), body: (<a href="mailto:support@tradingbible.app" className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">support@tradingbible.app <ExternalLink className="h-3 w-3" /></a>) },
              ].map((s) => (
                <div key={s.h} className="rounded-xl border border-[#d4af37]/12 bg-[#0a0a0f]/60 p-3.5 backdrop-blur-md">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d4af37]">{s.h}</div>
                  {s.body}
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          {tab !== 'tools' && (
            <div className="relative border-t border-[#d4af37]/12 bg-[#0a0a0f]/70 px-3.5 pb-3 pt-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#0f0f14]/90 px-3 py-1 transition-colors focus-within:border-[#d4af37]/50 focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.08)]">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={t('aiw.askPh')} className="w-full bg-transparent py-1.5 text-[13px] text-[#e9e7df] placeholder-[#6a665a] outline-none" />
                <button onClick={() => send()} disabled={isStreaming || !text.trim()} aria-label={t('aiw.send')}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] shadow-[0_2px_12px_rgba(212,175,55,0.4)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#5a564a]">
                {t('aiw.enterSend')} <span className="animate-pulse text-[#d4af37]/70">▊</span>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t('aiw.openLabel')}
          title={t('aiw.openTitle')}
          className="tv-chat-btn fixed bottom-3 right-3 z-[70] grid place-items-center overflow-hidden rounded-full border border-[#d4af37]/30 bg-[#0c0c11] shadow-[0_8px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,175,55,0.4)] transition-transform hover:scale-105 hover:shadow-[0_10px_34px_rgba(212,175,55,0.5)]"
          style={{ height: BTN, width: BTN }}
        >
          <span className="relative grid h-10 w-10 place-items-center">
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
              <defs>
                <linearGradient id="si-chat-4d" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f4e6a8" />
                  <stop offset="55%" stopColor="#e2bd4f" />
                  <stop offset="100%" stopColor="#a67c1e" />
                </linearGradient>
              </defs>
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="url(#si-chat-4d)" stroke="#0a0a0f" strokeWidth="1" strokeLinejoin="round" />
              <ellipse cx="10" cy="8.6" rx="4.6" ry="2.4" fill="#ffffff" opacity="0.35" />
              <circle cx="8.6" cy="12" r="1.1" fill="#0a0a0f" />
              <circle cx="12" cy="12" r="1.1" fill="#0a0a0f" />
              <circle cx="15.4" cy="12" r="1.1" fill="#0a0a0f" />
            </svg>
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0f] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          {unread && (
            <span className="absolute -left-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-[#0a0a0f] bg-[#e50914] px-0.5 text-[9px] font-bold text-white animate-pulse">!</span>
          )}
        </button>
      )}
    </div>
  );
}
