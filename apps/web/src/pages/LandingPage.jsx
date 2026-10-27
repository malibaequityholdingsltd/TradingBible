import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, Bot, Check,
  GraduationCap, KeyRound, Menu, Plug, Radar,
  ShieldCheck, Target, Trophy, Wallet, X,
} from 'lucide-react';
import { PLANS, translatePlan } from '@/lib/mockData';
import Footer from '@/components/Footer';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { TESTIMONIALS, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { homeRouteForUser } from '@/lib/homeRoute';
import { useI18n } from '@/lib/i18n';
import { usePlatformSettings } from '@/lib/platformSettings';
import { Card, GhostButton, GoldButton, Kicker } from '@/components/ui-kit';
import { IosIcon } from '@/components/IosIcon';
import '@/styles/landing-page.css';

const LOGO = TRADINGBIBLE_LOGO;

const STATS = [
  { value: '20+', label: 'Broker & prop connections', note: 'Live accounts, synced' },
  { value: '147', label: 'Academy lessons', note: 'Six structured paths' },
  { value: '24/7', label: 'SI coaching', note: 'Grounded in your history' },
  { value: '0 TBC', label: 'Tokens issued', note: '100M max proposed' },
];

const LOOP = [
  { icon: Plug, title: 'Connect', body: 'Brokers, prop firms and wallets. Live accounts only — never demos.' },
  { icon: BookOpen, title: 'Record', body: 'Every fill, balance, note and decision lands in one journal.' },
  { icon: Bot, title: 'Review', body: 'SI grades the decision, not just the result, against your own record.' },
  { icon: Target, title: 'Repeat', body: 'Leave with one focus for the next session — not another signal.' },
];

const REASONS = [
  ['01', 'The record is the edge', 'Most platforms show you the market. TradingBible reconstructs the trade: the setup, the risk, the note and the outcome. Your record becomes the thing you can actually improve.'],
  ['02', 'The review is the product', 'Analytics tell you what happened. A review tells you why. SI turns synced trades into a repeatable feedback loop instead of a wall of charts.'],
  ['03', 'The coach has context', 'SI answers from your real journal, your real positions and your real mistakes. It is not a generic signal bot with a chat box.'],
  ['04', 'The company is private by design', 'TradingBible is a private, pre-IPO company. TB is a proposed ticker. There is no listed share price, market capitalisation or trading volume to present.'],
];

const MODULES = [
  {
    icon: BarChart3, tag: 'TERMINAL', title: 'A workstation, not a watchlist',
    body: 'Pro-grade charts, order flow and five markets in one desk — with TradingBible TV and 250+ symbols for context.',
    to: '/app/terminal-pro', link: 'Open the terminal',
  },
  {
    icon: Plug, tag: 'CONNECT', title: 'A journal that syncs itself',
    body: 'Connect Binance, Deriv, easyMarkets, Interactive Brokers, Alpaca, Coinbase or a prop firm once. Trades and balances flow in automatically.',
    to: '/app/journal', link: 'See the journal',
  },
  {
    icon: Radar, tag: 'MEASURE', title: 'Analytics that explain the result',
    body: 'Equity curve, profit factor, drawdown, expectancy and a Trader Score — computed from your synced history, not a highlight reel.',
    to: '/app/analytics', link: 'Explore analytics',
  },
  {
    icon: Bot, tag: 'COACH', title: 'SI on your shoulder',
    body: 'Ask what went wrong, where risk widened and what to fix next. SI reviews every trade and keeps the answer tied to your account.',
    to: '/app/coach', link: 'Meet SI',
  },
  {
    icon: Trophy, tag: 'FUND', title: 'Funded evaluations with rules',
    body: 'Two-step, one-step and dollar-ruled futures programs to $400K. One live seat per size, with terms shown before you start.',
    to: '/app/challenges', link: 'View programs',
  },
  {
    icon: GraduationCap, tag: 'LEARN', title: 'A school run by SI',
    body: 'Six paths, 147 lessons, eight live webinars a week, graded quizzes and one-to-one tutoring. One $150 lifetime payment.',
    to: '/academy', link: 'Enter the Academy',
  },
  {
    icon: Wallet, tag: 'CREDITS', title: 'TBC platform credits',
    body: 'Existing off-chain credits can settle entries, signals, mentorship and Academy access from your balance. The proposed TBC token is separate and not issued.',
    to: '/tbc', link: 'Read the TBC record',
  },
  {
    icon: KeyRound, tag: 'BUILD', title: 'API, desks and white-label',
    body: 'Professional-tier REST keys, webhooks, team seats and white-label presets for funds and prop desks that need their own front door.',
    to: '/pricing', link: 'See Professional',
  },
];

const REVIEW_ROWS = [
  ['Context', 'Your synced trades, sessions, notes and risk settings — the record SI actually reads.'],
  ['Decision', 'Timing, position size and execution reviewed against your own baseline, not a generic model portfolio.'],
  ['Next action', 'One concrete adjustment for the next session, with the evidence behind it kept in the record.'],
];

const ACADEMY = [
  ['147', 'lessons across six paths'],
  ['6', 'learning paths, beginner to professional'],
  ['8', 'live SI-hosted webinars every week'],
  ['$150', 'once · lifetime access'],
];

const FUNDED = [
  ['$400K', 'maximum evaluation size'],
  ['3', 'formats: two-step, one-step, dollar-ruled'],
  ['1', 'live seat per size'],
  ['TBC', 'payouts land in your credit wallet'],
];

const COMPANY_LINKS = [
  ['About TradingBible', '/about'],
  ['Careers', '/careers'],
  ['Investor relations', '/investors'],
  ['TB issuer record', '/stock/TB'],
  ['TBC documents', '/tbc/documents'],
  ['Contact', '/contact'],
];

const FAQS = [
  ['Do you offer a free trial?', 'No. TradingBible is paid-only: your card is charged at checkout before you enter the terminal. Every first payment carries a 14-day money-back guarantee, so you can test broker sync, analytics, the SI Coach and signals with a real account.'],
  ['Which brokers and platforms are supported?', 'Named brokers only — Binance, Deriv, easyMarkets, Interactive Brokers, Alpaca, Coinbase and more, plus TradingBible Funded evaluations and self-custody wallet tracking for BTC, ETH, USDC and Solana. Live accounts only; trades and balances sync automatically.'],
  ['What does the SI Coach actually do?', 'SI reviews every synced trade for quality, risk and discipline, detects recurring mistakes such as widened stops, revenge trading and overtrading, and answers questions grounded in your real history. Ask “What is my biggest mistake?” and it shows the evidence.'],
  ['How does the Academy work?', 'One $150 lifetime payment unlocks the full school: six paths including Forex Mastery A–Z, Crypto Mastery A–Z and Order Flow Mastery, 147 topics, SI-written lessons, graded quizzes, a tutor inside each path, eight live webinars a week and a certificate per path.'],
  ['What do Professional API and white-label include?', 'Professional ($99/mo) unlocks the REST API with personal keys and webhooks, team seats, unlimited brokers, white-label presets, white-glove onboarding and a dedicated success manager for funds and prop desks.'],
  ['Is there a community and one-to-one help?', 'Yes. The forum ranks members by real contribution, the public leaderboard shows verified activity without fake P&L, and vetted mentors can be booked for one-to-one sessions settled in TBC credits.'],
  ['How is TBC different from TB?', 'TBC platform credits are an existing off-chain utility credit used inside TradingBible. The proposed TBC token is a separate, unissued network asset. TB is a proposed equity ticker for TradingBible, Inc. Holding TBC credits does not make you a shareholder, and holding TB equity would not make you a TBC holder.'],
  ['Is TradingBible listed on Nasdaq?', 'No. TradingBible is a private, pre-IPO company. TB is a proposed ticker; no listing application, exchange approval, share price, market capitalisation, trading volume or investment offer is represented anywhere on this site.'],
];

function Head({ eyebrow, title, sub, center = false, id }) {
  return (
    <div id={id} className={`scroll-mt-28 ${center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}`}>
      <Kicker>{eyebrow}</Kicker>
      <h2 className="tb-h2 mt-3 text-balance text-[2rem] leading-[1.02] tracking-[-0.035em] sm:text-[2.8rem]">{title}</h2>
      {sub && <p className={`tb-sub ${center ? 'mx-auto' : ''}`}>{sub}</p>}
    </div>
  );
}

function Nav({ homeTo, isAuthed, platformName }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const brand = String(platformName || 'TradingBible').trim();
  const words = brand.split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';
  const close = () => setMenuOpen(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLink = 'landing-nav-link rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors';
  const mobileLink = 'landing-menu-link block rounded-xl px-4 py-3 text-sm font-medium transition-colors';

  return (
    <header className={`landing-header fixed inset-x-0 top-[var(--header-h)] z-40 ${scrolled ? 'shadow-xl' : ''}`}>
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Link to={homeTo} onClick={close} className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img src={LOGO} alt={`${brand} logo`} className="h-9 w-9 shrink-0 rounded-xl object-contain gold-glow sm:h-10 sm:w-10" />
          <span className="landing-word hidden truncate text-xl font-extrabold tracking-tight sm:inline sm:text-2xl">
            {first ? `${first} ` : ''}<span className="tb-gold-text">{last}</span>
          </span>
        </Link>

        <nav className="landing-nav-pill hidden items-center gap-0.5 rounded-full p-1 xl:flex" aria-label="Main navigation">
          <a href="#platform" className={navLink}>{t('land.features')}</a>
          <a href="#si" className={navLink}>SI Coach</a>
          <a href="#academy" className={navLink}>Academy</a>
          <a href="#funded" className={navLink}>Funded</a>
          <a href="#company" className={navLink}>Company</a>
          <Link to="/investors" className={navLink}>Investors</Link>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
          <ThemeSwitcher inline className="landing-control" />
          <LanguageSwitcher className="landing-control" />
          {isAuthed ? (
            <GoldButton to={homeTo} className="hidden px-4 py-2.5 text-sm sm:inline-flex">{t('land.openDash')}</GoldButton>
          ) : (
            <>
              <Link to="/login" className="landing-login hidden rounded-full px-3 py-2 text-sm font-medium transition-colors xl:block">{t('land.login')}</Link>
              <GoldButton to="/pricing" className="hidden px-4 py-2.5 text-sm sm:inline-flex">{t('land.viewPricing')}</GoldButton>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition hover:bg-white/5 active:scale-95 xl:hidden"
          >
            <IosIcon icon={menuOpen ? X : Menu} size="sm" tone="theme" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="landing-menu max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto px-4 pb-5 pt-2 xl:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile navigation">
            <a href="#platform" onClick={close} className={mobileLink}>{t('land.features')}</a>
            <a href="#si" onClick={close} className={mobileLink}>SI Coach</a>
            <a href="#academy" onClick={close} className={mobileLink}>Academy</a>
            <a href="#funded" onClick={close} className={mobileLink}>Funded evaluations</a>
            <a href="#company" onClick={close} className={mobileLink}>Company</a>
            <Link to="/investors" onClick={close} className={`${mobileLink} landing-menu-link--gold`}>Investor relations <span className="ml-1 font-mono text-[9px] uppercase tracking-wider opacity-60">Pre-IPO</span></Link>
            <Link to="/tbc" onClick={close} className={`${mobileLink} landing-menu-link--gold`}>TBC record</Link>
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

function LoopCard() {
  return (
    <Card className="relative overflow-hidden rounded-[1.5rem] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">The trading loop</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#f0ecdd]">One record. One coach. One next step.</h2>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#d4af37]"><ShieldCheck className="h-4 w-4" /></span>
      </div>
      <div className="mt-5 space-y-2">
        {LOOP.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="group flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-[#d4af37]/25">
              <IosIcon icon={Icon} size="sm" seed={step.title} className="mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] text-[#d4af37]">0{i + 1}</span>
                  <h3 className="text-sm font-semibold tracking-tight text-[#f0ecdd]">{step.title}</h3>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[#8a8577]">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-[#8a8577]">
        Built from real accounts. No demo P&amp;L, no fabricated prices and no synthetic performance.
      </p>
    </Card>
  );
}

export default function LandingPage() {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === 'light';
  const { settings } = usePlatformSettings();
  const signupsOpen = settings.signupsOpen !== false;
  const [openFaq, setOpenFaq] = React.useState(0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-[#e9e7df]">
      <Nav homeTo={homeTo} isAuthed={isAuthed} platformName={settings.platformName} />

      <section className="relative overflow-hidden pb-10 pt-[calc(8.5rem+var(--safe-top))] sm:pb-14 sm:pt-[calc(10rem+var(--safe-top))]">
        <div aria-hidden className="pointer-events-none absolute inset-0 grain opacity-30" />
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white/55 via-white/25 to-white/55' : 'from-[#07070a]/50 via-[#07070a]/20 to-[#07070a]/55'}`} />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-10 h-[32rem] w-[32rem] rounded-full bg-[#d4af37]/10 blur-[130px]" />
        <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#d4af37]/[0.06] blur-[120px]" />

        <div className="relative mx-auto grid w-full max-w-[84rem] gap-9 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-12">
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37] ${isLight ? 'border-[#d4af37]/45 bg-[#d4af37]/10' : 'border-[#d4af37]/30 bg-[#0a0a0f]/70'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                Terminal · Journal · Funded · Academy · TBC
              </span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.06 }} className="mt-6 max-w-3xl text-balance text-[2.55rem] font-extrabold leading-[0.96] tracking-[-0.045em] sm:text-[3.8rem] lg:text-[4.45rem]">
              Trade like the 1%.<br /><span className="tb-gold-text">Review like a fund.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.14 }} className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#b8b3a3] sm:text-lg">
              TradingBible turns live trades into a record you can defend. Connect your accounts, journal every decision, and let SI show you the pattern behind the result.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22 }} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {signupsOpen ? (
                <GoldButton to="/pricing" className="justify-center px-7 py-4 text-base shadow-[0_16px_48px_-14px_rgba(212,175,55,0.65)]">{t('land.choosePlan', null, 'Choose your plan')} <ArrowRight className="h-4 w-4" /></GoldButton>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-[#d4af37]/35 bg-white/[0.03] px-7 py-4 text-base font-semibold text-[#8a8577]">{t('land.signupsPaused')}</span>
              )}
              <GhostButton to="#platform" className="justify-center border px-7 py-4 text-base text-[#e9e7df]">See the workstation <ArrowUpRight className="h-4 w-4" /></GhostButton>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.32 }} className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-[#8a8577]">
              {['Live accounts only', 'No demo P&L', 'Your data stays yours', 'Private company · pre-IPO'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#d4af37]" />{item}</span>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }}>
            <LoopCard />
          </motion.div>
        </div>

        <div className="relative mx-auto mt-10 grid w-full max-w-[84rem] grid-cols-2 gap-2.5 px-5 sm:mt-12 sm:grid-cols-4 sm:px-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 backdrop-blur-sm sm:p-4">
              <div className="font-mono text-2xl font-bold tracking-tight text-[#e8c95a] sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b8b3a3]">{stat.label}</div>
              <div className="mt-0.5 text-[10px] text-[#8a8577]">{stat.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d4af37]/10">
        <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <Head eyebrow="Why TradingBible" title={<>Most platforms show you the market. <span className="tb-gold-text">Few help you review the trader.</span></>} sub="Signals are easy to sell. A record is harder to build — and far more useful. TradingBible is designed around the work that happens after the entry." />
            <Link to="/about" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4af37] hover:underline">Read our story <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {REASONS.map(([n, title, body]) => (
              <Card key={n} className="rounded-xl p-4 sm:p-5">
                <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#d4af37]">{n}</div>
                <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-[#f0ecdd]">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
        <Head id="platform" eyebrow="The workstation" title={<>Everything you need to run the trade — <span className="tb-gold-text">and the review.</span></>} sub="Eight connected modules. One account. No stitching together a terminal, a spreadsheet, a course and a coach." />
        <div className="mt-8 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} hover className="group flex flex-col rounded-xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/30 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <IosIcon icon={Icon} size="md" seed={module.title} />
                  <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-[#5f5b50]">{module.tag}</span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-[#f0ecdd]">{module.title}</h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[#8a8577]">{module.body}</p>
                <Link to={module.to} className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">{module.link} <ArrowUpRight className="h-3 w-3" /></Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="si" className={`scroll-mt-28 border-y border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/55' : 'bg-[#0a0a0f]/55'} backdrop-blur-sm`}>
        <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
          <div>
            <Head eyebrow="SI Coach" title={<>A coach that remembers <span className="tb-gold-text">the trade you want to forget.</span></>} sub="SI reads your actual journal. It can see the stop you moved, the size you doubled and the session where discipline slipped. Then it gives you one thing to fix." />
            <div className="mt-6 grid gap-2">
              {['What is my biggest recurring mistake?', 'Which setup actually works for me?', 'Where did I widen risk this week?', 'What should I focus on tomorrow?'].map((q) => (
                <div key={q} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-[#d8d3c3]">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />{q}
                </div>
              ))}
            </div>
            <GoldButton to="/pricing" className="mt-6 px-6 py-3.5">Meet your SI coach <ArrowRight className="h-4 w-4" /></GoldButton>
          </div>
          <Card className="relative overflow-hidden rounded-2xl p-5 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
            <div className="flex items-center gap-2.5">
              <IosIcon icon={Bot} size="md" tone="purple" />
              <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">Inside a review</div>
                <h3 className="text-base font-semibold tracking-tight text-[#f0ecdd]">Evidence first. Advice second.</h3>
              </div>
            </div>
            <div className="mt-5 divide-y divide-white/[0.06]">
              {REVIEW_ROWS.map(([label, body], i) => (
                <div key={label} className="grid gap-1 py-3.5 sm:grid-cols-[82px_1fr] sm:gap-3">
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#d4af37]">0{i + 1} · {label}</div>
                  <p className="text-[12px] leading-relaxed text-[#a9a494]">{body}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/[0.06] p-3 text-[11px] leading-relaxed text-[#c9c4b4]">
              SI does not invent a score, a price or a trade. It reasons from the history your account has actually synced.
            </p>
          </Card>
        </div>
      </section>

      <section id="academy" className="mx-auto w-full max-w-[84rem] scroll-mt-28 px-5 py-14 sm:px-8 sm:py-20">
        <Head eyebrow="Learn and get funded" title={<>A school and a capital program, <span className="tb-gold-text">both built around execution.</span></>} sub="Education should change what you do on the desk. Funded evaluations should test the same discipline — with the rules visible before you pay." />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <IosIcon icon={GraduationCap} size="lg" tone="green" />
              <div><div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">TradingBible Academy</div><h3 className="text-lg font-semibold tracking-tight text-[#f0ecdd]">From first candle to professional desk.</h3></div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#8a8577]">Six paths, 147 lessons and eight live webinars a week. Every lesson is written by SI, every quiz is graded, and every path ends with a certificate. One $150 lifetime payment.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {ACADEMY.map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><div className="font-mono text-xl font-bold text-[#e8c95a]">{value}</div><div className="mt-0.5 text-[10px] leading-snug text-[#8a8577]">{label}</div></div>
              ))}
            </div>
            <Link to="/academy" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4af37] hover:underline">Explore the Academy <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>

          <Card id="funded" className="scroll-mt-28 rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <IosIcon icon={Trophy} size="lg" tone="orange" />
              <div><div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">TradingBible Funded</div><h3 className="text-lg font-semibold tracking-tight text-[#f0ecdd]">Capital with the rules in writing.</h3></div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#8a8577]">Two-step, one-step and dollar-ruled futures programs up to $400K. One live seat per size, payouts to your TBC credit wallet, and the entry fee refunded when you qualify. Program terms and availability apply.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {FUNDED.map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"><div className="font-mono text-xl font-bold text-[#e8c95a]">{value}</div><div className="mt-0.5 text-[10px] leading-snug text-[#8a8577]">{label}</div></div>
              ))}
            </div>
            <Link to="/app/challenges" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4af37] hover:underline">View funded programs <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Card>
        </div>
      </section>

      <section id="company" className={`scroll-mt-28 border-y border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/55' : 'bg-[#0a0a0f]/55'} backdrop-blur-sm`}>
        <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
          <Head eyebrow="The company" title={<>Private by design. <span className="tb-gold-text">Clear about what comes next.</span></>} sub="TradingBible is a private company, not a listed stock. The product, the issuer record and the proposed network asset are separate things — and this page treats them that way." />
          <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {COMPANY_LINKS.map(([label, to]) => (
                  <Link key={label} to={to} className="group flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[12px] font-semibold text-[#d8d3c3] transition hover:border-[#d4af37]/30 hover:text-[#f0ecdd]">
                    {label}<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#d4af37]" />
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-[#8a8577]">
                TradingBible LLC is the current operating entity. TradingBible, Inc. is a proposed issuer. TB is a proposed ticker, not a reserved or approved listing.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Card className="rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] font-bold tracking-[0.16em] text-[#d4af37]">TB · PROPOSED TICKER</span><span className="rounded-full border border-[#d4af37]/25 px-2 py-0.5 font-mono text-[8px] font-bold text-[#d4af37]">NOT LISTED</span></div>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-[#f0ecdd]">No price. No market cap. No approval.</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">TradingBible is pre-IPO. TB is a proposed Nasdaq ticker. No listing application, exchange approval, share price, trading volume or investment offer is represented.</p>
                <Link to="/stock/TB" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">Open issuer record <ArrowRight className="h-3 w-3" /></Link>
              </Card>
              <Card className="rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] font-bold tracking-[0.16em] text-[#d4af37]">TBC · PROPOSED ASSET</span><span className="rounded-full border border-amber-400/25 px-2 py-0.5 font-mono text-[8px] font-bold text-amber-300">NOT ISSUED</span></div>
                <h3 className="mt-3 text-[15px] font-semibold tracking-tight text-[#f0ecdd]">Separate from TB equity.</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">TBC platform credits are existing off-chain credits. The proposed TBC token is not issued, and token sale, transfer, staking, governance and migration operations remain disabled. Holding TBC does not make you a shareholder.</p>
                <Link to="/tbc/separation" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">Read separation notice <ArrowRight className="h-3 w-3" /></Link>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
        <Head center eyebrow="From the desk" title="Traders who wanted a record, not a highlight reel." sub="Individual experiences from active TradingBible users. Not investment advice, and never a promise of performance." />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name} hover className="rounded-xl p-5">
              <div className="font-serif text-3xl leading-none text-[#d4af37]/50">“</div>
              <p className="-mt-1 text-sm leading-relaxed text-[#c9c4b4]">{t(tm.qk, null, tm.quote)}</p>
              <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.06] pt-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[11px] font-bold text-[#e8c95a]">{tm.name.trim().charAt(0)}</span>
                <div><div className="text-xs font-semibold text-[#f0ecdd]">{tm.name}</div><div className="text-[10px] text-[#8a8577]">{t(tm.rk, null, tm.role)}</div></div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className={`scroll-mt-28 border-t border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/55' : 'bg-[#0a0a0f]/55'} backdrop-blur-sm`}>
        <div className="mx-auto w-full max-w-[84rem] px-5 py-14 sm:px-8 sm:py-20">
          <Head center eyebrow="Pricing" title="Choose the room you want to trade from." sub="Every plan starts with the same live-account journal. Upgrade when you want SI beside you, daily reports or a desk-level API." />
          <div className="mt-8 grid items-stretch gap-3 md:grid-cols-3">
            {PLANS.map((raw) => {
              const p = translatePlan(t, raw);
              return (
                <Card key={p.id} hover className={`relative flex flex-col rounded-2xl p-5 sm:p-6 ${p.highlight ? 'border-[#d4af37]/50 bg-gradient-to-b from-[#d4af37]/[0.12] via-[#121209] to-[#0f0f14] md:scale-[1.02]' : ''}`}>
                  {p.highlight && <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#0a0a0f]">{t('misc.popular')}</div>}
                  <div className="flex items-center gap-2.5">
                    <img src={p.logo} alt="" className="h-10 w-10 rounded-xl object-contain ring-1 ring-[#d4af37]/25" />
                    <div><h3 className="text-base font-bold tracking-tight text-[#f0ecdd]">{p.name}</h3><p className="text-[10px] text-[#8a8577]">{p.tagline}</p></div>
                  </div>
                  <div className="mt-4 flex items-end gap-1"><span className="font-mono text-3xl font-bold text-[#e8c95a]">${p.price}</span><span className="mb-1 text-xs text-[#8a8577]">/{p.period}</span></div>
                  <div className="my-4 h-px bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
                  <ul className="flex-1 space-y-2 text-xs text-[#b3ae9e]">
                    {p.features.slice(0, 5).map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34d399]" /><span className="leading-snug">{f}</span></li>)}
                  </ul>
                  <Link to="/pricing" className={`mt-5 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition active:scale-[0.98] ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f]' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60'}`}>{p.cta} <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Card>
              );
            })}
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[10px] leading-relaxed text-[#8a8577]">Every first payment carries a 14-day money-back guarantee. Plans are charged on card; TBC platform credits never pay for a plan. Program terms, market data access and availability apply.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20">
        <Head center eyebrow="Questions" title="The questions worth asking." />
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {FAQS.map(([q, a], i) => {
            const isOpen = openFaq === i;
            return (
              <div key={q} className={`${i > 0 ? 'border-t border-white/[0.06]' : ''} ${isOpen ? 'bg-[#d4af37]/[0.04]' : ''}`}>
                <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : i)} aria-expanded={isOpen} className="group flex min-h-[54px] w-full items-center justify-between gap-4 px-4 py-3.5 text-left sm:px-5">
                  <span className={`text-sm font-medium tracking-tight ${isOpen ? 'text-[#f0ecdd]' : 'text-[#d8d3c3]'}`}>{q}</span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs transition-transform ${isOpen ? 'rotate-45 border-[#d4af37]/50 text-[#e8c95a]' : 'border-white/10 text-[#8a8577]'}`}>＋</span>
                </button>
                {isOpen && <p className="px-4 pb-4 text-xs leading-relaxed text-[#b3ae9e] sm:px-5">{a}</p>}
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-xs text-[#8a8577]"><Link to="/faq" className="font-semibold text-[#d4af37] hover:underline">See all FAQs</Link> · <Link to="/contact" className="font-semibold text-[#d4af37] hover:underline">Talk to support</Link></p>
      </section>

      <section className="mx-auto w-full max-w-[84rem] px-5 pb-16 sm:px-8 sm:pb-24">
        <Card className="relative overflow-hidden rounded-2xl border-[#d4af37]/25 p-6 sm:p-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.16),transparent_55%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Your next session</div>
              <h2 className="mt-2 max-w-2xl text-balance text-[1.9rem] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-4xl">The next trade is already teaching you something. <span className="tb-gold-text">Put it on the record.</span></h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8577]">Start with a plan, connect a live account and let the first review show you what to work on next.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <GoldButton to="/pricing" className="justify-center px-6 py-3.5">Choose your plan <ArrowRight className="h-4 w-4" /></GoldButton>
              <GhostButton to="/contact" className="justify-center border px-6 py-3.5 text-[#e9e7df]">Talk to support</GhostButton>
            </div>
          </div>
          <p className="relative mt-6 border-t border-white/[0.07] pt-3 text-[9px] leading-relaxed text-[#5f5b50]">
            TradingBible is a private, pre-IPO company. TB is a proposed ticker; no listing, price, market capitalisation, volume or investment offer is represented. TBC platform credits and the proposed TBC token are separate from TB equity. Nothing here is financial advice.
          </p>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
