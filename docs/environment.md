# Environment Variables

Both apps load `.env` from their own directory (`node --env-file=.env` for the API; Vite for the web app). See `apps/api/.env.example` and `apps/web/.env.example`. **Never commit real `.env` files** (they are gitignored).

## Server

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | | API port (3001) |
| `CORS_ORIGIN` | yes | Allowed web origin (`https://tradingbible.app`) |

## Supabase (primary data layer)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | Publishable key (web + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key (RLS bypass) |
| `SEND_EMAIL_HOOK_SECRET` | dep. | `whsec_…` secret for the Supabase Send Email hook. **Must match** the secret configured in the Supabase dashboard (stored as `v1,whsec_…`); the API strips the `v1,` prefix on verify. Empty disables signature verification. |

## SMTP (branded auth emails)

| Variable | Required | Description |
|---|---|---|
| `SMTP_HOST` `SMTP_PORT` | yes | SMTP server (Hostinger: `smtp.hostinger.com:465`) |
| `SMTP_USER` `SMTP_PASS` | yes | Mailbox credentials |
| `SMTP_FROM_EMAIL` | | Sender address (defaults to `SMTP_USER`) |
| `SMTP_FROM_NAME` | | Display name (default "TradingBible") |

## Market data providers

| Variable | Required | Description |
|---|---|---|
| `ALPHA_VANTAGE_API_KEY` | opt. | Free tier = 25 req/day; responses are cached, missing → synthetic fallback |
| `FINNHUB_API_KEY` | opt. | Live US equity quotes |

## AI

| Variable | Required | Description |
|---|---|---|
| `INTEGRATED_AI_API_URL` `INTEGRATED_AI_API_KEY` | opt. | Integrated AI proxy (Chat endpoint) |
| `WEBSITE_ID` `WEBSITE_DOMAIN` `PROXY_ENTRANCE_ID` | | AI integration metadata |
| `DEEPSEEK_BASE_URL` `DEEPSEEK_API_KEY` | opt. | DeepSeek (OpenAI-compatible) chat fallback |
| `OPENAI_BASE_URL` `OPENAI_API_KEY` | opt. | Generic OpenAI-compatible fallback |
| `OPENCODE_SERVER_URL` `OPENCODE_SERVER_PASSWORD` | opt. | Local opencode gateway (chat-only model) |

## Billing (Paddle)

| Variable | Required | Description |
|---|---|---|
| `PADDLE_ENV_OVERRIDE` | yes | `live` or `sandbox` |
| `PADDLE_LIVE_API_KEY` `PADDLE_LIVE_CLIENT_TOKEN` `PADDLE_LIVE_WEBHOOK_SECRET` | dep. | Live credentials |
| `PADDLE_SANDBOX_*` | dep. | Sandbox credentials |
| `PADDLE_PRICE_PRO` `PADDLE_PRICE_ELITE` `PADDLE_PRICE_PROFESSIONAL` | yes | Price IDs for each plan |

## Circle (optional x402 paywall)

| Variable | Required | Description |
|---|---|---|
| `CIRCLE_X402_ENABLED` | | `false` by default |
| `CIRCLE_X402_SELLER_ADDRESS` | dep. | Seller EVM address |
| `CIRCLE_X402_PRICE` | | e.g. `$0.01` |

## Web app (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Same as API `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | yes | Same as API `SUPABASE_ANON_KEY` |

Other optional web keys (market widget feeds, integrations) are documented in `apps/web/.env.example`.