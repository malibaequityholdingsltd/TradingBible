import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, Bitcoin, Bot, Coins, DollarSign, Eye,
  Globe, GraduationCap, LineChart, Mail, Quote, ShieldCheck, Star, Target,
  TrendingUp,
} from 'lucide-react';
import { Card, GoldButton } from '@/components/ui-kit';
import PublicSiteShell, {
  PublicCTA, PublicCheckList, PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';
import { IosIcon } from '@/components/IosIcon';
import { useI18n } from '@/lib/i18n';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

const PROVIDES = [
  { icon: BarChart3, title: 'Trading journal', body: 'A live record of every fill, note and decision, synced from the broker instead of rebuilt by hand.', to: '/features/trading-journal' },
  { icon: Bot, title: 'SI Coach', body: 'A review grounded in your own history: the repeated mistake, the risk leak and one adjustment for the next session.', to: '/features/si-coach' },
  { icon: LineChart, title: 'Terminal & market data', body: 'Charts, order flow, heatmaps and TradingBible TV across five markets and 250+ symbols.', to: '/features/market-data' },
  { icon: ShieldCheck, title: 'Risk tools', body: 'Position sizing, R-multiples, exposure context and alerts built into the workflow before the order.', to: '/features/risk-management' },
  { icon: GraduationCap, title: 'Academy', body: 'Structured lessons on charts, risk, journaling and process — education, never signals or profit claims.', to: '/academy' },
  { icon: Activity, title: 'Analytics & reports', body: 'Equity, drawdown, profit factor, expectancy and Trader Score, with exportable reports for a mentor or prop firm.', to: '/features/performance-analytics' },
];

const MARKETS = [
  { icon: Coins, label: 'Metals', pair: 'XAU/USD · XAG/USD' },
  { icon: Bitcoin, label: 'Crypto', pair: 'BTC/USD · major pairs' },
  { icon: DollarSign, label: 'Forex', pair: 'Major & minor pairs' },
  { icon: Activity, label: 'Digital assets', pair: 'Spot & on-chain balances' },
  { icon: TrendingUp, label: 'Commodities', pair: 'Metals, energy, agriculture' },
  { icon: BarChart3, label: 'Indices', pair: 'Global stock indices' },
];

const TEAM = [
  { name: 'Malik Nlem', role: 'Founder & CEO', img: '/images/malik-nlem-full.png' },
  { name: 'Victor Okechukwu', role: 'Product & engineering', img: '/images/victor-okechukwu-full.png' },
  { name: 'Maliba SI', role: 'SI review & education' },
];

const TESTIMONIALS = [
  { quote: 'TradingBible turned my scattered notes into a real process. The SI review flags mistakes I never noticed myself making.', name: 'Sofia R.', role: 'Full-time forex trader' },
  { quote: 'The broker sync and analytics feel genuinely institutional. It is the first journal that keeps up with my volume.', name: 'Daniel K.', role: 'Crypto swing trader' },
  { quote: 'Discipline scoring changed how I review. Fewer revenge trades, tighter risk, calmer sessions.', name: 'Aisha B.', role: 'Prop firm trader' },
];

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow={t('abt.heroKick', null, 'Company · About TradingBible')}
        title={<>A record-first <span className="tb-gold-text">trading company.</span></>}
        description="TradingBible is a private, pre-IPO company building a platform where the trade, the decision and the review live in one record. We are not a broker, an adviser or a signal service — and we do not pretend otherwise."
        meta={['Private company', 'Pre-IPO', 'TB proposed ticker']}
        actions={<><GoldButton to="/features">Explore the platform <ArrowRight className="h-4 w-4" /></GoldButton><GhostLink /></>}
      />

      <PublicSection id="mission" eyebrow="Mission & vision" title="Make the review as real as the trade.">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <IosIcon icon={Target} size="md" tone="blue" />
              <h2 className="text-lg font-bold tracking-tight text-[#f0ecdd]">{t('abt.mission', null, 'Our mission')}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#8a8577]">{t('abt.missionB', null, 'Give every serious trader the record, context and review that used to be available only to a professional desk — without inventing performance, hiding risk or selling a shortcut.')}</p>
          </Card>
          <Card className="rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <IosIcon icon={Eye} size="md" tone="purple" />
              <h2 className="text-lg font-bold tracking-tight text-[#f0ecdd]">{t('abt.vision', null, 'Our vision')}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#8a8577]">{t('abt.visionB', null, 'A trading culture where evidence beats a screenshot. The platform should make the honest record easier to keep, easier to review and harder to fake.')}</p>
          </Card>
        </div>
      </PublicSection>

      <PublicSection eyebrow="Ownership & company facts" title="What TradingBible is — and is not.">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <Card className="rounded-xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-14 w-14 shrink-0 rounded-xl object-contain ring-1 ring-[#d4af37]/25" />
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#f0ecdd]">{t('abt.ownership', null, 'Owned and operated by TradingBible LLC')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">TradingBible LLC is a Delaware limited liability company and the sole operating company behind the platform. The company is private and not publicly traded. TB is a proposed future ticker; it is not reserved, listed or approved. TBC is a separate proposed token, not equity, and token operations remain disabled.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {['Delaware LLC', 'Private · pre-IPO', 'TB proposed ticker', 'TBC separate from equity', 'No public share price', 'No listing approval'].map((item) => (
                <div key={item} className="rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/[0.04] px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#d4af37]">{item}</div>
              ))}
            </div>
          </Card>
          <div className="space-y-3">
            <PublicNotice><span className="font-semibold text-[#e9e7df]">TB equity and TBC are separate.</span> They have separate supply, ownership, valuation and history. Holding one does not imply the other.</PublicNotice>
            <PublicCheckList items={['Not a broker-dealer or investment adviser', 'Broker connections are read-only by default', 'Public financial content is published only after approval', 'Shareholder records stay identity-verified and read-only']} columns={1} />
          </div>
        </div>
      </PublicSection>

      <PublicSection id="features" eyebrow="The platform" title="Six surfaces, one record.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDES.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} to={item.to} className="group">
                <Card className="h-full rounded-xl p-5 transition group-hover:border-[#d4af37]/30">
                  <IosIcon icon={Icon} size="md" seed={item.title} />
                  <h2 className="mt-3 text-base font-semibold text-[#f0ecdd]">{item.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#8a8577]">{item.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37]">Explore <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span>
                </Card>
              </Link>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Markets" title="Six market groups. One journal.">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {MARKETS.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="rounded-xl p-4 text-center">
                <IosIcon icon={Icon} size="md" seed={m.label} className="mx-auto" />
                <div className="mt-2 text-xs font-semibold text-[#f0ecdd]">{m.label}</div>
                <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8a8577]">{m.pair}</div>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection id="team" eyebrow="The team" title="Small team. Direct accountability.">
        <div className="grid gap-3 sm:grid-cols-3">
          {TEAM.map((member) => (
            <Card key={member.name} className="overflow-hidden rounded-xl p-3">
              <div className="grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-lg border border-white/[0.06] bg-gradient-to-b from-[#d4af37]/10 via-[#0c0c11] to-[#0c0c11]">
                {member.img ? (
                  <img src={member.img} alt={member.name} className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full border border-[#d4af37]/30 bg-[#0f0f14] text-2xl font-bold text-[#d4af37]">{member.name.split(' ').map((n) => n[0]).join('')}</div>
                )}
              </div>
              <div className="px-2 pb-2 pt-3">
                <div className="text-sm font-semibold text-[#f0ecdd]">{member.name}</div>
                <div className="mt-1 text-[11px] font-medium text-[#d4af37]">{member.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="In their words" title="What the record changed.">
        <div className="grid gap-3 lg:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <Card key={tm.name} className="rounded-xl p-5">
              <Quote className="h-5 w-5 text-[#d4af37]/70" />
              <p className="mt-2 text-sm leading-relaxed text-[#c9c4b4]">{tm.quote}</p>
              <div className="mt-3 flex items-center gap-1 text-[#e8c95a]">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}</div>
              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <div className="text-sm font-semibold text-[#f0ecdd]">{tm.name}</div>
                <div className="mt-0.5 text-[11px] text-[#8a8577]">{tm.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection eyebrow="Contact" title="The right route to the right team.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [Mail, 'Support', 'Product, billing and account questions.', 'support@tradingbible.app', 'mailto:support@tradingbible.app'],
            [Globe, 'Investor relations', 'The TB record, shareholder verification and company disclosures.', 'investors@tradingbible.app', '/investors/contact'],
            [ShieldCheck, 'Security', 'Responsible disclosure and account compromise.', 'security@tradingbible.app', '/security'],
          ].map(([Icon, title, body, address, to]) => (
            <Card key={title} className="rounded-xl p-5">
              <div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-[#d4af37]" /><h2 className="text-base font-semibold text-[#f0ecdd]">{title}</h2></div>
              <p className="mt-2 text-xs leading-relaxed text-[#8a8577]">{body}</p>
              {to.startsWith('/') ? <Link to={to} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">{address} <ArrowRight className="h-3 w-3" /></Link> : <a href={to} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37] hover:underline">{address} <ArrowRight className="h-3 w-3" /></a>}
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicCTA title={<>See the platform <span className="tb-gold-text">behind the company.</span></>} body="Start with the product pages, then choose a paid plan when you are ready to connect a live account." primary="Explore features" primaryTo="/features" secondary="Compare plans" secondaryTo="/pricing" />
    </PublicSiteShell>
  );
}

function GhostLink() {
  return <Link to="/investors" className="inline-flex items-center justify-center rounded-xl border border-[#d4af37]/20 px-5 py-3 text-sm font-semibold text-[#e9e7df] transition hover:border-[#d4af37]/40">Investor centre</Link>;
}
