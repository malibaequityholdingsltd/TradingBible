import React, { useMemo, useState } from 'react';
import {
  Search, Download, ArrowUpRight, ArrowDownRight, Plug, RefreshCw,
  Eye, Calendar, Target, Smile, BookOpen, SlidersHorizontal, X,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { MARKETS, fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import pb from '@/lib/pocketbaseClient';
import { syncAllBrokers } from '@/lib/brokerSync';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useI18n } from '@/lib/i18n';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { txt } from '@/lib/safeRender';
import { GoldButton, GhostButton, EmptyState, Card, Stat } from '@/components/ui-kit';
import EvaluationsPanel from '@/components/EvaluationsPanel';

const FIELD_DEFS = [
  { key: 'symbol', labelKey: 'jou.f_symbol', fallback: 'Symbol' },
  { key: 'market', labelKey: 'jou.f_market', fallback: 'Market' },
  { key: 'direction', labelKey: 'jou.f_direction', fallback: 'Direction' },
  { key: 'entry', labelKey: 'jou.f_entry', fallback: 'Entry' },
  { key: 'exit', labelKey: 'jou.f_exit', fallback: 'Exit' },
  { key: 'sl', labelKey: 'jou.f_sl', fallback: 'Stop loss' },
  { key: 'tp', labelKey: 'jou.f_tp', fallback: 'Take profit' },
  { key: 'size', labelKey: 'jou.f_size', fallback: 'Size' },
  { key: 'risk', labelKey: 'jou.f_risk', fallback: 'Risk' },
  { key: 'pnl', labelKey: 'jou.f_pnl', fallback: 'P&L' },
  { key: 'strategy', labelKey: 'jou.f_strategy', fallback: 'Strategy' },
  { key: 'emotion', labelKey: 'jou.f_emotion', fallback: 'Emotion' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return txt(value, '—');
  return n.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return fmtMoney(Number(value));
}

function SidePill({ direction }) {
  const value = String(direction || '').toLowerCase();
  const isLong = value.startsWith('l') || value === 'buy';
  return (
    <span className={`ex-side-pill ${isLong ? 'ex-side-pill--long' : 'ex-side-pill--short'}`}>
      {isLong ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {txt(direction, '—')}
    </span>
  );
}

export default function JournalPage() {
  const { trades, loading, reload } = useTrades();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const { t } = useI18n();
  const syncOnly = settings.enforceBrokerSync !== false;
  const [q, setQ] = useState('');
  const [market, setMarket] = useState('All');
  const [direction, setDirection] = useState('All');
  const [emotion, setEmotion] = useState('All');
  const [source, setSource] = useState('All');
  const [viewing, setViewing] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const stats = useMemo(() => computeStats(trades), [trades]);
  const strategyWinRates = useMemo(() => {
    const map = {};
    (stats?.strategies || []).forEach((strategy) => { map[strategy.name] = strategy.winRate; });
    return map;
  }, [stats]);

  const rows = useMemo(() => trades.filter((trade) => (
    (market === 'All' || txt(trade.market, '') === market) &&
    (direction === 'All' || txt(trade.direction, '').toLowerCase() === direction.toLowerCase()) &&
    (emotion === 'All' || txt(trade.emotion, '') === emotion) &&
    (source === 'All' || txt(trade.source, '') === source) &&
    (txt(trade.symbol, '').toLowerCase().includes(q.toLowerCase()) ||
      txt(trade.strategy, '').toLowerCase().includes(q.toLowerCase()) ||
      txt(trade.emotion, '').toLowerCase().includes(q.toLowerCase()) ||
      txt(trade.notes, '').toLowerCase().includes(q.toLowerCase()))
  )), [trades, q, market, direction, emotion, source]);

  const exportCsv = () => {
    const head = 'Symbol,Market,Direction,Entry,Exit,Size,PnL,Strategy,Emotion,Source,Date';
    const body = rows.map((trade) => [
      trade.symbol, trade.market, trade.direction, trade.entry, trade.exit, trade.size,
      trade.pnl, trade.strategy, trade.emotion, trade.source, trade.tradeDate,
    ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tradingbible-journal.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [taxBusy, setTaxBusy] = useState(false);
  const exportTax = async () => {
    setTaxBusy(true);
    try {
      const res = await fetch(`/hcgi/api/tax/csv?year=${new Date().getFullYear()}`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) throw new Error('tax export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradingbible-tax-${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'destructive', title: 'Tax export failed' });
    } finally {
      setTaxBusy(false);
    }
  };

  const syncBrokers = async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      const res = await syncAllBrokers(user.id);
      if (res.accounts === 0) {
        toast({ title: 'No brokers connected', description: 'Connect a broker to sync your trades.' });
      } else {
        toast({ title: 'Brokers synced', description: `Pulled ${res.added} trades from ${res.accounts} account(s).` });
        reload();
      }
    } catch (err) {
      toast({ title: 'Sync failed', description: err?.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const emotions = useMemo(() => ['All', ...new Set(trades.map((trade) => txt(trade.emotion, '')).filter(Boolean))], [trades]);
  const sources = useMemo(() => ['All', ...new Set(trades.map((trade) => txt(trade.source, '')).filter(Boolean))], [trades]);

  const resetFilters = () => {
    setQ('');
    setMarket('All');
    setDirection('All');
    setEmotion('All');
    setSource('All');
  };

  return (
    <AppLayout title={t('nav.journal')}>
      <div className="ex-page">
        <header className="ex-page-head">
          <div className="ex-page-head__copy">
            <span className="ex-kicker">Trade record</span>
            <h1 className="ex-page-title">Journal</h1>
            <p className="ex-page-sub">Every fill, note and outcome. Filter the record, export it, or send it to SI for review.</p>
          </div>
          <div className="ex-page-actions">
            <GhostButton onClick={exportCsv}><Download /> Export</GhostButton>
            <GhostButton onClick={exportTax} disabled={taxBusy}><Download /> {taxBusy ? 'Preparing…' : 'Tax CSV'}</GhostButton>
            <GoldButton onClick={syncBrokers} disabled={syncing}>
              <RefreshCw className={syncing ? 'animate-spin' : ''} /> {syncing ? t('jrn.syncing', null, 'Syncing…') : t('jrn.syncBrokers', null, 'Sync brokers')}
            </GoldButton>
          </div>
        </header>

        {stats && (
          <div className="ex-stat-grid ex-stat-grid--4 ex-journal__stats">
            <Stat label="Net P&L" value={money(stats.balance - 100000)} tone={stats.balance >= 100000 ? 'ex-up' : 'ex-down'} />
            <Stat label="Win rate" value={`${stats.winRate}%`} />
            <Stat label="Profit factor" value={stats.profitFactor.toFixed(2)} />
            <Stat label="Trades" value={stats.totalTrades} />
          </div>
        )}

        <div className="ex-journal__toolbar">
          <div className="ex-search ex-journal__search">
            <Search />
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t('jrn.search', null, 'Search symbol, strategy, emotion or notes')} />
            {q && <button type="button" onClick={() => setQ('')} className="ex-icon-btn h-5 w-5" aria-label="Clear search"><X className="h-3 w-3" /></button>}
          </div>
          <select value={market} onChange={(event) => setMarket(event.target.value)} className="ex-select w-auto min-w-[110px]">
            {['All', ...MARKETS].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={direction} onChange={(event) => setDirection(event.target.value)} className="ex-select w-auto min-w-[110px]">
            {['All', 'Long', 'Short', 'Buy', 'Sell'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button type="button" onClick={() => setFiltersOpen((value) => !value)} className={`ex-btn ex-btn--secondary ex-btn--sm${filtersOpen ? ' is-active' : ''}`}>
            <SlidersHorizontal /> Filters
          </button>
          {(q || market !== 'All' || direction !== 'All' || emotion !== 'All' || source !== 'All') && (
            <button type="button" onClick={resetFilters} className="ex-btn ex-btn--ghost ex-btn--sm">Reset</button>
          )}
          <span className="ml-auto text-[10px] text-[var(--ex-muted)]">{rows.length} of {trades.length} trades</span>
          {syncOnly && <span className="ex-badge ex-badge--accent">{t('jrn.syncOnly', null, 'Broker sync enforced')}</span>}
        </div>

        {filtersOpen && (
          <div className="ex-card mb-3 flex flex-wrap items-end gap-2 p-3">
            <label className="min-w-[140px] flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">
              Emotion
              <select value={emotion} onChange={(event) => setEmotion(event.target.value)} className="ex-select mt-1">
                {emotions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="min-w-[140px] flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">
              Source
              <select value={source} onChange={(event) => setSource(event.target.value)} className="ex-select mt-1">
                {sources.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <div className="text-[10px] text-[var(--ex-muted)]">
              Showing {rows.length} of {trades.length} recorded trades.
            </div>
          </div>
        )}

        {loading ? (
          <Card className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--ex-muted)]">
            <RefreshCw className="h-4 w-4 animate-spin" /> {t('jrn.loadingTrades', null, 'Loading trades…')}
          </Card>
        ) : trades.length === 0 ? (
          <Card>
            <EmptyState
              icon={Plug}
              title={t('jrn.noTrades', null, 'No trades recorded yet')}
              sub={t('jrn.noTradesSub', null, 'Connect a broker or log your first trade to start building the record.')}
              action={<GoldButton to="/app/brokers">{t('jrn.connectBroker', null, 'Connect broker')}</GoldButton>}
            />
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon={Search} title={t('jrn.noMatch', null, 'No trades match those filters')} sub="Clear the search or widen the market and direction filters." action={<GhostButton onClick={resetFilters}>Reset filters</GhostButton>} />
          </Card>
        ) : (
          <Card>
            <div className="ex-table-wrap">
              <table className="ex-table ex-table--cards">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Size</th>
                    <th>P&amp;L</th>
                    <th>Strategy</th>
                    <th>Tags</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trade) => {
                    const pnl = Number(trade.pnl || 0);
                    return (
                      <tr key={trade.id} onClick={() => setViewing(trade)} className="cursor-pointer">
                        <td data-label="Date" className="ex-muted">{formatDate(trade.tradeDate)}</td>
                        <td data-label="Symbol" className="ex-table__main">
                          <span className="flex items-center gap-1.5">
                            {txt(trade.symbol, '—')}
                            {trade.source ? <span className="ex-faint text-[9px]">{trade.source}</span> : null}
                          </span>
                        </td>
                        <td data-label="Side"><SidePill direction={trade.direction} /></td>
                        <td data-label="Entry" className="ex-table__num">{formatNumber(trade.entry)}</td>
                        <td data-label="Exit" className="ex-table__num">{formatNumber(trade.exit)}</td>
                        <td data-label="Size" className="ex-table__num">{formatNumber(trade.size)}</td>
                        <td data-label="P&L" className={`ex-table__num font-semibold ${pnl >= 0 ? 'ex-up' : 'ex-down'}`}>{money(pnl)}</td>
                        <td data-label="Strategy">
                          <span className="ex-muted">{txt(trade.strategy, '—')}</span>
                          {trade.strategy && strategyWinRates[trade.strategy] != null && (
                            <span className="ml-1.5 text-[9px] text-[var(--ex-accent)]">{strategyWinRates[trade.strategy]}%</span>
                          )}
                        </td>
                        <td data-label="Tags">
                          <span className="flex flex-wrap gap-1">
                            {trade.emotion ? <span className="ex-tag"><Smile className="mr-0.5 h-2.5 w-2.5" />{trade.emotion}</span> : null}
                            {trade.market ? <span className="ex-tag">{trade.market}</span> : null}
                            {trade.notes ? <span className="ex-tag"><BookOpen className="mr-0.5 h-2.5 w-2.5" />Note</span> : null}
                          </span>
                        </td>
                        <td data-label="Details">
                          <button type="button" onClick={(event) => { event.stopPropagation(); setViewing(trade); }} className="ex-icon-btn h-7 w-7" aria-label="View trade details">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="mt-3">
          <EvaluationsPanel />
        </div>

        <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="tb-card max-h-[85vh] max-w-lg overflow-y-auto border-[var(--ex-line)] bg-[var(--ex-panel)] text-[var(--ex-text)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[var(--ex-text)]">
                <span className="ex-mono text-[15px]">{txt(viewing?.symbol, 'Trade')}</span>
                <span className="text-[var(--ex-muted)]">/</span>
                <span className="text-[12px] font-medium text-[var(--ex-muted)]">{t('jou.details', null, 'Trade details')}</span>
              </DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {FIELD_DEFS.map(({ key, labelKey, fallback }) => (
                  <div key={key} className="rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">{t(labelKey, null, fallback)}</div>
                    <div className={`ex-mono mt-1 ${key === 'pnl' ? ((viewing.pnl || 0) >= 0 ? 'ex-up' : 'ex-down') : 'text-[var(--ex-text)]'}`}>
                      {txt(viewing[key], '—')}
                    </div>
                  </div>
                ))}
                <div className="col-span-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2.5">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">{t('jou.notes', null, 'Notes')}</div>
                  <div className="mt-1 whitespace-pre-wrap text-[var(--ex-text-2)]">{txt(viewing.notes, '—')}</div>
                </div>
                <div className="col-span-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2.5">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--ex-muted)]">{t('jou.date', null, 'Date')}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[var(--ex-text-2)]"><Calendar className="h-3.5 w-3.5" /> {formatDate(viewing.tradeDate)}</div>
                </div>
                {viewing.strategy && (
                  <div className="col-span-2 flex items-center gap-2 rounded-[6px] border border-[var(--ex-line)] bg-[var(--ex-panel-2)] p-2.5 text-[11px] text-[var(--ex-muted)]">
                    <Target className="h-3.5 w-3.5 text-[var(--ex-accent)]" />
                    <span>{viewing.strategy}</span>
                    {strategyWinRates[viewing.strategy] != null && <span className="ml-auto ex-badge ex-badge--accent">{strategyWinRates[viewing.strategy]}% win</span>}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
