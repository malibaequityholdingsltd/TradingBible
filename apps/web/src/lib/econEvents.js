// Deterministic economic calendar generator. Produces a stable set of major
// macro events spread across a date window, seeded so results are consistent
// between renders but realistic in distribution.

const INDICATORS = [
  { name: 'Non-Farm Payrolls', code: 'NFP', country: 'US', currency: 'USD', importance: 'high', unit: 'K', affects: ['EURUSD', 'GBPUSD', 'XAUUSD', 'NQ', 'ES'] },
  { name: 'CPI (YoY)', code: 'CPI', country: 'US', currency: 'USD', importance: 'high', unit: '%', affects: ['EURUSD', 'XAUUSD', 'BTCUSD', 'NQ'] },
  { name: 'Fed Interest Rate Decision', code: 'RATE', country: 'US', currency: 'USD', importance: 'high', unit: '%', affects: ['EURUSD', 'USDJPY', 'XAUUSD', 'NQ', 'ES'] },
  { name: 'GDP Growth Rate (QoQ)', code: 'GDP', country: 'US', currency: 'USD', importance: 'high', unit: '%', affects: ['ES', 'NQ', 'DJI'] },
  { name: 'Unemployment Rate', code: 'UNEMP', country: 'US', currency: 'USD', importance: 'medium', unit: '%', affects: ['EURUSD', 'NQ'] },
  { name: 'Retail Sales (MoM)', code: 'RETAIL', country: 'US', currency: 'USD', importance: 'medium', unit: '%', affects: ['ES', 'AAPL', 'AMZN'] },
  { name: 'Manufacturing PMI', code: 'MPMI', country: 'US', currency: 'USD', importance: 'medium', unit: '', affects: ['ES', 'WTIUSD'] },
  { name: 'Services PMI', code: 'SPMI', country: 'US', currency: 'USD', importance: 'medium', unit: '', affects: ['ES', 'NQ'] },
  { name: 'ECB Interest Rate Decision', code: 'ECB', country: 'EU', currency: 'EUR', importance: 'high', unit: '%', affects: ['EURUSD', 'EURJPY', 'EURGBP'] },
  { name: 'Eurozone CPI (YoY)', code: 'EUCPI', country: 'EU', currency: 'EUR', importance: 'high', unit: '%', affects: ['EURUSD', 'EURGBP'] },
  { name: 'BoE Interest Rate Decision', code: 'BOE', country: 'UK', currency: 'GBP', importance: 'high', unit: '%', affects: ['GBPUSD', 'GBPJPY', 'EURGBP'] },
  { name: 'UK CPI (YoY)', code: 'UKCPI', country: 'UK', currency: 'GBP', importance: 'medium', unit: '%', affects: ['GBPUSD', 'GBPJPY'] },
  { name: 'BoJ Interest Rate Decision', code: 'BOJ', country: 'JP', currency: 'JPY', importance: 'high', unit: '%', affects: ['USDJPY', 'GBPJPY', 'EURJPY'] },
  { name: 'China Manufacturing PMI', code: 'CNPMI', country: 'CN', currency: 'CNY', importance: 'medium', unit: '', affects: ['AUDUSD', 'COPPER', 'WTIUSD'] },
  { name: 'Crude Oil Inventories', code: 'OIL', country: 'US', currency: 'USD', importance: 'low', unit: 'M', affects: ['WTIUSD', 'BRENT'] },
  { name: 'Consumer Confidence', code: 'CONF', country: 'US', currency: 'USD', importance: 'low', unit: '', affects: ['ES', 'NQ'] },
  { name: 'Building Permits', code: 'PERMIT', country: 'US', currency: 'USD', importance: 'low', unit: 'M', affects: ['ES'] },
  { name: 'Trade Balance', code: 'TRADE', country: 'US', currency: 'USD', importance: 'low', unit: 'B', affects: ['USDJPY', 'EURUSD'] },
];

export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'EU', name: 'Eurozone', flag: '🇪🇺' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
];

export const FLAGS = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.flag]));

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate events across [startOffset, endOffset] days relative to now.
export function generateEvents({ startOffset = -7, endOffset = 21 } = {}) {
  const events = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  let id = 0;
  for (let day = startOffset; day <= endOffset; day++) {
    const rand = mulberry32((day + 1000) * 7919);
    const dayDate = new Date(base);
    dayDate.setDate(base.getDate() + day);
    const dow = dayDate.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const ind = INDICATORS[Math.floor(rand() * INDICATORS.length)];
      const hour = 8 + Math.floor(rand() * 8);
      const minute = rand() > 0.5 ? 30 : 0;
      const when = new Date(dayDate);
      when.setHours(hour, minute, 0, 0);
      const isPast = when.getTime() < Date.now();
      const forecast = +(rand() * (ind.unit === 'K' ? 250 : 6) + (ind.unit === '%' ? 0.1 : 1)).toFixed(ind.unit === '%' || ind.unit === '' ? 1 : 0);
      const previous = +(forecast * (0.85 + rand() * 0.3)).toFixed(ind.unit === '%' || ind.unit === '' ? 1 : 0);
      const actual = isPast ? +(forecast * (0.9 + rand() * 0.2)).toFixed(ind.unit === '%' || ind.unit === '' ? 1 : 0) : null;
      events.push({
        id: `ev-${id++}`,
        ...ind,
        time: when.toISOString(),
        forecast,
        previous,
        actual,
        released: isPast,
      });
    }
  }
  return events.sort((a, b) => new Date(a.time) - new Date(b.time));
}

export const IMPORTANCE_COLOR = {
  high: { dot: 'bg-red-500', text: 'text-red-400', ring: 'border-red-500/40', label: 'High' },
  medium: { dot: 'bg-orange-400', text: 'text-orange-300', ring: 'border-orange-400/40', label: 'Medium' },
  low: { dot: 'bg-yellow-400', text: 'text-yellow-300', ring: 'border-yellow-400/40', label: 'Low' },
};
