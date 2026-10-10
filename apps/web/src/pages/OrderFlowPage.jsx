import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	Activity, Pause, Play, Timer, Filter, Layers, Droplets,
	Plus, GitCompareArrows, CandlestickChart,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useI18n } from '@/lib/i18n';
import OrderflowChart from '@/components/OrderflowChart';
import FlowTapePane from '@/components/FlowTapePane';
import { ALL_SYMBOLS, isFlowSymbol } from '@/lib/orderflowFeed';
import { SYMBOL_GROUPS } from '@/lib/symbols';

const MARKET_TABS = [
	{ id: 'all', key: 'c.all' },
	{ id: 'crypto', key: 'hm.crypto' },
	{ id: 'forex', key: 'hm.forex' },
	{ id: 'commodity', key: 'hm.commodity' },
	{ id: 'sector', key: 'hm.sector' },
	{ id: 'stock', key: 'hm.stock' },
];

function groupSymbols(label) {
	return (SYMBOL_GROUPS.find((g) => g.label === label)?.symbols || []).map((s) => ({ symbol: s.symbol, name: s.name }));
}

const DEFAULT_TAPES = {
	forex: ['EURUSD', 'GBPUSD', 'USDJPY'],
	commodity: ['XAUUSD', 'XAGUSD', 'WTIUSD'],
	sector: ['XLK', 'XLF', 'XLE'],
	stock: ['AAPL', 'NVDA', 'TSLA'],
};
const ALL_TAPES = ['EURUSD', 'XAUUSD', 'AAPL'];

function nameFor(symbol) {
	for (const g of SYMBOL_GROUPS) {
		const hit = g.symbols.find((s) => s.symbol === symbol);
		if (hit) return hit.name;
	}
	return symbol;
}

const COL_SECS = [1, 2, 5];
const ROW_OPTS = [41, 61, 81];
const TRADE_FILTERS = [1000, 10000, 25000, 100000];
const CANDLE_TFS = [
	{ label: 'Off', secs: 0 },
	{ label: '15s', secs: 15 },
	{ label: '1m', secs: 60 },
	{ label: '5m', secs: 300 },
];
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
	// Order Flow is fully translated via of.* keys (trading terms kept short per language).
	const { t } = useI18n();
	const [panes, setPanes] = useState(['BTCUSD']);
	const [focus, setFocus] = useState('BTCUSD');
	const [market, setMarket] = useState('all');
	const [tapePanes, setTapePanes] = useState(ALL_TAPES);
	const [colSecs, setColSecs] = useState(2);
	const [rows, setRows] = useState(61);
	const [minTrade, setMinTrade] = useState(10000);
	const [intensity, setIntensity] = useState(1);
	const [candleSecs, setCandleSecs] = useState(60);
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

	const switchMarket = useCallback((m) => {
		setMarket(m);
		if (m !== 'all' && m !== 'crypto') setTapePanes(DEFAULT_TAPES[m] || []);
		if (m === 'all') setTapePanes(ALL_TAPES);
		setPickerQ('');
	}, []);

	const addTape = useCallback((s) => {
		setTapePanes((prev) => {
			if (prev.includes(s) || prev.length >= MAX_PANES) return prev;
			return [...prev, s];
		});
		setPickerQ('');
	}, []);

	const removeTape = useCallback((s) => {
		setTapePanes((prev) => {
			if (prev.length <= 1) return prev;
			delete histories.current[s];
			return prev.filter((x) => x !== s);
		});
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
		<AppLayout title={t('of.title')}>
			{/* ── Control bar ─────────────────────────────────────── */}
			<div className="tint-hero mb-4 rounded-2xl border border-[#d4af37]/15 p-4 sm:p-5">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-[#d4af37]" />
						<span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">{market === 'crypto' || market === 'all' ? t('of.depthHead', { a: panes.length, b: MAX_PANES }) : t('of.tapeHead', { a: tapePanes.length, b: MAX_PANES })}</span>
					</div>
					<span className="ml-auto flex items-center gap-1.5">
						<Link to="/app/terminal-pro?view=orderflow" className="whitespace-nowrap rounded-lg border border-[#d4af37]/30 px-2.5 py-1.5 text-xs font-semibold text-[#d4af37]">Terminal Pro</Link>
						<button onClick={() => setPaused((p) => !p)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#d4af37]/25 text-[#d4af37] transition hover:border-[#d4af37]/60" aria-label={paused ? t('of.resumeAll') : t('of.pauseAll')}>
							{paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
						</button>
					</span>
				</div>

				{/* Market tabs — All / Crypto / Forex / Commodities / Sectors / Stocks */}
				<div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap">
					{MARKET_TABS.map((m) => (
						<button
							key={m.id}
							onClick={() => switchMarket(m.id)}
							className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${market === m.id ? 'bg-[#d4af37] text-[#0a0a0f]' : 'border border-[#d4af37]/20 text-[#8a8577] hover:text-[#e9e7df]'}`}
						>
							{t(m.key)}
						</button>
					))}
				</div>

				{(market === 'crypto') && (
				<>
				{/* Add-pane picker — all crypto pairs */}
				<div className="mt-3 flex flex-col gap-2 sm:flex-row">
					<input
						value={pickerQ}
						onChange={(e) => setPickerQ(e.target.value)}
						placeholder={t('of.addPairPh')}
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
						{available.length === 0 && <span className="px-2 py-1.5 text-xs text-[#5f5b50]">{panes.length >= MAX_PANES ? t('of.maxPanes', { n: MAX_PANES }) : t('of.allPairs')}</span>}
					</div>
				</div>
				</>
				)}

				{(market === 'all') && (
				<UnifiedPicker
					pickerQ={pickerQ}
					setPickerQ={setPickerQ}
					panes={panes}
					tapePanes={tapePanes}
					onAdd={(s) => { if (isFlowSymbol(s)) addPane(s); else addTape(s); }}
					atCap={panes.length >= MAX_PANES && tapePanes.length >= MAX_PANES}
					t={t}
				/>
				)}

				{(market !== 'crypto' && market !== 'all') && (
				<TapePicker
					market={market}
					tapePanes={tapePanes}
					pickerQ={pickerQ}
					setPickerQ={setPickerQ}
					onAdd={addTape}
					t={t}
				/>
				)}

				{/* Shared heatmap settings (crypto depth panes) */}
				{(market === 'crypto' || market === 'all') && (
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
					<span className="flex items-center gap-1.5">
						<CandlestickChart className="h-3.5 w-3.5" />
						{CANDLE_TFS.map((c) => (
							<button key={c.label} onClick={() => setCandleSecs(c.secs)} className={`rounded-md px-2 py-1 font-mono transition ${candleSecs === c.secs ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'hover:text-[#e9e7df]'}`}>{c.label}</button>
						))}
					</span>
				</div>
				)}
			</div>

			{/* ── Panes — all in one screen ────────────────────────── */}
			{(market === 'crypto' || market === 'all') && (
			<div className={`grid gap-4 ${panes.length > 1 ? '2xl:grid-cols-2' : ''}`}>
				{panes.map((s) => (
					<OrderflowChart
						key={s}
						symbol={s}
						colSecs={colSecs}
						rows={rows}
						minTrade={minTrade}
						intensity={intensity}
						candleSecs={candleSecs}
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
			)}

			{market !== 'crypto' && (
			<>
				<div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#38bdf8]/20 bg-[#38bdf8]/[0.05] p-4 text-xs leading-relaxed text-[#8a8577] backdrop-blur-md">
					<Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#38bdf8]" />
					<p>{t('of.tapeNote', { m: market === 'all' ? t('of.theseMarkets') : t(MARKET_TABS.find((m) => m.id === market)?.key || 'c.all') })}</p>
				</div>
				<div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
					{tapePanes.map((s) => (
						<FlowTapePane
							key={s}
							symbol={s}
							name={nameFor(s)}
							onRemove={() => removeTape(s)}
							canRemove={tapePanes.length > 1}
							onSample={onSample}
						/>
					))}
				</div>
			</>
			)}

			{/* ── Correlation tracker ─────────────────────────────── */}
			<div className="glass mt-4 rounded-2xl p-4 sm:p-5">
				<h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37]">
					<GitCompareArrows className="h-4 w-4" /> {t('of.corrTitle')}
				</h3>
				{corr.length === 0 ? (
					<p className="mt-2 text-xs leading-relaxed text-[#8a8577]">{t('of.corrEmpty')}</p>
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
				<p>{t('of.footer', { n: MAX_PANES })}</p>
			</div>
		</AppLayout>
	);
}

function UnifiedPicker({ pickerQ, setPickerQ, panes, tapePanes, onAdd, atCap, t }) {
	const q = pickerQ.trim().toLowerCase();
	const cryptoPool = ALL_SYMBOLS.filter((s) => !panes.includes(s));
	const tapePool = ['Forex', 'Commodities', 'Sectors', 'Stocks']
		.flatMap((l) => groupSymbols(l))
		.filter((s) => !tapePanes.includes(s.symbol));
	const pool = [
		...cryptoPool.map((s) => ({ symbol: s, name: s.replace('USD', '') + ' · ' + t('of.depthSuffix'), depth: true })),
		...tapePool.map((s) => ({ symbol: s.symbol, name: `${s.name} · ${t('of.tapeSuffix')}`, depth: false })),
	].filter((s) => `${s.symbol} ${s.name}`.toLowerCase().includes(q));
	return (
		<div className="mt-3 flex flex-col gap-2 sm:flex-row">
			<input
				value={pickerQ}
				onChange={(e) => setPickerQ(e.target.value)}
				placeholder={t('of.addAnyPh')}
				className="min-h-[42px] w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 sm:max-w-xs"
			/>
			<div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
				{pool.slice(0, 30).map((s) => (
					<button
						key={s.symbol}
						onClick={() => onAdd(s.symbol)}
						disabled={atCap}
						className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold text-[#8a8577] transition disabled:opacity-40 ${s.depth ? 'border-[#d4af37]/20 hover:text-[#d4af37]' : 'border-[#38bdf8]/25 hover:text-[#38bdf8]'}`}
						title={s.name}
					>
						<Plus className="h-3 w-3" />{s.symbol}
					</button>
				))}
				{pool.length === 0 && <span className="px-2 py-1.5 text-xs text-[#5f5b50]">{atCap ? t('of.maxPanes', { n: MAX_PANES }) : t('of.allOnScreen')}</span>}
			</div>
		</div>
	);
}

function TapePicker({ market, tapePanes, pickerQ, setPickerQ, onAdd, t }) {
	const labels = market === 'all' ? ['Forex', 'Commodities', 'Sectors', 'Stocks']
		: market === 'forex' ? ['Forex']
		: market === 'commodity' ? ['Commodities']
		: market === 'sector' ? ['Sectors']
		: ['Stocks'];
	const pool = labels.flatMap((l) => groupSymbols(l)).filter((s) => !tapePanes.includes(s.symbol) && `${s.symbol} ${s.name}`.toLowerCase().includes(pickerQ.trim().toLowerCase()));
	return (
		<div className="mt-3 flex flex-col gap-2 sm:flex-row">
			<input
				value={pickerQ}
				onChange={(e) => setPickerQ(e.target.value)}
				placeholder={t('of.addSymPh')}
				className="min-h-[42px] w-full rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3.5 text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 sm:max-w-xs"
			/>
			<div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
				{pool.slice(0, 30).map((s) => (
					<button
						key={s.symbol}
						onClick={() => onAdd(s.symbol)}
						disabled={tapePanes.length >= MAX_PANES}
						className="flex shrink-0 items-center gap-1 rounded-lg border border-[#38bdf8]/25 px-3 py-1.5 font-mono text-xs font-semibold text-[#8a8577] transition hover:text-[#38bdf8] disabled:opacity-40"
					>
						<Plus className="h-3 w-3" />{s.symbol}
					</button>
				))}
				{pool.length === 0 && <span className="px-2 py-1.5 text-xs text-[#5f5b50]">{tapePanes.length >= MAX_PANES ? t('of.maxPanes', { n: MAX_PANES }) : t('of.allSyms')}</span>}
			</div>
		</div>
	);
}
