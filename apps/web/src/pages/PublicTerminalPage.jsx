import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CandlestickChart, Flame, Gauge, Grid2x2, History, Home, Layers,
  LockKeyhole, LogIn, Maximize2, Minimize2, Newspaper, PanelRight,
  ShieldCheck, X,
} from 'lucide-react';
import TradingBibleChart from '@/components/TradingBibleChart';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useQuotes } from '@/hooks/useQuotes';
import { ALL_SYMBOLS } from '@/lib/symbols';
import { TIMEFRAMES } from '@/lib/chartTimeframes';
import {
  TBFootprint, TBHeatmap, TBIndicators, TBNews, TBOrderflow,
} from '@/terminal/TradingBibleTerminal';
import ReplayPanel from '@/terminal/panels/ReplayPanel';

const PUBLIC_WATCHLIST = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'NAS100', 'SPX', 'AAPL', 'NVDA'];
const NAME_BY_SYMBOL = new Map(ALL_SYMBOLS.map((item) => [item.symbol, item.name]));

const TABS = [
  { id: 'chart', label: 'Chart', icon: CandlestickChart },
  { id: 'orderflow', label: 'Order Flow', icon: Layers },
  { id: 'footprint', label: 'Footprint', icon: Grid2x2 },
  { id: 'heatmap', label: 'Heatmap', icon: Flame },
  { id: 'replay', label: 'Replay', icon: History },
  { id: 'indicators', label: 'Indicators', icon: Gauge },
  { id: 'news', label: 'News & Calendar', icon: Newspaper },
];
const TAB_BY_ID = new Map(TABS.map((item) => [item.id, item]));

function nameOf(symbol) {
  return NAME_BY_SYMBOL.get(String(symbol || '').toUpperCase()) || '';
}

function fmtPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(n >= 1 ? 3 : 5);
}

function fmtChange(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function WatchRow({ symbol, quote, active, onSelect }) {
  const up = (Number(quote?.changePercent) || 0) >= 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(symbol)}
      aria-pressed={active}
      className={`flex w-full items-center gap-2 border-b border-white/[0.06] px-2.5 py-2 text-left transition last:border-b-0 ${active ? 'bg-[#d4af37]/10' : 'hover:bg-white/[0.035]'}`}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[9px] font-bold ${active ? 'bg-[#d4af37]/20 text-[#e8c95a]' : 'bg-white/[0.06] text-[#b8b3a3]'}`}>
        {String(symbol).slice(0, 3)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[10px] font-bold text-[#f0ecdd]">{symbol}</span>
        <span className="mt-0.5 block truncate text-[9px] text-[#8a8577]">{nameOf(symbol) || 'Market'}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[10px] text-[#e9e7df]">{fmtPrice(quote?.price)}</span>
        <span className={`mt-0.5 block font-mono text-[9px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{fmtChange(quote?.changePercent)}</span>
      </span>
    </button>
  );
}

export default function PublicTerminalPage() {
  const { isAuthed } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = String(params.get('symbol') || 'BTCUSD').toUpperCase();
  const initialTab = TABS.some((item) => item.id === params.get('view')) ? params.get('view') : 'chart';
  const [symbol, setSymbol] = useState(initial);
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState('candle');
  const [tab, setTab] = useState(initialTab);
  const [watchOpen, setWatchOpen] = useState(false);
  const [browserFull, setBrowserFull] = useState(false);
  const [watchSymbols, setWatchSymbols] = useState(() => (
    PUBLIC_WATCHLIST.includes(initial) ? PUBLIC_WATCHLIST : [initial, ...PUBLIC_WATCHLIST]
  ));

  const quoteSymbols = useMemo(() => [...new Set([symbol, ...watchSymbols])], [symbol, watchSymbols]);
  const { quotes, status } = useQuotes(quoteSymbols);
  const quote = quotes[symbol];
  const up = (Number(quote?.changePercent) || 0) >= 0;
  const activeTab = TAB_BY_ID.get(tab) || TABS[0];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const onChange = () => setBrowserFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleBrowserFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // iOS Safari and some embedded browsers do not expose the Fullscreen API.
    }
  }

  function syncParams(nextSymbol, nextTab) {
    setParams((current) => {
      const nextParams = new URLSearchParams(current);
      nextParams.set('symbol', nextSymbol);
      nextParams.set('view', nextTab);
      return nextParams;
    }, { replace: true });
  }

  function selectSymbol(next) {
    const normalized = String(next || '').toUpperCase();
    if (!normalized) return;
    setSymbol(normalized);
    setWatchSymbols((current) => (current.includes(normalized) ? current : [normalized, ...current].slice(0, 12)));
    setWatchOpen(false);
    syncParams(normalized, tab);
  }

  function selectTab(next) {
    setTab(next);
    setWatchOpen(false);
    syncParams(symbol, next);
  }

  const memberNext = (path) => (isAuthed ? path : `/login?next=${encodeURIComponent(path)}`);

  const watchlistContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2.5">
        <div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">Watchlist</div>
          <div className="mt-0.5 text-[9px] text-[#8a8577]">Public quotes · {watchSymbols.length} symbols</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${status === 'live' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.06] text-[#8a8577]'}`}>
            {status === 'live' ? 'Live' : status === 'loading' ? 'Loading' : 'Delayed'}
          </span>
          <button type="button" onClick={() => setWatchOpen(false)} aria-label="Close watchlist" className="grid h-6 w-6 place-items-center rounded border border-white/10 text-[#8a8577] hover:text-[#e9e7df] xl:hidden">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {watchSymbols.map((item) => (
          <WatchRow key={item} symbol={item} quote={quotes[item]} active={item === symbol} onSelect={selectSymbol} />
        ))}
      </div>
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
          <span className="text-[10px] font-bold text-[#e9e7df]">Read-only public desk</span>
        </div>
        <p className="mt-1.5 text-[9px] leading-relaxed text-[#8a8577]">
          No orders, funds movement or broker connection. Market data may be delayed or unavailable.
        </p>
        <Link
          to={memberNext('/app/terminal-pro')}
          className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-[#e8c95a] transition hover:border-[#d4af37]/45"
        >
          {isAuthed ? 'Open Terminal Pro' : 'Open member terminal'} <LockKeyhole className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-[#07070a] text-[#e9e7df]">
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-1.5 border-b border-white/[0.08] bg-[#0a0a0f]/95 px-2">
        <Link
          to="/terminal"
          aria-label="TradingBible public terminal"
          title="TradingBible public terminal"
          className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 transition hover:border-[#d4af37]/60"
        >
          <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-6 w-6 rounded object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        </Link>
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[11px] font-bold text-[#f0ecdd]">TradingBible</span>
            <span className="text-[11px] text-[#d4af37]">Terminal</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-300">Public</span>
          </div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#6f6a5e]">Read-only market workspace</div>
        </div>
        <div className="mx-1 hidden h-5 w-px shrink-0 bg-white/10 sm:block" />

        <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto" role="tablist" aria-label="Public terminal sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => selectTab(item.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold transition ${tab === item.id ? 'bg-[#d4af37]/15 text-[#e8c95a]' : 'text-[#8a8577] hover:bg-white/[0.04] hover:text-[#e9e7df]'}`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <span className={`hidden items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] lg:inline-flex ${status === 'live' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.06] text-[#8a8577]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'live' ? 'bg-emerald-400' : 'bg-[#8a8577]'}`} />
            {status === 'live' ? 'Feed live' : status === 'loading' ? 'Loading' : 'Delayed'}
          </span>
          <button
            type="button"
            onClick={() => setWatchOpen(true)}
            aria-label="Open watchlist"
            title="Watchlist"
            className="grid h-8 w-8 place-items-center rounded-md border border-[#d4af37]/15 text-[#8a8577] transition hover:text-[#e9e7df] xl:hidden"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            aria-label={browserFull ? 'Exit browser fullscreen' : 'Browser fullscreen'}
            title={browserFull ? 'Exit browser fullscreen' : 'Browser fullscreen'}
            className="hidden h-8 w-8 place-items-center rounded-md border border-[#d4af37]/15 text-[#8a8577] transition hover:text-[#e9e7df] sm:grid"
          >
            {browserFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <Link
            to="/"
            aria-label="Back to the public site"
            title="Back to the public site"
            className="grid h-8 w-8 place-items-center rounded-md border border-[#d4af37]/15 text-[#8a8577] transition hover:text-[#e9e7df]"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          <Link
            to={isAuthed ? '/app/terminal-pro' : '/login'}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#d4af37]/25 bg-[#d4af37]/10 px-2 text-[10px] font-semibold text-[#e8c95a] transition hover:border-[#d4af37]/50"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isAuthed ? 'Terminal Pro' : 'Sign in'}</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {tab === 'chart' && (
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#0c0c11] px-2 sm:hidden">
              <div className="min-w-0">
                <SymbolSearchPicker value={symbol} onChange={selectSymbol} buttonClassName="!py-1 !text-[10px]" />
              </div>
              <span className="min-w-0 truncate text-[9px] text-[#8a8577]">{nameOf(symbol)}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] font-bold text-[#f0ecdd]">{fmtPrice(quote?.price)}</span>
              <span className={`shrink-0 font-mono text-[9px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{fmtChange(quote?.changePercent)}</span>
            </div>
          )}
          {tab !== 'chart' && (
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#0c0c11] px-2.5">
              <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#d4af37]">{activeTab.label}</span>
              <span className="hidden shrink-0 font-mono text-[10px] text-[#8a8577] sm:inline">{symbol} · {timeframe}</span>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <SymbolSearchPicker value={symbol} onChange={selectSymbol} buttonClassName="!py-1 !text-[10px]" />
                <select
                  value={timeframe}
                  onChange={(event) => setTimeframe(event.target.value)}
                  aria-label="Terminal timeframe"
                  className="h-7 rounded-md border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 font-mono text-[10px] text-[#e9e7df] outline-none"
                >
                  {TIMEFRAMES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1">
            {tab === 'chart' && (
              <div className="h-full min-h-0">
                <TradingBibleChart
                  symbol={symbol}
                  timeframe={timeframe}
                  chartType={chartType}
                  quote={quote}
                  onSymbolChange={selectSymbol}
                  onTimeframeChange={setTimeframe}
                  onChartTypeChange={setChartType}
                  height="h-full"
                  hidePicker={false}
                  brandHref="/terminal"
                  publicMode
                  className="!h-full !rounded-none !border-0"
                />
              </div>
            )}
            {tab !== 'chart' && (
              <div className="h-full overflow-y-auto p-2 sm:p-3">
                {tab === 'orderflow' && <TBOrderflow symbol={symbol} />}
                {tab === 'footprint' && <TBFootprint symbol={symbol} onSymbolChange={selectSymbol} />}
                {tab === 'heatmap' && <TBHeatmap onSelect={(next) => selectSymbol(next?.symbol || next)} />}
                {tab === 'replay' && <ReplayPanel symbol={symbol} timeframe={timeframe} />}
                {tab === 'indicators' && <TBIndicators symbol={symbol} timeframe={timeframe} />}
                {tab === 'news' && <TBNews symbol={symbol} />}
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-[17rem] shrink-0 border-l border-white/[0.08] bg-[#0a0a0f] xl:flex xl:flex-col">
          {watchlistContent}
        </aside>
      </div>

      <footer className="relative z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-white/[0.08] bg-[#08080b] px-2.5 py-1.5 text-[9px] leading-4 text-[#777265] sm:text-[10px]">
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-[#b8b3a3]">Public terminal, not a public offering.</span> TradingBible Holdings. Inc. is a private, pre-IPO company. No public offering, no funds requested, and no approved SAFE, equity or token terms. Read-only market context, not financial advice.
        </span>
        <Link to="/terms" className="shrink-0 text-[#b8b3a3] underline-offset-2 hover:text-[#e8c95a] hover:underline">Terms</Link>
        <Link to="/terms#third-party-notices" className="shrink-0 text-[#b8b3a3] underline-offset-2 hover:text-[#e8c95a] hover:underline">Notices</Link>
        <Link to="/pricing" className="shrink-0 text-[#b8b3a3] underline-offset-2 hover:text-[#e8c95a] hover:underline">Plans</Link>
      </footer>

      {watchOpen && (
        <>
          <button
            type="button"
            aria-label="Close watchlist"
            onClick={() => setWatchOpen(false)}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm xl:hidden"
          />
          <aside className="fixed inset-y-0 right-0 z-[120] flex w-[min(20rem,88vw)] flex-col border-l border-[#d4af37]/20 bg-[#0a0a0f] shadow-2xl xl:hidden">
            <div className="min-h-0 flex-1">{watchlistContent}</div>
          </aside>
        </>
      )}
    </div>
  );
}
