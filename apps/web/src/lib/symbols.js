// Tradable symbols grouped by market, used across the charting surfaces.
export const SYMBOL_GROUPS = [
  {
    label: 'Crypto',
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin' }, { symbol: 'ETHUSD', name: 'Ethereum' },
      { symbol: 'SOLUSD', name: 'Solana' }, { symbol: 'BNBUSD', name: 'BNB' },
      { symbol: 'XRPUSD', name: 'XRP' }, { symbol: 'ADAUSD', name: 'Cardano' },
      { symbol: 'DOGEUSD', name: 'Dogecoin' }, { symbol: 'AVAXUSD', name: 'Avalanche' },
    ],
  },
  {
    label: 'Forex',
    symbols: [
      { symbol: 'EURUSD', name: 'Euro / USD' }, { symbol: 'GBPUSD', name: 'GBP / USD' },
      { symbol: 'USDJPY', name: 'USD / JPY' }, { symbol: 'GBPJPY', name: 'GBP / JPY' },
      { symbol: 'AUDUSD', name: 'AUD / USD' }, { symbol: 'USDCAD', name: 'USD / CAD' },
      { symbol: 'USDCHF', name: 'USD / CHF' }, { symbol: 'NZDUSD', name: 'NZD / USD' },
    ],
  },
  {
    label: 'Commodities',
    symbols: [
      { symbol: 'XAUUSD', name: 'Gold' }, { symbol: 'XAGUSD', name: 'Silver' },
      { symbol: 'WTIUSD', name: 'Crude Oil WTI' }, { symbol: 'NATGAS', name: 'Natural Gas' },
      { symbol: 'COPPER', name: 'Copper' },
    ],
  },
  {
    label: 'Indices',
    symbols: [
      { symbol: 'NQ', name: 'Nasdaq 100' }, { symbol: 'ES', name: 'S&P 500' },
      { symbol: 'DJI', name: 'Dow Jones' },
    ],
  },
  {
    label: 'Stocks',
    symbols: [
      { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Alphabet' }, { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'META', name: 'Meta' },
      { symbol: 'NVDA', name: 'NVIDIA' },
    ],
  },
];

export const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap((g) => g.symbols);
