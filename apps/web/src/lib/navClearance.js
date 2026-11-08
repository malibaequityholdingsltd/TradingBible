// Shared clearance for floating launchers and panels. The app swaps between
// the desktop footer and the tablet/phone dock, and both can mount after the
// first layout pass. Measure whichever bar is actually visible and re-measure
// when the viewport or the bar itself changes.
export function measureNavClearance() {
  if (typeof window === 'undefined') return 0;
  let clearance = 0;
  for (const el of document.querySelectorAll('.tb-dock, .ex-mobile-dock, .app-nav-footer')) {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.width > 0) {
      clearance = Math.max(clearance, window.innerHeight - rect.top);
    }
  }
  return clearance;
}

// The floating TV surfaces must live inside the app content canvas: to the
// right of the sidebar, below the topbar/mobile bar and above the bottom
// navigation. Returning the actual painted edges (not a guessed margin) lets
// the widget rest directly on those lines at every breakpoint.
export function measureShellBounds() {
  if (typeof window === 'undefined') {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  let left = 0;
  let top = 0;
  let right = vw;
  let bottom = vh;

  const sidebar = document.querySelector('.ex-sidebar');
  if (isVisible(sidebar)) {
    const rect = sidebar.getBoundingClientRect();
    if (rect.right > left && rect.right < right) left = rect.right;
  }

  // Desktop topbar and the phone/tablet mobile bar are mutually exclusive.
  // Measure whichever one is actually painted and use its bottom edge.
  const topbar = document.querySelector('.ex-topbar');
  if (isVisible(topbar)) {
    const rect = topbar.getBoundingClientRect();
    if (rect.bottom > top) top = rect.bottom;
  }
  const mobileBar = document.querySelector('.ex-mobile-bar');
  if (isVisible(mobileBar)) {
    const rect = mobileBar.getBoundingClientRect();
    if (rect.bottom > top) top = rect.bottom;
  }

  const navClearance = measureNavClearance();
  if (navClearance > 0) bottom = vh - navClearance;

  return {
    left: Math.round(left),
    top: Math.round(top),
    right: Math.round(right),
    bottom: Math.round(bottom),
    width: Math.max(0, Math.round(right - left)),
    height: Math.max(0, Math.round(bottom - top)),
  };
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
    for (const el of document.querySelectorAll('.tb-dock, .ex-mobile-dock, .app-nav-footer')) {
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

// Watch the shell edges themselves. Sidebar collapse, the desktop/mobile
// topbar swap and the bottom dock can all change without a window resize, so
// observe each painted element and re-measure after layout settles.
export function watchShellBounds(callback) {
  if (typeof window === 'undefined') return () => {};
  let scheduled = false;
  let disposed = false;
  const schedule = () => {
    if (scheduled || disposed) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      if (!disposed) callback();
    });
  };
  const selectors = [
    '.ex-sidebar',
    '.ex-topbar',
    '.ex-mobile-bar',
    '.ex-mobile-dock',
    '.tb-dock',
    '.app-nav-footer',
    '#tb-ticker',
  ];
  const observed = new Set();
  const observer = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(schedule)
    : null;
  const observeShell = () => {
    if (!observer) return;
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (observed.has(el)) continue;
        observed.add(el);
        observer.observe(el);
      }
    }
  };

  observeShell();
  schedule();
  const lateSync = setTimeout(() => { observeShell(); schedule(); }, 450);

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  return () => {
    clearTimeout(lateSync);
    observer?.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
  };
}
