import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend,
} from 'recharts';
import { TrendingDown, Percent, CalendarDays, Activity, Plug, CandlestickChart, Grid2x2, Gauge, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import ChartPanel from '@/components/ChartPanel';
import MarketHeatmap from '@/components/MarketHeatmap';

const GOLD = '#d4af37';
const GREEN = '#34d399';
const RED = '#e06666';

const TT = ({ active, payload, label, prefix = '', suffix = '' }) => active && payload?.length ? (
  <div className="rounded-lg border border-[#d4af37]/30 bg-[#0f0f14] px-3 py-2 text-xs">
    <div className="text-[#8a8577]">{label}</div>
    {payload.map((p) => (
      <div key={p.dataKey} className="font-mono" style={{ color: p.color || GOLD }}>{prefix}{Number(p.value).toLocaleString()}{suffix}</div>
    ))}
  </div>
) : null;

function Card({ title, sub, children, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-4 sm:p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-[#f0ecdd]">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-[#8a8577]">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnalyticsPage() {
  const { trades, loading } = useTrades();
  const stats = computeStats(trades);
  const [hmType, setHmType] = useState('crypto');
  const [hmPeriod, setHmPeriod] = useState('1d');

  const derived = useMemo(() => {
    if (!stats) return null;
    // Drawdown curve from equity
    let peak = -Infinity;
    const drawdown = stats.equity.map((e) => {
      peak = Math.max(peak, e.equity);
      return { day: e.day, dd: +(((e.equity - peak) / peak) * 100).toFixed(2) };
    });
    // Monthly returns %
    const monthlyReturns = stats.monthly.map((m) => ({ m: m.m, ret: +((m.pnl / 100000) * 100).toFixed(2) }));
    // Win/loss ratio trend across chronological buckets of 5 trades
    const chrono = [...trades].sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
    const buckets = [];
    for (let i = 0; i < chrono.length; i += 5) {
      const slice = chrono.slice(i, i + 5);
      const w = slice.filter((t) => (t.pnl || 0) > 0).length;
      buckets.push({ b: `#${i + 1}-${i + slice.length}`, winRate: Math.round((w / slice.length) * 100) });
    }
    // Day-of-week heatmap
    const dow = DOW.map((d) => ({ d, pnl: 0, trades: 0 }));
    trades.forEach((t) => {
      const idx = (new Date(t.tradeDate).getDay() + 6) % 7;
      dow[idx].pnl += t.pnl || 0; dow[idx].trades++;
    });
    const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
    const losses = trades.length - wins;
    const donut = [
      { name: 'Wins', value: wins, fill: GREEN },
      { name: 'Losses', value: losses, fill: RED },
    ];
    return { drawdown, monthlyReturns, buckets, dow, donut, wins, losses };
  }, [stats, trades]);

  if (loading) return <AppLayout title="Advanced Analytics"><div className="glass rounded-2xl py-20 text-center text-sm text-[#8a8577]">Loading analytics…</div></AppLayout>;

  if (!stats) return (
    <AppLayout title="Advanced Analytics">
      <div className="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><Plug className="h-6 w-6" /></div>
        <h3 className="text-lg font-semibold text-[#f0ecdd]">No data to analyze yet</h3>
        <p className="mt-2 max-w-md text-sm text-[#8a8577]">Connect a broker and your advanced analytics populate automatically.</p>
        <Link to="/app/brokers" className="mt-5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f]">Connect a broker</Link>
      </div>
    </AppLayout>
  );

  const maxAbsPnl = Math.max(1, ...derived.dow.map((d) => Math.abs(d.pnl)));

  return (
    <AppLayout title="Advanced Analytics">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Percent, label: 'Win Rate', value: `${stats.winRate}%` },
          { icon: Activity, label: 'Profit Factor', value: stats.profitFactor.toFixed(2) },
          { icon: TrendingDown, label: 'Max Drawdown', value: `${stats.drawdown}%` },
          { icon: CalendarDays, label: 'Total Trades', value: stats.totalTrades },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between text-[#8a8577]"><span className="text-[11px] uppercase tracking-wider">{s.label}</span><s.icon className="h-4 w-4 text-[#d4af37]" /></div>
            <div className="mt-2 font-mono text-2xl font-semibold text-[#f0ecdd]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Equity Growth" sub="Cumulative account equity over time" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.equity} margin={{ left: -12, right: 8 }}>
              <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.4} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1c1c22" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<TT prefix="$" />} />
              <Area type="monotone" dataKey="equity" stroke={GOLD} strokeWidth={2} fill="url(#eqg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Win / Loss Split" sub={`${derived.wins} wins · ${derived.losses} losses`}>
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart innerRadius="55%" outerRadius="100%" data={derived.donut} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#1c1c22' }} dataKey="value" cornerRadius={8} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8a8577' }} />
              <Tooltip content={<TT />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Drawdown Analysis" sub="Peak-to-trough decline (%)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={derived.drawdown} margin={{ left: -12, right: 8 }}>
              <defs><linearGradient id="ddg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0} /><stop offset="100%" stopColor={RED} stopOpacity={0.45} /></linearGradient></defs>
              <CartesianGrid stroke="#1c1c22" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<TT suffix="%" />} />
              <Area type="monotone" dataKey="dd" stroke={RED} strokeWidth={2} fill="url(#ddg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Monthly Returns" sub="Return on starting capital (%)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={derived.monthlyReturns} margin={{ left: -18, right: 8 }}>
              <CartesianGrid stroke="#1c1c22" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<TT suffix="%" />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
              <Bar dataKey="ret" radius={[4, 4, 0, 0]}>{derived.monthlyReturns.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? GREEN : RED} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Win/Loss Ratio Trend" sub="Rolling win rate per 5 trades">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={derived.buckets} margin={{ left: -18, right: 8 }}>
              <CartesianGrid stroke="#1c1c22" vertical={false} />
              <XAxis dataKey="b" tick={{ fill: '#6a665a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6a665a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<TT suffix="%" />} />
              <Line type="monotone" dataKey="winRate" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Performance Heatmap" sub="Net P&L by day of week">
          <div className="grid grid-cols-7 gap-2 pt-2">
            {derived.dow.map((d) => {
              const intensity = Math.abs(d.pnl) / maxAbsPnl;
              const bg = d.trades === 0 ? 'rgba(255,255,255,0.04)' : d.pnl >= 0
                ? `rgba(52,211,153,${0.15 + intensity * 0.6})`
                : `rgba(224,102,102,${0.15 + intensity * 0.6})`;
              return (
                <div key={d.d} className="rounded-lg p-2 text-center" style={{ background: bg }}>
                  <div className="text-[10px] uppercase tracking-wide text-[#c9c4b4]">{d.d}</div>
                  <div className="mt-1 font-mono text-[11px] font-semibold text-[#f0ecdd]">{d.trades ? fmtMoney(d.pnl) : '—'}</div>
                  <div className="text-[9px] text-[#8a8577]">{d.trades} trades</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-[#d4af37]" /><h2 className="text-lg font-semibold text-[#f0ecdd]">Advanced Charts</h2></div>
        <Link to="/app/charts" className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline">Open charting suite <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="mt-3"><ChartPanel initialSymbol="BTCUSD" initialTimeframe="1h" compact initialIndicators={[{ id: 'sma-a', type: 'sma', params: { period: 20 }, color: '#d4af37' }]} /></div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-[#d4af37]" /><h2 className="text-lg font-semibold text-[#f0ecdd]">Technical Indicators</h2></div>
        <Link to="/app/indicators" className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline">Full indicator studio <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="mt-3"><ChartPanel initialSymbol="ETHUSD" initialTimeframe="1h" compact initialIndicators={[{ id: 'rsi-a', type: 'rsi', params: { period: 14 }, color: '#d4af37' }, { id: 'macd-a', type: 'macd', params: { fast: 12, slow: 26, signal: 9 }, color: '#60a5fa' }]} /></div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2"><Grid2x2 className="h-5 w-5 text-[#d4af37]" /><h2 className="text-lg font-semibold text-[#f0ecdd]">Market Heatmaps</h2></div>
        <Link to="/app/heatmaps" className="flex items-center gap-1 text-xs text-[#d4af37] hover:underline">Explore heatmaps <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="mt-3 glass rounded-2xl p-4 sm:p-6"><MarketHeatmap type={hmType} setType={setHmType} period={hmPeriod} setPeriod={setHmPeriod} /></div>

      <div className="mt-5">
        <Card title="Monthly Performance Breakdown" sub="Net P&L by month">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]">
                <th className="py-2">Month</th><th className="py-2 text-right">Net P&L</th><th className="py-2 text-right">Return</th><th className="py-2 text-right">Result</th>
              </tr></thead>
              <tbody>
                {stats.monthly.map((m) => (
                  <tr key={m.m} className="border-t border-white/5">
                    <td className="py-2.5 text-[#e9e7df]">{m.m}</td>
                    <td className={`py-2.5 text-right font-mono ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(m.pnl)}</td>
                    <td className="py-2.5 text-right font-mono text-[#c9c4b4]">{((m.pnl / 100000) * 100).toFixed(2)}%</td>
                    <td className="py-2.5 text-right">{m.pnl >= 0 ? <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">Profit</span> : <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-400">Loss</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
