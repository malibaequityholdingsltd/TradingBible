import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, Bell, BookOpen, Bot, Calculator, Check,
  Code2, Compass, Database, Gauge, Globe2, GraduationCap, HeartHandshake,
  KeyRound, Layers, LineChart, MessageSquare, PieChart, Plug, Radar,
  Search, ShieldCheck, Sparkles, Target, Trophy, Users, Wallet, Zap,
} from 'lucide-react';
import PublicSiteShell, {
  PublicCTA, PublicCheckList, PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton, Kicker } from '@/components/ui-kit';
import { IosIcon } from '@/components/IosIcon';

const FEATURES = {
  'trading-journal': {
    label: 'Trading Journal', eyebrow: 'Product · Journal', title: 'A journal that syncs itself.',
    summary: 'Connect a live broker or prop firm once. Every fill, balance, note and decision lands in one record — with analytics, reports and a calendar built around it.',
    stats: [['20+', 'broker and prop connections'], ['5', 'markets in one record'], ['0', 'trades typed by hand']],
    sections: [
      ['The record writes itself', 'TradingBible imports live trades automatically through read-oriented API keys or OAuth. You do not rebuild your history in a spreadsheet, and demo accounts are never mixed into the record.'],
      ['Notes stay attached to the decision', 'Tag the setup, write the thesis, mark the mistake and keep the screenshot with the trade. The journal is the source SI reads when it reviews your execution.'],
    ],
    points: ['Live accounts only — no demo P&L', 'Broker sync through read-only credentials', 'Tags, notes, screenshots and session context', 'Calendar, filters, exports and SI-ready history'],
    cta: ['Open the journal', '/app/journal'],
  },
  'si-coach': {
    label: 'SI Coach', eyebrow: 'Product · SI Coach', title: 'A coach with your actual history.',
    summary: 'SI reviews the trades your account has synced, finds the repeated mistake and turns it into one adjustment for the next session. It is context, not a signal.',
    stats: [['24/7', 'available beside the desk'], ['3', 'layers: context, decision, action'], ['1', 'focus for the next session']],
    sections: [
      ['Evidence before advice', 'Ask what your biggest mistake is, where risk widened or which setup actually works. SI answers from your journal, your positions and your notes — not a generic model portfolio.'],
      ['The review is the product', 'Quality, risk and discipline are reviewed together. The output is a concrete next action, with the evidence kept in the record so you can see whether you followed through.'],
    ],
    points: ['Questions grounded in your synced history', 'Mistake detection across sessions', 'Daily and weekly SI reports on Elite', 'No invented prices, scores or trades'],
    cta: ['Meet your SI coach', '/pricing'],
  },
  dashboard: {
    label: 'Dashboard', eyebrow: 'Product · Dashboard', title: 'The first screen of your trading day.',
    summary: 'A calm view of the account, the open risk and the one thing worth fixing. The dashboard is a working surface, not a wall of invented market data.',
    stats: [['1', 'view of the session'], ['0', 'fake prices or P&L'], ['24/7', 'record available']],
    sections: [
      ['What matters now', 'See synced balances, open positions, recent reviews and the next planned action without digging through five different tools. Empty states stay empty when there is no approved data.'],
      ['A repeatable start', 'Begin with context, check risk, review the last session and choose one focus. The dashboard gives the same rhythm to every trading day.'],
    ],
    points: ['Live account context, never demo balances', 'Open risk and recent activity in one place', 'SI focus carried into the next session', 'No fabricated market prices or performance'],
    cta: ['Open the dashboard', '/app'],
  },
  'broker-integrations': {
    label: 'Broker Integrations', eyebrow: 'Product · Connections', title: 'Connect once. Keep control.',
    summary: 'Bring a live brokerage, prop firm or self-custody wallet into the record. Permissions stay read-only, credentials stay encrypted and access can be revoked.',
    stats: [['6+', 'named broker integrations'], ['Read-only', 'by default'], ['Anytime', 'revoke access']],
    sections: [
      ['Named platforms, not a black box', 'Binance, Deriv, easyMarkets, Interactive Brokers, Alpaca and Coinbase connect over API or the MT5 bridge. Self-custody wallets track BTC, ETH, USDC and Solana balances.'],
      ['A permission boundary', 'TradingBible does not place orders, move funds or withdraw from a connected account. A connection is a read path into your record, not a key to your capital.'],
    ],
    points: ['Read-oriented API keys and OAuth', 'Encrypted credentials at rest and in transit', 'Revoke a connection from the app', 'Live accounts only; demo P&L excluded'],
    cta: ['See broker connections', '/features/broker-connections'],
  },
  'market-data': {
    label: 'Market Data', eyebrow: 'Product · Markets', title: 'Context for the decision.',
    summary: 'Charts, order flow, heatmaps and TradingBible TV across 250+ symbols and five markets. Live market context sits beside the journal — not in place of it.',
    stats: [['250+', 'symbols'], ['5', 'market groups'], ['TV', 'live market coverage']],
    sections: [
      ['One market surface', 'Move from a watchlist to a chart, an order-flow view or a heatmap without losing the symbol. The terminal is built for the session, not for a marketing screenshot.'],
      ['Context is not a promise', 'No page fabricates a quote, a candle, a volume figure or a performance chart. Market data appears when a real connection or licensed feed supplies it.'],
    ],
    points: ['Forex, crypto, metals, indices and commodities', '3D bubble heatmaps and order-flow views', 'TradingBible TV and live market coverage', 'Price alerts on supported symbols'],
    cta: ['Open the terminal', '/app/terminal-pro'],
  },
  'performance-analytics': {
    label: 'Performance Analytics', eyebrow: 'Product · Analytics', title: 'Numbers that explain the result.',
    summary: 'Equity curve, profit factor, drawdown, expectancy and Trader Score — computed from synced trades, with the context behind each number kept close.',
    stats: [['Live', 'computed from synced trades'], ['1', 'record per strategy'], ['0', 'synthetic performance']],
    sections: [
      ['Measure the decision, not just the win', 'A profitable trade can still be a bad decision. Analytics separate outcome from process so you can see consistency, risk and the cost of breaking your own rules.'],
      ['Reports that travel', 'Filter by account, strategy or period, then export a report for a mentor, prop firm or your own review. The underlying trade record remains the source.'],
    ],
    points: ['Equity curve and drawdown', 'Profit factor, expectancy and win rate', 'Trader Score and discipline trends', 'Exportable reports with source records'],
    cta: ['Explore analytics', '/app/analytics'],
  },
  tools: {
    label: 'Tools & Subscriptions', eyebrow: 'Product · Tools', title: 'The math before the click.',
    summary: 'Position sizing, risk/reward, breakeven, expectancy, alerts, backtesting and paper trading. The tools that make a plan testable before capital is exposed.',
    stats: [['6', 'risk and planning tools'], ['1', 'paper environment'], ['250+', 'symbols for alerts']],
    sections: [
      ['Plan the risk first', 'Set the stop, size the position, check the reward and see the breakeven before the order. Calculators live beside the journal so the plan is saved with the trade.'],
      ['Test before risking', 'Backtest a rule on historical data, then forward-test it with paper money. The point is not a perfect curve; it is a repeatable process you can review.'],
    ],
    points: ['Position size and R-multiple calculators', 'Risk/reward, breakeven and expectancy', 'Backtester and paper trading', 'Price alerts across supported symbols'],
    cta: ['Open risk tools', '/app/tools'],
  },
  api: {
    label: 'API Access', eyebrow: 'Professional · API', title: 'Your record, programmatically.',
    summary: 'Professional-tier REST access, personal keys and webhooks for desks that need the record inside their own systems — scoped and revocable.',
    stats: [['REST', 'professional API'], ['Keys', 'personal and revocable'], ['Webhooks', 'event delivery']],
    sections: [
      ['Built for a desk', 'Pull synced trades, balances and reviews into your own reporting stack. Keys are scoped to the account and can be revoked without deleting the underlying journal.'],
      ['A clear boundary', 'The API exposes your record; it does not enable trading, withdrawals or token operations. Professional access is a data permission, not a brokerage permission.'],
    ],
    points: ['Personal API keys and webhooks', 'Read-oriented account data', 'Team seats on Professional', 'No order placement or withdrawal surface'],
    cta: ['See Professional', '/pricing'],
  },
  premium: {
    label: 'Premium Features', eyebrow: 'Product · Premium', title: 'The SI-first desk.',
    summary: 'Elite adds daily and weekly SI reports; Professional adds the API, team seats, white-label presets and a dedicated success manager for funds and prop desks.',
    stats: [['Elite', 'SI reports and coach'], ['Pro', 'API, teams, white-label'], ['1:1', 'onboarding on Professional']],
    sections: [
      ['Go deeper with SI', 'Elite turns the coach into a reporting rhythm: what changed, where risk leaked and what to fix next. The reports stay tied to the live record.'],
      ['Run a desk', 'Professional adds the integration and identity layers a fund or prop desk needs, including white-label presets, team seats and API access.'],
    ],
    points: ['Daily and weekly SI reports', 'SI coach chat and mistake detection', 'Unlimited broker accounts and team seats', 'REST API, webhooks and white-label presets'],
    cta: ['Compare plans', '/pricing#plans'],
  },
  'trading-overview': {
    label: 'Trading Overview', eyebrow: 'Product · Trading', title: 'One desk for the session.',
    summary: 'Terminal Pro, watchlists, order flow, heatmaps and TV in one connected surface. The desk gives context; the journal gives the memory.',
    stats: [['1', 'connected desk'], ['5', 'market groups'], ['TV', 'live coverage']],
    sections: [
      ['From watchlist to decision', 'Search a symbol, move through the chart and order-flow views, set an alert and keep the session context beside your journal. No tab graveyard.'],
      ['A desk with a record', 'The terminal is not a standalone toy. The trades you take are reviewed against the journal, so market context and execution stay connected.'],
    ],
    points: ['Terminal Pro charts and order flow', 'Watchlists and symbol search', 'Heatmaps across five markets', 'TradingBible TV and alerts'],
    cta: ['Open Terminal Pro', '/app/terminal-pro'],
  },
  'broker-connections': {
    label: 'Broker Connections', eyebrow: 'Trading · Connections', title: 'A connection is a permission, not a handshake.',
    summary: 'Every broker or prop-firm connection is scoped, documented and revocable. You decide what TradingBible can read; you never hand over the ability to trade.',
    stats: [['Read-only', 'default scope'], ['Encrypted', 'credentials at rest'], ['Revocable', 'without deleting history']],
    sections: [
      ['Know what is shared', 'The connection screen names the platform, the permission and the last sync. If a credential is wrong or a provider is not supported, the app says so instead of pretending.'],
      ['A clean exit', 'Disconnect a broker and stop future syncs without rewriting the historical record you already reviewed. Access is a switch, not a permanent grant.'],
    ],
    points: ['Read-oriented API keys or OAuth', 'No order placement or withdrawal', 'Connection status and last sync', 'Disconnect and revoke at any time'],
    cta: ['Open connections', '/app/brokers'],
  },
  'strategy-analysis': {
    label: 'Strategy Analysis', eyebrow: 'Trading · Strategy', title: 'Find the setup that pays you.',
    summary: 'Tag setups, group trades into playbooks and compare expectancy across sessions. Strategy analysis is how a hunch becomes a rule you can test.',
    stats: [['Tags', 'setup and session'], ['Reports', 'by strategy'], ['Backtest', 'before risk']],
    sections: [
      ['A playbook, not a pile of trades', 'Define the setup, the conditions and the invalidation. Then let the journal show whether the edge is real across a sample — not just the last winner.'],
      ['Compare honestly', 'Filter by strategy, market and session to see where the record is strong and where it leaks. The same filters feed reports and SI reviews.'],
    ],
    points: ['Setup and session tags', 'Strategy-level expectancy and win rate', 'Playbook notes attached to trades', 'Backtest and paper-trade a rule'],
    cta: ['Explore strategy analysis', '/app/analytics'],
  },
  'risk-management': {
    label: 'Risk Management', eyebrow: 'Trading · Risk', title: 'Risk is the position before the trade.',
    summary: 'Size the position, define the stop, check exposure and get alerted before the plan breaks. Risk tools are built into the journal, not bolted on after a loss.',
    stats: [['1R', 'repeatable risk unit'], ['Live', 'exposure context'], ['Alerts', 'when levels hit']],
    sections: [
      ['Plan the loss first', 'Set the risk in account terms, convert it to position size and see the reward-to-risk before entry. The trade record keeps the original plan so review can compare it with what happened.'],
      ['Catch the drift', 'Open exposure, concentration and session limits are visible while you trade. Alerts are a prompt to check the plan, not a substitute for one.'],
    ],
    points: ['Position sizing and R-multiple', 'Risk/reward and breakeven calculators', 'Open exposure and concentration context', 'Price and risk alerts on supported symbols'],
    cta: ['Open risk tools', '/app/tools'],
  },
  'trade-history': {
    label: 'Trade History', eyebrow: 'Trading · Record', title: 'A searchable memory.',
    summary: 'Every synced trade, note and review in one searchable history. Filter it, export it and use it to prove what actually happened.',
    stats: [['All', 'synced fills in one history'], ['Search', 'symbol, tag, session'], ['Export', 'reports and records']],
    sections: [
      ['The whole record', 'Search by symbol, setup, date, account or mistake. Open a trade to see the entry, exit, size, notes and the SI review that followed.'],
      ['Evidence you can share', 'Export a report for a mentor, prop firm or internal review without rebuilding the story. The source record stays attached.'],
    ],
    points: ['Synced trade history, not manual entry', 'Notes and reviews attached to each trade', 'Filters by symbol, tag, account and date', 'Exportable records and reports'],
    cta: ['Open trade history', '/app/journal'],
  },
};

const HUBS = [
  ['Journal & sync', [['Trading Journal', 'trading-journal'], ['Broker Integrations', 'broker-integrations'], ['Trade History', 'trade-history']]],
  ['Review & improve', [['SI Coach', 'si-coach'], ['Performance Analytics', 'performance-analytics'], ['Strategy Analysis', 'strategy-analysis']]],
  ['Trade & plan', [['Trading Overview', 'trading-overview'], ['Risk Management', 'risk-management'], ['Tools & Subscriptions', 'tools'], ['Market Data', 'market-data']]],
  ['Build & scale', [['Dashboard', 'dashboard'], ['API Access', 'api'], ['Premium Features', 'premium']]],
];

function FeatureStats({ stats }) {
  return (
    <div className="mt-7 grid grid-cols-3 gap-2">
      {stats.map(([value, label]) => (
        <div key={label} className="rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/5 p-3">
          <div className="font-mono text-lg font-bold text-[#e8c95a] sm:text-xl">{value}</div>
          <div className="mt-0.5 text-[9px] leading-snug text-[#8a8577] sm:text-[10px]">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function FeatureHubPage() {
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Product & features"
        title={<>One record from the first click to the <span className="tb-gold-text">final review.</span></>}
        description="TradingBible connects the terminal, the journal, market context, risk tools, SI coaching, funded evaluations and the Academy. Each page below explains one part of the loop — without inventing data or promising a result."
        meta={['Live accounts only', 'No fabricated P&L', 'Private company · pre-IPO']}
        actions={<><GoldButton to="/pricing">Choose your plan <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/features/si-coach" className="border px-5 py-3 text-[#e9e7df]">Meet SI Coach</GhostButton></>}
      />
      <PublicSection eyebrow="The system" title="Explore the modules." sub="Every link opens a public product page. Member areas require a live subscription.">
        <div className="grid gap-3 md:grid-cols-2">
          {HUBS.map(([group, items]) => (
            <Card key={group} className="rounded-xl p-5">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">{group}</div>
              <div className="mt-3 divide-y divide-white/[0.06]">
                {items.map(([label, slug]) => (
                  <Link key={slug} to={`/features/${slug}`} className="flex items-center justify-between gap-3 py-2.5 text-sm font-semibold text-[#d8d3c3] transition hover:text-[#f0ecdd]">
                    {label}<ArrowRight className="h-3.5 w-3.5 text-[#d4af37]" />
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </PublicSection>
      <PublicSection eyebrow="How it connects" title="One loop, not fourteen tabs.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Connect', 'Link a live broker, prop firm or wallet. The record starts with real fills.'],
            ['Review', 'Journal the decision, measure the result and let SI find the repeated mistake.'],
            ['Improve', 'Leave with one focus, test it on paper and carry it into the next session.'],
          ].map(([title, body], i) => (
            <Card key={title} className="rounded-xl p-5">
              <div className="font-mono text-[10px] font-bold text-[#d4af37]">0{i + 1}</div>
              <h3 className="mt-2 text-base font-semibold text-[#f0ecdd]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
            </Card>
          ))}
        </div>
      </PublicSection>
      <PublicCTA title={<>See the whole record <span className="tb-gold-text">in one place.</span></>} body="Start with the plan that fits your desk. Every first payment carries a 14-day money-back guarantee." />
    </PublicSiteShell>
  );
}

export function PublicFeaturePage() {
  const { slug } = useParams();
  const feature = FEATURES[slug];
  if (!feature) return <FeatureHubPage />;
  const [ctaLabel, ctaTo] = feature.cta;
  return (
    <PublicSiteShell>
      <PublicPageHead eyebrow={feature.eyebrow} title={feature.title} description={feature.summary} meta={['Private company', 'Live accounts only', 'No fabricated data']}>
        <FeatureStats stats={feature.stats} />
        <div className="mt-5 flex flex-wrap gap-2.5">
          <GoldButton to={ctaTo} className="px-5 py-3">{ctaLabel} <ArrowRight className="h-4 w-4" /></GoldButton>
          <GhostButton to="/pricing" className="border px-5 py-3 text-[#e9e7df]">See plans</GhostButton>
        </div>
      </PublicPageHead>
      <PublicSection eyebrow="What it does" title={feature.label}>
        <div className="grid gap-3 md:grid-cols-2">
          {feature.sections.map(([title, body]) => (
            <Card key={title} className="rounded-xl p-5 sm:p-6">
              <h3 className="text-base font-semibold tracking-tight text-[#f0ecdd]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8a8577]">{body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-3"><PublicCheckList items={feature.points} /></div>
        <div className="mt-3"><PublicNotice>{feature.note || 'TradingBible provides journaling, analytics and SI-generated observations for educational and record-keeping purposes only. Nothing here is financial advice or a promise of performance.'}</PublicNotice></div>
      </PublicSection>
      <PublicSection eyebrow="The loop" title="Where it fits">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            ['Connect', 'A live account is linked with a read-only permission.', '/features/broker-integrations'],
            ['Record', 'The trade and the decision land in the journal.', '/features/trading-journal'],
            ['Review', 'SI turns the history into one next action.', '/features/si-coach'],
          ].map(([title, body, to]) => (
            <Link key={title} to={to} className="group rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/5 p-4 transition hover:border-[#d4af37]/35">
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">{title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8a8577]">{body}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#d4af37]">Explore <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </PublicSection>
      <PublicCTA title={<>Put this module to work <span className="tb-gold-text">on your own record.</span></>} body="Start with a plan, connect a live account and review the first session with SI." primary={ctaLabel} primaryTo={ctaTo} />
    </PublicSiteShell>
  );
}

const COMMUNITY_SECTIONS = [
  {
    id: 'social', icon: Users, eyebrow: 'Community · Social network', title: 'A network built on contribution, not follower counts.',
    body: 'Follow traders, share a review and keep the conversation attached to the record. The social layer is a place to exchange process — not a feed of invented wins or buy/sell calls.',
    points: ['Profiles tied to real platform activity', 'Share a review without exposing private balances', 'No fake P&L leaderboard', 'Report and moderation tools in the product'],
  },
  {
    id: 'refer', icon: HeartHandshake, eyebrow: 'Community · Refer a friend', title: 'Invite someone you would actually trade beside.',
    body: 'The referral program rewards introductions to traders who want a record, not a quick signal. Terms, eligibility and payout details are shown in the app; no referral link promises a trading return.',
    points: ['Track referrals from the affiliate area', 'Rewards follow the published program terms', 'No return or profit is promised', 'Fraud and self-referral are excluded'],
  },
  {
    id: 'community', icon: Globe2, eyebrow: 'Community · Trading community', title: 'A room for process, not hype.',
    body: 'The community forum is organised around setups, reviews and lessons. Members can ask for a second pair of eyes, share a playbook and compare how they handled the same market condition.',
    points: ['Discussion by market and skill level', 'Share charts and journal notes safely', 'Mentors and SI-hosted sessions', 'Moderation that removes spam and financial promotions'],
  },
  {
    id: 'forums', icon: MessageSquare, eyebrow: 'Community · Discussion forums', title: 'Threads worth reopening.',
    body: 'Forums keep the long-form discussion that a chat box loses. Search by topic, follow a thread and link back to the trade or lesson that started the question.',
    points: ['Searchable threads and topic tags', 'Attach a journal review or lesson', 'Mentor replies and SI summaries', 'Clear rules on advice and promotion'],
  },
  {
    id: 'moderators', icon: ShieldCheck, eyebrow: 'Community · Moderators', title: 'Human review, visible rules.',
    body: 'Moderators are named operators with a published scope. They remove spam, enforce the disclosure rules and escalate safety issues; they do not approve trades or guarantee outcomes.',
    points: ['Named moderator profiles', 'Published community rules', 'Report, review and appeal path', 'No moderator can approve an investment'],
  },
];

export function CommunityPublicPage() {
  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Community"
        title={<>Trade in public. <span className="tb-gold-text">Keep the record private.</span></>}
        description="TradingBible's community is built around process: reviews, setups, lessons and honest questions. It is not a signal room, a profit competition or a place to sell an outcome."
        meta={['Human moderated', 'No fake P&L', 'Private balances by default']}
        actions={<><GoldButton to="/signup">Join the community <ArrowRight className="h-4 w-4" /></GoldButton><GhostButton to="/features" className="border px-5 py-3 text-[#e9e7df]">Explore the product</GhostButton></>}
      />
      <PublicSection eyebrow="The social layer" title="Five ways to participate.">
        <div className="space-y-3">
          {COMMUNITY_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} id={section.id} className="scroll-mt-28 rounded-xl p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <IosIcon icon={Icon} size="md" seed={section.id} />
                      <div>
                        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">{section.eyebrow}</div>
                        <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#f0ecdd]">{section.title}</h2>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#8a8577]">{section.body}</p>
                  </div>
                  <PublicCheckList items={section.points} columns={1} />
                </div>
              </Card>
            );
          })}
        </div>
      </PublicSection>
      <PublicCTA eyebrow="Community standard" title={<>Bring the review, <span className="tb-gold-text">not the highlight reel.</span></>} body="Join a room where the record matters more than the screenshot. Read the community rules before posting." primary="Create an account" primaryTo="/signup" secondary="Read the FAQ" secondaryTo="/faq" />
    </PublicSiteShell>
  );
}
