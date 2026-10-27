import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Menu, ShieldCheck, X } from 'lucide-react';
import Footer from '@/components/Footer';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { usePlatformSettings } from '@/lib/platformSettings';
import { homeRouteForUser } from '@/lib/homeRoute';
import { Card, GhostButton, GoldButton, Kicker } from '@/components/ui-kit';
import '@/styles/landing-page.css';

const NAV = [
  ['Platform', '/features'],
  ['Pricing', '/pricing'],
  ['Academy', '/academy'],
  ['Community', '/community'],
  ['Company', '/about'],
  ['Investors', '/investors'],
  ['TBC', '/tbc'],
];

function PublicNav({ homeTo, isAuthed }) {
  const { t } = useI18n();
  const { settings } = usePlatformSettings();
  const [open, setOpen] = React.useState(false);
  const brand = String(settings.platformName || 'TradingBible').trim();
  const words = brand.split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';
  const close = () => setOpen(false);
  const navLink = 'landing-nav-link rounded-full px-3 py-2 text-[13px] font-semibold transition-colors';
  const mobileLink = 'landing-menu-link block rounded-xl px-4 py-3 text-sm font-medium transition-colors';

  return (
    <header className="landing-header fixed inset-x-0 top-[var(--header-h)] z-40">
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link to={homeTo} onClick={close} className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label={`${brand} home`}>
          <img src={TRADINGBIBLE_LOGO} alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain gold-glow sm:h-10 sm:w-10" />
          <span className="landing-word hidden truncate text-xl font-extrabold tracking-tight sm:inline sm:text-2xl">{first ? `${first} ` : ''}<span className="tb-gold-text">{last}</span></span>
        </Link>

        <nav className="landing-nav-pill hidden items-center gap-0.5 rounded-full p-1 xl:flex" aria-label="Public navigation">
          {NAV.map(([label, to]) => <Link key={to} to={to} className={navLink}>{label}</Link>)}
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
          <ThemeSwitcher inline className="landing-control" />
          <LanguageSwitcher className="landing-control" />
          {isAuthed ? (
            <GoldButton to={homeTo} className="hidden px-4 py-2.5 text-sm sm:inline-flex">{t('land.openDash')}</GoldButton>
          ) : (
            <GoldButton to="/pricing" className="hidden px-4 py-2.5 text-sm sm:inline-flex">{t('land.viewPricing')}</GoldButton>
          )}
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t('nav.menu')} aria-expanded={open}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition hover:bg-white/5 active:scale-95 xl:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="landing-menu max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto px-4 pb-5 pt-2 xl:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Public mobile navigation">
            {NAV.map(([label, to]) => <Link key={to} to={to} onClick={close} className={mobileLink}>{label}</Link>)}
            <Link to="/contact" onClick={close} className={mobileLink}>Contact</Link>
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
            {isAuthed ? (
              <Link to={homeTo} onClick={close} className="col-span-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-3 text-center text-sm font-bold text-[#0a0a0f]">{t('land.openDash')}</Link>
            ) : (
              <>
                <Link to="/login" onClick={close} className="landing-menu-link rounded-xl border border-[#d4af37]/20 px-4 py-3 text-center text-sm font-semibold">{t('land.login')}</Link>
                <Link to="/pricing" onClick={close} className="rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-3 text-center text-sm font-bold text-[#0a0a0f]">{t('land.viewPricing')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function PublicSiteShell({ children, className = '' }) {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  return (
    <div className={`relative min-h-screen overflow-x-clip bg-transparent text-[#e9e7df] ${className}`}>
      <PublicNav homeTo={homeTo} isAuthed={isAuthed} />
      {children}
      <Footer />
    </div>
  );
}

export function PublicPageHead({ eyebrow, title, description, meta = [], actions, children }) {
  return (
    <section className="relative overflow-hidden border-b border-[#d4af37]/10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.025] to-transparent" />
      <div className="relative mx-auto w-full max-w-[84rem] px-5 pb-8 pt-[calc(7.5rem+var(--safe-top))] sm:px-8 sm:pb-10 sm:pt-[calc(8.5rem+var(--safe-top))]">
        <div className="max-w-4xl">
          {eyebrow && <Kicker>{eyebrow}</Kicker>}
          <h1 className="mt-3 text-balance text-[2.15rem] font-extrabold leading-[0.99] tracking-[-0.045em] sm:text-[3.4rem]">{title}</h1>
          {description && <p className="mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-[#b8b3a3] sm:text-base">{description}</p>}
          {meta.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {meta.map((item) => <span key={item} className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">{item}</span>)}
            </div>
          )}
          {actions && <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  );
}

export function PublicSection({ id, eyebrow, title, sub, children, className = '' }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[84rem] scroll-mt-28 px-5 py-12 sm:px-8 sm:py-16 ${className}`}>
      {(eyebrow || title || sub) && (
        <div className="mb-7 max-w-3xl">
          {eyebrow && <Kicker>{eyebrow}</Kicker>}
          {title && <h2 className="tb-h2 mt-2 text-balance text-[1.7rem] leading-[1.04] tracking-[-0.035em] sm:text-[2.35rem]">{title}</h2>}
          {sub && <p className="tb-sub mt-2">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PublicNotice({ children, tone = 'gold' }) {
  const tones = {
    gold: 'border-[#d4af37]/25 bg-[#d4af37]/[0.06] text-[#c9c4b4]',
    amber: 'border-amber-400/25 bg-amber-400/[0.06] text-[#c9c4b4]',
  };
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${tones[tone] || tones.gold}`}>
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
      <div>{children}</div>
    </div>
  );
}

export function PublicCheckList({ items, columns = 2 }) {
  return (
    <ul className={`grid gap-2 ${columns === 1 ? '' : 'sm:grid-cols-2'}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2 rounded-lg border border-[#d4af37]/10 bg-[#d4af37]/5 px-3.5 py-2.5 text-xs leading-relaxed text-[#b8b3a3]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34d399]" />{item}
        </li>
      ))}
    </ul>
  );
}

export function PublicCTA({ eyebrow = 'Start here', title, body, primaryTo = '/pricing', primaryHref, primary = 'Choose your plan', secondaryTo = '/contact', secondary = 'Talk to support' }) {
  return (
    <section className="mx-auto w-full max-w-[84rem] px-5 pb-16 sm:px-8 sm:pb-24">
      <Card className="relative overflow-hidden rounded-2xl border-[#d4af37]/25 p-6 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.16),transparent_55%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">{eyebrow}</div>
            <h2 className="mt-2 max-w-2xl text-balance text-[1.8rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-4xl">{title}</h2>
            {body && <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">{body}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {primaryHref ? (
              <GoldButton href={primaryHref} className="justify-center px-6 py-3.5">{primary} <ArrowRight className="h-4 w-4" /></GoldButton>
            ) : (
              <GoldButton to={primaryTo} className="justify-center px-6 py-3.5">{primary} <ArrowRight className="h-4 w-4" /></GoldButton>
            )}
            {secondaryTo && <GhostButton to={secondaryTo} className="justify-center border px-6 py-3.5 text-[#e9e7df]">{secondary}</GhostButton>}
          </div>
        </div>
      </Card>
    </section>
  );
}
