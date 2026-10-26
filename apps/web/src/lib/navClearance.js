// Shared clearance for floating launchers and panels. The app swaps between
// the desktop footer and the tablet/phone dock, and both can mount after the
// first layout pass. Measure whichever bar is actually visible and re-measure
// when the viewport or the bar itself changes.
export function measureNavClearance() {
  if (typeof window === 'undefined') return 0;
  let clearance = 0;
  for (const el of document.querySelectorAll('.tb-dock, .app-nav-footer')) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.width > 0) {
      clearance = Math.max(clearance, window.innerHeight - rect.top);
    }
  }
  return clearance;
}

// Runs the callback after layout, on viewport changes, and whenever either
// nav bar changes size (including hidden → visible breakpoint swaps).
export function watchNavClearance(callback) {
  if (typeof window === 'undefined') return () => {};
  let scheduled = false;
  let disposed = false;
  const schedule = () => {
    if (scheduled || disposed) return;
    scheduled = true;
    // A microtask still runs when Safari has another window in front (where
    // requestAnimationFrame and timers can be throttled or suspended).
    Promise.resolve().then(() => {
      scheduled = false;
      if (!disposed) callback();
    });
  };
  const observed = new Set();
  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(schedule)
    : null;
  const observeNavs = () => {
    if (!observer) return;
    for (const el of document.querySelectorAll('.tb-dock, .app-nav-footer')) {
      if (observed.has(el)) continue;
      observed.add(el);
      observer.observe(el);
    }
  };

  observeNavs();
  schedule();
  const lateSync = setTimeout(() => { observeNavs(); schedule(); }, 450);

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  return () => {
    clearTimeout(lateSync);
    observer?.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
  };
}
