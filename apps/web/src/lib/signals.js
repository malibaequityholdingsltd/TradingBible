// Trading-signal engine. Takes an array of OHLC candles and derives a
// composite Buy/Sell signal from a blend of technical studies: RSI, MACD,
// Bollinger Bands, moving-average crossovers, price-action breakouts and
// volume spikes. Returns a structured verdict the UI can render on charts.
import { rsi, macd, bollinger, sma, ema } from '@/lib/indicators';

const lastNonNull = (arr) => {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
};

// Each rule contributes a score in [-2, 2] (bearish → bullish) plus a reason.
export function analyzeSignal(candles) {
  if (!candles || candles.length < 40) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const rules = [];
  let score = 0;
  let weight = 0;

  // RSI overbought / oversold
  const r = lastNonNull(rsi(candles, 14));
  if (r != null) {
    weight += 2;
    if (r <= 30) { score += 2; rules.push({ label: 'RSI oversold', detail: `RSI ${r.toFixed(1)} < 30`, dir: 'bull' }); }
    else if (r <= 45) { score += 1; rules.push({ label: 'RSI recovering', detail: `RSI ${r.toFixed(1)}`, dir: 'bull' }); }
    else if (r >= 70) { score -= 2; rules.push({ label: 'RSI overbought', detail: `RSI ${r.toFixed(1)} > 70`, dir: 'bear' }); }
    else if (r >= 55) { score -= 1; rules.push({ label: 'RSI elevated', detail: `RSI ${r.toFixed(1)}`, dir: 'bear' }); }
    else rules.push({ label: 'RSI neutral', detail: `RSI ${r.toFixed(1)}`, dir: 'neutral' });
  }

  // MACD crossover
  const m = macd(candles, 12, 26, 9);
  const mL = m.macdLine[m.macdLine.length - 1];
  const sL = m.signalLine[m.signalLine.length - 1];
  const mLp = m.macdLine[m.macdLine.length - 2];
  const sLp = m.signalLine[m.signalLine.length - 2];
  if (mL != null && sL != null && mLp != null && sLp != null) {
    weight += 2;
    const crossUp = mLp <= sLp && mL > sL;
    const crossDn = mLp >= sLp && mL < sL;
    if (crossUp) { score += 2; rules.push({ label: 'MACD bullish cross', detail: 'MACD crossed above signal', dir: 'bull' }); }
    else if (crossDn) { score -= 2; rules.push({ label: 'MACD bearish cross', detail: 'MACD crossed below signal', dir: 'bear' }); }
    else if (mL > sL) { score += 1; rules.push({ label: 'MACD above signal', detail: 'Bullish momentum', dir: 'bull' }); }
    else { score -= 1; rules.push({ label: 'MACD below signal', detail: 'Bearish momentum', dir: 'bear' }); }
  }

  // Bollinger breakout
  const b = bollinger(candles, 20, 2);
  const up = lastNonNull(b.upper), lo = lastNonNull(b.lower);
  if (up != null && lo != null) {
    weight += 1;
    if (price >= up) { score -= 1; rules.push({ label: 'Upper band tag', detail: 'Price at Bollinger upper band', dir: 'bear' }); }
    else if (price <= lo) { score += 1; rules.push({ label: 'Lower band tag', detail: 'Price at Bollinger lower band', dir: 'bull' }); }
  }

  // MA crossover (EMA21 vs SMA50)
  const e21 = lastNonNull(ema(candles, 21));
  const s50 = lastNonNull(sma(candles, 50));
  if (e21 != null && s50 != null) {
    weight += 2;
    if (e21 > s50) { score += 1.5; rules.push({ label: 'Golden trend', detail: 'EMA21 above SMA50', dir: 'bull' }); }
    else { score -= 1.5; rules.push({ label: 'Death trend', detail: 'EMA21 below SMA50', dir: 'bear' }); }
  }

  // Price-action breakout over last 20 candles
  const window = candles.slice(-21, -1);
  const hi = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  weight += 1;
  if (price > hi) { score += 1.5; rules.push({ label: 'Resistance break', detail: '20-bar high breakout', dir: 'bull' }); }
  else if (price < low) { score -= 1.5; rules.push({ label: 'Support break', detail: '20-bar low breakdown', dir: 'bear' }); }

  // Volume spike
  const vols = candles.map((c) => c.volume || 0);
  const avgVol = vols.slice(-21, -1).reduce((a, x) => a + x, 0) / 20;
  const lastVol = vols[vols.length - 1];
  if (avgVol > 0 && lastVol > avgVol * 1.8) {
    weight += 1;
    const dir = closes[closes.length - 1] >= closes[closes.length - 2] ? 1 : -1;
    score += dir * 1; rules.push({ label: 'Volume spike', detail: `${(lastVol / avgVol).toFixed(1)}x average volume`, dir: dir > 0 ? 'bull' : 'bear' });
  }

  const norm = weight ? score / weight : 0; // roughly -2..2
  let signalType, strength;
  if (norm >= 0.9) signalType = 'strong_buy';
  else if (norm >= 0.3) signalType = 'buy';
  else if (norm <= -0.9) signalType = 'strong_sell';
  else if (norm <= -0.3) signalType = 'sell';
  else signalType = 'hold';

  const mag = Math.abs(norm);
  if (mag >= 0.9) strength = 'strong';
  else if (mag >= 0.45) strength = 'moderate';
  else strength = 'weak';

  const agree = rules.filter((x) => x.dir !== 'neutral');
  const bull = agree.filter((x) => x.dir === 'bull').length;
  const bear = agree.filter((x) => x.dir === 'bear').length;
  const consensus = agree.length ? Math.max(bull, bear) / agree.length : 0;
  const confidence = consensus >= 0.75 ? 'high' : consensus >= 0.55 ? 'medium' : 'low';

  return {
    signalType, strength, confidence,
    score: +norm.toFixed(2),
    price,
    rsi: r != null ? +r.toFixed(1) : null,
    reasons: rules,
    reason: rules.filter((x) => x.dir !== 'neutral').slice(0, 3).map((x) => x.label).join(' · ') || 'Mixed conditions',
  };
}

export const SIGNAL_META = {
  strong_buy: { label: 'Strong Buy', color: '#22c55e', bg: 'rgba(34,197,94,0.14)' },
  buy: { label: 'Buy', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  hold: { label: 'Neutral', color: '#d4af37', bg: 'rgba(212,175,55,0.12)' },
  sell: { label: 'Sell', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  strong_sell: { label: 'Strong Sell', color: '#ef4444', bg: 'rgba(239,68,68,0.14)' },
};
