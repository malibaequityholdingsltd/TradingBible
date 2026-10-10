import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot, Plug, BookOpen, ArrowRight, Check, BarChart3, Menu, X,
  CircleDot, GraduationCap, Wallet, Radar, Sparkles, Trophy,
} from 'lucide-react';
import { PLANS, translatePlan } from '@/lib/mockData';
import Footer from '@/components/Footer';
import { TESTIMONIALS, TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { homeRouteForUser } from '@/lib/homeRoute';
import { useI18n } from '@/lib/i18n';
import { usePlatformSettings } from '@/lib/platformSettings';
import { Card, GhostButton, GoldButton, Kicker, StatGrid, Stat } from '@/components/ui-kit';

const LOGO = TRADINGBIBLE_LOGO;

const STATS = [
  { value: '20+', label: 'Broker integrations' },
  { value: '147', label: 'Trading lessons' },
  { value: '100M', label: 'TBC fixed supply' },
  { value: '24/7', label: 'SI coaching' },
];

const FEATURES = [
  { icon: BarChart3, title: 'Institutional analytics', body: 'Equity curve, profit factor, drawdown and a proprietary Trader Score — computed live from synced trades.' },
  { icon: Bot, title: 'SI trading coach', body: 'Your personal SI reviews every trade, grades discipline, spots recurring mistakes and answers questions grounded in your real history.' },
  { icon: BookOpen, title: 'Journal that syncs itself', body: 'Connect a broker or prop firm once — trades land in your journal automatically with analytics, reports and a trading calendar.' },
  { icon: Plug, title: 'Named brokers & wallet', body: 'Binance, Deriv, easyMarkets, Interactive Brokers, Alpaca and Coinbase over API and MT5 bridge — plus self-custody wallets with live balances. Live accounts only, never demos.' },
  { icon: CircleDot, title: '3D bubble heatmaps', body: 'The whole market as living bubbles across 5 markets plus an All view — size by move or volume, drag them, search any pair, switch color themes.' },
  { icon: GraduationCap, title: 'Lifetime academy', body: '6 paths, 147 lessons, 8 live webinars a week with SI-written lessons, graded quizzes and 1-on-1 tutoring. $150 once — yours forever.' },
  { icon: Trophy, title: 'Funded evaluations', body: 'Two-step, one-step and dollar-ruled futures programs to $400K in firm capital. One live seat per size, payouts to your bank, entry fee refunded.' },
  { icon: Wallet, title: 'TBC brand money', body: 'Entries, signals, mentorship and academy settle in TBC from your till — convert, swap, buy or receive it first. Plans stay on card, never TBC.' },
];

const STEPS = [
  { n: '01', title: 'Pick your plan', body: 'Choose Pro, Elite SI or Professional. Your card is charged at checkout and the full terminal unlocks instantly.' },
  { n: '02', title: 'Connect & sync', body: 'Link a broker, prop firm or wallet. Your trades, balances and history flow in automatically.' },
  { n: '03', title: 'Trade with SI oversight', body: 'Journal every session, follow signals and alerts, and let the SI coach compound your discipline.' },
];

const FAQS = [
  { q: 'Do you offer a free trial?', a: 'No — TradingBible is paid-only: your card is charged at checkout before you enter the terminal. Instead of a trial, every first payment carries a 14-day money-back guarantee, so you can test broker sync, analytics, the SI Coach and signals risk-free.' },
  { q: 'Which brokers and platforms are supported?', a: 'Named brokers only — Binance, Deriv, easyMarkets, Interactive Brokers, Alpaca, Coinbase and more (live accounts only), plus TradingBible Funded evaluations — with self-custody wallet tracking for BTC, ETH, USDC and Solana. Trades and balances sync automatically, nothing is typed by hand.' },
  { q: 'What does the SI Coach actually do?', a: 'Your 24/7 SI mentor: it reviews every synced trade for quality, risk and discipline, detects recurring mistakes (widened stops, revenge trading, overtrading), grades your discipline and answers questions grounded in your real history — try “What is my biggest mistake?”.' },
  { q: 'How does the Academy work?', a: 'One $150 lifetime payment unlocks the full school: 6 paths including Forex Mastery A–Z, Crypto Mastery A–Z and Order Flow Mastery (147 topics from pips and wallets to funding rates and prop-firm challenges), an SI that writes every lesson and grades every quiz, a 1-on-1 tutor inside each lesson, 8 live webinars a week and a certificate per path. Admins enter free.' },
];

function Nav({ homeTo, isAuthed, platformName }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const brand = String(platformName || 'TradingBible').trim();
  const words = brand.split(/\s+/);
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1] || '';

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLink = 'relative rounded-full px-4 py-2 text-sm font-medium text-[#8a8577] transition-colors hover:text-[#f0ecdd] after:absolute after:inset-x-4 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gradient-to-r after:from-[#f4e6a8] after:to-[#d4af37] after:transition-transform after:duration-300 hover:after:scale-x-100';

  return (
    <header className={`fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[#d4af37]/15 bg-[#07070a] ${scrolled ? 'shadow-[0_8px_32px_rgba(0,0,0,0.35)]' : ''}`}>
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-2 overflow-hidden px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link to={homeTo} className="flex min-w-0 shrink-0 items-center gap-2.5">
          <img src={LOGO} alt={`${brand} logo`} className="h-9 w-9 shrink-0 rounded-xl object-contain gold-glow sm:h-10 sm:w-10" />
          <span className="hidden truncate text-xl font-extrabold tracking-tight text-[#e9e7df] sm:inline sm:text-2xl">{first ? `${first} ` : ''}<span className="tb-gold-text">{last}</span></span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/5 bg-[#0a0a0f] p-1.5 md:flex">
          <a href="#features" className={navLink}>{t('land.features')}</a>
          <a href="#academy" className={navLink}>{t('nav.academy')}</a>
          <Link to="/pricing" className={navLink}>{t('land.pricing')}</Link>
          <Link to="/tbc" className={navLink}>TBC</Link>
          <Link to="/about" className={navLink}>{t('land.about')}</Link>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
          {isAuthed ? (
            <>
              <GoldButton to={homeTo} className="hidden px-5 py-2.5 text-base sm:inline-flex"><span>{t('land.openDash')}</span></GoldButton>
              <Link to={homeTo} className="grid h-9 place-items-center whitespace-nowrap rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-[13px] font-bold text-[#0a0a0f] sm:hidden">{t('land.openDash')}</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-[#c9c4b4] transition-colors hover:bg-white/5 hover:text-[#e9e7df] sm:block">{t('land.login')}</Link>
              <GoldButton to="/pricing" className="hidden px-5 py-2.5 text-base sm:inline-flex"><span>{t('land.viewPricing')}</span></GoldButton>
              <Link to="/pricing" className="grid h-9 place-items-center whitespace-nowrap rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 text-[13px] font-bold text-[#0a0a0f] sm:hidden">{t('land.viewPricing')}</Link>
              <button onClick={() => setMenuOpen((o) => !o)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60 md:hidden" aria-label={t('nav.menu')} aria-expanded={menuOpen}>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {menuOpen && !isAuthed && (
        <div className="border-t border-[#d4af37]/10 bg-[#07070a] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">{t('land.features')}</a>
            <a href="#academy" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">{t('nav.academy')}</a>
            <Link to="/pricing" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">{t('land.pricing')}</Link>
            <Link to="/tbc" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#d4af37] transition-colors hover:bg-white/5">TBC</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#c9c4b4] transition-colors hover:bg-white/5 hover:text-[#e9e7df]">{t('land.about')}</Link>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#c9c4b4] transition-colors hover:bg-white/5 hover:text-[#e9e7df]">{t('land.login')}</Link>
          </nav>
        </div>
      )}
    </header>
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

      {/* Hero */}
      <section className="relative flex flex-col justify-center overflow-hidden pb-16 pt-[calc(11rem+var(--safe-top))] sm:pt-[calc(13rem+var(--safe-top))] lg:min-h-[92dvh]">
        <div className="absolute inset-0 grain opacity-30" />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white/55 via-white/30 to-white/60' : 'from-[#07070a]/45 via-[#07070a]/25 to-[#07070a]/55'}`} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#d4af37]/10 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-[-14rem] right-[-12%] h-[36rem] w-[36rem] rounded-full bg-[#d4af37]/[0.06] blur-[120px]" />

        <div className="relative mx-auto flex w-full max-w-[72rem] flex-col items-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide text-[#d4af37] backdrop-blur-md ${isLight ? 'border-[#d4af37]/45 bg-[#d4af37]/[0.12]' : 'border-[#d4af37]/30 bg-[#d4af37]/[0.07]'}`}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
              {t('land.heroKick')}
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }} className="mt-7 text-balance text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.5rem]">
            {t('land.heroA')} <span className="tb-gold-text">{t('land.heroB')}</span><br />
            {t('land.heroC')} <span className="tb-gold-text">{t('land.heroD')}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }} className="mt-7 max-w-2xl text-base leading-relaxed text-[#b8b3a3] sm:text-lg">
            {t('land.heroSub')}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }} className="mt-10 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            {signupsOpen ? (
              <GoldButton to="/pricing" className="px-8 py-4 text-base">{t('land.choosePlan', null, 'Choose your plan')} <ArrowRight className="h-4 w-4" /></GoldButton>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-white/[0.03] px-8 py-4 text-base font-semibold text-[#8a8577] backdrop-blur-md">{t('land.signupsPaused')}</span>
            )}
            <GhostButton to="/tv" className="border px-8 py-4 text-base text-[#e9e7df]">{t('land.watchTv', null, 'Watch TradingBible TV')}</GhostButton>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34 }} className="mt-14 w-full max-w-3xl border-t border-[#d4af37]/12 pt-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="tb-gold-text font-mono text-3xl font-bold">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-[96rem] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-2xl sm:mb-14">
          <Kicker icon={Sparkles}>{t('land.featKick')}</Kicker>
          <h2 className="tb-h2 text-balance text-3xl sm:text-5xl">{t('land.featTitleA')} <span className="tb-gold-text">{t('land.featTitleB')}</span></h2>
        </div>
        <div className="tb-grid-auto">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 5) * 0.06 }}>
              <Card hover className="h-full p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><f.icon className="h-5 w-5" /></div>
                <h3 className="mb-2 text-lg font-semibold text-[#f0ecdd]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#8a8577]">{f.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={`border-y border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/60' : 'bg-[#0a0a0f]/60'} backdrop-blur-sm`}>
        <div className="mx-auto w-full max-w-[96rem] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 max-w-2xl sm:mb-12">
            <Kicker>{t('land.howKick', null, 'How it works')}</Kicker>
            <h2 className="tb-h2 text-balance text-3xl sm:text-5xl">{t('land.howTitle', null, 'Live in three steps')}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full p-6">
                  <div className="tb-gold-text font-mono text-4xl font-bold">{s.n}</div>
                  <h3 className="mt-3 text-lg font-semibold text-[#f0ecdd]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{s.body}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SI coach band */}
      <section id="ai" className="mx-auto w-full max-w-[96rem] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <Kicker>{t('land.aiKick')}</Kicker>
            <h2 className="tb-h2 text-balance text-3xl sm:text-5xl">{t('land.aiTitleA')} <span className="tb-gold-text">{t('land.aiTitleB')}</span>{t('land.aiTitleC')}</h2>
            <p className="tb-sub">{t('land.aiSub')}</p>
            <div className="mt-8 space-y-3">
              {[t('land.q1'), t('land.q2'), t('land.q3'), t('land.q4')].map((q) => (
                <div key={q} className="tb-card px-4 py-3 text-sm text-[#e9e7df]"><span className="mr-2 text-[#d4af37]">›</span>{q}</div>
              ))}
            </div>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2 text-[#d4af37]"><Bot className="h-5 w-5" /><span className="font-semibold">{t('land.revTitle')}</span></div>
            {[[t('land.m1'), 92], [t('land.m2'), 78], [t('land.m3'), 85]].map(([l, v]) => (
              <div key={l} className="mb-4">
                <div className="mb-1.5 flex justify-between text-sm"><span className="text-[#b3ae9e]">{l}</span><span className="font-mono text-[#d4af37]">{v}/100</span></div>
                <div className="h-2 rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
            <p className="mt-4 rounded-lg bg-[#d4af37]/8 p-3 text-sm text-[#c9c4b4]"><span className="font-semibold text-[#d4af37]">{t('land.coachTag')}</span>{t('land.coachNote')}</p>
          </Card>
        </div>
      </section>

      {/* Academy band */}
      <section id="academy" className={`scroll-mt-24 border-y border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/60' : 'bg-[#0a0a0f]/60'} backdrop-blur-sm`}>
        <div className="mx-auto grid w-full max-w-[96rem] items-center gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-12">
          <div>
            <Kicker icon={GraduationCap}>{t('land.acadKick', null, 'TradingBible Academy')}</Kicker>
            <h2 className="tb-h2 text-balance text-3xl sm:text-5xl">{t('land.acadTitle', null, 'A school run by SI')}</h2>
            <p className="tb-sub">{t('land.acadSub', null, 'Personal learning paths, SI-written lessons, graded quizzes, live webinars and one-on-one tutoring — from your first candle to the professional desk. One $150 lifetime payment, yours forever.')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GoldButton to="/academy" className="px-6 py-3.5">{t('land.acadCta', null, 'Explore the Academy')} <ArrowRight className="h-4 w-4" /></GoldButton>
              <GhostButton to="/pricing" className="px-6 py-3.5 text-[#e9e7df]">{t('land.viewPricing')}</GhostButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: BookOpen, title: '6 learning paths', body: 'Beginner to Professional — Forex, Crypto, Order Flow and Intermediate, curated around you.' },
              { icon: Radar, title: '8 live sessions / week', body: 'SI-hosted webinars with real Q&A across every desk.' },
              { icon: BarChart3, title: 'Graded & certified', body: 'SI-graded quizzes and shareable certificates per path.' },
              { icon: Wallet, title: '$150 once', body: 'Lifetime access. No subscription, no trial games.' },
            ].map((c) => (
              <Card key={c.title} className="p-5">
                <c.icon className="mb-3 h-5 w-5 text-[#d4af37]" />
                <h3 className="font-semibold text-[#f0ecdd]">{c.title}</h3>
                <p className="mt-1 text-sm text-[#8a8577]">{c.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-[96rem] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="tb-h2 mx-auto max-w-2xl text-3xl sm:text-4xl">{t('land.trustedBy')}</h2>
          <p className="tb-sub mx-auto">{t('land.trustedSub')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name} hover className="p-5">
              <p className="text-sm leading-relaxed text-[#c9c4b4]">“{t(tm.qk, null, tm.quote)}”</p>
              <div className="mt-4 border-t border-[#d4af37]/15 pt-3">
                <div className="text-sm font-semibold text-[#f0ecdd]">{tm.name}</div>
                <div className="text-xs text-[#8a8577]">{t(tm.rk, null, tm.role)}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className={`scroll-mt-24 border-t border-[#d4af37]/10 ${isLight ? 'bg-[#efe9da]/60' : 'bg-[#0a0a0f]/60'} backdrop-blur-sm`}>
        <div className="mx-auto w-full max-w-[96rem] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="tb-h2 text-balance text-3xl sm:text-5xl">{t('price.chooseEdge')}</h2>
            <p className="tb-sub mx-auto">{t('price.sub')}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((raw) => {
              const p = translatePlan(t, raw);
              return (
                <Card key={p.id} hover className={`relative flex flex-col p-6 ${p.highlight ? 'gold-glow' : ''}`}>
                  {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0f]">{t('misc.popular')}</div>}
                  <img src={p.logo} alt={p.name} className="mb-3 h-12 w-12 rounded-xl object-contain" />
                  <h3 className="text-lg font-semibold text-[#f0ecdd]">{p.name}</h3>
                  <p className="mt-1 text-xs text-[#8a8577]">{p.tagline}</p>
                  <div className="mt-4 flex items-end gap-1"><span className="tb-gold-text text-3xl font-bold">${p.price}</span><span className="mb-1 text-sm text-[#8a8577]">/{p.period}</span></div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-[#b3ae9e]">{p.features.slice(0, 4).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#d4af37]" />{f}</li>)}</ul>
                  <Link to="/pricing" className={`mt-6 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60'}`}>{p.cta} <ArrowRight className="h-4 w-4" /></Link>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="tb-h2 text-3xl sm:text-4xl">{t('land.faqTitle', null, 'Questions, answered')}</h2>
        </div>
        <div className="divide-y divide-[#d4af37]/10 rounded-2xl border border-[#d4af37]/10 backdrop-blur-md">
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={f.q}>
                <button onClick={() => setOpenFaq(isOpen ? -1 : i)} className="flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="font-medium text-[#f0ecdd]">{f.q}</span>
                  <span className={`shrink-0 text-[#d4af37] transition-transform ${isOpen ? 'rotate-45' : ''}`}>＋</span>
                </button>
                {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-[#b3ae9e]">{f.a}</p>}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-[#8a8577]"><Link to="/faq" className="text-[#d4af37] hover:underline">{t('land.allFaq', null, 'See all FAQs')}</Link></p>
      </section>

      <Footer />
    </div>
  );
}
