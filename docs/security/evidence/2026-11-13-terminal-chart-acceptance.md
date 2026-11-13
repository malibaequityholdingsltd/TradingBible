# Terminal chart acceptance and deployment — 13 November 2026

**Status:** CONTROLLED RECORD — deployed and runtime-accepted in a mocked harness.  
**Commit:** `539c6ad` (`Build clean-room TradingBible terminal chart`)  
**Deploy target:** `https://tradingbible.app` (`/var/www/tradingbible`)  
**Deploy method:** static web build only (`dist/apps/web/`); API source and runtime stores were not changed.  
**Remote rollback archive:** `/root/tradingbible-deploy-backups/pre-deploy-20261113T040314Z.tar.gz` (33 MB; web dist + `apps/api/storage`).

## Release gates

The following passed before deployment:

- `npm run lint` — web and API clean.
- `npm test --prefix apps/web -- --run` — 7 files, 32 tests passed.
- `npm run build --prefix apps/web` — Vite production build completed.
- `npm run verify` — Academy parity, release guards and security audit passed. The security audit warned only that one large build-info JSON was skipped for secret-pattern scanning.

## Runtime acceptance

A temporary Playwright harness used an isolated browser context with:

- a mocked Supabase session and cached profile (no production auth token);
- mocked `/hcgi/api/candles`, `/hcgi/api/quotes` and paper/challenge responses;
- service workers blocked, and all Supabase/API calls intercepted so no production account or market data was read or written.

Desktop viewport `1440 × 1000` and mobile viewport `390 × 844` were checked.

Verified:

- `/app/terminal-pro` loaded the Terminal Pro workspace and the clean-room chart.
- Custom `2m` interval and `Bars` chart type rendered.
- VWAP overlay added through the indicator picker.
- ETHUSD comparison rendered and persisted across split layout, return to single, fullscreen and symbol switching.
- Trend-line drawing was recorded (`✓ 1` object); Chart objects and Chart settings modals opened.
- Split layout rendered two charts; the new layout bar returned to single and restored the chart toolbar.
- Fullscreen opened and exited with data still rendered.
- Symbol switch to BTCUSD and back restored the XAUUSD VWAP and ETHUSD comparison from per-symbol storage.
- `/app/alerts?symbol=BTCUSD` opened a prefilled alert modal.
- No uncaught page errors and no application console errors. Expected external Binance WebSocket DNS failures in the offline harness were filtered.

A second smoke pass against `https://tradingbible.app` used the same mocked data/auth and passed all of the above, including mobile layout with no horizontal overflow.

The chart uses the existing `lightweight-charts` dependency. Its TradingView attribution link remains visible as required by that library's notice. This is third-party chart-engine attribution, not a claim that the terminal is a TradingView product or a copy of TradingView's proprietary interface.

## Production checks after rsync

| Check | Result |
| --- | --- |
| `https://tradingbible.app/` | `200` |
| `https://tradingbible.app/app/terminal-pro` | `200` |
| `https://tradingbible.app/api/health` | `200` |
| `https://tradingbible.app/api/admin/health` unauthenticated | `401` |
| `POST https://tradingbible.app/api/auth/send-email` without hook secret | `503` |
| `https://tradingbible.app/signup` | `200`; renders the "Signups are paused" card |
| `https://tradingbible.app/.well-known/security.txt` | `200` |
| Production HTML bundle reference | `assets/index-EXZipTEF.js` |
| PM2 `tradingbible-api` | `online` (no restart needed for static deploy) |

The production HTML response retained HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, referrer policy and permissions policy. Ownership and modes under `dist/apps/web/` were normalized to `root:root`, directories `0755`, files `0644`.

An unauthenticated public-route check of `/` and `/signup` found no page or console errors. `/signup` still renders the "Signups are paused" card, so public signup remains gated until the email/auth delivery blockers are closed.

## Preserved runtime stores

Only `dist/apps/web/` was replaced. The following were checked after deployment and remain in place:

| Path | Owner | Mode | Size |
| --- | --- | --- | --- |
| `apps/api/storage/security/programme.json` | `root:root` | `0600` | 52,981 bytes |
| `apps/api/storage/investor-letters/letters.json` | `root:root` | `0600` | 451 bytes |
| `apps/api/storage/workforce/compliance.json` | `root:root` | `0600` | 175 bytes |

The production `.env` was not read, copied or modified.

## Rollback

The static web build can be restored from the pre-deploy archive without touching the API or runtime stores:

```bash
ssh root@2.25.166.110
cd /var/www/tradingbible
tar -xzf /root/tradingbible-deploy-backups/pre-deploy-20261113T040314Z.tar.gz dist/apps/web
chown -R root:root dist/apps/web
find dist/apps/web -type d -exec chmod 755 {} +
find dist/apps/web -type f -exec chmod 644 {} +
```

No API restart is required for a static-only rollback.

## Not covered

This record does not establish a real authenticated subscriber session, live order execution, live payment or refund, SMTP delivery, Supabase RLS or tenant isolation, admin MFA enrollment, independent penetration testing, ISO/IEC 27001, SOC 2, PCI DSS or any audit opinion. Those remain tracked in `docs/blocked-items.md` and the security programme.
