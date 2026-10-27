import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FileText, ShieldCheck, UserRound } from 'lucide-react';
import Footer from '@/components/Footer';
import { AtBadge, AtButton } from '@/components/AtelierUI';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import { TB_NAV } from '@/lib/investorRelations';
import '@/styles/investor-relations.css';

export function InvestorStatusBadge({ children = 'Pre-IPO' }) {
  return <AtBadge tone="gold">{children}</AtBadge>;
}

export function InvestorNotice({ compact = false }) {
  return (
    <div className={`at-alert at-alert--amber ${compact ? '!px-3 !py-2.5 !text-[10px]' : '!px-3.5 !py-3 !text-[10px]'}`}>
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--at-amber)]" />
      <div>
        <span className="font-bold text-[var(--at-amber)]">Pre-IPO information only.</span>{' '}
        TB is a proposed ticker, not a listed security. No share price, market capitalisation, trading volume, exchange approval or investment offer is presented.
      </div>
    </div>
  );
}

const InvestorChromeContext = createContext(null);

export function InvestorChromeShell({ children }) {
  const [active, setActive] = useState('');
  const [contained, setContained] = useState(true);
  return (
    <InvestorShellContent active={active} contained={contained}>
      <InvestorChromeContext.Provider value={{ setActive, setContained }}>{children}</InvestorChromeContext.Provider>
    </InvestorShellContent>
  );
}

export default function InvestorShell({ children, contained = true, active = '' }) {
  const shell = useContext(InvestorChromeContext);
  useLayoutEffect(() => {
    if (!shell) return;
    shell.setActive(active || '');
    shell.setContained(contained);
  }, [shell, active, contained]);
  if (shell) return children;
  return <InvestorShellContent active={active} contained={contained}>{children}</InvestorShellContent>;
}

function InvestorShellContent({ children, contained = true, active = '' }) {
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
    <div
      className="ir-shell at-shell min-h-screen bg-transparent text-[var(--at-ink)]"
      style={{ paddingTop: `calc(var(--header-h) + ${headerH ? headerH + 8 : 122}px)` }}
    >
      <header ref={headerRef} className="ir-header cap-ir-header fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[var(--at-line-soft)]">
        <div className="cap-ir-top">
          <Link to={homeTo} className="cap-ir-brand" aria-label="TradingBible home">
            <span className="cap-ir-mark">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </span>
            <span className="cap-ir-word">Trading<span>Bible</span></span>
          </Link>

          <span className="cap-ir-rule hidden sm:block" />

          <Link to="/stock/TB" className="cap-ir-stock" aria-label="TB stock and issuer record">
            <b>TB</b><span>Stock</span>
          </Link>

          <span className="cap-ir-parent">Investor relations</span>

          <div className="cap-ir-controls">
            <span className="hidden 2xl:inline-flex"><AtBadge tone="amber">Not publicly traded</AtBadge></span>
            <ThemeSwitcher inline className="text-[var(--at-mut)] hover:bg-[var(--at-soft)]" />
            <LanguageSwitcher className="text-[var(--at-mut)] hover:bg-[var(--at-soft)]" />
            <AtButton to={portalTo} variant="gold" size="sm" icon={UserRound} className="ir-portal-cta">
              <span className="hidden sm:inline">{portalLabel}</span>
              <span className="sm:hidden">Portal</span>
            </AtButton>
          </div>
        </div>

        <nav className="cap-ir-nav" aria-label="Investor relations sections">
          {TB_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `cap-ir-link ${(isActive || active === item.label) ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={contained ? 'cap-ir-main' : 'pb-16'}>
        <div className="cap-disclosure-strip" role="note" aria-label="Issuer disclosure status">
          <span className="is-gold"><ShieldCheck /> Pre-IPO · not publicly traded</span>
          <span className="cap-disclosure-optional cap-disclosure-optional--sm">TB proposed ticker — not reserved</span>
          <span className="cap-disclosure-optional cap-disclosure-optional--sm">No price · no market cap · no volume</span>
          <span className="cap-disclosure-optional cap-disclosure-optional--md">TB equity ≠ TBC</span>
          <span className="is-last cap-disclosure-optional cap-disclosure-optional--lg"><FileText /> Approved disclosures only</span>
        </div>
        {children}
      </main>
      <Footer compact />
    </div>
  );
}
