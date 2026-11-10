# Deployment (VPS)

The production stack is a single Ubuntu VPS (no Docker):

- **Host:** 2.25.166.110 · **Domain:** tradingbible.app (Let's Encrypt TLS)
- **Web:** Nginx serves the static React build from `/var/www/tradingbible/dist/apps/web/`
- **API:** PM2 (`tradingbible-api`) runs `node --env-file=.env src/main.js` on :3001, proxied at `/api/`
- **DB/Auth:** Supabase cloud (no local Postgres, no PocketBase)

## Expected layout

```
/var/www/tradingbible/
├── apps/{web,api}/
├── dist/apps/web/        ← production web build
├── deploy/deploy.sh      ← fresh deploy / repair
├── deploy/fix-vps.sh     ← repair & restart existing install
└── ecosystem.config.cjs  ← pm2 process definition
```

## Deploying new code

Production is **not a git checkout**. Build locally, then rsync the built SPA and
the changed API source. Do not sync `.env`, `node_modules`, or local execution
state.

```bash
cd /path/to/TradingBible-edit
npm run lint && npm run build && npm run verify

rsync -az --itemize-changes apps/api/src/ root@2.25.166.110:/var/www/tradingbible/apps/api/src/
rsync -az --delete dist/apps/web/ root@2.25.166.110:/var/www/tradingbible/dist/apps/web/
ssh root@2.25.166.110 'pm2 restart tradingbible-api'
```

For controlled document storage, sync the generated library without deleting
runtime state:

```bash
rsync -az --exclude='.execution/' --exclude='*.tmp' \
  apps/api/storage/fundraising-documents/ \
  root@2.25.166.110:/var/www/tradingbible/apps/api/storage/fundraising-documents/
```

The API reads its secrets from `/var/www/tradingbible/apps/api/.env` (gitignored) — set/update `SEND_EMAIL_HOOK_SECRET`, Supabase keys and Stripe keys there. Never print, copy or overwrite that file from an agent session. A production deploy does not set `FUNDRAISING_EXECUTION_ENABLED`; leave it unset or `false` until board and counsel authorization are recorded.

Before overwriting API source, take a small remote backup:

```bash
ssh root@2.25.166.110 'cd /var/www/tradingbible && tar -czf "backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" apps/api/src dist/apps/web apps/api/storage'
```

## Full fresh deploy / repair

```bash
ssh root@2.25.166.110
bash /var/www/tradingbible/deploy/deploy.sh        # clone, install, build, configure, start
# or
bash /var/www/tradingbible/deploy/fix-vps.sh       # repair an existing install
```

Both scripts: remove any local PocketBase, verify/re-clone the repo, `npm install` (root + workspaces), build the web app, start the API via PM2, configure nginx (SPA + `/api/` proxy), harden TLS/security headers, and enable `certbot.timer` auto-renewal.

## Verification

```bash
pm2 status                                   # tradingbible-api online
curl http://localhost:3001/health            # {"status":"ok"}
curl https://tradingbible.app/api/health     # through nginx
curl -I https://tradingbible.app/            # web SPA, TLS
```

## Important operational notes

- The Supabase **Send Email hook** must point at `https://tradingbible.app/api/auth/send-email` with the same hook secret as `apps/api/.env` — otherwise branded auth emails fail. The endpoint rejects invalid signatures (401), so a mismatch surfaces fast in `pm2 logs`.
- Market-data free keys are rate-limited: Alpha Vantage = 25 req/day (cached); the API falls back to Binance/synthetic, so charts never break.
- Backups: see `docs/database.md`. Local repo backups via `git bundle` are in `~/Backups/` on the dev machine.