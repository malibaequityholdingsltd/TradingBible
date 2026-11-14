/**
 * Coordinate conversion for chart drawings.
 *
 * Drawings are persisted in chart space ({ time, price }), never in screen
 * pixels. Lightweight Charts owns the mapping between chart space and the
 * current pane pixels, so zooming, scrolling and price-scale changes keep
 * every object anchored to the data.
 *
 * Lightweight Charts only knows the times that exist in the loaded series.
 * The right-offset whitespace therefore has no timestamp, and the naive
 * coordinateToTime() call returns null there. We bridge through the time
 * scale's logical index so a user can draw or drag at the live edge, while
 * still persisting a normal chart-space point. The interval is derived from
 * the loaded bars, with the active timeframe as the fallback.
 */

function finite(value) {
  return Number.isFinite(Number(value));
}

function candleTime(candle) {
  const value = Number(candle?.time);
  return Number.isFinite(value) ? Math.floor(value / 1000) : null;
}

const timesCache = new WeakMap();

function candleTimes(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const cached = timesCache.get(candles);
  if (cached) return cached;
  const times = candles
    .map(candleTime)
    .filter((time) => time != null);
  timesCache.set(candles, times);
  return times;
}

function fallbackIntervalSeconds(timeframeMinutes) {
  return Math.max(1, Number(timeframeMinutes) || 1) * 60;
}

/**
 * Use the median spacing of the loaded bars. A median is resistant to a
 * weekend/holiday gap, while a single-bar series still gets the timeframe
 * fallback.
 */
function barIntervalSeconds(times, timeframeMinutes) {
  const fallback = fallbackIntervalSeconds(timeframeMinutes);
  if (!Array.isArray(times) || times.length < 2) return fallback;
  const diffs = [];
  for (let index = Math.max(1, times.length - 30); index < times.length; index += 1) {
    const diff = times[index] - times[index - 1];
    if (diff > 0) diffs.push(diff);
  }
  if (!diffs.length) return fallback;
  diffs.sort((left, right) => left - right);
  return diffs[Math.floor(diffs.length / 2)] || fallback;
}

export function timeToLogical(time, candles, timeframeMinutes = 1) {
  const times = candleTimes(candles);
  const value = Number(time);
  if (!times.length || !Number.isFinite(value)) return null;
  const interval = barIntervalSeconds(times, timeframeMinutes);
  const last = times.length - 1;
  if (value <= times[0]) return (value - times[0]) / interval;
  if (value >= times[last]) return last + (value - times[last]) / interval;

  let low = 0;
  let high = last;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const current = times[middle];
    if (current === value) return middle;
    if (current < value) low = middle + 1;
    else high = middle - 1;
  }
  const right = Math.min(last, low);
  const left = Math.max(0, right - 1);
  const span = times[right] - times[left] || interval;
  return left + (value - times[left]) / span;
}

export function logicalToTime(logical, candles, timeframeMinutes = 1) {
  const times = candleTimes(candles);
  const value = Number(logical);
  if (!times.length || !Number.isFinite(value)) return null;
  const interval = barIntervalSeconds(times, timeframeMinutes);
  const last = times.length - 1;
  if (value <= 0) return times[0] + value * interval;
  if (value >= last) return times[last] + (value - last) * interval;
  const left = Math.floor(value);
  const fraction = value - left;
  const right = Math.min(last, left + 1);
  return times[left] + fraction * (times[right] - times[left]);
}

/**
 * Lightweight Charts accepts only integer logical indices in its public
 * logicalToCoordinate() method. Drawings need sub-bar precision while the
 * pointer is between bars, so derive the affine mapping from two integer
 * anchors and evaluate it at the fractional index.
 */
function logicalToX(timeScale, logical) {
  if (!timeScale || typeof timeScale.logicalToCoordinate !== 'function') return null;
  const value = Number(logical);
  if (!Number.isFinite(value)) return null;
  const lower = Math.floor(value);
  const upper = Math.ceil(value);
  const xLower = timeScale.logicalToCoordinate(lower);
  const xUpper = timeScale.logicalToCoordinate(upper === lower ? lower + 1 : upper);
  if (xLower == null || xUpper == null) return null;
  const left = Number(xLower);
  const right = Number(xUpper);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === left) return null;
  return left + (right - left) * (value - lower);
}

function xToLogical(timeScale, x) {
  if (!timeScale) return null;
  if (typeof timeScale.logicalToCoordinate === 'function') {
    const x0 = timeScale.logicalToCoordinate(0);
    const x1 = timeScale.logicalToCoordinate(1);
    if (x0 != null && x1 != null && Number(x1) !== Number(x0)) {
      return (x - Number(x0)) / (Number(x1) - Number(x0));
    }
  }
  if (typeof timeScale.coordinateToLogical === 'function') {
    const logical = timeScale.coordinateToLogical(x);
    return logical == null ? null : Number(logical);
  }
  return null;
}

/**
 * Convert one chart-space point to pane-relative media pixels.
 * Returns null when the point is outside the current time/price scale.
 */
export function pointToScreen(chart, series, point, options = {}) {
  if (!chart || !series || !point || !finite(point.time) || !finite(point.price)) return null;
  try {
    const timeScale = chart.timeScale();
    let x = timeScale.timeToCoordinate(Number(point.time));
    if (x == null) {
      const logical = timeToLogical(point.time, options.candles, options.timeframeMinutes);
      if (logical == null) return null;
      x = logicalToX(timeScale, logical);
    }
    const y = series.priceToCoordinate(Number(point.price));
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}

/**
 * Convert pane-relative media pixels back to chart space.
 * The logical index is retained on the returned object for callers that need
 * to distinguish a fractional drag from a snapped bar timestamp.
 */
export function screenToPoint(chart, series, x, y, options = {}) {
  if (!chart || !series || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  try {
    const timeScale = chart.timeScale();
    const logical = xToLogical(timeScale, x);
    const candles = Array.isArray(options.candles) ? options.candles : [];
    let normalizedTime = logical != null && candles.length
      ? logicalToTime(logical, candles, options.timeframeMinutes)
      : timeScale.coordinateToTime(x);
    let normalizedLogical = logical;

    if (normalizedTime == null && normalizedLogical != null) {
      normalizedTime = logicalToTime(normalizedLogical, candles, options.timeframeMinutes);
    }
    if (normalizedTime == null) return null;
    normalizedTime = Number(normalizedTime);
    if (!Number.isFinite(normalizedTime)) return null;

    let price = series.coordinateToPrice(y);
    if (price == null || !finite(price)) return null;

    if (options.magnet && candles.length) {
      const target = normalizedLogical != null
        ? Math.round(normalizedLogical)
        : timeToLogical(normalizedTime, candles, options.timeframeMinutes);
      let nearest = null;
      let nearestDistance = Infinity;
      for (let index = 0; index < candles.length; index += 1) {
        const ct = candleTime(candles[index]);
        if (ct == null) continue;
        const distance = Math.abs(index - Number(target));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = candles[index];
        }
      }
      if (nearest) {
        normalizedTime = candleTime(nearest);
        normalizedLogical = candles.indexOf(nearest);
        const candidates = [nearest.open, nearest.high, nearest.low, nearest.close]
          .map(Number)
          .filter(Number.isFinite);
        if (candidates.length) {
          price = candidates.reduce((best, value) => (
            Math.abs(value - price) < Math.abs(best - price) ? value : best
          ), candidates[0]);
        }
      }
    }

    return {
      time: normalizedTime,
      price: Number(price),
      ...(Number.isFinite(normalizedLogical) ? { logical: normalizedLogical } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Convert every point of a drawing and report the pane size used for hit
 * testing. The pane size excludes the price scale, matching the coordinates
 * returned by Lightweight Charts.
 */
export function drawingToScreen(chart, series, drawing, options = {}) {
  if (!chart || !series || !drawing || !Array.isArray(drawing.points)) {
    return { points: [], width: 0, height: 0 };
  }
  const points = drawing.points.map((point) => pointToScreen(chart, series, point, options));
  let width = 0;
  let height = 0;
  try {
    const size = chart.paneSize(0);
    width = Number(size?.width) || 0;
    height = Number(size?.height) || 0;
  } catch {
    /* the chart may be between layout passes */
  }
  return { points, width, height };
}

/**
 * Convert a pointer event to pane-relative media coordinates.
 */
export function eventToPanePoint(wrapElement, event) {
  if (!wrapElement || !event) return null;
  const rect = wrapElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function eventToChartPoint(wrapElement, chart, series, event, options = {}) {
  const pane = eventToPanePoint(wrapElement, event);
  if (!pane) return null;
  return screenToPoint(chart, series, pane.x, pane.y, options);
}
