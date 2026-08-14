# Deployment (VPS)

The production stack is a single Ubuntu VPS (no Docker):

- **Host:** 69.62.123.117 · **Domain:** tradingbible.app (Let's Encrypt TLS)
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

```bash
ssh root@69.62.123.117
cd /var/www/tradingbible
git pull --ff-only                       # fetch latest (origin is github.com/malibaequityholdingsltd/TradingBible.git)
cd apps/web && npm run build             # rebuild SPA into dist/apps/web/
pm2 restart tradingbible-api             # restart API (loads apps/api/.env)
```

The API reads its secrets from `/var/www/tradingbible/apps/api/.env` (gitignored) — set/update `SEND_EMAIL_HOOK_SECRET`, Supabase keys, Paddle keys there.

## Full fresh deploy / repair

```bash
ssh root@69.62.123.117
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