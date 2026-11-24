// Terminal 2.0 focus chrome.
//
// The fullscreen terminal is a single, deliberate surface: a command deck at
// the top, the chart at the centre, a market/execution rail on the right and
// a quiet status line at the bottom. Everything here is presentational; the
// chart engine and the desk state stay in TradingBibleChart and
// TerminalPremiumPage.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Bell, Camera, ChevronDown, CircleDot, Layers,
  Minimize2, PanelRight, Share2, Wallet, X,
} from 'lucide-react';
import SymbolSearchPicker from '@/components/SymbolSearchPicker';
import { TRADINGBIBLE_LOGO } from '@/components/BrandLogo';

const QUICK_TFS = ['1m', '5m', '15m', '1h', '4h', '1d'];

function fmtPx(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 2 : 5 });
}

function fmtMoney(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function changeText(change) {
  const n = Number(change);
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function FocusTopBar({
  brandHref = '',
  symbol,
  symbolName,
  timeframe,
  chartType,
  price,
  change,
  status,
  showSim = false,
  showClosed = false,
  indicators = 0,
  onSymbolChange,
  onTimeframeChange,
  onChartTypeChange,
  onIndicators,
  onSnapshot,
  onShare,
  onExit,
  onOpenMarket,
  alertHref = '',
}) {
  const up = (Number(change) || 0) >= 0;
  return (
    <header className="tb-focus-top">
      <div className="tb-focus-top__lead">
        {brandHref ? (
          <Link to={brandHref} className="tb-focus-brand" aria-label="Open the TradingBible public terminal">
            <img src={TRADINGBIBLE_LOGO} alt="TradingBible" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          </Link>
        ) : (
          <span className="tb-focus-brand" aria-hidden>
            <img src={TRADINGBIBLE_LOGO} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          </span>
        )}
        <div className="tb-focus-top__titles">
          <span className="tb-focus-kicker">TRADINGBIBLE <b>TERMINAL</b></span>
          <div className="tb-focus-top__symbol-row">
            <SymbolSearchPicker
              value={symbol}
              onChange={onSymbolChange}
              buttonClassName="tb-focus-symbol-picker"
              dropdownClassName="!z-[170]"
            />
            <span className="tb-focus-name">{symbolName}</span>
            {showSim && <span className="tb-focus-tag is-sim">SIM</span>}
            {showClosed && <span className="tb-focus-tag is-closed">CLOSED</span>}
          </div>
        </div>
      </div>

      <div className="tb-focus-top__quote" aria-label={`${symbol} ${fmtPx(price)} ${changeText(change)}`}>
        <span className="tb-focus-price">{fmtPx(price)}</span>
        <span className={`tb-focus-change ${up ? 'is-up' : 'is-down'}`}>{changeText(change)}</span>
        <span className={`tb-focus-pulse ${status === 'live' ? 'is-live' : ''}`}>
          <i aria-hidden /> {status === 'live' ? 'LIVE' : String(status || 'FEED').toUpperCase()}
        </span>
      </div>

      <div className="tb-focus-top__controls">
        <div className="tb-focus-tfs" role="group" aria-label="Chart timeframe">
          {QUICK_TFS.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={timeframe === tf ? 'is-active' : ''}
              aria-pressed={timeframe === tf}
            >
              {tf}
            </button>
          ))}
        </div>
        <label className="tb-focus-select-wrap">
          <span className="sr-only">Chart type</span>
          <select value={chartType} onChange={(event) => onChartTypeChange(event.target.value)} className="tb-focus-select">
            <option value="candle">Candles</option>
            <option value="hollow">Hollow</option>
            <option value="bar">Bars</option>
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="baseline">Baseline</option>
          </select>
          <ChevronDown aria-hidden />
        </label>
        <button type="button" className="tb-focus-tool tb-focus-tool--label" onClick={onIndicators} title="Indicators">
          <Layers aria-hidden />
          <span>Indicators</span>
          <b>{indicators}</b>
        </button>
        <span className="tb-focus-divider" aria-hidden />
        <button type="button" className="tb-focus-tool tb-focus-tool--optional" onClick={onSnapshot} title="Snapshot to journal" aria-label="Snapshot to journal">
          <Camera aria-hidden />
        </button>
        <button type="button" className="tb-focus-tool tb-focus-tool--optional" onClick={onShare} title="Share this view" aria-label="Share this view">
          <Share2 aria-hidden />
        </button>
        {alertHref ? (
          <Link to={alertHref} className="tb-focus-tool" title="Price alerts" aria-label="Price alerts">
            <Bell aria-hidden />
          </Link>
        ) : null}
        <button type="button" className="tb-focus-tool tb-focus-tool--exit" onClick={onExit} title="Exit fullscreen" aria-label="Exit fullscreen">
          <Minimize2 aria-hidden />
        </button>
        <button type="button" className="tb-focus-market-btn" onClick={onOpenMarket} aria-label="Open market and order panel">
          <PanelRight aria-hidden />
          <span>Markets</span>
        </button>
      </div>
    </header>
  );
}

export function FocusStatusBar({ status, source, bars, objects, timeframe, chartType, workspace }) {
  return (
    <footer className="tb-focus-status">
      <span className="tb-focus-status__feed">
        <i className={status === 'live' ? 'is-live' : ''} aria-hidden />
        <b>{status === 'live' ? 'LIVE' : String(status || 'FEED').toUpperCase()}</b>
        <span>{source}</span>
      </span>
      <span>{bars} bars</span>
      <span>{objects} objects</span>
      <span className="tb-focus-status__mid">PAPER DESK <em>·</em> MARKET DATA ONLY</span>
      <span>{timeframe} · {chartType}</span>
      <span className="tb-focus-status__workspace">{workspace === 'synced' ? 'WORKSPACE SAVED' : String(workspace || 'LOCAL').toUpperCase()}</span>
      <span className="tb-focus-status__keys"><kbd>⌘</kbd><kbd>K</kbd></span>
    </footer>
  );
}

function RailTabs({ tab, onChange }) {
  return (
    <div className="tb-focus-rail__tabs" role="tablist" aria-label="Market panel">
      {[
        ['markets', 'Markets'],
        ['trade', 'Trade'],
        ['info', 'Info'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={tab === id ? 'is-active' : ''}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FocusMarketRail({ desk, activeSymbol, onSelectSymbol, onClose, mobile = false }) {
  const [tab, setTab] = useState('markets');
  const [qty, setQty] = useState(() => String(desk?.qty || '0.10'));
  useEffect(() => { setQty(String(desk?.qty || '0.10')); }, [desk?.qty]);
  if (!desk) return null;

  const watchlist = Array.isArray(desk.watchlist) ? desk.watchlist : [];
  const accounts = Array.isArray(desk.accounts) ? desk.accounts : [];
  const positions = Array.isArray(desk.positions) ? desk.positions : [];
  const selectedAccount = desk.accountId || '';

  const submit = (side) => {
    const amount = Number(qty);
    if (!(amount > 0)) return;
    desk.onTrade?.(side, amount);
  };

  return (
    <aside className={`tb-focus-rail ${mobile ? 'is-mobile' : ''}`} aria-label="Market and order panel">
      <div className="tb-focus-rail__head">
        <div>
          <span className="tb-focus-rail__eyebrow">DESK</span>
          <strong>{tab === 'markets' ? 'Markets' : tab === 'trade' ? 'Execute' : 'Session'}</strong>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close market panel" className="tb-focus-rail__close">
            <X aria-hidden />
          </button>
        ) : null}
      </div>
      <RailTabs tab={tab} onChange={setTab} />

      <div className="tb-focus-rail__body">
        {tab === 'markets' && (
          <>
            <div className="tb-focus-rail__section-head">
              <span>Watchlist</span>
              {desk.manageHref ? <Link to={desk.manageHref}>Manage <ArrowUpRight aria-hidden /></Link> : null}
            </div>
            <div className="tb-focus-market-list">
              {watchlist.map((row) => {
                const up = (Number(row.change) || 0) >= 0;
                return (
                  <button
                    key={row.symbol}
                    type="button"
                    onClick={() => onSelectSymbol?.(row.symbol)}
                    className={`tb-focus-market ${row.symbol === activeSymbol ? 'is-active' : ''}`}
                  >
                    <span className="tb-focus-market__id">
                      <b>{row.symbol}</b>
                      <small>{row.name || row.symbol}</small>
                    </span>
                    <span className="tb-focus-market__quote">
                      <b>{fmtPx(row.price)}</b>
                      <small className={up ? 'is-up' : 'is-down'}>{changeText(row.change)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="tb-focus-rail__add">
              <SymbolSearchPicker
                value="Add market…"
                onChange={desk.onAddSymbol}
                buttonClassName="tb-focus-add"
                dropdownClassName="!z-[180]"
              />
            </div>
            <div className="tb-focus-rail__mini">
              <span><i className="is-live" aria-hidden /> Market data</span>
              <span>{desk.feed || 'Live feed'}</span>
            </div>
          </>
        )}

        {tab === 'trade' && (
          <>
            <div className="tb-focus-ticket-head">
              <div>
                <span>{activeSymbol}</span>
                <small>{desk.symbolName || 'Selected market'}</small>
              </div>
              <div className="tb-focus-ticket-price">
                <b>{fmtPx(desk.price)}</b>
                <small className={(Number(desk.change) || 0) >= 0 ? 'is-up' : 'is-down'}>{changeText(desk.change)}</small>
              </div>
            </div>
            <label className="tb-focus-field">
              <span>Paper account</span>
              <select value={selectedAccount} onChange={(event) => desk.onAccountChange?.(event.target.value)}>
                <option value="">Select account…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {String(account.name || '').startsWith('challenge:') ? `🏆 ${account.name}` : account.name} — {fmtMoney(account.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="tb-focus-field">
              <span>Quantity</span>
              <div className="tb-focus-qty">
                <button type="button" onClick={() => setQty((value) => String(Math.max(0.01, Number(value) - 0.01).toFixed(2)))} aria-label="Decrease quantity">−</button>
                <input
                  value={qty}
                  onChange={(event) => setQty(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                />
                <button type="button" onClick={() => setQty((value) => String((Number(value) + 0.01).toFixed(2)))} aria-label="Increase quantity">+</button>
              </div>
            </label>
            <div className="tb-focus-ticket-actions">
              <button type="button" className="is-buy" onClick={() => submit('long')} disabled={!selectedAccount || desk.busy || !Number.isFinite(Number(desk.price))}>
                <span>BUY</span><small>LONG</small>
              </button>
              <button type="button" className="is-sell" onClick={() => submit('short')} disabled={!selectedAccount || desk.busy || !Number.isFinite(Number(desk.price))}>
                <span>SELL</span><small>SHORT</small>
              </button>
            </div>
            {desk.message ? <p className="tb-focus-ticket-message">{desk.message}</p> : null}
            {!accounts.length ? (
              <Link to="/app/challenges" className="tb-focus-ticket-link">Get a challenge account <ArrowUpRight aria-hidden /></Link>
            ) : null}
            <p className="tb-focus-disclaimer">Paper/challenge orders only. Live brokerage execution is not connected in this workspace.</p>
          </>
        )}

        {tab === 'info' && (
          <div className="tb-focus-info">
            {[
              ['Feed', desk.feed || '—'],
              ['Timeframe', desk.timeframe || '—'],
              ['Chart', desk.chartType || '—'],
              ['Workspace', desk.workspace || 'local'],
              ['Challenge', desk.challenge || 'None'],
            ].map(([label, value]) => (
              <div key={label} className="tb-focus-info__row">
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
            <div className="tb-focus-info__block">
              <span>Open positions</span>
              {positions.length ? positions.slice(0, 4).map((position) => (
                <div key={position.id || `${position.symbol}-${position.direction}`} className="tb-focus-position">
                  <div>
                    <b>{position.symbol}</b>
                    <small>{String(position.direction || 'long').toUpperCase()} · {position.size ?? '—'}</small>
                  </div>
                  <span className={(Number(position.pnl) || 0) >= 0 ? 'is-up' : 'is-down'}>
                    {(Number(position.pnl) || 0) >= 0 ? '+' : ''}{Number(position.pnl || 0).toFixed(2)}
                  </span>
                </div>
              )) : <p className="tb-focus-empty">No open positions on this desk.</p>}
            </div>
            <button type="button" className="tb-focus-data-btn" onClick={desk.onOpenData}>
              <Wallet aria-hidden /> Open desk data
            </button>
          </div>
        )}
      </div>

      <div className="tb-focus-rail__foot">
        <span><CircleDot aria-hidden /> PAPER</span>
        <span>v2.0</span>
      </div>
    </aside>
  );
}
