# API Reference

Base URL: `https://tradingbible.app/api` (local: `http://localhost:3001`).

All responses are JSON. Non-2xx responses use `{ "error": "..." }`.

## Market Data

### `GET /market-data`

Real-time ticker/state for the configured market. Query: `symbols` (comma-separated, optional), `interval`. Returns quotes with source attribution (`binance | alphavantage | finnhub | synthetic`).

### `GET /quotes?symbols=BTCUSD,ETHUSD,AAPL`

Live quotes for up to 60 symbols. Crypto is batched from Binance 24h stats; US equities from Finnhub; everything else falls back to Alpha Vantage or synthetic. Symbol names are canonicalized (`BTCUSDT → BTCUSD`, `PAXGUSDT → XAUUSD`).

Response shape:

```json
{ "quotes": [{ "symbol": "BTCUSD", "price": 61234.5, "changePercent": 1.23, "high": 0, "low": 0, "volume": 0, "source": "binance" }], "delayed": false }
```

### `GET /candles?symbol=BTCUSD&interval=1h&limit=150`

OHLCV candles. `interval` ∈ `1m,5m,15m,30m,1h,4h,1d,1w,1M`. Crypto → Binance klines; else Alpha Vantage → synthetic fallback.

```json
{ "symbol": "BTCUSD", "interval": "1h", "source": "binance", "candles": [{ "time": 1723000000000, "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1 }] }
```

### `GET /intraday|/daily|/weekly|/monthly?symbol=&interval=&limit=`

Timeframe series (default intervals `5m/1d/1w/1M`). Same provider waterfall as `/candles`.

### `GET /indicator?symbol=&interval=&indicator=rsi&period=14&limit=150`

Indicator signals. Supported indicators: RSI, MACD, Bollinger Bands, EMA, SMA, ATR, Stochastic, CCI, OBV, VWAP, Williams %R, ROC, ADX, Momentum.

### `GET /heatmap?symbols=...`

Market heatmap data (sectors/assets with change values).

### `GET /economic-calendar`

Economic events calendar.

## Auth

### `POST /auth/send-email`

**Supabase Send-Email webhook endpoint** — receives signed events (`webhook-id`, `webhook-timestamp`, `webhook-signature`) and emails brand-styled confirmation/magic-link/recovery/invite mail via SMTP. Verifies with `SEND_EMAIL_HOOK_SECRET`; returns `401` on bad signature. **Not for public use.**

## Billing (Paddle)

### `POST /paddle/webhook`

Paddle subscription webhooks (transaction completed, subscription updated, etc.). Applies plan changes and records `billing_events`.

### `POST /paddle/portal`

Generates a Paddle customer portal session for the signed-in user.

## Affiliate

### `POST /affiliate/register`
Registers a user as an affiliate (requires auth).

### `GET /affiliate/summary`
Affiliate stats: code, signups, pending payouts, earnings.

### `GET /affiliate/signup?code=...`
Public landing lookup for a signup link.

## Community / Content

### `GET /ads`
TV broadcast feed — returns `{ settings, ads: [...] }` for TradingBible TV (no auth).

### `POST /ads/:id/view` · `POST /ads/:id/click`
Ad engagement counters (no auth).

### `GET /admin/*` (see `routes/admin.js`)
Admin portal endpoints — require an authenticated user with role `admin` (JWT via `Authorization: Bearer <token>`).

## Security

### `POST /security/csp-report`
CSP violation report collector.

## Errors

- `400` invalid parameters
- `401` missing/invalid auth or webhook signature
- `403` forbidden (non-admin on admin routes)
- `422` validation failure (e.g. bad `interval`)
- `500` internal error

Rate limiting applies globally (express-rate-limit).