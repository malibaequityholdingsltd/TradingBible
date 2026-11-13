# Public claims and access-control correction

**Date:** 12 November 2026 (UTC deploy: 13 November 2026 02:35 and 02:42)
**Scope:** public product claims, broker UI truthfulness, public signup gate, API administrator allowlist, optional administrator MFA gate and stale internal pricing copy.
**Production:** `https://tradingbible.app`

This record documents a code and content correction. It is not a certification,
audit opinion, legal approval, penetration test or proof that the remaining
launch gates are closed.

## Why this pass was needed

The shipped product did not support several public claims:

- Public copy named brokers without a live adapter. The backend adapters are
  Binance, Bybit and OKX.
- The home page described a `$400K` maximum evaluation size while the live
  catalogue describes a `$200K` maximum account and a `$400K` scaling ceiling.
- Public copy promised “8 live webinars” while the product exposes a weekly
  member webinar-room schedule and replays, not eight confirmed live events.
- The public security page claimed RLS isolation and a “verified staff session”
  before the live RLS audit and administrator MFA enrollment existed.
- The internal company brief still carried the retired Pro / Elite SI /
  Professional pricing structure and projections based on it.
- The API accepted any `@tradingbible.app` or `@tradingbible.net` email as an
  administrator, while the web client used an exact two-address allowlist.
- Providers without a backend adapter could open a connect flow that could not
  succeed.
- Public signup was open even though SMTP authentication and the email hook
  secret were broken, so new users could not receive a verification code.

## Changes made

| Area | Change |
|---|---|
| Public broker claims | Landing, FAQ, feature and legal copy now state that live read-only API sync is currently available for Binance, Bybit and OKX. Other providers appear only when their adapter is live and tested. |
| Broker UI | Unsupported providers remain visible but show “Adapter not live yet” and cannot open a dead-end connect flow. The guard is `LIVE_BROKER_ADAPTERS` in `apps/web/src/pages/ExtraPages.jsx`. |
| Funded-evaluation copy | Home and translated hero copy now say `$200K` maximum account and `$400K` scaling ceiling, matching the live catalogue language. |
| Webinar copy | “8 live webinars” claims were replaced with “weekly SI-hosted webinar rooms” and “schedule and replays in the member area”. No exact live-event count is claimed. |
| Public security page | RLS is described as the designed tenant boundary and is explicitly “being independently verified”; administrator MFA enforcement and email delivery are described as being completed before public signup; broker sync is limited to verified adapters; AES-256-GCM is stated for stored credentials. |
| Admin allowlist | `apps/api/src/routes/admin.js` now uses exact addresses plus an optional `ADMIN_EMAILS` comma-separated allowlist. The catch-all domain rule was removed. Profile `role = admin` still grants access. |
| Optional admin MFA | `ADMIN_MFA_REQUIRED=true` now requires a Supabase AAL2 session with a TOTP, WebAuthn/passkey, SSO or MFA method. It is **not enabled** in production because enrollment and a break-glass path are not yet evidenced. |
| Public signup gate | Public signup is hard-gated by `VITE_PUBLIC_SIGNUP_ENABLED=false` until SMTP/email-code delivery is accepted. Login and admin invitations are unaffected. `/signup` shows the paused state and the home CTA no longer opens signup. |
| Company brief | `docs/company-profile.md` now uses Free + Premium at `$19.99/month` or `$199/year`; the retired three-tier projections were removed rather than recalculated with invented assumptions. |
| Environment documentation | `apps/api/.env.example` and `docs/environment.md` document `ADMIN_EMAILS` and `ADMIN_MFA_REQUIRED`. |

## Verification performed

Local gates:

- `npm run lint` — passed.
- `npm run build` — passed.
- `npm run verify` — passed; Academy parity `17/76/347`, release guards passed,
  security audit passed with one large-artifact warning.
- `npm test --prefix apps/web` — 26 tests passed.

Production checks after rsync and PM2 restart:

- `/`, `/signup`, `/auth`, `/security`, `/pricing`, `/faq`, `/academy`, `/launch`,
  `/legal/terms`, `/privacy`, `/terms`, `/admin/security`, `/api/health` and
  `/.well-known/security.txt` returned `200`.
- `/api/admin/health` returned `401` without an authenticated admin session.
- `/api/auth/send-email` returned `503` because `SEND_EMAIL_HOOK_SECRET` is
  still unset; the email hook remains fail-closed.
- HTML response carried HSTS, CSP, `nosniff`, `SAMEORIGIN`, referrer policy and
  permissions policy. `server: nginx` exposed no version.
- Served bundles contained `$200K`, `$400K` scaling, `Binance, Bybit or OKX`,
  `Weekly SI-hosted webinar rooms`, the RLS verification language, AES-256-GCM,
  and the “Adapter not live yet” guard.
- Served bundles no longer contained `Binance, Deriv`, `Interactive Brokers,
  Alpaca`, `8 live webinars`, `maximum evaluation size`, `Bank-grade`,
  `Row-level security keeps` or `verified staff session`.
- Playwright Chromium check of `/`, `/auth`, `/signup`, `/academy`, `/pricing`,
  `/security`, `/privacy`, `/terms` and `/admin/security`: nine routes, zero
  console errors, page errors, same-origin 4xx/5xx responses or CSP violations.
  A local `ERR_NETWORK_CHANGED`/navigation timeout interrupted one pass; the
  affected routes were retried and passed with zero findings.
- `/` and `/signup` showed the paused-signup state after the build-time gate;
  `/auth` still rendered the login surface.

Remote rollback artifacts:

- `/root/tradingbible-deploy-backups/api-src-20261113T023453Z.tar.gz`
- `/root/tradingbible-deploy-backups/web-dist-20261113T023453Z.tar.gz`
- `/root/tradingbible-deploy-backups/web-dist-20261113T024201Z.tar.gz`

No production `.env` was read or modified. No live payment, investor-letter
send, TBC payment, card issuance or securities activity was performed.

## Remaining limitations

This pass does **not** close these gates:

- Administrator MFA is implemented behind a flag but is not enforced. A named
  administrator must enroll TOTP or a passkey, the break-glass path must be
  tested, and `ADMIN_MFA_REQUIRED=true` must be set in production.
- RLS is still not independently audited. The public page now says so.
- Email delivery is still broken by Hostinger SMTP authentication failure and
  the missing `SEND_EMAIL_HOOK_SECRET`. Public signup is now gated; re-enable it
  only after SMTP/email-code delivery and auth acceptance pass.
- Only Binance, Bybit and OKX have live broker adapters. The other provider
  cards are intentionally disabled, not implemented.
- Stripe live checkout, webhook delivery, receipts, refunds and entitlement are
  still unverified. No live charge is authorized.
- Funded evaluations still require TBC entry while TBC plan/checkout rails are
  disabled; KYC and payout flow are not end-to-end tested.
- Counsel review, Reg CF qualification, a verified postal address, the TB
  issuer record and the employment-entity decision remain external blockers.
- No ISO/IEC 27001, SOC 2, PCI DSS, audit or completed penetration test is
  claimed by this record.
