# TradingBible — VPS Deployment (Monorepo)

**VPS:** 69.62.123.117 · **Domain:** tradingbible.app

## Expected structure after clone

```
/var/www/tradingbible/
├── apps/
│   ├── web/          ← React SPA (vite.config.js, package.json)
│   └── api/          ← Express API (src/main.js, package.json)
├── package.json      ← root (workspaces)
└── deploy/
```

## Quick deploy / repair

```bash
ssh root@69.62.123.117

# Optional but recommended for real SSL cert issuance in scripts:
export CERTBOT_EMAIL=ops@tradingbible.app

# Full fresh deploy (clones repo, installs, builds, starts services)
bash /var/www/tradingbible/deploy/deploy.sh

# Repair & restart existing install
bash /var/www/tradingbible/deploy/fix-vps.sh
```

Both scripts:
- Stop/remove any local PocketBase (cloud database is used instead)
- Verify / re-clone the monorepo if structure is broken
- Run `npm install` at root + each workspace
- Build `apps/web` → `dist/apps/web/`
- Start Express API on port **3001** via PM2 using `npm start` (loads `apps/api/.env`)
- Configure Nginx to serve SPA from `dist/apps/web/` and proxy `/api/` → `3001`
- Apply stricter TLS/security headers and enable `certbot.timer` auto-renew
- Auto-switch Nginx TLS paths to Let's Encrypt (`/etc/letsencrypt/live/...`) when certs exist

## API environment — apps/api/.env

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://tradingbible.app
POCKETBASE_URL=https://<cloud-pocketbase-host>
PB_SUPERUSER_EMAIL=<email>
PB_SUPERUSER_PASSWORD=<password>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
ALPHA_VANTAGE_API_KEY=<key>
FINNHUB_API_KEY=<key>
```

## Manual verification

```bash
pm2 status
curl http://localhost:3001/health
curl -k https://localhost/
curl -k "https://localhost/api/quotes?symbol=BTCUSD"
```

## Logs

```bash
pm2 logs tradingbible-api
tail -f /var/log/nginx/error.log
```

## Real SSL certificate

The deploy/repair scripts will issue or renew Let's Encrypt certificates when
`CERTBOT_EMAIL` is set.

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d tradingbible.app -d www.tradingbible.app
systemctl status certbot.timer --no-pager
```
