import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend,
} from 'recharts';
import { Plug, CandlestickChart, Grid2x2, Gauge, ArrowRight, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { PageHero, Card, SectionHead, Stat, StatGrid, EmptyState, GoldButton } from '@/components/ui-kit';

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

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { trades, loading } = useTrades();
  const DOW = [t('ana.mon'), t('ana.tue'), t('ana.wed'), t('ana.thu'), t('ana.fri'), t('ana.sat'), t('ana.sun')];
  const stats = computeStats(trades);

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
      { name: t('ana.wins'), value: wins, fill: GREEN },
      { name: t('ana.losses'), value: losses, fill: RED },
    ];
    return { drawdown, monthlyReturns, buckets, dow, donut, wins, losses };
  }, [stats, trades, t]);

  if (loading) return <AppLayout title={t('ana.pageTitle')}><div className="tb-page"><div className="tb-card py-20 text-center text-sm text-[#8a8577]">{t('ana.loading')}</div></div></AppLayout>;

  if (!stats) return (
    <AppLayout title={t('ana.pageTitle')}>
      <div className="tb-page">
        <EmptyState
          icon={Plug}
          title={t('ana.noDataTitle')}
          sub={t('ana.noDataSub')}
          action={<GoldButton to="/app/brokers">{t('ana.connectBroker')}</GoldButton>}
        />
      </div>
    </AppLayout>
  );

  const maxAbsPnl = Math.max(1, ...derived.dow.map((d) => Math.abs(d.pnl)));

  return (
    <AppLayout title={t('ana.pageTitle')}>
      <div className="tb-page">
        <PageHero kickerIcon={BarChart3} kicker={t('ana.pageTitle')} title={t('ana.pageTitle')} subtitle={t('ana.equitySub')} />

        <StatGrid cols={4}>
          <Stat label={t('ana.winRate')} value={`${stats.winRate}%`} />
          <Stat label={t('ana.profitFactor')} value={stats.profitFactor.toFixed(2)} />
          <Stat label={t('ana.maxDd')} value={`${stats.drawdown}%`} />
          <Stat label={t('ana.totalTrades')} value={stats.totalTrades} />
        </StatGrid>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="p-4 sm:p-6 lg:col-span-2">
            <SectionHead title={t('ana.equity')} sub={t('ana.equitySub')} />
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

          <Card className="p-4 sm:p-6">
            <SectionHead title={t('ana.wlSplit')} sub={t('ana.wlSub', { w: derived.wins, l: derived.losses })} />
            <ResponsiveContainer width="100%" height={260}>
              <RadialBarChart innerRadius="55%" outerRadius="100%" data={derived.donut} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: '#1c1c22' }} dataKey="value" cornerRadius={8} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8a8577' }} />
                <Tooltip content={<TT />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-4 sm:p-6">
            <SectionHead title={t('ana.dd')} sub={t('ana.ddSub')} />
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

          <Card className="p-4 sm:p-6">
            <SectionHead title={t('ana.monthlyRet')} sub={t('ana.monthlyRetSub')} />
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

          <Card className="p-4 sm:p-6">
            <SectionHead title={t('ana.wlTrend')} sub={t('ana.wlTrendSub')} />
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

          <Card className="p-4 sm:p-6">
            <SectionHead title={t('ana.perfHm')} sub={t('ana.perfHmSub')} />
            <div className="grid grid-cols-7 gap-1 pt-2 sm:gap-2">
              {derived.dow.map((d) => {
                const intensity = Math.abs(d.pnl) / maxAbsPnl;
                const bg = d.trades === 0 ? 'rgba(255,255,255,0.04)' : d.pnl >= 0
                  ? `rgba(52,211,153,${0.15 + intensity * 0.6})`
                  : `rgba(224,102,102,${0.15 + intensity * 0.6})`;
                return (
                  <div key={d.d} className="min-w-0 rounded-lg p-1 text-center sm:p-2" style={{ background: bg }}>
                    <div className="truncate text-[10px] uppercase tracking-wide text-[#c9c4b4]">{d.d}</div>
                    <div className="mt-1 truncate font-mono text-[11px] font-semibold text-[#f0ecdd]">{d.trades ? fmtMoney(d.pnl) : '—'}</div>
                    <div className="truncate text-[9px] text-[#8a8577]">{t('ana.tradesN', { n: d.trades })}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link to="/app/terminal-pro" className="tb-card tb-card-hover p-5">
            <div className="flex items-center gap-2"><CandlestickChart className="h-5 w-5 text-[#d4af37]" /><h2 className="font-semibold text-[#f0ecdd]">{t('ana.advCharts')}</h2></div>
            <p className="mt-2 text-sm text-[#8a8577]">{t('ana.openCharts')}</p>
            <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#d4af37]">{t('ana.openCharts')} <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
          <Link to="/app/indicators" className="tb-card tb-card-hover p-5">
            <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-[#d4af37]" /><h2 className="font-semibold text-[#f0ecdd]">{t('ana.techInd')}</h2></div>
            <p className="mt-2 text-sm text-[#8a8577]">{t('ana.fullStudio')}</p>
            <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#d4af37]">{t('ana.fullStudio')} <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
          <Link to="/app/heatmaps" className="tb-card tb-card-hover p-5">
            <div className="flex items-center gap-2"><Grid2x2 className="h-5 w-5 text-[#d4af37]" /><h2 className="font-semibold text-[#f0ecdd]">{t('ana.mktHm')}</h2></div>
            <p className="mt-2 text-sm text-[#8a8577]">{t('ana.exploreHm')}</p>
            <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#d4af37]">{t('ana.exploreHm')} <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        </div>

        <Card className="p-4 sm:p-6">
          <SectionHead title={t('ana.monthBreak')} sub={t('ana.monthBreakSub')} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-[#8a8577]">
                <th className="py-2">{t('ana.thMonth')}</th><th className="py-2 text-right">{t('ana.thNetPnl')}</th><th className="py-2 text-right">{t('ana.thReturn')}</th><th className="py-2 text-right">{t('ana.thResult')}</th>
              </tr></thead>
              <tbody>
                {stats.monthly.map((m) => (
                  <tr key={m.m} className="border-t border-white/5">
                    <td className="py-2.5 text-[#e9e7df]">{m.m}</td>
                    <td className={`py-2.5 text-right font-mono ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(m.pnl)}</td>
                    <td className="py-2.5 text-right font-mono text-[#c9c4b4]">{((m.pnl / 100000) * 100).toFixed(2)}%</td>
                    <td className="py-2.5 text-right">{m.pnl >= 0 ? <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">{t('ana.profit')}</span> : <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-400">{t('ana.loss')}</span>}</td>
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
