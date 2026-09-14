import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Download, ArrowUpRight, ArrowDownRight, Plug, RefreshCw,
  Eye, Calendar, Target, Smile,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { MARKETS, fmtMoney } from '@/lib/mockData';
import { useTrades, computeStats } from '@/hooks/useTrades';
import { syncAllBrokers } from '@/lib/brokerSync';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettings } from '@/lib/platformSettings';
import { useI18n } from '@/lib/i18n';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const FIELD_DEFS = [
  { key: 'symbol', labelKey: 'jou.f_symbol' },
  { key: 'market', labelKey: 'jou.f_market' },
  { key: 'direction', labelKey: 'jou.f_direction' },
  { key: 'entry', labelKey: 'jou.f_entry' },
  { key: 'exit', labelKey: 'jou.f_exit' },
  { key: 'sl', labelKey: 'jou.f_sl' },
  { key: 'tp', labelKey: 'jou.f_tp' },
  { key: 'size', labelKey: 'jou.f_size' },
  { key: 'risk', labelKey: 'jou.f_risk' },
  { key: 'pnl', labelKey: 'jou.f_pnl' },
  { key: 'strategy', labelKey: 'jou.f_strategy' },
  { key: 'emotion', labelKey: 'jou.f_emotion' },
];

function TradeCard({ trade, strategyWinRate, onView }) {
  const { t } = useI18n();
  const isLong = (trade.direction || '').toLowerCase().startsWith('l') || (trade.direction || '').toLowerCase() === 'buy';
  const isProfit = (trade.pnl || 0) >= 0;
  return (
    <button onClick={() => onView(trade)} className="glass glass-hover flex flex-col rounded-2xl p-3 text-left sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-base font-bold tracking-tight text-[#f0ecdd] sm:text-lg">{trade.symbol}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8a8577] sm:text-xs">{trade.market || '—'}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${
            isLong ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border-red-400/30 bg-red-400/10 text-red-400'
          }`}
        >
          {isLong ? <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
          {trade.direction || '—'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-2.5 sm:mt-4 sm:gap-3 sm:p-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6a665a] sm:text-[10px]">{t('jou.f_entry')}</div>
          <div className="font-mono text-xs text-[#c9c4b4] sm:text-sm">{trade.entry ?? '—'}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6a665a] sm:text-[10px]">{t('jou.f_exit')}</div>
          <div className="font-mono text-xs text-[#c9c4b4] sm:text-sm">{trade.exit ?? '—'}</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between sm:mt-3">
        <span className="text-[11px] text-[#8a8577] sm:text-xs">{t('jou.pnl')}</span>
        <span className={`font-mono text-base font-bold sm:text-lg ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(trade.pnl || 0)}</span>
      </div>

      {strategyWinRate != null && (
        <div className="mt-2.5 sm:mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-[#6a665a] sm:text-[10px]">
            <span>{t('jou.stratWin')}</span>
            <span className="text-[#d4af37]">{strategyWinRate}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#f4e6a8] to-[#c99a25]" style={{ width: `${strategyWinRate}%` }} />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2">
        {trade.strategy && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/5 px-1.5 py-0.5 text-[10px] text-[#d4af37] sm:px-2 sm:py-1 sm:text-[11px]">
            <Target className="h-3 w-3" /> {trade.strategy}
          </span>
        )}
        {trade.emotion && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[#c9c4b4] sm:px-2 sm:py-1 sm:text-[11px]">
            <Smile className="h-3 w-3" /> {trade.emotion}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#6a665a] sm:mt-3 sm:text-[11px]">
        <Calendar className="h-3 w-3" /> {trade.tradeDate ? String(trade.tradeDate).slice(0, 10) : '—'}
        {trade.source && <span className="ml-1 text-[#5f5b50]">· {trade.source}</span>}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-white/5 pt-2.5 text-[11px] text-[#c9c4b4] sm:pt-3 sm:text-xs">
        <Eye className="h-3.5 w-3.5" /> View details
      </div>
    </button>
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
  const [viewing, setViewing] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const stats = useMemo(() => computeStats(trades), [trades]);
  const strategyWinRates = useMemo(() => {
    const map = {};
    (stats?.strategies || []).forEach((s) => { map[s.name] = s.winRate; });
    return map;
  }, [stats]);

  const rows = useMemo(() => trades.filter((t) =>
    (market === 'All' || t.market === market) &&
    (direction === 'All' || (t.direction || '').toLowerCase() === direction.toLowerCase()) &&
    ((t.symbol || '').toLowerCase().includes(q.toLowerCase()) || (t.strategy || '').toLowerCase().includes(q.toLowerCase()) || (t.emotion || '').toLowerCase().includes(q.toLowerCase()))
  ), [trades, q, market, direction]);

  const exportCsv = () => {
    const head = 'Symbol,Market,Direction,Entry,Exit,PnL,Strategy,Emotion,Source,Date';
    const body = rows.map((t) => [t.symbol, t.market, t.direction, t.entry, t.exit, t.pnl, t.strategy, t.emotion, t.source, t.tradeDate].join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tradingbible-journal.csv'; a.click(); URL.revokeObjectURL(url);
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

  return (
    <AppLayout title={t('nav.journal')}>
      <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex min-w-[150px] flex-1 items-center gap-2 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#8a8577]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('jrn.search')} className="w-full bg-transparent text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none" />
        </div>
        <select value={market} onChange={(e) => setMarket(e.target.value)} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none">
          {['All', ...MARKETS].map((m) => <option key={m} className="bg-[#0f0f14]">{m}</option>)}
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value)} className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2 text-sm text-[#e9e7df] outline-none">
          {['All', 'Long', 'Short', 'Buy', 'Sell'].map((d) => <option key={d} className="bg-[#0f0f14]">{d}</option>)}
        </select>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/15 px-3 py-2 text-sm text-[#c9c4b4] transition hover:border-[#d4af37]/40"><Download className="h-4 w-4" /> <span className="hidden sm:inline">{t('jou.export')}</span></button>
        <button onClick={syncBrokers} disabled={syncing} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-4 py-2 text-sm font-semibold text-[#0a0a0f] transition hover:opacity-90 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? t('jrn.syncing') : t('jrn.syncBrokers')}
        </button>
        {syncOnly && <span className="rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-3 py-1.5 text-[11px] font-medium text-[#d4af37]">{t('jrn.syncOnly')}</span>}
      </div>

      {loading ? (
        <div className="glass flex items-center justify-center gap-2 rounded-2xl py-16 text-sm text-[#8a8577]"><RefreshCw className="h-4 w-4 animate-spin" /> {t('jrn.loadingTrades')}</div>
      ) : trades.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d4af37]/12 text-[#d4af37]"><Plug className="h-6 w-6" /></div>
          <h3 className="text-lg font-semibold text-[#f0ecdd]">{t('jrn.noTrades')}</h3>
          <p className="mt-2 max-w-md text-sm text-[#8a8577]">{t('jrn.noTradesSub')}</p>
          <Link to="/app/brokers" className="mt-5 rounded-xl bg-gradient-to-r from-[#f4e6a8] to-[#c99a25] px-5 py-2.5 text-sm font-semibold text-[#0a0a0f]">{t('jrn.connectBroker')}</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center text-sm text-[#8a8577]">{t('jrn.noMatch')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              strategyWinRate={t.strategy ? strategyWinRates[t.strategy] : null}
              onView={setViewing}
            />
          ))}
        </div>
      )}

      {/* View details dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="glass max-h-[85vh] max-w-md overflow-y-auto border-[#d4af37]/20 bg-[#0c0c11] text-[#e9e7df]">
          <DialogHeader>
            <DialogTitle className="text-[#f0ecdd]">
              <span className="font-mono">{viewing?.symbol}</span> {t('jou.details')}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {FIELD_DEFS.map(({ key, labelKey }) => (
                <div key={key} className="rounded-lg bg-white/[0.03] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#6a665a]">{t(labelKey)}</div>
                  <div className={`mt-0.5 font-mono ${key === 'pnl' ? ((viewing.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-[#e9e7df]'}`}>
                    {viewing[key] ?? '—'}
                  </div>
                </div>
              ))}
              <div className="col-span-2 rounded-lg bg-white/[0.03] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6a665a]">{t('jou.notes')}</div>
                <div className="mt-0.5 text-[#c9c4b4]">{viewing.notes || '—'}</div>
              </div>
              <div className="col-span-2 rounded-lg bg-white/[0.03] p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6a665a]">{t('jou.date')}</div>
                <div className="mt-0.5 text-[#c9c4b4]">{viewing.tradeDate ? String(viewing.tradeDate).slice(0, 10) : '—'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
