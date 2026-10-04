import React, { useEffect, useRef, useState } from 'react';
import { X, Radio } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
import { useI18n } from '@/lib/i18n';
import { fmtPrice } from '@/components/OrderflowChart';

const ROWS = 41;
const COLS = 120;
const COL_SECS = 60;
const MAX_PRINTS = 120;
const IDLE_POLLS = 3;
const BID = [56, 189, 248];
const ASK = [251, 146, 60];
const BUY = '#34d399';
const SELL = '#fb7185';

function tickFor(price) {
	if (!Number.isFinite(price) || price <= 0) return 1;
	const raw = price / 200;
	const steps = [1, 2, 2.5, 5, 10];
	const exp = Math.floor(Math.log10(raw));
	const base = 10 ** exp;
	for (const s of steps) if (s * base >= raw) return s * base;
	return 10 * base;
}

function fmtClock(ts) {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function emptyCol() {
	return { net: new Float32Array(ROWS), cnt: new Float32Array(ROWS), n: 0, t: Date.now() };
}

// Same Bookmap-style heatmap look as the crypto panes — but fed ONLY by
// real quote prints (no depth exists for these markets). Cells show print
// pressure per price level over time; dots are individual prints. The AVG
// line is the session print average (NOT volume-weighted — no volume data).
export default function FlowTapePane({ symbol, name, onRemove, canRemove, onSample }) {
	const { t } = useI18n();
	const { quotes, status } = useQuotes([symbol], { refreshMs: 15000 });
	const [prints, setPrints] = useState([]);
	const [idlePolls, setIdlePolls] = useState(0);
	const prevRef = useRef(null);
	const sampleRef = useRef(onSample);
	sampleRef.current = onSample;

	const canvasRef = useRef(null);
	const wrapRef = useRef(null);
	const buf = useRef({ cols: [], cur: emptyCol(), anchor: 0, tick: 1, last: 0, sum: 0, cnt: 0, colStart: 0 });

	useEffect(() => {
		const q = quotes[symbol];
		if (!q || !Number.isFinite(q.price)) return;
		const prev = prevRef.current;
		prevRef.current = q.price;
		if (prev === null || prev === undefined) return;
		if (q.price === prev) {
			setIdlePolls((n) => n + 1);
			return;
		}
		setIdlePolls(0);
		const side = q.price > prev ? 'buy' : 'sell';
		const now = Date.now();
		const b = buf.current;
		if (!b.anchor) {
			b.tick = tickFor(q.price);
			b.anchor = Math.round(q.price / b.tick) * b.tick;
			b.colStart = now;
		}
		// Advance time columns.
		while (now - b.colStart >= COL_SECS * 1000) {
			b.cols.push(b.cur);
			if (b.cols.length > COLS) b.cols.shift();
			b.cur = emptyCol();
			b.colStart += COL_SECS * 1000;
		}
		// Recenter anchor when price drifts out of frame.
		const drift = (q.price - b.anchor) / b.tick;
		if (Math.abs(drift) > 10) {
			const shift = Math.round(drift);
			[...b.cols, b.cur].forEach((c) => {
				[c.net, c.cnt].forEach((arr) => {
					if (shift > 0) { arr.copyWithin(0, shift); arr.fill(0, ROWS - shift); }
					else if (shift < 0) { arr.copyWithin(-shift, 0); arr.fill(0, 0, -shift); }
				});
			});
			b.anchor += shift * b.tick;
		}
		const r = Math.round(b.anchor / b.tick - q.price / b.tick + (ROWS - 1) / 2);
		if (r >= 0 && r < ROWS) {
			b.cur.net[r] += side === 'buy' ? 1 : -1;
			b.cur.cnt[r] += 1;
			b.cur.n += 1;
		}
		b.last = q.price;
		b.sum += q.price;
		b.cnt += 1;
		setPrints((old) => [{ id: `${now}-${Math.random().toString(36).slice(2, 7)}`, price: q.price, side, ts: now }, ...old].slice(0, MAX_PRINTS));
		if (sampleRef.current) sampleRef.current(symbol, q.price, now);
	}, [quotes, symbol]);

	const last = quotes[symbol]?.price;
	const idle = idlePolls >= IDLE_POLLS;
	const buys = prints.filter((p) => p.side === 'buy').length;
	const sells = prints.length - buys;
	const buyShare = prints.length ? (buys / prints.length) * 100 : 50;

	// ── Canvas heatmap (same visual language as crypto panes) ──────
	useEffect(() => {
		let raf = 0;
		const draw = () => {
			raf = requestAnimationFrame(draw);
			const canvas = canvasRef.current;
			const wrap = wrapRef.current;
			const b = buf.current;
			if (!canvas || !wrap || !b) return;
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const W = wrap.clientWidth;
			const H = Math.max(240, wrap.clientHeight || 280);
			if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
				canvas.width = Math.round(W * dpr);
				canvas.height = Math.round(H * dpr);
			}
			const ctx = canvas.getContext('2d');
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const AX_W = 62;
			const AX_H = 18;
			const plotW = Math.max(50, W - AX_W);
			const plotH = Math.max(50, H - AX_H);
			const cellW = plotW / COLS;
			const cellH = plotH / ROWS;

			ctx.fillStyle = '#07070a';
			ctx.fillRect(0, 0, W, H);

			const all = [...b.cols, b.cur];
			const n = all.length;
			const off = COLS - n;
			all.forEach((col, ci) => {
				const x = AX_W + (off + ci) * cellW;
				for (let r = 0; r < ROWS; r++) {
					const c = col.cnt[r];
					if (c <= 0) continue;
					// Intensity scales gently so single prints still read.
					const v = Math.min(1, c / 6);
					const buyDom = col.net[r] >= 0;
					const rgb = buyDom ? BID : ASK;
					ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.12 + 0.8 * v).toFixed(3)})`;
					ctx.fillRect(x, r * cellH, Math.max(1, cellW - 0.3), Math.max(1, cellH - 0.3));
				}
			});

			// Axes.
			ctx.font = '9px "JetBrains Mono", monospace';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = '#8a8577';
			ctx.textAlign = 'left';
			if (b.anchor) {
				for (let r = 0; r < ROWS; r += 10) {
					const price = b.anchor + ((ROWS - 1) / 2 - r) * b.tick;
					ctx.fillText(fmtPrice(price), 4, r * cellH + cellH / 2);
				}
			} else {
				ctx.fillText('waiting for prints…', 4, 20);
			}
			ctx.textAlign = 'center';
			all.forEach((col, ci) => {
				if (ci % 20 !== 0) return;
				ctx.fillText(fmtClock(col.t), AX_W + (off + ci) * cellW + cellW / 2, plotH + AX_H / 2);
			});

			if (b.anchor && b.last) {
				// Session print average (time-weighted, NOT VWAP — no volume).
				const avg = b.sum / Math.max(1, b.cnt);
				const ay = Math.max(0, Math.min(plotH, (b.anchor / b.tick - avg / b.tick + (ROWS - 1) / 2) * cellH + cellH / 2));
				ctx.strokeStyle = '#22d3ee';
				ctx.lineWidth = 1;
				ctx.setLineDash([3, 4]);
				ctx.beginPath();
				ctx.moveTo(AX_W, ay);
				ctx.lineTo(W, ay);
				ctx.stroke();
				ctx.setLineDash([]);
				// Last print line (gold).
				const ly = Math.max(0, Math.min(plotH, (b.anchor / b.tick - b.last / b.tick + (ROWS - 1) / 2) * cellH + cellH / 2));
				ctx.strokeStyle = '#d4af37';
				ctx.setLineDash([5, 4]);
				ctx.beginPath();
				ctx.moveTo(AX_W, ly);
				ctx.lineTo(W, ly);
				ctx.stroke();
				ctx.setLineDash([]);
				const label = fmtPrice(b.last);
				ctx.font = 'bold 10px "JetBrains Mono", monospace';
				ctx.fillStyle = '#d4af37';
				ctx.fillRect(0, ly - 9, AX_W - 2, 18);
				ctx.fillStyle = '#0a0a0f';
				ctx.textAlign = 'left';
				ctx.fillText(label, 4, ly);
			}
		};
		raf = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<div className="glass flex h-full flex-col overflow-hidden rounded-2xl">
			<div className="flex items-center gap-2 border-b border-[#d4af37]/10 px-3 py-2">
				<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#38bdf8]/12 text-[#38bdf8]">
					<Radio className="h-3.5 w-3.5" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="truncate font-mono text-sm font-bold text-[#f0ecdd]">{symbol} <span className="font-sans text-[10px] font-normal text-[#8a8577]">{name}</span></div>
					<div className="font-mono text-xs text-[#d4af37]">{Number.isFinite(last) ? fmtPrice(last) : '—'}</div>
				</div>
				<span className={`flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase ${idle ? 'text-[#8a8577]' : status === 'live' ? 'text-emerald-400' : 'text-[#d4af37]'}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${!idle && status === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-current'}`} />
					{idle ? t('of.idle') : status === 'live' ? t('of.liveWord') : t(`of.st${String(status).charAt(0).toUpperCase() + String(status).slice(1)}`, null, status)}
				</span>
				{canRemove && (
					<button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#8a8577] transition hover:bg-white/5 hover:text-red-400" aria-label={`Remove ${symbol}`}>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* Heatmap — same look as crypto panes, fed by real prints */}
			<div ref={wrapRef} className="relative h-[280px] min-h-[240px] w-full select-none">
				<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
				{!buf.current.anchor && (
					<div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-[11px] leading-relaxed text-[#5f5b50]">
						{idle && prints.length === 0 ? t('of.idleMsg') : t('of.waitingPrints')}
					</div>
				)}
			</div>

			{/* Tape */}
			<div className="border-t border-[#d4af37]/10 p-2.5">
				<div className="no-scrollbar max-h-32 space-y-1 overflow-y-auto font-mono text-[11px]">
					{prints.slice(0, 16).map((p) => (
						<div key={p.id} className="flex items-center gap-2 rounded bg-white/[0.02] px-2 py-0.5">
							<span className={`font-bold ${p.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{p.side === 'buy' ? 'B' : 'S'}</span>
							<span className="flex-1 text-[#e9e7df]">{fmtPrice(p.price)}</span>
							<span className="text-[#5f5b50]">{fmtClock(p.ts)}</span>
						</div>
					))}
					{prints.length === 0 && <p className="py-1 text-center text-[11px] text-[#5f5b50]">{t('of.tapeLive')}</p>}
				</div>
				<div className="mt-2">
					<div className="flex h-1.5 overflow-hidden rounded-full bg-[#fb7185]/25">
						<div className="h-full bg-[#34d399]" style={{ width: `${buyShare}%` }} />
					</div>
					<div className="mt-1 flex justify-between text-[10px] text-[#8a8577]">
						<span>{buys} {t('of.buys')}</span>
						<span className="text-[#5f5b50]">{t('of.noDepthNote')}</span>
						<span>{sells} {t('of.sells')}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
