# Auth email and SMTP completion

**Date:** 18 November 2026 (UTC)
**Scope:** Supabase Auth configuration, Send Email hook, Hostinger SMTP, branded token-hash login links and the public-signup gate.
**Production:** `https://tradingbible.app`
**Project:** Supabase `yxuzrishocchfbofqazt`

This record documents an operational fix. It is not a certification, audit
opinion, legal approval or proof that the remaining launch gates are closed.

## Why this pass was needed

Production login could not deliver email:

- Supabase Auth reported `disable_signup: false` even though the web signup
  surface was paused.
- The Send Email hook was disabled, and the API had no
  `SEND_EMAIL_HOOK_SECRET`, so hook requests were rejected with `503`.
- Hostinger SMTP rejected `support@tradingbible.app` with
  `535 5.7.8 Authentication failed`.

## Changes made

| Area | Change |
|---|---|
| Supabase Site URL | Kept at `https://tradingbible.app`. |
| Redirect allow-list | Replaced the exact-path list with production origins plus `/**` paths for `tradingbible.app`, `www.tradingbible.app`, `localhost:3000`, `127.0.0.1:3000` and the existing `172.20.10.4:3000` development origin. |
| Supabase signup | Set `disable_signup: true`. Direct `/auth/v1/signup` now returns `422 signup_disabled`. |
| Send Email hook | Enabled at `https://tradingbible.app/api/auth/send-email`. |
| Hook secret | Generated a new `v1,whsec_…` secret and wrote the same value to Supabase and `/var/www/tradingbible/apps/api/.env`. The secret is not recorded here. |
| Hostinger SMTP | Rotated the `support@tradingbible.app` mailbox password through the Hostinger Mail API, updated the production API env, local API env and Supabase SMTP password. |
| DNS | Verified SPF, DMARC and the Hostinger DKIM CNAMEs; no DNS change was required. |

Production `.env` backups created before the changes:

- `/var/www/tradingbible/apps/api/.env.bak.20261118T092221Z`
- `/var/www/tradingbible/apps/api/.env.bak.20261118T092430Z`

## Verification performed

Supabase Management API (redacted read-back):

- `site_url`: `https://tradingbible.app`
- `disable_signup`: `true`
- `hook_send_email_enabled`: `true`
- `hook_send_email_uri`: `https://tradingbible.app/api/auth/send-email`
- `external_email_enabled`: `true`
- `mailer_autoconfirm`: `false`
- `smtp_host`: `smtp.hostinger.com`
- `smtp_port`: `465`
- `smtp_user`: `support@tradingbible.app`

Production API:

- `GET /api/auth/send-email/status` →
  `{"configured":true,"host":"smtp.hostinger.com","port":465,"hookConfigured":true,"brandedLinks":true}`
- `GET /api/health` → `200 {"status":"ok"}`
- `GET /login` → `200`

SMTP and hook:

- `nodemailer.verify()` with the rotated mailbox password returned `OK` from
  both the local and production API environments.
- A direct SMTP test to the support mailbox was accepted with
  `250 2.0.0 OK` and arrived in the Hostinger `INBOX`.
- A real Supabase magic-link OTP request for the administrator account
  returned `200`. Supabase called the hook with a valid signature; the API
  returned `200` and logged no SMTP error.
- A separately signed Send Email hook request was delivered to the support
  mailbox. The rendered email contained
  `https://tradingbible.app/login` with `token_hash` and `type` query keys,
  the branded logo URL, and no `supabase.co` host in the body.
- A production `admin/generate_link` magic link verified through
  `/auth/v1/verify` with `200`; the session was revoked with `/auth/v1/logout`
  (`204`).

Public signup:

- `GET /auth/v1/settings` reported `disable_signup: true`.
- `POST /auth/v1/signup` with a throwaway address returned
  `422 {"error_code":"signup_disabled"}`.

DNS:

- SPF: `v=spf1 include:_spf.mail.hostinger.com ~all`
- DMARC: `v=DMARC1; p=none`
- DKIM CNAMEs resolve for:
  - `hostingermail-a._domainkey.tradingbible.app`
  - `hostingermail-b._domainkey.tradingbible.app`
  - `hostingermail-c._domainkey.tradingbible.app`

## Remaining limitations

- The Google OAuth handoff still briefly uses the managed
  `yxuzrishocchfbofqazt.supabase.co` authorize host. Removing that requires a
  Supabase custom auth domain, which is a paid Pro-plan add-on and was not
  purchased or enabled.
- Public signup remains paused in the web UI by
  `VITE_PUBLIC_SIGNUP_ENABLED=false`. Supabase-level signup is now disabled as
  defence in depth. Re-enabling either is a separate product decision.
- DMARC remains `p=none`; tightening to `p=quarantine` or `p=reject` should
  follow a monitored period.
- Marketing and fundraising email remains blocked by the missing verified
  postal address, counsel approval and suppression/preference controls. This
  record only covers transactional auth email.
- No administrator MFA, RLS audit, Stripe live acceptance or other launch gate
  was closed by this pass.

## Rollback reference

The pre-change Supabase auth config had:

- `disable_signup: false`
- `hook_send_email_enabled: false`
- `uri_allow_list`:
  `https://tradingbible.app,https://www.tradingbible.app,http://localhost:3000/,http://172.20.10.4:3000/`
- the same Site URL and Hostinger SMTP host/user

The production API env backups listed above contain the previous SMTP
password. Do not print or commit either env backup.
