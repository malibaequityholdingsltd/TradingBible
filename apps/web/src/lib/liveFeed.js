// Browser-side Binance WebSocket feed for ultra-low-latency crypto ticks.
//
// Binance exposes a public, key-less WebSocket stream, so crypto prices can be
// pushed straight to the browser on every trade tick (sub-millisecond delivery
// vs. the 15s REST polling used for keyed providers). A single pooled connection
// carries every subscribed symbol; the manager reconnects automatically with
// exponential backoff and exposes a connection status any component can read.
//
// Non-crypto symbols (stocks/forex/commodities) require a keyed provider and
// keep using the REST polling hooks — those keys must stay server-side.

import apiServerClient from '@/lib/apiServerClient';

const WS_BASE = 'wss://stream.binance.com:9443/stream';
// If the direct browser WebSocket cannot open (region blocks, proxies, etc.)
// we fall back to polling the server-side /quotes proxy, which reaches Binance
// server-side. This keeps ticks + status healthy instead of "Reconnecting…".
const WS_OPEN_TIMEOUT = 6000;
const POLL_MS = 15000;

// App symbol (e.g. BTCUSD) -> Binance stream pair (btcusdt). Only crypto maps.
const CRYPTO_MAP = {
  BTCUSD: 'btcusdt', ETHUSD: 'ethusdt', SOLUSD: 'solusdt', BNBUSD: 'bnbusdt',
  XRPUSD: 'xrpusdt', ADAUSD: 'adausdt', DOGEUSD: 'dogeusdt', AVAXUSD: 'avaxusdt',
  LTCUSD: 'ltcusdt', DOTUSD: 'dotusdt', MATICUSD: 'maticusdt', LINKUSD: 'linkusdt',
};
const PAIR_TO_SYMBOL = Object.fromEntries(Object.entries(CRYPTO_MAP).map(([s, p]) => [p, s]));

export function isCryptoSymbol(sym) {
  return Boolean(CRYPTO_MAP[String(sym || '').toUpperCase()]);
}

class BinanceFeed {
  constructor() {
    this.ws = null;
    this.status = 'idle'; // idle | connecting | connected | reconnecting | offline
    this.counts = new Map(); // pair -> subscriber ref count
    this.ticks = new Map(); // pair -> last tick { price, changePercent, high, low, volume, ts }
    this.tickListeners = new Set(); // fn(symbol, tick)
    this.statusListeners = new Set(); // fn(status)
    this.retry = 0;
    this.reconnectTimer = null;
    this.openTimer = null;
    this.pollTimer = null;
    this.polling = false;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.connect());
      window.addEventListener('offline', () => this.setStatus('offline'));
    }
  }

  setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((fn) => { try { fn(s); } catch { /* noop */ } });
  }

  onStatus(fn) { this.statusListeners.add(fn); fn(this.status); return () => this.statusListeners.delete(fn); }
  onTick(fn) { this.tickListeners.add(fn); return () => this.tickListeners.delete(fn); }

  getTick(sym) { return this.ticks.get(CRYPTO_MAP[String(sym).toUpperCase()]) || null; }

  subscribedSymbols() {
    return [...this.counts.keys()]
      .filter((p) => this.counts.get(p) > 0)
      .map((p) => PAIR_TO_SYMBOL[p])
      .filter(Boolean);
  }

  async pollOnce() {
    const symbols = this.subscribedSymbols();
    if (!symbols.length) return;
    try {
      const res = await apiServerClient.fetch(`/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { quotes = [] } = await res.json();
      quotes.forEach((q) => {
        const pair = CRYPTO_MAP[q.symbol];
        if (!pair) return;
        const tick = {
          price: q.price, changePercent: q.changePercent, change: q.change,
          high: q.high, low: q.low, volume: q.volume, ts: Date.now(),
        };
        this.ticks.set(pair, tick);
        this.tickListeners.forEach((fn) => { try { fn(q.symbol, tick); } catch { /* noop */ } });
      });
      this.setStatus('connected');
    } catch { /* keep trying on next tick */ }
  }

  startPolling() {
    if (this.polling) return;
    this.polling = true;
    this.pollOnce();
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_MS);
  }

  stopPolling() {
    this.polling = false;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  streamNames() {
    return [...this.counts.keys()].filter((p) => this.counts.get(p) > 0).map((p) => `${p}@ticker`);
  }

  subscribe(symbols) {
    const pairs = (symbols || []).map((s) => CRYPTO_MAP[String(s).toUpperCase()]).filter(Boolean);
    pairs.forEach((p) => this.counts.set(p, (this.counts.get(p) || 0) + 1));
    if (pairs.length) this.connect();
    return () => {
      pairs.forEach((p) => {
        const n = (this.counts.get(p) || 1) - 1;
        if (n <= 0) this.counts.delete(p); else this.counts.set(p, n);
      });
      if (this.streamNames().length === 0) this.close();
    };
  }

  connect() {
    if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) { this.setStatus('offline'); return; }
    const streams = this.streamNames();
    if (streams.length === 0) return;
    // Reopen if closed or if the stream set changed.
    const url = `${WS_BASE}?streams=${streams.join('/')}`;
    if (this.ws && this.ws.url === url && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.close(true);
    this.setStatus(this.retry > 0 ? 'reconnecting' : 'connecting');
    try {
      this.ws = new WebSocket(url);
    } catch { this.scheduleReconnect(); return; }

    // Watchdog: if the socket never opens, switch to REST polling.
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== 1) this.startPolling();
    }, WS_OPEN_TIMEOUT);

    this.ws.onopen = () => { this.retry = 0; clearTimeout(this.openTimer); this.stopPolling(); this.setStatus('connected'); };
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const d = msg.data;
        if (!d || !d.s) return;
        const pair = d.s.toLowerCase();
        const symbol = PAIR_TO_SYMBOL[pair];
        if (!symbol) return;
        const tick = {
          price: parseFloat(d.c),
          changePercent: parseFloat(d.P),
          change: parseFloat(d.p),
          high: parseFloat(d.h),
          low: parseFloat(d.l),
          volume: parseFloat(d.v),
          ts: Date.now(),
        };
        this.ticks.set(pair, tick);
        this.tickListeners.forEach((fn) => { try { fn(symbol, tick); } catch { /* noop */ } });
      } catch { /* ignore malformed frame */ }
    };
    this.ws.onclose = () => { if (this.streamNames().length) this.scheduleReconnect(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch { /* noop */ } };
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.retry += 1;
    // After a couple of failed attempts, rely on REST polling so the UI shows
    // real data instead of a permanent "Reconnecting…" state.
    if (this.retry >= 2) this.startPolling();
    else this.setStatus('reconnecting');
    const delay = Math.min(1000 * 2 ** Math.min(this.retry, 5), 15000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  close(silent) {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.openTimer);
    if (this.streamNames().length === 0) this.stopPolling();
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null;
      try { this.ws.close(); } catch { /* noop */ }
      this.ws = null;
    }
    if (!silent && this.streamNames().length === 0) this.setStatus('idle');
  }
}

const liveFeed = new BinanceFeed();
export default liveFeed;
