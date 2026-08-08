// Technical indicator math. Every function takes an array of candle objects
// { time, open, high, low, close, volume } and returns arrays aligned to the
// candles (null for warm-up periods that lack enough data).

const closes = (c) => c.map((x) => x.close);

export function sma(candles, period = 20) {
  const src = closes(candles);
  const out = new Array(src.length).fill(null);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= period) sum -= src[i - period];
    if (i >= period - 1) out[i] = +(sum / period).toFixed(4);
  }
  return out;
}

export function ema(candles, period = 20) {
  const src = closes(candles);
  const out = new Array(src.length).fill(null);
  const k = 2 / (period + 1);
  let prev;
  for (let i = 0; i < src.length; i++) {
    if (i < period - 1) continue;
    if (prev === undefined) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += src[j];
      prev = sum / period;
    } else {
      prev = src[i] * k + prev * (1 - k);
    }
    out[i] = +prev.toFixed(4);
  }
  return out;
}

export function wma(candles, period = 20) {
  const src = closes(candles);
  const out = new Array(src.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < src.length; i++) {
    let s = 0;
    for (let j = 0; j < period; j++) s += src[i - j] * (period - j);
    out[i] = +(s / denom).toFixed(4);
  }
  return out;
}

export function rsi(candles, period = 14) {
  const src = closes(candles);
  const out = new Array(src.length).fill(null);
  let gain = 0, loss = 0;
  for (let i = 1; i < src.length; i++) {
    const diff = src[i] - src[i - 1];
    const up = Math.max(diff, 0), dn = Math.max(-diff, 0);
    if (i <= period) {
      gain += up; loss += dn;
      if (i === period) {
        gain /= period; loss /= period;
        out[i] = +(100 - 100 / (1 + gain / (loss || 1e-9))).toFixed(2);
      }
    } else {
      gain = (gain * (period - 1) + up) / period;
      loss = (loss * (period - 1) + dn) / period;
      out[i] = +(100 - 100 / (1 + gain / (loss || 1e-9))).toFixed(2);
    }
  }
  return out;
}

function emaFromValues(vals, period) {
  const out = new Array(vals.length).fill(null);
  const k = 2 / (period + 1);
  let prev;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] == null) continue;
    prev = prev === undefined ? vals[i] : vals[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function macd(candles, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(candles, fast);
  const emaSlow = ema(candles, slow);
  const macdLine = emaFast.map((v, i) => (v != null && emaSlow[i] != null ? +(v - emaSlow[i]).toFixed(4) : null));
  const signalLine = emaFromValues(macdLine, signal).map((v) => (v != null ? +v.toFixed(4) : null));
  const hist = macdLine.map((v, i) => (v != null && signalLine[i] != null ? +(v - signalLine[i]).toFixed(4) : null));
  return { macdLine, signalLine, hist };
}

export function stochastic(candles, period = 14, smooth = 3) {
  const kRaw = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    kRaw[i] = hi === lo ? 50 : +(((candles[i].close - lo) / (hi - lo)) * 100).toFixed(2);
  }
  const k = new Array(candles.length).fill(null);
  for (let i = 0; i < kRaw.length; i++) {
    if (kRaw[i] == null) continue;
    const slice = kRaw.slice(Math.max(0, i - smooth + 1), i + 1).filter((v) => v != null);
    k[i] = +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  }
  const d = new Array(candles.length).fill(null);
  for (let i = 0; i < k.length; i++) {
    if (k[i] == null) continue;
    const slice = k.slice(Math.max(0, i - smooth + 1), i + 1).filter((v) => v != null);
    d[i] = +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  }
  return { k, d };
}

export function bollinger(candles, period = 20, mult = 2) {
  const mid = sma(candles, period);
  const src = closes(candles);
  const upper = new Array(src.length).fill(null);
  const lower = new Array(src.length).fill(null);
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (src[j] - mid[i]) ** 2;
    const sd = Math.sqrt(sum / period);
    upper[i] = +(mid[i] + mult * sd).toFixed(4);
    lower[i] = +(mid[i] - mult * sd).toFixed(4);
  }
  return { mid, upper, lower };
}

export function stddev(candles, period = 20) {
  const mid = sma(candles, period);
  const src = closes(candles);
  const out = new Array(src.length).fill(null);
  for (let i = period - 1; i < src.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (src[j] - mid[i]) ** 2;
    out[i] = +Math.sqrt(sum / period).toFixed(4);
  }
  return out;
}

function trueRanges(candles) {
  const tr = new Array(candles.length).fill(null);
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return tr;
}

export function atr(candles, period = 14) {
  const tr = trueRanges(candles);
  const out = new Array(candles.length).fill(null);
  let prev;
  for (let i = 1; i < candles.length; i++) {
    if (i < period) continue;
    if (prev === undefined) {
      let sum = 0;
      for (let j = 1; j <= period; j++) sum += tr[j];
      prev = sum / period;
    } else {
      prev = (prev * (period - 1) + tr[i]) / period;
    }
    out[i] = +prev.toFixed(4);
  }
  return out;
}

export function adx(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  const plusDM = new Array(candles.length).fill(0);
  const minusDM = new Array(candles.length).fill(0);
  const tr = trueRanges(candles);
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const dn = candles[i - 1].low - candles[i].low;
    plusDM[i] = up > dn && up > 0 ? up : 0;
    minusDM[i] = dn > up && dn > 0 ? dn : 0;
  }
  let atrS, plusS, minusS, adxPrev;
  const dxs = [];
  for (let i = 1; i < candles.length; i++) {
    if (i < period) continue;
    if (atrS === undefined) {
      atrS = 0; plusS = 0; minusS = 0;
      for (let j = 1; j <= period; j++) { atrS += tr[j]; plusS += plusDM[j]; minusS += minusDM[j]; }
    } else {
      atrS = atrS - atrS / period + tr[i];
      plusS = plusS - plusS / period + plusDM[i];
      minusS = minusS - minusS / period + minusDM[i];
    }
    const pDI = (plusS / atrS) * 100;
    const mDI = (minusS / atrS) * 100;
    const dx = (Math.abs(pDI - mDI) / (pDI + mDI || 1e-9)) * 100;
    dxs.push(dx);
    if (dxs.length === period) {
      adxPrev = dxs.reduce((a, b) => a + b, 0) / period;
      out[i] = +adxPrev.toFixed(2);
    } else if (dxs.length > period) {
      adxPrev = (adxPrev * (period - 1) + dx) / period;
      out[i] = +adxPrev.toFixed(2);
    }
  }
  return out;
}

export function ichimoku(candles) {
  const hl = (p, i) => {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - p + 1; j <= i; j++) { if (j < 0) return null; hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    return (hi + lo) / 2;
  };
  const tenkan = candles.map((_, i) => (i >= 8 ? +hl(9, i).toFixed(4) : null));
  const kijun = candles.map((_, i) => (i >= 25 ? +hl(26, i).toFixed(4) : null));
  const spanA = candles.map((_, i) => (tenkan[i] != null && kijun[i] != null ? +((tenkan[i] + kijun[i]) / 2).toFixed(4) : null));
  const spanB = candles.map((_, i) => (i >= 51 ? +hl(52, i).toFixed(4) : null));
  return { tenkan, kijun, spanA, spanB };
}

export function obv(candles) {
  const out = new Array(candles.length).fill(null);
  let v = 0;
  out[0] = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) v += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) v -= candles[i].volume;
    out[i] = +v.toFixed(2);
  }
  return out;
}

export function vroc(candles, period = 12) {
  const out = new Array(candles.length).fill(null);
  for (let i = period; i < candles.length; i++) {
    const prev = candles[i - period].volume || 1e-9;
    out[i] = +(((candles[i].volume - prev) / prev) * 100).toFixed(2);
  }
  return out;
}

// Registry describing every indicator: how it renders and its default params.
export const INDICATOR_DEFS = {
  sma: { label: 'SMA', pane: 'price', kind: 'line', defaults: { period: 20 }, color: '#d4af37', compute: (c, p) => ({ SMA: sma(c, p.period) }) },
  ema: { label: 'EMA', pane: 'price', kind: 'line', defaults: { period: 20 }, color: '#60a5fa', compute: (c, p) => ({ EMA: ema(c, p.period) }) },
  wma: { label: 'WMA', pane: 'price', kind: 'line', defaults: { period: 20 }, color: '#a78bfa', compute: (c, p) => ({ WMA: wma(c, p.period) }) },
  bollinger: { label: 'Bollinger Bands', pane: 'price', kind: 'bands', defaults: { period: 20, mult: 2 }, color: '#34d399', compute: (c, p) => { const b = bollinger(c, p.period, p.mult); return { BB_upper: b.upper, BB_mid: b.mid, BB_lower: b.lower }; } },
  ichimoku: { label: 'Ichimoku Cloud', pane: 'price', kind: 'ichimoku', defaults: {}, color: '#f472b6', compute: (c) => { const k = ichimoku(c); return { ICH_tenkan: k.tenkan, ICH_kijun: k.kijun, ICH_spanA: k.spanA, ICH_spanB: k.spanB }; } },
  rsi: { label: 'RSI', pane: 'sub', kind: 'osc', range: [0, 100], levels: [30, 70], defaults: { period: 14 }, color: '#d4af37', compute: (c, p) => ({ RSI: rsi(c, p.period) }) },
  macd: { label: 'MACD', pane: 'sub', kind: 'macd', defaults: { fast: 12, slow: 26, signal: 9 }, color: '#60a5fa', compute: (c, p) => { const m = macd(c, p.fast, p.slow, p.signal); return { MACD: m.macdLine, MACD_signal: m.signalLine, MACD_hist: m.hist }; } },
  stochastic: { label: 'Stochastic', pane: 'sub', kind: 'osc', range: [0, 100], levels: [20, 80], defaults: { period: 14, smooth: 3 }, color: '#34d399', compute: (c, p) => { const s = stochastic(c, p.period, p.smooth); return { STOCH_k: s.k, STOCH_d: s.d }; } },
  atr: { label: 'ATR', pane: 'sub', kind: 'osc', defaults: { period: 14 }, color: '#f59e0b', compute: (c, p) => ({ ATR: atr(c, p.period) }) },
  stddev: { label: 'Std Deviation', pane: 'sub', kind: 'osc', defaults: { period: 20 }, color: '#a78bfa', compute: (c, p) => ({ STDDEV: stddev(c, p.period) }) },
  adx: { label: 'ADX', pane: 'sub', kind: 'osc', range: [0, 100], levels: [25], defaults: { period: 14 }, color: '#f472b6', compute: (c, p) => ({ ADX: adx(c, p.period) }) },
  obv: { label: 'OBV', pane: 'sub', kind: 'osc', defaults: {}, color: '#60a5fa', compute: (c) => ({ OBV: obv(c) }) },
  vroc: { label: 'Volume ROC', pane: 'sub', kind: 'osc', defaults: { period: 12 }, color: '#34d399', compute: (c, p) => ({ VROC: vroc(c, p.period) }) },
};
