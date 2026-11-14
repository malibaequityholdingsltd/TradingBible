/**
 * Coordinate conversion for chart drawings.
 *
 * Drawings are persisted in chart space ({ time, price }), never in screen
 * pixels. Lightweight Charts owns the mapping between chart space and the
 * current pane pixels, so zooming, scrolling and price-scale changes keep
 * every object anchored to the data.
 */

function finite(value) {
  return Number.isFinite(Number(value));
}

function candleTime(candle) {
  const value = Number(candle?.time);
  return Number.isFinite(value) ? Math.floor(value / 1000) : null;
}

/**
 * Convert one chart-space point to pane-relative media pixels.
 * Returns null when the point is outside the current time/price scale.
 */
export function pointToScreen(chart, series, point) {
  if (!chart || !series || !point || !finite(point.time) || !finite(point.price)) return null;
  try {
    const x = chart.timeScale().timeToCoordinate(Number(point.time));
    const y = series.priceToCoordinate(Number(point.price));
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  } catch {
    return null;
  }
}

/**
 * Convert pane-relative media pixels back to chart space.
 * When magnet is enabled, snap to the nearest OHLC value of the nearest bar.
 */
export function screenToPoint(chart, series, x, y, options = {}) {
  if (!chart || !series || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  try {
    const time = chart.timeScale().coordinateToTime(x);
    let price = series.coordinateToPrice(y);
    if (time == null || price == null || !finite(price)) return null;

    let normalizedTime = Number(time);
    if (!Number.isFinite(normalizedTime)) return null;

    if (options.magnet && Array.isArray(options.candles) && options.candles.length) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const candle of options.candles) {
        const ct = candleTime(candle);
        if (ct == null) continue;
        const distance = Math.abs(ct - normalizedTime);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = candle;
        }
      }
      if (nearest) {
        normalizedTime = candleTime(nearest);
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

    return { time: normalizedTime, price: Number(price) };
  } catch {
    return null;
  }
}

/**
 * Convert every point of a drawing and report the pane size used for hit
 * testing. The pane size excludes the price scale, matching the coordinates
 * returned by Lightweight Charts.
 */
export function drawingToScreen(chart, series, drawing) {
  if (!chart || !series || !drawing || !Array.isArray(drawing.points)) {
    return { points: [], width: 0, height: 0 };
  }
  const points = drawing.points.map((point) => pointToScreen(chart, series, point));
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
