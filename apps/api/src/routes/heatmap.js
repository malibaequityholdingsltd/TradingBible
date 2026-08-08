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
];

const FOREX = [
	['EURUSD', 'Euro', 1.084], ['GBPUSD', 'British Pound', 1.271], ['USDJPY', 'US/Yen', 156.8],
	['USDCHF', 'US/Swiss', 0.902], ['AUDUSD', 'Aussie', 0.662], ['USDCAD', 'US/Canada', 1.368],
	['NZDUSD', 'Kiwi', 0.612], ['EURGBP', 'Euro/Pound', 0.853], ['EURJPY', 'Euro/Yen', 170.1],
	['GBPJPY', 'Pound/Yen', 191.4], ['AUDJPY', 'Aussie/Yen', 103.8], ['CHFJPY', 'Swiss/Yen', 173.9],
];

const COMMODITY = [
	['XAUUSD', 'Gold', 2340], ['XAGUSD', 'Silver', 30.4], ['WTIUSD', 'Crude Oil WTI', 78.5],
	['BRENT', 'Brent Oil', 82.9], ['NATGAS', 'Natural Gas', 2.9], ['COPPER', 'Copper', 4.5],
	['PLATINUM', 'Platinum', 1010], ['PALLADIUM', 'Palladium', 985], ['WHEAT', 'Wheat', 592],
	['CORN', 'Corn', 445],
];

const SECTOR = [
	['XLK', 'Technology'], ['XLF', 'Finance'], ['XLV', 'Healthcare'], ['XLE', 'Energy'],
	['XLY', 'Consumer'], ['XLI', 'Industrials'], ['XLB', 'Materials'], ['XLU', 'Utilities'],
	['XLRE', 'Real Estate'], ['XLC', 'Communication'],
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
	['QCOM', 'Qualcomm', 168], ['HON', 'Honeywell', 208], ['UPS', 'UPS', 138], ['PM', 'Philip Morris', 102],
	['IBM', 'IBM', 178], ['GE', 'GE', 168], ['CAT', 'Caterpillar', 338], ['BA', 'Boeing', 178],
	['GS', 'Goldman Sachs', 458],
];

const PERIODS = ['1h', '4h', '1d', '1w', '1M'];
const PERIOD_VOL = { '1h': 0.6, '4h': 1.4, '1d': 2.6, '1w': 5.5, '1M': 11 };

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
	return { symbol, name, price: +base.toFixed(2), changePercent, changeAmount };
}

async function cryptoLive(period) {
	const symbols = CRYPTO.map((c) => c[1]);
	const query = encodeURIComponent(JSON.stringify(symbols));
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
			const changePercent = +(Number(t.priceChangePercent) * scale).toFixed(2);
			return { symbol: disp, name, price: +price.toFixed(2), changePercent, changeAmount: +((price * changePercent) / 100).toFixed(2) };
		});
	} catch {
		return CRYPTO.map(([disp, , name]) => synthCell(disp, name, 0, period));
	}
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
