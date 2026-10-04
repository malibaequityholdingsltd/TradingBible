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

const WS_BASE = 'wss://stream.binance.com:9443/stream';
const WS_OPEN_TIMEOUT = 6000;
const MAX_RECONNECT_DELAY = 15000;

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

  activePairs() {
    return [...this.counts.keys()].filter((p) => (this.counts.get(p) || 0) > 0);
  }

  // Subscribe one symbol. Returns an unsubscribe fn. Events are routed only
  // to listeners of the matching symbol, so panes never cross-contaminate.
  subscribe(symbol, { onDepth, onTrade } = {}) {
    const pair = symbolToPair(symbol);
    if (!pair) return () => {};
    this.counts.set(pair, (this.counts.get(pair) || 0) + 1);
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
    if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) { this.setStatus('offline'); return; }
    const pairs = this.activePairs();
    if (pairs.length === 0) return;
    const streams = pairs.flatMap((p) => [`${p}@depth20@100ms`, `${p}@aggTrade`]);
    const url = `${WS_BASE}?streams=${streams.join('/')}`;
    if (this.ws && this.ws.url === url && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.close(true);
    this.setStatus(this.retry > 0 ? 'reconnecting' : 'connecting');
    try {
      this.ws = new WebSocket(url);
    } catch { this.scheduleReconnect(); return; }

    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== 1) this.scheduleReconnect();
    }, WS_OPEN_TIMEOUT);

    this.ws.onopen = () => { this.retry = 0; clearTimeout(this.openTimer); this.setStatus('connected'); };
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
          if (Number.isFinite(trade.price) && Number.isFinite(trade.qty)) {
            this.tradeListeners.get(m[1])?.forEach((fn) => { try { fn(trade); } catch { /* noop */ } });
          }
        }
      } catch { /* ignore malformed frame */ }
    };
    this.ws.onclose = () => { if (this.activePairs().length) this.scheduleReconnect(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch { /* noop */ } };
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.retry += 1;
    this.setStatus('reconnecting');
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
    if (!silent && this.activePairs().length === 0) this.setStatus('idle');
  }
}

const orderflowFeed = new OrderflowFeed();
export default orderflowFeed;
