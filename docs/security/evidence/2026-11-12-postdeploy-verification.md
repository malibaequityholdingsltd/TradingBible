# Post-deploy production verification — 12 November 2026

**Release gate:** `npm run lint`, `npm run build` and `npm run verify` all passed
before the final static build was copied to production.  \
**Deploy target:** `https://tradingbible.app` (`/var/www/tradingbible`)  \
**Pre-deploy dist backup:** `/root/tradingbible-dist-20261112T211426Z.tar.gz`  \
**Operator:** OpenCode agent, under explicit user authorization

## Routes

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/auth` | 200 |
| `/academy` | 200 |
| `/pricing` | 200 |
| `/security` | 200 |
| `/privacy` | 200 |
| `/terms` | 200 |
| `/admin/security` | 200 |
| `/admin/workforce` | 200 |
| `/admin/investor-letters` | 200 |
| `/api/health` | 200 |

## Headers

The final HTML response carries HSTS, CSP, `nosniff`, `SAMEORIGIN`, referrer
policy and permissions policy. The API response carries the Helmet CSP and the
other Helmet headers, with no duplicate HSTS/frame/content-type values. The HTTP
redirect returns `Server: nginx` without a version.

The final Chromium CSP check recorded zero console, page, request or navigation
findings across `/`, `/auth`, `/academy`, `/pricing`, `/security`, `/privacy`,
`/terms` and `/admin/security`.

## Ownership and runtime protection

| Path | Owner | Mode |
| --- | --- | --- |
| `dist/apps/web/index.html` | `root:root` | `0644` |
| `apps/api/src/main.js` | `root:root` | `0644` |
| `apps/api/storage` | `root:root` | `0700` |
| `apps/api/storage/security/programme.json` | `root:root` | `0600` |

The API process still runs as root. Creating and testing a dedicated
least-privilege service account remains an open hardening item; this change only
removes stale UID 501 ownership left by rsync.

## Backup timer

`tradingbible-app-backup.timer` is enabled and active for the next 03:15 UTC
window. A post-deploy snapshot, `app-20261112T211620Z.tar.gz.gpg`, completed with
exit status 0. The earlier snapshot's decrypt/restore test is recorded in
`2026-11-12-encrypted-app-backup-test.md`.

## Workforce document availability

The production `docs/hr` directory was missing during the earlier deployment.
It was synced and checked against `POLICY_DOCUMENTS`: 12 of 12 files resolved,
with no missing entries and 235,073 bytes of controlled policy content. The
documents remain templates until a real approving body, date and reference are
recorded.

## Not covered

Authenticated admin acceptance, SMTP login, Supabase RLS testing, Cloudflare,
Tailscale private access, a SIEM/alert route, database backup and all legal or
securities gates remain outside this verification.
