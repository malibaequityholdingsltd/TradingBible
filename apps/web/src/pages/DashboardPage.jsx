import React from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target, Activity, ShieldAlert, Trophy, Percent, Plug, RefreshCw, Landmark, ArrowRight, LayoutDashboard, ListOrdered, LineChart, Grid2x2, MonitorPlay, PlusCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import DashboardWidgets from '@/components/DashboardWidgets';
import AccountBalances from '@/components/AccountBalances';
import { PageHero, Card, StatGrid, EmptyState, GoldButton, GhostButton, SectionHead, Skeleton, CardSkeleton } from '@/components/ui-kit';

const GOLD = '#d4af37';

function DashStat({ icon: Icon, label, value, delta, positive }) {
  return (
    <div className="tb-card tb-card-hover sheen-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[#8a8577] sm:text-xs">{label}</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f4e6a8]/25 to-[#c99a25]/10 text-[#d4af37] ring-1 ring-[#d4af37]/25">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 truncate font-mono text-xl font-bold text-[#f0ecdd] sm:text-2xl">{value}</div>
      {delta && (
        <div className="mt-2 w-fit">
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${positive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{delta}
          </span>
        </div>
      )}
    </div>
  );
}

// Command deck: one tap to every desk of the terminal.
const DESKS = [
  { to: '/app/terminal', icon: ListOrdered, key: 'nav.terminal', fallback: 'Terminal', blurb: 'Watchlists, groups and live quotes' },
  { to: '/app/charts', icon: LineChart, key: 'nav.charts', fallback: 'Advanced Charts', blurb: 'Indicators, drawings and templates' },
  { to: '/app/heatmaps', icon: Grid2x2, key: 'nav.heatmaps', fallback: 'Heatmaps', blurb: '5 markets of living bubbles' },
  { to: '/app/orderflow', icon: Activity, key: 'nav.orderflow', fallback: 'Order Flow', blurb: 'Depth, tape and footprint' },
  { to: '/tv', icon: MonitorPlay, key: 'nav.tv', fallback: 'TradingBible TV', blurb: '28 live desks that autoplay' },
];

const TT = ({ active, payload, label, prefix = '' }) => active && payload?.length ? (
  <div className="rounded-lg border border-[#d4af37]/30 bg-[#0f0f14] px-3 py-2 text-xs">
    <div className="text-[#8a8577]">{label}</div>
    <div className="font-mono text-[#d4af37]">{prefix}{payload[0].value.toLocaleString()}</div>
  </div>
) : null;

export default function DashboardPage() {
  const { trades, loading } = useTrades();
  const stats = computeStats(trades);
  const { user } = useAuth();
  const { t } = useI18n();
  const isSubscriber = user?.role === 'admin' || ['pro', 'elite', 'professional'].includes((user?.plan || '').toLowerCase());

  if (loading) {
    return <AppLayout title={t('nav.dashboard')}><div className="tb-page"><Skeleton className="h-36" /><div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><CardSkeleton rows={4} /></div></AppLayout>;
  }

  if (!stats) {
    return (
      <AppLayout title={t('nav.dashboard')}>
        <div className="tb-page">
          <AccountBalances />
          <EmptyState
            icon={Plug}
            title={t('dash.connectTitle')}
            sub={t('dash.connectSub')}
            action={<GoldButton to="/app/brokers">{t('dash.connectBtn')}</GoldButton>}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('nav.dashboard')}>
      <div className="tb-page">
        <PageHero
          kickerIcon={LayoutDashboard}
          kicker={t('nav.dashboard')}
          title={t('dash.perfPnl')}
          accent={fmtMoney(stats.balance - 100000)}
          subtitle={t('dash.syncedN', { n: stats.totalTrades })}
          stats={[
            { label: t('dash.winRate'), value: `${stats.winRate}%`, color: stats.winRate >= 50 ? '#34d399' : '#fb7185' },
            { label: t('dash.profitFactor'), value: stats.profitFactor.toFixed(2), color: '#d4af37' },
            { label: t('dash.traderScore'), value: `${stats.traderScore}/100`, color: '#f0ecdd' },
          ]}
          actions={
            <>
              <GoldButton to="/app/journal" className="min-h-[40px] px-4 py-2 text-xs"><PlusCircle className="h-4 w-4" /> {t('jou.newTrade', null, 'New trade')}</GoldButton>
              <GhostButton to="/app/charts" className="min-h-[40px] px-4 py-2 text-xs"><LineChart className="h-4 w-4" /> {t('nav.charts')}</GhostButton>
              <GhostButton to="/tv" className="min-h-[40px] px-4 py-2 text-xs"><MonitorPlay className="h-4 w-4" /> {t('nav.tv', null, 'TradingBible TV')}</GhostButton>
            </>
          }
        />
        <AccountBalances />
        <StatGrid cols={4}>
          <DashStat icon={Wallet} label={t('dash.perfPnl')} value={fmtMoney(stats.balance - 100000)} delta={t('dash.syncedN', { n: stats.totalTrades })} positive={stats.balance >= 100000} />
          <DashStat icon={Activity} label={t('dash.daily')} value={fmtMoney(stats.dailyPnl)} delta={t('dash.today')} positive={stats.dailyPnl >= 0} />
          <DashStat icon={Activity} label={t('dash.weekly')} value={fmtMoney(stats.weeklyPnl)} delta={t('dash.last7')} positive={stats.weeklyPnl >= 0} />
          <DashStat icon={Activity} label={t('dash.monthly')} value={fmtMoney(stats.monthlyPnl)} delta={t('dash.last30')} positive={stats.monthlyPnl >= 0} />
          <DashStat icon={Percent} label={t('dash.winRate')} value={`${stats.winRate}%`} delta={stats.winRate >= 50 ? t('dash.aboveTarget') : t('dash.belowTarget')} positive={stats.winRate >= 50} />
          <DashStat icon={Target} label={t('dash.profitFactor')} value={stats.profitFactor.toFixed(2)} delta={stats.profitFactor >= 1.5 ? t('dash.healthyEdge') : t('dash.needsWork')} positive={stats.profitFactor >= 1.5} />
          <DashStat icon={ShieldAlert} label={t('dash.maxDd')} value={`${stats.drawdown}%`} delta={stats.drawdown > -10 ? t('dash.withinLimits') : t('dash.elevated')} positive={stats.drawdown > -10} />
          <DashStat icon={Trophy} label={t('dash.traderScore')} value={`${stats.traderScore}/100`} delta={t('dash.aiComputed')} positive />
        </StatGrid>

        {/* Command deck — every list, widget and desk, one tap away */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
          {DESKS.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="tb-card tb-card-hover sheen-panel group flex min-w-0 items-center gap-3 p-3.5 sm:p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f4e6a8]/25 to-[#c99a25]/10 text-[#d4af37] ring-1 ring-[#d4af37]/25 transition group-hover:scale-105">
                <d.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#f0ecdd]">{t(d.key, null, d.fallback)}</span>
                <span className="block truncate text-[11px] text-[#8a8577]">{d.blurb}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#6a665a] transition group-hover:translate-x-0.5 group-hover:text-[#d4af37]" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-4 sm:p-6 lg:col-span-2">
            <SectionHead title={t('dash.equityCurve')} />
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.equity} margin={{ left: -12, right: 8 }}>
                <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.4} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="day" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TT prefix="$" />} />
                <Area type="monotone" dataKey="equity" stroke={GOLD} strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-4 sm:p-6">
            <SectionHead title={t('dash.monthlyPnlH')} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly} margin={{ left: -18, right: 8 }}>
                <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TT prefix="$" />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{stats.monthly.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GOLD : '#7a2b2b'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-4 sm:p-6">
          <SectionHead title={t('dash.stratPerf')} />
          <div className="space-y-3">
            {stats.strategies.map((s) => (
              <div key={s.name} className="flex items-center gap-3 sm:gap-4">
                <div className="w-24 min-w-0 shrink-0 truncate text-sm text-[#c9c4b4] sm:w-32">{s.name}</div>
                <div className="h-2 min-w-0 flex-1 rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${s.winRate}%` }} /></div>
                <div className="w-10 shrink-0 whitespace-nowrap text-right font-mono text-sm text-[#d4af37] sm:w-12">{s.winRate}%</div>
                <div className={`w-16 shrink-0 whitespace-nowrap text-right font-mono text-sm sm:w-20 ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</div>
              </div>
            ))}
          </div>
        </Card>

        {isSubscriber && (
          <Link to="/app/wallet" className="tb-card tb-card-hover flex items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Landmark className="h-6 w-6" /></div>
              <div className="min-w-0">
                <h3 className="font-semibold text-[#f0ecdd]">{t('nav.wallet')}</h3>
                <p className="truncate text-sm text-[#8a8577]">{t('wal.subtitle')}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#d4af37]" />
          </Link>
        )}

        <DashboardWidgets />
      </div>
    </AppLayout>
  );
}
