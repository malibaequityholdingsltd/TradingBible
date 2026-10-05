// TradingBible Academy — SI orchestration + data access.
// The SI is in charge of everything: it designs the learning path, writes
// every lesson, builds and grades quizzes, hosts live webinars and tutors
// students. Generated content is cached per user so the SI only runs once
// per piece of content.

import { Transform } from 'node:stream';
import logger from '../utils/logger.js';
import { supabaseRest } from '../utils/supabaseClient.js';
import { generateText, stream } from './integrated-ai.js';
import {
	AcademyCertificatePrompt,
	AcademyCurriculumPrompt,
	AcademyGradePrompt,
	AcademyLessonPrompt,
	AcademyTutorPrompt,
	AcademyWebinarHostPrompt,
} from '../constants/prompts.js';

const textBlock = (text) => ({ type: 'text', text });

function extractJson(raw) {
	if (!raw) return null;
	let text = String(raw).trim();
	// strip markdown fences
	text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

// ── Default curricula (fallback if the SI is unavailable) ───────────
// Mirrors apps/web/src/lib/academyCatalog.js STATIC_CURRICULA — keep in sync.
// Keys: beginner | forex | crypto | intermediate | professional
const DEFAULT_CURRICULA = {
	'beginner': {
		pathName: 'Beginner Foundation',
		focus: 'A complete A–Z foundation: markets, Forex & Crypto basics, risk, analysis and execution.',
		courses: [
			{
				courseKey: 'markets-foundations',
				title: 'Markets & Foundations',
				minutes: 70,
				description: 'How markets work and the assets you trade — Forex, Crypto, Gold, Indices.',
				lessons: [
					{ lessonKey: 'what-is-trading', title: 'What trading really is', minutes: 12 },
					{ lessonKey: 'market-structure', title: 'Market structure and participants', minutes: 14 },
					{ lessonKey: 'asset-classes', title: 'Asset classes: Forex, Crypto, Gold, Indices', minutes: 18 },
					{ lessonKey: 'how-prices-move', title: 'How prices move: supply, demand and liquidity', minutes: 21 },
				],
			},
			{
				courseKey: 'risk-first',
				title: 'Risk Management First',
				minutes: 70,
				description: 'Protect capital before anything else: sizing, stops and risk/reward.',
				lessons: [
					{ lessonKey: 'position-sizing', title: 'Position sizing fundamentals', minutes: 16 },
					{ lessonKey: 'stops-losses', title: 'Stop losses done right', minutes: 15 },
					{ lessonKey: 'risk-reward', title: 'Risk/reward and expectancy', minutes: 19 },
					{ lessonKey: 'max-drawdown', title: 'Drawdown control and discipline', minutes: 20 },
				],
			},
			{
				courseKey: 'technical-analysis',
				title: 'Technical Analysis',
				minutes: 76,
				description: 'Candlesticks, support and resistance, trends and confluence.',
				lessons: [
					{ lessonKey: 'candlesticks', title: 'Reading candlesticks', minutes: 18 },
					{ lessonKey: 'support-resistance', title: 'Support and resistance', minutes: 17 },
					{ lessonKey: 'trends', title: 'Trends, structure and swing points', minutes: 20 },
					{ lessonKey: 'confluence', title: 'Building a confluence checklist', minutes: 21 },
				],
			},
			{
				courseKey: 'psychology-execution',
				title: 'Psychology & Execution',
				minutes: 66,
				description: 'The mindset and process that keep you consistent.',
				lessons: [
					{ lessonKey: 'trading-plan', title: 'Building a trading plan', minutes: 16 },
					{ lessonKey: 'emotions', title: 'Emotions and tilt control', minutes: 15 },
					{ lessonKey: 'journaling', title: 'Journaling every trade', minutes: 17 },
					{ lessonKey: 'review', title: 'Weekly review cadence', minutes: 18 },
				],
			},
		],
	},
	'forex': {
		pathName: 'Forex Mastery A–Z',
		focus: 'Master currencies end-to-end: mechanics, fundamentals, technicals, sessions, strategies and funded-desk execution.',
		courses: [
			{
				courseKey: 'fx-foundations',
				title: 'Forex Foundations & Mechanics',
				minutes: 98,
				description: 'Pairs, pips, lots, leverage, sessions, brokers and order types.',
				lessons: [
					{ lessonKey: 'what-is-forex', title: 'What Forex really is: spot, liquidity & players', minutes: 15 },
					{ lessonKey: 'pairs-quotes', title: 'Pairs decoded: majors, minors, exotics & quotes', minutes: 16 },
					{ lessonKey: 'pips-lots-leverage', title: 'Pips, lots, leverage & margin — the math', minutes: 18 },
					{ lessonKey: 'sessions-killzones', title: 'Sessions: Sydney, Tokyo, London, New York & killzones', minutes: 17 },
					{ lessonKey: 'brokers-orders', title: 'Brokers, spreads & order types (MT4/MT5/cTrader)', minutes: 16 },
					{ lessonKey: 'costs-swaps', title: 'Hidden costs: spread, commission, swaps & slippage', minutes: 16 },
				],
			},
			{
				courseKey: 'fx-fundamentals',
				title: 'Forex Fundamental Analysis',
				minutes: 112,
				description: 'Central banks, rates, inflation, NFP and risk sentiment.',
				lessons: [
					{ lessonKey: 'interest-rates', title: 'Interest rates & why currencies follow them', minutes: 18 },
					{ lessonKey: 'central-banks', title: 'Central banks: Fed, ECB, BOJ, BOE, SNB & RBA', minutes: 20 },
					{ lessonKey: 'inflation-data', title: 'CPI, PPI, PCE: trading inflation prints', minutes: 17 },
					{ lessonKey: 'jobs-growth', title: 'NFP, unemployment & GDP: growth surprises', minutes: 18 },
					{ lessonKey: 'risk-sentiment', title: 'Risk-on / risk-off, DXY, yields & gold correlations', minutes: 19 },
					{ lessonKey: 'news-calendar', title: 'Economic calendar & COT report like a pro', minutes: 20 },
				],
			},
			{
				courseKey: 'fx-technicals',
				title: 'Forex Technical Analysis',
				minutes: 118,
				description: 'Price action, SMC/ICT, indicators and multi-timeframe confluence for FX.',
				lessons: [
					{ lessonKey: 'fx-candles-structure', title: 'Candlesticks, swings & market structure on FX', minutes: 17 },
					{ lessonKey: 'sr-supply-demand', title: 'Support, resistance & supply/demand zones', minutes: 18 },
					{ lessonKey: 'patterns-fib', title: 'Chart patterns, Fibonacci & measured moves', minutes: 19 },
					{ lessonKey: 'indicators-fx', title: 'MA, RSI, MACD, ATR & ADX tuned for currencies', minutes: 20 },
					{ lessonKey: 'smc-ict', title: 'SMC / ICT essentials: liquidity, BOS, FVG, OB', minutes: 22 },
					{ lessonKey: 'mtf-confluence', title: 'Multi-timeframe confluence checklist', minutes: 22 },
				],
			},
			{
				courseKey: 'fx-strategies',
				title: 'Forex Strategies & Sessions',
				minutes: 124,
				description: 'Playbooks for every session: scalps, London breakout, NY continuation, carry and news.',
				lessons: [
					{ lessonKey: 'scalping-fx', title: 'Scalping FX: M1–M5 structure & spread control', minutes: 19 },
					{ lessonKey: 'london-breakout', title: 'London breakout & liquidity sweep playbook', minutes: 21 },
					{ lessonKey: 'ny-trend', title: 'New York trend continuation & reversals', minutes: 20 },
					{ lessonKey: 'range-asian', title: 'Asian range & mean-reversion tactics', minutes: 19 },
					{ lessonKey: 'news-trading', title: 'News trading: straddles, spikes & post-release drift', minutes: 22 },
					{ lessonKey: 'carry-swing', title: 'Carry trade & swing positioning for trend riders', minutes: 23 },
				],
			},
			{
				courseKey: 'fx-risk',
				title: 'Forex Risk & Execution',
				minutes: 102,
				description: 'Lot sizing, ATR stops, correlation, hedging and journaling for FX survival.',
				lessons: [
					{ lessonKey: 'lot-sizing', title: 'Lot-size calculator: risk % → lots in 30 seconds', minutes: 17 },
					{ lessonKey: 'atr-stops', title: 'ATR stops, breakeven & partials', minutes: 18 },
					{ lessonKey: 'correlation-hedge', title: 'Correlation, exposure & hedging (no over-leverage)', minutes: 19 },
					{ lessonKey: 'journal-fx', title: 'FX journaling: R-multiples, sessions & mistakes', minutes: 22 },
					{ lessonKey: 'execution-mt', title: 'Flawless execution on MT4/MT5 & cTrader', minutes: 26 },
				],
			},
			{
				courseKey: 'fx-pro',
				title: 'Forex Pro Desk & Funding',
				minutes: 108,
				description: 'Prop-firm challenges, trading plans, algos and the funded-trader routine.',
				lessons: [
					{ lessonKey: 'trading-plan-fx', title: 'Your FX trading plan: sessions, pairs, rules', minutes: 18 },
					{ lessonKey: 'prop-firms', title: 'Prop firms: FTMO, FundedNext — passing the challenge', minutes: 22 },
					{ lessonKey: 'psychology-fx', title: 'FX psychology: overtrading, revenge & patience', minutes: 20 },
					{ lessonKey: 'backtest-ea', title: 'Backtesting & EAs: forward-test before you fund', minutes: 24 },
					{ lessonKey: 'playbook-capstone', title: 'Capstone: your complete FX playbook', minutes: 24 },
				],
			},
		],
	},
	'crypto': {
		pathName: 'Crypto Mastery A–Z',
		focus: 'Master digital assets end-to-end: blockchain, spot vs perps, on-chain, DeFi, volatility risk and custody.',
		courses: [
			{
				courseKey: 'crypto-foundations',
				title: 'Crypto Foundations & Blockchain',
				minutes: 96,
				description: 'Bitcoin, Ethereum, altcoins, stablecoins, wallets and exchanges.',
				lessons: [
					{ lessonKey: 'blockchain-btc', title: 'Blockchain & Bitcoin: money without banks', minutes: 16 },
					{ lessonKey: 'eth-altcoins', title: 'Ethereum, L1s, L2s & altcoin sectors', minutes: 17 },
					{ lessonKey: 'stablecoins', title: 'Stablecoins: USDT, USDC & why they anchor you', minutes: 14 },
					{ lessonKey: 'wallets-custody', title: 'Wallets & self-custody: hot, cold, seed phrases', minutes: 17 },
					{ lessonKey: 'cex-dex', title: 'CEX vs DEX: Binance, Coinbase, Uniswap & order books', minutes: 16 },
					{ lessonKey: 'spot-orders', title: 'Spot trading & order types on crypto exchanges', minutes: 16 },
				],
			},
			{
				courseKey: 'crypto-mechanics',
				title: 'Crypto Market Mechanics',
				minutes: 108,
				description: 'Perps, funding, open interest, liquidations and volatility.',
				lessons: [
					{ lessonKey: 'market-cap-dominance', title: 'Market cap, BTC dominance & altcoin rotation', minutes: 17 },
					{ lessonKey: 'perps-futures', title: 'Perpetuals vs futures vs options, simply', minutes: 19 },
					{ lessonKey: 'funding-oi', title: 'Funding rates & open interest: reading positioning', minutes: 19 },
					{ lessonKey: 'leverage-liq', title: 'Leverage & liquidations: never blow up again', minutes: 18 },
					{ lessonKey: 'liquidity-vol', title: 'Liquidity, spreads, slippage & volatility regimes', minutes: 17 },
					{ lessonKey: 'fees-taxes', title: 'Fees, spreads & crypto taxes essentials', minutes: 18 },
				],
			},
			{
				courseKey: 'crypto-research',
				title: 'Crypto Research: Fundamental & On-chain',
				minutes: 112,
				description: 'Tokenomics, whitepapers, Glassnode metrics and narratives.',
				lessons: [
					{ lessonKey: 'tokenomics', title: 'Tokenomics: supply, vesting, unlocks & dilution', minutes: 19 },
					{ lessonKey: 'whitepaper-diligence', title: 'Whitepapers & due diligence in 20 minutes', minutes: 17 },
					{ lessonKey: 'onchain-basics', title: 'On-chain basics: active addresses, exchange flows', minutes: 19 },
					{ lessonKey: 'onchain-advanced', title: 'NVT, MVRV, SOPR & realized cap signals', minutes: 20 },
					{ lessonKey: 'narratives', title: 'Narratives: memecoins, SI, RWA, L2s & cycles', minutes: 18 },
					{ lessonKey: 'airdrops-defi', title: 'Airdrops, staking & DeFi yield without getting rekt', minutes: 19 },
				],
			},
			{
				courseKey: 'crypto-technicals',
				title: 'Crypto Technical Analysis',
				minutes: 110,
				description: 'Volatility-aware charting: levels, volume, Wyckoff and BTC intermarket context.',
				lessons: [
					{ lessonKey: 'crypto-structure', title: 'BTC & ETH structure: swings, ranges & breakouts', minutes: 18 },
					{ lessonKey: 'indicators-crypto', title: 'MA, RSI, MACD, ATR & volume profile for crypto', minutes: 19 },
					{ lessonKey: 'wyckoff-cycles', title: 'Wyckoff, halving cycles & bull/bear anatomy', minutes: 20 },
					{ lessonKey: 'intermarket-btc', title: 'BTC vs DXY, Nasdaq & gold: intermarket edge', minutes: 18 },
					{ lessonKey: 'volatility-entries', title: 'Volatility entries: ATR bands, breakers & sweeps', minutes: 17 },
					{ lessonKey: 'mtf-crypto', title: 'Multi-timeframe crypto confluence routine', minutes: 18 },
				],
			},
			{
				courseKey: 'crypto-strategies',
				title: 'Crypto Strategies',
				minutes: 116,
				description: 'Playbooks for every regime: DCA, swing, scalps, breakouts and funding plays.',
				lessons: [
					{ lessonKey: 'hodl-dca', title: 'HODL & DCA done right: accumulation plans', minutes: 17 },
					{ lessonKey: 'swing-crypto', title: 'Swing trading crypto: 4H–Daily trend systems', minutes: 19 },
					{ lessonKey: 'scalp-crypto', title: 'Scalping & day trading BTC/ETH volatility', minutes: 19 },
					{ lessonKey: 'breakout-crypto', title: 'Breakout & listing-momentum playbook', minutes: 20 },
					{ lessonKey: 'funding-arb', title: 'Funding arbitrage & basis trades (market-neutral)', minutes: 21 },
					{ lessonKey: 'rotation-stables', title: 'Rotation: risk-on alts ↔ stables risk management', minutes: 20 },
				],
			},
			{
				courseKey: 'crypto-risk',
				title: 'Crypto Risk, Security & Mindset',
				minutes: 104,
				description: 'Survive 24/7 volatility: sizing, scams, custody and the crypto mindset.',
				lessons: [
					{ lessonKey: 'sizing-crypto', title: 'Position sizing for 10% daily movers', minutes: 17 },
					{ lessonKey: 'scams-rugs', title: 'Rug pulls, phishing & honeypots: the red-flag list', minutes: 18 },
					{ lessonKey: 'exchange-risk', title: 'Exchange risk: FTX lessons, proof-of-reserves', minutes: 16 },
					{ lessonKey: 'journal-crypto', title: 'Crypto journaling: setups, narratives & emotions', minutes: 17 },
					{ lessonKey: 'mindset-24-7', title: '24/7 mindset: sleep, FOMO & taking breaks', minutes: 18 },
					{ lessonKey: 'capstone-crypto', title: 'Capstone: your complete crypto playbook', minutes: 18 },
				],
			},
		],
	},
	'orderflow': {
		pathName: 'Order Flow Mastery',
		focus: 'Read the market from the book itself: depth, heatmaps, tape, footprint, volume profile, VWAP and live order-flow playbooks.',
		courses: [
			{
				courseKey: 'reading-the-book',
				title: 'Reading the Book',
				minutes: 92,
				description: 'Bids, asks, spread and depth — the limit order book from zero, on the live ladder.',
				lessons: [
					{ lessonKey: 'what-is-book', title: 'The limit order book: what every row means', minutes: 15 },
					{ lessonKey: 'bid-ask-spread', title: 'Bid, ask and spread: the cost of immediacy', minutes: 14 },
					{ lessonKey: 'depth-level2', title: 'Depth & Level 2: size stacked behind price', minutes: 17 },
					{ lessonKey: 'ladder-live', title: 'The live ladder: reading bids vs asks in real time', minutes: 16 },
					{ lessonKey: 'market-vs-limit', title: 'Market vs limit orders: who pays the spread', minutes: 15 },
					{ lessonKey: 'session-context', title: 'Session high/low: framing the book in the day', minutes: 15 },
				],
			},
			{
				courseKey: 'liquidity-heatmaps',
				title: 'Liquidity & Heatmaps',
				minutes: 104,
				description: 'Walls, spoofing and absorption — seeing liquidity on the heatmap.',
				lessons: [
					{ lessonKey: 'heatmap-reading', title: 'Heatmap reading: color, intensity and time', minutes: 17 },
					{ lessonKey: 'liquidity-walls', title: 'Liquidity walls: support and resistance that breathes', minutes: 18 },
					{ lessonKey: 'spoofing', title: 'Spoofing & fleeting size: size that never fills', minutes: 18 },
					{ lessonKey: 'absorption', title: 'Absorption: when prints eat the wall', minutes: 19 },
					{ lessonKey: 'icebergs', title: 'Icebergs: hidden size that refills', minutes: 16 },
					{ lessonKey: 'heatmap-settings', title: 'Tuning the screen: rows, speed and intensity', minutes: 16 },
				],
			},
			{
				courseKey: 'tape-prints',
				title: 'Tape & Executed Prints',
				minutes: 98,
				description: 'Aggressors, big prints and delta — who is hitting whom.',
				lessons: [
					{ lessonKey: 'tape-reading', title: 'Reading the tape: price, size and pace', minutes: 16 },
					{ lessonKey: 'aggressor-side', title: 'Aggressor side: buyer- vs seller-initiated prints', minutes: 17 },
					{ lessonKey: 'big-prints', title: 'Big prints: filtering size that matters', minutes: 17 },
					{ lessonKey: 'delta-cvd', title: 'Delta & CVD: cumulative buy/sell pressure', minutes: 18 },
					{ lessonKey: 'exhaustion', title: 'Exhaustion: climax prints and failed follow-through', minutes: 15 },
					{ lessonKey: 'sweeps', title: 'Liquidity sweeps: stop runs and continuation', minutes: 15 },
				],
			},
			{
				courseKey: 'footprint-profile',
				title: 'Footprint & Volume Profile',
				minutes: 106,
				description: 'Bid/ask imbalances per level, POC and value areas.',
				lessons: [
					{ lessonKey: 'footprint-basics', title: 'Footprint thinking: traded bid x ask per level', minutes: 18 },
					{ lessonKey: 'imbalances', title: 'Imbalances: stacked buying and selling pressure', minutes: 18 },
					{ lessonKey: 'volume-profile', title: 'Volume profile: where the day did business', minutes: 18 },
					{ lessonKey: 'poc-value', title: 'POC, value area high and low', minutes: 17 },
					{ lessonKey: 'low-volume-nodes', title: 'Low-volume nodes: fast travel zones', minutes: 17 },
					{ lessonKey: 'profile-day-types', title: 'Day types: trend, range and breakout profiles', minutes: 18 },
				],
			},
			{
				courseKey: 'vwap-session',
				title: 'VWAP & Session Tools',
				minutes: 96,
				description: 'The institutional benchmark and the session stats that frame it.',
				lessons: [
					{ lessonKey: 'vwap-explained', title: 'VWAP explained: the volume-weighted fair price', minutes: 16 },
					{ lessonKey: 'vwap-bands', title: 'VWAP bands: stretched vs extended markets', minutes: 17 },
					{ lessonKey: 'vwap-entries', title: 'VWAP entries: holds, reclaims and failures', minutes: 17 },
					{ lessonKey: 'anchored-vwap', title: 'Anchored VWAP: from swing highs, lows and news', minutes: 16 },
					{ lessonKey: 'session-stats', title: 'Session stats: volume, buy share and biggest print', minutes: 15 },
					{ lessonKey: 'correlation-tracker', title: 'Correlation tracker: BTC leadership and alt rotation', minutes: 15 },
				],
			},
			{
				courseKey: 'flow-playbooks',
				title: 'Order-Flow Playbooks',
				minutes: 110,
				description: 'Complete reversal and continuation systems plus your capstone.',
				lessons: [
					{ lessonKey: 'absorption-reversal', title: 'Absorption reversal: wall holds, delta flips', minutes: 19 },
					{ lessonKey: 'sweep-continuation', title: 'Sweep continuation: riding the liquidity run', minutes: 18 },
					{ lessonKey: 'failed-auction', title: 'Failed auction: low-volume rejection trades', minutes: 18 },
					{ lessonKey: 'multi-pair', title: 'Multi-pair rotation: leading with BTC, executing alts', minutes: 19 },
					{ lessonKey: 'journal-flow', title: 'Journaling flow trades: screenshots, delta, review', minutes: 18 },
					{ lessonKey: 'capstone-flow', title: 'Capstone: your complete order-flow playbook', minutes: 18 },
				],
			},
		],
	},
	'intermediate': {
		pathName: 'Intermediate Edge',
		focus: 'Sharpen your Forex & Crypto process: confluence systems, psychology and sizing precision.',
		courses: [
			{
				courseKey: 'advanced-ta',
				title: 'Advanced Analysis (FX + Crypto)',
				minutes: 88,
				description: 'Confluence systems that work on EUR/USD and BTC alike.',
				lessons: [
					{ lessonKey: 'confluence-system', title: 'Building a confluence scoring system', minutes: 21 },
					{ lessonKey: 'liquidity-grabs', title: 'Liquidity grabs on FX & crypto wicks', minutes: 22 },
					{ lessonKey: 'orderflow-volume', title: 'Volume & order flow: futures, OI & tick', minutes: 22 },
					{ lessonKey: 'failing-setups', title: 'When setups fail: invalidation & flip rules', minutes: 23 },
				],
			},
			{
				courseKey: 'strategy-lab',
				title: 'Strategy Lab',
				minutes: 92,
				description: 'Pick and prove your edge: scalps, intraday, swing.',
				lessons: [
					{ lessonKey: 'pick-strategy', title: 'Matching strategy to personality & session', minutes: 22 },
					{ lessonKey: 'backtesting', title: 'Backtesting 100 trades the honest way', minutes: 24 },
					{ lessonKey: 'forward-test', title: 'Forward-testing on demo without lying to yourself', minutes: 22 },
					{ lessonKey: 'scale-edge', title: 'Scaling what works, killing what does not', minutes: 24 },
				],
			},
			{
				courseKey: 'psychology-edge',
				title: 'Psychology & Sizing',
				minutes: 84,
				description: 'Tilt control and math-grade sizing for volatile assets.',
				lessons: [
					{ lessonKey: 'tilt-protocol', title: 'Tilt protocol: stops for yourself', minutes: 20 },
					{ lessonKey: 'risk-models', title: 'Fixed-fractional vs Kelly vs volatility sizing', minutes: 22 },
					{ lessonKey: 'correlation-portfolio', title: 'Portfolio heat across FX + crypto', minutes: 21 },
					{ lessonKey: 'performance-review', title: 'Monthly performance review template', minutes: 21 },
				],
			},
		],
	},
	'professional': {
		pathName: 'Professional Desk',
		focus: 'Institutional process: systematic FX + crypto strategies, portfolio risk and fund-grade review.',
		courses: [
			{
				courseKey: 'systematic',
				title: 'Systematic Strategies',
				minutes: 96,
				description: 'Rules-based FX and crypto systems you can audit.',
				lessons: [
					{ lessonKey: 'system-design', title: 'Designing a rules-based system', minutes: 23 },
					{ lessonKey: 'trend-systems', title: 'Trend systems for FX majors & BTC', minutes: 24 },
					{ lessonKey: 'mean-reversion', title: 'Mean-reversion in ranges: FX Asia & crypto chop', minutes: 24 },
					{ lessonKey: 'event-systems', title: 'Event systems: CPI/NFP & FOMC vs CPI-crypto beta', minutes: 25 },
				],
			},
			{
				courseKey: 'portfolio-desk',
				title: 'Portfolio & Fund Execution',
				minutes: 90,
				description: 'Heat, hedging and execution at size.',
				lessons: [
					{ lessonKey: 'portfolio-heat', title: 'Portfolio heat & exposure caps', minutes: 22 },
					{ lessonKey: 'hedging-fx-crypto', title: 'Hedging: FX offsets & delta-neutral crypto', minutes: 23 },
					{ lessonKey: 'execution-size', title: 'Executing size: TWAP, ladders & slippage', minutes: 22 },
					{ lessonKey: 'fund-reporting', title: 'Fund-grade reporting & investor review', minutes: 23 },
				],
			},
			{
				courseKey: 'mastery-capstone',
				title: 'Mastery Capstone',
				minutes: 80,
				description: 'Your audited playbook and next 90 days.',
				lessons: [
					{ lessonKey: 'playbook-audit', title: 'Auditing your full playbook', minutes: 20 },
					{ lessonKey: 'algo-intro', title: 'Algos & automation intro (EAs + bots)', minutes: 22 },
					{ lessonKey: 'prop-scale', title: 'Scaling: prop capital & crypto size-up plan', minutes: 19 },
					{ lessonKey: 'next-90', title: 'Your next 90 days: goals, metrics, review', minutes: 19 },
				],
			},
		],
	},
};

// Back-compat alias (old code imported the singular).
const DEFAULT_CURRICULUM = DEFAULT_CURRICULA['beginner'];

// ── Data access (service role, camelCase columns) ───────────────────

const upsert = (table, row, conflict) =>
	supabaseRest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
		method: 'POST',
		body: row,
		prefer: 'resolution=merge-duplicates,return=representation',
	}).then((rows) => rows?.[0] || null);

const selectWhere = (table, where, extra = '') =>
	supabaseRest(`/rest/v1/${table}?${where}${extra ? `&${extra}` : ''}`, { prefer: 'return=representation' });

export const academyDb = {
	getUser: (id) =>
		supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { query: { select: '*', limit: 1 } })
			.then((rows) => rows?.[0] || null),
	grantAccess: (id, at) =>
		supabaseRest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
			method: 'PATCH',
			body: { academyAccess: true, academyPurchasedAt: at || new Date().toISOString() },
			prefer: 'return=representation',
		}).then((rows) => rows?.[0] || null),

	getCurriculum: (owner, pathKey) =>
		selectWhere('academy_curricula', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`).then((r) => r?.[0] || null),
	saveCurriculum: (owner, pathKey, curriculum) =>
		upsert('academy_curricula', { owner, pathKey, curriculum, updatedAt: new Date().toISOString() }, 'owner,pathKey'),

	getLesson: (owner, pathKey, courseKey, lessonKey) =>
		selectWhere(
			'academy_lessons',
			`owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}&courseKey=eq.${encodeURIComponent(courseKey)}&lessonKey=eq.${encodeURIComponent(lessonKey)}`,
		).then((r) => r?.[0] || null),
	saveLesson: (owner, pathKey, courseKey, lessonKey, content) =>
		upsert('academy_lessons', { owner, pathKey, courseKey, lessonKey, content, updatedAt: new Date().toISOString() }, 'owner,pathKey,courseKey,lessonKey'),

	getEnrollment: (owner, pathKey) =>
		selectWhere('academy_enrollments', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`).then((r) => r?.[0] || null),
	createEnrollment: (owner, pathKey) =>
		upsert('academy_enrollments', { owner, pathKey, enrolledAt: new Date().toISOString() }, 'owner,pathKey'),
	updateEnrollment: (owner, pathKey, patch) =>
		selectWhere('academy_enrollments', `owner=eq.${owner}&pathKey=eq.${encodeURIComponent(pathKey)}`, 'select=*').then(() =>
			upsert('academy_enrollments', { owner, pathKey, ...patch }, 'owner,pathKey'),
		),
	listEnrollments: (owner) => selectWhere('academy_enrollments', `owner=eq.${owner}`),
	listCurricula: (owner) => selectWhere('academy_curricula', `owner=eq.${owner}`),
	listProgress: (owner) => selectWhere('academy_progress', `owner=eq.${owner}`),

	upsertProgress: (owner, row) =>
		upsert('academy_progress', { owner, ...row }, 'owner,pathKey,courseKey,lessonKey'),
	listRsvps: (owner) => selectWhere('academy_webinar_rsvps', `owner=eq.${owner}`),
	upsertRsvp: (owner, webinarId) =>
		upsert('academy_webinar_rsvps', { owner, webinarId, rsvpAt: new Date().toISOString() }, 'owner,webinarId'),
	markAttended: (owner, webinarId) =>
		upsert('academy_webinar_rsvps', { owner, webinarId, attendedAt: new Date().toISOString() }, 'owner,webinarId'),
	deleteRsvp: (owner, webinarId) =>
		supabaseRest(`/rest/v1/academy_webinar_rsvps?owner=eq.${owner}&webinarId=eq.${encodeURIComponent(webinarId)}`, { method: 'DELETE' }),
	createPurchase: (row) =>
		supabaseRest('/rest/v1/academy_purchases', { method: 'POST', body: row, prefer: 'return=representation' }),
};

// ── SI generation ────────────────────────────────────────────────────

async function aiJson({ systemPrompt, userMessage, fallback, label }) {
	try {
		const raw = await generateText({ systemPrompt, userMessage });
		const parsed = extractJson(raw);
		if (!parsed) {
			logger.warn(`academy ${label}: SI returned non-JSON, using fallback`);
			return fallback;
		}
		return parsed;
	} catch (err) {
		logger.error(`academy ${label} failed`, String(err?.message || err));
		return fallback;
	}
}

export async function generateCurriculum({ userId, level, about, pathKey }) {
	const fallback = DEFAULT_CURRICULA[pathKey] || DEFAULT_CURRICULA['beginner'] || DEFAULT_CURRICULUM;
	const curriculum = await aiJson({
		systemPrompt: AcademyCurriculumPrompt(level || 'Beginner', about || '', pathKey || 'beginner'),
		userMessage: [textBlock(`Please design my personalized learning path.`)],
		fallback,
		label: 'curriculum',
	});
	return {
		pathName: curriculum.pathName || fallback.pathName,
		focus: curriculum.focus || fallback.focus,
		courses: Array.isArray(curriculum.courses) && curriculum.courses.length
			? curriculum.courses.map((c) => ({
					courseKey: String(c.courseKey || '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'course',
					title: c.title || 'Untitled course',
					minutes: Number(c.minutes) || 0,
					description: c.description || '',
					lessons: (Array.isArray(c.lessons) ? c.lessons : []).map((l) => ({
						lessonKey: String(l.lessonKey || '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'lesson',
						title: l.title || 'Untitled lesson',
						minutes: Number(l.minutes) || 0,
					})),
			  }))
			: fallback.courses,
	};
}

export async function generateLessonContent({ curriculum, course, lesson }) {
	const lessonCtx = `Path: ${curriculum.pathName}\nCourse: ${course.title}\nLesson: ${lesson.title} (${lesson.minutes} min)`;
	const content = await aiJson({
		systemPrompt: AcademyLessonPrompt(
			`Path: ${curriculum.pathName}. Focus: ${curriculum.focus || ''}.`,
			lessonCtx,
		),
		userMessage: [textBlock(`Write this lesson.`)],
		fallback: {
			title: lesson.title,
			summary: `SI generated this lesson's content for you.`,
			keyPoints: ['Trade with a plan', 'Manage risk first', 'Review every trade'],
			content: `## ${lesson.title}\n\nThis lesson is part of ${course.title} in the ${curriculum.pathName} path.\n\nYour SI instructor is preparing the full lesson. Try again in a moment to load the complete content.`,
			quiz: [
				{
					question: `What is the most important rule of trading?`,
					options: ['Protect your capital first', 'Win every trade', 'Trade as often as possible', 'Ignore risk'],
					answerIndex: 0,
					explanation: 'Capital preservation is the foundation of every profitable trader.',
				},
			],
		},
		label: 'lesson',
	});
	const result = {
		title: content.title || lesson.title,
		summary: content.summary || '',
		keyPoints: Array.isArray(content.keyPoints) ? content.keyPoints.slice(0, 6) : [],
		content: String(content.content || ''),
		quiz: Array.isArray(content.quiz)
			? content.quiz.slice(0, 6).map((q) => ({
					question: q.question || '',
					options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
					answerIndex: Number(q.answerIndex) >= 0 && Number(q.answerIndex) < 4 ? Number(q.answerIndex) : 0,
					explanation: q.explanation || '',
			  }))
			: [],
	};
	// Verification pass: the generator occasionally mislabels the correct
	// option index. Have the SI audit the quiz and replace the answer keys
	// so grading stays consistent. Falls back to the generated keys.
	if (result.quiz.length) {
		try {
			const quizJson = result.quiz.map((q) => ({ question: q.question, options: q.options })).map((q) => `Q: ${q.question}\nOptions: ${q.options.map((o, i) => `${i}. ${o}`).join(' | ')}`).join('\n\n');
			const verified = await aiJson({
				systemPrompt: `You are a quiz auditor. For each question below, determine the single objectively correct option index (0-3) based on general trading knowledge. Return ONLY strict JSON: { "answers": [0, 2, ...] } with one index per question, in order. No commentary.`,
				userMessage: [textBlock(quizJson)],
				fallback: null,
				label: 'quiz-verify',
			});
			if (Array.isArray(verified?.answers) && verified.answers.length === result.quiz.length) {
				result.quiz.forEach((q, i) => {
					const idx = Number(verified.answers[i]);
					if (Number.isInteger(idx) && idx >= 0 && idx < 4) q.answerIndex = idx;
				});
			}
		} catch (err) {
			logger.warn('academy quiz verification skipped', String(err?.message || err));
		}
	}
	return result;
}

export async function gradeQuiz({ lesson, answers }) {
	const safeAnswers = Array.isArray(answers) ? answers : [];
	const directScore = lesson.quiz.reduce((acc, q, i) => {
		const chosen = Number(safeAnswers[i]);
		return acc + (chosen === q.answerIndex ? 1 : 0);
	}, 0);
	const result = await aiJson({
		systemPrompt: AcademyGradePrompt(
			`Lesson: ${lesson.title}\nQuiz:\n${lesson.quiz.map((q, i) => `Q${i + 1}: ${q.question}\nCorrect: ${q.answerIndex}\nExplanation: ${q.explanation}`).join('\n')}`,
			`Student answers: ${safeAnswers.map((a, i) => `Q${i + 1}: option ${a}`).join(', ')}`,
		),
		userMessage: [textBlock(`Grade this quiz.`)],
		fallback: { score: directScore, feedback: '' },
		label: 'grade',
	});
	const score = Number(result?.score);
	return {
		score: Number.isInteger(score) && score >= 0 ? Math.min(score, lesson.quiz.length) : directScore,
		feedback: String(result?.feedback || ''),
	};
}

export async function generateCertificate({ pathName, stats }) {
	try {
		const text = await generateText({
			systemPrompt: AcademyCertificatePrompt(pathName, stats),
			userMessage: [textBlock('Write my certificate citation.')],
		});
		return cleanCertificateCitation(String(text || ''));
	} catch (err) {
		logger.error('academy certificate failed', String(err?.message || err));
		return '';
	}
}

// The assistant sometimes wraps the citation in meta-commentary
// ("The user wants a certificate citation..."). Drop the chatter, keep
// the actual citation paragraph.
function cleanCertificateCitation(text) {
	const paras = String(text)
		.split(/\n+/)
		.map((p) => p.trim())
		.filter(Boolean);
	const meta = /^(the user|as the|i should|i(?:'ll| need to| 'll)|this is|you are|per the|the system|ok(ay)?[,!.]|sure[,!.]|let me)/i;
	const citation = paras.filter((p) => !meta.test(p)).join('\n\n') || text;
	return citation
		.replace(/^(here(?:'s| is)|below is|the (?:citation|text|paragraph|one)(?: is)?)[:\s]*/i, '')
		.trim()
		.slice(0, 900);
}

export async function tutorStream({ userId, lesson, progressNote, history, question }) {
	const recent = (Array.isArray(history) ? history : []).slice(-8)
		.map((m) => `${m?.role}: ${m?.content}`)
		.join('\n');
	const prompt = AcademyTutorPrompt(lesson.title, lesson.content, progressNote);
	const userMessage = [
		...(recent ? [textBlock(`Conversation so far:\n${recent}`)] : []),
		textBlock(`Student question: ${question}`),
	];
	return stream({ userId, systemPrompt: prompt, userMessage });
}

export async function webinarStream({ userId, webinar, scheduleNote, history, question }) {
	const recent = (Array.isArray(history) ? history : []).slice(-8)
		.map((m) => `${m?.role}: ${m?.content}`)
		.join('\n');
	const userMessage = [
		...(recent ? [textBlock(`Room chat so far:\n${recent}`)] : []),
		textBlock(question ? `Attendee: ${question}` : 'Open the session for today.'),
	];
	return stream({
		userId,
		systemPrompt: AcademyWebinarHostPrompt(webinar, scheduleNote),
		userMessage,
	});
}

// The model often opens a live answer with a one-paragraph narration of its
// plan ("The student is asking... I should answer directly..."). Hold the
// first paragraph of content; if it matches the narration pattern, drop it
// and emit only the real answer. Streaming stays intact — only the first
// paragraph is buffered.
const NARRATION_RE = /(student is asking|attendee is asking|the user is asking|another student|i should|i(?:'ll| am going to) (?:answer|explain|keep|write)|this is (?:a|an) (?:teaching|live))/i;

export function stripStreamNarration(passThrough) {
	let buffer = '';
	let held = '';
	let decided = false;
	const out = new Transform({
		transform(chunk, _enc, cb) {
			buffer += chunk.toString();
			let idx;
			while ((idx = buffer.indexOf('\n\n')) !== -1) {
				const event = buffer.slice(0, idx);
				buffer = buffer.slice(idx + 2);
				if (!event.trim()) continue;
				const line = event.split('\n').find((l) => l.startsWith('data: '));
				if (!line) { out.push(`${event}\n\n`); continue; }
				let parsed;
				try { parsed = JSON.parse(line.slice(6)); } catch { out.push(`${event}\n\n`); continue; }
				if (parsed.type === 'content' && parsed.data?.content) {
					const delta = parsed.data.content;
					if (!decided) {
						held += delta;
						const brk = held.indexOf('\n\n');
						if (brk !== -1) {
							const first = held.slice(0, brk);
							const rest = held.slice(brk + 2);
							decided = true;
							held = '';
							if (!NARRATION_RE.test(first)) {
								if (first.trim()) out.push(`data: ${JSON.stringify({ type: 'content', data: { content: first } })}\n\n`);
							}
							if (rest.trim()) out.push(`data: ${JSON.stringify({ type: 'content', data: { content: rest } })}\n\n`);
						}
						continue;
					}
					out.push(`data: ${JSON.stringify({ type: 'content', data: { content: delta } })}\n\n`);
					continue;
				}
				// Non-content events (reasoning, errors, usage) pass through as-is.
				out.push(`${event}\n\n`);
			}
			cb();
		},
		flush(cb) {
			if (!decided && held.trim()) {
				// Stream ended before a paragraph boundary — drop a narration lead if present.
				const body = held.includes('\n\n') ? held.split('\n\n').slice(1).join('\n\n') : held;
				if (!NARRATION_RE.test(held) && body === held) out.push(`data: ${JSON.stringify({ type: 'content', data: { content: held } })}\n\n`);
				else if (body.trim()) out.push(`data: ${JSON.stringify({ type: 'content', data: { content: body } })}\n\n`);
			}
			cb();
		},
	});
	return out;
}
