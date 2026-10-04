import React, { useEffect, useRef, useState } from 'react';
import { X, Radio } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
import { fmtPrice } from '@/components/OrderflowChart';

const ROWS = 21;
const MAX_PRINTS = 80;
const IDLE_POLLS = 3;

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

// Honest quote-based live tape for markets with NO public order book
// (forex, commodities, sectors, stocks). Every print is a REAL quote update
// classified by tick rule (uptick = buy pressure, downtick = sell pressure).
// No depth, no volume, no fabrication: if quotes stop changing the pane says
// the feed is idle instead of inventing flow.
export default function FlowTapePane({ symbol, name, onRemove, canRemove, onSample }) {
	const { quotes, status } = useQuotes([symbol], { refreshMs: 15000 });
	const [prints, setPrints] = useState([]);
	const [idlePolls, setIdlePolls] = useState(0);
	const prevRef = useRef(null);
	const sampleRef = useRef(onSample);
	sampleRef.current = onSample;

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
		setPrints((old) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, price: q.price, side, ts: Date.now() }, ...old].slice(0, MAX_PRINTS));
		if (sampleRef.current) sampleRef.current(symbol, q.price, Date.now());
	}, [quotes, symbol]);

	const last = quotes[symbol]?.price;
	const idle = idlePolls >= IDLE_POLLS;
	const buys = prints.filter((p) => p.side === 'buy').length;
	const sells = prints.length - buys;
	const buyShare = prints.length ? (buys / prints.length) * 100 : 50;

	// Footprint grid from real prints.
	let grid = null;
	if (prints.length >= 2 && Number.isFinite(last)) {
		const tick = tickFor(last);
		const anchor = Math.round(last / tick) * tick;
		const buyRows = new Array(ROWS).fill(0);
		const sellRows = new Array(ROWS).fill(0);
		prints.forEach((p) => {
			const r = Math.round(anchor / tick - p.price / tick + (ROWS - 1) / 2);
			if (r >= 0 && r < ROWS) {
				if (p.side === 'buy') buyRows[r] += 1;
				else sellRows[r] += 1;
			}
		});
		const peak = Math.max(1, ...buyRows, ...sellRows);
		grid = { buyRows, sellRows, peak, anchor, tick };
	}

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
					{idle ? 'idle' : status}
				</span>
				{canRemove && (
					<button onClick={onRemove} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#8a8577] transition hover:bg-white/5 hover:text-red-400" aria-label={`Remove ${symbol}`}>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{/* Footprint bars from real prints */}
			<div className="flex-1 p-2.5">
				{!grid ? (
					<p className="py-6 text-center text-[11px] leading-relaxed text-[#5f5b50]">
						{idle && prints.length === 0 ? 'No live ticks for this symbol — market may be closed or the feed idle. No flow invented.' : 'Collecting live prints…'}
					</p>
				) : (
					<div className="space-y-[2px]">
						{grid.buyRows.map((bv, r) => {
							const sv = grid.sellRows[r];
							const price = grid.anchor + ((ROWS - 1) / 2 - r) * grid.tick;
							const inWin = r >= (ROWS - 1) / 2 - 6 && r <= (ROWS - 1) / 2 + 6;
							if (!inWin && bv === 0 && sv === 0) return null;
							return (
								<div key={r} className="flex items-center gap-1">
									<span className="w-16 shrink-0 text-right font-mono text-[10px] text-[#8a8577]">{fmtPrice(price)}</span>
									<div className="flex h-3.5 min-w-0 flex-1 items-center justify-end gap-0 overflow-hidden rounded bg-white/[0.02]">
										{bv > 0 && <div className="h-full bg-[#34d399]/70" style={{ width: `${Math.max(3, (bv / grid.peak) * 50)}%` }} />}
									</div>
									<div className="flex h-3.5 min-w-0 flex-1 items-center gap-0 overflow-hidden rounded bg-white/[0.02]">
										{sv > 0 && <div className="h-full bg-[#fb7185]/70" style={{ width: `${Math.max(3, (sv / grid.peak) * 50)}%` }} />}
									</div>
									<span className="w-14 shrink-0 font-mono text-[10px] text-[#8a8577]">{bv > 0 || sv > 0 ? `${bv}×${sv}` : ''}</span>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Tape */}
			<div className="border-t border-[#d4af37]/10 p-2.5">
				<div className="no-scrollbar max-h-36 space-y-1 overflow-y-auto font-mono text-[11px]">
					{prints.slice(0, 20).map((p) => (
						<div key={p.id} className="flex items-center gap-2 rounded bg-white/[0.02] px-2 py-0.5">
							<span className={`font-bold ${p.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{p.side === 'buy' ? 'B' : 'S'}</span>
							<span className="flex-1 text-[#e9e7df]">{fmtPrice(p.price)}</span>
							<span className="text-[#5f5b50]">{fmtClock(p.ts)}</span>
						</div>
					))}
					{prints.length === 0 && <p className="py-1 text-center text-[11px] text-[#5f5b50]">tape is live — prints appear on real ticks</p>}
				</div>
				<div className="mt-2">
					<div className="flex h-1.5 overflow-hidden rounded-full bg-[#fb7185]/25">
						<div className="h-full bg-[#34d399]" style={{ width: `${buyShare}%` }} />
					</div>
					<div className="mt-1 flex justify-between text-[10px] text-[#8a8577]">
						<span>{buys} buys</span>
						<span className="text-[#5f5b50]">quote tape · no public depth</span>
						<span>{sells} sells</span>
					</div>
				</div>
			</div>
		</div>
	);
}
