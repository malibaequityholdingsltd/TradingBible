import React, { useEffect, useRef } from 'react';

// Real TradingView Advanced Chart terminal (free website embed).
// Use when the trader wants the exact TradingView look, tools and data.
// Drawings/indicators inside are TradingView-native (saved by TradingView,
// not in the TradingBible journal).

function tvSymbol(symbol) {
  const s = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tvMap = {
    XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD',
    WTIUSD: 'TVC:USOIL', BRENT: 'TVC:UKOIL', NATGAS: 'TVC:NATGAS',
    NQ: 'CME_MINI:NQ1!', ES: 'CME_MINI:ES1!', DJI: 'DJ:DJI', SPX: 'SP:SPX',
    RUT: 'CME_MINI:RTY1!', VIX: 'TVC:VIX',
  };
  if (tvMap[s]) return tvMap[s];
  if (/^[A-Z]{6}$/.test(s) && (s.endsWith('USD') || s.endsWith('EUR') || s.endsWith('GBP') || s.endsWith('JPY'))) return `FX:${s}`;
  const m = s.match(/^([A-Z]{2,10})USD$/);
  if (m) return `BINANCE:${m[1]}USDT`;
  return s || 'BTCUSD';
}

const TV_INTERVALS = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W', '1M': 'M' };

export default function TradingViewChart({ symbol = 'BTCUSD', timeframe = '1h', dark = true, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    mount.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.width = '100%';
    inner.style.height = '100%';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol(symbol),
      interval: TV_INTERVALS[timeframe] || '60',
      timezone: 'Etc/UTC',
      theme: dark ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      support_host: 'https://www.tradingview.com',
    });
    wrap.appendChild(inner);
    wrap.appendChild(script);
    mount.appendChild(wrap);
    return () => { try { mount.innerHTML = ''; } catch { /* ignore */ } };
  }, [symbol, timeframe, dark]);

  return <div ref={mountRef} className={`h-full min-h-0 w-full [&_iframe]:!h-full [&_iframe]:!w-full ${className}`} />;
}
