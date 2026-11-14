import { describe, expect, it } from 'vitest';
import {
  drawingToScreen,
  logicalToTime,
  pointToScreen,
  screenToPoint,
  timeToLogical,
} from './coordinates';

const candles = [
  { time: 1000000, open: 100, high: 105, low: 95, close: 102 },
  { time: 1300000, open: 102, high: 108, low: 99, close: 106 },
  { time: 1600000, open: 106, high: 110, low: 103, close: 108 },
];

function mockChart() {
  return {
    paneSize: () => ({ width: 400, height: 300 }),
    timeScale: () => ({
      // Only real bars have a time coordinate. This reproduces the live
      // lightweight-charts behaviour in right-offset whitespace.
      timeToCoordinate: (time) => {
        const index = candles.findIndex((candle) => Math.floor(candle.time / 1000) === Number(time));
        return index >= 0 ? index * 100 : null;
      },
      coordinateToLogical: (x) => Math.ceil(x / 100),
      logicalToCoordinate: (logical) => (Number.isInteger(Number(logical)) ? Number(logical) * 100 : 0),
      coordinateToTime: () => null,
    }),
  };
}

const series = {
  priceToCoordinate: (price) => 300 - (Number(price) - 100) * 2,
  coordinateToPrice: (y) => 100 + (300 - y) / 2,
};

describe('drawing coordinates', () => {
  it('maps real bar times to logical indices', () => {
    expect(timeToLogical(1000, candles, 5)).toBe(0);
    expect(timeToLogical(1300, candles, 5)).toBe(1);
    expect(timeToLogical(1450, candles, 5)).toBe(1.5);
    expect(timeToLogical(1750, candles, 5)).toBe(2.5);
  });

  it('maps logical indices back into chart time, including whitespace', () => {
    expect(logicalToTime(0, candles, 5)).toBe(1000);
    expect(logicalToTime(1.5, candles, 5)).toBe(1450);
    expect(logicalToTime(2.5, candles, 5)).toBe(1750);
    expect(logicalToTime(3, candles, 5)).toBe(1900);
  });

  it('reads a fractional point from whitespace instead of returning null', () => {
    const point = screenToPoint(mockChart(), series, 250, 200, {
      candles,
      timeframeMinutes: 5,
    });
    expect(point).toEqual({ time: 1750, price: 150, logical: 2.5 });
  });

  it('projects a whitespace point back to the same screen coordinate', () => {
    const screen = pointToScreen(mockChart(), series, { time: 1750, price: 150 }, {
      candles,
      timeframeMinutes: 5,
    });
    expect(screen).toEqual({ x: 250, y: 200 });
  });

  it('round-trips an exact bar timestamp', () => {
    const point = screenToPoint(mockChart(), series, 100, 200, {
      candles,
      timeframeMinutes: 5,
    });
    expect(point).toEqual({ time: 1300, price: 150, logical: 1 });
    expect(pointToScreen(mockChart(), series, point, { candles, timeframeMinutes: 5 }))
      .toEqual({ x: 100, y: 200 });
  });

  it('snaps to the nearest candle OHLC when magnet is on', () => {
    const point = screenToPoint(mockChart(), series, 120, 190, {
      candles,
      timeframeMinutes: 5,
      magnet: true,
    });
    expect(point.time).toBe(1300);
    expect(point.logical).toBe(1);
    expect([102, 108, 99, 106]).toContain(point.price);
  });

  it('projects all points of a drawing with one pane size', () => {
    const screen = drawingToScreen(mockChart(), series, {
      id: 'trend',
      type: 'trend',
      points: [{ time: 1000, price: 100 }, { time: 1750, price: 150 }],
    }, { candles, timeframeMinutes: 5 });
    expect(screen.points).toEqual([{ x: 0, y: 300 }, { x: 250, y: 200 }]);
    expect(screen.width).toBe(400);
    expect(screen.height).toBe(300);
  });
});
