// TradingBible Academy — full Forex + Crypto catalog.
// Single source of truth for the portal UI (paths, courses, lessons, topic explorer).
// Backend fallbacks mirror this file in apps/api/src/api/academy.js — keep them in sync.

export const TRACKS = [
	{ key: 'all', name: 'All topics' },
	{ key: 'general', name: 'Foundations' },
	{ key: 'forex', name: 'Forex' },
	{ key: 'crypto', name: 'Crypto' },
	{ key: 'orderflow', name: 'Order Flow' },
	{ key: 'pro', name: 'Pro Desk' },
];

export const PATHS = [
	{
		key: 'beginner',
		name: 'Beginner Foundation',
		level: 'Beginner',
		track: 'general',
		color: '#34d399',
		icon: 'sprout',
		desc: 'From zero: how markets work, the assets you trade (Forex, Crypto, Gold, Indices), and the discipline-first habits that keep you alive.',
		skills: ['Market basics', 'Pips, lots & wallets', 'Risk first', 'First trading plan'],
	},
	{
		key: 'forex',
		name: 'Forex Mastery A–Z',
		level: 'Beginner → Advanced',
		track: 'forex',
		color: '#38bdf8',
		icon: 'globe',
		desc: 'The complete currency desk: pairs, sessions, leverage, central banks, news trading, SMC/ICT, London & New York playbooks, prop-firm funding.',
		skills: ['Majors, minors & exotics', 'Sessions & news', 'Technical + SMC', 'Funded-trader playbook'],
	},
	{
		key: 'crypto',
		name: 'Crypto Mastery A–Z',
		level: 'Beginner → Advanced',
		track: 'crypto',
		color: '#f472b6',
		icon: 'bitcoin',
		desc: 'The complete crypto desk: blockchain, wallets, spot vs perps, funding & open interest, on-chain, DeFi, volatility risk and 24/7 psychology.',
		skills: ['BTC, ETH & altcoins', 'Perps & funding', 'On-chain & tokenomics', 'Custody & security'],
	},
	{
		key: 'orderflow',
		name: 'Order Flow Mastery',
		level: 'Intermediate → Advanced',
		track: 'orderflow',
		color: '#a78bfa',
		icon: 'layers',
		desc: 'Read the market from the book itself: depth, heatmaps, tape, footprint, volume profile, VWAP and order-flow playbooks on the TradingBible Order Flow screen.',
		skills: ['Depth & ladder', 'Heatmaps & tape', 'Footprint & profile', 'VWAP & playbooks'],
	},
	{
		key: 'intermediate',
		name: 'Intermediate Edge',
		level: 'Intermediate',
		track: 'pro',
		color: '#d4af37',
		icon: 'zap',
		desc: 'Sharpen your process across Forex & Crypto: advanced analysis, psychology, precise position sizing and strategy selection.',
		skills: ['Confluence systems', 'Psychology', 'Strategy lab', 'Sizing models'],
	},
	{
		key: 'professional',
		name: 'Professional Desk',
		level: 'Professional',
		track: 'pro',
		color: '#e0a0f0',
		icon: 'briefcase',
		desc: 'Trade like an institution: systematic strategies, portfolio management, prop-firm & fund-grade execution in FX and digital assets.',
		skills: ['Systematic strategies', 'Portfolio heat', 'Algo & backtesting', 'Fund-grade review'],
	},
];

// ── Static curricula: instant topic map shown before / without AI ─────
// Each course: { courseKey, title, minutes, description, lessons: [{lessonKey,title,minutes,tags}] }
export const STATIC_CURRICULA = {
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
					{ lessonKey: 'what-is-trading', title: 'What trading really is', minutes: 12, tags: ['general'] },
					{ lessonKey: 'market-structure', title: 'Market structure and participants', minutes: 14, tags: ['general', 'forex'] },
					{ lessonKey: 'asset-classes', title: 'Asset classes: Forex, Crypto, Gold, Indices', minutes: 18, tags: ['general', 'forex', 'crypto'] },
					{ lessonKey: 'how-prices-move', title: 'How prices move: supply, demand and liquidity', minutes: 21, tags: ['general'] },
				],
			},
			{
				courseKey: 'risk-first',
				title: 'Risk Management First',
				minutes: 70,
				description: 'Protect capital before anything else: sizing, stops and risk/reward.',
				lessons: [
					{ lessonKey: 'position-sizing', title: 'Position sizing fundamentals', minutes: 16, tags: ['general'] },
					{ lessonKey: 'stops-losses', title: 'Stop losses done right', minutes: 15, tags: ['general'] },
					{ lessonKey: 'risk-reward', title: 'Risk/reward and expectancy', minutes: 19, tags: ['general'] },
					{ lessonKey: 'max-drawdown', title: 'Drawdown control and discipline', minutes: 20, tags: ['general'] },
				],
			},
			{
				courseKey: 'technical-analysis',
				title: 'Technical Analysis',
				minutes: 76,
				description: 'Candlesticks, support and resistance, trends and confluence.',
				lessons: [
					{ lessonKey: 'candlesticks', title: 'Reading candlesticks', minutes: 18, tags: ['general'] },
					{ lessonKey: 'support-resistance', title: 'Support and resistance', minutes: 17, tags: ['general'] },
					{ lessonKey: 'trends', title: 'Trends, structure and swing points', minutes: 20, tags: ['general'] },
					{ lessonKey: 'confluence', title: 'Building a confluence checklist', minutes: 21, tags: ['general'] },
				],
			},
			{
				courseKey: 'psychology-execution',
				title: 'Psychology & Execution',
				minutes: 66,
				description: 'The mindset and process that keep you consistent.',
				lessons: [
					{ lessonKey: 'trading-plan', title: 'Building a trading plan', minutes: 16, tags: ['general'] },
					{ lessonKey: 'emotions', title: 'Emotions and tilt control', minutes: 15, tags: ['general'] },
					{ lessonKey: 'journaling', title: 'Journaling every trade', minutes: 17, tags: ['general'] },
					{ lessonKey: 'review', title: 'Weekly review cadence', minutes: 18, tags: ['general'] },
				],
			},
		],
	},

	// ── FOREX MASTERY ────────────────────────────────────────────────
	'forex': {
		pathName: 'Forex Mastery A–Z',
		focus: 'Master currencies end-to-end: mechanics, fundamentals, technicals, sessions, strategies and funded-desk execution.',
		courses: [
			{
				courseKey: 'fx-foundations',
				title: 'Forex Foundations & Mechanics',
				minutes: 98,
				description: 'Pairs, pips, lots, leverage, sessions, brokers and order types — the FX operating system.',
				lessons: [
					{ lessonKey: 'what-is-forex', title: 'What Forex really is: spot, liquidity & players', minutes: 15, tags: ['forex'] },
					{ lessonKey: 'pairs-quotes', title: 'Pairs decoded: majors, minors, exotics & quotes', minutes: 16, tags: ['forex'] },
					{ lessonKey: 'pips-lots-leverage', title: 'Pips, lots, leverage & margin — the math', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'sessions-killzones', title: 'Sessions: Sydney, Tokyo, London, New York & killzones', minutes: 17, tags: ['forex'] },
					{ lessonKey: 'brokers-orders', title: 'Brokers, spreads & order types (MT4/MT5/cTrader)', minutes: 16, tags: ['forex'] },
					{ lessonKey: 'costs-swaps', title: 'Hidden costs: spread, commission, swaps & slippage', minutes: 16, tags: ['forex'] },
				],
			},
			{
				courseKey: 'fx-fundamentals',
				title: 'Forex Fundamental Analysis',
				minutes: 112,
				description: 'Central banks, rates, inflation, NFP and risk sentiment — what moves currencies.',
				lessons: [
					{ lessonKey: 'interest-rates', title: 'Interest rates & why currencies follow them', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'central-banks', title: 'Central banks: Fed, ECB, BOJ, BOE, SNB & RBA', minutes: 20, tags: ['forex'] },
					{ lessonKey: 'inflation-data', title: 'CPI, PPI, PCE: trading inflation prints', minutes: 17, tags: ['forex'] },
					{ lessonKey: 'jobs-growth', title: 'NFP, unemployment & GDP: growth surprises', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'risk-sentiment', title: 'Risk-on / risk-off, DXY, yields & gold correlations', minutes: 19, tags: ['forex'] },
					{ lessonKey: 'news-calendar', title: 'Economic calendar & COT report like a pro', minutes: 20, tags: ['forex'] },
				],
			},
			{
				courseKey: 'fx-technicals',
				title: 'Forex Technical Analysis',
				minutes: 118,
				description: 'Price action, SMC/ICT, indicators and multi-timeframe confluence for FX.',
				lessons: [
					{ lessonKey: 'fx-candles-structure', title: 'Candlesticks, swings & market structure on FX', minutes: 17, tags: ['forex'] },
					{ lessonKey: 'sr-supply-demand', title: 'Support, resistance & supply/demand zones', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'patterns-fib', title: 'Chart patterns, Fibonacci & measured moves', minutes: 19, tags: ['forex'] },
					{ lessonKey: 'indicators-fx', title: 'MA, RSI, MACD, ATR & ADX tuned for currencies', minutes: 20, tags: ['forex'] },
					{ lessonKey: 'smc-ict', title: 'SMC / ICT essentials: liquidity, BOS, FVG, OB', minutes: 22, tags: ['forex'] },
					{ lessonKey: 'mtf-confluence', title: 'Multi-timeframe confluence checklist', minutes: 22, tags: ['forex'] },
				],
			},
			{
				courseKey: 'fx-strategies',
				title: 'Forex Strategies & Sessions',
				minutes: 124,
				description: 'Playbooks for every session: scalps, London breakout, NY continuation, carry and news.',
				lessons: [
					{ lessonKey: 'scalping-fx', title: 'Scalping FX: M1–M5 structure & spread control', minutes: 19, tags: ['forex'] },
					{ lessonKey: 'london-breakout', title: 'London breakout & liquidity sweep playbook', minutes: 21, tags: ['forex'] },
					{ lessonKey: 'ny-trend', title: 'New York trend continuation & reversals', minutes: 20, tags: ['forex'] },
					{ lessonKey: 'range-asian', title: 'Asian range & mean-reversion tactics', minutes: 19, tags: ['forex'] },
					{ lessonKey: 'news-trading', title: 'News trading: straddles, spikes & post-release drift', minutes: 22, tags: ['forex'] },
					{ lessonKey: 'carry-swing', title: 'Carry trade & swing positioning for trend riders', minutes: 23, tags: ['forex'] },
				],
			},
			{
				courseKey: 'fx-risk',
				title: 'Forex Risk & Execution',
				minutes: 102,
				description: 'Lot sizing, ATR stops, correlation, hedging and journaling for FX survival.',
				lessons: [
					{ lessonKey: 'lot-sizing', title: 'Lot-size calculator: risk % → lots in 30 seconds', minutes: 17, tags: ['forex'] },
					{ lessonKey: 'atr-stops', title: 'ATR stops, breakeven & partials', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'correlation-hedge', title: 'Correlation, exposure & hedging (no over-leverage)', minutes: 19, tags: ['forex'] },
					{ lessonKey: 'journal-fx', title: 'FX journaling: R-multiples, sessions & mistakes', minutes: 22, tags: ['forex'] },
					{ lessonKey: 'execution-mt', title: 'Flawless execution on MT4/MT5 & cTrader', minutes: 26, tags: ['forex'] },
				],
			},
			{
				courseKey: 'fx-pro',
				title: 'Forex Pro Desk & Funding',
				minutes: 108,
				description: 'Prop-firm challenges, trading plans, algos and the funded-trader routine.',
				lessons: [
					{ lessonKey: 'trading-plan-fx', title: 'Your FX trading plan: sessions, pairs, rules', minutes: 18, tags: ['forex'] },
					{ lessonKey: 'prop-firms', title: 'Prop firms: FTMO, FundedNext — passing the challenge', minutes: 22, tags: ['forex'] },
					{ lessonKey: 'psychology-fx', title: 'FX psychology: overtrading, revenge & patience', minutes: 20, tags: ['forex'] },
					{ lessonKey: 'backtest-ea', title: 'Backtesting & EAs: forward-test before you fund', minutes: 24, tags: ['forex'] },
					{ lessonKey: 'playbook-capstone', title: 'Capstone: your complete FX playbook', minutes: 24, tags: ['forex'] },
				],
			},
		],
	},

	// ── CRYPTO MASTERY ───────────────────────────────────────────────
	'crypto': {
		pathName: 'Crypto Mastery A–Z',
		focus: 'Master digital assets end-to-end: blockchain, spot vs perps, on-chain, DeFi, volatility risk and custody.',
		courses: [
			{
				courseKey: 'crypto-foundations',
				title: 'Crypto Foundations & Blockchain',
				minutes: 96,
				description: 'Bitcoin, Ethereum, altcoins, stablecoins, wallets and exchanges — how crypto works.',
				lessons: [
					{ lessonKey: 'blockchain-btc', title: 'Blockchain & Bitcoin: money without banks', minutes: 16, tags: ['crypto'] },
					{ lessonKey: 'eth-altcoins', title: 'Ethereum, L1s, L2s & altcoin sectors', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'stablecoins', title: 'Stablecoins: USDT, USDC & why they anchor you', minutes: 14, tags: ['crypto'] },
					{ lessonKey: 'wallets-custody', title: 'Wallets & self-custody: hot, cold, seed phrases', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'cex-dex', title: 'CEX vs DEX: Binance, Coinbase, Uniswap & order books', minutes: 16, tags: ['crypto'] },
					{ lessonKey: 'spot-orders', title: 'Spot trading & order types on crypto exchanges', minutes: 16, tags: ['crypto'] },
				],
			},
			{
				courseKey: 'crypto-mechanics',
				title: 'Crypto Market Mechanics',
				minutes: 108,
				description: 'Perps, funding, open interest, liquidations and volatility — the crypto microstructure.',
				lessons: [
					{ lessonKey: 'market-cap-dominance', title: 'Market cap, BTC dominance & altcoin rotation', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'perps-futures', title: 'Perpetuals vs futures vs options, simply', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'funding-oi', title: 'Funding rates & open interest: reading positioning', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'leverage-liq', title: 'Leverage & liquidations: never blow up again', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'liquidity-vol', title: 'Liquidity, spreads, slippage & volatility regimes', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'fees-taxes', title: 'Fees, spreads & crypto taxes essentials', minutes: 18, tags: ['crypto'] },
				],
			},
			{
				courseKey: 'crypto-research',
				title: 'Crypto Research: Fundamental & On-chain',
				minutes: 112,
				description: 'Tokenomics, whitepapers, Glassnode metrics and narratives — research like a fund.',
				lessons: [
					{ lessonKey: 'tokenomics', title: 'Tokenomics: supply, vesting, unlocks & dilution', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'whitepaper-diligence', title: 'Whitepapers & due diligence in 20 minutes', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'onchain-basics', title: 'On-chain basics: active addresses, exchange flows', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'onchain-advanced', title: 'NVT, MVRV, SOPR & realized cap signals', minutes: 20, tags: ['crypto'] },
					{ lessonKey: 'narratives', title: 'Narratives: memecoins, AI, RWA, L2s & cycles', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'airdrops-defi', title: 'Airdrops, staking & DeFi yield without getting rekt', minutes: 19, tags: ['crypto'] },
				],
			},
			{
				courseKey: 'crypto-technicals',
				title: 'Crypto Technical Analysis',
				minutes: 110,
				description: 'Volatility-aware charting: levels, volume, Wyckoff and BTC intermarket context.',
				lessons: [
					{ lessonKey: 'crypto-structure', title: 'BTC & ETH structure: swings, ranges & breakouts', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'indicators-crypto', title: 'MA, RSI, MACD, ATR & volume profile for crypto', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'wyckoff-cycles', title: 'Wyckoff, halving cycles & bull/bear anatomy', minutes: 20, tags: ['crypto'] },
					{ lessonKey: 'intermarket-btc', title: 'BTC vs DXY, Nasdaq & gold: intermarket edge', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'volatility-entries', title: 'Volatility entries: ATR bands, breakers & sweeps', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'mtf-crypto', title: 'Multi-timeframe crypto confluence routine', minutes: 18, tags: ['crypto'] },
				],
			},
			{
				courseKey: 'crypto-strategies',
				title: 'Crypto Strategies',
				minutes: 116,
				description: 'Playbooks for every regime: DCA, swing, scalps, breakouts and funding plays.',
				lessons: [
					{ lessonKey: 'hodl-dca', title: 'HODL & DCA done right: accumulation plans', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'swing-crypto', title: 'Swing trading crypto: 4H–Daily trend systems', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'scalp-crypto', title: 'Scalping & day trading BTC/ETH volatility', minutes: 19, tags: ['crypto'] },
					{ lessonKey: 'breakout-crypto', title: 'Breakout & listing-momentum playbook', minutes: 20, tags: ['crypto'] },
					{ lessonKey: 'funding-arb', title: 'Funding arbitrage & basis trades (market-neutral)', minutes: 21, tags: ['crypto'] },
					{ lessonKey: 'rotation-stables', title: 'Rotation: risk-on alts ↔ stables risk management', minutes: 20, tags: ['crypto'] },
				],
			},
			{
				courseKey: 'crypto-risk',
				title: 'Crypto Risk, Security & Mindset',
				minutes: 104,
				description: 'Survive 24/7 volatility: sizing, scams, custody and the crypto mindset.',
				lessons: [
					{ lessonKey: 'sizing-crypto', title: 'Position sizing for 10% daily movers', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'scams-rugs', title: 'Rug pulls, phishing & honeypots: the red-flag list', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'exchange-risk', title: 'Exchange risk: FTX lessons, proof-of-reserves', minutes: 16, tags: ['crypto'] },
					{ lessonKey: 'journal-crypto', title: 'Crypto journaling: setups, narratives & emotions', minutes: 17, tags: ['crypto'] },
					{ lessonKey: 'mindset-24-7', title: '24/7 mindset: sleep, FOMO & taking breaks', minutes: 18, tags: ['crypto'] },
					{ lessonKey: 'capstone-crypto', title: 'Capstone: your complete crypto playbook', minutes: 18, tags: ['crypto'] },
				],
			},
		],
	},

	// ── ORDER FLOW MASTERY ─────────────────────────────────────────
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
					{ lessonKey: 'what-is-book', title: 'The limit order book: what every row means', minutes: 15, tags: ['orderflow'] },
					{ lessonKey: 'bid-ask-spread', title: 'Bid, ask and spread: the cost of immediacy', minutes: 14, tags: ['orderflow'] },
					{ lessonKey: 'depth-level2', title: 'Depth & Level 2: size stacked behind price', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'ladder-live', title: 'The live ladder: reading bids vs asks in real time', minutes: 16, tags: ['orderflow'] },
					{ lessonKey: 'market-vs-limit', title: 'Market vs limit orders: who pays the spread', minutes: 15, tags: ['orderflow'] },
					{ lessonKey: 'session-context', title: 'Session high/low: framing the book in the day', minutes: 15, tags: ['orderflow'] },
				],
			},
			{
				courseKey: 'liquidity-heatmaps',
				title: 'Liquidity & Heatmaps',
				minutes: 104,
				description: 'Walls, spoofing and absorption — seeing liquidity on the heatmap.',
				lessons: [
					{ lessonKey: 'heatmap-reading', title: 'Heatmap reading: color, intensity and time', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'liquidity-walls', title: 'Liquidity walls: support and resistance that breathes', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'spoofing', title: 'Spoofing & fleeting size: size that never fills', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'absorption', title: 'Absorption: when prints eat the wall', minutes: 19, tags: ['orderflow'] },
					{ lessonKey: 'icebergs', title: 'Icebergs: hidden size that refills', minutes: 16, tags: ['orderflow'] },
					{ lessonKey: 'heatmap-settings', title: 'Tuning the screen: rows, speed and intensity', minutes: 16, tags: ['orderflow'] },
				],
			},
			{
				courseKey: 'tape-prints',
				title: 'Tape & Executed Prints',
				minutes: 98,
				description: 'Aggressors, big prints and delta — who is hitting whom.',
				lessons: [
					{ lessonKey: 'tape-reading', title: 'Reading the tape: price, size and pace', minutes: 16, tags: ['orderflow'] },
					{ lessonKey: 'aggressor-side', title: 'Aggressor side: buyer- vs seller-initiated prints', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'big-prints', title: 'Big prints: filtering size that matters', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'delta-cvd', title: 'Delta & CVD: cumulative buy/sell pressure', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'exhaustion', title: 'Exhaustion: climax prints and failed follow-through', minutes: 15, tags: ['orderflow'] },
					{ lessonKey: 'sweeps', title: 'Liquidity sweeps: stop runs and continuation', minutes: 15, tags: ['orderflow'] },
				],
			},
			{
				courseKey: 'footprint-profile',
				title: 'Footprint & Volume Profile',
				minutes: 106,
				description: 'Bid/ask imbalances per level, POC and value areas.',
				lessons: [
					{ lessonKey: 'footprint-basics', title: 'Footprint thinking: traded bid x ask per level', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'imbalances', title: 'Imbalances: stacked buying and selling pressure', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'volume-profile', title: 'Volume profile: where the day did business', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'poc-value', title: 'POC, value area high and low', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'low-volume-nodes', title: 'Low-volume nodes: fast travel zones', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'profile-day-types', title: 'Day types: trend, range and breakout profiles', minutes: 18, tags: ['orderflow'] },
				],
			},
			{
				courseKey: 'vwap-session',
				title: 'VWAP & Session Tools',
				minutes: 96,
				description: 'The institutional benchmark and the session stats that frame it.',
				lessons: [
					{ lessonKey: 'vwap-explained', title: 'VWAP explained: the volume-weighted fair price', minutes: 16, tags: ['orderflow'] },
					{ lessonKey: 'vwap-bands', title: 'VWAP bands: stretched vs extended markets', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'vwap-entries', title: 'VWAP entries: holds, reclaims and failures', minutes: 17, tags: ['orderflow'] },
					{ lessonKey: 'anchored-vwap', title: 'Anchored VWAP: from swing highs, lows and news', minutes: 16, tags: ['orderflow'] },
					{ lessonKey: 'session-stats', title: 'Session stats: volume, buy share and biggest print', minutes: 15, tags: ['orderflow'] },
					{ lessonKey: 'correlation-tracker', title: 'Correlation tracker: BTC leadership and alt rotation', minutes: 15, tags: ['orderflow'] },
				],
			},
			{
				courseKey: 'flow-playbooks',
				title: 'Order-Flow Playbooks',
				minutes: 110,
				description: 'Complete reversal and continuation systems plus your capstone.',
				lessons: [
					{ lessonKey: 'absorption-reversal', title: 'Absorption reversal: wall holds, delta flips', minutes: 19, tags: ['orderflow'] },
					{ lessonKey: 'sweep-continuation', title: 'Sweep continuation: riding the liquidity run', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'failed-auction', title: 'Failed auction: low-volume rejection trades', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'multi-pair', title: 'Multi-pair rotation: leading with BTC, executing alts', minutes: 19, tags: ['orderflow'] },
					{ lessonKey: 'journal-flow', title: 'Journaling flow trades: screenshots, delta, review', minutes: 18, tags: ['orderflow'] },
					{ lessonKey: 'capstone-flow', title: 'Capstone: your complete order-flow playbook', minutes: 18, tags: ['orderflow'] },
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
					{ lessonKey: 'confluence-system', title: 'Building a confluence scoring system', minutes: 21, tags: ['general', 'forex', 'crypto'] },
					{ lessonKey: 'liquidity-grabs', title: 'Liquidity grabs on FX & crypto wicks', minutes: 22, tags: ['forex', 'crypto'] },
					{ lessonKey: 'orderflow-volume', title: 'Volume & order flow: futures, OI & tick', minutes: 22, tags: ['forex', 'crypto'] },
					{ lessonKey: 'failing-setups', title: 'When setups fail: invalidation & flip rules', minutes: 23, tags: ['general'] },
				],
			},
			{
				courseKey: 'strategy-lab',
				title: 'Strategy Lab',
				minutes: 92,
				description: 'Pick and prove your edge: scalps, intraday, swing.',
				lessons: [
					{ lessonKey: 'pick-strategy', title: 'Matching strategy to personality & session', minutes: 22, tags: ['general', 'forex', 'crypto'] },
					{ lessonKey: 'backtesting', title: 'Backtesting 100 trades the honest way', minutes: 24, tags: ['general'] },
					{ lessonKey: 'forward-test', title: 'Forward-testing on demo without lying to yourself', minutes: 22, tags: ['general'] },
					{ lessonKey: 'scale-edge', title: 'Scaling what works, killing what does not', minutes: 24, tags: ['general'] },
				],
			},
			{
				courseKey: 'psychology-edge',
				title: 'Psychology & Sizing',
				minutes: 84,
				description: 'Tilt control and math-grade sizing for volatile assets.',
				lessons: [
					{ lessonKey: 'tilt-protocol', title: 'Tilt protocol: stops for yourself', minutes: 20, tags: ['general'] },
					{ lessonKey: 'risk-models', title: 'Fixed-fractional vs Kelly vs volatility sizing', minutes: 22, tags: ['general', 'forex', 'crypto'] },
					{ lessonKey: 'correlation-portfolio', title: 'Portfolio heat across FX + crypto', minutes: 21, tags: ['forex', 'crypto'] },
					{ lessonKey: 'performance-review', title: 'Monthly performance review template', minutes: 21, tags: ['general'] },
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
					{ lessonKey: 'system-design', title: 'Designing a rules-based system', minutes: 23, tags: ['general', 'forex', 'crypto'] },
					{ lessonKey: 'trend-systems', title: 'Trend systems for FX majors & BTC', minutes: 24, tags: ['forex', 'crypto'] },
					{ lessonKey: 'mean-reversion', title: 'Mean-reversion in ranges: FX Asia & crypto chop', minutes: 24, tags: ['forex', 'crypto'] },
					{ lessonKey: 'event-systems', title: 'Event systems: CPI/NFP & FOMC vs CPI-crypto beta', minutes: 25, tags: ['forex', 'crypto'] },
				],
			},
			{
				courseKey: 'portfolio-desk',
				title: 'Portfolio & Fund Execution',
				minutes: 90,
				description: 'Heat, hedging and execution at size.',
				lessons: [
					{ lessonKey: 'portfolio-heat', title: 'Portfolio heat & exposure caps', minutes: 22, tags: ['general'] },
					{ lessonKey: 'hedging-fx-crypto', title: 'Hedging: FX offsets & delta-neutral crypto', minutes: 23, tags: ['forex', 'crypto'] },
					{ lessonKey: 'execution-size', title: 'Executing size: TWAP, ladders & slippage', minutes: 22, tags: ['general'] },
					{ lessonKey: 'fund-reporting', title: 'Fund-grade reporting & investor review', minutes: 23, tags: ['general'] },
				],
			},
			{
				courseKey: 'mastery-capstone',
				title: 'Mastery Capstone',
				minutes: 80,
				description: 'Your audited playbook and next 90 days.',
				lessons: [
					{ lessonKey: 'playbook-audit', title: 'Auditing your full playbook', minutes: 20, tags: ['general'] },
					{ lessonKey: 'algo-intro', title: 'Algos & automation intro (EAs + bots)', minutes: 22, tags: ['forex', 'crypto'] },
					{ lessonKey: 'prop-scale', title: 'Scaling: prop capital & crypto size-up plan', minutes: 19, tags: ['forex', 'crypto'] },
					{ lessonKey: 'next-90', title: 'Your next 90 days: goals, metrics, review', minutes: 19, tags: ['general'] },
				],
			},
		],
	},
};

export const WEBINAR_CATALOG = [
	{
		id: 'market-open-breakdown', title: 'Live Market Open Breakdown', day: 1, hour: 8, duration: 60,
		host: 'AI Host · TradingBible Desk', track: 'general',
		description: 'A live walkthrough of the market open — key levels, liquidity zones and the trades the day is offering.',
	},
	{
		id: 'forex-london-lab', title: 'Forex Lab: London Killzone Live', day: 2, hour: 3, duration: 60,
		host: 'AI Host · FX Desk', track: 'forex',
		description: 'Live London sweep: DXY, EUR/USD & GBP/USD levels, liquidity targets and the breakout vs fakeout read.',
	},
	{
		id: 'journal-review', title: 'Journal Review: Fixing Your Worst Trades', day: 3, hour: 17, duration: 60,
		host: 'AI Host · TradingBible Coaches', track: 'general',
		description: 'Bring your worst trade of the week. The room breaks down the mistake and rebuilds the entry.',
	},
	{
		id: 'crypto-onchain-lab', title: 'Crypto Lab: On-chain + Perps Live', day: 4, hour: 16, duration: 60,
		host: 'AI Host · Crypto Desk', track: 'crypto',
		description: 'BTC/ETH live: funding, open interest, dominance and exchange flows — where positioning is trapped.',
	},
	{
		id: 'risk-qa', title: 'Risk & Position Sizing Q&A', day: 5, hour: 14, duration: 45,
		host: 'AI Host · TradingBible Research', track: 'general',
		description: 'Open floor on risk: lot sizing, ATR stops, crypto volatility sizing, drawdown control and portfolio heat.',
	},
	{
		id: 'ai-trading-lab', title: 'AI Trading Lab: Strategy Build', day: 6, hour: 11, duration: 75,
		host: 'AI Host · TradingBible Systems', track: 'pro',
		description: 'A live strategy workshop — the AI host designs a systematic FX + crypto setup with the room, end to end.',
	},
	{
		id: 'forex-news-live', title: 'Forex Live: CPI / NFP Reaction', day: 3, hour: 8, duration: 45,
		host: 'AI Host · FX Macro Desk', track: 'forex',
		description: 'High-impact news morning: pre-release levels, spike tactics and post-release drift on USD pairs.',
	},
	{
		id: 'crypto-defi-yield', title: 'Crypto Deep-Dive: DeFi & Narratives', day: 0, hour: 15, duration: 60,
		host: 'AI Host · Crypto Research', track: 'crypto',
		description: 'Weekly narrative scan: L1/L2 flows, memecoins vs utility, airdrops and staking yields worth attention.',
	},
];

// Flattened searchable topic index for the explorer.
export function getTopicIndex() {
	const topics = [];
	for (const [pathKey, curriculum] of Object.entries(STATIC_CURRICULA)) {
		const path = PATHS.find((p) => p.key === pathKey);
		for (const course of curriculum.courses || []) {
			for (const lesson of course.lessons || []) {
				topics.push({
					pathKey,
					pathName: curriculum.pathName,
					track: path?.track || 'general',
					courseKey: course.courseKey,
					courseTitle: course.title,
					...lesson,
				});
			}
		}
	}
	return topics;
}

export function pathStats(pathKey) {
	const curriculum = STATIC_CURRICULA[pathKey];
	if (!curriculum) return { lessons: 0, minutes: 0, courses: 0 };
	const lessons = curriculum.courses.reduce((a, c) => a + (c.lessons?.length || 0), 0);
	const minutes = curriculum.courses.reduce((a, c) => a + (c.minutes || 0), 0);
	return { lessons, minutes, courses: curriculum.courses.length };
}
