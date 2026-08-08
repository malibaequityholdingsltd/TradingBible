# TradingBible.app

An AI-powered trading journal and analytics platform built on a Bloomberg-grade
terminal experience. Matte-black + gold luxury fintech UI, real-time market data,
technical-indicator signals, broker sync, community, academy, and more.

## Tech Stack

- **Web** — React 18 + Vite + Tailwind CSS + shadcn/ui + Recharts + lightweight-charts (`apps/web`, port 3000)
- **API** — Node.js + Express 5 (`apps/api`, port 3001) — market data, indicator signals, integrations
- **Database / Auth** — Supabase — auth, CRUD, realtime storage

## Project Structure

```
apps/
  web/         React front-end
  api/         Express API (market data, indicator service, webhooks)
```

## Installation

```bash
npm install          # installs all workspaces
cp apps/api/.env.example apps/api/.env   # fill in real API keys
```

## Development

```bash
npm run dev          # starts web + api
```

- Web:        http://localhost:3000
- API:        http://localhost:3001

## Build & Start (production)

```bash
npm run build
npm run start
```

## API — Indicator Signal Service

`GET /indicator?symbol=BTCUSDT&interval=1h`

Fetches OHLCV candles from Binance, computes SMA, EMA, RSI, MACD, Bollinger
Bands, Stochastic, ATR and ADX, then returns an aggregated buy/sell/hold signal
with a confidence score (0–100%).

```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "lastClose": 0,
  "indicators": { },
  "signal": "buy",
  "confidence": 72
}
```

Valid intervals: `1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w`.

## Environment Variables

See `apps/api/.env.example`. Sensitive keys live in `apps/api/.env` and are
never committed (see `.gitignore`).

Web Supabase auth mode (email/password + Google + Apple):

```bash
cp apps/web/.env.example apps/web/.env
# set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

Supabase schema bootstrap SQL is available at `apps/web/supabase/schema.sql`.

## Troubleshooting

- **Signal endpoint returns 502** — Binance API unreachable or rate-limited; retry.
- **Auth emails not arriving** — check Supabase Auth email templates and SMTP settings.
- **Empty dashboard** — expected until a real broker account is connected; the
  app ships with no demo/fake data. All balances start at $0.00.

## Deployment (Hostinger)

The app is deployed on Hostinger Horizons infrastructure.
