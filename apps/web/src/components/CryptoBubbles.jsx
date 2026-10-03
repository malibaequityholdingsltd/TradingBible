import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, Move3d, BarChart3, TrendingUp, TrendingDown, Flame, RefreshCw } from 'lucide-react';
import { useHeatmap } from '@/hooks/useHeatmap';
import { useI18n } from '@/lib/i18n';

// CryptoBubbles — cryptobubbles.net-style interactive 3D bubble visualization
// for every market (crypto, forex, commodities, sectors, stocks).
// Bubbles drift continuously around the box (no center clustering), bounce off
// walls and each other, and are fully draggable. Size tracks the move (or
// volume); color shows direction with intensity via the selected theme.
// Search fades non-matches, hover shows price/volume tooltip, click opens chart.

// Bubble color themes: [up, down] as "r,g,b" triplets. Bases are vivid and
// fully saturated — depth scaling darkens them for flat coins.
const SCHEMES = {
  classic: { label: 'Classic', up: '16,185,129', down: '239,68,68' },
  gold: { label: 'Gold', up: '234,179,8', down: '220,38,38' },
  ocean: { label: 'Ocean', up: '56,189,248', down: '244,63,94' },
  sunset: { label: 'Sunset', up: '20,184,166', down: '249,115,22' },
};
const SCHEME_KEY = 'tb-bubbles-scheme';

function bubbleFill(pct, scheme) {
  // Solid opaque bubbles: intensity encoded as color depth (dim when flat,
  // full vivid color on big moves) instead of transparency.
  const cap = Math.min(Math.abs(pct) / 8, 1);
  const f = 0.45 + cap * 0.55;
  const c = (pct >= 0 ? scheme.up : scheme.down).split(',').map(Number);
  return `rgb(${Math.round(c[0] * f)},${Math.round(c[1] * f)},${Math.round(c[2] * f)})`;
}

function bubbleStroke(pct, scheme) {
  const c = pct >= 0 ? scheme.up : scheme.down;
  return `rgb(${c})`;
}

function fmtPrice(n) {
  if (n == null) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtVol(qv) {
  if (!qv) return '—';
  if (qv >= 1e9) return `$${(qv / 1e9).toFixed(2)}B`;
  if (qv >= 1e6) return `$${(qv / 1e6).toFixed(1)}M`;
  if (qv >= 1e3) return `$${(qv / 1e3).toFixed(0)}K`;
  return `$${qv.toFixed(0)}`;
}

function radiusFor(cell, mode, volStats, compact = false, relRange = null) {
  // Compact ("All" view, 240 bubbles): scaled to fit the crowd while staying readable.
  const k = compact ? 0.72 : 1;
  if (mode === 'volume') {
    const { min, max } = volStats;
    const v = Math.log10(Math.max(cell.quoteVolume || 0, 1));
    const t = max > min ? Math.min(Math.max((v - min) / (max - min), 0), 1) : 0.5;
    return (20 + t * 40) * k; // 20–60, or ~14–43 compact
  }
  // relRange (All view): auto-size relative to the page's own move spread so
  // forex-sized moves and crypto-sized moves share the full size range.
  if (relRange && relRange.max > relRange.min) {
    const t = Math.min(Math.max((Math.abs(cell.changePercent || 0) - relRange.min) / (relRange.max - relRange.min), 0), 1);
    return (24 + t * 44) * k;
  }
  const cap = Math.min(Math.abs(cell.changePercent || 0) / 8, 1);
  return (28 + cap * 52) * k; // 28–80, or ~20–58 compact
}

const PAGE_SIZE = 100;

// Primary listing venue per symbol (drives the exchange filter).
// Crypto default Binance, forex OANDA, commodities Spot, sectors NYSE;
// stocks/ETFs default NYSE unless listed here as NASDAQ.
const NASDAQ_STOCKS = new Set(
  'AAPL MSFT GOOGL AMZN TSLA META NVDA NFLX AMD INTC CSCO ADBE COST GILD AMGN ISRG MU AMAT LRCX KLAC ADI PANW INTU BKNG CSX ADP AVGO EQIX MDLZ PEP TXN QCOM HON EXC UAL'.split(' '),
);
const COINBASE_COINS = new Set(
  'BTCUSD ETHUSD SOLUSD XRPUSD ADAUSD DOGEUSD AVAXUSD DOTUSD LINKUSD LTCUSD UNIUSD NEARUSD APTUSD AAVEUSD MKRUSD GRTUSD SANDUSD MANAUSD GALAUSD AXSUSD'.split(' '),
);
const EXCHANGE_LABEL = { binance: 'Binance', coinbase: 'Coinbase', nyse: 'NYSE', nasdaq: 'NASDAQ', oanda: 'OANDA', spot: 'Spot' };
const EXCHANGES_BY_TYPE = {
  crypto: ['binance', 'coinbase'],
  stock: ['nyse', 'nasdaq'],
  sector: ['nyse'],
  forex: ['oanda'],
  commodity: ['spot'],
  all: ['binance', 'coinbase', 'nyse', 'nasdaq', 'oanda', 'spot'],
};
function exchangeOf(cell, type) {
  // Default attribution follows the price source; Coinbase is an extra
  // membership filter handled by exchangeMatch below.
  const m = cell.market || type;
  if (m === 'crypto') return 'binance';
  if (m === 'forex') return 'oanda';
  if (m === 'commodity') return 'spot';
  if (m === 'sector') return 'nyse';
  if (m === 'stock') return NASDAQ_STOCKS.has(cell.symbol) ? 'nasdaq' : 'nyse';
  return 'spot';
}
function exchangeMatch(cell, type, exchange) {
  if (exchange === 'all') return true;
  if (exchange === 'coinbase') return COINBASE_COINS.has(cell.symbol) && (cell.market || type) === 'crypto';
  return exchangeOf(cell, type) === exchange;
}

export default function CryptoBubbles({ type = 'crypto', period, onSelect }) {
  const { t } = useI18n();
  const { cells, status, retry } = useHeatmap(type, period, 15000);
  const [mode, setMode] = useState('move'); // 'move' | 'volume'
  const [schemeId, setSchemeId] = useState(() => {
    try { return SCHEMES[localStorage.getItem(SCHEME_KEY)] ? localStorage.getItem(SCHEME_KEY) : 'classic'; }
    catch { return 'classic'; }
  });
  const scheme = SCHEMES[schemeId] || SCHEMES.classic;
  const pickScheme = (id) => {
    setSchemeId(id);
    try { localStorage.setItem(SCHEME_KEY, id); } catch { /* ignore */ }
  };
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [exchange, setExchange] = useState('all');
  // New market/period starts back on page one.
  useEffect(() => { setPage(0); setExchange('all'); }, [type, period]);
  const [hover, setHover] = useState(null); // {cell, x, y}
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const nodesRef = useRef(new Map());
  const [, force] = useState(0);

  // Exchange filter first, then search/pagination operate on the subset.
  const availExchanges = EXCHANGES_BY_TYPE[type] || ['spot'];
  const filteredCells = exchange === 'all' ? cells : cells.filter((c) => exchangeMatch(c, type, exchange));

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const matchSet = useMemo(() => {
    if (!q) return null;
    return new Set(filteredCells.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).map((c) => c.symbol));
  }, [filteredCells, q]);

  // Pagination: 100 bubbles per page (searching shows all matches at once).
  const pageCount = Math.max(1, Math.ceil(filteredCells.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleCells = searching
    ? filteredCells.filter((c) => matchSet.has(c.symbol))
    : filteredCells.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const volStats = useMemo(() => {
    const logs = visibleCells.map((c) => Math.log10(Math.max(c.quoteVolume || 0, 1))).sort((a, b) => a - b);
    // Clip at the 95th percentile so one giant (e.g. BTC) can't dwarf the field.
    const p95 = logs.length ? logs[Math.min(logs.length - 1, Math.floor(0.95 * (logs.length - 1)))] : 1;
    return { min: logs.length ? logs[0] : 0, max: Math.max(p95, logs.length ? logs[0] + 0.5 : 1) };
  }, [visibleCells]);

  // All-view auto-sizing: normalize move sizes to the visible page's own
  // spread so small forex moves and large crypto moves share the size range.
  const relRange = useMemo(() => {
    if (type !== 'all' || mode !== 'move' || !visibleCells.length) return null;
    const mags = visibleCells.map((c) => Math.abs(c.changePercent || 0));
    return { min: Math.min(...mags), max: Math.max(...mags) };
  }, [type, mode, visibleCells]);

  // Measure container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(300, r.width), h: 520 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync nodes with the visible page (keep positions across refreshes).
  const compact = type === 'all';
  useEffect(() => {
    const map = nodesRef.current;
    const seen = new Set();
    visibleCells.forEach((c) => {
      seen.add(c.symbol);
      const r = radiusFor(c, mode, volStats, compact, relRange);
      const n = map.get(c.symbol);
      if (n) { n.cell = c; n.r = r; }
      else {
        // Random spread position + steady cruising velocity (never settles).
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.5 + Math.random() * 0.7;
        map.set(c.symbol, {
          cell: c, r,
          x: r + Math.random() * Math.max(size.w - r * 2, 1),
          y: r + Math.random() * Math.max(size.h - r * 2, 1),
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          phase: Math.random() * Math.PI * 2,
        });
      }
    });
    [...map.keys()].forEach((k) => { if (!seen.has(k)) map.delete(k); });
  }, [visibleCells, mode, volStats, relRange, compact, size.w, size.h]);

  // Physics loop: continuous drift around the box — no center pull.
  // Bubbles cruise at a steady speed, ride a slow flowing current, bounce off
  // walls, and push each other apart softly on contact. They never settle.
  useEffect(() => {
    let raf;
    const t0 = Date.now();
    const MIN_SPD = 0.45, MAX_SPD = 2.0;
    const step = () => {
      const map = nodesRef.current;
      const nodes = [...map.values()];
      const t = (Date.now() - t0) / 1000;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.drag) continue;
        // Gentle flowing current so paths curve instead of going straight.
        a.vx += Math.sin(t * 0.5 + a.phase + a.y / 220) * 0.012;
        a.vy += Math.cos(t * 0.4 + a.phase + a.x / 260) * 0.012;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (b.drag) continue;
          const dx = b.x - a.x; const dy = b.y - a.y;
          const min = a.r + b.r + 6;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < min * min) {
            const d = Math.sqrt(d2);
            const push = ((min - d) / d) * 0.05;
            a.vx -= dx * push; a.vy -= dy * push;
            b.vx += dx * push; b.vy += dy * push;
          }
        }
      }
      nodes.forEach((n) => {
        if (n.drag) return;
        // Enforce cruising speed band — bubbles always keep moving.
        const spd = Math.hypot(n.vx, n.vy);
        if (spd < MIN_SPD) {
          const ang = spd > 0.01 ? Math.atan2(n.vy, n.vx) : Math.random() * Math.PI * 2;
          n.vx = Math.cos(ang) * MIN_SPD; n.vy = Math.sin(ang) * MIN_SPD;
        } else if (spd > MAX_SPD) {
          n.vx = (n.vx / spd) * MAX_SPD; n.vy = (n.vy / spd) * MAX_SPD;
        }
        n.x += n.vx; n.y += n.vy;
        if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx); }
        if (n.x > size.w - n.r) { n.x = size.w - n.r; n.vx = -Math.abs(n.vx); }
        if (n.y < n.r) { n.y = n.r; n.vy = Math.abs(n.vy); }
        if (n.y > size.h - n.r) { n.y = size.h - n.r; n.vy = -Math.abs(n.vy); }
      });
      force((f) => f + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h]);

  const toLocal = useCallback((e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e, node) => {
    e.stopPropagation();
    node.drag = true;
    const move = (ev) => {
      const p = toLocal(ev);
      node.x = Math.max(node.r, Math.min(size.w - node.r, p.x));
      node.y = Math.max(node.r, Math.min(size.h - node.r, p.y));
      node.vx = 0; node.vy = 0;
    };
    const up = () => {
      node.drag = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [toLocal, size.w]);

  const stats = useMemo(() => {
    if (!cells.length) return { gainer: null, loser: null, active: null };
    const byPct = [...cells].sort((a, b) => b.changePercent - a.changePercent);
    const byVol = [...cells].sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0));
    return { gainer: byPct[0], loser: byPct[byPct.length - 1], active: byVol[0] };
  }, [cells]);

  const nodes = [...nodesRef.current.values()];
  // White labels on solid saturated bubbles in both themes (dark outline
  // keeps them crisp on every color, including gold in light mode).
  const labelColor = '#ffffff';

  return (
    <div>
      {/* Controls: search + size mode */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a8577]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('hm.searchPh', null, `Search ${type}…`)}
            className="w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] py-2 pl-9 pr-3 text-sm text-[#e9e7df] outline-none placeholder:text-[#5f5b50] focus:border-[#d4af37]/40"
          />
        </div>
        <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/15">
          <button
            onClick={() => setMode('move')}
            title={t('hm.sizeMove', null, 'Bubble size = move size')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${mode === 'move' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
          >
            <Move3d className="h-3.5 w-3.5" />{t('hm.move', null, 'Move')}
          </button>
          <button
            onClick={() => setMode('volume')}
            title={t('hm.sizeVol', null, 'Bubble size = 24h volume')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${mode === 'volume' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
          >
            <BarChart3 className="h-3.5 w-3.5" />{t('hm.volume', null, 'Volume')}
          </button>
        </div>
        <span className={`ml-auto flex items-center gap-1.5 text-[11px] text-[#8a8577]`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ready' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-[#d4af37]'}`} />
          {t('hm.live15s', null, 'Live · refreshes every 15s')}
        </span>
      </div>

      {/* Bubble color themes */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[#8a8577]">{t('hm.colors', null, 'Colors')}</span>
        {Object.entries(SCHEMES).map(([id, sc]) => (
          <button
            key={id}
            onClick={() => pickScheme(id)}
            title={sc.label}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${schemeId === id ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#e9e7df]' : 'border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}
          >
            <span className="flex overflow-hidden rounded-full">
              <span className="h-3 w-3" style={{ background: `rgb(${sc.up})` }} />
              <span className="h-3 w-3" style={{ background: `rgb(${sc.down})` }} />
            </span>
            {sc.label}
          </button>
        ))}
      </div>

      {/* Exchanges + pages */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {availExchanges.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#8a8577]">{t('hm.exchange', null, 'Exchange')}</span>
            <div className="flex overflow-hidden rounded-xl border border-[#d4af37]/15">
              <button
                onClick={() => { setExchange('all'); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-medium transition ${exchange === 'all' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
              >
                {t('hm.allEx', null, 'All')}
              </button>
              {availExchanges.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setExchange(ex); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-medium transition ${exchange === ex ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'text-[#8a8577] hover:text-[#e9e7df]'}`}
                >
                  {EXCHANGE_LABEL[ex]}
                </button>
              ))}
            </div>
          </div>
        )}
        {pageCount > 1 && !searching && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#8a8577] transition hover:text-[#e9e7df] disabled:opacity-30"
            >
              ←
            </button>
            {Array.from({ length: pageCount }).map((_, i) => {
              const start = i * PAGE_SIZE + 1;
              const end = Math.min((i + 1) * PAGE_SIZE, filteredCells.length);
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-xs transition ${i === safePage ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'border border-[#d4af37]/15 text-[#8a8577] hover:text-[#e9e7df]'}`}
                >
                  {start}–{end}
                </button>
              );
            })}
            <button
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-lg border border-[#d4af37]/15 px-2.5 py-1.5 text-xs text-[#8a8577] transition hover:text-[#e9e7df] disabled:opacity-30"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Movers strip (global: across all pages/exchanges) */}
      {cells.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {[
            { icon: TrendingUp, label: t('hm.topGainer', null, 'Top gainer'), cell: stats.gainer, cls: 'text-emerald-400' },
            { icon: TrendingDown, label: t('hm.topLoser', null, 'Top loser'), cell: stats.loser, cls: 'text-red-400' },
            { icon: Flame, label: t('hm.mostActive', null, 'Most active'), cell: stats.active, cls: 'text-[#d4af37]' },
          ].map(({ icon: Icon, label, cell, cls }) => (
            <button
              key={label}
              onClick={() => cell && onSelect?.(cell)}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-[#d4af37]/12 bg-white/[0.02] px-3 py-2 text-left transition hover:border-[#d4af37]/40"
            >
              <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] uppercase tracking-wider text-[#8a8577]">{label}</span>
                <span className="block truncate font-mono text-xs font-semibold text-[#f0ecdd]">
                  {cell ? `${cell.symbol.replace('USD', '')} ${cell.changePercent >= 0 ? '+' : ''}${cell.changePercent}%` : '—'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bubble field */}
      <div ref={wrapRef} className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-[#d4af37]/10" style={{ height: 520 }}>
        <div className="pointer-events-none absolute inset-0 grain opacity-20" />
        {status === 'loading' && !cells.length ? (
          <div className="grid h-full place-items-center text-sm text-[#8a8577]">{t('mkt.loadingHeat')}</div>
        ) : status === 'error' && !cells.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-xs text-sm text-[#8a8577]">{t('mkt.heatFail', null, 'Could not load market data. Start the API server, then retry.')}</p>
            <button onClick={retry} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/25 px-4 py-2 text-xs font-semibold text-[#d4af37] transition hover:border-[#d4af37]/60"><RefreshCw className="h-3.5 w-3.5" />{t('c.retry', null, 'Retry')}</button>
          </div>
        ) : (
          <svg width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`}>
            <defs>
              {/* 3D sphere shading: clear center → lightly darkened rim */}
              <radialGradient id="bbShade" cx="50%" cy="42%" r="72%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
              </radialGradient>
              <radialGradient id="bbGloss" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            {nodes.map((n) => {
              const dim = matchSet && !matchSet.has(n.cell.symbol);
              const big = Math.abs(n.cell.changePercent) >= 5;
              const fontSize = compact
                ? Math.max(9, Math.min(13, n.r / 2.2))
                : Math.max(11, Math.min(18, n.r / 2.6));
              const pctSize = compact
                ? Math.max(8, Math.min(11, n.r / 2.8))
                : Math.max(10, Math.min(15, n.r / 3.1));
              const showSymbol = !compact || n.r >= 15;
              // % always shows: stacked under the symbol on roomy bubbles,
              // lone centered line on tiny ones.
              const stacked = !compact || n.r >= 23;
              const isHover = hover?.cell.symbol === n.cell.symbol;
              return (
                <g
                  key={n.cell.symbol}
                  transform={`translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`}
                  opacity={dim ? 0.14 : 1}
                  style={{ cursor: 'grab', transition: 'opacity .25s' }}
                  onPointerDown={(e) => onPointerDown(e, n)}
                  onClick={() => onSelect?.(n.cell)}
                  onMouseEnter={(e) => { const p = toLocal(e); setHover({ cell: n.cell, x: p.x, y: p.y }); }}
                  onMouseMove={(e) => { const p = toLocal(e); setHover({ cell: n.cell, x: p.x, y: p.y }); }}
                  onMouseLeave={() => setHover(null)}
                >
                  <g transform={isHover ? 'scale(1.07)' : undefined} style={{ transition: 'transform .18s ease-out' }}>
                    {big && !dim && (
                      <circle r={n.r + 5} fill="none" stroke={bubbleStroke(n.cell.changePercent, scheme)} strokeWidth="1.5" opacity="0.45" />
                    )}
                    {/* sphere body */}
                    <circle r={n.r} fill={bubbleFill(n.cell.changePercent, scheme)} />
                    <circle r={n.r} fill="url(#bbShade)" />
                    {/* bounced floor light */}
                    <ellipse cx={0} cy={n.r * 0.58} rx={n.r * 0.52} ry={n.r * 0.15} fill="rgba(255,255,255,0.10)" />
                    {/* glossy highlight */}
                    <ellipse cx={-n.r * 0.33} cy={-n.r * 0.42} rx={n.r * 0.24} ry={n.r * 0.13} fill="url(#bbGloss)" opacity="0.32" transform={`rotate(-18)`} />
                    {/* rim */}
                    <circle r={n.r} fill="none" stroke={bubbleStroke(n.cell.changePercent, scheme)} strokeWidth="2" />
                    <text textAnchor="middle" dy={stacked ? -2 : 4} fill={labelColor} fontSize={fontSize} fontWeight="700" fontFamily="'Space Grotesk', Sora, sans-serif" letterSpacing="0.5" pointerEvents="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1.25} style={{ paintOrder: 'stroke' }}>
                      {showSymbol ? n.cell.symbol.replace('USD', '') : ''}
                    </text>
                    <text textAnchor="middle" dy={stacked ? fontSize + 3 : showSymbol ? fontSize + 1 : 3.5} fill={labelColor} fontSize={stacked ? pctSize : Math.max(8, Math.min(11, n.r / 2.4))} fontWeight="600" fontFamily="'Space Grotesk', Sora, sans-serif" letterSpacing="0.5" opacity="0.92" pointerEvents="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1.25} style={{ paintOrder: 'stroke' }}>
                      {n.cell.changePercent >= 0 ? '+' : ''}{n.cell.changePercent}%
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}
        {/* Hover tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 min-w-[160px] rounded-xl border border-[#d4af37]/25 bg-[#0d0d12]/95 p-3 shadow-xl backdrop-blur"
            style={{ left: Math.min(hover.x + 16, size.w - 180), top: Math.max(hover.y - 20, 8) }}
          >
            <div className="font-mono text-sm font-bold text-[#f0ecdd]">{hover.cell.symbol.replace('USD', '')} <span className="font-normal text-[#8a8577]">· {hover.cell.name}{hover.cell.market ? ` · ${hover.cell.market}` : ''}</span></div>
            <div className="mt-1 font-mono text-xs text-[#c9c4b4]">${fmtPrice(hover.cell.price)}</div>
            <div className={`font-mono text-xs font-semibold ${hover.cell.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {hover.cell.changePercent >= 0 ? '+' : ''}{hover.cell.changePercent}% · {period}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[#8a8577]">{type === 'crypto' ? 'Vol 24h' : 'Activity'}: {fmtVol(hover.cell.quoteVolume)}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8a8577]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${scheme.up})` }} />{t('hm.up', null, 'Up')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${scheme.down})` }} />{t('hm.down', null, 'Down')}</span>
        <span>{t('hm.legendSize', null, 'Size = move (or volume in Volume mode) · brighter = bigger move · drag to move')}</span>
      </div>
    </div>
  );
}
