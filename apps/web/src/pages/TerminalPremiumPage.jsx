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
import { IosIcon } from '@/components/IosIcon';
import { useQuotes } from '@/hooks/useQuotes';
import { useAuth } from '@/hooks/useAuth';
import pb from '@/lib/pocketbaseClient';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import { useWatchlists } from '@/hooks/useWatchlists';
import { ALL_SYMBOLS } from '@/lib/symbols';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';
import { numOrNull } from '@/lib/safeRender';
import { brandLogo } from '@/lib/brand';
import TradingBibleTerminal, { TBChart, TBOrderflow, TBFootprint, TBHeatmap, TBNews, TBIndicators, Attribution, hasFeature } from '@/terminal/TradingBibleTerminal';
import { usePremiumWorkspace } from '@/terminal/premiumStore';
import AccountPanel from '@/terminal/panels/AccountPanel';
import RiskPanel from '@/terminal/panels/RiskPanel';
import DomPanel from '@/terminal/panels/DomPanel';
import ReplayPanel from '@/terminal/panels/ReplayPanel';
import BottomDock from '@/terminal/panels/BottomDock';
import CommandPalette from '@/terminal/panels/CommandPalette';
import PromptDialog from '@/components/PromptDialog';

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
const fmtPx = (n) => { const v = typeof n === 'number' ? n : Number(n); return n == null || !Number.isFinite(v) ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: 5 }); };

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

// iOS-style coin tiles for the instrument list: each asset gets its own
// solid brand color + glyph, like a finance app. Unknown symbols fall back
// to a hashed Apple-palette tile with their initials.
const COIN_TILE = {
  BTC: ['#F7931A', '₿', '#fff'], ETH: ['#627EEA', 'Ξ', '#fff'], SOL: ['#9945FF', '◎', '#fff'],
  XRP: ['#00AAE4', '✕', '#fff'], DOGE: ['#C2A633', 'Ð', '#fff'], ADA: ['#0033AD', '₳', '#fff'],
  AVAX: ['#E84142', '▲', '#fff'], LINK: ['#2A5ADA', '⬡', '#fff'], DOT: ['#E6007A', '●', '#fff'],
  LTC: ['#345D9D', 'Ł', '#fff'], BNB: ['#F0B90B', '◆', '#3a2f00'], ATOM: ['#2E3148', '⚛', '#fff'],
  NEAR: ['#00C08B', 'Ⓝ', '#fff'], XLM: ['#08B5E5', '✳', '#fff'],
  XAU: ['#D4AF37', 'Au', '#3a2f00'], XAG: ['#8E8E93', 'Ag', '#fff'], XPT: ['#8E8E93', 'Pt', '#fff'],
  XPD: ['#8E8E93', 'Pd', '#fff'], EUR: ['#0A84FF', '€', '#fff'], GBP: ['#BF5AF2', '£', '#fff'],
  JPY: ['#FF453A', '¥', '#fff'], USD: ['#30D158', '$', '#fff'], CHF: ['#FF375F', '₣', '#fff'],
  CAD: ['#64D2FF', '$', '#fff'], AUD: ['#0A84FF', '$', '#fff'], NZD: ['#5E5CE6', '$', '#fff'],
  WTI: ['#1C1C1E', '◼', '#fff'], OIL: ['#1C1C1E', '◼', '#fff'],
};
const TILE_FALLBACK = ['#0A84FF', '#BF5AF2', '#FF9F0A', '#30D158', '#64D2FF', '#FF375F', '#5E5CE6', '#AC8E68'];
function baseOf(sym) {
  return String(sym || '').toUpperCase().replace(/(USDT|USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)$/, '') || String(sym || '').toUpperCase();
}
function tileOf(sym) {
  const b = baseOf(sym);
  if (COIN_TILE[b]) { const [bg, g, fg] = COIN_TILE[b]; return { bg, g, fg }; }
  let h = 0;
  for (const c of b) h = (h * 31 + c.charCodeAt(0)) % 997;
  return { bg: TILE_FALLBACK[h % TILE_FALLBACK.length], g: b.slice(0, 2) || '·', fg: '#fff' };
}
function glyphOf(sym) {
  return tileOf(sym).g;
}
function nameOf(sym) {
  return ALL_SYMBOLS.find((x) => x.symbol === String(sym || '').toUpperCase())?.name || '';
}

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
  const [saveVerOpen, setSaveVerOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const log = (m) => setLogs((l) => [...l, `${new Date().toLocaleTimeString()} ${m}`].slice(-50));

  // One list system for the terminal family: the rail mirrors the user's
  // default named watchlist (managed on /app/watchlists) when signed in
  // with a non-empty list; otherwise the local workspace list.
  const { lists, addSymbol, removeSymbol } = useWatchlists();
  const managedList = lists.find((l) => l.isDefault) || lists[0] || null;
  const normSym = (x) => (typeof x === 'string' ? x : x?.symbol ?? '').toString().trim().toUpperCase();
  const managedSyms = (Array.isArray(managedList?.symbols) ? managedList.symbols : []).map(normSym).filter(Boolean);
  const localSyms = (Array.isArray(watchlist) ? watchlist : []).map(normSym).filter(Boolean);
  const stripSyms = managedSyms.length ? managedSyms : localSyms;
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
  const price = typeof live?.price === 'number' ? live.price : null;
  const liveChg = numOrNull(live?.changePercent);
  const up = (liveChg ?? 0) >= 0;

  // ── Challenge↔chart binding: trade the chart symbol on a challenge
  // paper account at the live quote. Challenge attempts own
  // paper_accounts named `challenge:{attemptId}` (see challenges.js buy).
  const [paperAccounts, setPaperAccounts] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tradeAccountId, setTradeAccountId] = useState('');
  const [tradeQty, setTradeQty] = useState('0.10');
  const [tradeBusy, setTradeBusy] = useState('');
  const [tradeMsg, setTradeMsg] = useState('');
  useEffect(() => {
    if (!user?.id || !pb.authStore.token) return;
    const h = { Authorization: `Bearer ${pb.authStore.token}` };
    fetch(`${API_SERVER_URL}/paper/accounts`, { headers: h }).then((r) => r.json()).then((d) => {
      const accs = d.accounts || [];
      setPaperAccounts(accs);
      const chal = accs.filter((a) => String(a.name || '').startsWith('challenge:'));
      if (!tradeAccountId && chal.length) setTradeAccountId(chal[0].id);
      else if (!tradeAccountId && accs.length) setTradeAccountId(accs[0].id);
    }).catch(() => {});
    fetch(`${API_SERVER_URL}/challenges/my`, { headers: h }).then((r) => r.json()).then((d) => setAttempts(d.attempts || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const challengeAccounts = paperAccounts.filter((a) => String(a.name || '').startsWith('challenge:'));
  const activeAttempt = attempts.find((a) => a.status === 'active');

  const placeChartTrade = async (side) => {
    const qty = Number(tradeQty);
    if (!tradeAccountId) { setTradeMsg('Pick an account first.'); return; }
    if (!(qty > 0)) { setTradeMsg('Qty must be > 0.'); return; }
    if (price == null) { setTradeMsg('Waiting for live quote…'); return; }
    setTradeBusy(side);
    setTradeMsg('');
    try {
      const res = await fetch(`${API_SERVER_URL}/paper/trade`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: tradeAccountId, symbol, side, qty, price }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'trade failed');
      const msg = `${side.toUpperCase()} ${qty} ${symbol} @ ${price}${data?.trade ? '' : ''} — counts for challenge`;
      setTradeMsg(msg);
      log(msg);
    } catch (e) {
      setTradeMsg(e.message);
      log(`trade failed: ${e.message}`);
    } finally {
      setTradeBusy('');
    }
  };

  const paperOrder = (o) => {
    // DOM ladder: map buy/sell → long/short, fill at ladder price on the
    // selected challenge/paper account (server verifies vs live ±3%).
    const side = String(o.side || '').toLowerCase() === 'sell' || String(o.side || '').toLowerCase() === 'short' ? 'short' : 'long';
    const qty = Number(o.qty) || Number(tradeQty) || 0;
    const px = Number(o.price);
    if (!tradeAccountId || !(qty > 0) || !(px > 0)) { log(`paper ${o.side} ${o.qty} ${o.symbol} @ ${o.price} (simulated — pick account)`); return; }
    (async () => {
      try {
        const res = await fetch(`${API_SERVER_URL}/paper/trade`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: tradeAccountId, symbol: o.symbol || symbol, side, qty, price: px }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'trade failed');
        log(`paper ${side} ${qty} ${o.symbol || symbol} @ ${px} — challenge fill`);
      } catch (e) {
        log(`trade failed: ${e.message} (logged only)`);
      }
    })();
  };

  // ⌘K / Ctrl+K command palette, Esc closes overlays.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        <div ref={pageRef} className="tb-page tb-term">
          {/* ── Phone hero (phone only): one compact row so the chart fits the viewport ── */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]/95 px-2.5 py-2 sm:hidden">
            <div className="w-28 shrink-0"><SymbolSearchPicker value={symbol} onChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} buttonClassName="w-full justify-between !py-1.5 font-mono !text-xs font-bold" /></div>
            <div className="min-w-0 flex-1 leading-none">
              <span className="term-data font-mono text-lg font-extrabold text-[#f0ecdd]">{fmtPx(price)}</span>
              <span className={`term-data ml-1.5 font-mono text-[11px] font-bold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {liveChg != null ? `${up ? '▲' : '▼'} ${up ? '+' : ''}${liveChg.toFixed(2)}%` : ''}
              </span>
            </div>
            {live?.source === 'close' ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#d4af37]/15 px-2 py-1 text-[10px] font-bold text-[#d4af37]" title="Market closed — frozen at the last close">
                <CircleDot className="h-2.5 w-2.5" /> CLOSED
              </span>
            ) : (
              <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8a8577]'}`}>
                <CircleDot className="h-2.5 w-2.5" /> {status === 'live' ? 'LIVE' : status.toUpperCase()}
              </span>
            )}
            <Link to="/app/alerts" aria-label="Alerts" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition hover:scale-105"><IosIcon icon={Bell} size="sm" tone="theme" /></Link>
          </div>
          {/* ── Desk command strip (sm+ only) ── */}
          <div className="term-panel no-scrollbar hidden items-center gap-2 overflow-x-auto rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]/95 px-3 py-2 sm:flex">
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
                {liveChg != null ? `${up ? '▲' : '▼'} ${up ? '+' : ''}${liveChg.toFixed(2)}%` : ''}
              </span>
              {live?.source === 'synthetic' && (
                <span title="Simulated price — no live feed for this symbol yet" className="ml-1.5 whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-bold text-[#8a8577]">
                  SIM
                </span>
              )}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {live?.source === 'close' ? (
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#d4af37]/15 px-3 py-1.5 text-xs font-bold text-[#d4af37]" title="Market closed — frozen at the last close">
                  <CircleDot className="h-3.5 w-3.5" /> CLOSED
                </span>
              ) : (
                <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${status === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[#8a8577]'}`}>
                  <CircleDot className="h-3.5 w-3.5" /> {status === 'live' ? 'LIVE' : status.toUpperCase()}
                </span>
              )}
              <Link to="/app/alerts" aria-label="Alerts" className="grid h-11 w-11 place-items-center rounded-[10px] transition hover:scale-105"><IosIcon icon={Bell} size="md" tone="theme" /></Link>
            </div>
          </div>

          {/* ── Desk grid: rail + stage ── */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[21rem_minmax(0,1fr)]">
            {/* Left instrument rail — snap deck on phones, grid on sm+ */}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="term-panel min-w-0 !p-3">
                <SectionTitle right={<Link to="/app/watchlists" className="text-xs font-semibold text-[#d4af37] hover:underline">Manage</Link>}>
                  Watchlist · {managedList ? managedList.name : 'local'}
                </SectionTitle>
                <div className="max-h-64 space-y-1 overflow-y-auto pr-0.5">
                  {stripSyms.map((s) => {
                    const q = quotes[s];
                    const qUp = (numOrNull(q?.changePercent) ?? 0) >= 0;
                    const active = s === symbol;
                    return (
                      <div key={s} className={`group flex items-center gap-1 rounded-2xl border py-1.5 pl-1.5 pr-1 transition ${active ? 'term-row-active border-[#d4af37]/55 bg-[#d4af37]/[0.08]' : 'border-white/8 bg-black/20 hover:border-[#d4af37]/30'}`}>
                        <button onClick={() => patch({ symbol: s })} className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1 text-left">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-extrabold shadow-[0_2px_8px_rgba(0,0,0,0.35)]" style={{ background: tileOf(s).bg, color: tileOf(s).fg }}>{glyphOf(s)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-[13px] font-bold leading-tight text-[#f0ecdd]">{s}</span>
                            <span className="block truncate text-[10px] leading-tight text-[#8a8577]">{nameOf(s) || baseOf(s)}</span>
                          </span>
                          <span className="term-data shrink-0 text-right">
                            <span className="block font-mono text-xs text-[#e9e7df]">{q ? fmtPx(q.price) : '—'}</span>
                            <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px font-mono text-[10px] font-bold ${qUp ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>{(() => { const c = numOrNull(q?.changePercent); return c == null ? '···' : `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`; })()}</span>
                          </span>
                          <span className="shrink-0 font-mono text-sm text-[#5f5b50]">›</span>
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

              <Card className="term-panel min-w-0 !p-3">
                <SectionTitle right={workspace.risk.accountId ? <span className="font-mono text-xs text-[#d4af37]">filtered</span> : null}>Account</SectionTitle>
                <AccountPanel accountId={workspace.risk.accountId} onSelect={(aid) => patch({ risk: { ...workspace.risk, accountId: aid } })} />
              </Card>

              <Card className="term-panel min-w-0 !p-3">
                <SectionTitle>Risk</SectionTitle>
                <RiskPanel price={price} balance={0} />
              </Card>
            </div>

            {/* Center stage — first on phones so the chart fills the viewport */}
            <div className="order-first min-w-0 space-y-4 xl:order-none">
              <Card className="term-panel !p-3 sm:!p-4">
                <div className="tb-term-tabs" role="tablist" aria-label="Terminal views">
                  {visibleTabs.map((t) => (
                    <button key={t.id} role="tab" aria-selected={centerTab === t.id} onClick={() => patch({ centerTab: t.id })}
                      aria-label={t.label}
                      className={`tb-term-tab ${centerTab === t.id ? 'tb-term-tab--active' : ''}`}>
                      <IosIcon icon={t.icon} size="2xs" seed={t.id} /> <span className="tb-term-tab-label">{t.label}</span>
                    </button>
                  ))}
                </div>
                {/* Trade-this-chart: binds chart symbol + live quote to a challenge paper account */}
                {centerTab === 'chart' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/[0.05] px-3 py-2">
                    <span className="text-xs font-bold text-[#d4af37]">Trade this chart</span>
                    <span className="font-mono text-xs text-[#e9e7df]">{symbol} @ {price != null ? fmtPx(price) : '…'} {live?.source ? <span className="text-[10px] text-[#8a8577]">({live.source})</span> : null}</span>
                    {challengeAccounts.length > 0 ? (
                      <select value={tradeAccountId} onChange={(e) => setTradeAccountId(e.target.value)} aria-label="Challenge account"
                        className="min-w-[160px] flex-1 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1.5 text-xs text-[#e9e7df] outline-none sm:max-w-[260px]">
                        {paperAccounts.map((a) => (
                          <option key={a.id} value={a.id} className="bg-[#0f0f14]">
                            {String(a.name || '').startsWith('challenge:') ? `🏆 ${a.name} — $${Number(a.balance || 0).toLocaleString()}` : `${a.name} — $${Number(a.balance || 0).toLocaleString()}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Link to="/app/challenges" className="text-xs font-semibold text-[#d4af37] hover:underline">Get a challenge account →</Link>
                    )}
                    <input value={tradeQty} onChange={(e) => setTradeQty(e.target.value)} type="number" min="0" step="0.01" aria-label="Qty"
                      className="w-20 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-1.5 font-mono text-xs text-[#e9e7df] outline-none" />
                    <button onClick={() => placeChartTrade('long')} disabled={!tradeAccountId || tradeBusy || price == null}
                      className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 disabled:opacity-50">{tradeBusy === 'long' ? '…' : 'BUY'}</button>
                    <button onClick={() => placeChartTrade('short')} disabled={!tradeAccountId || tradeBusy || price == null}
                      className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 disabled:opacity-50">{tradeBusy === 'short' ? '…' : 'SELL'}</button>
                    {activeAttempt && <span className="text-[11px] text-[#8a8577]">active: {String(activeAttempt.product_name || activeAttempt.product_key || '').slice(0, 32)}</span>}
                    {tradeMsg && <span className="w-full text-[11px] text-[#8a8577]">{tradeMsg}</span>}
                  </div>
                )}
                {/* Stage: viewport-fit for the single chart (bottom visible, no page scroll),
                    natural height for multi-panes and tool views */}
                <div className={`relative mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/30 ${centerTab === 'chart' && chartLayout === 'single' ? 'h-[max(320px,min(470px,calc(100dvh_-_460px)))] sm:h-[max(520px,min(860px,calc(100dvh_-_380px)))]' : 'min-h-[380px] sm:min-h-[420px]'}`}>
                  {centerTab === 'chart' && hasFeature(features, 'charts') && (
                    chartLayout === 'single'
                      ? <div className="h-full p-1.5 sm:p-2"><TBChart symbol={symbol} timeframe={timeframe} chartType={chartType} onSnapshot={snapJournal} onShare={shareView} onSymbolChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} height="h-full" /></div>
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
                              <TBChart symbol={pn.symbol} timeframe={pn.tf} chartType={chartType} onSnapshot={snapJournal} onShare={shareView} height="h-[320px] sm:h-[420px]" />
                            </div>
                          ))}
                        </div>
                      )
                  )}
                  {centerTab === 'orderflow' && hasFeature(features, 'orderflow') && <div className="p-2"><TBOrderflow symbol={symbol} /></div>}
                  {centerTab === 'footprint' && hasFeature(features, 'footprint') && <div className="p-2"><TBFootprint symbol={symbol} onSymbolChange={(s) => { patch({ symbol: s }); log(`symbol → ${s}`); }} /></div>}
                  {centerTab === 'heatmap' && hasFeature(features, 'heatmap') && (
                    <div className="p-2"><TBHeatmap category={workspace.heatmap.category} period={workspace.heatmap.period} onSelect={(s) => patch({ symbol: typeof s === 'string' ? s : s?.symbol })} /></div>
                  )}
                  {centerTab === 'dom' && hasFeature(features, 'dom') && <div className="p-2"><DomPanel symbol={symbol} price={price} onPaperOrder={paperOrder} /></div>}
                  {centerTab === 'replay' && hasFeature(features, 'replay') && <div className="p-2"><ReplayPanel symbol={symbol} timeframe={timeframe} /></div>}
                  {centerTab === 'indicators' && hasFeature(features, 'indicators') && <div className="p-2"><TBIndicators symbol={symbol} timeframe={timeframe} /></div>}
                  {centerTab === 'news' && hasFeature(features, 'news') && <div className="p-2"><TBNews symbol={symbol} /></div>}
                  {/* Floating command cluster — pinned flush to the stage floor.
                      The stage clips overflow, so it can never pass the layout. */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center px-3 sm:flex">
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
                            {['candle', 'line', 'area', 'tradingview'].map((ct) => <option key={ct} value={ct} className="bg-[#0f0f14]">{ct === 'tradingview' ? 'TradingView' : ct}</option>)}
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
                {/* Phone command bar (phone only): one compact row under the tabs */}
                <div className="mt-2 rounded-2xl border border-[#d4af37]/25 bg-[#0c0c11]/95 p-1.5 sm:hidden">
                  <div className="flex flex-wrap items-center gap-1">
                    {needsTF && TFS.map((tf) => (
                      <button key={tf} onClick={() => patch({ timeframe: tf })}
                        className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-lg px-3 font-mono text-xs font-bold ${timeframe === tf ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577]'}`}>{tf}</button>
                    ))}
                    {centerTab === 'chart' && (
                      <select value={chartType} onChange={(e) => patch({ chartType: e.target.value })} aria-label="Chart type"
                        className="shrink-0 rounded-lg border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2 text-xs text-[#e9e7df] outline-none">
                        {['candle', 'line', 'area', 'tradingview'].map((ct) => <option key={ct} value={ct} className="bg-[#0f0f14]">{ct === 'tradingview' ? 'TradingView' : ct}</option>)}
                      </select>
                    )}
                    <button onClick={snapJournal} disabled={snapBusy} title="Snapshot to journal"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d4af37]/30 text-[#d4af37] disabled:opacity-50">
                      <Camera className={`h-4 w-4 ${snapBusy ? 'animate-pulse' : ''}`} />
                    </button>
                    {!bareCluster && centerTab !== 'chart' && (
                      <Link to={FULL_VIEW[centerTab](symbol)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 text-[#8a8577]" title="Full view">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    )}
                    {snapFlash && <span className="shrink-0 px-1 text-xs font-bold text-emerald-400">Saved ✓</span>}
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
