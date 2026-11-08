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
| `SMTP_HOST` `SMTP_PORT` | yes | SMTP server (Hostinger: `smtp.hostinger.com:465`, SSL) |
| `SMTP_USER` `SMTP_PASS` | yes | Mailbox credentials (`support@tradingbible.app`) |
| `SMTP_FROM_EMAIL` | | Sender address (defaults to `SMTP_USER`) |
| `SMTP_FROM_NAME` | | Display name (default "TradingBible") |

Verify the mailbox and send one delivery test:

```bash
cd apps/api
npm run smtp:test -- you@example.com
```

The domain has an active SPF record and `p=none` DMARC. For inbox placement, enable DKIM for `tradingbible.app` in the Hostinger email panel (the `hostingermail._domainkey` record is currently absent) and keep the From address on the same domain. Never send production mail from a mismatched domain.

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

## Billing (Stripe — current checkout)

The pricing page and member billing flow use Stripe. Paddle routes remain mounted for legacy compatibility, but the current two-plan surface does not use them.

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | Server key. Use `sk_test_…` for acceptance; use `sk_live_…` only with explicit written authorisation. |
| `STRIPE_PUBLISHABLE_KEY` | yes | Publishable key returned by `/stripe/config`. |
| `STRIPE_WEBHOOK_SECRET` | yes | Signing secret for the Stripe webhook endpoint. |
| `STRIPE_PRICE_PREMIUM` | opt. | Premium monthly price ID. Falls back to the fixed $19.99/month inline price. |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | opt. | Premium annual price ID. Falls back to the fixed $199/year inline price. |
| `STRIPE_PRICE_ACADEMY` | opt. | Academy individual price ID. |
| `STRIPE_PRICE_ACADEMY_FAMILY` | opt. | Academy Family price ID. |
| `STRIPE_PRICE_ACADEMY_PRO` `STRIPE_PRICE_ACADEMY_TEAM` | opt. | Academy Pro/Teams price IDs; fixed inline prices exist for Pro ($199) and Teams ($499). |
| `STRIPE_PRICE_TEAMS` | opt. | Platform Teams price ID, only if Teams is offered. |

Sandbox aliases are `STRIPE_SANDBOX_SECRET_KEY`, `STRIPE_SANDBOX_PUBLISHABLE_KEY` and `STRIPE_SANDBOX_WEBHOOK_SECRET`. See [blocked-items.md](blocked-items.md) for the authorisation and acceptance steps.

### Legacy Paddle

`PADDLE_ENV_OVERRIDE`, `PADDLE_LIVE_*`, `PADDLE_SANDBOX_*` and `PADDLE_PRICE_*` still configure the legacy `/api/paddle` routes. They are not required for the current Stripe checkout.

### Card issuing and TBC rails

| Variable | Required | Description |
|---|---|---|
| `LITHIC_API_KEY` | opt. | Lithic API key. Use a **sandbox** key only until a production programme is approved. |
| `LITHIC_ENVIRONMENT` | | `sandbox` (default) or `production`. Production issuance is hard-disabled in code for now. |
| `LITHIC_SANDBOX_ISSUANCE_ENABLED` | | Set to `true` only in a sandbox environment to enable the authenticated sandbox test-card routes. |
| `LITHIC_WEBHOOK_SECRET` | dep. | Required when Lithic event delivery is enabled; not yet configured. |

The Lithic sandbox key can create and close virtual sandbox cards through `/wallet/cards/*`. PAN/CVV are never stored or returned, and sandbox cards are labeled test-only. No production card is issued or funded; TBC payments return `503 tbc_unavailable` until explicitly authorised. The exact issuer/authorisation requirements are in [blocked-items.md](blocked-items.md).

## Dun & Bradstreet (company DUNS verification)

| Variable | Required | Description |
|---|---|---|
| `DNB_API_BASE` | | Direct+ base URL (default `https://plus.dnb.com`) |
| `DNB_CLIENT_ID` `DNB_CLIENT_SECRET` | opt. | Direct+ OAuth credentials (paid contract). Empty = sandbox stub: `/duns/verify` stores the number as `pending` with labeled test data until credentials are wired |

Go-live checklist (when the DUNS number + Direct+ contract arrive): apply `supabase/migrations/20260820000000_duns_verification.sql`, set `DNB_CLIENT_ID`/`DNB_CLIENT_SECRET` on the VPS `.env`, restart the API, re-verify from `/company` → status flips `pending` → `verified`.

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