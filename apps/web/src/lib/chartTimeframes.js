// Chart timeframe catalogue and client-side aggregation.
//
// The market-data API serves a fixed set of base intervals. Professional
// charting needs more choices than that (2m, 10m, 45m, 6h, 3d…), so the web
// client fetches the nearest supported base interval and aggregates it.
// Aggregation is deliberately conservative: OHLC and volume are combined,
// never invented, and an unknown timeframe falls through to the API's own
// validation instead of being silently rewritten.

export const TIMEFRAME_GROUPS = [
  { label: 'Minutes', options: ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'] },
  { label: 'Hours', options: ['1h', '2h', '3h', '4h', '6h', '8h', '12h'] },
  { label: 'Days and longer', options: ['1d', '2d', '3d', '1w', '1M'] },
];

export const TIMEFRAMES = TIMEFRAME_GROUPS.flatMap((group) => group.options);

// Short list for compact toolbars and phone controls. The full list lives in
// the timeframe dropdown.
export const QUICK_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

const MINUTES = {
  '1m': 1,
  '2m': 2,
  '3m': 3,
  '5m': 5,
  '10m': 10,
  '15m': 15,
  '30m': 30,
  '45m': 45,
  '1h': 60,
  '2h': 120,
  '3h': 180,
  '4h': 240,
  '6h': 360,
  '8h': 480,
  '12h': 720,
  '1d': 1440,
  '2d': 2880,
  '3d': 4320,
  '1w': 10080,
  '1M': 43200,
};

// Base intervals supported by the API. Keep this in sync with
// apps/api/src/routes/candles.js VALID_INTERVALS.
export const BASE_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

export function timeframeMinutes(timeframe) {
  return MINUTES[timeframe] ?? null;
}

export function isKnownTimeframe(timeframe) {
  return timeframeMinutes(timeframe) != null;
}

// Pick the smallest supported base interval that can produce the requested
// timeframe by aggregation. Direct API intervals are used directly so history
// depth is not needlessly reduced.
export function baseTimeframeFor(timeframe) {
  if (BASE_TIMEFRAMES.includes(timeframe)) return timeframe;
  switch (timeframe) {
    case '2m':
    case '3m':
      return '1m';
    case '10m':
      return '5m';
    case '45m':
      return '15m';
    case '2h':
    case '3h':
    case '6h':
    case '8h':
    case '12h':
      return '1h';
    case '2d':
    case '3d':
      return '1d';
    default:
      return timeframe;
  }
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Aggregate ascending OHLCV candles into fixed-width buckets. The bucket
// timestamp is the start of the bucket, matching the convention used by the
// upstream providers. Returns the original array when no aggregation is
// needed, and [] for empty input.
export function aggregateCandles(candles, baseTimeframe, targetTimeframe) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  if (!baseTimeframe || !targetTimeframe || baseTimeframe === targetTimeframe) return candles;

  const baseMinutes = timeframeMinutes(baseTimeframe);
  const targetMinutes = timeframeMinutes(targetTimeframe);
  if (!baseMinutes || !targetMinutes || targetMinutes <= baseMinutes) return candles;

  const targetMs = targetMinutes * 60 * 1000;
  const sorted = [...candles].sort((a, b) => asNumber(a.time) - asNumber(b.time));
  const out = [];
  let bucket = null;

  for (const candle of sorted) {
    const rawTime = Number(candle.time);
    if (!Number.isFinite(rawTime)) continue;
    const time = rawTime;
    const bucketTime = Math.floor(time / targetMs) * targetMs;
    if (!bucket || bucketTime !== bucket.time) {
      if (bucket) out.push(bucket);
      bucket = {
        time: bucketTime,
        open: asNumber(candle.open),
        high: asNumber(candle.high),
        low: asNumber(candle.low),
        close: asNumber(candle.close),
        volume: asNumber(candle.volume),
      };
      continue;
    }
    bucket.high = Math.max(bucket.high, asNumber(candle.high));
    bucket.low = Math.min(bucket.low, asNumber(candle.low));
    bucket.close = asNumber(candle.close);
    bucket.volume += asNumber(candle.volume);
  }

  if (bucket) out.push(bucket);
  return out;
}

export default {
  TIMEFRAME_GROUPS,
  TIMEFRAMES,
  QUICK_TIMEFRAMES,
  BASE_TIMEFRAMES,
  timeframeMinutes,
  isKnownTimeframe,
  baseTimeframeFor,
  aggregateCandles,
};
