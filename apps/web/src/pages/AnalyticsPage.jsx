import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid, Legend,
} from 'recharts';
import { Plug, CandlestickChart, Grid2x2, Gauge, ArrowRight, BarChart3, ShieldCheck, Activity } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import { fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { Card, SectionHead, EmptyState, GoldButton, Stat, Tabs } from '@/components/ui-kit';

const ACCENT = 'var(--ex-accent)';
const GREEN = 'var(--ex-up)';
const RED = 'var(--ex-down)';
const GRID = 'var(--ex-line)';
const TXT = 'var(--ex-muted)';

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ex-card p-2 text-[10px] shadow-lg">
      <div className="text-[var(--ex-muted)]">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="ex-mono mt-0.5 font-semibold" style={{ color: item.color || ACCENT }}>
          {prefix}{Number(item.value).toLocaleString()}{suffix}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { trades, loading } = useTrades();
  const [tab, setTab] = useState('overview');
  const DOW = [t('ana.mon', null, 'Mon'), t('ana.tue', null, 'Tue'), t('ana.wed', null, 'Wed'), t('ana.thu', null, 'Thu'), t('ana.fri', null, 'Fri'), t('ana.sat', null, 'Sat'), t('ana.sun', null, 'Sun')];
  const stats = useMemo(() => computeStats(trades), [trades]);

  const derived = useMemo(() => {
    if (!stats) return null;
    let peak = -Infinity;
    const drawdown = stats.equity.map((point) => {
      peak = Math.max(peak, point.equity);
      return { day: point.day, dd: +(((point.equity - peak) / peak) * 100).toFixed(2) };
    });
    const monthlyReturns = stats.monthly.map((month) => ({ m: month.m, ret: +((month.pnl / 100000) * 100).toFixed(2) }));
    const chrono = [...trades].sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
    const buckets = [];
    for (let i = 0; i < chrono.length; i += 5) {
      const slice = chrono.slice(i, i + 5);
      const wins = slice.filter((trade) => (trade.pnl || 0) > 0).length;
      buckets.push({ b: `#${i + 1}-${i + slice.length}`, winRate: Math.round((wins / slice.length) * 100) });
    }
    const dow = DOW.map((day) => ({ d: day, pnl: 0, trades: 0 }));
    trades.forEach((trade) => {
      const idx = (new Date(trade.tradeDate).getDay() + 6) % 7;
      dow[idx].pnl += trade.pnl || 0;
      dow[idx].trades++;
    });
    const wins = trades.filter((trade) => (trade.pnl || 0) > 0).length;
    const losses = trades.length - wins;
    const donut = [
      { name: t('ana.wins', null, 'Wins'), value: wins, fill: GREEN },
      { name: t('ana.losses', null, 'Losses'), value: losses, fill: RED },
    ];
    return { drawdown, monthlyReturns, buckets, dow, donut, wins, losses };
  }, [stats, trades, t, DOW]);

  if (loading) {
    return (
      <AppLayout title={t('ana.pageTitle', null, 'Analytics')}>
        <div className="ex-page">
          <div className="ex-stat-grid ex-stat-grid--4">{[0, 1, 2, 3].map((i) => <div key={i} className="ex-skeleton h-20" />)}</div>
          <div className="ex-skeleton mt-3 h-80" />
        </div>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout title={t('ana.pageTitle', null, 'Analytics')}>
        <div className="ex-page">
          <header className="ex-page-head">
            <div className="ex-page-head__copy">
              <span className="ex-kicker">Performance</span>
              <h1 className="ex-page-title">Analytics</h1>
              <p className="ex-page-sub">Understand the edge behind the record — expectancy, drawdown, consistency and where the money is made.</p>
            </div>
          </header>
          <Card>
            <EmptyState
              icon={Plug}
              title={t('ana.noDataTitle', null, 'No analytics yet')}
              sub={t('ana.noDataSub', null, 'Connect a broker or log trades to unlock performance analytics.')}
              action={<GoldButton to="/app/brokers">{t('ana.connectBroker', null, 'Connect broker')}</GoldButton>}
            />
          </Card>
        </div>
      </AppLayout>
    );
  }

  const maxAbsPnl = Math.max(1, ...derived.dow.map((day) => Math.abs(day.pnl)));

  return (
    <AppLayout title={t('ana.pageTitle', null, 'Analytics')}>
      <div className="ex-page">
        <header className="ex-page-head">
          <div className="ex-page-head__copy">
            <span className="ex-kicker">Performance</span>
            <h1 className="ex-page-title">Analytics</h1>
            <p className="ex-page-sub">Expectancy, drawdown, consistency and where the money is made across {stats.totalTrades} recorded trades.</p>
          </div>
          <div className="ex-page-actions">
            <Link to="/app/reports" className="ex-btn ex-btn--secondary ex-btn--sm"><BarChart3 /> Reports</Link>
            <Link to="/app/journal" className="ex-btn ex-btn--primary ex-btn--sm">Open journal <ArrowRight /></Link>
          </div>
        </header>

        <div className="ex-stat-grid ex-stat-grid--4">
          <Stat label={t('ana.winRate', null, 'Win rate')} value={`${stats.winRate}%`} tone="ex-up" />
          <Stat label={t('ana.profitFactor', null, 'Profit factor')} value={stats.profitFactor.toFixed(2)} />
          <Stat label={t('ana.maxDd', null, 'Max drawdown')} value={`${stats.drawdown}%`} tone="ex-down" />
          <Stat label={t('ana.totalTrades', null, 'Total trades')} value={stats.totalTrades} />
        </div>

        <div className="mt-3">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'risk', label: 'Risk', icon: ShieldCheck },
              { id: 'breakdown', label: 'Breakdown', icon: Grid2x2 },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === 'overview' && (
          <>
            <div className="ex-grid-2 mt-3">
              <Card className="ex-card--pad">
                <SectionHead title={t('ana.equity', null, 'Equity curve')} sub={t('ana.equitySub', null, 'Chronological balance from your journal')} />
                <div className="ex-chart-box ex-chart-box--tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.equity} margin={{ left: -16, right: 8, top: 8 }}>
                      <defs><linearGradient id="anaEq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={22} />
                      <YAxis tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} width={42} />
                      <Tooltip content={<ChartTooltip prefix="$" />} />
                      <Area type="monotone" dataKey="equity" stroke={ACCENT} strokeWidth={2} fill="url(#anaEq)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="ex-card--pad">
                <SectionHead title={t('ana.wlSplit', null, 'Win / loss split')} sub={t('ana.wlSub', { w: derived.wins, l: derived.losses }, `${derived.wins} wins · ${derived.losses} losses`)} />
                <div className="ex-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="58%" outerRadius="100%" data={derived.donut} startAngle={90} endAngle={-270}>
                      <RadialBar background={{ fill: 'var(--ex-panel-3)' }} dataKey="value" cornerRadius={4} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 10, color: 'var(--ex-muted)' }} />
                      <Tooltip content={<ChartTooltip />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ex-muted)]">Wins</div>
                    <div className="ex-mono mt-0.5 text-[16px] font-semibold ex-up">{derived.wins}</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ex-muted)]">Losses</div>
                    <div className="ex-mono mt-0.5 text-[16px] font-semibold ex-down">{derived.losses}</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="ex-grid-2 mt-3">
              <Card className="ex-card--pad">
                <SectionHead title={t('ana.dd', null, 'Drawdown')} sub={t('ana.ddSub', null, 'Peak-to-trough decline')} />
                <div className="ex-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={derived.drawdown} margin={{ left: -16, right: 8, top: 8 }}>
                      <defs><linearGradient id="anaDd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0} /><stop offset="100%" stopColor={RED} stopOpacity={0.32} /></linearGradient></defs>
                      <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={22} />
                      <YAxis tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} width={38} />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Area type="monotone" dataKey="dd" stroke={RED} strokeWidth={2} fill="url(#anaDd)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="ex-card--pad">
                <SectionHead title={t('ana.monthlyRet', null, 'Monthly returns')} sub={t('ana.monthlyRetSub', null, 'Return on starting balance')} />
                <div className="ex-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={derived.monthlyReturns} margin={{ left: -18, right: 8, top: 8 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="m" tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} width={38} />
                      <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: 'var(--ex-panel-2)' }} />
                      <Bar dataKey="ret" radius={[3, 3, 0, 0]}>{derived.monthlyReturns.map((entry, index) => <Cell key={index} fill={entry.ret >= 0 ? GREEN : RED} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === 'risk' && (
          <>
            <div className="ex-grid-2 mt-3">
              <Card className="ex-card--pad">
                <SectionHead title={t('ana.wlTrend', null, 'Win-rate trend')} sub={t('ana.wlTrendSub', null, 'Rolling five-trade buckets')} />
                <div className="ex-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived.buckets} margin={{ left: -18, right: 8, top: 8 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="b" tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: TXT, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} width={38} />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Line type="monotone" dataKey="winRate" stroke={ACCENT} strokeWidth={2} dot={{ r: 2.5, fill: ACCENT }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="ex-card--pad">
                <SectionHead title={t('ana.perfHm', null, 'Day-of-week performance')} sub={t('ana.perfHmSub', null, 'Net P&L by weekday')} />
                <div className="ex-heat-grid pt-2">
                  {derived.dow.map((day) => {
                    const intensity = Math.abs(day.pnl) / maxAbsPnl;
                    const background = day.trades === 0
                      ? 'var(--ex-panel-2)'
                      : day.pnl >= 0
                        ? `color-mix(in srgb, var(--ex-up) ${Math.round(10 + intensity * 34)}%, var(--ex-panel))`
                        : `color-mix(in srgb, var(--ex-down) ${Math.round(10 + intensity * 34)}%, var(--ex-panel))`;
                    return (
                      <div key={day.d} className="ex-heat-cell" style={{ background }}>
                        <span>{day.d}</span>
                        <strong>{day.trades ? fmtMoney(day.pnl) : '—'}</strong>
                        <span className="!text-[7px]">{day.trades} trades</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ex-muted)]">Max DD</div>
                    <div className="ex-mono mt-0.5 text-[15px] font-semibold ex-down">{stats.drawdown}%</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ex-muted)]">Profit factor</div>
                    <div className="ex-mono mt-0.5 text-[15px] font-semibold">{stats.profitFactor.toFixed(2)}</div>
                  </div>
                  <div className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--ex-muted)]">Trader score</div>
                    <div className="ex-mono mt-0.5 text-[15px] font-semibold">{stats.traderScore}/100</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="ex-card--pad mt-3">
              <SectionHead title="Risk rules" sub="A quick read on whether the record is behaving like a system or a series of impulses." />
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ['Drawdown under control', stats.drawdown > -10, `${stats.drawdown}% peak-to-trough`],
                  ['Positive expectancy', stats.profitFactor >= 1.5, `${stats.profitFactor.toFixed(2)} profit factor`],
                  ['Consistent win rate', stats.winRate >= 50, `${stats.winRate}% of trades`],
                ].map(([label, pass, note]) => (
                  <div key={label} className="flex items-start gap-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2.5">
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${pass ? 'bg-[color-mix(in_srgb,var(--ex-up)_14%,transparent)] text-[var(--ex-up)]' : 'bg-[color-mix(in_srgb,var(--ex-down)_14%,transparent)] text-[var(--ex-down)]'}`}>{pass ? '✓' : '!'}</span>
                    <span>
                      <span className="block text-[11px] font-semibold text-[var(--ex-text)]">{label}</span>
                      <span className="mt-0.5 block text-[9.5px] text-[var(--ex-muted)]">{note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {tab === 'breakdown' && (
          <>
            <Card className="mt-3">
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">{t('ana.monthBreak', null, 'Monthly breakdown')}</div>
                  <div className="ex-card-sub">{t('ana.monthBreakSub', null, 'Net P&L and return by month')}</div>
                </div>
              </div>
              <div className="ex-table-wrap">
                <table className="ex-table ex-table--cards">
                  <thead><tr><th>{t('ana.thMonth', null, 'Month')}</th><th>{t('ana.thNetPnl', null, 'Net P&L')}</th><th>{t('ana.thReturn', null, 'Return')}</th><th>{t('ana.thResult', null, 'Result')}</th></tr></thead>
                  <tbody>
                    {stats.monthly.map((month) => (
                      <tr key={month.m}>
                        <td data-label="Month" className="ex-table__main">{month.m}</td>
                        <td data-label="Net P&L" className={`ex-table__num ${month.pnl >= 0 ? 'ex-up' : 'ex-down'}`}>{fmtMoney(month.pnl)}</td>
                        <td data-label="Return" className="ex-table__num">{((month.pnl / 100000) * 100).toFixed(2)}%</td>
                        <td data-label="Result"><span className={`ex-badge ${month.pnl >= 0 ? 'ex-badge--up' : 'ex-badge--down'}`}>{month.pnl >= 0 ? t('ana.profit', null, 'Profit') : t('ana.loss', null, 'Loss')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="mt-3">
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">Strategy performance</div>
                  <div className="ex-card-sub">Win rate and net P&L by strategy</div>
                </div>
              </div>
              <div className="ex-table-wrap">
                <table className="ex-table ex-table--cards">
                  <thead><tr><th>Strategy</th><th>Trades</th><th>Win rate</th><th>Net P&amp;L</th></tr></thead>
                  <tbody>
                    {stats.strategies.map((strategy) => (
                      <tr key={strategy.name}>
                        <td data-label="Strategy" className="ex-table__main">{strategy.name}</td>
                        <td data-label="Trades" className="ex-table__num">{strategy.trades}</td>
                        <td data-label="Win rate" className="ex-table__num">{strategy.winRate}%</td>
                        <td data-label="Net P&L" className={`ex-table__num ${strategy.pnl >= 0 ? 'ex-up' : 'ex-down'}`}>{fmtMoney(strategy.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <div className="ex-grid-3 mt-3">
          <Link to="/app/terminal-pro" className="ex-card ex-card--pad ex-card--hover">
            <div className="flex items-center gap-2"><CandlestickChart className="h-4 w-4 text-[var(--ex-accent)]" /><h2 className="ex-card-title">{t('ana.advCharts', null, 'Advanced charts')}</h2></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ex-muted)]">{t('ana.openCharts', null, 'Open the full chart workspace with drawings, layouts and live quotes.')}</p>
            <span className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-[var(--ex-accent)]">Open terminal <ArrowRight className="h-3 w-3" /></span>
          </Link>
          <Link to="/app/indicators" className="ex-card ex-card--pad ex-card--hover">
            <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-[var(--ex-accent)]" /><h2 className="ex-card-title">{t('ana.techInd', null, 'Technical indicators')}</h2></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ex-muted)]">{t('ana.fullStudio', null, 'Build and inspect indicator studies in the full studio.')}</p>
            <span className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-[var(--ex-accent)]">Open studio <ArrowRight className="h-3 w-3" /></span>
          </Link>
          <Link to="/app/heatmaps" className="ex-card ex-card--pad ex-card--hover">
            <div className="flex items-center gap-2"><Grid2x2 className="h-4 w-4 text-[var(--ex-accent)]" /><h2 className="ex-card-title">{t('ana.mktHm', null, 'Market heatmaps')}</h2></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ex-muted)]">{t('ana.exploreHm', null, 'Explore five markets as living bubbles.')}</p>
            <span className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-[var(--ex-accent)]">Explore heatmaps <ArrowRight className="h-3 w-3" /></span>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
