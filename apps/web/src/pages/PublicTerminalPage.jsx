import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BarChart3, Bell, CandlestickChart, Check,
  Flame, Gauge, Grid2x2, History, Layers, LockKeyhole, Newspaper,
  ShieldCheck,
} from 'lucide-react';
import PublicSiteShell, {
  PublicNotice, PublicPageHead, PublicSection,
} from '@/components/PublicSiteShell';
import { Card, GhostButton, GoldButton } from '@/components/ui-kit';
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
      className={`flex w-full items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5 text-left transition last:border-b-0 ${active ? 'bg-[#d4af37]/10' : 'hover:bg-white/[0.035]'}`}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold ${active ? 'bg-[#d4af37]/20 text-[#e8c95a]' : 'bg-white/[0.06] text-[#b8b3a3]'}`}>
        {String(symbol).slice(0, 3)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[11px] font-bold text-[#f0ecdd]">{symbol}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[#8a8577]">{nameOf(symbol) || 'Market'}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[11px] text-[#e9e7df]">{fmtPrice(quote?.price)}</span>
        <span className={`mt-0.5 block font-mono text-[10px] font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{fmtChange(quote?.changePercent)}</span>
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
  const [watchSymbols, setWatchSymbols] = useState(() => (
    PUBLIC_WATCHLIST.includes(initial) ? PUBLIC_WATCHLIST : [initial, ...PUBLIC_WATCHLIST]
  ));

  const quoteSymbols = useMemo(() => [...new Set([symbol, ...watchSymbols])], [symbol, watchSymbols]);
  const { quotes, status } = useQuotes(quoteSymbols);
  const quote = quotes[symbol];
  const up = (Number(quote?.changePercent) || 0) >= 0;

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
    syncParams(normalized, tab);
  }

  function selectTab(next) {
    setTab(next);
    syncParams(symbol, next);
  }

  const memberNext = (path) => (isAuthed ? path : `/login?next=${encodeURIComponent(path)}`);

  return (
    <PublicSiteShell>
      <PublicPageHead
        eyebrow="Public chart terminal"
        title={<>The chart is open. <span className="tb-gold-text">No account required.</span></>}
        description="A chart-first public desk with order flow, footprint, heatmap, replay, indicators and news. Search 240+ symbols, draw on the chart and arrange the tools in one workspace. The member terminal adds saved workspaces, alerts, broker sync and the full trading desk."
        meta={['No sign-up required', 'Read-only public desk', 'Private company · pre-IPO']}
        actions={(
          <>
            {isAuthed ? (
              <GoldButton to="/app/terminal-pro">Open full Terminal Pro <ArrowRight className="h-4 w-4" /></GoldButton>
            ) : (
              <GoldButton to="/pricing">See member plans <ArrowRight className="h-4 w-4" /></GoldButton>
            )}
            {isAuthed
              ? <GhostButton to="/app" className="border px-5 py-3 text-[#e9e7df]">Back to the app</GhostButton>
              : <GhostButton to="/login" className="border px-5 py-3 text-[#e9e7df]">Member sign in</GhostButton>}
          </>
        )}
      />

      <PublicSection className="!pb-8 !pt-8 sm:!pt-10" eyebrow="Public desk" title="One workspace. Every public surface." sub="The chart is the default. Move between the public desks without losing the symbol, and use the member terminal for account, order and saved-workspace controls.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <Card className="overflow-hidden rounded-2xl border-[#d4af37]/20 p-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] bg-[#0c0c11]/95 px-3 py-2.5">
              <Link
                to="/terminal"
                aria-label="TradingBible public terminal"
                title="TradingBible public terminal"
                className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#d4af37]/25 bg-[#d4af37]/10 transition hover:border-[#d4af37]/60"
              >
                <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-6 w-6 rounded object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-bold text-[#f0ecdd]">TradingBible Public Terminal</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">Public</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#8a8577]">
                  <span className="font-mono text-[#d8d3c3]">{symbol}</span>
                  <span>{nameOf(symbol)}</span>
                  <span className={`font-mono font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>{fmtChange(quote?.changePercent)}</span>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${status === 'live' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.06] text-[#8a8577]'}`}>
                {status === 'live' ? 'Feed live' : status === 'loading' ? 'Loading' : 'Feed delayed'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] bg-black/20 px-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Public terminal sections">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    onClick={() => selectTab(item.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${tab === item.id ? 'bg-[#d4af37]/15 text-[#e8c95a]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
              {tab !== 'chart' && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <SymbolSearchPicker value={symbol} onChange={selectSymbol} buttonClassName="!py-1 !text-[11px]" />
                  <select
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value)}
                    aria-label="Terminal timeframe"
                    className="h-7 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 font-mono text-[11px] text-[#e9e7df] outline-none"
                  >
                    {TIMEFRAMES.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="min-h-[420px] p-2 sm:p-3">
              {tab === 'chart' && (
                <TradingBibleChart
                  symbol={symbol}
                  timeframe={timeframe}
                  chartType={chartType}
                  quote={quote}
                  onSymbolChange={selectSymbol}
                  onTimeframeChange={setTimeframe}
                  onChartTypeChange={setChartType}
                  height="h-[clamp(420px,62vh,760px)]"
                  hidePicker={false}
                  brandHref="/terminal"
                  publicMode
                />
              )}
              {tab === 'orderflow' && <TBOrderflow symbol={symbol} />}
              {tab === 'footprint' && <TBFootprint symbol={symbol} onSymbolChange={selectSymbol} />}
              {tab === 'heatmap' && <TBHeatmap onSelect={(next) => selectSymbol(next?.symbol || next)} />}
              {tab === 'replay' && <ReplayPanel symbol={symbol} timeframe={timeframe} />}
              {tab === 'indicators' && <TBIndicators symbol={symbol} timeframe={timeframe} />}
              {tab === 'news' && <TBNews symbol={symbol} />}
            </div>
          </Card>

          <div className="grid content-start gap-3">
            <Card className="overflow-hidden rounded-2xl border-[#d4af37]/20 p-0">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#d4af37]">Watchlist</span>
                <span className="text-[9px] text-[#8a8577]">Public quotes</span>
              </div>
              <div>
                {watchSymbols.map((item) => (
                  <WatchRow key={item} symbol={item} quote={quotes[item]} active={item === symbol} onSelect={selectSymbol} />
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border-[#d4af37]/20 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#d4af37]" />
                <h3 className="text-sm font-bold text-[#f0ecdd]">Public desk</h3>
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#b8b3a3]">
                {[
                  'Chart, order flow, footprint, heatmap and replay',
                  'Indicators, drawings, compare and public watchlist',
                  'News, calendar events and live channels',
                ].map((item) => (
                  <li key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{item}</li>
                ))}
              </ul>
              <div className="my-3 h-px bg-white/[0.07]" />
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-[#8a8577]" />
                <h3 className="text-sm font-bold text-[#f0ecdd]">Member desk</h3>
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#8a8577]">
                {[
                  'Saved layouts, alerts and broker sync',
                  'Order ticket, positions, risk and DOM',
                  'Options data, Pine scripts and full news desk',
                ].map((item) => (
                  <li key={item} className="flex gap-2"><span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-[#8a8577]" />{item}</li>
                ))}
              </ul>
              <Link to={isAuthed ? '/app/terminal-pro' : '/pricing'} className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-3 py-2 text-[11px] font-semibold text-[#e8c95a] transition hover:border-[#d4af37]/45">
                {isAuthed ? 'Open full Terminal Pro' : 'See member plans'} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Card>

            <Card className="rounded-2xl border-[#d4af37]/20 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
                <h3 className="text-sm font-bold text-[#f0ecdd]">Read-only by design</h3>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#8a8577]">
                This page does not place orders, move funds or connect a brokerage account. It is market context, not a recommendation or a promise of performance.
              </p>
            </Card>

            <Card className="rounded-2xl border-[#d4af37]/20 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#d4af37]" />
                <h3 className="text-sm font-bold text-[#f0ecdd]">More tools</h3>
              </div>
              <div className="mt-3 grid gap-1.5 text-[11px]">
                {[
                  ['Price alerts', memberNext('/app/alerts')],
                  ['Broker trading', memberNext('/app/terminal-pro')],
                  ['Options data', '/features/market-data'],
                  ['Community scripts', '/community'],
                  ['Calendar', '/app/economic-calendar'],
                  ['Help center', '/faq'],
                ].map(([label, to]) => (
                  <Link key={label} to={to} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-2.5 py-2 text-[#b8b3a3] transition hover:border-[#d4af37]/30 hover:text-[#e8c95a]">
                    {label}<ArrowUpRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-4">
          <PublicNotice>
            <strong className="text-[#e9e7df]">Public terminal, not a public offering.</strong> No account is required to read this chart. TradingBible is a private company; no public offering is open, no funds are requested and no SAFE, equity or token terms are approved. Market data may be delayed or unavailable; when a feed fails the chart shows an error rather than a fabricated price.
          </PublicNotice>
        </div>
      </PublicSection>
    </PublicSiteShell>
  );
}
