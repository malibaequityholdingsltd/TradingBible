# Environment Variables

Both apps load `.env` from their own directory (`node --env-file=.env` for the API; Vite for the web app). See `apps/api/.env.example` and `apps/web/.env.example`. **Never commit real `.env` files** (they are gitignored).

## Server

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | | API port (3001) |
| `CORS_ORIGIN` | yes | Allowed web origin (`https://tradingbible.app`) |
| `CORS_ORIGINS` | opt. | Comma-separated additional allowed origins. Do not use `*` with credentials. |
| `TRUST_PROXY` | opt. | Number of trusted reverse-proxy hops. Production defaults to `1` (local Nginx). Set `false` only when the API is directly exposed. |
| `HELMET_HSTS` | opt. | Set `false` only when Nginx is the sole owner of the HSTS header. Keep one owner for each security header. |

## Supabase (primary data layer)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | Publishable key (web + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key (RLS bypass) |
| `SEND_EMAIL_HOOK_SECRET` | yes in production | `whsec_…` secret for the Supabase Send Email hook. **Must match** the secret configured in the Supabase dashboard (stored as `v1,whsec_…`); the API strips the `v1,` prefix on verify. When empty, development may accept unsigned hook calls; production returns `503`. |

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

## Company communications

| Variable | Required | Description |
|---|---|---|
| `COMPANY_POSTAL_ADDRESS` | for commercial email | Physical postal address in the marketing footer. Empty keeps marketing templates blocked. |
| `EMAIL_LOGO_URL` | opt. | Absolute logo URL for the email shell. Defaults to `APP_URL/logos/tradingbible-logo.png`. |
| `APP_URL` | yes | Public base URL used for logo, unsubscribe and in-app links. |

The admin **Brand communications** page can preview all 45 templates and send a
single test email to the signed-in administrator. It is not a bulk sender.
SMS remains design-only until a provider, consent records, quiet hours and
opt-out handling exist. Fundraising templates remain restricted and
counsel-gated.

## Controlled investor letters

The admin **Investor letters** console is a separate, server-gated sender for
two audiences only:

- `private_506b` — one-to-one Rule 506(b) introductions to people with a
  pre-existing substantive relationship. No general solicitation and no
  offering terms in the email.
- `reg_cf` — confirmed investor-update subscribers. Pre-launch copy is
  educational and non-offering. Campaign-live, reminder and closing copy
  require an SEC-qualified offering and the registered intermediary.

| Variable | Required | Description |
|---|---|---|
| `INVESTOR_LETTERS_SECRET` | yes for real sends | Dedicated HMAC secret for unsubscribe links. At least 32 random characters. Do not reuse the SMTP password or Supabase service key. |
| `REG_CF_OFFERING_STATUS` | for Reg CF | `prelaunch` (default), `qualified` or `closed`. Any other non-empty value is treated as unknown and blocks the live path. |
| `REG_CF_INTERMEDIARY` | for Reg CF live | Legal name of the FINRA-registered intermediary conducting the offering. |
| `REG_CF_OFFERING_URL` | for Reg CF live | URL of the intermediary’s qualified offering page. |
| `COMPANY_POSTAL_ADDRESS` | yes for real sends | Physical postal address in the commercial footer. |
| `LEGAL_EMAIL` | yes for real sends | Reply-to and legal contact in the letter. |
| `SMTP_*` | yes for real sends | The same mailbox used for transactional email. |

Real sends remain blocked unless SMTP, postal address, counsel approval
(counsel name, reference and date), a dedicated unsubscribe secret and the
track-specific confirmations are recorded. The server re-checks the gate; the
UI is not the only control. A campaign that already delivered at least one
letter cannot be retried. Prepare a fresh campaign for the remaining active
recipients.

Runtime state is stored in `apps/api/storage/investor-letters/letters.json`
with mode `0600`. It contains contact emails, consent sources, approval
references and the send log. Never commit it, serve it statically or delete it
during deployment.

## Workforce compliance

The admin **Workforce compliance** console records employer controls,
employee-file evidence, onboarding, offboarding and policy adoption. It uses
the existing employee directory and payroll roster; it does not create a
second employee record.

Runtime state is stored in `apps/api/storage/workforce/compliance.json` with
mode `0600`. It contains evidence references and audit history, not identity
documents, medical records, bank details or tax identifiers. Preserve it during
deployment.

Build the controlled workforce document pack with:

```sh
node scripts/build-workforce-documents.mjs
```

Outputs are written to `apps/api/storage/hr-documents/`. The documents remain
controlled templates until counsel review and adoption are recorded in the
register. No environment flag makes a document adopted, an EIN issued, a
payroll registration active, an insurance policy effective or a benefit
entitlement real.

## Security programme

The admin **Security and resilience** console at `/admin/security` is the live
control register for the security programme. It records control status,
evidence references, risks, incidents, supplier assessments, acceptance tests,
training and access reviews.

Runtime state is stored in `apps/api/storage/security/programme.json` with mode
`0600`. It contains evidence references and incident summaries, not
credentials, private keys, customer records or full incident evidence. Preserve
it during deployment and include it in encrypted backups.

A control marked `implemented` or `verified` must have a real evidence
reference. A `verified` control is expected to have dated test evidence. A
`not_applicable` control requires an explanatory note. The platform does not
configure Cloudflare, Hostinger, Tailscale, Supabase or the host firewall; those
changes are controlled by the runbooks in `docs/security/`.

Run the repository preflight:

```sh
npm run security:audit
```

The script checks for tracked environment files, common credential patterns,
server-side Supabase keys in browser source, explicit proxy trust, auth rate
limits, security route protection, restricted register permissions and required
security artefacts. It is not a substitute for dependency scanning, SAST, DAST
or independent penetration testing.

The production hardening templates are in `deploy/security/`. Do not apply them
without the preflight, backup, recovery path and authorization in
`docs/security/12-PRODUCTION-HARDENING-RUNBOOK.md`.

## Fundraising execution gate

| Variable | Required | Description |
|---|---|---|
| `FUNDRAISING_EXECUTION_ENABLED` | no | `true` unlocks DocuSign envelope creation/sending for the confidential fundraising packet. Leave `false` until board authorization and counsel review of the exact document version. The API returns `409 fundraising_execution_disabled` while locked. |

The gate is separate from the TBC legal-vault and TB stock controls. Setting it
does not make the documents executable or the offering qualified.

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
| `LITHIC_SANDBOX_ALLOW_ALL_USERS` | | `false` by default; sandbox test cards are limited to administrators. Set `true` only on a dedicated staging instance. |
| `LITHIC_WEBHOOK_SECRET` | dep. | Required when Lithic event delivery is enabled; not yet configured. |

The Lithic sandbox key can create and close virtual sandbox cards through `/wallet/cards/*`. PAN/CVV are never stored or returned, and sandbox cards are labeled test-only. No production card is issued or funded; TBC payments return `503 tbc_unavailable` until explicitly authorised. The exact issuer/authorisation requirements are in [blocked-items.md](blocked-items.md).

## Dun & Bradstreet (company DUNS verification)

| Variable | Required | Description |
|---|---|---|
| `DNB_API_BASE` | | Direct+ base URL (default `https://plus.dnb.com`) |
| `DNB_CLIENT_ID` `DNB_CLIENT_SECRET` | opt. | Direct+ OAuth credentials (paid contract). Empty = sandbox stub: `/duns/verify` stores the number as `pending` with labeled test data until credentials are wired |

Go-live checklist (when the DUNS number + Direct+ contract arrive): apply `supabase/migrations/20260820000000_duns_verification.sql`, set `DNB_CLIENT_ID`/`DNB_CLIENT_SECRET` on the VPS `.env`, restart the API, re-verify from `/company` → status flips `pending` → `verified`.

## Broker credential vault

| Variable | Required | Description |
|---|---|---|
| `VAULT_ENCRYPTION_KEY` | for broker sync | 32-byte hex key (`openssl rand -hex 32`) used for AES-256-GCM encryption of broker credentials. Keep it server-side, never in the browser, and back it up separately from the ciphertext. |

The vault returns only metadata to clients. Broker passwords are never requested or stored. Read-only OAuth or API keys are preferred for journaling integrations.

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