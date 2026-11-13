import { describe, expect, it } from 'vitest';
import {
  aggregateCandles,
  baseTimeframeFor,
  timeframeMinutes,
} from './chartTimeframes';

const candle = (time, open, high, low, close, volume) => ({ time, open, high, low, close, volume });

describe('chartTimeframes', () => {
  it('distinguishes minute and month identifiers', () => {
    expect(timeframeMinutes('1m')).toBe(1);
    expect(timeframeMinutes('1M')).toBe(43200);
  });

  it('maps custom intervals to the nearest supported base interval', () => {
    expect(baseTimeframeFor('2m')).toBe('1m');
    expect(baseTimeframeFor('10m')).toBe('5m');
    expect(baseTimeframeFor('45m')).toBe('15m');
    expect(baseTimeframeFor('6h')).toBe('1h');
    expect(baseTimeframeFor('3d')).toBe('1d');
    expect(baseTimeframeFor('1w')).toBe('1w');
    expect(baseTimeframeFor('1M')).toBe('1M');
  });

  it('returns the original array when no aggregation is needed', () => {
    const candles = [candle(0, 1, 2, 0.5, 1.5, 10)];
    expect(aggregateCandles(candles, '5m', '5m')).toBe(candles);
    expect(aggregateCandles([], '5m', '15m')).toEqual([]);
  });

  it('aggregates three five-minute candles into one fifteen-minute candle', () => {
    const candles = [
      candle(0, 100, 103, 99, 102, 10),
      candle(300_000, 102, 105, 101, 104, 20),
      candle(600_000, 104, 106, 100, 101, 30),
    ];
    expect(aggregateCandles(candles, '5m', '15m')).toEqual([
      candle(0, 100, 106, 99, 101, 60),
    ]);
  });

  it('starts a new bucket when the boundary is crossed', () => {
    const candles = [
      candle(0, 10, 11, 9, 10.5, 1),
      candle(900_000, 10.5, 12, 10, 11.5, 2),
      candle(1_800_000, 11.5, 13, 11, 12.5, 3),
    ];
    expect(aggregateCandles(candles, '15m', '30m')).toEqual([
      candle(0, 10, 12, 9, 11.5, 3),
      candle(1_800_000, 11.5, 13, 11, 12.5, 3),
    ]);
  });

  it('sorts unordered input before aggregating', () => {
    const candles = [
      candle(600_000, 104, 106, 100, 101, 30),
      candle(0, 100, 103, 99, 102, 10),
      candle(300_000, 102, 105, 101, 104, 20),
    ];
    expect(aggregateCandles(candles, '5m', '15m')[0].open).toBe(100);
    expect(aggregateCandles(candles, '5m', '15m')[0].close).toBe(101);
  });
});
