import { describe, expect, it } from 'vitest';
import {
  getHandles,
  hitTestDrawing,
  hitTestDrawings,
  pointInEllipse,
  rayEnd,
  resizeDrawing,
  translateDrawing,
} from './geometry';

function mockProjection() {
  const chart = {
    paneSize: () => ({ width: 400, height: 300 }),
    timeScale: () => ({
      timeToCoordinate: (time) => (Number(time) - 1) * 100,
    }),
  };
  const series = {
    priceToCoordinate: (price) => 300 - (Number(price) - 100) * 2,
  };
  return { chart, series };
}

const trend = {
  id: 'trend-1',
  type: 'trend',
  points: [{ time: 1, price: 100 }, { time: 3, price: 110 }],
};

const rect = {
  id: 'rect-1',
  type: 'rect',
  points: [{ time: 1, price: 100 }, { time: 3, price: 110 }],
};

describe('drawing geometry', () => {
  it('translates a trend line on both axes', () => {
    const moved = translateDrawing(trend, 2, 5);
    expect(moved.points).toEqual([{ time: 3, price: 105 }, { time: 5, price: 115 }]);
  });

  it('only moves the price of a horizontal line', () => {
    const moved = translateDrawing({ ...trend, type: 'hline' }, 2, 5);
    expect(moved.points[0].time).toBe(1);
    expect(moved.points[0].price).toBe(105);
  });

  it('only moves the time of a vertical line', () => {
    const moved = translateDrawing({ ...trend, type: 'vline' }, 2, 5);
    expect(moved.points[0].time).toBe(3);
    expect(moved.points[0].price).toBe(100);
  });

  it('resizes a rectangle corner without collapsing the opposite corner', () => {
    const resized = resizeDrawing(rect, { xPoint: 1, yPoint: 0 }, { time: 4, price: 90 });
    expect(resized.points[0]).toEqual({ time: 1, price: 90 });
    expect(resized.points[1]).toEqual({ time: 4, price: 110 });
  });

  it('exposes eight resize handles for rectangles', () => {
    const { chart, series } = mockProjection();
    const screen = {
      points: rect.points.map((point) => ({
        x: chart.timeScale().timeToCoordinate(point.time),
        y: series.priceToCoordinate(point.price),
      })),
      width: 400,
      height: 300,
    };
    const handles = getHandles(rect, screen);
    expect(handles).toHaveLength(8);
    expect(handles.map((handle) => handle.cursor)).toEqual([
      'nwse-resize', 'nesw-resize', 'nwse-resize', 'nesw-resize',
      'ew-resize', 'ew-resize', 'ns-resize', 'ns-resize',
    ]);
  });

  it('resizes one edge without moving the opposite edge', () => {
    const resized = resizeDrawing(rect, { xPoint: 0 }, { time: 0, price: 50 });
    expect(resized.points[0]).toEqual({ time: 0, price: 100 });
    expect(resized.points[1]).toEqual({ time: 3, price: 110 });
  });

  it('hits a trend line body and endpoint handle', () => {
    const { chart, series } = mockProjection();
    const screen = {
      points: trend.points.map((point) => ({
        x: chart.timeScale().timeToCoordinate(point.time),
        y: series.priceToCoordinate(point.price),
      })),
      width: 400,
      height: 300,
    };
    const body = hitTestDrawing(trend, screen, { x: 100, y: 290 });
    expect(body?.part).toBe('body');
    const handle = hitTestDrawing(trend, screen, { x: 200, y: 280 });
    expect(handle?.part).toBe('handle');
    expect(handle?.handle.pointIndex).toBe(1);
  });

  it('prefers the topmost drawing when objects overlap', () => {
    const { chart, series } = mockProjection();
    const first = { ...trend, id: 'first' };
    const second = { ...trend, id: 'second' };
    const hit = hitTestDrawings([first, second], chart, series, { x: 100, y: 290 });
    expect(hit?.drawingId).toBe('second');
  });

  it('extends rays to the pane edge', () => {
    expect(rayEnd({ x: 100, y: 100 }, { x: 200, y: 100 }, 400, 300)).toEqual({ x: 400, y: 100 });
  });

  it('detects points inside an ellipse', () => {
    expect(pointInEllipse({ x: 50, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 })).toBe(true);
    expect(pointInEllipse({ x: 120, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 })).toBe(false);
  });
});
