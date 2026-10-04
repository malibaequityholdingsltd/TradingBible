import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';
import { PageHero, Card, SectionHead } from '@/components/ui-kit';

const SUGGESTED_KEYS = ['coach.s1', 'coach.s2', 'coach.s3', 'coach.s4'];

export default function CoachPage() {
  const { messages, isStreaming, isLoadingHistory, sendMessage } = useIntegratedAi();
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (text) => {
    const v = (text ?? input).trim();
    if (!v || isStreaming) return;
    setInput('');
    sendMessage(v);
  };

  const empty = !isLoadingHistory && messages.length === 0;

  return (
    <AppLayout title={t('nav.coach')}>
      <div className="tb-page">
        <PageHero kickerIcon={Bot} kicker={t('nav.coach')} title={t('coach.tradingCoach')} subtitle={t('coach.online')} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="tb-card flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col !p-0 lg:col-span-2">
            <div className="flex items-center gap-2 border-b border-[#d4af37]/12 px-4 py-3 sm:px-5 sm:py-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#d4af37]/12 text-[#d4af37]"><Bot className="h-4 w-4" /></div>
              <span className="truncate font-semibold text-[#f0ecdd]">{t('coach.tradingCoach')}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {t('coach.online')}</span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {isLoadingHistory && <div className="flex items-center gap-2 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> {t('coach.loadingConv')}</div>}
              {empty && (
                <div className="tb-card px-4 py-3 text-sm leading-relaxed text-[#e9e7df]">{t('coach.welcome')}</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] lg:max-w-2xl xl:max-w-3xl ${m.role === 'user' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'tb-card text-[#e9e7df]'}`}>
                    {m.content || (isStreaming && i === messages.length - 1 ? <span className="inline-block h-4 w-2 animate-pulse bg-[#d4af37]" /> : '')}
                    {m.images?.map((url, j) => <img key={j} src={url} alt="" className="mt-2 max-w-full rounded-lg" loading="lazy" />)}
                  </div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="border-t border-[#d4af37]/12 p-3 sm:p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={isStreaming} placeholder={t('coach.askPh')} className="w-full min-w-0 bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none disabled:opacity-60" />
                <button onClick={() => send()} disabled={isStreaming} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] disabled:opacity-60">{isStreaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Card className="p-5">
              <SectionHead icon={Sparkles} title={t('coach.suggested')} />
              <div className="space-y-2">{SUGGESTED_KEYS.map((k) => <button key={k} onClick={() => send(t(k))} disabled={isStreaming} className="min-h-[44px] w-full rounded-lg border border-[#d4af37]/12 px-3 py-2.5 text-left text-sm text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#f0ecdd] disabled:opacity-60">{t(k)}</button>)}</div>
            </Card>
            <Card className="p-5">
              <SectionHead title={t('coach.how')} />
              <p className="text-sm leading-relaxed text-[#8a8577]">{t('coach.howBody')}</p>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
