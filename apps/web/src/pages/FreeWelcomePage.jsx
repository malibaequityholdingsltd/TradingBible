import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageSquare, ShieldCheck, Target, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, GoldButton } from '@/components/ui-kit';
import { useAuth } from '@/hooks/useAuth';
import { displayName } from '@/lib/displayName';

const ACCESS = [
  { to: '/app/academy', icon: BookOpen, title: 'Academy catalogue', body: 'Browse the 17 learning paths and see the full 347-lesson curriculum before you upgrade.' },
  { to: '/app/community', icon: MessageSquare, title: 'Community', body: 'Read trader discussions, ask a question and keep your public profile active.' },
  { to: '/app/paper', icon: Target, title: 'Paper trading', body: 'Practise decisions without risking capital while you evaluate Premium.' },
  { to: '/app/challenges', icon: Trophy, title: 'Challenges', body: 'Review funded-program rules and the evidence standards before you enter.' },
];

export default function FreeWelcomePage() {
  const { user } = useAuth();
  const name = displayName(user) || 'Trader';

  return (
    <AppLayout title="Welcome">
      <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
        <Card className="relative overflow-hidden rounded-2xl p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 tb-art-halo" style={{ background: 'radial-gradient(ellipse at top right, color-mix(in srgb, var(--tb-gold, #d4af37) 14%, transparent), transparent 58%)' }} />
          <div className="relative">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">Free account</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0ecdd] sm:text-3xl">Welcome, {name}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#b8b3a3]">
              Your free account is active. Explore the Academy catalogue, community, paper trading and challenges. TradingBible Premium unlocks the terminal, journal, analytics, SI coach, reports, signals and broker sync for $19.99/month.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <GoldButton to="/pricing" className="px-5 py-3">See Premium <ArrowRight className="h-4 w-4" /></GoldButton>
              <Link to="/app/profile" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-[#e9e7df] hover:border-[#d4af37]/40">Complete your profile</Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#8a8577]"><ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" /> No card required for a free account. Premium is billed separately and can be cancelled from Billing.</p>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {ACCESS.map(({ to, icon: Icon, title, body }) => (
            <Link key={to} to={to} className="group block focus:outline-none">
              <Card className="flex h-full gap-3 rounded-xl p-4 transition group-hover:-translate-y-0.5 group-hover:border-[#d4af37]/30 sm:p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#f0ecdd]">{title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#8a8577]">{body}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="rounded-xl p-4 text-xs leading-relaxed text-[#8a8577] sm:p-5">
          <span className="font-semibold text-[#e9e7df]">What Premium adds:</span> the live terminal, unlimited journal, analytics, SI coach and reports, signals, alerts, heatmaps, broker sync and risk tools. Enterprise API, webhooks and white-label licensing are quoted separately.
        </Card>
      </div>
    </AppLayout>
  );
}
