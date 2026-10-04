import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Activity, Pause, Play, Timer, Filter, Layers, Droplets,
	Plus, GitCompareArrows,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import OrderflowChart from '@/components/OrderflowChart';
import { ALL_SYMBOLS } from '@/lib/orderflowFeed';

const COL_SECS = [1, 2, 5];
const ROW_OPTS = [41, 61, 81];
const TRADE_FILTERS = [1000, 10000, 25000, 100000];
const MAX_PANES = 4;
const HIST_CAP = 240;

function pearson(a, b) {
	const n = Math.min(a.length, b.length);
	if (n < 20) return null;
	const xs = a.slice(-n);
	const ys = b.slice(-n);
	const mx = xs.reduce((s, v) => s + v, 0) / n;
	const my = ys.reduce((s, v) => s + v, 0) / n;
	let cov = 0, vx = 0, vy = 0;
	for (let i = 0; i < n; i++) {
		cov += (xs[i] - mx) * (ys[i] - my);
		vx += (xs[i] - mx) ** 2;
		vy += (ys[i] - my) ** 2;
	}
	if (vx <= 0 || vy <= 0) return null;
	return cov / Math.sqrt(vx * vy);
}

function corrStyle(r) {
	if (r === null) return 'text-[#5f5b50]';
	if (r >= 0.7) return 'text-emerald-400';
	if (r >= 0.3) return 'text-[#d4af37]';
	if (r > -0.3) return 'text-[#8a8577]';
	return 'text-red-400';
}

export default function OrderFlowPage() {
	const { t } = useI18n();
	const [panes, setPanes] = useState(['BTCUSD']);
	const [focus, setFocus] = useState('BTCUSD');
	const [colSecs, setColSecs] = useState(2);
	const [rows, setRows] = useState(61);
	const [minTrade, setMinTrade] = useState(10000);
	const [intensity, setIntensity] = useState(1);
	const [paused, setPaused] = useState(false);
	const [pickerQ, setPickerQ] = useState('');
	const [corr, setCorr] = useState([]);

	const histories = useRef({}); // symbol -> [prices]

	const onSample = useCallback((symbol, price) => {
		const h = histories.current[symbol] || (histories.current[symbol] = []);
		if (h[h.length - 1] !== price) {
			h.push(price);
			if (h.length > HIST_CAP) h.shift();
		}
	}, []);

	// Correlation tracker recompute.
	useEffect(() => {
		const id = setInterval(() => {
			const syms = Object.keys(histories.current).filter((s) => (histories.current[s] || []).length >= 20);
			const matrix = [];
			for (let i = 0; i < syms.length; i++) {
				for (let j = i + 1; j < syms.length; j++) {
					matrix.push({ a: syms[i], b: syms[j], r: pearson(histories.current[syms[i]], histories.current[syms[j]]) });
				}
			}
			setCorr(matrix);
		}, 2000);
		return () => clearInterval(id);
	}, []);

	const addPane = useCallback((s) => {
		setPanes((prev) => {
			if (prev.includes(s) || prev.length >= MAX_PANES) return prev;
			return [...prev, s];
		});
		setFocus(s);
		setPickerQ('');
	}, []);

	const removePane = useCallback((s) => {
		setPanes((prev) => {
			if (prev.length <= 1) return prev;
			const next = prev.filter((x) => x !== s);
			delete histories.current[s];
			return next;
		});
		setFocus((f) => (f === s ? panes.find((x) => x !== s) || panes[0] : f));
	}, [panes]);

	useEffect(() => {
		if (!panes.includes(focus)) setFocus(panes[0]);
	}, [panes, focus]);

	const available = ALL_SYMBOLS.filter((s) => !panes.includes(s) && s.toLowerCase().includes(pickerQ.trim().toLowerCase()));

	return (
		<AppLayout title={t('nav.orderflow', null, 'Order Flow')}>
			{/* ── Control bar ─────────────────────────────────────── */}
			<div className="tint-hero mb-4 rounded-2xl border border-[#d4af37]/15 p-4 sm:p-5">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-[#d4af37]" />
						<span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">Bookmap-style depth · {panes.length}/{MAX_PANES}</span>
					</div>
					<span className="ml-auto flex items-center gap-1.5">
						<button onClick={() => setPaused((p) => !p)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60" aria-label={paused ? 'Resume all' : 'Pause all'}>
							{paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
						</button>
					</span>
				</div>

				{/* Add-pane picker — all pairs */}
				<div className="mt-3 flex flex-col gap-2 sm:flex-row">
					<input
						value={pickerQ}
						onChange={(e) => setPickerQ(e.target.value)}
						placeholder="Add a pair — search BTC, SOL, PEPE…"
						className="min-h-[42px] w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 sm:max-w-xs"
					/>
					<div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
						{available.slice(0, 30).map((s) => (
							<button
								key={s}
								onClick={() => addPane(s)}
								disabled={panes.length >= MAX_PANES}
								className="flex shrink-0 items-center gap-1 rounded-lg border border-[#d4af37]/20 px-3 py-1.5 font-mono text-xs font-semibold text-[#8a8577] transition hover:text-[#d4af37] disabled:opacity-40"
							>
								<Plus className="h-3 w-3" />{s.replace('USD', '')}
							</button>
						))}
						{available.length === 0 && <span className="px-2 py-1.5 text-xs text-[#5f5b50]">{panes.length >= MAX_PANES ? `Max ${MAX_PANES} panes — remove one to add another.` : 'All pairs on screen.'}</span>}
					</div>
				</div>

				{/* Shared settings */}
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8a8577]">
					<span className="flex items-center gap-1.5">
						<Timer className="h-3.5 w-3.5" />
						{COL_SECS.map((s) => (
							<button key={s} onClick={() => setColSecs(s)} className={`rounded-md px-2 py-1 font-mono transition ${colSecs === s ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'hover:text-[#e9e7df]'}`}>{s}s</button>
						))}
					</span>
					<span className="flex items-center gap-1.5">
						<Layers className="h-3.5 w-3.5" />
						{ROW_OPTS.map((r) => (
							<button key={r} onClick={() => setRows(r)} className={`rounded-md px-2 py-1 font-mono transition ${rows === r ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'hover:text-[#e9e7df]'}`}>{r}</button>
						))}
					</span>
					<span className="flex items-center gap-1.5">
						<Filter className="h-3.5 w-3.5" />
						{TRADE_FILTERS.map((f) => (
							<button key={f} onClick={() => setMinTrade(f)} className={`rounded-md px-2 py-1 font-mono transition ${minTrade === f ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'hover:text-[#e9e7df]'}`}>${f >= 1000 ? `${f / 1000}k` : f}</button>
						))}
					</span>
					<label className="flex items-center gap-1.5">
						<Droplets className="h-3.5 w-3.5" />
						<input type="range" min={0.4} max={2.5} step={0.1} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="h-1 w-20 accent-[#d4af37]" />
					</label>
				</div>
			</div>

			{/* ── Panes — all in one screen ────────────────────────── */}
			<div className={`grid gap-4 ${panes.length > 1 ? '2xl:grid-cols-2' : ''}`}>
				{panes.map((s) => (
					<OrderflowChart
						key={s}
						symbol={s}
						colSecs={colSecs}
						rows={rows}
						minTrade={minTrade}
						intensity={intensity}
						paused={paused}
						expanded={panes.length === 1 || focus === s}
						focused={focus === s}
						onFocus={() => setFocus(s)}
						onRemove={() => removePane(s)}
						canRemove={panes.length > 1}
						onSample={onSample}
					/>
				))}
			</div>

			{/* ── Correlation tracker ─────────────────────────────── */}
			<div className="glass mt-4 rounded-2xl p-4 sm:p-5">
				<h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
					<GitCompareArrows className="h-4 w-4" /> Correlation tracker
				</h3>
				{corr.length === 0 ? (
					<p className="mt-2 text-xs leading-relaxed text-[#8a8577]">Add a second pair above — rolling correlation appears here once both have 20+ prints. BTC leads, alts follow: high readings mean risk-on lockstep, fading readings warn of rotation or divergence.</p>
				) : (
					<div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						{corr.map(({ a, b, r }) => (
							<div key={`${a}-${b}`} className="flex items-center justify-between rounded-xl border border-[#d4af37]/10 bg-white/[0.02] px-3 py-2.5">
								<span className="font-mono text-xs text-[#c9c4b4]">{a.replace('USD', '')} × {b.replace('USD', '')}</span>
								<span className={`font-mono text-sm font-bold ${corrStyle(r)}`}>{r === null ? '—' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`}</span>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.04] p-4 text-xs leading-relaxed text-[#8a8577] backdrop-blur-md">
				<Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
				<p>Live depth + executed prints stream from Binance public market data (no account needed) — up to {MAX_PANES} pairs on one screen. Blue = resting bid liquidity, orange = resting ask liquidity, dots = executed trades sized by notional, cyan = session VWAP. Click a pane to focus its ladder + tape. Crypto only — forex and stocks have no public order book. Not financial advice. Bookmap® is a trademark of its owner; this is an original TradingBible implementation.</p>
			</div>
		</AppLayout>
	);
}
