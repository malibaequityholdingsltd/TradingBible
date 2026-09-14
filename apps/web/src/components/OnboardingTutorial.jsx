import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import {
  X, ArrowRight, ArrowLeft, LayoutDashboard, BookOpen, Bot, GraduationCap,
  Plug, Users, BarChart3, Calculator, Check, Bell, Radar, CalendarClock, Landmark, KeyRound, Building2,
  CandlestickChart, ListOrdered, Grid2x2, ShieldCheck, CreditCard,
} from 'lucide-react';

const STEPS = [
  { icon: LayoutDashboard, titleKey: 'nav.dashboard', to: '/app', bodyKey: 'tour.b.dashboard' },
  { icon: ListOrdered, titleKey: 'nav.terminal', to: '/app/terminal', bodyKey: 'tour.b.terminal' },
  { icon: CandlestickChart, titleKey: 'nav.charts', to: '/app/charts', bodyKey: 'tour.b.charts' },
  { icon: Grid2x2, titleKey: 'nav.heatmaps', to: '/app/heatmaps', bodyKey: 'tour.b.heatmaps' },
  { icon: BarChart3, titleKey: 'nav.analytics', to: '/app/analytics', bodyKey: 'tour.b.analytics' },
  { icon: Radar, titleKey: 'nav.signals', to: '/app/signals', bodyKey: 'tour.b.signals' },
  { icon: Bell, titleKey: 'nav.alerts', to: '/app/alerts', bodyKey: 'tour.b.alerts' },
  { icon: CalendarClock, titleKey: 'nav.economic', to: '/app/economic-calendar', bodyKey: 'tour.b.calendar' },
  { icon: BookOpen, titleKey: 'nav.journal', to: '/app/journal', bodyKey: 'tour.b.journal' },
  { icon: Bot, titleKey: 'nav.coach', to: '/app/coach', bodyKey: 'tour.b.coach' },
  { icon: GraduationCap, titleKey: 'nav.academy', to: '/app/academy', bodyKey: 'tour.b.academy' },
  { icon: Plug, titleKey: 'nav.brokers', to: '/app/brokers', bodyKey: 'tour.b.brokers' },
  { icon: ShieldCheck, titleKey: 'nav.propfirms', to: '/app/prop-firms', bodyKey: 'tour.b.propfirms' },
  { icon: Users, titleKey: 'nav.community', to: '/app/community', bodyKey: 'tour.b.community' },
  { icon: Calculator, titleKey: 'nav.tools', to: '/app/tools', bodyKey: 'tour.b.tools' },
  { icon: Landmark, titleKey: 'nav.wallet', to: '/app/wallet', bodyKey: 'tour.b.wallet' },
  { icon: CreditCard, titleKey: 'nav.billing', to: '/app/billing', bodyKey: 'tour.b.billing' },
  { icon: KeyRound, titleKey: 'nav.apikeys', to: '/app/api-keys', bodyKey: 'tour.b.apikeys' },
  { icon: Building2, titleKey: 'nav.company', to: '/company', bodyKey: 'tour.b.company' },
];

export default function OnboardingTutorial({ onClose, onComplete }) {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const { t } = useI18n();
  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  const go = (delta) => setI((v) => Math.min(STEPS.length - 1, Math.max(0, v + delta)));
  const finish = () => { onComplete?.(); onClose?.(); };
  const visit = () => { const to = step.to; onClose?.(); nav(to); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg animate-[floaty_0.4s_ease-out] overflow-hidden rounded-t-2xl border border-[#d4af37]/25 bg-[#0c0c11] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#d4af37]/12 px-5 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8577]">{t('guide.kicker')} · {i + 1}/{STEPS.length}</span>
          <button onClick={onClose} aria-label={t('c.skipTour')} className="text-[#8a8577] transition hover:text-[#e9e7df]"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><Icon className="h-7 w-7" /></div>
          <h3 className="text-xl font-semibold text-[#f0ecdd]">{t(step.titleKey)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{t(step.bodyKey)}</p>
          <button onClick={visit} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#d4af37] hover:underline">
            {t('c.takeMeThere')} <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-6 flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`Step ${idx + 1}`} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[#d4af37]' : 'w-1.5 bg-white/15'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#d4af37]/12 px-5 py-4">
          <button onClick={onClose} className="text-sm text-[#8a8577] transition hover:text-[#e9e7df]">{t('c.skipTour')}</button>
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} disabled={i === 0} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-sm font-medium text-[#e9e7df] transition hover:border-[#d4af37]/60 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> {t('c.back')}
            </button>
            {last ? (
              <button onClick={finish} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-semibold text-[#0a0a0f]">
                <Check className="h-4 w-4" /> {t('c.finish')}
              </button>
            ) : (
              <button onClick={() => go(1)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2 text-sm font-semibold text-[#0a0a0f]">
                {t('c.next')} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
