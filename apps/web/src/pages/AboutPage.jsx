import React from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Eye, ArrowRight, LineChart, Bitcoin, Coins, Bot, GraduationCap,
  ShieldCheck, BarChart3, Activity, Globe, TrendingUp, DollarSign, Mail, Quote, Star,
} from 'lucide-react';
import Footer from '@/components/Footer';
import { Card, EmptyState, GoldButton } from '@/components/ui-kit';
import { useI18n } from '@/lib/i18n';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

const PROVIDES = [
  { icon: BarChart3, tk: 'abt.p1t', bk: 'abt.p1b' },
  { icon: Activity, tk: 'abt.p2t', bk: 'abt.p2b' },
  { icon: Coins, tk: 'abt.p3t', bk: 'abt.p3b' },
  { icon: Bitcoin, tk: 'abt.p4t', bk: 'abt.p4b' },
  { icon: LineChart, tk: 'abt.p5t', bk: 'abt.p5b' },
  { icon: Bot, tk: 'abt.p6t', bk: 'abt.p6b' },
  { icon: Activity, tk: 'abt.p7t', bk: 'abt.p7b' },
  { icon: ShieldCheck, tk: 'abt.p8t', bk: 'abt.p8b' },
  { icon: GraduationCap, tk: 'abt.p9t', bk: 'abt.p9b' },
  { icon: BarChart3, tk: 'abt.p10t', bk: 'abt.p10b' },
];

const MARKETS = [
  { icon: Coins, key: 'abt.mkGold', pair: 'XAU/USD' },
  { icon: Bitcoin, key: 'abt.mkBtc', pair: 'BTC/USD' },
  { icon: DollarSign, key: 'abt.mkFx', pair: 'Major & minor pairs' },
  { icon: Activity, key: 'abt.mkCrypto', pair: 'Digital assets' },
  { icon: TrendingUp, key: 'abt.mkCmd', pair: 'Metals, energy, ags' },
  { icon: BarChart3, key: 'abt.mkIdx', pair: 'Global stock indices' },
];

const TEAM = [
  { name: 'Malik Nlem', key: 'abt.role1' },
  { name: 'Victor Okechukwu', key: 'abt.role2' },
  { name: 'Maliba SI', key: 'abt.role3' },
];

const TESTIMONIALS = [
  { quote: 'TradingBible turned my scattered notes into a real edge. The SI coach flags mistakes I never noticed myself making.', qk: 'abt.tm1q', name: 'Sofia R.', role: 'Full-time forex trader', rk: 'abt.tm1r' },
  { quote: 'The broker sync and analytics feel genuinely institutional. It is the first journal that keeps up with my volume.', qk: 'abt.tm2q', name: 'Daniel K.', role: 'Crypto swing trader', rk: 'abt.tm2r' },
  { quote: 'Discipline scoring changed how I trade. Fewer revenge trades, tighter risk, calmer sessions.', qk: 'abt.tm3q', name: 'Aisha B.', role: 'Prop firm trader', rk: 'abt.tm3r' },
];

function Header() {
  const { t } = useI18n();
  return (
    <header className="fixed inset-x-0 top-[var(--header-h)] z-40 border-b border-[#d4af37]/10 bg-[#07070a]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[96rem] items-center justify-between px-6 py-4">
        <nav className="hidden items-center gap-8 text-sm text-[#8a8577] md:flex">
          <Link to="/" className="hover:text-[#e9e7df]">{t('abt.home')}</Link>
          <Link to="/about" className="text-[#e9e7df]">{t('abt.about')}</Link>
          <Link to="/pricing" className="hover:text-[#e9e7df]">{t('abt.pricing')}</Link>
        </nav>
        <GoldButton to="/pricing">{t('land.viewPricing')}</GoldButton>
      </div>
    </header>
  );
}

function ContactForm() {
  const { t } = useI18n();
  const [sent, setSent] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const inp = 'w-full rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50';
  if (sent) {
    return (
      <EmptyState icon={ShieldCheck} title={t('abt.msgSent')} />
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3">
      <input required className={inp} placeholder={t('abt.yourName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required type="email" className={inp} placeholder={t('abt.emailAddr')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <textarea required rows={4} className={inp} placeholder={t('abt.howHelp')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <GoldButton className="w-full">{t('abt.sendMsg')}</GoldButton>
    </form>
  );
}

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[#07070a] pt-[var(--header-h)] text-[#e9e7df]">
      <Header />

      {/* Hero */}
      <section className="relative mx-auto max-w-[96rem] px-6 pt-28 pb-16 text-center sm:pt-32">
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain gold-glow" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#d4af37]"><Globe className="h-3.5 w-3.5" /> {t('abt.heroKick')}</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold sm:text-5xl">{t('abt.aboutTitle')} <span className="tb-gold-text">TradingBible</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#8a8577] sm:text-lg">
            {t('abt.heroSub')}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto grid max-w-[96rem] grid-cols-1 gap-4 px-6 pb-6 sm:gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Target className="h-6 w-6" /></div>
          <h2 className="text-xl font-semibold text-[#f0ecdd]">{t('abt.mission')}</h2>
          <p className="mt-3 leading-relaxed text-[#8a8577]">{t('abt.missionB')}</p>
        </Card>
        <Card>
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Eye className="h-6 w-6" /></div>
          <h2 className="text-xl font-semibold text-[#f0ecdd]">{t('abt.vision')}</h2>
          <p className="mt-3 leading-relaxed text-[#8a8577]">{t('abt.visionB')}</p>
        </Card>
      </section>

      {/* Ownership */}
      <section className="mx-auto max-w-[96rem] px-6 py-6">
        <Card className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-16 w-16 shrink-0 rounded-2xl object-contain" />
          <div>
            <h2 className="text-xl font-semibold text-[#f0ecdd]">{t('abt.ownership')}</h2>
          <p className="mt-2 leading-relaxed text-[#8a8577]">{t('abt.ownershipB')}</p>
          </div>
        </Card>
      </section>

      {/* What we provide */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t('abt.provideA')} <span className="tb-gold-text">{t('abt.provideB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">{t('abt.provideSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDES.map((p) => (
            <Card hover key={p.tk}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><p.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold text-[#f0ecdd]">{t(p.tk)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#8a8577]">{t(p.bk)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Markets covered */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t('abt.marketsA')} <span className="tb-gold-text">{t('abt.marketsB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">{t('abt.marketsSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {MARKETS.map((m) => (
            <Card hover key={m.key} className="text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><m.icon className="h-5 w-5" /></div>
              <div className="font-semibold text-[#f0ecdd]">{t(m.key)}</div>
              <div className="mt-1 text-xs text-[#8a8577]">{m.pair}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t('abt.team')} <span className="tb-gold-text">{t('abt.teamB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#8a8577]">{t('abt.teamSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {TEAM.map((m) => (
            <Card hover key={m.name} className="overflow-hidden">
              <div className="grid h-56 w-full place-items-center rounded-xl bg-[#d4af37]/8">
                <div className="grid h-20 w-20 place-items-center rounded-full border border-[#d4af37]/30 bg-[#0f0f14] text-2xl font-bold text-[#d4af37]">{m.name.split(' ').map((n) => n[0]).join('')}</div>
              </div>
              <div className="p-5">
                <div className="font-semibold text-[#f0ecdd]">{m.name}</div>
                <div className="mt-1 text-sm text-[#d4af37]">{t(m.key)}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{t('abt.trusted')} <span className="tb-gold-text">{t('abt.traders')}</span></h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name}>
              <Quote className="h-6 w-6 text-[#d4af37]" />
              <p className="mt-3 leading-relaxed text-[#c9c4b4]">{t(tm.qk, null, tm.quote)}</p>
              <div className="mt-4 flex items-center gap-1 text-[#d4af37]">{[0,1,2,3,4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</div>
              <div className="mt-3"><div className="font-semibold text-[#f0ecdd]">{tm.name}</div><div className="text-xs text-[#8a8577]">{t(tm.rk, null, tm.role)}</div></div>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Us */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <Card className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t('abt.contact')} <span className="tb-gold-text">{t('abt.contactB')}</span></h2>
            <p className="mt-3 leading-relaxed text-[#8a8577]">{t('abt.contactSub')}</p>
            <a href="mailto:support@tradingbible.app" className="mt-5 inline-flex items-center gap-2 text-[#d4af37] hover:underline"><Mail className="h-4 w-4" /> support@tradingbible.app</a>
            <p className="mt-4 text-xs leading-relaxed text-[#6a665a]">TradingBible LLC — Delaware limited liability company · Formed August 2026 · NAICS 511210 · c/o Delaware Registered Agent, Inc.</p>
          </div>
          <ContactForm />
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[96rem] px-6 pb-20">
        <Card className="gold-glow flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('abt.tagA')} <span className="tb-gold-text">{t('abt.tagB')}</span></h2>
          <p className="mt-3 max-w-xl text-[#8a8577]">{t('abt.ctaSub')}</p>
          <GoldButton to="/pricing" className="mt-6">{t('land.choosePlan', null, 'Choose your plan')} <ArrowRight className="h-4 w-4" /></GoldButton>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
