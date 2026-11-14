/**
 * Lightweight Charts series primitive that renders chart drawings.
 *
 * The primitive owns pixels only. Drawing data stays in chart space and is
 * projected on every chart repaint, so zoom, pan, resize and price-scale
 * changes cannot desynchronise an object from its anchors.
 */

import { drawingToScreen } from './coordinates';
import { getHandles, hitTestDrawings, rayEnd } from './geometry';

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function hexToRgba(hex, alpha) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(212, 175, 55, ${alpha})`;
  let value = hex.slice(1);
  if (value.length === 3) value = value.split('').map((part) => part + part).join('');
  const number = Number.parseInt(value, 16);
  if (!Number.isFinite(number) || value.length !== 6) return `rgba(212, 175, 55, ${alpha})`;
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function label(context, text, x, y, state, options = {}) {
  const {
    align = 'left',
    color = state.isLight ? '#1b1b1b' : '#e9e7df',
    background = state.isLight ? 'rgba(255,255,255,0.94)' : 'rgba(18,18,24,0.94)',
    border = state.isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.12)',
  } = options;
  context.save();
  context.font = '11px ui-sans-serif, system-ui, sans-serif';
  const width = context.measureText(text).width + 10;
  const height = 18;
  let left = x;
  if (align === 'right') left = x - width;
  if (align === 'center') left = x - width / 2;
  const top = y - height / 2;
  context.fillStyle = background;
  context.strokeStyle = border;
  context.lineWidth = 1;
  roundedRect(context, left, top, width, height, 4);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(text, left + 5, y + 0.5);
  context.restore();
}

function formatTime(time) {
  const value = Number(time);
  if (!Number.isFinite(value)) return '';
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function drawArrowHead(context, from, to, color) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 8;
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  context.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

function drawHandles(context, drawing, screen, state, color) {
  const handles = getHandles(drawing, screen);
  const hovered = state.hoveredHandle;
  for (const handle of handles) {
    const isHovered = hovered
      && hovered.drawingId === drawing.id
      && hovered.handle
      && hovered.handle.kind === handle.kind
      && Math.abs(hovered.handle.x - handle.x) < 0.5
      && Math.abs(hovered.handle.y - handle.y) < 0.5;
    context.save();
    context.beginPath();
    context.arc(handle.x, handle.y, isHovered ? 6 : 4.5, 0, Math.PI * 2);
    context.fillStyle = isHovered ? color : (state.isLight ? '#ffffff' : '#101015');
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
  }
}

function drawMeasure(context, drawing, screen, state, color) {
  const [a, b] = screen.points;
  if (!a || !b) return;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 1.25;
  context.setLineDash([5, 4]);
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = hexToRgba(color, 0.08);
  context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  context.restore();

  const first = drawing.points[0];
  const second = drawing.points[1];
  if (!first || !second) return;
  const delta = Number(second.price) - Number(first.price);
  const pct = Number(first.price) ? (delta / Number(first.price)) * 100 : 0;
  const minutes = Number(state.timeframeMinutes) || 0;
  const bars = minutes > 0 ? Math.round(Math.abs(Number(second.time) - Number(first.time)) / 60 / minutes) : 0;
  const sign = delta >= 0 ? '+' : '';
  const text = `${sign}${state.formatPrice ? state.formatPrice(delta) : delta.toFixed(2)} (${sign}${pct.toFixed(2)}%)${bars ? ` · ${bars} bars` : ''}`;
  label(context, text, (a.x + b.x) / 2, (a.y + b.y) / 2, state, { align: 'center' });
}

function drawFib(context, drawing, screen, state, color) {
  const [a, b] = screen.points;
  if (!a || !b) return;
  const width = Number(screen.width) || 0;
  const left = 0;
  const right = width;
  const first = drawing.points[0];
  const second = drawing.points[1];
  if (!first || !second) return;
  context.save();
  context.fillStyle = hexToRgba(color, 0.035);
  context.fillRect(left, Math.min(a.y, b.y), right - left, Math.abs(b.y - a.y));
  context.font = '10px ui-sans-serif, system-ui, sans-serif';
  for (const level of FIB_LEVELS) {
    const y = a.y + (b.y - a.y) * level;
    context.strokeStyle = hexToRgba(color, level === 0.5 ? 0.7 : 0.35);
    context.lineWidth = level === 0.5 ? 1.2 : 0.8;
    context.setLineDash(level === 0.5 ? [] : [4, 4]);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    const price = Number(first.price) + (Number(second.price) - Number(first.price)) * level;
    label(context, `${(level * 100).toFixed(1)}%  ${state.formatPrice ? state.formatPrice(price) : price.toFixed(2)}`, right - 2, y, state, { align: 'right' });
  }
  context.restore();
}

function drawChannel(context, drawing, screen, state, color) {
  const [a, b, c] = screen.points;
  if (!a || !b || !c) return;
  const offset = { x: c.x - a.x, y: c.y - a.y };
  const far = { x: b.x + offset.x, y: b.y + offset.y };
  context.save();
  context.fillStyle = hexToRgba(color, 0.06);
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.lineTo(far.x, far.y);
  context.lineTo(c.x, c.y);
  context.closePath();
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 1.25;
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.moveTo(c.x, c.y);
  context.lineTo(far.x, far.y);
  context.stroke();
  context.restore();
}

function drawDrawing(context, drawing, screen, state, preview) {
  const points = screen.points || [];
  if (!points.some(Boolean)) return;
  const color = drawing.color || state.accent || '#d4af37';
  const width = Number(screen.width) || 0;
  const height = Number(screen.height) || 0;
  const selected = state.selectedId === drawing.id;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = selected ? 2 : (drawing.lineWidth || 1.5);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (preview) {
    context.globalAlpha = 0.72;
    context.setLineDash([5, 4]);
  }

  switch (drawing.type) {
    case 'hline': {
      const y = points[0]?.y;
      if (!Number.isFinite(y)) break;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      if (!preview) {
        label(context, state.formatPrice ? state.formatPrice(drawing.points[0].price) : String(drawing.points[0].price), width - 2, y, state, { align: 'right' });
      }
      break;
    }
    case 'vline': {
      const x = points[0]?.x;
      if (!Number.isFinite(x)) break;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      if (!preview) label(context, formatTime(drawing.points[0].time), x, height - 2, state, { align: 'center' });
      break;
    }
    case 'text': {
      const point = points[0];
      if (!point) break;
      const text = drawing.text || 'Text';
      context.font = '12px ui-sans-serif, system-ui, sans-serif';
      const textWidth = context.measureText(text).width;
      context.fillStyle = hexToRgba(color, 0.14);
      roundedRect(context, point.x - 4, point.y - 14, textWidth + 8, 22, 4);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = state.isLight ? '#1b1b1b' : '#f2f0e8';
      context.textBaseline = 'middle';
      context.fillText(text, point.x, point.y - 2);
      break;
    }
    case 'rect': {
      const [a, b] = points;
      if (!a || !b) break;
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      context.fillStyle = hexToRgba(color, 0.07);
      context.fillRect(x, y, w, h);
      context.strokeRect(x, y, w, h);
      break;
    }
    case 'ellipse': {
      const [a, b] = points;
      if (!a || !b) break;
      const rx = Math.abs(b.x - a.x) / 2;
      const ry = Math.abs(b.y - a.y) / 2;
      if (rx < 0.5 || ry < 0.5) break;
      context.beginPath();
      context.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      context.fillStyle = hexToRgba(color, 0.06);
      context.fill();
      context.stroke();
      break;
    }
    case 'measure':
      drawMeasure(context, drawing, screen, state, color);
      break;
    case 'fib':
      drawFib(context, drawing, screen, state, color);
      break;
    case 'triangle': {
      const polygon = points.slice(0, 3);
      if (polygon.length < 3) break;
      context.beginPath();
      context.moveTo(polygon[0].x, polygon[0].y);
      for (let index = 1; index < polygon.length; index += 1) context.lineTo(polygon[index].x, polygon[index].y);
      context.closePath();
      context.fillStyle = hexToRgba(color, 0.06);
      context.fill();
      context.stroke();
      break;
    }
    case 'channel':
      drawChannel(context, drawing, screen, state, color);
      break;
    case 'path': {
      if (points.length < 2) break;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        if (!points[index]) continue;
        context.lineTo(points[index].x, points[index].y);
      }
      context.stroke();
      break;
    }
    case 'ray': {
      const [a, b] = points;
      if (!a || !b) break;
      const end = rayEnd(a, b, width, height);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(end.x, end.y);
      context.stroke();
      break;
    }
    case 'arrow': {
      const [a, b] = points;
      if (!a || !b) break;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
      drawArrowHead(context, a, b, color);
      break;
    }
    default: {
      if (points.length < 2) break;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        if (!points[index]) continue;
        context.lineTo(points[index].x, points[index].y);
      }
      context.stroke();
    }
  }

  if (preview && points.length === 1 && points[0]) {
    context.beginPath();
    context.arc(points[0].x, points[0].y, 3, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();

  if (!preview && selected && !state.locked) drawHandles(context, drawing, screen, state, color);
}

function visibleOnPane(drawing, screen, width, height) {
  if (drawing.type === 'hline' || drawing.type === 'vline') return true;
  const points = screen.points.filter(Boolean);
  if (!points.length) return false;
  const margin = 40;
  return points.some((point) => (
    point.x >= -margin
    && point.x <= width + margin
    && point.y >= -margin
    && point.y <= height + margin
  ));
}

class DrawingRenderer {
  constructor(primitive) {
    this._primitive = primitive;
  }

  draw(target) {
    const primitive = this._primitive;
    const chart = primitive._chart;
    const series = primitive._series;
    const state = primitive.getState();
    if (!chart || !series || !state || state.hide) return;

    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      const width = mediaSize.width;
      const height = mediaSize.height;
      const preview = state.preview;
      const previewId = preview?.id;

      const projection = {
        candles: state.candles,
        timeframeMinutes: state.timeframeMinutes,
      };
      for (const drawing of state.drawings || []) {
        if (previewId && drawing.id === previewId) continue;
        const screen = drawingToScreen(chart, series, drawing, projection);
        if (!visibleOnPane(drawing, screen, width, height)) continue;
        drawDrawing(context, drawing, screen, state, false);
      }

      if (preview) {
        const screen = drawingToScreen(chart, series, preview, projection);
        if (visibleOnPane(preview, screen, width, height)) {
          drawDrawing(context, preview, screen, state, true);
        }
      }
    });
  }
}

class DrawingPaneView {
  constructor(primitive) {
    this._primitive = primitive;
  }

  zOrder() {
    return 'top';
  }

  renderer() {
    return this._primitive._renderer;
  }
}

export class DrawingPrimitive {
  constructor(getState) {
    this._getState = getState;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._renderer = new DrawingRenderer(this);
    this._paneView = new DrawingPaneView(this);
    this._paneViews = [this._paneView];
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  paneViews() {
    return this._paneViews;
  }

  updateAllViews() {
    // The renderer projects from chart space on every paint; no cached screen
    // coordinates need invalidating here.
  }

  requestUpdate() {
    if (this._requestUpdate) this._requestUpdate();
  }

  getState() {
    return this._getState ? this._getState() : null;
  }

  hitTest(x, y) {
    const state = this.getState();
    if (!state || state.hide || state.locked || !this._chart || !this._series) return null;
    const hit = hitTestDrawings(state.drawings || [], this._chart, this._series, { x, y }, {
      candles: state.candles,
      timeframeMinutes: state.timeframeMinutes,
    });
    if (!hit) return null;
    return {
      externalId: hit.drawingId,
      cursorStyle: hit.cursor || 'pointer',
      zOrder: 'top',
      itemType: 'primitive',
      hitTestPriority: hit.part === 'handle' ? 2 : 1,
    };
  }
}
