import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Linkedin, Instagram, Youtube, LineChart, Lock, ShieldCheck } from 'lucide-react';
import { IosIcon } from '@/components/IosIcon';
import { BrandName, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';
import { useI18n } from '@/lib/i18n';
import { usePlatformSettings } from '@/lib/platformSettings';

const LOGO = TRADINGBIBLE_LOGO;

// TikTok isn't in lucide-react; a small inline glyph keeps the icon set consistent.
function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-2.63-3.63V2h-3.2v13.4a2.6 2.6 0 1 1-2.13-2.56V9.53a5.87 5.87 0 0 0 .13 11.7 5.94 5.94 0 0 0 5.9-5.95V9.4a7.4 7.4 0 0 0 4.13 1.26V7.4a4.24 4.24 0 0 1-2.2-1.58Z" />
    </svg>
  );
}

const COLUMNS = [
  {
    headingKey: 'fot.h_product',
    links: [
      { labelKey: 'fot.l_trading_journal', to: '/features/trading-journal' },
      { labelKey: 'fot.l_ai_coach', to: '/features/si-coach' },
      { labelKey: 'fot.l_dashboard', to: '/features/dashboard' },
      { labelKey: 'fot.l_broker_integrations', to: '/features/broker-integrations' },
      { labelKey: 'fot.l_market_data', to: '/features/market-data' },
      { labelKey: 'fot.l_performance_analytics', to: '/features/performance-analytics' },
    ],
  },
  {
    headingKey: 'fot.h_tools',
    links: [
      { labelKey: 'fot.l_features_overview', to: '/features' },
      { labelKey: 'fot.l_pricing', to: '/pricing' },
      { labelKey: 'fot.l_tbc', to: '/tbc', badge: 'Proposed' },
      { labelKey: 'fot.l_plans_comparison', to: '/pricing#plans' },
      { labelKey: 'fot.l_api_access', to: '/features/api', badge: 'Pro' },
      { labelKey: 'fot.l_premium_features', to: '/features/premium' },
    ],
  },
  {
    headingKey: 'fot.h_trading',
    links: [
      { labelKey: 'fot.l_trading_overview', to: '/features/trading-overview' },
      { labelKey: 'fot.l_broker_connections', to: '/features/broker-connections' },
      { labelKey: 'fot.l_strategy_analysis', to: '/features/strategy-analysis' },
      { labelKey: 'fot.l_risk_management', to: '/features/risk-management' },
      { labelKey: 'fot.l_trade_history', to: '/features/trade-history' },
    ],
  },
  {
    headingKey: 'fot.h_community',
    links: [
      { labelKey: 'fot.l_social_network', to: '/community#social' },
      { labelKey: 'fot.l_refer_a_friend', to: '/community#refer' },
      { labelKey: 'fot.l_trading_community', to: '/community#community' },
      { labelKey: 'fot.l_discussion_forums', to: '/community#forums' },
      { labelKey: 'fot.l_moderators', to: '/community#moderators' },
    ],
  },
  {
    headingKey: 'fot.h_education',
    links: [
      { labelKey: 'fot.l_trading_guides', to: '/guides' },
      { labelKey: 'fot.l_video_tutorials', to: '/academy' },
      { labelKey: 'fot.l_academy_courses', to: '/academy#courses' },
      { labelKey: 'fot.l_webinars', to: '/webinars' },
      { labelKey: 'fot.l_learning_resources', to: '/guides#resources' },
    ],
  },
  {
    headingKey: 'fot.h_company',
    links: [
      { labelKey: 'fot.l_about_tradingbible', to: '/about' },
      { labelKey: 'fot.l_our_mission', to: '/about#mission' },
      { labelKey: 'fot.l_blog', to: '/blog' },
      { labelKey: 'fot.l_help_center', to: '/faq' },
      { labelKey: 'fot.l_careers', to: '/careers' },
      { labelKey: 'fot.l_contact', to: '/contact' },
    ],
  },
  {
    headingKey: 'fot.h_legal',
    links: [
      { labelKey: 'fot.l_terms_of_service', to: '/terms' },
      { labelKey: 'fot.l_privacy_policy', to: '/policy' },
      { labelKey: 'fot.l_refund_policy', to: '/refund' },
      { labelKey: 'fot.l_cookie_policy', to: '/policy#cookies' },
      { labelKey: 'fot.l_security', to: '/security' },
    ],
  },
];

const SOCIALS = [
  { label: 'Twitter', icon: Twitter, href: 'https://twitter.com/tradingbible', tone: 'blue' },
  { label: 'Facebook', icon: Facebook, href: 'https://facebook.com/tradingbible', tone: 'blue' },
  { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/tradingbible', tone: 'cyan' },
  { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/tradingbible', tone: 'pink' },
  { label: 'YouTube', icon: Youtube, href: 'https://youtube.com/@tradingbible', tone: 'red' },
  { label: 'TikTok', icon: TikTokIcon, href: 'https://tiktok.com/@tradingbible', tone: 'gray' },
];

export default function Footer({ compact = false }) {
  const { user, isAuthed } = useAuth();
  const { t } = useI18n();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const { settings } = usePlatformSettings();
  const brand = String(settings.platformName || 'TradingBible').trim();
  const words = brand.split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';

  // Capital & IR pages use a record footer, not the marketing footer. This
  // keeps the public stock record from reading like a second landing page.
  if (compact) {
    const links = [
      ['TB stock', '/stock/TB'],
      ['Investor centre', '/investors'],
      ['Financials', '/investors/financials'],
      ['IPO readiness', '/investors/ipo'],
      ['Governance', '/investors/governance'],
      ['Shareholders', '/investors/shareholders'],
      ['Contact', '/investors/contact'],
    ];
    return (
      <footer className="at-scope tb-footer relative overflow-hidden border-t border-[var(--at-line)] bg-[var(--at-bg1)] text-[var(--at-ink)]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--at-line-strong)] to-transparent" />
        <div className="mx-auto w-full max-w-none px-3 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Link to={homeTo} className="inline-flex items-center gap-2">
                <img src={LOGO} alt={`${brand} logo`} className="h-7 w-7 rounded-lg border border-[var(--at-line)] bg-[var(--at-panel)] object-contain p-0.5" />
                <span className="text-sm font-semibold tracking-tight text-[var(--at-ink)]">
                  {first ? `${first} ` : ''}<span className="text-[var(--at-gold)]">{last}</span>
                </span>
              </Link>
              <span className="hidden h-4 w-px bg-[var(--at-line-soft)] sm:block" />
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--at-mut)]">TradingBible LLC · Delaware</span>
            </div>
            <nav aria-label="Capital and investor relations" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {links.map(([label, to]) => (
                <Link key={to} to={to} className="text-[10px] font-semibold text-[var(--at-mut)] transition hover:text-[var(--at-gold)]">{label}</Link>
              ))}
            </nav>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--at-line-soft)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-4xl text-[9px] leading-relaxed text-[var(--at-mut-2)]">
              TB is a proposed future ticker. The company is private and not publicly traded. No share price, market capitalisation, trading volume, listing approval or regulatory approval is presented. TB equity and TBC are separate instruments.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-[var(--at-mut)]">
              {settings.supportEmail && <a href={`mailto:${settings.supportEmail}`} className="transition hover:text-[var(--at-gold)]">{settings.supportEmail}</a>}
              <span>© {new Date().getFullYear()} TradingBible LLC · {t('fot.rights')}</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const memberHref = (to) => {
    if (!isAuthed) return `/login?next=${encodeURIComponent(to)}`;
    return to;
  };

  return (
    <footer className="at-scope tb-footer relative overflow-hidden border-t border-[var(--at-line)] bg-[var(--at-bg1)] text-[var(--at-ink)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--at-line-strong)] to-transparent" />
      <div className="mx-auto max-w-none px-6 pb-8 pt-12">
        <div className="grid gap-8 border-b border-[var(--at-line-soft)] pb-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="max-w-xl">
            <Link to={homeTo} className="mb-4 inline-flex items-center gap-2.5">
              <img src={LOGO} alt={`${brand} logo`} className="h-9 w-9 rounded-[11px] border border-[var(--at-line)] bg-[var(--at-panel)] object-contain p-0.5" />
              <span className="font-semibold tracking-tight text-[var(--at-ink)]">
                {first ? `${first} ` : ''}<span className="text-[var(--at-gold)]">{last}</span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-[var(--at-mut)]">
              {t('fot.blurb')}
            </p>
            <div className="mt-4 flex items-start gap-3">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-10 w-10 shrink-0 rounded-[10px] border border-[var(--at-line)] bg-[var(--at-panel)] object-contain p-0.5" />
              <p className="text-xs leading-relaxed text-[var(--at-mut-2)]">
                TradingBible is owned and operated by <span className="font-semibold text-[var(--at-ink-2)]">TradingBible LLC</span>.
                <br />Registered in Delaware, USA. c/o Delaware Registered Agent, Inc.
                <br />{t('fot.mission')}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {SOCIALS.map(({ label, icon: Icon, href, tone }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  title={label}
                  className="rounded-[9px] transition hover:-translate-y-0.5"
                >
                  <IosIcon icon={Icon} size="sm" tone={tone} />
                </a>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--at-line)] bg-[var(--at-panel)] p-5 shadow-[var(--at-shadow)]">
            <div className="flex items-center gap-2 text-[var(--at-gold)]">
              <IosIcon icon={LineChart} size="2xs" tone="blue" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]">{t('foot.startEdge')}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--at-mut)]">{t('foot.paidNote', null, 'Paid plans only. No free trial. Cancel anytime.')}</p>
            <Link
              to={isAuthed ? '/pricing' : '/signup'}
              className="mt-4 flex min-h-[42px] items-center justify-center rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-sm font-bold text-[#121006] shadow-[0_12px_30px_-16px_rgba(212,175,55,0.8)] transition hover:brightness-105"
            >
              {t('foot.createAcct')}
            </Link>
            <div className="mt-4 grid gap-1.5 border-t border-[var(--at-line-soft)] pt-3 text-[10px] text-[var(--at-mut-2)]">
              <span className="flex items-center gap-1.5"><IosIcon icon={ShieldCheck} size="2xs" tone="green" /> Broker data is read-only by default.</span>
              <span className="flex items-center gap-1.5"><IosIcon icon={Lock} size="2xs" tone="yellow" /> TBC token operations remain disabled.</span>
            </div>
          </aside>
        </div>

        <div className="border-y border-[var(--at-line-soft)] py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--at-gold)]">TB investor relations</span>
              <span className="rounded-md border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--at-amber)]">Pre-IPO · not publicly traded</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {[
                ['TB stock', '/stock/TB'],
                ['Investor centre', '/investors'],
                ['Financials', '/investors/financials'],
                ['IPO readiness', '/investors/ipo'],
                ['Governance', '/investors/governance'],
                ['Shareholder portal', '/investors/shareholders'],
                ['IR contact', '/investors/contact'],
              ].map(([label, to]) => (
                <Link key={to} to={to} className="text-[10px] font-semibold text-[var(--at-mut)] transition hover:text-[var(--at-gold)]">{label}</Link>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-[var(--at-mut-2)]">TB is a proposed future ticker. No share price, market capitalisation, trading volume, listing approval or regulatory approval is presented. TB equity and TBC are separate instruments.</p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-8 py-9 sm:grid-cols-3 lg:grid-cols-7">
          {COLUMNS.map((col) => (
            <div key={col.headingKey}>
              <h4 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--at-gold)]">{t(col.headingKey)}</h4>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={`${col.headingKey}-${link.labelKey}`}>
                    <Link
                      to={link.member ? memberHref(link.to) : link.to}
                      className="tb-footer-link group inline-flex items-start gap-1.5 text-[12.5px] leading-6 text-[var(--at-mut)] transition hover:text-[var(--at-ink)]"
                    >
                      <span>{t(link.labelKey)}</span>
                      {link.member && <Lock className="mt-1.5 h-2.5 w-2.5 shrink-0 text-[var(--at-mut-2)] group-hover:text-[var(--at-gold)]" />}
                      {link.badge && <span className="mt-1.5 rounded-full border border-[var(--at-line)] bg-[var(--at-gold-soft)] px-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--at-gold)]">{link.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--at-line-soft)] bg-[var(--at-soft)] px-3 py-2.5">
          <span className="at-chip at-chip--gold">TBC token · proposed</span>
          <span className="at-chip">Platform credits · 1 credit = 1 KWD</span>
          <span className="at-chip">Brokerage deposits · separate</span>
          <span className="at-chip">Signature execution · DocuSign</span>
          <span className="ml-auto text-[10px] leading-relaxed text-[var(--at-mut-2)]">
            No token sale, transfer, staking, governance, migration or chain activation is live.
          </span>
        </div>

        <div className="mt-6 border-t border-[var(--at-line-soft)] py-5">
          <p className="max-w-4xl text-[11px] leading-relaxed text-[var(--at-mut-2)]">
            TradingBible provides trade journaling, analytics, and SI-generated insights for educational and record-keeping purposes only. Nothing on this platform constitutes financial, investment, or trading advice. Trading financial instruments carries substantial risk of loss and is not suitable for every investor. Past performance and SI-generated observations are not indicative of future results. Always conduct your own due diligence and consult a licensed financial advisor before making trading decisions.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--at-line-soft)] pt-5 text-[12px] text-[var(--at-mut)] sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={TRADINGBIBLE_LOGO} alt="" className="h-5 w-5 rounded-[6px] border border-[var(--at-line)] bg-[var(--at-panel)] object-contain p-0.5" />
            <BrandName name="TradingBible" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link to="/terms" className="transition hover:text-[var(--at-ink)]">{t('fot.terms')}</Link>
            <Link to="/policy" className="transition hover:text-[var(--at-ink)]">{t('fot.privacy')}</Link>
            <Link to="/refund" className="transition hover:text-[var(--at-ink)]">{t('fot.refunds')}</Link>
            <Link to="/faq" className="transition hover:text-[var(--at-ink)]">{t('fot.faq')}</Link>
            <Link to="/pricing" className="transition hover:text-[var(--at-ink)]">{t('fot.pricing')}</Link>
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="transition hover:text-[var(--at-ink)]">{settings.supportEmail}</a>
            )}
          </div>
          <div>© {new Date().getFullYear()} TradingBible LLC · {t('fot.rights')}</div>
        </div>
      </div>
    </footer>
  );
}
