import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, FileText, ShieldCheck, UserRound } from 'lucide-react';
import Footer from '@/components/Footer';
import { AtBadge, AtButton } from '@/components/AtelierUI';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import { TB_ISSUER, TB_NAV } from '@/lib/investorRelations';
import '@/styles/investor-relations.css';

export function InvestorStatusBadge({ children = 'Pre-IPO' }) {
  return <AtBadge tone="gold">{children}</AtBadge>;
}

export function InvestorNotice({ compact = false }) {
  return (
    <div className={`at-alert at-alert--amber ${compact ? '!px-3 !py-2.5 !text-[10px]' : '!px-4 !py-3.5 !text-[11px]'}`}>
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--at-amber)]" />
      <div>
        <span className="font-bold text-[var(--at-amber)]">Pre-IPO information only.</span>{' '}
        TB is a proposed ticker, not a listed security. No share price, market capitalisation, trading volume, exchange approval or investment offer is presented.
      </div>
    </div>
  );
}

export default function InvestorShell({ children, contained = true, active = '' }) {
  const { user, isAuthed } = useAuth();
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const portalTo = isAuthed ? '/investors/shareholders' : '/login?next=%2Finvestors%2Fshareholders';
  const portalLabel = isAuthed ? 'Shareholder portal' : 'Investor sign in';

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setHeaderH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="ir-shell at-shell min-h-screen bg-transparent text-[var(--at-ink)]" style={{ paddingTop: `calc(var(--header-h) + ${headerH ? headerH + 12 : 156}px)` }}>
      <header ref={headerRef} className="ir-header fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[var(--at-line-soft)] bg-[var(--at-topbar-bg)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-none items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link to={homeTo} className="flex shrink-0 items-center gap-2.5" aria-label="TradingBible home">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-[var(--at-line-strong)] bg-[var(--at-gold-soft)]">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-7 w-7 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </span>
            <span className="hidden text-lg font-extrabold leading-none tracking-[-0.04em] text-[var(--at-ink)] sm:block">Trading<span className="text-[var(--at-gold)]">Bible</span></span>
          </Link>

          <span className="hidden h-5 w-px bg-[var(--at-line-soft)] sm:block" />

          <Link to="/stock/TB" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--at-line)] bg-[var(--at-gold-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--at-gold)]">
            <span className="font-mono tracking-[0.08em]">TB</span>
            <span>Stock</span>
          </Link>

          <span className="hidden items-center gap-1 rounded-lg border border-[var(--at-line-soft)] px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--at-mut)] xl:inline-flex">
            Investor relations
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="hidden xl:block"><AtBadge tone="amber">Not publicly traded</AtBadge></span>
            <ThemeSwitcher inline className="text-[var(--at-mut)] hover:bg-[var(--at-soft)]" />
            <LanguageSwitcher className="text-[var(--at-mut)] hover:bg-[var(--at-soft)]" />
            <AtButton to={portalTo} variant="gold" size="sm" icon={UserRound} className="ir-portal-cta">
              <span className="hidden sm:inline">{portalLabel}</span>
              <span className="sm:hidden">Portal</span>
            </AtButton>
          </div>
        </div>

        <div className="border-t border-[var(--at-line-soft)]">
          <div className="ir-subnav px-3 py-1.5 sm:px-6">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {TB_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `border-b-2 px-2.5 py-1 text-[10px] font-semibold ${(isActive || active === item.label) ? 'border-[var(--at-gold)] text-[var(--at-ink)]' : 'border-transparent text-[var(--at-mut)]'}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-1.5 sm:px-6">
          <div className="mx-auto flex max-w-none flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--at-mut)] sm:justify-start">
            <span className="text-[var(--at-gold)]">Pre-IPO · not publicly traded</span>
            <span>TB proposed ticker — not reserved</span>
            <span className="hidden sm:inline">No price · no market cap · no volume</span>
            <span className="hidden md:inline">TB equity ≠ TBC</span>
            <span className="ml-auto hidden items-center gap-1.5 md:flex"><FileText className="h-3 w-3 text-[var(--at-gold)]" /> Approved disclosures only</span>
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
