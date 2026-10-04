import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Pause, Play, RotateCcw, Crosshair, X, Maximize2,
} from 'lucide-react';
import orderflowFeed from '@/lib/orderflowFeed';
import { useI18n } from '@/lib/i18n';

const COLS = 180;
const BID = [56, 189, 248];
const ASK = [251, 146, 60];
const BUY = '#34d399';
const SELL = '#fb7185';
const GOLD = '#d4af37';
const VWAP = '#22d3ee';
const LAD_W = 104; // docked DOM column width (Bookmap Web style)
const VOL_H = 34;  // bottom volume-bars strip height
const MAX_CANDLES = 240;
const SHOW_CANDLES = 48;

function niceTick(raw) {
	if (!Number.isFinite(raw) || raw <= 0) return 1;
	const steps = [1, 2, 2.5, 5, 10];
	const exp = Math.floor(Math.log10(raw));
	const base = 10 ** exp;
	for (const s of steps) if (s * base >= raw) return s * base;
	return 10 * base;
}

function priceDecimals(p) {
	if (p >= 1000) return 1;
	if (p >= 100) return 2;
	if (p >= 1) return 3;
	return 5;
}

export function fmtPrice(p) {
	if (!Number.isFinite(p)) return '—';
	return p.toLocaleString('en-US', { minimumFractionDigits: priceDecimals(p), maximumFractionDigits: priceDecimals(p) });
}

function fmtQty(q) {
	if (!Number.isFinite(q)) return '—';
	if (q >= 1000) return `${(q / 1000).toFixed(1)}K`;
	if (q >= 1) return q.toFixed(q >= 100 ? 1 : 3);
	return q.toFixed(5);
}

function fmtMoney(n) {
	if (!Number.isFinite(n)) return '—';
	if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
	return `$${n.toFixed(0)}`;
}

function fmtClock(ts) {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function emptyCol(rows) {
	return { bids: new Float32Array(rows), asks: new Float32Array(rows), buys: new Float32Array(rows), sells: new Float32Array(rows), t: Date.now() };
}

// One self-contained order-flow pane: own buffers, own feed subscription,
// canvas heatmap + VWAP + stats + (when expanded) ladder + tape.
export default function OrderflowChart({
	symbol, colSecs, rows, minTrade, intensity, paused, candleSecs,
	expanded, focused, onFocus, onRemove, canRemove, onSample,
}) {
	const [status, setStatus] = useState('idle');
	const [stats, setStats] = useState({ last: 0, high: 0, low: 0, vol: 0, buyVol: 0, sellVol: 0, count: 0, biggest: 0, spread: 0, vwap: 0 });
	const [tape, setTape] = useState([]);
	const [ladder, setLadder] = useState({ bids: [], asks: [], spread: 0 });
	const [cross, setCross] = useState(null);
	const { t } = useI18n();

	const canvasRef = useRef(null);
	const wrapRef = useRef(null);
	const pausedRef = useRef(paused);
	const settingsRef = useRef({ colSecs, rows, minTrade, intensity, candleSecs, waiting: '' });
	pausedRef.current = paused;
	settingsRef.current = { colSecs, rows, minTrade, intensity, candleSecs, waiting: t('of.waitingBook') };
	const sampleRef = useRef(onSample);
	sampleRef.current = onSample;

	const buf = useRef(null);

	const resetBuffers = useCallback((rowsN) => {
		buf.current = {
			cols: [], anchor: 0, tick: 1, lastPrice: 0,
			lastDepth: null, sessionMax: 0, maxPrint: 0,
			liveBuys: new Float32Array(rowsN), liveSells: new Float32Array(rowsN),
			liveBids: new Float32Array(rowsN), liveAsks: new Float32Array(rowsN),
			vNum: 0, vDen: 0,
			candles: [], curCandle: null, candlePeriod: 0,
			ts: { high: 0, low: 0, vol: 0, buyVol: 0, sellVol: 0, count: 0, biggest: 0, spread: 0 },
			tape: [],
		};
		setTape([]);
		setStats({ last: 0, high: 0, low: 0, vol: 0, buyVol: 0, sellVol: 0, count: 0, biggest: 0, spread: 0, vwap: 0 });
		setLadder({ bids: [], asks: [], spread: 0 });
	}, []);

	const mapDepthToRows = useCallback((depth, rowsN, anchor, tick) => {
		const bids = new Float32Array(rowsN);
		const asks = new Float32Array(rowsN);
		const put = (arr, price, qty) => {
			const r = Math.round(anchor / tick - price / tick + (rowsN - 1) / 2);
			if (r >= 0 && r < rowsN) arr[r] += qty;
		};
		(depth.bids || []).forEach(([p, q]) => put(bids, p, q));
		(depth.asks || []).forEach(([p, q]) => put(asks, p, q));
		return { bids, asks };
	}, []);

	const pushColumn = useCallback(() => {
		const b = buf.current;
		const { rows: rowsN } = settingsRef.current;
		if (!b || !b.lastDepth || !b.anchor) return;
		const { bids, asks } = mapDepthToRows(b.lastDepth, rowsN, b.anchor, b.tick);
		const col = { bids, asks, buys: b.liveBuys, sells: b.liveSells, t: Date.now() };
		b.cols.push(col);
		if (b.cols.length > COLS) b.cols.shift();
		let colMax = 0;
		for (let r = 0; r < rowsN; r++) colMax = Math.max(colMax, bids[r], asks[r]);
		b.sessionMax = Math.max(b.sessionMax * 0.985, colMax);
		let printMax = 0;
		for (let r = 0; r < rowsN; r++) printMax = Math.max(printMax, col.buys[r], col.sells[r]);
		b.maxPrint = Math.max(b.maxPrint * 0.97, printMax);
		b.liveBuys = new Float32Array(rowsN);
		b.liveSells = new Float32Array(rowsN);
		if (b.lastPrice) {
			const drift = (b.lastPrice - b.anchor) / b.tick;
			if (Math.abs(drift) > 6) {
				const shift = Math.round(drift);
				b.cols.forEach((c) => {
					[c.bids, c.asks, c.buys, c.sells].forEach((arr) => {
						if (shift > 0) { arr.copyWithin(0, shift); arr.fill(0, rowsN - shift); }
						else if (shift < 0) { arr.copyWithin(-shift, 0); arr.fill(0, 0, -shift); }
					});
				});
				b.anchor += shift * b.tick;
			}
		}
	}, [mapDepthToRows]);

	// ── Feed subscription (per-pane, routed by symbol) ─────────────
	useEffect(() => {
		resetBuffers(rows);
		const unsubStatus = orderflowFeed.onStatus(setStatus);
		const unsub = orderflowFeed.subscribe(symbol, {
			onDepth: (depth) => {
				const b = buf.current;
				if (!b) return;
				b.lastDepth = depth;
				const bestBid = depth.bids?.[0]?.[0];
				const bestAsk = depth.asks?.[0]?.[0];
				if (Number.isFinite(bestBid) && Number.isFinite(bestAsk)) {
					const mid = (bestBid + bestAsk) / 2;
					b.lastPrice = mid;
					if (!b.anchor) {
						b.tick = niceTick(mid / 500);
						b.anchor = Math.round(mid / b.tick) * b.tick;
						b.ts.high = mid; b.ts.low = mid;
					}
					b.ts.spread = bestAsk - bestBid;
				}
			},
			onTrade: (tr) => {
				const b = buf.current;
				if (!b || pausedRef.current) return;
				const { minTrade: mt, rows: rowsN } = settingsRef.current;
				if (!b.anchor) return;
				const notional = tr.price * tr.qty;
				const st = b.ts;
				st.vol += notional; st.count += 1;
				if (tr.side === 'buy') st.buyVol += notional; else st.sellVol += notional;
				b.vNum += notional; b.vDen += tr.qty;
				if (tr.price > st.high) st.high = tr.price;
				if (tr.price < st.low || !st.low) st.low = tr.price;
				if (notional > st.biggest) st.biggest = notional;
				// Trade-built candles (all prints, independent of the dot filter).
				const period = settingsRef.current.candleSecs;
				if (period > 0) {
					if (b.candlePeriod !== period) { b.candlePeriod = period; b.candles = []; b.curCandle = null; }
					const bucket = Math.floor(tr.ts / (period * 1000));
					if (!b.curCandle || b.curCandle.t0 !== bucket) {
						if (b.curCandle) {
							b.candles.push(b.curCandle);
							if (b.candles.length > MAX_CANDLES) b.candles.shift();
						}
						b.curCandle = { t0: bucket, t: bucket * period * 1000, o: tr.price, h: tr.price, l: tr.price, c: tr.price, bv: 0, sv: 0 };
					}
					const cc = b.curCandle;
					cc.h = Math.max(cc.h, tr.price); cc.l = Math.min(cc.l, tr.price); cc.c = tr.price;
					if (tr.side === 'buy') cc.bv += notional; else cc.sv += notional;
				}
				const r = Math.round(b.anchor / b.tick - tr.price / b.tick + (rowsN - 1) / 2);
				if (r < 0 || r >= rowsN || notional < mt) return;
				if (tr.side === 'buy') b.liveBuys[r] += notional; else b.liveSells[r] += notional;
				b.tape.unshift({ id: `${tr.ts}-${Math.random().toString(36).slice(2, 7)}`, ts: tr.ts, price: tr.price, qty: tr.qty, notional, side: tr.side });
				if (b.tape.length > 60) b.tape.length = 60;
			},
		});
		return () => { unsubStatus(); unsub(); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [symbol, rows]);

	// ── Main loop ──────────────────────────────────────────────────
	useEffect(() => {
		let raf = 0;
		let lastPush = 0;
		let lastFlush = 0;
		const loop = (now) => {
			raf = requestAnimationFrame(loop);
			const b = buf.current;
			if (!b || pausedRef.current) { draw(true); return; }
			const { colSecs: cs } = settingsRef.current;
			if (!lastPush) lastPush = now;
			if (now - lastPush >= cs * 1000) { pushColumn(); lastPush = now; }
			if (b.lastDepth && b.anchor) {
				const { rows: rowsN } = settingsRef.current;
				const { bids, asks } = mapDepthToRows(b.lastDepth, rowsN, b.anchor, b.tick);
				b.liveBids = bids; b.liveAsks = asks;
			}
			if (now - lastFlush > 600) {
				lastFlush = now;
				setStats({
					last: b.lastPrice, high: b.ts.high, low: b.ts.low, vol: b.ts.vol,
					buyVol: b.ts.buyVol, sellVol: b.ts.sellVol, count: b.ts.count,
					biggest: b.ts.biggest, spread: b.ts.spread,
					vwap: b.vDen > 0 ? b.vNum / b.vDen : 0,
				});
				setTape(b.tape.slice(0, 30));
				if (sampleRef.current && b.lastPrice) sampleRef.current(symbol, b.lastPrice, now);
				if (b.lastDepth) {
					const withTotals = (levels) => {
						let cum = 0;
						return levels.slice(0, 12).map(([p, q]) => { cum += q; return { p, q, cum }; });
					};
					const asks = withTotals([...(b.lastDepth.asks || [])].reverse().slice(0, 12).reverse());
					const bids = withTotals(b.lastDepth.bids || []);
					const bestBid = b.lastDepth.bids?.[0]?.[0] || 0;
					const bestAsk = b.lastDepth.asks?.[0]?.[0] || 0;
					setLadder({ bids, asks, spread: bestAsk && bestBid ? bestAsk - bestBid : 0 });
				}
			}
			draw(false);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pushColumn, mapDepthToRows, symbol]);

	const draw = useCallback((frozen) => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		const b = buf.current;
		if (!canvas || !wrap || !b) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const W = wrap.clientWidth;
		const H = Math.max(320, wrap.clientHeight || 420);
		if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
		}
		const ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const { rows: rowsN, intensity: inten, candleSecs: cs } = settingsRef.current;
		const AX_W = 64;
		const AX_H = 20;
		const volH = cs > 0 ? VOL_H : 0;
		const plotW = Math.max(50, W - AX_W - LAD_W);
		const plotH = Math.max(50, H - AX_H - volH);
		const cellW = plotW / COLS;
		const cellH = plotH / rowsN;

		ctx.fillStyle = '#07070a';
		ctx.fillRect(0, 0, W, H);

		const maxV = Math.max(1e-9, b.sessionMax);
		const maxP = Math.max(1e-9, b.maxPrint);
		const n = b.cols.length;

		for (let ci = 0; ci < n; ci++) {
			const col = b.cols[ci];
			const x = AX_W + ci * cellW;
			for (let r = 0; r < rowsN; r++) {
				const bv = Math.min(1, (col.bids[r] / maxV) * inten);
				const av = Math.min(1, (col.asks[r] / maxV) * inten);
				if (bv > 0.02) {
					ctx.fillStyle = `rgba(${BID[0]},${BID[1]},${BID[2]},${(0.05 + 0.85 * bv).toFixed(3)})`;
					ctx.fillRect(x, r * cellH, Math.max(1, cellW - 0.4), Math.max(1, cellH - 0.4));
				}
				if (av > 0.02) {
					ctx.fillStyle = `rgba(${ASK[0]},${ASK[1]},${ASK[2]},${(0.05 + 0.85 * av).toFixed(3)})`;
					ctx.fillRect(x, r * cellH, Math.max(1, cellW - 0.4), Math.max(1, cellH - 0.4));
				}
			}
			const dots = [];
			for (let r = 0; r < rowsN; r++) {
				if (col.buys[r] > 0) dots.push({ r, v: col.buys[r], side: 'buy' });
				if (col.sells[r] > 0) dots.push({ r, v: col.sells[r], side: 'sell' });
			}
			dots.sort((a, z) => z.v - a.v);
			const cx = x + cellW / 2;
			dots.slice(0, 24).forEach(({ r, v, side }) => {
				const rad = 1.4 + 4.5 * Math.sqrt(Math.min(1, v / maxP));
				ctx.beginPath();
				ctx.fillStyle = side === 'buy' ? BUY : SELL;
				ctx.globalAlpha = 0.9;
				ctx.arc(cx, r * cellH + cellH / 2, rad, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
			});
		}

		if (!frozen && b.anchor) {
			const x = AX_W + n * cellW;
			const w = Math.max(1, Math.min(cellW * 1.6, plotW - n * cellW));
			for (let r = 0; r < rowsN; r++) {
				const bv = Math.min(1, ((b.liveBids[r] || 0) / maxV) * inten * 1.4);
				const av = Math.min(1, ((b.liveAsks[r] || 0) / maxV) * inten * 1.4);
				if (bv > 0.02) {
					ctx.fillStyle = `rgba(${BID[0]},${BID[1]},${BID[2]},${(0.08 + 0.9 * bv).toFixed(3)})`;
					ctx.fillRect(x, r * cellH, w, Math.max(1, cellH - 0.4));
				}
				if (av > 0.02) {
					ctx.fillStyle = `rgba(${ASK[0]},${ASK[1]},${ASK[2]},${(0.08 + 0.9 * av).toFixed(3)})`;
					ctx.fillRect(x, r * cellH, w, Math.max(1, cellH - 0.4));
				}
			}
		}

		const rowY = (price) => (b.anchor / b.tick - price / b.tick + (rowsN - 1) / 2) * cellH + cellH / 2;

		ctx.font = '10px "JetBrains Mono", monospace';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#8a8577';
		ctx.textAlign = 'left';
		if (b.anchor) {
			for (let r = 0; r < rowsN; r += 10) {
				const price = b.anchor + ((rowsN - 1) / 2 - r) * b.tick;
				ctx.fillText(fmtPrice(price), 4, r * cellH + cellH / 2);
			}
		} else {
			ctx.fillText(settingsRef.current.waiting || '…', 4, 20);
		}

		ctx.textAlign = 'center';
		for (let ci = 0; ci < n; ci += 30) {
			const col = b.cols[ci];
			if (!col) continue;
			ctx.fillText(fmtClock(col.t), AX_W + ci * cellW + cellW / 2, plotH + AX_H / 2);
		}

		// Session VWAP line (cyan).
		const vwap = b.vDen > 0 ? b.vNum / b.vDen : 0;
		if (vwap && b.anchor) {
			const y = Math.max(0, Math.min(plotH, rowY(vwap)));
			ctx.strokeStyle = VWAP;
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 4]);
			ctx.beginPath();
			ctx.moveTo(AX_W, y);
			ctx.lineTo(W, y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.font = 'bold 9px "JetBrains Mono", monospace';
			ctx.fillStyle = VWAP;
			ctx.textAlign = 'left';
			ctx.fillText(`VWAP ${fmtPrice(vwap)}`, 4, Math.min(plotH - 8, Math.max(8, y - 10)));
		}

		// Trade-built candles overlay + bottom volume bars.
		if (cs > 0) {
			const all = b.curCandle ? [...b.candles, b.curCandle] : b.candles;
			const shown = all.slice(-SHOW_CANDLES);
			const cw = plotW / SHOW_CANDLES;
			let maxVol = 1e-9;
			shown.forEach((c) => { maxVol = Math.max(maxVol, c.bv + c.sv); });
			shown.forEach((c, i) => {
				const cx = AX_W + plotW - (shown.length - i) * cw;
				const up = c.c >= c.o;
				const col = up ? BUY : SELL;
				const cy = (v) => Math.max(0, Math.min(plotH, rowY(v)));
				const yO = cy(c.o);
				const yC = cy(c.c);
				const yH = cy(c.h);
				const yL = cy(c.l);
				ctx.strokeStyle = col;
				ctx.globalAlpha = 0.9;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(cx + cw / 2, yH);
				ctx.lineTo(cx + cw / 2, yL);
				ctx.stroke();
				ctx.fillStyle = col;
				const top = Math.min(yO, yC);
				const hgt = Math.max(1.5, Math.abs(yC - yO));
				ctx.fillRect(cx + 1, top, Math.max(1.5, cw - 2), hgt);
				ctx.globalAlpha = 1;
				// Volume bar (buy share green at base, sell share red on top).
				const tot = c.bv + c.sv;
				if (tot > 0) {
					const bh = Math.max(1, ((tot / maxVol) * (volH - 8)));
					const base = plotH + AX_H + volH - 3;
					const buyH = bh * (c.bv / tot);
					ctx.fillStyle = BUY;
					ctx.globalAlpha = 0.85;
					ctx.fillRect(cx + 1, base - buyH, Math.max(1.5, cw - 2), buyH);
					ctx.fillStyle = SELL;
					ctx.fillRect(cx + 1, base - bh, Math.max(1.5, cw - 2), Math.max(0, bh - buyH));
					ctx.globalAlpha = 1;
				}
			});
		}

		// Last-price line (gold).
		if (b.lastPrice && b.anchor) {
			const y = Math.max(0, Math.min(plotH, rowY(b.lastPrice)));
			ctx.strokeStyle = GOLD;
			ctx.lineWidth = 1;
			ctx.setLineDash([5, 4]);
			ctx.beginPath();
			ctx.moveTo(AX_W, y);
			ctx.lineTo(W, y);
			ctx.stroke();
			ctx.setLineDash([]);
			const label = fmtPrice(b.lastPrice);
			ctx.font = 'bold 10px "JetBrains Mono", monospace';
			const tw = ctx.measureText(label).width + 10;
			ctx.fillStyle = GOLD;
			ctx.fillRect(0, y - 9, Math.min(AX_W - 2, tw + 6), 18);
			ctx.fillStyle = '#0a0a0f';
			ctx.textAlign = 'left';
			ctx.fillText(label, 4, y);
		}
	}, []);

	const onMouseMove = useCallback((e) => {
		const wrap = wrapRef.current;
		const b = buf.current;
		if (!wrap || !b || !b.anchor) { setCross(null); return; }
		const rect = wrap.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const { rows: rowsN } = settingsRef.current;
		const AX_W = 64;
		const plotH = Math.max(50, Math.max(320, wrap.clientHeight || 420) - 20);
		const cellH = plotH / rowsN;
		const r = Math.floor(y / cellH);
		if (r < 0 || r >= rowsN) { setCross(null); return; }
		const price = b.anchor + ((rowsN - 1) / 2 - r) * b.tick;
		const ci = Math.max(0, Math.min(b.cols.length - 1, Math.floor((x - AX_W) / ((Math.max(50, rect.width - AX_W)) / COLS))));
		setCross({ x, y, price, t: b.cols[ci]?.t || null });
	}, []);

	const buyShare = stats.vol > 0 ? (stats.buyVol / stats.vol) * 100 : 50;
	const vwapDist = stats.vwap && stats.last ? ((stats.last - stats.vwap) / stats.vwap) * 100 : 0;
	const statusColor = status === 'connected' ? 'text-emerald-400' : status === 'reconnecting' || status === 'connecting' ? 'text-[#d4af37]' : 'text-red-400';

	return (
		<div className={`glass flex h-full flex-col overflow-hidden rounded-2xl ${focused ? 'ring-1 ring-[#d4af37]/50' : ''}`}>
			{/* Pane header */}
			<div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-3 py-2">
				<button onClick={onFocus} className="min-w-0 flex-1 text-left">
					<span className="flex items-baseline gap-2">
						<span className="font-mono text-sm font-bold text-[#f0ecdd]">{symbol.replace('USD', '/USD')}</span>
						<span className="truncate font-mono text-xs text-[#d4af37]">{fmtPrice(stats.last)}</span>
						{stats.vwap > 0 && (
							<span className={`truncate font-mono text-[10px] ${vwapDist >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
								VWAP {fmtPrice(stats.vwap)} ({vwapDist >= 0 ? '+' : ''}{vwapDist.toFixed(2)}%)
							</span>
						)}
					</span>
				</button>
				<span className={`flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase ${statusColor}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'animate-pulse bg-emerald-400' : 'bg-current'}`} />
					{t(`of.st${status.charAt(0).toUpperCase() + status.slice(1)}`, null, status)}
				</span>
				{canRemove && (
					<button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#8a8577] transition hover:bg-white/5 hover:text-red-400" aria-label={t('of.removeSym', { s: symbol })}>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* Heatmap */}
			<div ref={wrapRef} onMouseMove={onMouseMove} onMouseLeave={() => setCross(null)} className="relative h-[44vh] min-h-[340px] w-full cursor-crosshair touch-none select-none">
				<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
							{cross && (
								<div className="pointer-events-none absolute inset-0">
									<div className="absolute inset-y-0 w-px bg-white/25" style={{ left: cross.x }} />
									<div className="absolute inset-x-0 h-px bg-white/25" style={{ top: cross.y }} />
									<div className="absolute rounded-md border border-[#d4af37]/40 bg-[#0a0a0f]/90 px-2 py-1 font-mono text-[10px] text-[#f0ecdd] backdrop-blur-md" style={{ left: Math.min(cross.x + 12, 180), top: Math.max(cross.y - 40, 4) }}>
										<div>{fmtPrice(cross.price)}</div>
										{cross.t && <div className="text-[#8a8577]">{fmtClock(cross.t)}</div>}
									</div>
								</div>
							)}
							{/* Docked DOM — current book, Bookmap Web style */}
							<div className="absolute bottom-0 right-0 top-0 flex w-[104px] flex-col border-l border-[#d4af37]/15 bg-black/55 py-1 backdrop-blur-sm">
								<div className="px-1.5 pb-1 text-center text-[8px] font-bold uppercase tracking-widest text-[#8a8577]">DOM</div>
								<div className="no-scrollbar min-h-0 flex-1 space-y-px overflow-hidden px-1 font-mono text-[10px] leading-[1.55]">
									{[...ladder.asks].reverse().map((a, i) => (
										<div key={`da-${i}`} className="relative overflow-hidden rounded-sm bg-white/[0.03] px-1">
											<div className="absolute inset-y-0 left-0 bg-[#fb923c]/25" style={{ width: `${Math.max(2, (a.cum / Math.max(1e-9, ...ladder.asks.map((x) => x.cum), ...ladder.bids.map((x) => x.cum))) * 100)}%` }} />
											<div className="relative flex justify-between"><span className="text-[#fdba74]">{fmtPrice(a.p)}</span><span className="text-[#c9c4b4]">{fmtQty(a.q)}</span></div>
										</div>
									))}
									<div className="rounded-sm bg-[#d4af37]/15 px-1 text-center font-bold text-[#d4af37]">{ladder.spread ? fmtPrice(ladder.spread) : '—'}</div>
									{ladder.bids.map((b, i) => (
										<div key={`db-${i}`} className="relative overflow-hidden rounded-sm bg-white/[0.03] px-1">
											<div className="absolute inset-y-0 left-0 bg-[#38bdf8]/25" style={{ width: `${Math.max(2, (b.cum / Math.max(1e-9, ...ladder.asks.map((x) => x.cum), ...ladder.bids.map((x) => x.cum))) * 100)}%` }} />
											<div className="relative flex justify-between"><span className="text-[#7dd3fc]">{fmtPrice(b.p)}</span><span className="text-[#c9c4b4]">{fmtQty(b.q)}</span></div>
										</div>
									))}
								</div>
							</div>
			</div>

			{/* Stat strip */}
			<div className="grid grid-cols-3 gap-1.5 border-t border-[#d4af37]/10 p-2.5 sm:grid-cols-5">
				{[[t('of.vol'), fmtMoney(stats.vol)], [t('of.buyPct'), `${buyShare.toFixed(1)}%`], [t('of.prints'), stats.count.toLocaleString()], [t('of.biggest'), fmtMoney(stats.biggest)], [t('of.spread'), stats.spread ? fmtPrice(stats.spread) : '—']].map(([l, v]) => (
					<div key={l} className="rounded-lg bg-white/[0.02] px-2 py-1.5">
						<div className="text-[9px] uppercase tracking-wider text-[#8a8577]">{l}</div>
						<div className="truncate font-mono text-xs font-semibold text-[#f0ecdd]">{v}</div>
					</div>
				))}
			</div>
			<div className="px-2.5 pb-2.5">
				<div className="flex h-1.5 overflow-hidden rounded-full bg-[#fb7185]/25">
					<div className="h-full bg-[#34d399]" style={{ width: `${buyShare}%` }} />
				</div>
			</div>

			{/* Expanded: ladder + tape */}
			{expanded && (
				<div className="grid gap-2 border-t border-[#d4af37]/10 p-2.5 sm:grid-cols-2">
					<div>
						<h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8a8577]">{t('of.depthLadder')}</h4>
						<div className="space-y-[3px] font-mono text-[11px]">
							{[...ladder.asks].reverse().map((a, i) => (
								<LadderRow key={`a-${i}`} price={a.p} qty={a.q} cum={a.cum} max={Math.max(1e-9, ...ladder.asks.map((x) => x.cum), ...ladder.bids.map((x) => x.cum))} side="ask" />
							))}
							<div className="flex items-center justify-between rounded bg-[#d4af37]/10 px-2 py-1 text-[#d4af37]">
								<span>{t('of.spread').toUpperCase()}</span><span>{ladder.spread ? fmtPrice(ladder.spread) : '—'}</span>
							</div>
							{ladder.bids.map((b, i) => (
								<LadderRow key={`b-${i}`} price={b.p} qty={b.q} cum={b.cum} max={Math.max(1e-9, ...ladder.asks.map((x) => x.cum), ...ladder.bids.map((x) => x.cum))} side="bid" />
							))}
							{!ladder.bids.length && <p className="py-2 text-center text-[11px] text-[#5f5b50]">{t('of.waitingBook')}</p>}
						</div>
					</div>
					<div>
						<h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8a8577]">{t('of.bigTape')}</h4>
						<div className="no-scrollbar max-h-72 space-y-1 overflow-y-auto font-mono text-[11px]">
							{tape.length === 0 && <p className="py-2 text-center text-[11px] text-[#5f5b50]">{t('of.printsLive')}</p>}
							{tape.map((p) => (
								<div key={p.id} className="flex items-center gap-2 rounded bg-white/[0.02] px-2 py-1">
									<span className={`font-bold ${p.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{p.side === 'buy' ? 'B' : 'S'}</span>
									<span className="flex-1 truncate text-[#e9e7df]">{fmtPrice(p.price)}</span>
									<span className="text-[#8a8577]">{fmtQty(p.qty)}</span>
									<span className="hidden text-[#5f5b50] sm:inline">{fmtClock(p.ts)}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function LadderRow({ price, qty, cum, max, side }) {
	const w = Math.max(2, (cum / max) * 100);
	return (
		<div className="relative overflow-hidden rounded bg-white/[0.02] px-2 py-[3px]">
			<div className="absolute inset-y-0 left-0 opacity-25" style={{ width: `${w}%`, background: side === 'bid' ? 'rgb(56,189,248)' : 'rgb(251,146,60)' }} />
			<div className="relative flex items-center justify-between">
				<span className={side === 'bid' ? 'text-[#7dd3fc]' : 'text-[#fdba74]'}>{fmtPrice(price)}</span>
				<span className="text-[#c9c4b4]">{fmtQty(qty)}</span>
			</div>
		</div>
	);
}
