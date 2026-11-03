import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles, RefreshCw, ShieldCheck, BookOpen, LineChart, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';
import { Card } from '@/components/ui-kit';

const SUGGESTED_KEYS = ['coach.s1', 'coach.s2', 'coach.s3', 'coach.s4'];

export default function CoachPage() {
  const { messages, isStreaming, isLoadingHistory, sendMessage } = useIntegratedAi();
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const element = listRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;
    setInput('');
    sendMessage(value);
  };

  const empty = !isLoadingHistory && messages.length === 0;

  return (
    <AppLayout title={t('nav.coach', null, 'SI Coach')}>
      <div className="ex-page">
        <header className="ex-page-head">
          <div className="ex-page-head__copy">
            <span className="ex-kicker">Structured intuition</span>
            <h1 className="ex-page-title">SI Coach</h1>
            <p className="ex-page-sub">A journal-aware coach for setup reviews, risk discipline and turning a losing week into a repeatable process.</p>
          </div>
          <div className="ex-page-actions">
            <Link to="/app/journal" className="ex-btn ex-btn--secondary ex-btn--sm"><BookOpen /> Open journal</Link>
            <Link to="/app/analytics" className="ex-btn ex-btn--secondary ex-btn--sm"><LineChart /> Analytics</Link>
          </div>
        </header>

        <div className="ex-coach">
          <section className="ex-chat" aria-label="SI Coach chat">
            <div className="ex-chat__head">
              <span className="ex-chat__head-icon"><Bot /></span>
              <div className="min-w-0 flex-1">
                <strong>{t('coach.tradingCoach', null, 'Trading coach')}</strong>
                <span>Journal-aware · grounded in your record</span>
              </div>
              <span className="ex-badge ex-badge--up"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ex-up)]" /> {t('coach.online', null, 'Online')}</span>
            </div>

            <div ref={listRef} className="ex-chat__body">
              {isLoadingHistory && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--ex-muted)]">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('coach.loadingConv', null, 'Loading conversation…')}
                </div>
              )}

              {empty && (
                <div className="ex-chat__welcome">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ex-accent)]">
                    <Sparkles className="h-3 w-3" /> Start here
                  </div>
                  {t('coach.welcome', null, 'Ask SI to review a trade, pressure-test a setup, or build a checklist from your journal. It will use your recorded context — not invented results.')}
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`ex-msg ${message.role === 'user' ? 'ex-msg--user' : ''}`}>
                  <div className="ex-msg__bubble">
                    {message.content || (isStreaming && index === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1 py-1" aria-label="Thinking">
                        <span className="coach-dot" /><span className="coach-dot" /><span className="coach-dot" />
                      </span>
                    ) : '')}
                    {message.images?.map((url, imageIndex) => (
                      <img key={imageIndex} src={url} alt="" className="mt-2 max-w-full rounded-[6px]" loading="lazy" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="ex-chat__composer">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && send()}
                disabled={isStreaming}
                placeholder={t('coach.askPh', null, 'Ask SI about a trade, a setup or your risk…')}
                className="ex-input min-w-0 flex-1"
                aria-label="Message SI Coach"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={isStreaming || !input.trim()}
                className="ex-btn ex-btn--primary h-[38px] w-[38px] shrink-0 px-0"
                aria-label="Send message"
              >
                {isStreaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div className="ex-card-title">{t('coach.suggested', null, 'Suggested prompts')}</div>
              </div>
              <div className="ex-card-body pt-0">
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_KEYS.map((key, index) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(t(key))}
                      disabled={isStreaming}
                      className="ex-prompt-btn"
                    >
                      <span>0{index + 1}</span>
                      <span className="min-w-0 flex-1">{t(key)}</span>
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ex-faint)]" />
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div className="ex-card-title">{t('coach.how', null, 'How SI works')}</div>
              </div>
              <div className="ex-card-body pt-0">
                <p className="text-[11px] leading-relaxed text-[var(--ex-muted)]">{t('coach.howBody', null, 'SI reads your journal, analytics and open risk. It does not invent fills, balances or approvals. Every answer is a coaching aid, not financial advice.')}</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    [ShieldCheck, 'Grounded in your recorded trades'],
                    [BookOpen, 'Uses journal notes and tags'],
                    [LineChart, 'References performance analytics'],
                  ].map(([Icon, label]) => (
                    <div key={label} className="flex items-center gap-2 text-[10.5px] text-[var(--ex-text-2)]">
                      <Icon className="h-3.5 w-3.5 text-[var(--ex-accent)]" /> {label}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div className="ex-card-title">Need a human?</div>
              </div>
              <div className="ex-card-body pt-0">
                <p className="text-[11px] leading-relaxed text-[var(--ex-muted)]">For account, billing or access issues, contact the support desk.</p>
                <Link to="/contact" className="ex-btn ex-btn--secondary ex-btn--sm mt-2 w-full">Contact support <ArrowRight /></Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
