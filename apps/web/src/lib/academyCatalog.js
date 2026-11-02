// TradingBible Academy — full company-purpose catalog.
// Single source of truth for the portal UI (paths, courses, lessons, topic explorer).
// Covers markets, platform, funded desks, TBC, investor ownership, AI/technology
// and the company/creator business. Backend fallbacks mirror this file in
// apps/api/src/api/academy.js — keep them in sync.

export const TRACKS = [
	{ key: 'all', name: 'All topics' },
	{ key: 'general', name: 'Foundations' },
	{ key: 'forex', name: 'Forex' },
	{ key: 'crypto', name: 'Crypto' },
	{ key: 'multi', name: 'Multi-Asset' },
	{ key: 'orderflow', name: 'Order Flow' },
	{ key: 'platform', name: 'Platform' },
	{ key: 'company', name: 'Company' },
	{ key: 'technology', name: 'AI & Tech' },
	{ key: 'pro', name: 'Pro Desk' },
];

export const SCHOOLS = [
	{
		key: 'foundation',
		name: 'Foundation School',
		code: 'S—01',
		desc: 'Start with how markets work, what you are actually trading, and the risk habits that come before any strategy.',
		pathKeys: ['beginner'],
	},
	{
		key: 'markets',
		name: 'Markets School',
		code: 'S—02',
		desc: 'Read FX, crypto, multi-asset and order flow as one connected market rather than disconnected screens.',
		pathKeys: ['forex', 'crypto', 'multi-asset', 'orderflow'],
	},
	{
		key: 'desk',
		name: 'Desk Craft School',
		code: 'S—03',
		desc: 'Build the operating system of a desk: edge, psychology, platform mastery, funded rules and AI guardrails.',
		pathKeys: ['intermediate', 'professional', 'platform', 'funded', 'ai-tech'],
	},
	{
		key: 'ownership',
		name: 'Ownership School',
		code: 'S—04',
		desc: 'Understand the company behind the terminal: TBC, investor ownership, business model and creator operations.',
		pathKeys: ['digital-assets', 'investor', 'company-business'],
	},
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
	{
		key: 'multi-asset',
		name: 'Multi-Asset Command',
		level: 'Beginner → Advanced',
		track: 'multi',
		color: '#f59e0b',
		icon: 'compass',
		desc: 'Trade the whole board: gold, indices, oil, equities, FX and crypto. Learn which market is leading, when correlation turns, and how to size one portfolio instead of six disconnected bets.',
		skills: ['Gold & metals', 'Indices & equities', 'Commodities & oil', 'Cross-asset risk'],
	},
	{
		key: 'platform',
		name: 'Platform Mastery',
		level: 'Beginner → Pro',
		track: 'platform',
		color: '#22d3ee',
		icon: 'monitor',
		desc: 'Use every TradingBible surface with confidence: Terminal Pro, journal, analytics, alerts, order flow, broker/data infrastructure, backtesting, paper trading and the SI coach — so the tools work as one workflow.',
		skills: ['Terminal Pro', 'Journal & analytics', 'Alerts & order flow', 'Broker & data'],
	},
	{
		key: 'funded',
		name: 'Funded & Prop Desk',
		level: 'Intermediate → Pro',
		track: 'pro',
		color: '#d4af37',
		icon: 'target',
		desc: 'Pass, keep and scale a funded account: rulebooks, drawdown math, payout cycles, challenge psychology and the desk habits prop firms actually reward.',
		skills: ['Challenge rules', 'Drawdown math', 'Payout cycles', 'Scaling plan'],
	},
	{
		key: 'digital-assets',
		name: 'TBC & Digital Assets',
		level: 'Beginner → Advanced',
		track: 'company',
		color: '#f472b6',
		icon: 'coins',
		desc: 'Understand TradingBible Coin as a proposed digital asset — not equity: Cosmos architecture, wallets, custody, testnet, token utility, risk, and the legal boundaries around staking, yield and listings.',
		skills: ['TBC vs equity', 'Wallets & custody', 'Testnet & mainnet', 'Legal risk'],
	},
	{
		key: 'investor',
		name: 'Investor & Ownership',
		level: 'Beginner → Pro',
		track: 'company',
		color: '#34d399',
		icon: 'handshake',
		desc: 'Read a private company like an owner: cap table, dilution, revenue quality, IPO readiness, shareholder rights, disclosures and the difference between TBC, equity and a promise.',
		skills: ['Cap table & dilution', 'Financial quality', 'IPO readiness', 'Shareholder rights'],
	},
	{
		key: 'ai-tech',
		name: 'AI & Trading Technology',
		level: 'Intermediate → Pro',
		track: 'technology',
		color: '#a78bfa',
		icon: 'cpu',
		desc: 'Use AI as a research and risk assistant, not an oracle: prompts, data quality, backtest traps, model risk, automation guardrails and the SI workflow behind TradingBible.',
		skills: ['AI research', 'Data quality', 'Backtest traps', 'Automation guardrails'],
	},
	{
		key: 'company-business',
		name: 'Company & Creator Business',
		level: 'Beginner → Pro',
		track: 'company',
		color: '#e0a0f0',
		icon: 'building',
		desc: 'Learn how TradingBible itself is built: product lines, pricing, partnerships, content, community, compliance and the operating system behind a fintech education business.',
		skills: ['Business model', 'Product & pricing', 'Partnerships', 'Compliance & trust'],
	},
];

// ── Static curricula: instant topic map shown before / without SI ─────
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
					{ lessonKey: 'prop-firms', title: 'TradingBible Funded — passing the evaluation', minutes: 22, tags: ['forex'] },
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
					{ lessonKey: 'narratives', title: 'Narratives: memecoins, SI, RWA, L2s & cycles', minutes: 18, tags: ['crypto'] },
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

	'multi-asset': {
		pathName: 'Multi-Asset Command',
		focus: 'Read gold, indices, equities, energy, FX and crypto as one connected market — then size one book instead of six unrelated bets.',
		courses: [
			{
				courseKey: 'market-map',
				title: 'The Multi-Asset Map',
				minutes: 58,
				description: 'What moves each asset family and how the session clock changes the answer.',
				lessons: [
					{ lessonKey: 'asset-families', title: 'Asset families: what actually moves gold, oil, indices and FX', minutes: 20, tags: ['multi'] },
					{ lessonKey: 'session-clock', title: 'The 24-hour session clock: Asia, London, New York', minutes: 18, tags: ['multi'] },
					{ lessonKey: 'dollar-axis', title: 'The dollar axis: DXY, yields and risk appetite', minutes: 20, tags: ['multi'] },
				],
			},
			{
				courseKey: 'gold-equities',
				title: 'Gold, Indices & Equities',
				minutes: 82,
				description: 'The signature markets: metals, index futures, single stocks and the growth trade.',
				lessons: [
					{ lessonKey: 'gold-playbook', title: 'Gold: real yields, fear and the XAU/USD playbook', minutes: 22, tags: ['multi'] },
					{ lessonKey: 'index-playbook', title: 'Indices: SPX, NAS100 and the opening drive', minutes: 21, tags: ['multi'] },
					{ lessonKey: 'single-stocks', title: 'Single stocks: earnings, gaps and liquidity', minutes: 20, tags: ['multi'] },
					{ lessonKey: 'oil-copper', title: 'Oil, copper and the growth trade', minutes: 19, tags: ['multi'] },
				],
			},
			{
				courseKey: 'cross-asset-risk',
				title: 'Cross-Asset Portfolio Risk',
				minutes: 80,
				description: 'Correlation, one-book sizing and hedging without doubling the risk.',
				lessons: [
					{ lessonKey: 'correlation-regime', title: 'Correlation regimes: when diversification stops working', minutes: 20, tags: ['multi'] },
					{ lessonKey: 'one-book', title: 'One book: sizing across six markets', minutes: 21, tags: ['multi'] },
					{ lessonKey: 'hedging-basics', title: 'Hedging without doubling your risk', minutes: 19, tags: ['multi'] },
					{ lessonKey: 'multi-capstone', title: 'Capstone: a full multi-asset week', minutes: 20, tags: ['multi'] },
				],
			},
		],
	},

	'platform': {
		pathName: 'Platform Mastery',
		focus: 'Use Terminal Pro, journal, analytics, alerts, order flow, broker/data infrastructure, backtesting and paper trading as one repeatable workflow.',
		courses: [
			{
				courseKey: 'terminal-basics',
				title: 'Terminal Pro Essentials',
				minutes: 74,
				description: 'A clean workspace, honest charts, safe orders and repeatable prep.',
				lessons: [
					{ lessonKey: 'workspace', title: 'Build a workspace that fits your session', minutes: 18, tags: ['platform'] },
					{ lessonKey: 'charts', title: 'Charts, timeframes and clean levels', minutes: 20, tags: ['platform'] },
					{ lessonKey: 'orders', title: 'Orders, stops and risk preview', minutes: 19, tags: ['platform'] },
					{ lessonKey: 'layouts', title: 'Layouts, hotkeys and repeatable prep', minutes: 17, tags: ['platform'] },
				],
			},
			{
				courseKey: 'journal-analytics',
				title: 'Journal & Performance Analytics',
				minutes: 75,
				description: 'Turn each trade into evidence, then read the evidence honestly.',
				lessons: [
					{ lessonKey: 'journal-entry', title: 'A journal entry that actually teaches you', minutes: 19, tags: ['platform'] },
					{ lessonKey: 'tagging', title: 'Tag setups, mistakes and market conditions', minutes: 18, tags: ['platform'] },
					{ lessonKey: 'analytics', title: 'Read your analytics without fooling yourself', minutes: 20, tags: ['platform'] },
					{ lessonKey: 'review-loop', title: 'The weekly review loop', minutes: 18, tags: ['platform'] },
				],
			},
			{
				courseKey: 'alerts-flow',
				title: 'Alerts, Order Flow & Automation',
				minutes: 77,
				description: 'Let the platform wait for your level while you study the book.',
				lessons: [
					{ lessonKey: 'alerts', title: 'Alerts that wait for your level, not your emotion', minutes: 17, tags: ['platform'] },
					{ lessonKey: 'heatmap', title: 'Order flow: depth, heatmap and tape', minutes: 22, tags: ['platform'] },
					{ lessonKey: 'paper', title: 'Paper trading the exact live plan', minutes: 18, tags: ['platform'] },
					{ lessonKey: 'backtest', title: 'Backtest, then forward-test', minutes: 20, tags: ['platform'] },
				],
			},
			{
				courseKey: 'broker-infra',
				title: 'Brokerage & Data Infrastructure',
				minutes: 74,
				description: 'The plumbing behind the screen: connections, routing, data quality and failure drills.',
				lessons: [
					{ lessonKey: 'broker-connections', title: 'Broker connections: read-only keys, scopes and revocation', minutes: 18, tags: ['platform'] },
					{ lessonKey: 'order-routing', title: 'Order routing, fills and slippage', minutes: 19, tags: ['platform'] },
					{ lessonKey: 'market-data', title: 'Market data: feeds, timestamps and gaps', minutes: 19, tags: ['platform'] },
					{ lessonKey: 'infra-risk', title: 'Infrastructure risk: outages, failover and incident drills', minutes: 18, tags: ['platform'] },
				],
			},
			{
				courseKey: 'platform-capstone',
				title: 'Platform Capstone',
				minutes: 56,
				description: 'A full morning, a full execution day and a workflow review.',
				lessons: [
					{ lessonKey: 'morning-routine', title: 'The 20-minute morning routine', minutes: 18, tags: ['platform'] },
					{ lessonKey: 'execution-day', title: 'A full execution day on the platform', minutes: 20, tags: ['platform'] },
					{ lessonKey: 'platform-review', title: 'Measure the workflow, not just the P&L', minutes: 18, tags: ['platform'] },
				],
			},
		],
	},

	'funded': {
		pathName: 'Funded & Prop Desk',
		focus: 'Pass, keep and scale a funded account with rule-aware risk, payout planning and desk discipline.',
		courses: [
			{
				courseKey: 'challenge-rules',
				title: 'Know the Rulebook',
				minutes: 56,
				description: 'The three challenge types and the math that decides survival.',
				lessons: [
					{ lessonKey: 'rule-types', title: 'One-step, two-step and instant funding', minutes: 18, tags: ['pro'] },
					{ lessonKey: 'drawdown', title: 'Daily loss vs max drawdown — the math', minutes: 20, tags: ['pro'] },
					{ lessonKey: 'consistency', title: 'Consistency rules and payout eligibility', minutes: 18, tags: ['pro'] },
				],
			},
			{
				courseKey: 'passing',
				title: 'Passing Without Gambling',
				minutes: 72,
				description: 'Build a buffer, size correctly and survive the rule traps.',
				lessons: [
					{ lessonKey: 'first-days', title: 'The first three days: build a buffer', minutes: 18, tags: ['pro'] },
					{ lessonKey: 'risk-per-trade', title: 'Risk per trade under a prop rulebook', minutes: 19, tags: ['pro'] },
					{ lessonKey: 'news-weekend', title: 'News, weekends and rule traps', minutes: 17, tags: ['pro'] },
					{ lessonKey: 'recovery', title: 'Recovery without revenge', minutes: 18, tags: ['pro'] },
				],
			},
			{
				courseKey: 'funded-desk',
				title: 'The Funded Desk',
				minutes: 77,
				description: 'Payouts, scaling and multiple accounts without correlated blow-up.',
				lessons: [
					{ lessonKey: 'payout', title: 'Payout cycles and cash-flow planning', minutes: 18, tags: ['pro'] },
					{ lessonKey: 'scaling', title: 'Scaling: when to add size', minutes: 19, tags: ['pro'] },
					{ lessonKey: 'multiple-accounts', title: 'Multiple accounts without correlated blow-up', minutes: 20, tags: ['pro'] },
					{ lessonKey: 'prop-capstone', title: 'Capstone: a 30-day funded plan', minutes: 20, tags: ['pro'] },
				],
			},
		],
	},

	'digital-assets': {
		pathName: 'TBC & Digital Assets',
		focus: 'Understand TradingBible Coin as a proposed digital asset — architecture, custody, testnet, utility and legal boundaries.',
		courses: [
			{
				courseKey: 'tbc-foundations',
				title: 'TBC Foundations',
				minutes: 74,
				description: 'What TBC is, what it is not, and how the proposed network works.',
				lessons: [
					{ lessonKey: 'what-tbc', title: 'What TBC is — and what it is not', minutes: 18, tags: ['crypto', 'company'] },
					{ lessonKey: 'supply', title: 'Supply, minting and the 100M cap', minutes: 17, tags: ['crypto', 'company'] },
					{ lessonKey: 'architecture', title: 'Cosmos SDK, CometBFT and EVM', minutes: 20, tags: ['crypto', 'company'] },
					{ lessonKey: 'wallet', title: 'Wallets, keys and safe custody', minutes: 19, tags: ['crypto', 'company'] },
				],
			},
			{
				courseKey: 'tbc-lifecycle',
				title: 'Testnet to Mainnet',
				minutes: 75,
				description: 'Observation, security, listings and the legal questions that come first.',
				lessons: [
					{ lessonKey: 'testnet', title: 'The 90-day public testnet', minutes: 18, tags: ['crypto', 'company'] },
					{ lessonKey: 'security', title: 'Security reviews and incident response', minutes: 19, tags: ['crypto', 'company'] },
					{ lessonKey: 'listing', title: 'Listings, liquidity and market structure', minutes: 18, tags: ['crypto', 'company'] },
					{ lessonKey: 'legal', title: 'Staking, yield and jurisdiction risk', minutes: 20, tags: ['crypto', 'company'] },
				],
			},
			{
				courseKey: 'digital-asset-ops',
				title: 'Digital Asset Operations',
				minutes: 55,
				description: 'Treasury, segregation and explaining TBC to a regulator.',
				lessons: [
					{ lessonKey: 'treasury', title: 'Treasury and asset segregation', minutes: 18, tags: ['crypto', 'company'] },
					{ lessonKey: 'payments', title: 'TBC credits and payout mechanics', minutes: 17, tags: ['crypto', 'company'] },
					{ lessonKey: 'tbc-capstone', title: 'Capstone: explain TBC to a regulator', minutes: 20, tags: ['crypto', 'company'] },
				],
			},
		],
	},

	'investor': {
		pathName: 'Investor & Ownership',
		focus: 'Read a private company like an owner: ownership, dilution, financial quality, IPO readiness and shareholder rights.',
		courses: [
			{
				courseKey: 'ownership-basics',
				title: 'Ownership Basics',
				minutes: 76,
				description: 'Equity, tokens, cap tables, rights and valuation without hype.',
				lessons: [
					{ lessonKey: 'equity-vs-coin', title: 'Equity, tokens and credits — never interchangeable', minutes: 18, tags: ['company'] },
					{ lessonKey: 'cap-table', title: 'Cap table, dilution and ownership %', minutes: 20, tags: ['company'] },
					{ lessonKey: 'rights', title: 'Shareholder rights and transfer restrictions', minutes: 18, tags: ['company'] },
					{ lessonKey: 'valuation', title: 'Valuation without hype', minutes: 20, tags: ['company'] },
				],
			},
			{
				courseKey: 'company-financials',
				title: 'Reading the Company',
				minutes: 75,
				description: 'Revenue quality, runway, unit economics and the risks that matter.',
				lessons: [
					{ lessonKey: 'revenue-quality', title: 'Revenue quality vs revenue headlines', minutes: 19, tags: ['company'] },
					{ lessonKey: 'burn-runway', title: 'Burn, runway and capital needs', minutes: 18, tags: ['company'] },
					{ lessonKey: 'unit-economics', title: 'Unit economics for a fintech', minutes: 20, tags: ['company'] },
					{ lessonKey: 'risk-factors', title: 'Risk factors that actually matter', minutes: 18, tags: ['company'] },
				],
			},
			{
				courseKey: 'ipo-path',
				title: 'The IPO & Disclosure Path',
				minutes: 79,
				description: 'The real steps from LLC to listed company, and what an S-1 must prove.',
				lessons: [
					{ lessonKey: 'ipo-steps', title: 'From LLC to listed company: the real steps', minutes: 21, tags: ['company'] },
					{ lessonKey: 's1', title: 'What an S-1 must prove', minutes: 20, tags: ['company'] },
					{ lessonKey: 'governance', title: 'Governance, audits and controls', minutes: 18, tags: ['company'] },
					{ lessonKey: 'investor-capstone', title: 'Capstone: an owner\'s diligence memo', minutes: 20, tags: ['company'] },
				],
			},
		],
	},

	'ai-tech': {
		pathName: 'AI & Trading Technology',
		focus: 'Use AI as a research and risk assistant: prompts, data quality, backtest traps, model risk and automation guardrails.',
		courses: [
			{
				courseKey: 'ai-foundations',
				title: 'AI for Traders',
				minutes: 76,
				description: 'What AI can do, where it fails, and how to ask for testable ideas.',
				lessons: [
					{ lessonKey: 'what-ai', title: 'What AI can and cannot do in markets', minutes: 18, tags: ['technology'] },
					{ lessonKey: 'prompts', title: 'Prompts that produce testable ideas', minutes: 19, tags: ['technology'] },
					{ lessonKey: 'data', title: 'Data quality, look-ahead and survivorship bias', minutes: 21, tags: ['technology'] },
					{ lessonKey: 'hallucination', title: 'Hallucination, overfitting and false confidence', minutes: 18, tags: ['technology'] },
				],
			},
			{
				courseKey: 'si-workflow',
				title: 'The SI Research Workflow',
				minutes: 75,
				description: 'From question to brief, with human review at every decision.',
				lessons: [
					{ lessonKey: 'si-brief', title: 'From question to SI research brief', minutes: 18, tags: ['technology'] },
					{ lessonKey: 'signals', title: 'Signals, confidence and human review', minutes: 19, tags: ['technology'] },
					{ lessonKey: 'journal-ai', title: 'AI journal review without outsourcing judgment', minutes: 18, tags: ['technology'] },
					{ lessonKey: 'automation', title: 'Automation guardrails and kill switches', minutes: 20, tags: ['technology'] },
				],
			},
			{
				courseKey: 'build-stack',
				title: 'Build & Evaluate a Trading Stack',
				minutes: 59,
				description: 'APIs, backtest architecture and an AI-assisted desk policy.',
				lessons: [
					{ lessonKey: 'apis', title: 'APIs, webhooks and data contracts', minutes: 19, tags: ['technology'] },
					{ lessonKey: 'backtest', title: 'Backtest architecture that survives contact', minutes: 20, tags: ['technology'] },
					{ lessonKey: 'ai-capstone', title: 'Capstone: an AI-assisted desk policy', minutes: 20, tags: ['technology'] },
				],
			},
		],
	},

	'company-business': {
		pathName: 'Company & Creator Business',
		focus: 'How TradingBible is built: product lines, pricing, content, community, partnerships, compliance and trust.',
		courses: [
			{
				courseKey: 'business-model',
				title: 'The TradingBible Business Model',
				minutes: 72,
				description: 'Subscriptions, licensing, education, ads and the metrics that matter.',
				lessons: [
					{ lessonKey: 'lines', title: 'Subscriptions, licensing, education and ads', minutes: 18, tags: ['company'] },
					{ lessonKey: 'pricing', title: 'Pricing without promising returns', minutes: 17, tags: ['company'] },
					{ lessonKey: 'funnel', title: 'From free lesson to lifetime learner', minutes: 18, tags: ['company'] },
					{ lessonKey: 'metrics', title: 'Metrics that matter before revenue', minutes: 19, tags: ['company'] },
				],
			},
			{
				courseKey: 'creator-engine',
				title: 'The Creator & Education Engine',
				minutes: 74,
				description: 'Curriculum, content, community and distribution that teach instead of hype.',
				lessons: [
					{ lessonKey: 'curriculum', title: 'Curriculum design for kids and adults', minutes: 19, tags: ['company'] },
					{ lessonKey: 'content', title: 'Content that teaches, not hypes', minutes: 18, tags: ['company'] },
					{ lessonKey: 'community', title: 'Community, live rooms and peer feedback', minutes: 18, tags: ['company'] },
					{ lessonKey: 'distribution', title: 'Distribution, SEO and partnerships', minutes: 19, tags: ['company'] },
				],
			},
			{
				courseKey: 'trust-ops',
				title: 'Trust, Compliance & Operations',
				minutes: 75,
				description: 'Disclosures, privacy, support and a 90-day company plan.',
				lessons: [
					{ lessonKey: 'disclosures', title: 'Disclosures, disclaimers and honest claims', minutes: 18, tags: ['company'] },
					{ lessonKey: 'kyc', title: 'KYC, privacy and data handling', minutes: 19, tags: ['company'] },
					{ lessonKey: 'support', title: 'Support, refunds and incident response', minutes: 18, tags: ['company'] },
					{ lessonKey: 'business-capstone', title: 'Capstone: a 90-day company plan', minutes: 20, tags: ['company'] },
				],
			},
		],
	},
};

export const WEBINAR_CATALOG = [
	{
		id: 'market-open-breakdown', title: 'Live Market Open Breakdown', day: 1, hour: 8, duration: 60,
		host: 'SI Host · TradingBible Desk', track: 'general',
		description: 'A live walkthrough of the market open — key levels, liquidity zones and the trades the day is offering.',
	},
	{
		id: 'forex-london-lab', title: 'Forex Lab: London Killzone Live', day: 2, hour: 3, duration: 60,
		host: 'SI Host · FX Desk', track: 'forex',
		description: 'Live London sweep: DXY, EUR/USD & GBP/USD levels, liquidity targets and the breakout vs fakeout read.',
	},
	{
		id: 'journal-review', title: 'Journal Review: Fixing Your Worst Trades', day: 3, hour: 17, duration: 60,
		host: 'SI Host · TradingBible Coaches', track: 'general',
		description: 'Bring your worst trade of the week. The room breaks down the mistake and rebuilds the entry.',
	},
	{
		id: 'crypto-onchain-lab', title: 'Crypto Lab: On-chain + Perps Live', day: 4, hour: 16, duration: 60,
		host: 'SI Host · Crypto Desk', track: 'crypto',
		description: 'BTC/ETH live: funding, open interest, dominance and exchange flows — where positioning is trapped.',
	},
	{
		id: 'risk-qa', title: 'Risk & Position Sizing Q&A', day: 5, hour: 14, duration: 45,
		host: 'SI Host · TradingBible Research', track: 'general',
		description: 'Open floor on risk: lot sizing, ATR stops, crypto volatility sizing, drawdown control and portfolio heat.',
	},
	{
		id: 'ai-trading-lab', title: 'SI Trading Lab: Strategy Build', day: 6, hour: 11, duration: 75,
		host: 'SI Host · TradingBible Systems', track: 'pro',
		description: 'A live strategy workshop — the SI host designs a systematic FX + crypto setup with the room, end to end.',
	},
	{
		id: 'forex-news-live', title: 'Forex Live: CPI / NFP Reaction', day: 3, hour: 8, duration: 45,
		host: 'SI Host · FX Macro Desk', track: 'forex',
		description: 'High-impact news morning: pre-release levels, spike tactics and post-release drift on USD pairs.',
	},
	{
		id: 'crypto-defi-yield', title: 'Crypto Deep-Dive: DeFi & Narratives', day: 0, hour: 15, duration: 60,
		host: 'SI Host · Crypto Research', track: 'crypto',
		description: 'Weekly narrative scan: L1/L2 flows, memecoins vs utility, airdrops and staking yields worth attention.',
	},
	{
		id: 'multi-asset-open', title: 'Multi-Asset Open: Gold, Nasdaq & BTC', day: 4, hour: 9, duration: 60,
		host: 'SI Host · Cross-Asset Desk', track: 'multi',
		description: 'One room, three markets: the dollar axis, gold levels, index opening drive and crypto risk appetite.',
	},
	{
		id: 'platform-lab', title: 'Platform Lab: Terminal + Journal Workflow', day: 5, hour: 18, duration: 60,
		host: 'SI Host · Product Desk', track: 'platform',
		description: 'Build the exact TradingBible workflow: Terminal layout, alerts, journal tags and the weekly review.',
	},
	{
		id: 'company-room', title: 'Company Room: TBC, Investor & Product Brief', day: 6, hour: 12, duration: 60,
		host: 'SI Host · Company Desk', track: 'company',
		description: 'A factual company room: TBC status, investor disclosures, product lines and what is still proposed.',
	},
	{
		id: 'ai-research-lab', title: 'SI Lab: AI Research & Automation', day: 3, hour: 19, duration: 60,
		host: 'SI Host · Systems Desk', track: 'technology',
		description: 'Turn a market question into a testable research brief, then add human review and automation guardrails.',
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
