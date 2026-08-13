import React from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Target, Activity, ShieldAlert, Trophy, Percent, Plug, RefreshCw, Landmark, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import DashboardWidgets from '@/components/DashboardWidgets';
import AccountBalances from '@/components/AccountBalances';

const GOLD = '#d4af37';

function Stat({ icon: Icon, label, value, delta, positive }) {
  return (
    <div className="glass glass-hover rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#8a8577] sm:text-xs">{label}</span>
        <Icon className="h-4 w-4 text-[#d4af37]" />
      </div>
      <div className="mt-3 font-mono text-xl font-semibold text-[#f0ecdd] sm:text-2xl">{value}</div>
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
  const isSubscriber = ['pro', 'elite', 'professional'].includes((user?.plan || '').toLowerCase());

  if (loading) {
    return <AppLayout title="Dashboard"><div className="glass flex items-center justify-center gap-2 rounded-2xl py-20 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> Loading your performance…</div></AppLayout>;
  }

  if (!stats) {
    return (
      <AppLayout title="Dashboard">
        <AccountBalances />
        <div className="mt-5 glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><Plug className="h-6 w-6" /></div>
          <h3 className="text-lg font-semibold text-[#f0ecdd]">Connect a live broker to see your terminal</h3>
          <p className="mt-2 max-w-md text-sm text-[#8a8577]">Your balance stays at $0.00 until you connect a live broker or prop-firm account. The AI then syncs your trades and real balance automatically.</p>
          <Link to="/app/brokers" className="mt-5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f]">Connect an account</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <AccountBalances />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Wallet} label="Performance P&L" value={fmtMoney(stats.balance - 100000)} delta={`${stats.totalTrades} trades synced`} positive={stats.balance >= 100000} />
        <Stat icon={Activity} label="Daily P&L" value={fmtMoney(stats.dailyPnl)} delta="today" positive={stats.dailyPnl >= 0} />
        <Stat icon={Activity} label="Weekly P&L" value={fmtMoney(stats.weeklyPnl)} delta="last 7 days" positive={stats.weeklyPnl >= 0} />
        <Stat icon={Activity} label="Monthly P&L" value={fmtMoney(stats.monthlyPnl)} delta="last 30 days" positive={stats.monthlyPnl >= 0} />
        <Stat icon={Percent} label="Win Rate" value={`${stats.winRate}%`} delta={stats.winRate >= 50 ? 'Above target' : 'Below target'} positive={stats.winRate >= 50} />
        <Stat icon={Target} label="Profit Factor" value={stats.profitFactor.toFixed(2)} delta={stats.profitFactor >= 1.5 ? 'Healthy edge' : 'Needs work'} positive={stats.profitFactor >= 1.5} />
        <Stat icon={ShieldAlert} label="Max Drawdown" value={`${stats.drawdown}%`} delta={stats.drawdown > -10 ? 'Within limits' : 'Elevated'} positive={stats.drawdown > -10} />
        <Stat icon={Trophy} label="Trader Score" value={`${stats.traderScore}/100`} delta="AI computed" positive />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-[#f0ecdd]">Equity Curve</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.equity} margin={{ left: -12, right: 8 }}>
              <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.4} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="day" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<TT prefix="$" />} />
              <Area type="monotone" dataKey="equity" stroke={GOLD} strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="mb-4 font-semibold text-[#f0ecdd]">Monthly P&L</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.monthly} margin={{ left: -18, right: 8 }}>
              <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<TT prefix="$" />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{stats.monthly.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GOLD : '#7a2b2b'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 glass rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 font-semibold text-[#f0ecdd]">Strategy Performance</h3>
        <div className="space-y-3">
          {stats.strategies.map((s) => (
            <div key={s.name} className="flex items-center gap-3 sm:gap-4">
              <div className="w-24 shrink-0 text-sm text-[#c9c4b4] sm:w-32">{s.name}</div>
              <div className="h-2 flex-1 rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${s.winRate}%` }} /></div>
              <div className="w-10 text-right font-mono text-sm text-[#d4af37] sm:w-12">{s.winRate}%</div>
              <div className={`w-16 text-right font-mono text-sm sm:w-20 ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</div>
            </div>
          ))}
        </div>
      </div>

      {isSubscriber && (
        <Link to="/app/wallet" className="mt-5 flex items-center justify-between gap-4 glass glass-hover rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#d4af37]/12 text-[#d4af37]"><Landmark className="h-6 w-6" /></div>
            <div>
              <h3 className="font-semibold text-[#f0ecdd]">Wallet</h3>
              <p className="text-sm text-[#8a8577]">Manage balances, issue debit &amp; credit cards, buy, sell, send and receive crypto.</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#d4af37]" />
        </Link>
      )}

      <DashboardWidgets />
    </AppLayout>
  );
}
