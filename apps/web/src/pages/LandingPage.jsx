import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Shield, Plug, BookOpen, ArrowRight, Check, BarChart3, Zap } from 'lucide-react';
import { PLANS } from '@/lib/mockData';
import Footer from '@/components/Footer';
import { TESTIMONIALS, TRADINGBIBLE_LOGO } from '@/lib/branding';
import { useAuth } from '@/hooks/useAuth';
import { homeRouteForUser } from '@/lib/homeRoute';

const HERO = 'https://images.hostinger.com/e146456e-bc90-43b7-918f-eb856c540783.png';
const LOGO = TRADINGBIBLE_LOGO;
const BG = 'https://images.hostinger.com/9cbd061f-1905-472a-a6c1-df15fc5f0d8d.png';

function Nav({ homeTo, isAuthed }) {
  return (
    <header className="fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[#d4af37]/10 bg-[#07070a]/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4 px-6 py-4">
        <Link to={homeTo} className="flex shrink-0 items-center gap-2.5">
          <img src={LOGO} alt="TradingBible logo" className="h-9 w-9 shrink-0 rounded-xl object-contain gold-glow sm:h-10 sm:w-10" />
          <span className="text-xl font-extrabold tracking-tight text-[#e9e7df] sm:text-2xl">Trading<span className="gold-text">Bible</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[#8a8577] md:flex">
          <a href="#features" className="hover:text-[#e9e7df]">Features</a>
          <a href="#ai" className="hover:text-[#e9e7df]">AI Coach</a>
          <Link to="/about" className="hover:text-[#e9e7df]">About</Link>
          <Link to="/pricing" className="hover:text-[#e9e7df]">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <Link to={homeTo} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
              <span>Open Dashboard</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden text-sm text-[#c9c4b4] hover:text-white sm:block">Log in</Link>
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">
                <span>Start Free Trial</span>
              </Link>
            </>
          )}
        </div>
      </div>
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-[#e9e7df]">
      <Nav homeTo={homeTo} isAuthed={isAuthed} />
      {/* Hero */}
      <section className="relative flex flex-col justify-center overflow-hidden pb-14 pt-[calc(10rem+var(--safe-top))] sm:pt-[calc(12rem+var(--safe-top))] lg:pt-[calc(14rem+var(--safe-top))] lg:min-h-[92dvh]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 grain opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07070a]/70 via-[#07070a]/45 to-[#07070a]" />
        <div className="pointer-events-none absolute -top-24 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-[#d4af37]/10 blur-[120px]" />
        <div className="relative mx-auto grid w-full max-w-[96rem] items-center gap-10 px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-xl">
            <h1 className="pt-2 text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[5rem]">Trade like the <span className="gold-text">1%.</span><br />Journal like a <span className="gold-text">fund.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#b8b3a3] sm:text-lg">An AI-powered trading journal built on a Bloomberg-grade terminal. Track every edge, kill every mistake, and let the coach compound your discipline.</p>
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-4">
              <Link to="/signup" className="btn-neon inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7ecb6] via-[#e2bd4f] to-[#c99a25] px-7 py-4 text-base font-bold text-[#0a0a0f]">Start 7-day Premium Trial <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/pricing" className="btn-glass inline-flex items-center justify-center rounded-xl border border-[#d4af37]/35 bg-white/[0.02] px-7 py-4 text-base font-semibold text-[#e9e7df]">View Pricing</Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#9a9587]">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-[#d4af37]" /> No card required</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-[#d4af37]" /> 8 broker integrations</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="animate-floaty lg:scale-[1.08] lg:origin-right">
            <div className="overflow-hidden rounded-2xl glass p-2 gold-glow">
              <img src={HERO} alt="TradingBible luxury trading terminal dashboard" className="w-full rounded-xl" />
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
      <section id="ai" className="border-y border-[#d4af37]/10 bg-gradient-to-b from-[#0a0a0f] to-[#07070a]">
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
