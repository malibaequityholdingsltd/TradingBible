# TradingBible

AI-powered trading journal and analytics platform with a Bloomberg-grade terminal experience. Matte-black + gold luxury fintech UI, real-time market data, technical-indicator signals, broker sync, community, academy, and more.

## Features

- **Real-time market data** — crypto via Binance klines, equities/forex via Alpha Vantage (cached), with graceful synthetic fallback so charts never render empty. Endpoints: `/api/quotes`, `/api/candles`, `/api/market-data`, `/api/intraday`, `/api/daily`, `/api/weekly`, `/api/monthly`, `/api/heatmap`, `/api/economic-calendar`.
- **Indicator signals** — `/api/indicator` computes signals from 14 built-in indicators (RSI, MACD, Bollinger, EMA, etc.).
- **Trading terminal** — charts, watchlists, terminal, signals, alerts, journal, reports, risk tools, AI coach, economic calendar.
- **TradingBible TV** — broadcast ad system with rotation settings, view/click tracking.
- **Broker & prop-firm sync** — connected accounts, P&L tracking.
- **Community & Academy** — user forum with live leaderboard (ranked by real contributions) and an academy waitlist.
- **Monetization** — Paddle billing (trial/pro/elite/professional plans), affiliate program, user API keys, admin platform.
- **Auth** — Supabase GoTrue (OTP / magic links / webauthn passkeys) with branded emails sent via a verified Send-Email webhook hook.

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Web        | React 18 + Vite + Tailwind CSS + lucide-react + Recharts + lightweight-charts |
| API        | Node.js + Express 5 (ESM), helmut, rate limiting, standardwebhooks |
| Database   | Supabase (Postgres) — auth, RLS, REST |
| Email      | Nodemailer via SMTP (Hostinger), Supabase Send Email hook |
| Billing    | Paddle |
| Deployment | VPS (Ubuntu) + PM2 + Nginx + Let's Encrypt |

## Repository Layout

```
apps/
  web/     React SPA (port 3000 in dev, static build for production)
  api/     Express API (port 3001) — market data, indicators, webhooks, admin
supabase/
  migrations/   SQL migrations (schema, RLS policies, functions)
deploy/         VPS deployment scripts, nginx config
docs/           Documentation (architecture, API reference, environment, deployment)
```

## Quick Start

```bash
npm install                 # install all workspaces
cp apps/api/.env.example apps/api/.env   # fill in keys (see docs/environment.md)
cp apps/web/.env.example apps/web/.env   # Supabase URL + anon key

npm run dev                 # web on http://localhost:3000, api on http://localhost:3001
```

## Production Build

```bash
npm run build               # builds apps/web → dist/apps/web
npm run start               # serves the API (web is served statically by nginx)
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Environment Variables](docs/environment.md)
- [Database Schema](docs/database.md)
- [Deployment (VPS)](docs/deployment.md)

## Repository

- **Owner:** Maliba Equity Holdings Ltd.
- This repository is managed with [opencode](https://opencode.ai) — an AI-native CLI — see `AGENTS.md` for workspace conventions.