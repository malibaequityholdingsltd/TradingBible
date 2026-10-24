import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Coins, ShieldCheck } from 'lucide-react';
import Footer from '@/components/Footer';
import { GoldButton } from '@/components/ui-kit';
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#d4af37]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
      {children}
    </span>
  );
}

export function TbcProposalNotice({ compact = false }) {
  return (
    <div className={`rounded-[10px] border border-amber-400/20 bg-amber-400/[0.06] ${compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-3 text-xs'} leading-relaxed text-[#c9c4b4]`}>
      <span className="font-bold text-amber-300">Proposal stage.</span> {TBC_PROPOSAL.notice}
    </div>
  );
}

export default function TbcPublicShell({ children, active = '', contained = true }) {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const ctaTo = isAuthed ? (user?.role === 'admin' ? '/admin/tbc' : '/app/tbc') : '/signup';
  const ctaLabel = isAuthed ? 'Open TBC' : 'Create account';

  return (
    <div className="min-h-screen bg-[#07070a] pt-[calc(var(--header-h)+156px)] text-[#e9e7df] md:pt-[calc(var(--header-h)+100px)]">
      <header className="fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[#d4af37]/10 bg-[#07070a]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[96rem] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to={homeTo} className="flex shrink-0 items-center gap-2.5" aria-label="TradingBible home">
            <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-9 w-9 rounded-xl border border-[#d4af37]/40 bg-[#0c0c11] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="hidden text-xl font-black leading-none tracking-tight text-[#f0ecdd] sm:block">Trading<span className="gold-text">Bible</span></span>
          </Link>
          <span className="hidden h-5 w-px bg-white/10 sm:block" />
          <Link to="/tbc" className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#d4af37]">
            <Coins className="h-4 w-4" /> TBC
          </Link>
          <nav className="tb-scroll-row ml-1 hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="TBC sections">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `shrink-0 rounded-lg px-2.5 py-1.5 text-xs transition ${(isActive || active === item.label) ? 'bg-[#d4af37]/10 text-[#f0ecdd]' : 'text-[#8a8577] hover:bg-white/5 hover:text-[#e9e7df]'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link to="/tbc/documents" className="hidden items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#c9c4b4] hover:border-[#d4af37]/30 hover:text-[#f0ecdd] lg:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" /> Legal
            </Link>
            <GoldButton to={ctaTo} className="!min-h-[34px] !px-3 !text-xs">{ctaLabel} <ArrowRight className="h-3.5 w-3.5" /></GoldButton>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-white/[0.04] px-4 py-1.5 md:hidden">
          <div className="flex min-w-max gap-1">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-md px-2.5 py-1 text-[11px] ${isActive ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-[#8a8577]'}`}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="border-t border-white/[0.04] bg-[#07070a] px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8577] sm:px-6">
          {TBC_PROPOSAL.phase} · No token issued · No sale open
        </div>
      </header>

      <main className={contained ? 'mx-auto w-full max-w-[88rem] px-4 pb-16 sm:px-6' : 'pb-16'}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
