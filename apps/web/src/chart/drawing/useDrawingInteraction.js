import { useCallback, useEffect, useRef } from 'react';
import {
  eventToPanePoint,
  screenToPoint,
} from './coordinates';
import {
  hitTestDrawings,
  resizeDrawing,
  translateDrawing,
} from './geometry';

const TOOL_CLICKS = {
  hline: 1,
  vline: 1,
  text: 1,
  trend: 2,
  ray: 2,
  arrow: 2,
  measure: 2,
  rect: 2,
  ellipse: 2,
  fib: 2,
  triangle: 3,
  channel: 3,
  path: 0,
};

function uid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDrawing(drawing) {
  return {
    ...drawing,
    points: (drawing.points || []).map((point) => ({ ...point })),
  };
}

function sameHandle(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.drawingId === right.drawingId
    && left.handle?.kind === right.handle?.kind
    && Math.abs(left.handle?.x - right.handle?.x) < 0.5
    && Math.abs(left.handle?.y - right.handle?.y) < 0.5;
}

/**
 * Central pointer controller for drawings.
 *
 * It deliberately keeps high-frequency drag state in refs and updates the
 * series primitive directly. React state is touched only for selection, tool
 * changes and committed drawing history.
 */
export function useDrawingInteraction({
  wrapRef,
  chartRef,
  seriesRef,
  primitiveRef,
  drawingsRef,
  selected,
  setSelected,
  tool,
  setTool,
  pending,
  setPending,
  locked,
  hideDrawings,
  magnet,
  candlesRef,
  updateDrawings,
  setTextPrompt,
  accent,
  timeframeMinutes,
  previewRef,
  hoveredHandleRef,
}) {
  const toolRef = useRef(tool);
  const lockedRef = useRef(locked);
  const hideRef = useRef(hideDrawings);
  const magnetRef = useRef(magnet);
  const selectedRef = useRef(selected);
  const accentRef = useRef(accent);
  const timeframeRef = useRef(timeframeMinutes);
  const pendingRef = useRef([]);
  const dragRef = useRef(null);
  const hoverPointRef = useRef(null);
  const dragRafRef = useRef(null);
  const hoverRafRef = useRef(null);
  const previewRafRef = useRef(null);
  const previewPointRef = useRef(null);
  const previousToolRef = useRef(tool);

  toolRef.current = tool;
  lockedRef.current = locked;
  hideRef.current = hideDrawings;
  magnetRef.current = magnet;
  selectedRef.current = selected;
  accentRef.current = accent;
  timeframeRef.current = timeframeMinutes;

  const requestDraw = useCallback(() => {
    primitiveRef.current?.requestUpdate();
  }, [primitiveRef]);

  const clearPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current = null;
      requestDraw();
    }
  }, [previewRef, requestDraw]);

  const setHovered = useCallback((next) => {
    if (sameHandle(hoveredHandleRef.current, next)) return;
    hoveredHandleRef.current = next;
    requestDraw();
  }, [hoveredHandleRef, requestDraw]);

  const buildPreview = useCallback((type, points) => ({
    id: '__tb_preview__',
    type,
    color: accentRef.current,
    lineWidth: 1.5,
    points: points.map((point) => ({ ...point })),
  }), []);

  const setPreview = useCallback((drawing) => {
    previewRef.current = drawing;
    requestDraw();
  }, [previewRef, requestDraw]);

  const commitNew = useCallback((drawing) => {
    const next = { ...drawing, id: drawing.id || uid() };
    updateDrawings((previous) => [...previous, next]);
    selectedRef.current = next.id;
    setSelected(next.id);
    pendingRef.current = [];
    setPending([]);
    dragRef.current = null;
    clearPreview();
    setTool('cursor');
  }, [clearPreview, setPending, setSelected, setTool, updateDrawings]);

  const finishPath = useCallback(() => {
    const points = pendingRef.current;
    if (points.length >= 2) {
      commitNew({
        id: uid(),
        type: 'path',
        color: accentRef.current,
        lineWidth: 1.5,
        points: points.map((point) => ({ ...point })),
      });
    } else {
      pendingRef.current = [];
      setPending([]);
      clearPreview();
    }
  }, [clearPreview, commitNew, setPending]);

  const cancelInteraction = useCallback(() => {
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    previewPointRef.current = null;
    if (dragRef.current?.pointerId != null && wrapRef.current?.hasPointerCapture?.(dragRef.current.pointerId)) {
      try { wrapRef.current.releasePointerCapture(dragRef.current.pointerId); } catch { /* ignore */ }
    }
    dragRef.current = null;
    pendingRef.current = [];
    setPending([]);
    setHovered(null);
    clearPreview();
  }, [clearPreview, setHovered, setPending, wrapRef]);

  // Tool changes start a clean gesture. This prevents a pending trendline
  // anchor from leaking into a rectangle or path after the user changes tools.
  useEffect(() => {
    if (previousToolRef.current === tool) return;
    previousToolRef.current = tool;
    pendingRef.current = [];
    previewPointRef.current = null;
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    setPending([]);
    clearPreview();
  }, [clearPreview, setPending, tool]);

  useEffect(() => {
    if (!locked && !hideDrawings) return;
    pendingRef.current = [];
    setPending([]);
    setHovered(null);
    clearPreview();
  }, [clearPreview, hideDrawings, locked, setHovered, setPending]);

  useEffect(() => {
    if (pending.length === 0 && pendingRef.current.length) {
      pendingRef.current = [];
      clearPreview();
    }
  }, [clearPreview, pending]);

  useEffect(() => {
    selectedRef.current = selected;
    requestDraw();
  }, [requestDraw, selected]);

  const pointerInfo = useCallback((event) => {
    const wrap = wrapRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!wrap || !chart || !series) return null;
    const pane = eventToPanePoint(wrap, event);
    if (!pane) return null;
    try {
      const size = chart.paneSize(0);
      if (pane.x < 0 || pane.y < 0 || pane.x > size.width || pane.y > size.height) return null;
    } catch {
      return null;
    }
    const point = screenToPoint(chart, series, pane.x, pane.y, {
      magnet: magnetRef.current,
      candles: candlesRef.current,
      timeframeMinutes: timeframeRef.current,
    });
    if (!point) return null;
    return { pane, point };
  }, [candlesRef, chartRef, seriesRef, timeframeRef, wrapRef]);

  const setWrapCursor = useCallback((cursor) => {
    if (wrapRef.current) wrapRef.current.style.cursor = cursor;
  }, [wrapRef]);

  const processDrag = useCallback(() => {
    dragRafRef.current = null;
    const drag = dragRef.current;
    if (!drag || !drag.latest?.point) return;
    const { point, pane } = drag.latest;
    const deltaTime = point.time - drag.startPoint.time;
    const deltaPrice = point.price - drag.startPoint.price;
    const next = drag.mode === 'resize'
      ? resizeDrawing(drag.original, drag.handle, point)
      : translateDrawing(drag.original, deltaTime, deltaPrice);
    previewRef.current = next;
    if (Math.abs(pane.x - drag.startPane.x) > 1 || Math.abs(pane.y - drag.startPane.y) > 1) {
      drag.moved = true;
    }
    requestDraw();
  }, [previewRef, requestDraw]);

  const processPreview = useCallback(() => {
    previewRafRef.current = null;
    const point = previewPointRef.current;
    if (!point || !pendingRef.current.length) return;
    setPreview(buildPreview(toolRef.current, [...pendingRef.current, point]));
  }, [buildPreview, setPreview]);

  const processHover = useCallback(() => {
    hoverRafRef.current = null;
    if (dragRef.current || toolRef.current !== 'cursor' || lockedRef.current || hideRef.current) return;
    const pane = hoverPointRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!pane || !chart || !series) return;
    const hit = hitTestDrawings(drawingsRef.current, chart, series, pane, {
      candles: candlesRef.current,
      timeframeMinutes: timeframeRef.current,
    });
    if (hit?.part === 'handle') {
      setHovered({ drawingId: hit.drawingId, handle: hit.handle });
    } else {
      setHovered(null);
    }
    setWrapCursor(hit?.cursor || 'default');
  }, [candlesRef, chartRef, drawingsRef, seriesRef, timeframeRef, setHovered, setWrapCursor]);

  const onPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    if (lockedRef.current || hideRef.current) return;
    const info = pointerInfo(event);
    if (!info) return;
    const { pane, point } = info;
    const activeTool = toolRef.current;

    if (activeTool !== 'cursor') {
      event.preventDefault();
      event.stopPropagation();
      previewPointRef.current = null;
      if (previewRafRef.current) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      if (activeTool === 'path') {
        const now = performance.now();
        const previous = dragRef.current?.lastPathClick || 0;
        const previousPoint = dragRef.current?.lastPathPoint;
        const isDoubleClick = now - previous < 320
          && pendingRef.current.length >= 2
          && previousPoint
          && Math.hypot(pane.x - previousPoint.x, pane.y - previousPoint.y) < 6;
        if (isDoubleClick) {
          if (dragRef.current) {
            dragRef.current.lastPathClick = 0;
            dragRef.current.lastPathPoint = null;
          }
          finishPath();
          return;
        }
        if (!dragRef.current) dragRef.current = { lastPathClick: 0, lastPathPoint: null };
        dragRef.current.lastPathClick = now;
        dragRef.current.lastPathPoint = { x: pane.x, y: pane.y };
        pendingRef.current = [...pendingRef.current, point];
        setPending(pendingRef.current);
        setPreview(buildPreview('path', pendingRef.current));
        return;
      }

      const clicks = TOOL_CLICKS[activeTool] || 0;
      if (!clicks) return;
      if (clicks === 1) {
        if (activeTool === 'text') {
          setTextPrompt({ point, value: '' });
          setTool('cursor');
          pendingRef.current = [];
          setPending([]);
          clearPreview();
        } else {
          commitNew({
            id: uid(),
            type: activeTool,
            color: accentRef.current,
            points: [point],
          });
        }
        return;
      }

      const next = [...pendingRef.current, point];
      if (next.length >= clicks) {
        commitNew({
          id: uid(),
          type: activeTool,
          color: accentRef.current,
          lineWidth: 1.5,
          points: next,
        });
      } else {
        pendingRef.current = next;
        setPending(next);
        setPreview(buildPreview(activeTool, next));
      }
      return;
    }

    const chart = chartRef.current;
    const series = seriesRef.current;
    const hit = hitTestDrawings(drawingsRef.current, chart, series, pane, {
      candles: candlesRef.current,
      timeframeMinutes: timeframeRef.current,
    });
    if (!hit) {
      selectedRef.current = null;
      setSelected(null);
      setHovered(null);
      clearPreview();
      setWrapCursor('default');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectedRef.current = hit.drawingId;
    setSelected(hit.drawingId);
    setHovered(hit.part === 'handle' ? { drawingId: hit.drawingId, handle: hit.handle } : null);
    dragRef.current = {
      id: hit.drawingId,
      mode: hit.part === 'handle' ? 'resize' : 'move',
      handle: hit.handle,
      startPoint: point,
      startPane: pane,
      latest: { pane, point },
      original: cloneDrawing(hit.drawing),
      moved: false,
      pointerId: event.pointerId,
      lastPathClick: 0,
    };
    setWrapCursor(hit.cursor || 'grabbing');
    try { wrapRef.current?.setPointerCapture?.(event.pointerId); } catch { /* ignore */ }
  }, [
    buildPreview, candlesRef, chartRef, clearPreview, commitNew, drawingsRef, finishPath,
    pointerInfo, seriesRef, setHovered, setPending, setPreview, setSelected,
    setTextPrompt, setTool, setWrapCursor, timeframeRef, wrapRef,
  ]);

  const onPointerMove = useCallback((event) => {
    if (dragRef.current && !dragRef.current.original) {
      // Path draft uses the same ref for double-click timing; it is not a drag.
      if (toolRef.current !== 'path') return;
    }

    if (dragRef.current?.original) {
      event.preventDefault();
      event.stopPropagation();
      const info = pointerInfo(event);
      if (!info) return;
      dragRef.current.latest = info;
      if (!dragRafRef.current) dragRafRef.current = requestAnimationFrame(processDrag);
      return;
    }

    if (toolRef.current !== 'cursor') {
      if (lockedRef.current || hideRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      const info = pointerInfo(event);
      if (!info) return;
      if (pendingRef.current.length) {
        previewPointRef.current = info.point;
        if (!previewRafRef.current) previewRafRef.current = requestAnimationFrame(processPreview);
      }
      return;
    }

    if (lockedRef.current || hideRef.current) return;
    const pane = eventToPanePoint(wrapRef.current, event);
    if (!pane) return;
    hoverPointRef.current = pane;
    if (!hoverRafRef.current) hoverRafRef.current = requestAnimationFrame(processHover);
  }, [pointerInfo, processDrag, processHover, processPreview, wrapRef]);

  const onPointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (drag?.original) {
      event.preventDefault();
      event.stopPropagation();
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      if (drag.latest?.point) {
        const deltaTime = drag.latest.point.time - drag.startPoint.time;
        const deltaPrice = drag.latest.point.price - drag.startPoint.price;
        const next = drag.mode === 'resize'
          ? resizeDrawing(drag.original, drag.handle, drag.latest.point)
          : translateDrawing(drag.original, deltaTime, deltaPrice);
        if (drag.moved) {
          updateDrawings((previous) => previous.map((drawing) => (drawing.id === drag.id ? next : drawing)));
          selectedRef.current = drag.id;
          setSelected(drag.id);
        }
      }
      if (drag.pointerId != null && wrapRef.current?.hasPointerCapture?.(drag.pointerId)) {
        try { wrapRef.current.releasePointerCapture(drag.pointerId); } catch { /* ignore */ }
      }
      dragRef.current = null;
      clearPreview();
      setWrapCursor(toolRef.current === 'cursor' ? 'default' : 'crosshair');
      return;
    }

    if (toolRef.current !== 'cursor') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }, [clearPreview, setSelected, setWrapCursor, updateDrawings, wrapRef]);

  const onPointerCancel = useCallback((event) => {
    const drag = dragRef.current;
    if (drag?.original) {
      if (drag.pointerId != null && wrapRef.current?.hasPointerCapture?.(drag.pointerId)) {
        try { wrapRef.current.releasePointerCapture(drag.pointerId); } catch { /* ignore */ }
      }
      dragRef.current = null;
      clearPreview();
      setWrapCursor(toolRef.current === 'cursor' ? 'default' : 'crosshair');
      event.stopPropagation();
    }
  }, [clearPreview, setWrapCursor, wrapRef]);

  const onPointerLeave = useCallback(() => {
    if (dragRef.current?.original) return;
    hoverPointRef.current = null;
    setHovered(null);
    setWrapCursor(toolRef.current === 'cursor' ? 'default' : 'crosshair');
    if (toolRef.current !== 'cursor' && pendingRef.current.length) clearPreview();
  }, [clearPreview, setHovered, setWrapCursor]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    wrap.addEventListener('pointerdown', onPointerDown, true);
    wrap.addEventListener('pointermove', onPointerMove, true);
    wrap.addEventListener('pointerup', onPointerUp, true);
    wrap.addEventListener('pointercancel', onPointerCancel, true);
    wrap.addEventListener('pointerleave', onPointerLeave, true);
    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, true);
      wrap.removeEventListener('pointermove', onPointerMove, true);
      wrap.removeEventListener('pointerup', onPointerUp, true);
      wrap.removeEventListener('pointercancel', onPointerCancel, true);
      wrap.removeEventListener('pointerleave', onPointerLeave, true);
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      dragRafRef.current = null;
      hoverRafRef.current = null;
      previewRafRef.current = null;
    };
  }, [onPointerCancel, onPointerDown, onPointerLeave, onPointerMove, onPointerUp, wrapRef]);

  useEffect(() => {
    setWrapCursor(tool === 'cursor' ? 'default' : 'crosshair');
  }, [setWrapCursor, tool]);

  return {
    cancelInteraction,
    finishPath,
  };
}
