import React from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Eye, ArrowRight, LineChart, Bitcoin, Coins, Bot, GraduationCap,
  ShieldCheck, BarChart3, Activity, Globe, TrendingUp, DollarSign, Mail, Quote, Star,
} from 'lucide-react';
import Footer from '@/components/Footer';

const LOGO = 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/f18f53c1fa5ec4181c7033589080fd00.png';
const MALIBA_LOGO = 'https://horizons-cdn.hostinger.com/31a01204-0f8d-4aa3-a78b-78fb8b946e53/5c8275966b855914cc3eec21e6f6ed03.png';

const PROVIDES = [
  { icon: BarChart3, title: 'Institutional Market Analysis', body: 'Professional-grade analysis and metrics once reserved for hedge funds and prop desks.' },
  { icon: Activity, title: 'Live Financial Market Data', body: 'Real-time pricing and 24h moves across major markets, updated continuously.' },
  { icon: Coins, title: 'Gold & Bitcoin Analysis', body: 'Dedicated coverage of gold and Bitcoin — the assets that define modern macro.' },
  { icon: Bitcoin, title: 'Forex & Crypto Insights', body: 'Structured intelligence across currency pairs and digital assets.' },
  { icon: LineChart, title: 'Trading Signals', body: 'Data-driven signals to complement your own research and strategy.' },
  { icon: Bot, title: 'AI-Powered Intelligence', body: 'An AI coach that reviews trades, grades discipline and prescribes fixes.' },
  { icon: Activity, title: 'Professional Charting', body: 'Clean, terminal-grade charts and performance visualizations.' },
  { icon: ShieldCheck, title: 'Risk Management', body: 'Position sizing, risk/reward and portfolio-heat tooling built in.' },
  { icon: GraduationCap, title: 'Trading Education', body: 'Structured learning paths, courses and live webinars for every level.' },
  { icon: BarChart3, title: 'Portfolio Monitoring', body: 'Track equity, drawdown and returns across every connected account.' },
];

const MARKETS = [
  { icon: Coins, name: 'Gold', pair: 'XAU/USD' },
  { icon: Bitcoin, name: 'Bitcoin', pair: 'BTC/USD' },
  { icon: DollarSign, name: 'Forex', pair: 'Major & minor pairs' },
  { icon: Activity, name: 'Crypto', pair: 'Digital assets' },
  { icon: TrendingUp, name: 'Commodities', pair: 'Metals, energy, ags' },
  { icon: BarChart3, name: 'Indices', pair: 'Global stock indices' },
];

const TEAM = [
  { name: 'Amadou Traoré', role: 'Founder & Chief Executive', img: 'https://images.hostinger.com/28aec44f-c6fe-4e36-9474-4a343f6c1dc7.png' },
  { name: 'Ingrid Halvorsen', role: 'Chief Technology Officer', img: 'https://images.hostinger.com/2fed56c3-111a-4df6-8cb7-f247588320d1.png' },
  { name: 'Rohan Mehta', role: 'Head of Quantitative Research', img: 'https://images.hostinger.com/280ec8c0-c966-44a7-beb3-afddf4f5f198.png' },
];

const TESTIMONIALS = [
  { quote: 'TradingBible turned my scattered notes into a real edge. The AI coach flags mistakes I never noticed myself making.', name: 'Sofia R.', role: 'Full-time forex trader' },
  { quote: 'The broker sync and analytics feel genuinely institutional. It is the first journal that keeps up with my volume.', name: 'Daniel K.', role: 'Crypto swing trader' },
  { quote: 'Discipline scoring changed how I trade. Fewer revenge trades, tighter risk, calmer sessions.', name: 'Aisha B.', role: 'Prop firm trader' },
];

function Header() {
  return (
    <header className="fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[#d4af37]/10 bg-[#07070a]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[96rem] items-center justify-between px-6 py-4">
        <nav className="hidden items-center gap-8 text-sm text-[#8a8577] md:flex">
          <Link to="/" className="hover:text-[#e9e7df]">Home</Link>
          <Link to="/about" className="text-[#e9e7df]">About</Link>
          <Link to="/pricing" className="hover:text-[#e9e7df]">Pricing</Link>
        </nav>
        <Link to="/signup" className="rounded-lg bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">Start Free Trial</Link>
      </div>
    </header>
  );
}

function ContactForm() {
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const inp = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';
  if (sent) {
    return (
      <div className="grid place-items-center rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] p-8 text-center">
        <ShieldCheck className="mb-3 h-8 w-8 text-emerald-400" />
        <p className="text-sm text-[#c9c4b4]">Thanks — your message has been sent. We&apos;ll be in touch soon.</p>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3">
      <input required className={inp} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" className={inp} placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <textarea required rows={4} className={inp} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button className="w-full rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] py-2.5 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90">Send message</button>
    </form>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#07070a] pt-[var(--header-h)] text-[#e9e7df]">
      <Header />

      {/* Hero */}
      <section className="relative mx-auto max-w-[96rem] px-6 pt-28 pb-16 text-center sm:pt-32">
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative">
          <img src={LOGO} alt="TradingBible" className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain gold-glow" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#d4af37]"><Globe className="h-3.5 w-3.5" /> Global FinTech Platform</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold sm:text-5xl">About <span className="gold-text">TradingBible</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#8a8577] sm:text-lg">
            TradingBible is a global financial technology (FinTech) platform that delivers institutional-grade market intelligence, advanced trading tools, real-time market analysis, educational resources, and AI-powered insights.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto grid max-w-[96rem] gap-5 px-6 pb-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-7">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Target className="h-6 w-6" /></div>
          <h2 className="text-xl font-semibold text-[#f0ecdd]">Our Mission</h2>
          <p className="mt-3 leading-relaxed text-[#8a8577]">To empower individuals with transparent, data-driven market intelligence, innovative technology, and world-class educational resources that support smarter financial decision-making.</p>
        </div>
        <div className="glass rounded-2xl p-7">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Eye className="h-6 w-6" /></div>
          <h2 className="text-xl font-semibold text-[#f0ecdd]">Our Vision</h2>
          <p className="mt-3 leading-relaxed text-[#8a8577]">To become one of the world's leading financial technology platforms by making professional trading intelligence accessible to every trader and investor.</p>
        </div>
      </section>

      {/* Ownership */}
      <section className="mx-auto max-w-[96rem] px-6 py-6">
        <div className="glass flex flex-col items-start gap-5 rounded-2xl p-7 sm:flex-row sm:items-center">
          <img src={MALIBA_LOGO} alt="TradingBible LLC" className="h-16 w-16 shrink-0 rounded-2xl object-contain" />
          <div>
            <h2 className="text-xl font-semibold text-[#f0ecdd]">Ownership</h2>
            <p className="mt-2 leading-relaxed text-[#8a8577]">TradingBible is owned and operated by <span className="text-[#d4af37]">TradingBible LLC</span>, a Delaware limited liability company.</p>
          </div>
        </div>
      </section>

      {/* What we provide */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">What we <span className="gold-text">provide</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">Everything a serious trader needs — from live data to AI-driven discipline — in one terminal.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDES.map((p) => (
            <div key={p.title} className="glass glass-hover rounded-2xl p-5">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><p.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold text-[#f0ecdd]">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#8a8577]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Markets covered */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Markets we <span className="gold-text">cover</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">From safe-haven metals to digital assets — the full macro spectrum in one terminal.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {MARKETS.map((m) => (
            <div key={m.name} className="glass glass-hover rounded-2xl p-5 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><m.icon className="h-5 w-5" /></div>
              <div className="font-semibold text-[#f0ecdd]">{m.name}</div>
              <div className="mt-1 text-xs text-[#8a8577]">{m.pair}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">The <span className="gold-text">team</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">Operators, engineers and quants from global markets and technology.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {TEAM.map((t) => (
            <div key={t.name} className="glass glass-hover overflow-hidden rounded-2xl">
              <img src={t.img} alt={t.name} className="h-56 w-full object-cover object-top" />
              <div className="p-5">
                <div className="font-semibold text-[#f0ecdd]">{t.name}</div>
                <div className="mt-1 text-sm text-[#d4af37]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Trusted by <span className="gold-text">traders</span></h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-6">
              <Quote className="h-6 w-6 text-[#d4af37]" />
              <p className="mt-3 leading-relaxed text-[#c9c4b4]">{t.quote}</p>
              <div className="mt-4 flex items-center gap-1 text-[#d4af37]">{[0,1,2,3,4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</div>
              <div className="mt-3"><div className="font-semibold text-[#f0ecdd]">{t.name}</div><div className="text-xs text-[#8a8577]">{t.role}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Us */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="glass grid gap-6 rounded-2xl p-8 lg:grid-cols-2 lg:p-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Contact <span className="gold-text">us</span></h2>
            <p className="mt-3 leading-relaxed text-[#8a8577]">Questions about the platform, verification or partnerships? Our team responds within one business day.</p>
            <a href="mailto:support@tradingbible.app" className="mt-5 inline-flex items-center gap-2 text-[#d4af37] hover:underline"><Mail className="h-4 w-4" /> support@tradingbible.app</a>
            <p className="mt-4 text-xs leading-relaxed text-[#6a665a]">TradingBible LLC — Delaware limited liability company.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[96rem] px-6 pb-20">
        <div className="glass gold-glow flex flex-col items-center rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Trade like the 1%. <span className="gold-text">Journal like a fund.</span></h2>
          <p className="mt-3 max-w-xl text-[#8a8577]">Join thousands of traders using TradingBible to sharpen their edge with institutional-grade tools and AI coaching.</p>
          <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-6 py-3.5 font-semibold text-[#0a0a0f] transition hover:opacity-90">Start your 7-day trial <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
