import React from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target, Activity, ShieldAlert, Trophy, Percent, Plug, RefreshCw, Landmark, ArrowRight, LayoutDashboard } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import DashboardWidgets from '@/components/DashboardWidgets';
import AccountBalances from '@/components/AccountBalances';
import { PageHero, Card, StatGrid, EmptyState, GoldButton, SectionHead } from '@/components/ui-kit';

const GOLD = '#d4af37';

function DashStat({ icon: Icon, label, value, delta, positive }) {
  return (
    <div className="tb-card tb-card-hover p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] uppercase tracking-wider text-[#8a8577] sm:text-xs">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-[#d4af37]" />
      </div>
      <div className="mt-3 truncate font-mono text-xl font-semibold text-[#f0ecdd] sm:text-2xl">{value}</div>
      {delta && <div className={`mt-1 flex items-center gap-1 text-xs ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{delta}</div>}
    </div>
  );
}

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
    return <AppLayout title={t('nav.dashboard')}><div className="tb-page"><div className="tb-card flex items-center justify-center gap-2 py-20 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> {t('dash.loading')}</div></div></AppLayout>;
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
