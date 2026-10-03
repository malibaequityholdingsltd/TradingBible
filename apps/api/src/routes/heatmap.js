// Market heatmap data. Crypto cells pull live 24h stats from Binance; every
// other category is generated deterministically per (symbol, period) so cells
// stay coherent while the period selector changes the picture.

const CRYPTO = [
	['BTCUSD', 'BTCUSDT', 'Bitcoin'], ['ETHUSD', 'ETHUSDT', 'Ethereum'],
	['BNBUSD', 'BNBUSDT', 'BNB'], ['XRPUSD', 'XRPUSDT', 'XRP'],
	['SOLUSD', 'SOLUSDT', 'Solana'], ['ADAUSD', 'ADAUSDT', 'Cardano'],
	['DOGEUSD', 'DOGEUSDT', 'Dogecoin'], ['AVAXUSD', 'AVAXUSDT', 'Avalanche'],
	['DOTUSD', 'DOTUSDT', 'Polkadot'], ['LINKUSD', 'LINKUSDT', 'Chainlink'],
	['MATICUSD', 'MATICUSDT', 'Polygon'], ['LTCUSD', 'LTCUSDT', 'Litecoin'],
	['TRXUSD', 'TRXUSDT', 'TRON'], ['ATOMUSD', 'ATOMUSDT', 'Cosmos'],
	['UNIUSD', 'UNIUSDT', 'Uniswap'], ['NEARUSD', 'NEARUSDT', 'NEAR'],
	['APTUSD', 'APTUSDT', 'Aptos'], ['FILUSD', 'FILUSDT', 'Filecoin'],
	['ICPUSD', 'ICPUSDT', 'Internet Computer'], ['ETCUSD', 'ETCUSDT', 'Ethereum Classic'],
	['ARBUSD', 'ARBUSDT', 'Arbitrum'], ['OPUSD', 'OPUSDT', 'Optimism'],
	['SUIUSD', 'SUIUSDT', 'Sui'], ['SEIUSD', 'SEIUSDT', 'Sei'],
	['TIAUSD', 'TIAUSDT', 'Celestia'], ['ONDOUSD', 'ONDOUSDT', 'Ondo'],
	['INJUSD', 'INJUSDT', 'Injective'], ['STXUSD', 'STXUSDT', 'Stacks'],
	['IMXUSD', 'IMXUSDT', 'Immutable'], ['HBARUSD', 'HBARUSDT', 'Hedera'],
	['VETUSD', 'VETUSDT', 'VeChain'], ['ALGOUSD', 'ALGOUSDT', 'Algorand'],
	['QNTUSD', 'QNTUSDT', 'Quant'], ['GRTUSD', 'GRTUSDT', 'The Graph'],
	['THETAUSD', 'THETAUSDT', 'Theta'], ['EGLDUSD', 'EGLDUSDT', 'MultiversX'],
	['RUNEUSD', 'RUNEUSDT', 'THORChain'], ['KASUSD', 'KASUSDT', 'Kaspa'],
	['FETUSD', 'FETUSDT', 'Fetch.ai'], ['RENDERUSD', 'RENDERUSDT', 'Render'],
	['GALAUSD', 'GALAUSDT', 'Gala'], ['SANDUSD', 'SANDUSDT', 'Sandbox'],
	['MANAUSD', 'MANAUSDT', 'Decentraland'], ['AXSUSD', 'AXSUSDT', 'Axie Infinity'],
	['AAVEUSD', 'AAVEUSDT', 'Aave'], ['MKRUSD', 'MKRUSDT', 'Maker'],
	['LDOUSD', 'LDOUSDT', 'Lido'], ['ENAUSD', 'ENAUSDT', 'Ethena'],
	['PENDLEUSD', 'PENDLEUSDT', 'Pendle'], ['JUPUSD', 'JUPUSDT', 'Jupiter'],
	['PYTHUSD', 'PYTHUSDT', 'Pyth'], ['WLDUSD', 'WLDUSDT', 'Worldcoin'],
	['PEPEUSD', 'PEPEUSDT', 'Pepe'], ['SHIBUSD', 'SHIBUSDT', 'Shiba Inu'],
	['BONKUSD', 'BONKUSDT', 'Bonk'], ['WIFUSD', 'WIFUSDT', 'dogwifhat'],
	['FLOKIUSD', 'FLOKIUSDT', 'Floki'], ['JASMYUSD', 'JASMYUSDT', 'JasmyCoin'],
	['ORDIUSD', 'ORDIUSDT', 'Ordinals'], ['BLURUSD', 'BLURUSDT', 'Blur'],
];

const FOREX = [
	['EURUSD', 'Euro', 1.084], ['GBPUSD', 'British Pound', 1.271], ['USDJPY', 'US/Yen', 156.8],
	['USDCHF', 'US/Swiss', 0.902], ['AUDUSD', 'Aussie', 0.662], ['USDCAD', 'US/Canada', 1.368],
	['NZDUSD', 'Kiwi', 0.612], ['EURGBP', 'Euro/Pound', 0.853], ['EURJPY', 'Euro/Yen', 170.1],
	['GBPJPY', 'Pound/Yen', 191.4], ['AUDJPY', 'Aussie/Yen', 103.8], ['CHFJPY', 'Swiss/Yen', 173.9],
	['EURCHF', 'Euro/Swiss', 0.95], ['EURAUD', 'Euro/Aussie', 1.65], ['EURNZD', 'Euro/Kiwi', 1.78],
	['EURCAD', 'Euro/Canada', 1.49], ['EURSEK', 'Euro/Sweden', 11.8], ['EURNOK', 'Euro/Norway', 11.9],
	['EURZAR', 'Euro/Rand', 19.7], ['EURMXN', 'Euro/Peso', 22.2], ['GBPAUD', 'Pound/Aussie', 1.93],
	['GBPCAD', 'Pound/Canada', 1.74], ['GBPNZD', 'Pound/Kiwi', 2.08], ['GBPCHF', 'Pound/Swiss', 1.14],
	['GBPZAR', 'Pound/Rand', 23.6], ['AUDCAD', 'Aussie/Canada', 0.91], ['AUDNZD', 'Aussie/Kiwi', 1.09],
	['AUDCHF', 'Aussie/Swiss', 0.60], ['NZDCAD', 'Kiwi/Canada', 0.84], ['NZDCHF', 'Kiwi/Swiss', 0.55],
	['NZDJPY', 'Kiwi/Yen', 96.0], ['CADJPY', 'Canada/Yen', 114.5], ['CADCHF', 'Canada/Swiss', 0.66],
	['USDSGD', 'US/Singapore', 1.35], ['USDHKD', 'US/HK Dollar', 7.79], ['USDMXN', 'US/Peso', 20.5],
	['USDZAR', 'US/Rand', 18.2], ['USDTRY', 'US/Lira', 34.0], ['USDSEK', 'US/Sweden', 10.9],
	['USDNOK', 'US/Norway', 11.1],
];

const COMMODITY = [
	['XAUUSD', 'Gold', 2340], ['XAGUSD', 'Silver', 30.4], ['WTIUSD', 'Crude Oil WTI', 78.5],
	['BRENT', 'Brent Oil', 82.9], ['NATGAS', 'Natural Gas', 2.9], ['COPPER', 'Copper', 4.5],
	['PLATINUM', 'Platinum', 1010], ['PALLADIUM', 'Palladium', 985], ['WHEAT', 'Wheat', 592],
	['CORN', 'Corn', 445], ['SOYUSD', 'Soybeans', 1050], ['SUGARUSD', 'Sugar', 22.5],
	['COFFEEUSD', 'Coffee', 245], ['COCOAUSD', 'Cocoa', 7200], ['COTTONUSD', 'Cotton', 72],
	['ALUMUSD', 'Aluminum', 2450], ['ZINCUSD', 'Zinc', 2900], ['NICKELUSD', 'Nickel', 16000],
	['GASOLINEUSD', 'Gasoline', 2.1], ['HEATOILUSD', 'Heating Oil', 2.4],
];

const SECTOR = [
	['XLK', 'Technology'], ['XLF', 'Finance'], ['XLV', 'Healthcare'], ['XLE', 'Energy'],
	['XLY', 'Consumer'], ['XLI', 'Industrials'], ['XLB', 'Materials'], ['XLU', 'Utilities'],
	['XLRE', 'Real Estate'], ['XLC', 'Communication'],
	['XBI', 'Biotech'], ['XOP', 'Oil & Gas'], ['XHB', 'Homebuilders'], ['XRT', 'Retail'],
	['KRE', 'Regional Banks'], ['SMH', 'Semiconductors'], ['XME', 'Metals & Mining'],
	['XAR', 'Aerospace & Defense'], ['TAN', 'Solar'], ['JETS', 'Airlines'],
];

const STOCK = [
	['AAPL', 'Apple', 224.5], ['MSFT', 'Microsoft', 428], ['GOOGL', 'Alphabet', 178],
	['AMZN', 'Amazon', 186], ['TSLA', 'Tesla', 248], ['META', 'Meta', 512], ['NVDA', 'NVIDIA', 128],
	['JPM', 'JPMorgan', 205], ['V', 'Visa', 276], ['WMT', 'Walmart', 68], ['JNJ', 'J&J', 148],
	['PG', 'P&G', 168], ['MA', 'Mastercard', 458], ['HD', 'Home Depot', 348], ['XOM', 'Exxon', 112],
	['BAC', 'Bank of America', 40], ['KO', 'Coca-Cola', 63], ['PEP', 'PepsiCo', 168],
	['NFLX', 'Netflix', 678], ['ADBE', 'Adobe', 520], ['CRM', 'Salesforce', 258],
	['INTC', 'Intel', 31], ['AMD', 'AMD', 158], ['DIS', 'Disney', 98], ['ORCL', 'Oracle', 142],
	['CSCO', 'Cisco', 48], ['PFE', 'Pfizer', 28], ['NKE', 'Nike', 76], ['MCD', "McDonald's", 258],
	['T', 'AT&T', 19], ['VZ', 'Verizon', 40], ['ABBV', 'AbbVie', 178], ['CVX', 'Chevron', 156],
	['WFC', 'Wells Fargo', 60], ['MRK', 'Merck', 128], ['COST', 'Costco', 848], ['TMO', 'Thermo', 578],
	['ACN', 'Accenture', 328], ['DHR', 'Danaher', 248], ['LIN', 'Linde', 438], ['TXN', 'Texas Inst', 198],
	['QCOM', 'Qualcomm', 168], ['HON', 'Honeywell', 208], 	['UPS', 'UPS', 138], ['PM', 'Philip Morris', 102],
	['IBM', 'IBM', 178], ['GE', 'GE', 168], ['CAT', 'Caterpillar', 338], ['BA', 'Boeing', 178],
	['GS', 'Goldman Sachs', 458],
	['AVGO', 'Broadcom', 240], ['LLY', 'Eli Lilly', 770], ['UNH', 'UnitedHealth', 510],
	['AMAT', 'Applied Materials', 180], ['MU', 'Micron', 105], ['LRCX', 'Lam Research', 85],
	['KLAC', 'KLA', 700], ['ADI', 'Analog Devices', 220], ['PANW', 'Palo Alto', 380],
	['NOW', 'ServiceNow', 900], ['INTU', 'Intuit', 640], ['AMGN', 'Amgen', 270],
	['GILD', 'Gilead', 95], ['ISRG', 'Intuitive Surgical', 540], ['SYK', 'Stryker', 360],
	['BSX', 'Boston Scientific', 85], ['SHW', 'Sherwin-Williams', 350], ['APD', 'Air Products', 300],
	['NEE', 'NextEra', 80], ['DUK', 'Duke Energy', 115], ['AMT', 'American Tower', 230],
	['PLD', 'Prologis', 125], ['EQIX', 'Equinix', 800], ['MDLZ', 'Mondelez', 60],
	['CL', 'Colgate', 95], ['BKNG', 'Booking', 5200], ['RCL', 'Royal Caribbean', 240],
	['UAL', 'United Airlines', 85], ['DAL', 'Delta', 60], ['FDX', 'FedEx', 275],
	['UNP', 'Union Pacific', 250], ['CSX', 'CSX', 33], ['MMM', '3M', 135],
	["LOW", "Lowe's", 225], ['TJX', 'TJX', 120], ['F', 'Ford', 11], ['GM', 'General Motors', 55],
	['MO', 'Altria', 55], ['ADP', 'ADP', 290], ['MSI', 'Motorola', 440],
	['NOC', 'Northrop', 580], ['LMT', 'Lockheed', 600], ['RTX', 'RTX', 130],
	['D', 'Dominion', 60], ['EXC', 'Exelon', 40], ['WM', 'Waste Mgmt', 210],
	['EMR', 'Emerson', 115], ['ETN', 'Eaton', 340], ['AFL', 'Aflac', 110], ['PRU', 'Prudential', 115],
];

const PERIODS = ['1h', '4h', '1d', '1w', '1M', '1Y'];
const PERIOD_VOL = { '1h': 0.6, '4h': 1.4, '1d': 2.6, '1w': 5.5, '1M': 11, '1Y': 42 };

function mulberry32(seed) {
	let a = seed;
	return () => {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function seedStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; }

function synthCell(symbol, name, price, period) {
	const rand = mulberry32(seedStr(symbol + period));
	const spread = PERIOD_VOL[period];
	const changePercent = +(((rand() - 0.5) * 2) * spread).toFixed(2);
	const base = price || (rand() * 400 + 20);
	const changeAmount = +((base * changePercent) / 100).toFixed(2);
	// Deterministic pseudo-volume (separate stream so price/change stay stable).
	// Gives non-crypto bubbles meaningful relative sizes in Volume mode.
	const vrand = mulberry32(seedStr(symbol + period + ':vol'));
	const quoteVolume = Math.round(base * (2000 + vrand() * 800000));
	return { symbol, name, price: +base.toFixed(2), changePercent, changeAmount, volume: quoteVolume, quoteVolume };
}

async function cryptoLive(period) {
	const symbols = CRYPTO.map((c) => c[1]);
	const query = encodeURIComponent(JSON.stringify(symbols));
	// Real period-over-period changes via cached klines (1d comes straight
	// from the 24h ticker). Cache keeps the 15s poll cheap: one Binance
	// batch per TTL window instead of 60 klines requests per poll.
	const realChanges = period === '1d' ? null : await periodChanges(period).catch(() => null);
	try {
		const upstream = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${query}`);
		if (!upstream.ok) throw new Error('binance');
		const data = await upstream.json();
		const byId = Object.fromEntries(data.map((t) => [t.symbol, t]));
		const scale = PERIOD_VOL[period] / PERIOD_VOL['1d'];
		return CRYPTO.map(([disp, id, name]) => {
			const t = byId[id];
			if (!t) return synthCell(disp, name, 0, period);
			const price = Number(t.lastPrice);
			const real = realChanges?.get(id);
			const changePercent = +(real ?? Number(t.priceChangePercent) * scale).toFixed(2);
			const volume = Number(t.volume) || 0; // base-asset volume
			const quoteVolume = Number(t.quoteVolume) || 0; // USDT volume — bubble-size proxy
			return { symbol: disp, name, price: +price.toFixed(2), changePercent, changeAmount: +((price * changePercent) / 100).toFixed(2), volume, quoteVolume };
		});
	} catch {
		return CRYPTO.map(([disp, , name]) => synthCell(disp, name, 0, period));
	}
}

// Kline window per heatmap period: [interval, candles to compare first-open
// vs last-close]. Cache TTLs keep upstream load negligible.
const PERIOD_KLINES = {
	'1h': ['1h', 3, 60e3], '4h': ['4h', 3, 5 * 60e3],
	'1w': ['1d', 8, 15 * 60e3], '1M': ['1d', 31, 60 * 60e3], '1Y': ['1w', 53, 6 * 60 * 60e3],
};
const periodCache = new Map(); // period -> { ts, changes: Map<binId, pct> }

async function periodChanges(period) {
	const spec = PERIOD_KLINES[period];
	if (!spec) return null;
	const [interval, limit, ttl] = spec;
	const hit = periodCache.get(period);
	if (hit && Date.now() - hit.ts < ttl) return hit.changes;
	const ids = CRYPTO.map((c) => c[1]);
	const results = await Promise.allSettled(ids.map(async (id) => {
		const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${id}&interval=${interval}&limit=${limit}`);
		if (!res.ok) throw new Error('klines');
		const rows = await res.json();
		if (!Array.isArray(rows) || rows.length < 2) throw new Error('klines-short');
		const first = Number(rows[0][1]); const last = Number(rows[rows.length - 1][4]);
		if (!first) throw new Error('klines-zero');
		return [id, +(((last - first) / first) * 100).toFixed(2)];
	}));
	const changes = new Map();
	for (const r of results) if (r.status === 'fulfilled') changes.set(r.value[0], r.value[1]);
	if (!changes.size) throw new Error('klines-empty');
	periodCache.set(period, { ts: Date.now(), changes });
	return changes;
}

export default async (req, res) => {
	const type = String(req.query.type || 'crypto').toLowerCase();
	const period = PERIODS.includes(String(req.query.period)) ? String(req.query.period) : '1d';

	let cells;
	switch (type) {
		case 'crypto': cells = await cryptoLive(period); break;
		case 'forex': cells = FOREX.map(([s, n, p]) => synthCell(s, n, p, period)); break;
		case 'commodity': cells = COMMODITY.map(([s, n, p]) => synthCell(s, n, p, period)); break;
		case 'sector': cells = SECTOR.map(([s, n]) => synthCell(s, n, 0, period)); break;
		case 'stock': cells = STOCK.map(([s, n, p]) => synthCell(s, n, p, period)); break;
		default:
			return res.status(422).json({ error: 'type must be crypto, forex, commodity, sector or stock' });
	}

	res.json({ type, period, cells });
};
