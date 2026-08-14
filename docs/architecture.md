# Architecture

## Overview

TradingBible is a monorepo with two independent workspaces and a managed Postgres backend:

```
Browser  ──▶ tradingbible.app (nginx: static SPA)
                │
                └─ /api/* ──▶ Express API (pm2, :3001)
                                  │
                                  ├─▶ Binance (crypto quotes/klines)
                                  ├─▶ Alpha Vantage (stock/forex/indices, cached)
                                  ├─▶ Finnhub (US equity quotes)
                                  ├─▶ Paddle (billing webhooks)
                                  └─▶ Supabase (Postgres REST + auth)
```

## Apps

### `apps/web` — React SPA

- Vite + React 18, Tailwind CSS. Routes in `src/App.jsx`.
- **Auth model:** logged-out → `/login`; subscribed (`pro|elite|professional`) → `/app/*`; admins → `/admin` portal; company accounts → `/company`.
- **Data access:** `src/lib/pocketbaseClient.js` is a **Supabase compatibility shim** — pages call `pb.collection(...)` which maps to Supabase REST with RLS. There is no PocketBase anywhere in production.
- **i18n:** 7 languages (en, fr, es, pt, de, ar, zh, hi) in `src/lib/i18n.jsx`.

### `apps/api` — Express API (ESM)

- Boots from `src/main.js`, mounts routes via `src/routes/index.js` (see [API Reference](api.md)).
- Environment loaded with `node --env-file=.env`.
- **Market data chain (provider waterfall):** crypto → Binance → Alpha Vantage → deterministic synthetic. Non-crypto → Alpha Vantage → synthetic. This guarantees charts always render, even when free API keys are throttled (Alpha Vantage free tier: 25 req/day — the TTL cache in `src/utils/alphaVantage.js` compensates).
  - `BTCUSDT`-style symbols are canonicalized to `BTCUSD` before classification (`binanceSymbolFor` in `routes/candles.js`).
- **AI:** `/integrated-ai/*` proxies an AI backend (Chat), optional x402 paywall (Circle), with a DeepSeek/OpenAI-compatible fallback provider.

## Database & Auth (Supabase)

- Schema + RLS policies live in `supabase/migrations/` (single project: `yxuzrishocchfbofqazt`).
- Auth emails are sent through a **Send Email webhook**: Supabase fires a signed event to `POST /api/auth/send-email`; the API verifies the `v1,whsec_…` signature (standardwebhooks) and sends brand-styled emails via SMTP (Hostinger). See `routes/auth-send-email.js`.
- The API talks to Postgres via service-role REST (`src/utils/supabaseClient.js`), RLS protects the data from the browser.

## Background Services (production VPS)

- **PM2** runs `tradingbible-api` (node `--env-file=.env`).
- **Nginx** serves the SPA build from `dist/apps/web/` and proxies `/api/` → `http://127.0.0.1:3001/`.
- **certbot.timer** auto-renews the Let's Encrypt certificate.
- No PocketBase, no Docker — plain VPS. See [Deployment](deployment.md).

## Deployment

See [docs/deployment.md](deployment.md) for the VPS runbook and `deploy/` scripts.