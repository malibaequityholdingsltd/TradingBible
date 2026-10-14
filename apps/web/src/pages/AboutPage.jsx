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
  { name: 'Malik Nlem', key: 'abt.role1', img: '/images/malik-nlem-full.png', ratio: 'aspect-[3/4]' },
  { name: 'Victor Okechukwu', key: 'abt.role2', img: '/images/victor-okechukwu-full.png', ratio: 'aspect-[3/4]' },
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
      <section className="relative mx-auto max-w-[96rem] overflow-hidden px-6 pb-16 pt-28 text-center sm:pt-36">
        <div className="absolute inset-0 grain opacity-30" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[24rem] w-[52rem] max-w-none -translate-x-1/2 rounded-full bg-[#d4af37]/[0.08] blur-[130px]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(212,175,55,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_30%,black,transparent)]" />
        <div className="relative">
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="mx-auto mb-7 h-[4.5rem] w-[4.5rem] rounded-2xl object-contain gold-glow ring-1 ring-[#d4af37]/25" />
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#0a0a0f]/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e8c95a] shadow-[0_8px_28px_-12px_rgba(212,175,55,0.5)] backdrop-blur-md"><Globe className="h-3.5 w-3.5" /> {t('abt.heroKick')}</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-[-0.03em] sm:text-6xl sm:leading-[1.02]">{t('abt.aboutTitle')} <span className="tb-gold-text drop-shadow-[0_2px_24px_rgba(212,175,55,0.35)]">TradingBible</span></h1>
          <div aria-hidden className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#a8a394] sm:text-lg sm:leading-relaxed">
            {t('abt.heroSub')}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto grid max-w-[96rem] grid-cols-1 gap-4 px-6 pb-6 sm:gap-5 lg:grid-cols-2">
        <Card className="group relative overflow-hidden rounded-2xl p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#f4e6a8]/70 via-[#d4af37]/60 to-transparent" />
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-[#d4af37]/20 bg-gradient-to-b from-[#d4af37]/20 to-[#d4af37]/[0.06] text-[#e8c95a] shadow-[0_8px_20px_-8px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]"><Target className="h-6 w-6" /></div>
          <h2 className="text-xl font-bold tracking-tight text-[#f0ecdd]">{t('abt.mission')}</h2>
          <p className="mt-3 leading-relaxed text-[#a8a394]">{t('abt.missionB')}</p>
        </Card>
        <Card className="group relative overflow-hidden rounded-2xl p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#f4e6a8]/70" />
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-[#d4af37]/20 bg-gradient-to-b from-[#d4af37]/20 to-[#d4af37]/[0.06] text-[#e8c95a] shadow-[0_8px_20px_-8px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]"><Eye className="h-6 w-6" /></div>
          <h2 className="text-xl font-bold tracking-tight text-[#f0ecdd]">{t('abt.vision')}</h2>
          <p className="mt-3 leading-relaxed text-[#a8a394]">{t('abt.visionB')}</p>
        </Card>
      </section>

      {/* Ownership */}
      <section className="mx-auto max-w-[96rem] px-6 py-6">
        <Card className="relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:flex-row sm:items-center sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#f4e6a8] via-[#d4af37] to-transparent" />
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-16 w-16 shrink-0 rounded-2xl object-contain ring-1 ring-[#d4af37]/25" />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#f0ecdd]">{t('abt.ownership')}</h2>
          <p className="mt-2 leading-relaxed text-[#a8a394]">{t('abt.ownershipB')}</p>
          </div>
        </Card>
      </section>

      {/* What we provide */}
      <section className="relative mx-auto max-w-[96rem] px-6 py-10">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(70rem,90%)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">{t('abt.provideA')} <span className="tb-gold-text">{t('abt.provideB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[#a8a394]">{t('abt.provideSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDES.map((p) => (
            <Card hover key={p.tk} className="group relative overflow-hidden rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/30 hover:shadow-[0_24px_60px_-28px_rgba(212,175,55,0.35)]">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-[#d4af37]/20 bg-gradient-to-b from-[#d4af37]/20 to-[#d4af37]/[0.06] text-[#e8c95a]"><p.icon className="h-5 w-5" /></div>
              <h3 className="font-semibold tracking-tight text-[#f0ecdd]">{t(p.tk)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#8a8577]">{t(p.bk)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Markets covered */}
      <section className="relative mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">{t('abt.marketsA')} <span className="tb-gold-text">{t('abt.marketsB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[#a8a394]">{t('abt.marketsSub')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {MARKETS.map((m) => (
            <Card hover key={m.key} className="group relative overflow-hidden rounded-2xl p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/30">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-[#d4af37]/20 bg-gradient-to-b from-[#d4af37]/20 to-[#d4af37]/[0.06] text-[#e8c95a]"><m.icon className="h-5 w-5" /></div>
              <div className="font-semibold tracking-tight text-[#f0ecdd]">{t(m.key)}</div>
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-[#8a8577]">{m.pair}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="relative mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">{t('abt.team')} <span className="tb-gold-text">{t('abt.teamB')}</span></h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[#a8a394]">{t('abt.teamSub')}</p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {TEAM.map((m) => (
            <Card hover key={m.name} className="group relative overflow-hidden rounded-2xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/30 hover:shadow-[0_24px_60px_-28px_rgba(212,175,55,0.35)]">
              <div className={`grid ${m.ratio || 'aspect-[3/4]'} w-full place-items-center overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#d4af37]/[0.1] via-[#0c0c11] to-[#0c0c11]`}>
                {m.img ? (
                  <img src={m.img} alt={m.name} className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-[#d4af37]/30 bg-[#0f0f14] text-2xl font-bold text-[#d4af37]">{m.name.split(' ').map((n) => n[0]).join('')}</div>
                )}
              </div>
              <div className="px-2 pb-2 pt-4 text-center">
                <div className="font-semibold tracking-tight text-[#f0ecdd]">{m.name}</div>
                <div className="mt-1 text-[13px] font-medium text-[#e8c95a]">{t(m.key)}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative mx-auto max-w-[96rem] px-6 py-10">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">{t('abt.trusted')} <span className="tb-gold-text">{t('abt.traders')}</span></h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name} hover className="group relative overflow-hidden rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d4af37]/25">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
              <Quote className="h-6 w-6 text-[#d4af37]/70" />
              <p className="mt-3 text-[0.95rem] leading-relaxed text-[#c9c4b4]">{t(tm.qk, null, tm.quote)}</p>
              <div className="mt-4 flex items-center gap-1 text-[#e8c95a]">{[0,1,2,3,4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</div>
              <div className="mt-3 border-t border-white/[0.06] pt-4"><div className="font-semibold tracking-tight text-[#f0ecdd]">{tm.name}</div><div className="mt-0.5 text-xs text-[#8a8577]">{t(tm.rk, null, tm.role)}</div></div>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Us */}
      <section className="mx-auto max-w-[96rem] px-6 py-10">
        <Card className="relative grid grid-cols-1 gap-8 overflow-hidden rounded-2xl p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-10 lg:grid-cols-2 lg:gap-12">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">{t('abt.contact')} <span className="tb-gold-text">{t('abt.contactB')}</span></h2>
            <p className="mt-3 leading-relaxed text-[#a8a394]">{t('abt.contactSub')}</p>
            <a href="mailto:support@tradingbible.app" className="mt-6 inline-flex items-center gap-2.5 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-4 py-2.5 text-sm font-medium text-[#e8c95a] transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/[0.1]"><Mail className="h-4 w-4" /> support@tradingbible.app</a>
            <p className="mt-5 text-xs leading-relaxed text-[#6a665a]">TradingBible LLC — Delaware limited liability company · Formed August 2026 · NAICS 511210 · c/o Delaware Registered Agent, Inc.<br />Proposed Holdings Inc. + requested ticker TB are not yet formed/listed/reserved. TBC is not equity and incorporation is not a brokerage license.</p>
          </div>
          <ContactForm />
        </Card>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-[96rem] px-6 pb-20">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[16rem] w-[44rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/[0.07] blur-[100px]" />
        <Card className="gold-glow relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-12 text-center sm:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#e8c95a] to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_0%,rgba(212,175,55,0.1),transparent)]" />
          <h2 className="relative text-balance text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">{t('abt.tagA')} <span className="tb-gold-text">{t('abt.tagB')}</span></h2>
          <p className="relative mt-3 max-w-xl leading-relaxed text-[#a8a394]">{t('abt.ctaSub')}</p>
          <GoldButton to="/pricing" className="relative mt-7 px-8 py-4 shadow-[0_16px_48px_-12px_rgba(212,175,55,0.65)]">{t('land.choosePlan', null, 'Choose your plan')} <ArrowRight className="h-4 w-4" /></GoldButton>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
