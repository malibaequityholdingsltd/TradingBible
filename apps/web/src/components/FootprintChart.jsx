// Footprint chart — bid x ask volume at every price level, per candle.
// Crypto: built ONLY from the live aggTrade tape (Binance). Everything else:
// built from the live price feed itself — each polled tick is a real print,
// classified buy/sell by the standard tick rule (uptick = buy, downtick =
// sell, unchanged repeats the last side), sized by print count. The header
// always says which tape you're looking at. Nothing is backfilled.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import orderflowFeed, { isFlowSymbol } from '@/lib/orderflowFeed';
import apiServerClient from '@/lib/apiServerClient';

const BUCKET_SECS = 300; // 5-minute footprint candles
const MAX_COLS = 18;
const MAX_ROWS = 44;
const H = 380;

function tickFor(price) {
  if (price >= 5000) return 1;
  if (price >= 500) return 0.5;
  if (price >= 100) return 0.1;
  if (price >= 10) return 0.01;
  return 0.001;
}

function fmtQ(q) {
  if (!Number.isFinite(q) || q <= 0) return '0';
  if (q >= 1000) return `${(q / 1000).toFixed(1)}k`;
  if (q >= 100) return q.toFixed(0);
  if (q >= 1) return q.toFixed(2);
  return q.toFixed(4);
}

function fmtPx(p, tick) {
  const dec = tick >= 1 ? 0 : tick >= 0.1 ? 1 : tick >= 0.01 ? 2 : 4;
  return Number(p).toFixed(dec);
}

export default function FootprintChart({ symbol, onSymbolChange }) {
  const flow = isFlowSymbol(symbol);
  const [status, setStatus] = useState('idle');
  const [prints, setPrints] = useState(0);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  // candles: [{ start, high, low, buy, sell, levels: Map<key,{b,s}>, tick }]
  const dataRef = useRef({ candles: [], tick: 0, prints: 0 });
  const rafRef = useRef(0);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(280, wrap.clientWidth);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#07070b';
    ctx.fillRect(0, 0, W, H);

    const { candles } = dataRef.current;
    ctx.font = '500 9px ui-monospace, monospace';
    if (!candles.length) {
      ctx.fillStyle = '#5f5b50';
      ctx.font = '500 12px system-ui, sans-serif';
      ctx.fillText(status === 'idle' ? 'Connecting to trade tape…' : 'Waiting for prints — cells build live…', 16, 30);
      return;
    }

    const AXIS = 62;
    const DELTA_H = 22;
    const gridW = W - AXIS;
    const gridH = H - DELTA_H - 8;
    const colW = gridW / MAX_COLS;
    const visible = candles.slice(-MAX_COLS);

    // Shared price scale across visible candles.
    let hi = -Infinity;
    let lo = Infinity;
    visible.forEach((c) => { if (c.high > hi) hi = c.high; if (c.low < lo) lo = c.low; });
    let tick = dataRef.current.tick || 1;
    const span = Math.max(hi - lo, tick * 4);
    while (span / tick > MAX_ROWS) tick *= 2;
    const rows = Math.min(MAX_ROWS, Math.max(6, Math.ceil(span / tick) + 2));
    const top = hi + tick;
    const yOf = (p) => ((top - p) / (rows * tick)) * gridH;
    const rowH = gridH / rows;

    // Session max cell volume for intensity.
    let maxCell = 0;
    visible.forEach((c) => c.levels.forEach((l) => { maxCell = Math.max(maxCell, l.b + l.s); }));
    maxCell = Math.max(maxCell, 1e-9);

    visible.forEach((c, i) => {
      const x = i * colW;
      // Wick.
      ctx.strokeStyle = 'rgba(201,196,180,0.35)';
      ctx.beginPath();
      ctx.moveTo(x + colW / 2, yOf(c.high));
      ctx.lineTo(x + colW / 2, yOf(c.low));
      ctx.stroke();
      // Aggregated levels at display tick.
      const agg = new Map();
      c.levels.forEach((l, key) => {
        const base = Math.round((key * c.tick) / tick) * tick;
        const e = agg.get(base) || { b: 0, s: 0 };
        e.b += l.b; e.s += l.s;
        agg.set(base, e);
      });
      let pocP = null;
      let pocV = -1;
      agg.forEach((l, p) => {
        const v = l.b + l.s;
        if (v > pocV) { pocV = v; pocP = p; }
        const y = yOf(p) - rowH / 2;
        const buyDom = l.b >= l.s;
        const a = 0.06 + 0.5 * (v / maxCell);
        ctx.fillStyle = buyDom ? `rgba(16,185,129,${a.toFixed(2)})` : `rgba(248,113,113,${a.toFixed(2)})`;
        ctx.fillRect(x + 1, Math.max(0, y), colW - 2, Math.max(1, rowH - 0.5));
        if (rowH >= 11 && colW >= 64) {
          ctx.fillStyle = 'rgba(240,236,221,0.85)';
          ctx.fillText(`${fmtQ(l.b)}×${fmtQ(l.s)}`, x + 3, Math.min(gridH - 2, y + rowH - 3));
        }
      });
      // POC line.
      if (pocP != null) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 1, yOf(pocP));
        ctx.lineTo(x + colW - 1, yOf(pocP));
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      // Delta footer.
      const d = c.buy - c.sell;
      ctx.fillStyle = d >= 0 ? '#10b981' : '#f87171';
      ctx.fillText(`${d >= 0 ? '+' : ''}${fmtQ(Math.abs(d))}`, x + 3, H - 7);
    });

    // Price axis.
    ctx.fillStyle = '#5f5b50';
    for (let r = 0; r <= 6; r++) {
      const p = top - ((rows * tick * r) / 6);
      const y = (r / 6) * gridH;
      ctx.fillText(fmtPx(p, tick), W - AXIS + 6, Math.min(gridH, y + 3));
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(gridW, y);
      ctx.stroke();
    }
  };

  const schedule = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  // One print into the current 5-minute bucket (shared by tape + tick feeds).
  const pushPrint = (price, qty, side, ts) => {
    const d = dataRef.current;
    if (!Number.isFinite(price) || !(qty > 0)) return;
    if (!d.tick) d.tick = tickFor(price);
    const bucket = Math.floor(ts / (BUCKET_SECS * 1000)) * (BUCKET_SECS * 1000);
    let c = d.candles[d.candles.length - 1];
    if (!c || c.start !== bucket) {
      c = { start: bucket, high: price, low: price, buy: 0, sell: 0, levels: new Map(), tick: d.tick };
      d.candles.push(c);
      if (d.candles.length > MAX_COLS + 2) d.candles.splice(0, d.candles.length - (MAX_COLS + 2));
    }
    if (price > c.high) c.high = price;
    if (price < c.low) c.low = price;
    const key = Math.round(price / d.tick);
    const lvl = c.levels.get(key) || { b: 0, s: 0 };
    if (side === 'buy') { lvl.b += qty; c.buy += qty; }
    else { lvl.s += qty; c.sell += qty; }
    c.levels.set(key, lvl);
    d.prints += 1;
    setPrints(d.prints);
    schedule();
  };

  useEffect(() => {
    if (!flow) return undefined;
    dataRef.current = { candles: [], tick: 0, prints: 0, mode: 'tape' };
    setPrints(0);
    const onTrade = (t) => pushPrint(t.price, t.qty, t.side, t.ts);
    const unsubStatus = orderflowFeed.onStatus(setStatus);
    const unsub = orderflowFeed.subscribe(symbol, { onTrade });
    schedule();
    const onResize = () => schedule();
    window.addEventListener('resize', onResize);
    return () => { unsub(); unsubStatus(); window.removeEventListener('resize', onResize); cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, flow]);

  // Non-crypto: no per-trade tape exists, so the footprint is built from the
  // live price feed — every polled tick is a genuine print, side-classified
  // by the tick rule. Slower to fill (one print per poll), never simulated.
  useEffect(() => {
    if (flow) return undefined;
    let dead = false;
    let prev = null;
    let lastDir = 'buy';
    dataRef.current = { candles: [], tick: 0, prints: 0, mode: 'ticks' };
    setPrints(0);
    setStatus('connecting');
    const poll = async () => {
      try {
        const r = await apiServerClient.fetch(`/quotes?symbols=${encodeURIComponent(symbol)}`);
        const d = await r.json();
        const q = (d.quotes || [])[0];
        if (dead || !q || !Number.isFinite(q.price)) return;
        if (prev != null && q.price !== prev) lastDir = q.price > prev ? 'buy' : 'sell';
        prev = q.price;
        pushPrint(q.price, 1, lastDir, Date.now());
        if (!dead) setStatus('live');
      } catch {
        if (!dead) setStatus((s) => (s === 'live' ? 'live' : 'error'));
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    const onResize = () => schedule();
    window.addEventListener('resize', onResize);
    return () => { dead = true; clearInterval(id); window.removeEventListener('resize', onResize); cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, flow]);

  const head = useMemo(() => {
    const d = dataRef.current;
    const last = d.candles[d.candles.length - 1];
    if (!last) return null;
    return { delta: last.buy - last.sell, buy: last.buy, sell: last.sell };
  }, [prints]);

  const tickMode = !flow;
  const liveTag = tickMode ? status === 'live' : status === 'connected';

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#8a8577]">
        <span className={`font-bold ${liveTag ? 'text-emerald-400' : 'text-[#8a8577]'}`}>
          {liveTag ? (tickMode ? '● LIVE FEED' : '● LIVE TAPE') : status.toUpperCase()}
        </span>
        <span>{tickMode ? `5m tick-rule · ${prints.toLocaleString()} prints` : `5m bid×ask · ${prints.toLocaleString()} prints this session`}</span>
        {head && (
          <span className={head.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            candle Δ {head.delta >= 0 ? '+' : ''}{fmtQ(Math.abs(head.delta))}
          </span>
        )}
        <span className="text-[#5f5b50]">gold line = POC</span>
      </div>
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ height: H }} />
      <p className="mt-1 text-[11px] text-[#5f5b50]">
        {tickMode
          ? 'Built from live feed ticks (up = buy, down = sell) — fills one print per refresh, never backfilled.'
          : 'Tape-built from session open — cells fill in live, never backfilled.'}
      </p>
    </div>
  );
}
