import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Coins, FileText, ShieldCheck } from 'lucide-react';
import Footer from '@/components/Footer';
import { AtBadge, AtButton } from '@/components/AtelierUI';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import { TBC_PROPOSAL } from '@/lib/tbcEcosystem';

const PUBLIC_NAV = [
  { to: '/tbc', label: 'Overview', end: true },
  { to: '/tbc/tokenomics', label: 'Tokenomics' },
  { to: '/tbc/utility', label: 'Utility' },
  { to: '/tbc/roadmap', label: 'Roadmap' },
  { to: '/chain', label: 'Chain' },
  { to: '/tbc/documents', label: 'Documents' },
  { to: '/tbc/compliance', label: 'Compliance' },
  { to: '/tbc/risks', label: 'Risks' },
  { to: '/tbc/faqs', label: 'FAQs' },
];

export function TbcStatusBadge({ children = 'Proposal stage' }) {
  return (
    <AtBadge tone="gold">
      {children}
    </AtBadge>
  );
}

export function TbcProposalNotice({ compact = false }) {
  return (
    <div className={`at-alert at-alert--amber ${compact ? '!px-3 !py-2.5 !text-[10px]' : '!px-4 !py-3.5 !text-[11px]'}`}>
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-amber)]" />
      <div>
        <span className="font-bold text-[var(--at-amber)]">Proposal stage.</span> {TBC_PROPOSAL.notice}
      </div>
    </div>
  );
}

export default function TbcPublicShell({ children, active = '', contained = true }) {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const ctaTo = isAuthed ? (user?.role === 'admin' ? '/admin/tbc' : '/app/tbc') : '/signup';
  const ctaLabel = isAuthed ? 'Open TBC' : 'Create account';

  return (
    <div className="at-shell min-h-screen bg-transparent pt-[calc(var(--header-h)+126px)] text-[var(--at-ink)] md:pt-[calc(var(--header-h)+96px)]">
      <header className="fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[var(--at-line-soft)] bg-[var(--at-topbar-bg)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-none items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link to={homeTo} className="flex shrink-0 items-center gap-2.5" aria-label="TradingBible home">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-[var(--at-line-strong)] bg-[var(--at-gold-soft)]">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </span>
            <span className="hidden text-lg font-extrabold leading-none tracking-[-0.04em] text-[var(--at-ink)] sm:block">Trading<span className="text-[var(--at-gold)]">Bible</span></span>
          </Link>

          <span className="hidden h-5 w-px bg-[var(--at-line-soft)] sm:block" />

          <Link to="/tbc" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--at-gold)]">
            <Coins className="h-3.5 w-3.5" /> TBC
          </Link>

          <nav className="ml-1 hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="TBC sections">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${(isActive || active === item.label) ? 'bg-[var(--at-gold-soft)] text-[var(--at-gold)]' : 'text-[var(--at-mut)] hover:bg-[var(--at-soft)] hover:text-[var(--at-ink)]'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="hidden xl:block"><AtBadge tone="amber">No token issued</AtBadge></span>
            <Link to="/tbc/documents" className="hidden items-center gap-1.5 rounded-lg border border-[var(--at-line-soft)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--at-mut)] transition hover:border-[var(--at-line)] hover:text-[var(--at-ink)] sm:flex">
              <FileText className="h-3.5 w-3.5 text-[var(--at-gold)]" /> Documents
            </Link>
            <AtButton to={ctaTo} variant="gold" size="sm" iconRight={ArrowRight}>{ctaLabel}</AtButton>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[var(--at-line-soft)] px-3 py-1.5 lg:hidden">
          <div className="flex min-w-max gap-0.5">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-md px-2.5 py-1 text-[10px] font-semibold ${isActive ? 'bg-[var(--at-gold-soft)] text-[var(--at-gold)]' : 'text-[var(--at-mut)]'}`}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-1.5 sm:px-6">
          <div className="mx-auto flex max-w-none flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--at-mut)] sm:justify-start">
            <span className="text-[var(--at-gold)]">{TBC_PROPOSAL.phase}</span>
            <span>No token issued</span>
            <span className="hidden sm:inline">No sale open</span>
            <span className="hidden sm:inline">No staking or governance</span>
            <span className="ml-auto hidden items-center gap-1.5 md:flex"><ShieldCheck className="h-3 w-3 text-[var(--at-green)]" /> Information surface only</span>
          </div>
        </div>
        <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-[var(--at-gold)]/50 to-transparent" />
      </header>

      <main className={contained ? 'mx-auto w-full max-w-none px-3 pb-16 sm:px-6' : 'pb-16'}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
