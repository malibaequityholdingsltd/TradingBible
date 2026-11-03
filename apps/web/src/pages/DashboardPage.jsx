import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Bot, CandlestickChart,
  CreditCard, GraduationCap, LineChart, Plug, Plus, Radar, RefreshCw, Send, ShieldCheck,
  Sparkles, Target, Wallet,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { fmtMoney } from '@/lib/mockData';
import { useI18n } from '@/lib/i18n';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { useWallet } from '@/hooks/useWallet';
import { useQuotes } from '@/hooks/useQuotes';
import { useAuth } from '@/hooks/useAuth';
import DashboardWidgets from '@/components/DashboardWidgets';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AdSlot } from '@/lib/ads/components.jsx';
import { Card, EmptyState, GoldButton, GhostButton, SectionHead, Skeleton } from '@/components/ui-kit';

const MARKET_SYMBOLS = ['BTCUSD', 'ETHUSD', 'EURUSD', 'XAUUSD', 'NAS100', 'SPX500'];

function GuideBanner() {
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem('tb:guide-banner-hide') === '1'; } catch { return true; }
  });
  const [pct, setPct] = React.useState(null);

  React.useEffect(() => {
    if (dismissed) return;
    try {
      const manual = JSON.parse(localStorage.getItem('tb:guide-done-v1') || '[]');
      setPct(Array.isArray(manual) ? manual.length : 0);
    } catch { setPct(0); }
  }, [dismissed]);

  if (dismissed || pct === null || pct >= 24) return null;

  return (
    <div className="ex-card ex-guide-banner mb-3 p-3">
      <div className="ex-guide-banner__row">
        <span className="ex-empty__icon h-8 w-8 shrink-0"><Target className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-[var(--ex-text)]">New here? Run the Pro Guide.</div>
          <div className="mt-0.5 text-[10.5px] text-[var(--ex-muted)]">24 missions across the full portal — {pct}/24 done.</div>
        </div>
        <div className="ex-guide-banner__actions">
          <Link to="/app/guide" className="ex-btn ex-btn--secondary ex-btn--sm">Start guide</Link>
          <button
            type="button"
            onClick={() => { try { localStorage.setItem('tb:guide-banner-hide', '1'); } catch { /* ignore */ } setDismissed(true); }}
            className="ex-icon-btn h-7 w-7"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
      <div className="ex-guide-banner__row mt-2">
        <div className="ex-guide-banner__bar">
          <div className="h-full rounded-full bg-[var(--ex-accent)]" style={{ width: `${Math.min(100, (pct / 24) * 100)}%` }} />
        </div>
        <span className="ex-mono text-[9px] text-[var(--ex-faint)]">{pct}/24</span>
      </div>
    </div>
  );
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return fmtMoney(Number(value));
}

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 10) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 5 });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ex-card p-2 text-[10px] shadow-lg">
      <div className="text-[var(--ex-muted)]">{label}</div>
      <div className="ex-mono mt-0.5 font-semibold text-[var(--ex-text)]">{money(payload[0]?.value)}</div>
    </div>
  );
}

function MarketRow({ symbol, quote }) {
  const change = quote?.changePercent;
  const up = Number(change) >= 0;
  return (
    <Link to={`/app/terminal-pro?symbol=${encodeURIComponent(symbol)}`} className="ex-market-row">
      <span className="ex-market-row__symbol">
        <span className="ex-market-row__mark">{symbol.slice(0, 2)}</span>
        <span className="min-w-0">
          <span className="ex-market-row__name">{symbol}</span>
          <span className="ex-market-row__meta">{quote?.source || 'Live feed'}</span>
        </span>
      </span>
      <span className="ex-market-row__price">{formatPrice(quote?.price)}</span>
      <span className={`ex-market-row__change ${change == null ? 'ex-faint' : up ? 'ex-up' : 'ex-down'}`}>
        {change == null ? '—' : pct(change)}
      </span>
      <span className="ex-market-row__bar" aria-hidden>
        <i style={{ width: `${Math.min(100, Math.max(6, Math.abs(Number(change) || 0) * 12))}%`, background: up ? 'var(--ex-up)' : 'var(--ex-down)' }} />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { trades, loading } = useTrades();
  const { user } = useAuth();
  const { t } = useI18n();
  const { ledger, totalUsd, wallets, loading: walletLoading } = useWallet();
  const { quotes } = useQuotes(MARKET_SYMBOLS, { refreshMs: 30000 });
  const stats = useMemo(() => computeStats(trades), [trades]);

  const cash = Number(ledger?.balances?.USD || 0);
  const tbc = Number(ledger?.balances?.TBC || 0);
  const external = Number(totalUsd || 0);
  const total = cash + external;
  const openTrades = useMemo(() => trades.filter((trade) => !trade.closedAt && !trade.exit), [trades]);
  const recentTrades = useMemo(() => [...trades]
    .sort((a, b) => new Date(b.tradeDate || b.created || 0) - new Date(a.tradeDate || a.created || 0))
    .slice(0, 5), [trades]);

  const firstName = String(user?.name || user?.username || '').trim().split(/\s+/)[0] || 'Trader';
  const isSubscriber = user?.role === 'admin' || ['pro', 'elite', 'professional', 'teams'].includes((user?.plan || '').toLowerCase());

  if (loading) {
    return (
      <AppLayout title={t('nav.dashboard')}>
        <div className="ex-page">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-3 h-28 w-full" />
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('nav.dashboard')}>
      <div className="ex-page ex-dashboard">
        <header className="ex-page-head">
          <div className="ex-page-head__copy">
            <span className="ex-kicker">Portfolio overview</span>
            <h1 className="ex-page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}.</h1>
            <p className="ex-page-sub">Your balances, open risk, recent fills and the market tape in one place.</p>
          </div>
          <div className="ex-page-actions">
            <GoldButton to="/app/wallet?tab=cash"><Plus /> Deposit</GoldButton>
            <GhostButton to="/app/terminal-pro"><CandlestickChart /> Trade</GhostButton>
          </div>
        </header>

        <section className="ex-dashboard__account" aria-label="Account summary">
          <div className="ex-dashboard__balance">
            <div className="min-w-0">
              <div className="ex-dashboard__balance-label">
                <Wallet className="h-3.5 w-3.5" /> Total balance
              </div>
              <div className="ex-dashboard__balance-value">{walletLoading ? '—' : money(total)}</div>
              <div className="ex-dashboard__balance-sub">
                <span>Cash <strong className="ex-mono text-[var(--ex-text)]">{money(cash)}</strong></span>
                <span>TBC <strong className="ex-mono text-[var(--ex-text)]">{tbc.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
                <span>Tracked wallets <strong className="ex-mono text-[var(--ex-text)]">{money(external)}</strong></span>
                <span className="ex-faint">{wallets.length} wallet{wallets.length === 1 ? '' : 's'} linked</span>
              </div>
            </div>
            <div className="ex-dashboard__balance-actions">
              <Link to="/app/wallet?tab=cash" className="ex-btn ex-btn--primary ex-btn--sm"><ArrowDownToLine /> Deposit</Link>
              <Link to="/app/wallet?tab=cash" className="ex-btn ex-btn--secondary ex-btn--sm"><ArrowUpRight /> Withdraw</Link>
              <Link to="/app/wallet?tab=send" className="ex-btn ex-btn--secondary ex-btn--sm"><Send /> Send</Link>
              <Link to="/app/wallet?tab=crypto" className="ex-btn ex-btn--secondary ex-btn--sm"><RefreshCw /> Convert</Link>
            </div>
          </div>
          <div className="ex-dashboard__metrics">
            <div className="ex-dashboard__metric">
              <span>Net P&amp;L</span>
              <strong className={stats?.balance >= 100000 ? 'ex-up' : stats ? 'ex-down' : ''}>{stats ? money(stats.balance - 100000) : '—'}</strong>
            </div>
            <div className="ex-dashboard__metric">
              <span>Win rate</span>
              <strong>{stats ? `${stats.winRate}%` : '—'}</strong>
            </div>
            <div className="ex-dashboard__metric">
              <span>Profit factor</span>
              <strong>{stats ? stats.profitFactor.toFixed(2) : '—'}</strong>
            </div>
            <div className="ex-dashboard__metric">
              <span>Open positions</span>
              <strong>{openTrades.length}</strong>
            </div>
          </div>
        </section>

        <GuideBanner />

        <div className="ex-dashboard__grid">
          <div className="ex-dashboard__main">
            <Card>
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">Portfolio performance</div>
                  <div className="ex-card-sub">Equity curve from your recorded trades</div>
                </div>
                <div className="ex-segmented" aria-label="Chart range">
                  <span className="ex-tab is-active">All</span>
                  <span className="ex-tab">30D</span>
                  <span className="ex-tab">7D</span>
                </div>
              </div>
              <div className="ex-chart-box ex-chart-box--tall">
                {stats?.equity?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.equity} margin={{ left: -16, right: 8, top: 12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--ex-accent)" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="var(--ex-accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--ex-line)" strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: 'var(--ex-muted)', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis domain={[(min) => Math.floor(min - 1000), (max) => Math.ceil(max + 1000)]} tick={{ fill: 'var(--ex-muted)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} width={42} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="equity" stroke="var(--ex-accent)" strokeWidth={2} fill="url(#equityFill)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={LineChart}
                    title="No performance data yet"
                    sub="Connect a broker or record a trade to build your equity curve."
                    action={<GoldButton to="/app/brokers">Connect broker</GoldButton>}
                  />
                )}
              </div>
            </Card>

            <Card>
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">Open positions</div>
                  <div className="ex-card-sub">Live risk currently on the book</div>
                </div>
                <Link to="/app/terminal-pro" className="ex-btn ex-btn--ghost ex-btn--sm">Open terminal <ArrowRight /></Link>
              </div>
              {openTrades.length ? (
                <div className="ex-table-wrap">
                  <table className="ex-table ex-table--cards">
                    <thead>
                      <tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Size</th><th>P&amp;L</th><th>Opened</th></tr>
                    </thead>
                    <tbody>
                      {openTrades.slice(0, 6).map((trade) => {
                        const pnl = Number(trade.pnl || 0);
                        return (
                          <tr key={trade.id}>
                            <td data-label="Symbol" className="ex-table__main">{trade.symbol || '—'}</td>
                            <td data-label="Side"><span className={`ex-side-pill ${String(trade.direction).toLowerCase() === 'short' ? 'ex-side-pill--short' : 'ex-side-pill--long'}`}>{trade.direction || 'long'}</span></td>
                            <td data-label="Entry" className="ex-table__num">{formatPrice(trade.entry)}</td>
                            <td data-label="Size" className="ex-table__num">{trade.size ?? '—'}</td>
                            <td data-label="P&L" className={`ex-table__num ${pnl >= 0 ? 'ex-up' : 'ex-down'}`}>{money(pnl)}</td>
                            <td data-label="Opened" className="ex-muted">{trade.openedAt ? new Date(trade.openedAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={Plug}
                  title="No open positions"
                  sub="Connect a broker to sync live positions, or log a trade manually in the journal."
                  action={<GhostButton to="/app/brokers">Connect broker</GhostButton>}
                />
              )}
            </Card>

            <Card>
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">Market watch</div>
                  <div className="ex-card-sub">Live quotes · refreshes every 30 seconds</div>
                </div>
                <Link to="/app/signals" className="ex-btn ex-btn--ghost ex-btn--sm">All markets <ArrowRight /></Link>
              </div>
              <div>
                {MARKET_SYMBOLS.map((symbol) => (
                  <MarketRow key={symbol} symbol={symbol} quote={quotes[symbol]} />
                ))}
              </div>
            </Card>
          </div>

          <aside className="ex-dashboard__side">
            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div className="ex-card-title">Quick actions</div>
              </div>
              <div className="ex-card-body pt-0">
                <div className="ex-quick-grid">
                  <Link to="/app/wallet?tab=cash" className="ex-quick-action"><ArrowDownToLine /> Deposit</Link>
                  <Link to="/app/wallet?tab=cash" className="ex-quick-action"><ArrowUpRight /> Withdraw</Link>
                  <Link to="/app/wallet?tab=send" className="ex-quick-action"><Send /> Send</Link>
                  <Link to="/app/wallet?tab=crypto" className="ex-quick-action"><RefreshCw /> Convert</Link>
                  <Link to="/app/journal" className="ex-quick-action"><BookOpen /> Journal</Link>
                  <Link to="/app/alerts" className="ex-quick-action"><Radar /> Alerts</Link>
                  <Link to="/app/academy" className="ex-quick-action"><GraduationCap /> Academy</Link>
                  <Link to="/app/coach" className="ex-quick-action"><Bot /> SI Coach</Link>
                </div>
              </div>
            </Card>

            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div>
                  <div className="ex-card-title">SI insight</div>
                  <div className="ex-card-sub">Your coach, grounded in your record</div>
                </div>
                <Sparkles className="h-4 w-4 text-[var(--ex-accent)]" />
              </div>
              <div className="ex-card-body pt-0">
                <p className="text-[11.5px] leading-relaxed text-[var(--ex-text-2)]">
                  Ask SI to review your last 20 trades, pressure-test a setup, or turn a losing week into a repeatable checklist.
                </p>
                <Link to="/app/coach" className="ex-btn ex-btn--secondary ex-btn--sm mt-3 w-full">Open SI Coach <ArrowRight /></Link>
              </div>
            </Card>

            <Card>
              <div className="ex-card-head">
                <div>
                  <div className="ex-card-title">Recent activity</div>
                  <div className="ex-card-sub">Latest journal entries</div>
                </div>
                <Link to="/app/journal" className="ex-btn ex-btn--ghost ex-btn--sm">View all</Link>
              </div>
              {recentTrades.length ? recentTrades.map((trade) => {
                const pnl = Number(trade.pnl || 0);
                return (
                  <Link key={trade.id} to="/app/journal" className="ex-activity-row">
                    <span className="ex-activity-row__main">
                      <strong>{trade.symbol || 'Trade'} <span className={`ex-side-pill ${String(trade.direction).toLowerCase() === 'short' ? 'ex-side-pill--short' : 'ex-side-pill--long'}`}>{trade.direction || 'long'}</span></strong>
                      <span>{trade.tradeDate ? new Date(trade.tradeDate).toLocaleDateString() : '—'} · {trade.strategy || 'No strategy'}</span>
                    </span>
                    <span className={`ex-activity-row__value ${pnl >= 0 ? 'ex-up' : 'ex-down'}`}>{money(pnl)}</span>
                  </Link>
                );
              }) : (
                <div className="ex-empty min-h-[140px]">
                  <span className="ex-empty__icon"><BookOpen /></span>
                  <strong>No trades recorded</strong>
                  <p>Your journal entries will appear here.</p>
                </div>
              )}
            </Card>

            <Card>
              <div className="ex-card-head ex-card-head--plain">
                <div className="ex-card-title">Account health</div>
              </div>
              <div className="ex-card-body pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-[var(--ex-muted)]"><ShieldCheck className="h-3.5 w-3.5" /> Security</span>
                    <span className="ex-badge ex-badge--up">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-[var(--ex-muted)]"><CreditCard className="h-3.5 w-3.5" /> Plan</span>
                    <span className="ex-badge">{isSubscriber ? (user?.plan || 'Pro') : 'Free'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 text-[var(--ex-muted)]"><BarChart3 className="h-3.5 w-3.5" /> Broker links</span>
                    <span className="ex-badge">{wallets.length ? `${wallets.length} linked` : 'None'}</span>
                  </div>
                </div>
                {!isSubscriber && (
                  <Link to="/pricing" className="ex-btn ex-btn--primary ex-btn--sm mt-3 w-full">Upgrade plan</Link>
                )}
              </div>
            </Card>
          </aside>
        </div>

        <ErrorBoundary fallback={null}>
          <AdSlot placementId="ph_dashboard_top" />
        </ErrorBoundary>

        <div className="mt-3">
          <DashboardWidgets />
        </div>
      </div>
    </AppLayout>
  );
}
