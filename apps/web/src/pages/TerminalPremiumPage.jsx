// TradingBible Terminal™ Premium — desk design.
// One workstation, three zones: slim command strip with desk switcher,
// left instrument rail (watchlist · account · risk), center stage with
// floating toolbar, full-width data dock. Black/gold identity kept.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CandlestickChart, Layers, Grid2x2, ListOrdered, History,
  Bell, CircleDot, Save, Tv, Camera, Plus, X, ArrowUpRight,
  Square, Columns2, ChevronDown, Newspaper, Gauge, Share2,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui-kit';
import { useQuotes } from '@/hooks/useQuotes';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlists } from '@/hooks/useWatchlists';
import { ALL_SYMBOLS } from '@/lib/symbols';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { brandLogo } from '@/lib/brand';
import TradingBibleTerminal, { TBChart, TBOrderflow, TBFootprint, TBHeatmap, TBNews, TBIndicators, Attribution, hasFeature } from '@/terminal/TradingBibleTerminal';
import { usePremiumWorkspace } from '@/terminal/premiumStore';
import AccountPanel from '@/terminal/panels/AccountPanel';
import RiskPanel from '@/terminal/panels/RiskPanel';
import DomPanel from '@/terminal/panels/DomPanel';
import ReplayPanel from '@/terminal/panels/ReplayPanel';
import BottomDock from '@/terminal/panels/BottomDock';
import CommandPalette from '@/terminal/panels/CommandPalette';

const CENTER_TABS = [
  { id: 'chart', label: 'Chart', icon: CandlestickChart, feature: 'charts' },
  { id: 'orderflow', label: 'Order Flow', icon: Layers, feature: 'orderflow' },
  { id: 'footprint', label: 'Footprint', icon: Grid2x2, feature: 'footprint' },
  { id: 'heatmap', label: 'Heatmap', icon: Grid2x2, feature: 'heatmap' },
  { id: 'dom', label: 'DOM', icon: ListOrdered, feature: 'dom' },
  { id: 'replay', label: 'Replay', icon: History, feature: 'replay' },
  { id: 'indicators', label: 'Indicators', icon: Gauge, feature: 'indicators' },
  { id: 'news', label: 'News', icon: Newspaper, feature: 'news' },
];

const TFS = ['1m', '5m', '15m', '1h', '4h', '1d'];
const fmtPx = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 5 }));

// Deep links from the focused pages land here with ?symbol=XXX.
const FULL_VIEW = {
  orderflow: () => '/app/orderflow',
  footprint: () => '/app/orderflow',
  heatmap: () => '/app/heatmaps',
  dom: () => '/app/orderflow',
  replay: () => '/app/backtest',
  indicators: (symbol) => `/app/indicators?symbol=${encodeURIComponent(symbol)}`,
  news: () => '/tv',
};

// Multi-chart desk layouts.
const CHART_LAYOUTS = [
  { id: 'single', icon: Square },
  { id: 'split', icon: Columns2 },
  { id: 'quad', icon: Grid2x2 },
];
const QUAD_DEFAULTS = [
  { symbol: 'BTCUSD', tf: '1h' },
  { symbol: 'ETHUSD', tf: '1h' },
  { symbol: 'XAUUSD', tf: '4h' },
  { symbol: 'EURUSD', tf: '1h' },
];

function SectionTitle({ children, right }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="h-4 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#f4e6a8] to-[#a67c1e]" aria-hidden />
      <span className="term-label term-faint flex-1">{children}</span>
      {right}
    </div>
  );
}

export default function TerminalPremiumPage() {
  const { user } = useAuth();
  const { workspace, patch, versions, saveVersion, restoreVersion, loadPreset, cloudStatus } = usePremiumWorkspace({ autosave: true, restoreWorkspace: true });
  const { symbol, timeframe, chartType, centerTab, watchlist, features } = workspace;
  const [params] = useSearchParams();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [chartLayout, setChartLayout] = useState('single'); // single | split | quad
  const [panes, setPanes] = useState(QUAD_DEFAULTS);
  const setPane = (i, patchPane) => setPanes((ps) => ps.map((pn, j) => (j === i ? { ...pn, ...patchPane } : pn)));
  const splitPanes = [{ symbol, tf: timeframe }, panes[1] || QUAD_DEFAULTS[1]];
  const quadPanes = panes.slice(0, 4);
  const [verOpen, setVerOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const log = (m) => setLogs((l) => [...l, `${new Date().toLocaleTimeString()} ${m}`].slice(-50));

  // One list system for the terminal family: the rail mirrors the user's
  // default named watchlist (managed on /app/watchlists) when signed in
  // with a non-empty list; otherwise the local workspace list.
  const { lists, addSymbol, removeSymbol } = useWatchlists();
  const managedList = lists.find((l) => l.isDefault) || lists[0] || null;
  const managedSyms = Array.isArray(managedList?.symbols) ? managedList.symbols : [];
  const stripSyms = managedSyms.length ? managedSyms : watchlist;
  const addToStrip = (ns) => {
    const s = String(ns || '').toUpperCase();
    if (!s) return;
    if (managedSyms.length && managedList) {
      if (!managedSyms.includes(s)) { addSymbol(managedList.id, s).catch(() => {}); patch({ symbol: s }); }
      else patch({ symbol: s });
    } else if (!watchlist.includes(s)) {
      patch({ watchlist: [...watchlist, s], symbol: s });
    } else patch({ symbol: s });
  };
  const removeFromStrip = (s) => {
    if (managedSyms.length && managedList) {
      removeSymbol(managedList.id, s).catch(() => {});
      if (s === symbol && managedSyms.length > 1) patch({ symbol: managedSyms.find((x) => x !== s) });
    } else if (watchlist.length > 1) {
      patch({ watchlist: watchlist.filter((x) => x !== s), ...(s === symbol ? { symbol: watchlist.find((x) => x !== s) } : {}) });
    }
  };

  // Deep links (?view=…&symbol=…) from the sidebar and sibling pages.
  // Param-reactive (not once-on-mount) so sidebar links switch views even
  // when already on Terminal Pro; in-page tab clicks never touch the URL,
  // so the workspace is never fought.
  const viewParam = (params.get('view') || '').toLowerCase();
  const symParam = (params.get('symbol') || '').toUpperCase();
  useEffect(() => {
    const valid = ['chart', 'orderflow', 'footprint', 'heatmap', 'dom', 'replay', 'indicators', 'news'];
    const feat = viewParam === 'chart' ? 'charts' : viewParam;
    if (valid.includes(viewParam) && viewParam !== centerTab && hasFeature(features, feat)) {
      patch({ centerTab: viewParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam]);
  useEffect(() => {
    if (symParam && symParam !== symbol && ALL_SYMBOLS.some((x) => x.symbol === symParam)) patch({ symbol: symParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symParam]);

  const { quotes, status } = useQuotes(stripSyms, { refreshMs: 15000 });
  const live = quotes[symbol];
  const price = live?.price;
  const up = (live?.changePercent ?? 0) >= 0;

  // ⌘K / Ctrl+K command palette, Esc closes overlays.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paperOrder = (o) => log(`paper ${o.side} ${o.qty} ${o.symbol} @ ${o.price} (simulated)`);

  // Share the terminal view: native share sheet where available, otherwise
  // copy the link (deep link carries symbol + view).
  const shareView = async () => {
    const url = `${window.location.origin}/app/terminal-pro?symbol=${encodeURIComponent(symbol)}&view=${encodeURIComponent(centerTab)}`;
    const text = `TradingBible Terminal — ${symbol} ${timeframe}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'TradingBible Terminal', text, url }); log('view shared'); return; }
      throw new Error('no-native-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        log('share link copied');
      } catch { log('share failed'); }
    }
  };

  const [snapFlash, setSnapFlash] = useState(false);
  const [snapBusy, setSnapBusy] = useState(false);
  const pageRef = useRef(null);
  // Display name: first + last name only (both compulsory at signup and
  // on profile save — never the username).
  const traderName = ([user?.first_name, user?.last_name].filter(Boolean).join(' ').trim());

  const snapJournal = async () => {
    // 1) Journal record (chart state + levels + account) — always saved.
    try {
      const snaps = JSON.parse(localStorage.getItem('tb:trade-snapshots:v1') || '[]');
      snaps.unshift({ id: `${Date.now()}`, symbol, timeframe, price, at: new Date().toISOString(), by: user?.id || 'anon' });
      localStorage.setItem('tb:trade-snapshots:v1', JSON.stringify(snaps.slice(0, 50)));
      log(`journal snapshot captured @ ${price ?? '—'}`);
    } catch { /* ignore */ }
    // 2) Full-page PNG export (unbranded screenshot).
    if (!pageRef.current) return;
    setSnapBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const dark = !document.documentElement.classList.contains('light');
      const dataUrl = await toPng(pageRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: dark ? '#0a0a0f' : '#f2efe7',
      });
      const a = document.createElement('a');
      a.download = `tradingbible-${symbol}-${timeframe}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.png`;
      a.href = dataUrl;
      a.click();
      setSnapFlash(true);
      setTimeout(() => setSnapFlash(false), 1800);
      log('page PNG downloaded');
    } catch (e) {
      log('PNG export failed — journal record kept');
    } finally {
      setSnapBusy(false);
    }
  };

  const visibleTabs = useMemo(() => CENTER_TABS.filter((t) => hasFeature(features, t.feature)), [features]);

  // Floating-cluster controls per view: symbol picker only where the view
  // follows the symbol, timeframe pills only where they refetch anything,
  // snapshot + share alone everywhere else (heatmap, news).
  const SYMBOL_TABS = ['chart', 'orderflow', 'footprint', 'dom', 'replay', 'indicators'];
  const TF_TABS = ['chart', 'indicators', 'replay'];
  const needsSymbol = SYMBOL_TABS.includes(centerTab);
  const needsTF = TF_TABS.includes(centerTab);
  const bareCluster = !needsSymbol && !needsTF;

  return (
    <AppLayout title="Terminal Pro">
      <TradingBibleTerminal symbol={symbol} account={{ id: workspace.risk.accountId }} features={features} autosave restoreWorkspace>
        <div ref={pageRef} className="tb-page tb-term !max-w-[1700px]">
          {/* ── Desk command strip ── */}
          <div className="term-panel no-scrollbar flex items-center gap-2 overflow-x-auto rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]/95 px-3 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#d4af37]/15">
              <img src={TRADINGBIBLE_LOGO} alt="TradingBible" className="h-9 w-9 rounded-xl object-contain" onError={(e) => { const el = e.currentTarget; if (!el.dataset.fb && brandLogo.urlRemote) { el.dataset.fb = '1'; el.src = brandLogo.urlRemote; } else { el.style.display = 'none'; } }} />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2">
              {traderName
                ? <span className="truncate text-sm font-bold text-[#f0ecdd]" title="Signed in trader">{traderName}</span>
                : <Link to="/app/profile" className="truncate text-sm font-bold text-[#d4af37] hover:underline" title="Add your first and last name">Add name</Link>}
            </div>
            <div className="my-1 hidden w-px self-stretch bg-white/8 sm:block" aria-hidden />
            <div className="shrink-0 leading-tight">
              <span className="term-data whitespace-nowrap font-mono text-xl font-bold text-[#f0ecdd]">{fmtPx(price)}</span>
              <span className={`term-data ml-2 whitespace-nowrap font-mono text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {live ? `${up ? '▲' : '▼'} ${up ? '+' : ''}${(live.changePercent ?? 0).toFixed(2)}%` : ''}
              </span>
              {live?.source === 'synthetic' && (
                <span title="Simulated price — no live feed for this symbol yet" className="ml-1.5 whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-bold text-[#8a8577]">
                  SIM
                </span>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8a8577]'}`}>
                <CircleDot className="h-3.5 w-3.5" /> {status === 'live' ? 'LIVE' : status.toUpperCase()}
              </span>
              <Link to="/app/alerts" aria-label="Alerts" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-[#8a8577] hover:text-[#d4af37]"><Bell className="h-5 w-5" /></Link>
            </div>
          </div>

          {/* ── Desk grid: rail + stage ── */}
          <div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-[21rem_minmax(0,1fr)]">
            {/* Left instrument rail */}
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <Card className="term-panel !p-4">
                <SectionTitle right={<Link to="/app/watchlists" className="text-xs font-semibold text-[#d4af37] hover:underline">Manage</Link>}>
                  Watchlist · {managedList ? managedList.name : 'local'}
                </SectionTitle>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-0.5">
                  {stripSyms.map((s) => {
                    const q = quotes[s];
                    const qUp = (q?.changePercent ?? 0) >= 0;
                    const active = s === symbol;
                    return (
                      <div key={s} className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${active ? 'term-row-active border-[#d4af37]/55 bg-[#d4af37]/[0.08]' : 'border-white/8 bg-black/20 hover:border-[#d4af37]/30'}`}>
                        <button onClick={() => patch({ symbol: s })} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                          <span className="truncate font-mono text-[13px] font-bold text-[#f0ecdd]">{s}</span>
                          <span className="term-data shrink-0 text-right font-mono text-xs">
                            <span className="block text-[#e9e7df]">{q ? fmtPx(q.price) : '—'}</span>
                            <span className={qUp ? 'text-emerald-400' : 'text-red-400'}>{q ? `${qUp ? '+' : ''}${(q.changePercent ?? 0).toFixed(2)}%` : ''}</span>
                          </span>
                        </button>
                        {stripSyms.length > 1 && (
                          <button aria-label={`Remove ${s}`} onClick={() => removeFromStrip(s)} className="hidden shrink-0 rounded-md p-1 text-[#8a8577] hover:text-red-400 group-hover:block">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1"><SymbolSearchPicker value="Add pair…" onChange={addToStrip} buttonClassName="w-full justify-between !py-2 text-[#8a8577]" /></div>
                </div>
                <p className="term-help term-faint mt-2">{cloudStatus === 'synced' ? 'Workspace saved ✓' : cloudStatus === 'syncing' ? 'Saving workspace…' : 'Workspace autosaves on this device'}</p>
              </Card>

              <Card className="term-panel !p-4">
                <SectionTitle right={workspace.risk.accountId ? <span className="font-mono text-xs text-[#d4af37]">filtered</span> : null}>Account</SectionTitle>
                <AccountPanel accountId={workspace.risk.accountId} onSelect={(aid) => patch({ risk: { ...workspace.risk, accountId: aid } })} />
              </Card>

              <Card className="term-panel !p-4">
                <SectionTitle>Risk</SectionTitle>
                <RiskPanel price={price} balance={0} />
              </Card>

              <Card className="term-panel !p-4">
                <button onClick={() => setVerOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
                  <span className="h-4 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#f4e6a8] to-[#a67c1e]" aria-hidden />
                  <span className="term-label term-faint flex-1">Versions ({versions.length})</span>
                  <ChevronDown className={`h-4 w-4 text-[#d4af37] transition ${verOpen ? 'rotate-180' : ''}`} />
                </button>
                {verOpen && (
                  <div className="mt-2.5">
                    <button onClick={() => { const n = window.prompt('Name this version (e.g. London Analysis, Before Entry):', ''); if (n !== null) { saveVersion(n); log('version saved'); } }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 px-3 py-2.5 text-sm font-semibold text-[#d4af37]">
                      <Save className="h-4 w-4" /> Save current as version
                    </button>
                    <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                      {versions.length === 0 && <p className="term-help term-faint">No versions yet.</p>}
                      {versions.map((v) => (
                        <div key={v.id} className="term-inset flex items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2.5">
                          <span className="min-w-0 flex-1 truncate text-sm text-[#c9c4b4]">{v.name}</span>
                          <button onClick={() => { restoreVersion(v.id); log(`restored ${v.name}`); }} className="shrink-0 text-sm font-semibold text-[#d4af37] hover:underline">Restore</button>
                        </div>
                      ))}
                    </div>
                    <Link to="/tv" className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-[#8a8577] hover:text-[#e9e7df]"><Tv className="h-4 w-4" /> Open TradingBible TV</Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Center stage */}
            <div className="min-w-0 space-y-4">
              <Card className="term-panel !p-4 sm:!p-5">
                <div className="tb-term-tabs" role="tablist" aria-label="Terminal views">
                  {visibleTabs.map((t) => (
                    <button key={t.id} role="tab" aria-selected={centerTab === t.id} onClick={() => patch({ centerTab: t.id })}
                      className={`tb-term-tab ${centerTab === t.id ? 'tb-term-tab--active' : ''}`}>
                      <t.icon className="h-4 w-4" /> {t.label}
                    </button>
                  ))}
                </div>
                {/* Floating glass toolbar over the stage */}
                <div className="relative mt-3 min-h-[380px] overflow-hidden rounded-xl border border-white/8 bg-black/30">
                  {centerTab === 'chart' && hasFeature(features, 'charts') && (
                    chartLayout === 'single'
                      ? <div className="p-2"><TBChart symbol={symbol} timeframe={timeframe} chartType={chartType} onSnapshot={snapJournal} onShare={shareView} onSymbolChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} /></div>
                      : (
                        <div className={`grid grid-cols-1 gap-2 p-2 ${chartLayout === 'quad' ? 'xl:grid-cols-2' : 'xl:grid-cols-2'}`}>
                          {(chartLayout === 'quad' ? quadPanes : splitPanes).map((pn, i) => (
                            <div key={i} className="min-w-0 rounded-lg border border-white/8 bg-black/40 p-2">
                              <div className="mb-1.5 flex items-center gap-1.5">
                                <div className="min-w-0 flex-1"><SymbolSearchPicker value={pn.symbol} onChange={(s) => setPane(i, { symbol: s })} buttonClassName="w-full justify-between !py-1 !text-[11px]" /></div>
                                <select value={pn.tf} onChange={(e) => setPane(i, { tf: e.target.value })} aria-label="Pane timeframe"
                                  className="rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-1.5 py-1 font-mono text-[11px] text-[#e9e7df] outline-none">
                                  {TFS.map((tf) => <option key={tf} value={tf} className="bg-[#0f0f14]">{tf}</option>)}
                                </select>
                              </div>
                              <TBChart symbol={pn.symbol} timeframe={pn.tf} chartType={chartType} onSnapshot={snapJournal} onShare={shareView} />
                            </div>
                          ))}
                        </div>
                      )
                  )}
                  {centerTab === 'orderflow' && hasFeature(features, 'orderflow') && <div className="p-2"><TBOrderflow symbol={symbol} /></div>}
                  {centerTab === 'footprint' && hasFeature(features, 'footprint') && <div className="p-2"><TBFootprint symbol={symbol} onSymbolChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} /></div>}
                  {centerTab === 'heatmap' && hasFeature(features, 'heatmap') && (
                    <div className="p-2"><TBHeatmap category={workspace.heatmap.category} period={workspace.heatmap.period} onSelect={(s) => patch({ symbol: s })} /></div>
                  )}
                  {centerTab === 'dom' && hasFeature(features, 'dom') && <div className="p-2"><DomPanel symbol={symbol} price={price} onPaperOrder={paperOrder} /></div>}
                  {centerTab === 'replay' && hasFeature(features, 'replay') && <div className="p-2"><ReplayPanel symbol={symbol} timeframe={timeframe} /></div>}
                  {centerTab === 'indicators' && hasFeature(features, 'indicators') && <div className="p-2"><TBIndicators symbol={symbol} timeframe={timeframe} /></div>}
                  {centerTab === 'news' && hasFeature(features, 'news') && <div className="p-2"><TBNews symbol={symbol} /></div>}
                  {/* Floating command cluster — pinned flush to the stage floor.
                      The stage clips overflow, so it can never pass the layout. */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3">
                    <div className="term-panel pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]/90 px-2.5 py-2 shadow-2xl backdrop-blur-xl">
                      {needsSymbol && (
                        <div className="w-28 shrink-0 sm:w-32">
                          <SymbolSearchPicker value={symbol} onChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} buttonClassName="w-full justify-between !py-1.5 !text-[11px]" />
                        </div>
                      )}
                      {needsTF && (
                      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 p-0.5">
                        {TFS.map((tf) => (
                          <button key={tf} onClick={() => patch({ timeframe: tf })}
                            className={`rounded-lg px-2 py-1.5 font-mono text-[11px] font-semibold ${timeframe === tf ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>{tf}</button>
                        ))}
                      </div>
                      )}
                      {centerTab === 'chart' && (
                        <>
                          <select value={chartType} onChange={(e) => patch({ chartType: e.target.value })} aria-label="Chart type"
                            className="rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1.5 text-xs text-[#e9e7df] outline-none">
                            {['candle', 'line', 'area'].map((ct) => <option key={ct} value={ct} className="bg-[#0f0f14]">{ct}</option>)}
                          </select>
                          <div className="flex items-center gap-0.5 rounded-xl border border-white/10 p-0.5" role="group" aria-label="Chart layout">
                            {CHART_LAYOUTS.map((l) => (
                              <button key={l.id} title={`${l.id} layout`} onClick={() => setChartLayout(l.id)}
                                className={`rounded-lg p-1.5 ${chartLayout === l.id ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}>
                                <l.icon className="h-3.5 w-3.5" />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <button onClick={snapJournal} disabled={snapBusy} title="Snapshot to journal + download page PNG"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-50">
                        <Camera className={`h-4 w-4 ${snapBusy ? 'animate-pulse' : ''}`} />
                      </button>
                      {snapFlash && <span className="px-1 text-xs font-bold text-emerald-400">Saved ✓</span>}
                      {bareCluster && (
                        <button onClick={shareView} title="Share this view"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-[#8a8577] hover:border-[#d4af37]/40 hover:text-[#e9e7df]">
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}
                      {!bareCluster && centerTab !== 'chart' && (
                        <Link to={FULL_VIEW[centerTab](symbol)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-[#8a8577] hover:border-[#d4af37]/40 hover:text-[#e9e7df]" title="Full view">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 flex justify-end"><Attribution full /></div>
              </Card>
              <BottomDock symbol={symbol} accountId={workspace.risk.accountId} logLines={logs} />
            </div>
          </div>

          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)}
            onSymbol={(s) => patch({ symbol: s })}
            onTimeframe={(tf) => patch({ timeframe: tf })}
            onDesk={(id) => loadPreset(id)} />
        </div>
      </TradingBibleTerminal>
    </AppLayout>
  );
}
