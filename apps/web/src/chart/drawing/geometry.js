/**
 * Pure geometry for chart drawings.
 *
 * Everything here works in pane-relative media pixels. The caller supplies
 * the current screen projection so hit testing and editing never depend on
 * React state or stale DOM measurements.
 */

import { drawingToScreen } from './coordinates';

export const HIT_TOLERANCE = 7;
export const HANDLE_HIT_RADIUS = 8;
export const HANDLE_RADIUS = 4;

const TWO_POINT_TYPES = new Set([
  'trend',
  'ray',
  'arrow',
  'measure',
  'rect',
  'ellipse',
  'fib',
  'text',
]);

function validPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function validChartPoint(point) {
  return point && Number.isFinite(Number(point.time)) && Number.isFinite(Number(point.price));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(point, a, b) {
  if (!validPoint(point) || !validPoint(a) || !validPoint(b)) return Infinity;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return distance(point, a);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function pointInPolygon(point, polygon) {
  if (!validPoint(point) || !Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (!validPoint(a) || !validPoint(b)) continue;
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInEllipse(point, a, b) {
  if (!validPoint(point) || !validPoint(a) || !validPoint(b)) return false;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  if (rx < 0.5 || ry < 0.5) return false;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  return ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2) <= 1;
}

function distanceToEllipse(point, a, b) {
  if (!validPoint(point) || !validPoint(a) || !validPoint(b)) return Infinity;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  if (rx < 0.5 || ry < 0.5) return distanceToSegment(point, a, b);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const angle = Math.atan2(point.y - cy, point.x - cx);
  const edge = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  return distance(point, edge);
}

export function rayEnd(a, b, width, height) {
  if (!validPoint(a) || !validPoint(b)) return b;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return b;
  const candidates = [];
  if (Math.abs(dx) > 0.0001) {
    for (const x of [0, width]) {
      const t = (x - a.x) / dx;
      const y = a.y + t * dy;
      if (t > 0 && y >= 0 && y <= height) candidates.push({ t, x, y });
    }
  }
  if (Math.abs(dy) > 0.0001) {
    for (const y of [0, height]) {
      const t = (y - a.y) / dy;
      const x = a.x + t * dx;
      if (t > 0 && x >= 0 && x <= width) candidates.push({ t, x, y });
    }
  }
  if (!candidates.length) return b;
  candidates.sort((left, right) => left.t - right.t);
  return { x: candidates[0].x, y: candidates[0].y };
}

export function getDrawingPoints(drawing) {
  if (!drawing || !Array.isArray(drawing.points)) return [];
  return drawing.points.filter(validChartPoint).map((point) => ({
    time: Number(point.time),
    price: Number(point.price),
  }));
}

export function translateDrawing(drawing, deltaTime, deltaPrice) {
  if (!drawing || !Array.isArray(drawing.points)) return drawing;
  const moveTime = drawing.type !== 'hline';
  const movePrice = drawing.type !== 'vline';
  return {
    ...drawing,
    points: drawing.points.map((point) => ({
      ...point,
      time: moveTime ? Number(point.time) + deltaTime : Number(point.time),
      price: movePrice ? Number(point.price) + deltaPrice : Number(point.price),
    })),
  };
}

export function resizeDrawing(drawing, handle, point) {
  if (!drawing || !handle || !validChartPoint(point)) return drawing;
  const points = drawing.points.map((item) => ({ ...item }));
  if (handle.axis === 'price') {
    if (points[0]) points[0].price = Number(point.price);
    return { ...drawing, points };
  }
  if (handle.axis === 'time') {
    if (points[0]) points[0].time = Number(point.time);
    return { ...drawing, points };
  }
  if (handle.xPoint != null || handle.yPoint != null) {
    if (handle.xPoint != null && points[handle.xPoint]) {
      points[handle.xPoint].time = Number(point.time);
    }
    if (handle.yPoint != null && points[handle.yPoint]) {
      points[handle.yPoint].price = Number(point.price);
    }
    return { ...drawing, points };
  }
  if (handle.pointIndex != null && points[handle.pointIndex]) {
    points[handle.pointIndex] = { time: Number(point.time), price: Number(point.price) };
  }
  return { ...drawing, points };
}

export function getHandles(drawing, screen) {
  const points = screen?.points || [];
  const width = Number(screen?.width) || 0;
  const height = Number(screen?.height) || 0;
  const valid = points.map((point, index) => (validPoint(point) ? { ...point, index } : null)).filter(Boolean);
  if (!drawing || !valid.length) return [];

  if (drawing.type === 'hline') {
    return [{
      x: width / 2,
      y: valid[0].y,
      axis: 'price',
      pointIndex: 0,
      cursor: 'ns-resize',
      kind: 'axis',
    }];
  }

  if (drawing.type === 'vline') {
    return [{
      x: valid[0].x,
      y: height / 2,
      axis: 'time',
      pointIndex: 0,
      cursor: 'ew-resize',
      kind: 'axis',
    }];
  }

  if (drawing.type === 'rect' || drawing.type === 'ellipse') {
    const a = points[0];
    const b = points[1];
    if (!validPoint(a) || !validPoint(b)) return valid.map((point) => ({
      x: point.x,
      y: point.y,
      pointIndex: point.index,
      cursor: 'move',
      kind: 'point',
    }));
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    const leftIndex = a.x <= b.x ? 0 : 1;
    const rightIndex = 1 - leftIndex;
    const topIndex = a.y <= b.y ? 0 : 1;
    const bottomIndex = 1 - topIndex;
    return [
      { x: left, y: top, xPoint: leftIndex, yPoint: topIndex, cursor: 'nwse-resize', kind: 'corner' },
      { x: right, y: top, xPoint: rightIndex, yPoint: topIndex, cursor: 'nesw-resize', kind: 'corner' },
      { x: right, y: bottom, xPoint: rightIndex, yPoint: bottomIndex, cursor: 'nwse-resize', kind: 'corner' },
      { x: left, y: bottom, xPoint: leftIndex, yPoint: bottomIndex, cursor: 'nesw-resize', kind: 'corner' },
    ];
  }

  return valid.map((point) => ({
    x: point.x,
    y: point.y,
    pointIndex: point.index,
    cursor: 'move',
    kind: 'point',
  }));
}

function hitHandle(handles, pointer) {
  for (const handle of handles) {
    if (distance(pointer, handle) <= HANDLE_HIT_RADIUS) return handle;
  }
  return null;
}

function hitBody(drawing, points, pointer, width, height) {
  const tolerance = HIT_TOLERANCE;
  if (!validPoint(pointer)) return false;

  if (drawing.type === 'hline') {
    return validPoint(points[0]) && Math.abs(pointer.y - points[0].y) <= tolerance;
  }
  if (drawing.type === 'vline') {
    return validPoint(points[0]) && Math.abs(pointer.x - points[0].x) <= tolerance;
  }
  if (drawing.type === 'text') {
    if (!validPoint(points[0])) return false;
    return distance(pointer, points[0]) <= 18;
  }
  if (drawing.type === 'rect') {
    const a = points[0];
    const b = points[1];
    if (!validPoint(a) || !validPoint(b)) return false;
    const left = Math.min(a.x, b.x) - tolerance;
    const right = Math.max(a.x, b.x) + tolerance;
    const top = Math.min(a.y, b.y) - tolerance;
    const bottom = Math.max(a.y, b.y) + tolerance;
    return pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom;
  }
  if (drawing.type === 'ellipse') {
    const a = points[0];
    const b = points[1];
    if (!validPoint(a) || !validPoint(b)) return false;
    return pointInEllipse(pointer, a, b) || distanceToEllipse(pointer, a, b) <= tolerance;
  }
  if (drawing.type === 'fib') {
    const a = points[0];
    const b = points[1];
    if (!validPoint(a) || !validPoint(b)) return false;
    const left = Math.min(a.x, b.x) - tolerance;
    const right = Math.max(a.x, b.x) + tolerance;
    const top = Math.min(a.y, b.y) - tolerance;
    const bottom = Math.max(a.y, b.y) + tolerance;
    if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) return true;
    return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
      .some((level) => Math.abs(pointer.y - (a.y + (b.y - a.y) * level)) <= tolerance);
  }
  if (drawing.type === 'triangle') {
    const polygon = points.slice(0, 3);
    if (polygon.length < 3) return false;
    if (pointInPolygon(pointer, polygon)) return true;
    return polygon.some((point, index) => (
      distanceToSegment(pointer, point, polygon[(index + 1) % polygon.length]) <= tolerance
    ));
  }
  if (drawing.type === 'channel') {
    const a = points[0];
    const b = points[1];
    const c = points[2];
    if (!validPoint(a) || !validPoint(b) || !validPoint(c)) return false;
    const offset = { x: c.x - a.x, y: c.y - a.y };
    const polygon = [a, b, { x: b.x + offset.x, y: b.y + offset.y }, c];
    if (pointInPolygon(pointer, polygon)) return true;
    return [
      [a, b],
      [c, { x: b.x + offset.x, y: b.y + offset.y }],
      [a, c],
      [b, { x: b.x + offset.x, y: b.y + offset.y }],
    ].some(([start, end]) => distanceToSegment(pointer, start, end) <= tolerance);
  }
  if (drawing.type === 'path') {
    if (points.length < 2) return validPoint(points[0]) && distance(pointer, points[0]) <= tolerance;
    for (let index = 0; index < points.length - 1; index += 1) {
      if (distanceToSegment(pointer, points[index], points[index + 1]) <= tolerance) return true;
    }
    return false;
  }

  if (drawing.type === 'ray') {
    const a = points[0];
    const b = points[1];
    if (!validPoint(a) || !validPoint(b)) return false;
    return distanceToSegment(pointer, a, rayEnd(a, b, width, height)) <= tolerance;
  }

  if (points.length >= 2) {
    for (let index = 0; index < points.length - 1; index += 1) {
      if (distanceToSegment(pointer, points[index], points[index + 1]) <= tolerance) return true;
    }
    return false;
  }

  return validPoint(points[0]) && distance(pointer, points[0]) <= tolerance;
}

export function hitTestDrawing(drawing, screen, pointer) {
  if (!drawing || !screen || !validPoint(pointer)) return null;
  const points = screen.points || [];
  const handles = getHandles(drawing, screen);
  const handle = hitHandle(handles, pointer);
  if (handle) {
    return {
      drawingId: drawing.id,
      drawing,
      part: 'handle',
      handle,
      cursor: handle.cursor || 'move',
    };
  }
  if (!hitBody(drawing, points, pointer, screen.width, screen.height)) return null;
  return {
    drawingId: drawing.id,
    drawing,
    part: 'body',
    handle: null,
    cursor: drawing.type === 'hline' ? 'ns-resize' : drawing.type === 'vline' ? 'ew-resize' : 'move',
  };
}

/**
 * Hit test topmost drawing first. Drawings are rendered in array order, so the
 * last item wins when objects overlap.
 */
export function hitTestDrawings(drawings, chart, series, pointer) {
  if (!Array.isArray(drawings) || !drawings.length) return null;
  for (let index = drawings.length - 1; index >= 0; index -= 1) {
    const drawing = drawings[index];
    const screen = drawingToScreen(chart, series, drawing);
    const hit = hitTestDrawing(drawing, screen, pointer);
    if (hit) return hit;
  }
  return null;
}

export function drawingBounds(points) {
  const valid = points.filter(validPoint);
  if (!valid.length) return null;
  return valid.reduce((bounds, point) => ({
    left: Math.min(bounds.left, point.x),
    right: Math.max(bounds.right, point.x),
    top: Math.min(bounds.top, point.y),
    bottom: Math.max(bounds.bottom, point.y),
  }), {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity,
  });
}

export function isTwoPointType(type) {
  return TWO_POINT_TYPES.has(type);
}
