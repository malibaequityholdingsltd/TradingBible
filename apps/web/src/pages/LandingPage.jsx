import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Shield, Plug, BookOpen, ArrowRight, Check, BarChart3, Zap, Menu, X } from 'lucide-react';
import { PLANS } from '@/lib/mockData';
import Footer from '@/components/Footer';
import { TESTIMONIALS, TRADINGBIBLE_LOGO } from '@/lib/branding';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { homeRouteForUser } from '@/lib/homeRoute';
import { usePlatformSettings } from '@/lib/platformSettings';

const LOGO = TRADINGBIBLE_LOGO;

const HERO_STATS = [
  { value: '8', label: 'Broker integrations' },
  { value: '14', label: 'Technical indicators' },
  { value: '99.9%', label: 'Platform uptime' },
  { value: '0', label: 'Card required to start' },
];

function Nav({ homeTo, isAuthed, platformName }) {
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
    <header className={`fixed inset-x-0 top-[var(--header-h)] z-40 border-b transition-all duration-300 ${scrolled ? 'border-[#d4af37]/15 bg-[#07070a]/92 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl' : 'border-[#d4af37]/10 bg-[#07070a]/70 backdrop-blur-xl'}`}>
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to={homeTo} className="flex shrink-0 items-center gap-2.5">
          <img src={LOGO} alt={`${brand} logo`} className="h-9 w-9 shrink-0 rounded-xl object-contain gold-glow sm:h-10 sm:w-10" />
          <span className="text-xl font-extrabold tracking-tight text-[#e9e7df] sm:text-2xl">{first ? `${first} ` : ''}<span className="gold-text">{last}</span></span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] p-1.5 md:flex">
          <a href="#features" className={navLink}>Features</a>
          <a href="#ai" className={navLink}>AI Coach</a>
          <Link to="/about" className={navLink}>About</Link>
          <Link to="/pricing" className={navLink}>Pricing</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthed ? (
            <Link to={homeTo} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition hover:opacity-90 hover:shadow-[0_4px_28px_rgba(212,175,55,0.45)]">
              <span>Open Dashboard</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-[#c9c4b4] transition-colors hover:bg-white/5 hover:text-[#e9e7df] sm:block">Log in</Link>
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f] shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition hover:opacity-90 hover:shadow-[0_4px_28px_rgba(212,175,55,0.45)]">
                <span>Start Free Trial</span>
              </Link>
              <button onClick={() => setMenuOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60 md:hidden" aria-label="Menu" aria-expanded={menuOpen}>
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {menuOpen && !isAuthed && (
        <div className="border-t border-[#d4af37]/10 bg-[#07070a]/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">Features</a>
            <a href="#ai" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">AI Coach</a>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">About</Link>
            <Link to="/pricing" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#8a8577] transition-colors hover:bg-white/5 hover:text-[#f0ecdd]">Pricing</Link>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-[#c9c4b4] transition-colors hover:bg-white/5 hover:text-[#e9e7df]">Log in</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

const FEATURES = [
  { icon: BarChart3, title: 'Institutional Analytics', body: 'Equity curve, profit factor, drawdown, win rate and a proprietary Trader Score — computed in real time.' },
  { icon: Bot, title: 'AI Trading Coach', body: 'Every trade auto-reviewed for quality, risk and discipline. Ask it anything about your last 100 trades.' },
  { icon: BookOpen, title: 'Automatic Journal', body: 'Symbol, R:R, emotion, screenshots and notes. Search, filter and export a fund-grade trade log.' },
  { icon: Plug, title: 'Broker Sync', body: 'MT4, MT5, cTrader, DXtrade, IBKR, Binance, Bybit & Coinbase. Trades flow in automatically.' },
  { icon: Zap, title: 'n8n Automation', body: 'Webhook-ready workflows: onboarding, trade analysis, daily & weekly AI reports on autopilot.' },
  { icon: Shield, title: 'Bank-grade Security', body: 'Row-level security, isolated user data, protected APIs and encrypted broker credentials.' },
];

export default function LandingPage() {
  const { user, isAuthed } = useAuth();
  const homeTo = homeRouteForUser(isAuthed ? user : null);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { settings } = usePlatformSettings();
  const signupsOpen = settings.signupsOpen !== false;
  const trialDays = Number(settings.trialDays) || 7;

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
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide text-[#d4af37] ${isLight ? 'border-[#d4af37]/45 bg-[#d4af37]/[0.12]' : 'border-[#d4af37]/30 bg-[#d4af37]/[0.07]'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              AI-POWERED TRADING TERMINAL
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }} className="mt-7 text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[5.5rem]">
            Trade like the <span className="gold-text">1%.</span><br />
            Journal like a <span className="gold-text">fund.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }} className="mt-7 max-w-2xl text-base leading-relaxed text-[#b8b3a3] sm:text-lg">
            {settings.tagline || 'An AI-powered trading journal built on a Bloomberg-grade terminal. Track every edge, kill every mistake, and let the coach compound your discipline.'}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }} className="mt-10 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-4">
            {signupsOpen ? (
              <Link to="/signup" className="btn-neon inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7ecb6] via-[#e2bd4f] to-[#c99a25] px-8 py-4 text-base font-bold text-[#0a0a0f] transition hover:opacity-90">Start {trialDays}-day Premium Trial <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-white/[0.03] px-8 py-4 text-base font-semibold text-[#8a8577]">Signups are paused</span>
            )}
            <Link to="/pricing" className="btn-glass inline-flex items-center justify-center rounded-xl border border-[#d4af37]/35 bg-white/[0.02] px-8 py-4 text-base font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/60 hover:text-[#e9e7df]">View Pricing</Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34 }} className="mt-14 w-full max-w-3xl border-t border-[#d4af37]/12 pt-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-3xl font-bold gold-text">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a8577]">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[96rem] px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[#d4af37]">The terminal</p>
          <h2 className="text-4xl font-bold sm:text-5xl">Everything a serious trader needs — <span className="gold-text">nothing they don't.</span></h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="portfolio-card glass rounded-2xl p-6">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><f.icon className="h-5 w-5" /></div>
              <h3 className="portfolio-card__title mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[#8a8577]">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI band */}
      <section id="ai" className={`border-y border-[#d4af37]/10 bg-gradient-to-b ${isLight ? 'from-[#f1f5f9] to-[#e2e8f0]' : 'from-[#0a0a0f]/85 to-[#07070a]/80'}`}>
        <div className="mx-auto grid max-w-[96rem] items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[#d4af37]">Powered by OpenAI</p>
            <h2 className="text-4xl font-bold sm:text-5xl">Your personal <span className="gold-text">trading coach</span>, awake 24/7.</h2>
            <p className="mt-5 max-w-md text-[#b3ae9e]">Ask real questions. Get real answers grounded in your own data.</p>
            <div className="mt-8 space-y-3">
              {['Analyze my last 100 trades', 'What is my biggest mistake?', 'What strategy works best for me?', 'How can I improve my risk management?'].map((q) => (
                <div key={q} className="glass rounded-xl px-4 py-3 text-sm text-[#e9e7df]"><span className="mr-2 text-[#d4af37]">›</span>{q}</div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-6 gold-glow">
            <div className="mb-4 flex items-center gap-2 text-[#d4af37]"><Bot className="h-5 w-5" /><span className="font-semibold">AI Trade Review</span></div>
            {[['Trade Quality', 92], ['Risk Management', 78], ['Discipline', 85]].map(([l, v]) => (
              <div key={l} className="mb-4">
                <div className="mb-1.5 flex justify-between text-sm"><span className="text-[#b3ae9e]">{l}</span><span className="font-mono text-[#d4af37]">{v}/100</span></div>
                <div className="h-2 rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
            <p className="mt-4 rounded-lg bg-[#d4af37]/8 p-3 text-sm text-[#c9c4b4]"><span className="font-semibold text-[#d4af37]">Coach: </span>Strong entries, but you widened stops on 3 of your last losers. Set fixed 1R risk and your profit factor climbs to ~2.6.</p>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-[96rem] px-6 pt-10 pb-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Trusted by <span className="gold-text">real traders</span></h2>
          <p className="mt-2 text-[#8a8577]">Social proof from active TradingBible users.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="portfolio-card glass rounded-2xl p-5">
              <p className="text-sm leading-relaxed text-[#c9c4b4]">“{t.quote}”</p>
              <div className="mt-4 border-t border-[#d4af37]/15 pt-3">
                <div className="portfolio-card__title text-sm font-semibold text-[#f0ecdd]">{t.name}</div>
                <div className="text-xs text-[#8a8577]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-[96rem] px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">Pricing that <span className="gold-text">scales with you</span></h2>
          <p className="mt-3 text-[#8a8577]">Start free for 7 days. Billed securely via Paddle. Cancel anytime.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.id} className={`portfolio-card relative rounded-2xl p-6 ${p.highlight ? 'glass gold-glow' : 'glass'}`}>
              {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-3 py-0.5 text-[11px] font-bold text-[#0a0a0f]">MOST POPULAR</div>}
              <img src={p.logo} alt={`${p.name} plan logo`} className="mb-3 h-12 w-12 rounded-xl object-contain" />
              <h3 className="portfolio-card__title text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-xs text-[#8a8577]">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1"><span className="text-3xl font-bold gold-text">{p.price === 0 ? 'Free' : `$${p.price}`}</span><span className="mb-1 text-sm text-[#8a8577]">/{p.period}</span></div>
              <ul className="mt-5 space-y-2 text-sm text-[#b3ae9e]">{p.features.slice(0, 4).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#d4af37]" />{f}</li>)}</ul>
              <Link to="/signup" className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition ${p.highlight ? 'bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] text-[#0a0a0f] hover:opacity-90' : 'border border-[#d4af37]/25 text-[#e9e7df] hover:border-[#d4af37]/60'}`}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
