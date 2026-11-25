// Order-flow feed: live Binance depth + executed trades for MULTIPLE symbols.
//
// Uses the public, key-less Binance WebSocket (same as liveFeed):
//   <pair>@depth20@100ms  → top-20 bids/asks snapshot every 100ms
//   <pair>@aggTrade       → every executed (aggregated) trade with price/qty/side
// One pooled connection carries every subscribed pair; the manager reconnects
// with backoff. Only crypto is supported for depth — forex/stocks have no
// public book.

// Full pair registry (app symbol -> Binance pair). Covers every coin in the
// liveFeed crypto registry so Order Flow supports ALL pairs, not a subset.
const CRYPTO_MAP = {
  BTCUSD: 'btcusdt', ETHUSD: 'ethusdt', SOLUSD: 'solusdt', BNBUSD: 'bnbusdt',
  XRPUSD: 'xrpusdt', ADAUSD: 'adausdt', DOGEUSD: 'dogeusdt', AVAXUSD: 'avaxusdt',
  LTCUSD: 'ltcusdt', DOTUSD: 'dotusdt', MATICUSD: 'maticusdt', LINKUSD: 'linkusdt',
  TRXUSD: 'trxusdt', ATOMUSD: 'atomusdt', UNIUSD: 'uniusdt', NEARUSD: 'nearusdt',
  APTUSD: 'aptusdt', FILUSD: 'filusdt', ICPUSD: 'icpusdt', ETCUSD: 'etcusdt',
  ARBUSD: 'arbusdt', OPUSD: 'opusdt', SUIUSD: 'suiusdt', SEIUSD: 'seiusdt',
  TIAUSD: 'tiausdt', ONDOUSD: 'ondousdt', INJUSD: 'injusdt', STXUSD: 'stxusdt',
  IMXUSD: 'imxusdt', HBARUSD: 'hbarusdt', VETUSD: 'vetusdt', ALGOUSD: 'algousdt',
  QNTUSD: 'qntusdt', GRTUSD: 'grtusdt', THETAUSD: 'thetausdt', EGLDUSD: 'egldusdt',
  RUNEUSD: 'runeusdt', KASUSD: 'kasusdt', FETUSD: 'fetusdt', RENDERUSD: 'renderusdt',
  GALAUSD: 'galausdt', SANDUSD: 'sandusdt', MANAUSD: 'manausdt', AXSUSD: 'axsusdt',
  AAVEUSD: 'aaveusdt', MKRUSD: 'mkrusdt', LDOUSD: 'ldousdt', ENAUSD: 'enausdt',
  PENDLEUSD: 'pendleusdt', JUPUSD: 'jupusdt', PYTHUSD: 'pythusdt', WLDUSD: 'wldusdt',
  PEPEUSD: 'pepeusdt', SHIBUSD: 'shibusdt', BONKUSD: 'bonkusdt', WIFUSD: 'wifusdt',
  FLOKIUSD: 'flokiusdt', JASMYUSD: 'jasmyusdt', ORDIUSD: 'ordiusdt', BLURUSD: 'blurusdt',
};

export const ALL_SYMBOLS = Object.keys(CRYPTO_MAP);
const PAIR_TO_SYMBOL = Object.fromEntries(Object.entries(CRYPTO_MAP).map(([s, p]) => [p, s]));

// App symbol (BTCUSD) -> Binance pair (btcusdt).
export function symbolToPair(sym) {
  return CRYPTO_MAP[String(sym || '').toUpperCase()] || null;
}

export function isFlowSymbol(sym) {
  return Boolean(symbolToPair(sym));
}

import apiServerClient from '@/lib/apiServerClient';

const WS_BASE = 'wss://stream.binance.com:9443/stream';
const WS_OPEN_TIMEOUT = 1500;
const MAX_RECONNECT_DELAY = 15000;
const POLL_MS = 3000;

class OrderflowFeed {
  constructor() {
    this.ws = null;
    this.counts = new Map(); // pair -> subscriber ref count
    this.depthListeners = new Map(); // pair -> Set(fn({ symbol, bids, asks, ts }))
    this.tradeListeners = new Map(); // pair -> Set(fn({ symbol, price, qty, side, ts }))
    this.statusListeners = new Set(); // fn(status)
    this.status = 'idle'; // idle | connecting | connected | reconnecting | offline
    this.retry = 0;
    this.reconnectTimer = null;
    this.openTimer = null;
    this.pollTimer = null;
    this.pollBusy = false;
    this.pollFailures = 0;
    this.pollHealthy = false;
    this.lastTradeId = new Map();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.connect());
      window.addEventListener('offline', () => { this.stopPolling(); this.setStatus('offline'); });
    }
  }

  setStatus(s) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((fn) => { try { fn(s); } catch { /* noop */ } });
  }

  onStatus(fn) { this.statusListeners.add(fn); fn(this.status); return () => this.statusListeners.delete(fn); }

  activePairs() {
    return [...this.counts.keys()].filter((p) => (this.counts.get(p) || 0) > 0);
  }

  // Subscribe one symbol. Returns an unsubscribe fn. Events are routed only
  // to listeners of the matching symbol, so panes never cross-contaminate.
  subscribe(symbol, { onDepth, onTrade } = {}) {
    const pair = symbolToPair(symbol);
    if (!pair) return () => {};
    const first = !this.counts.has(pair);
    this.counts.set(pair, (this.counts.get(pair) || 0) + 1);
    if (first) this.lastTradeId.delete(pair);
    if (onDepth) {
      if (!this.depthListeners.has(pair)) this.depthListeners.set(pair, new Set());
      this.depthListeners.get(pair).add(onDepth);
    }
    if (onTrade) {
      if (!this.tradeListeners.has(pair)) this.tradeListeners.set(pair, new Set());
      this.tradeListeners.get(pair).add(onTrade);
    }
    this.retry = 0;
    this.connect();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const n = (this.counts.get(pair) || 1) - 1;
      if (n <= 0) {
        this.counts.delete(pair);
        this.depthListeners.delete(pair);
        this.tradeListeners.delete(pair);
        this.lastTradeId.delete(pair);
      } else {
        this.counts.set(pair, n);
        if (onDepth) this.depthListeners.get(pair)?.delete(onDepth);
        if (onTrade) this.tradeListeners.get(pair)?.delete(onTrade);
      }
      if (this.activePairs().length === 0) this.close();
      else this.connect(); // re-open with the reduced stream set
    };
  }

  // Legacy single-symbol API (kept for compatibility).
  watch(symbol) {
    this._legacyUnsub?.();
    this._legacyUnsub = this.subscribe(symbol, {});
  }

  unwatch() {
    this._legacyUnsub?.();
    this._legacyUnsub = null;
  }

  connect() {
    if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) { this.stopPolling(); this.setStatus('offline'); return; }
    const pairs = this.activePairs();
    if (pairs.length === 0) { this.stopPolling(); return; }
    const streams = pairs.flatMap((p) => [`${p}@depth20@100ms`, `${p}@aggTrade`]);
    const url = `${WS_BASE}?streams=${streams.join('/')}`;
    if (this.ws && this.ws.url === url && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      if (this.ws.readyState === 1) this.stopPolling();
      return;
    }
    this.close(true);
    this.setStatus(this.retry > 0 ? 'reconnecting' : 'connecting');
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.startPolling();
      this.scheduleReconnect();
      return;
    }

    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== 1) {
        this.startPolling();
        this.scheduleReconnect();
      }
    }, WS_OPEN_TIMEOUT);

    this.ws.onopen = () => {
      this.retry = 0;
      this.pollHealthy = false;
      this.pollFailures = 0;
      this.stopPolling();
      clearTimeout(this.openTimer);
      this.setStatus('connected');
    };
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const stream = msg.stream || '';
        const d = msg.data;
        if (!d) return;
        const m = stream.match(/^([a-z0-9]+)@(depth20@100ms|aggTrade)$/);
        if (!m) return;
        const symbol = PAIR_TO_SYMBOL[m[1]];
        if (!symbol) return;
        if (m[2] === 'depth20@100ms') {
          const depth = {
            symbol,
            bids: (d.bids || []).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
            asks: (d.asks || []).map(([p, q]) => [parseFloat(p), parseFloat(q)]),
            ts: Date.now(),
          };
          this.depthListeners.get(m[1])?.forEach((fn) => { try { fn(depth); } catch { /* noop */ } });
        } else {
          // m === true means the buyer was the maker → seller-initiated (sell).
          const trade = {
            symbol,
            price: parseFloat(d.p),
            qty: parseFloat(d.q),
            side: d.m ? 'sell' : 'buy',
            ts: d.T || Date.now(),
          };
          this.emitTrade(m[1], trade);
        }
      } catch { /* ignore malformed frame */ }
    };
    this.ws.onclose = () => {
      this.startPolling();
      if (this.activePairs().length) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      this.startPolling();
      try { this.ws.close(); } catch { /* noop */ }
    };
  }

  emitTrade(pair, trade) {
    if (!Number.isFinite(trade.price) || !Number.isFinite(trade.qty)) return;
    if (!trade.ts) trade.ts = Date.now();
    this.tradeListeners.get(pair)?.forEach((fn) => { try { fn(trade); } catch { /* noop */ } });
  }

  // REST fallback used when the browser cannot reach Binance's WebSocket
  // (regional blocks, corporate proxies, offline CSP). It short-polls the
  // server-side proxy and replays only trades newer than the last seen id.
  startPolling() {
    if (typeof window === 'undefined' || this.pollTimer) return;
    if (this.ws && this.ws.readyState === 1) return;
    if (!this.activePairs().length) return;
    const tick = async () => {
      this.pollTimer = null;
      if (!this.activePairs().length) { this.stopPolling(); return; }
      if (this.ws && this.ws.readyState === 1) { this.stopPolling(); return; }
      await this.pollOnce();
      if (this.activePairs().length && (!this.ws || this.ws.readyState !== 1)) {
        this.pollTimer = setTimeout(tick, POLL_MS);
      }
    };
    this.pollTimer = setTimeout(tick, 0);
  }

  stopPolling() {
    clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  async pollOnce() {
    if (this.pollBusy) return;
    this.pollBusy = true;
    try {
      const pairs = this.activePairs();
      const results = await Promise.allSettled(pairs.map((pair) => this.pollPair(pair)));
      if (results.some((r) => r.status === 'fulfilled')) {
        this.pollFailures = 0;
        this.pollHealthy = true;
        this.setStatus('connected');
      } else {
        this.pollFailures += 1;
        this.pollHealthy = false;
        if (this.pollFailures > 1 && this.status !== 'connected') this.setStatus('reconnecting');
      }
    } finally {
      this.pollBusy = false;
    }
  }

  async pollPair(pair) {
    // A WebSocket that came up while this request was in flight wins.
    if (this.ws && this.ws.readyState === 1) return;
    const symbol = PAIR_TO_SYMBOL[pair];
    if (!symbol) throw new Error('unknown pair');
    const res = await apiServerClient.fetch(`/orderflow?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`orderflow ${res.status}`);
    const data = await res.json();
    if (this.ws && this.ws.readyState === 1) return;
    const bids = (data.depth?.bids || []).map(([p, q]) => [Number(p), Number(q)]);
    const asks = (data.depth?.asks || []).map(([p, q]) => [Number(p), Number(q)]);
    if (bids.length && asks.length) {
      const depth = { symbol, bids, asks, ts: Number(data.ts) || Date.now() };
      this.depthListeners.get(pair)?.forEach((fn) => { try { fn(depth); } catch { /* noop */ } });
    }
    const rows = Array.isArray(data.trades) ? data.trades : [];
    const last = this.lastTradeId.get(pair) || 0;
    const fresh = rows
      .filter((t) => Number.isFinite(Number(t.id)) && Number(t.id) > last)
      .sort((a, b) => Number(a.id) - Number(b.id));
    const emit = last === 0 ? fresh.slice(-40) : fresh;
    for (const t of emit) {
      this.emitTrade(pair, {
        symbol,
        price: Number(t.price),
        qty: Number(t.qty),
        side: t.side === 'sell' ? 'sell' : 'buy',
        ts: Number(t.ts) || Date.now(),
      });
    }
    if (fresh.length) this.lastTradeId.set(pair, Number(fresh[fresh.length - 1].id));
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.retry += 1;
    if (!this.pollHealthy) this.setStatus('reconnecting');
    const delay = Math.min(1000 * 2 ** Math.min(this.retry, 5), MAX_RECONNECT_DELAY);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  close(silent) {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.openTimer);
    if (this.ws) {
      this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null;
      try { this.ws.close(); } catch { /* noop */ }
      this.ws = null;
    }
    if (!silent && this.activePairs().length === 0) {
      this.stopPolling();
      this.pollHealthy = false;
      this.setStatus('idle');
    }
  }
}

const orderflowFeed = new OrderflowFeed();
export default orderflowFeed;
