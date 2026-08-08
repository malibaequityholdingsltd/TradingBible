import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ArrowRight, ArrowLeft, LayoutDashboard, BookOpen, Bot, GraduationCap,
  Plug, Users, BarChart3, Calculator, Check, Bell, Radar, CalendarClock, Landmark, KeyRound, Building2,
} from 'lucide-react';

const STEPS = [
  { icon: LayoutDashboard, title: 'Dashboard', to: '/app', body: 'Your command center. Track account balance, daily / weekly / monthly P&L, win rate, profit factor and your AI-computed Trader Score. The equity curve shows account growth over time.' },
  { icon: BarChart3, title: 'Performance Analytics', to: '/app/analytics', body: 'Use detailed metrics and equity analysis to identify what actually makes you profitable, then double down on those patterns.' },
  { icon: Radar, title: 'Trading Signals', to: '/app/signals', body: 'Monitor live technical signals with confidence scores. Compare signal outcomes with your own execution quality.' },
  { icon: Bell, title: 'Price Alerts', to: '/app/alerts', body: 'Set symbol-based alerts so you never miss your setup. Alerts sync with your profile and can be managed from desktop or mobile.' },
  { icon: CalendarClock, title: 'Economic Calendar', to: '/app/economic-calendar', body: 'Filter key macro events and avoid overtrading during high-impact releases. This is essential for risk control.' },
  { icon: BookOpen, title: 'Trading Journal', to: '/app/journal', body: 'Every trade lands here automatically once you connect a broker. Search, filter and open any trade to review entry, exit, strategy and emotion. Use "Sync Brokers" to pull the latest fills.' },
  { icon: Bot, title: 'AI Coach', to: '/app/coach', body: 'Ask your AI coach to review trades, grade discipline, spot recurring mistakes and prescribe concrete fixes — fund-grade feedback on demand.' },
  { icon: GraduationCap, title: 'Academy', to: '/app/academy', body: 'Structured learning paths, video courses and live webinars from beginner to pro. Complete a path to earn a shareable Certified Journal Trader badge.' },
  { icon: Plug, title: 'Brokers', to: '/app/brokers', body: 'Connect MT4, MT5, cTrader, DXtrade, Interactive Brokers, Binance, Bybit or Coinbase. Once linked, your trades sync automatically — no manual entry.' },
  { icon: Users, title: 'Community', to: '/app/community', body: 'Discuss strategy and psychology in the forums, and see how you stack up on the leaderboards ranked by win rate, profit factor and consistency.' },
  { icon: Calculator, title: 'Risk Tools', to: '/app/tools', body: 'Size positions for a fixed risk, evaluate risk/reward before entering, and monitor total portfolio heat across open positions.' },
  { icon: Landmark, title: 'Wallet & Billing', to: '/app/wallet', body: 'Manage subscription billing, account wallet data, and account-level funding records in one place.' },
  { icon: KeyRound, title: 'API Keys', to: '/app/api-keys', body: 'Create personal API keys to connect bots and automation safely. Keys can be revoked instantly from your profile.' },
  { icon: Building2, title: 'School & Company Portal', to: '/company', body: 'Company and school accounts have a dedicated dashboard for teachers, students, exams, submissions, and academy profile discovery.' },
];

export default function OnboardingTutorial({ onClose, onComplete }) {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  const go = (delta) => setI((v) => Math.min(STEPS.length - 1, Math.max(0, v + delta)));
  const finish = () => { onComplete?.(); onClose?.(); };
  const visit = () => { nav(step.to); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-[floaty_0.4s_ease-out] overflow-hidden rounded-t-2xl border border-[#d4af37]/25 bg-[#0c0c11] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#d4af37]/12 px-5 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8577]">Getting started · {i + 1}/{STEPS.length}</span>
          <button onClick={onClose} aria-label="Skip tutorial" className="text-[#8a8577] transition hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-7 w-7" /></div>
          <h3 className="text-xl font-semibold text-[#f0ecdd]">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{step.body}</p>
          <button onClick={visit} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#d4af37] hover:underline">
            Take me there <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="mt-6 flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`Step ${idx + 1}`} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[#d4af37]' : 'w-1.5 bg-white/15'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#d4af37]/12 px-5 py-4">
          <button onClick={onClose} className="text-sm text-[#8a8577] transition hover:text-[#e9e7df]">Skip tour</button>
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} disabled={i === 0} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm font-medium text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {last ? (
              <button onClick={finish} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-semibold text-[#0a0a0f]">
                <Check className="h-4 w-4" /> Finish
              </button>
            ) : (
              <button onClick={() => go(1)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-semibold text-[#0a0a0f]">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
