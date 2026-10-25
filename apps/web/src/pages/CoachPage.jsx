import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';
import { Card, SectionHead } from '@/components/ui-kit';
import { AtBadge, AtHero } from '@/components/AtelierUI';

const SUGGESTED_KEYS = ['coach.s1', 'coach.s2', 'coach.s3', 'coach.s4'];

export default function CoachPage() {
  const { messages, isStreaming, isLoadingHistory, sendMessage } = useIntegratedAi();
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text) => {
    const v = (text ?? input).trim();
    if (!v || isStreaming) return;
    setInput('');
    sendMessage(v);
  };

  const empty = !isLoadingHistory && messages.length === 0;

  return (
    <AppLayout title={t('nav.coach')}>
      <div className="at-page at-scope at-enter coach-page pb-10">
        <AtHero
          eyebrow="Private workstation · member"
          icon={Bot}
          title={<>{t('coach.tradingCoach')}</>}
          description={t('coach.howBody')}
          status={[
            { label: 'Coach', value: t('coach.online'), tone: 'green' },
            { label: 'Mode', value: 'Private session', tone: 'gold' },
            { label: 'Context', value: 'Your journal', tone: undefined },
          ]}
          statusTitle="Session state"
          actions={<AtBadge tone="gold">Local model · no public feed</AtBadge>}
          bottom={(
            <div className="flex flex-wrap items-center gap-2">
              <span className="at-live-dot" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--at-mut)]">{t('coach.online')}</span>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--at-mut-2)]">Conversation history is yours</span>
            </div>
          )}
        />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="coach-chat at-card flex h-[calc(100dvh-24rem)] min-h-[460px] flex-col overflow-hidden lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-[var(--at-line-soft)] px-4 py-3 sm:px-5 sm:py-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--at-line)] bg-[var(--at-gold-soft)] text-[var(--at-gold)]"><Bot className="h-4 w-4" /></div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--at-ink)]">{t('coach.tradingCoach')}</span>
                <span className="block text-[10px] text-[var(--at-mut)]">Structured intuition · journal-aware</span>
              </div>
              <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-2.5 py-1 text-[10px] text-[var(--at-green)]"><span className="at-live-dot" /> {t('coach.online')}</span>
            </div>
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {isLoadingHistory && <div className="flex items-center gap-2 text-sm text-[var(--at-mut)]"><RefreshCw className="h-4 w-4 animate-spin" /> {t('coach.loadingConv')}</div>}
              {empty && (
                <div className="rounded-2xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-4 py-4 text-sm leading-relaxed text-[var(--at-ink-2)]">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--at-gold)]"><Sparkles className="h-3.5 w-3.5" /> Start here</div>
                  {t('coach.welcome')}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] lg:max-w-2xl xl:max-w-3xl ${m.role === 'user' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'tb-card text-[var(--at-ink)]'}`}>
                    {m.content || (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1 py-1" aria-label="Thinking">
                        <span className="coach-dot" /><span className="coach-dot" /><span className="coach-dot" />
                      </span>
                    ) : '')}
                    {m.images?.map((url, j) => <img key={j} src={url} alt="" className="mt-2 max-w-full rounded-lg" loading="lazy" />)}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--at-line-soft)] p-3 sm:p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--at-line)] bg-[var(--at-soft)] px-3 py-2 transition focus-within:border-[var(--at-line-strong)] focus-within:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={isStreaming} placeholder={t('coach.askPh')} className="w-full min-w-0 bg-transparent text-sm text-[var(--at-ink)] outline-none placeholder:text-[var(--at-mut-2)] disabled:opacity-60" />
                <button onClick={() => send()} disabled={isStreaming} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] disabled:opacity-60">{isStreaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Card className="at-card p-5">
              <SectionHead icon={Sparkles} title={t('coach.suggested')} />
              <div className="space-y-2">{SUGGESTED_KEYS.map((k, i) => (
                <button key={k} onClick={() => send(t(k))} disabled={isStreaming} className="group flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2.5 text-left text-sm text-[var(--at-ink-2)] transition hover:-translate-y-0.5 hover:border-[var(--at-line-strong)] hover:bg-[var(--at-gold-soft)] hover:text-[var(--at-ink)] disabled:opacity-60">
                  <span className="font-mono text-[9px] text-[var(--at-gold)]">0{i + 1}</span>
                  <span className="min-w-0 flex-1">{t(k)}</span>
                  <Send className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}</div>
            </Card>
            <Card className="at-card at-shimmer p-5">
              <SectionHead title={t('coach.how')} />
              <p className="text-sm leading-relaxed text-[var(--at-mut)]">{t('coach.howBody')}</p>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
