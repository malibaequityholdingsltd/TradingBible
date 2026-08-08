import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useIntegratedAi } from '@/hooks/use-integrated-ai';

const SUGGESTED = [
  'Analyze my recent trades and grade my performance',
  'What is my biggest recurring mistake?',
  'Which strategy works best for me and why?',
  'How can I improve my risk management?',
];

export default function CoachPage() {
  const { messages, isStreaming, isLoadingHistory, sendMessage } = useIntegratedAi();
  const [input, setInput] = useState('');
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t || isStreaming) return;
    setInput('');
    sendMessage(t);
  };

  const empty = !isLoadingHistory && messages.length === 0;

  return (
    <AppLayout title="AI Coach">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col rounded-2xl lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#d4af37]/12 px-4 py-3 sm:px-5 sm:py-4">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#d4af37]/12 text-[#d4af37]"><Bot className="h-4 w-4" /></div>
            <span className="font-semibold text-[#f0ecdd]">Trading Coach</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online</span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {isLoadingHistory && <div className="flex items-center gap-2 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading conversation…</div>}
            {empty && (
              <div className="rounded-2xl glass px-4 py-3 text-sm leading-relaxed text-[#e9e7df]">I'm your AI Trading Coach, powered by live AI. Ask me anything about your performance, mistakes, strategy or psychology — I'll give you a fund-grade review.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'glass text-[#e9e7df]'}`}>
                  {m.content || (isStreaming && i === messages.length - 1 ? <span className="inline-block h-4 w-2 animate-pulse bg-[#d4af37]" /> : '')}
                  {m.images?.map((url, j) => <img key={j} src={url} alt="" className="mt-2 max-w-full rounded-lg" loading="lazy" />)}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="border-t border-[#d4af37]/12 p-3 sm:p-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={isStreaming} placeholder="Ask your coach…" className="w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none disabled:opacity-60" />
              <button onClick={() => send()} disabled={isStreaming} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] disabled:opacity-60">{isStreaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2 text-[#d4af37]"><Sparkles className="h-4 w-4" /><span className="text-sm font-semibold">Suggested prompts</span></div>
            <div className="space-y-2">{SUGGESTED.map((s) => <button key={s} onClick={() => send(s)} disabled={isStreaming} className="w-full rounded-lg border border-[#d4af37]/12 px-3 py-2.5 text-left text-sm text-[#c9c4b4] transition hover:border-[#d4af37]/40 hover:text-[#f0ecdd] disabled:opacity-60">{s}</button>)}</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold text-[#f0ecdd]">How it works</h3>
            <p className="text-sm leading-relaxed text-[#8a8577]">The coach reasons over trading best practices and your questions to detect mistakes, grade discipline and prescribe concrete fixes. Connect brokers first so you can reference your synced stats.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
