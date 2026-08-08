#!/usr/bin/env bash
# TradingBible — repair/restart VPS services (monorepo structure).
set -euo pipefail

APP_DIR="/var/www/tradingbible"
API_DIR="$APP_DIR/apps/api"
WEB_DIR="$APP_DIR/apps/web"
WEB_DIST="$APP_DIR/dist/apps/web"
DOMAIN="tradingbible.app"
API_PORT="3001"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
REPO_URL="https://github.com/malibaequityholdingsltd/TradingBible"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (sudo -i)."
  exit 1
fi

echo "=== 1. Purge local PocketBase ==="
systemctl stop pocketbase 2>/dev/null || true
systemctl disable pocketbase 2>/dev/null || true
rm -f /etc/systemd/system/pocketbase.service
systemctl daemon-reload || true
POCKETBASE_PIDS="$(pgrep -f pocketbase || true)"
if [ -n "$POCKETBASE_PIDS" ]; then
  for pid in $POCKETBASE_PIDS; do
    kill "$pid" 2>/dev/null || true
  done
fi
echo "PocketBase service removed."

echo "=== 2. Verify / fix monorepo structure ==="
NEEDS_CLONE=0
[ -d "$APP_DIR/.git" ]            || NEEDS_CLONE=1
[ -d "$WEB_DIR" ]                 || NEEDS_CLONE=1
[ -f "$WEB_DIR/vite.config.js" ]  || NEEDS_CLONE=1
[ -d "$API_DIR" ]                 || NEEDS_CLONE=1

if [ "$NEEDS_CLONE" = "1" ]; then
  echo "  Structure broken — recloning from $REPO_URL"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "  Structure OK — pulling latest"
  git -C "$APP_DIR" pull --ff-only || true
fi

echo "  Directory listing:"
ls -la "$APP_DIR/apps/" 2>/dev/null || echo "  apps/ not found"
ls -la "$WEB_DIR/"      2>/dev/null | head -8 || echo "  apps/web/ not found"
ls -la "$API_DIR/"      2>/dev/null | head -8 || echo "  apps/api/ not found"

echo "=== 3. Install dependencies ==="
cd "$APP_DIR"
npm install
npm install --workspace apps/web
npm install --workspace apps/api

echo "=== 4. API .env ==="
if [ ! -f "$API_DIR/.env" ]; then
  cat > "$API_DIR/.env" <<ENVEOF
NODE_ENV=production
PORT=$API_PORT
CORS_ORIGIN=https://$DOMAIN
SUPABASE_URL=
SUPABASE_ANON_KEY=
INTEGRATED_AI_API_URL=
INTEGRATED_AI_API_KEY=
WEBSITE_ID=
WEBSITE_DOMAIN=$DOMAIN
PROXY_ENTRANCE_ID=
PADDLE_ENV_OVERRIDE=live
PADDLE_LIVE_API_KEY=
PADDLE_LIVE_CLIENT_TOKEN=
PADDLE_LIVE_WEBHOOK_SECRET=
PADDLE_SANDBOX_API_KEY=
PADDLE_SANDBOX_CLIENT_TOKEN=
PADDLE_SANDBOX_WEBHOOK_SECRET=
PADDLE_PRICE_PRO=
PADDLE_PRICE_ELITE=
PADDLE_PRICE_PROFESSIONAL=
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=
ENVEOF
  echo "  Created $API_DIR/.env — add cloud database URL and API keys."
fi

echo "=== 5. Build web app ==="
if [ ! -f "$WEB_DIST/index.html" ]; then
  echo "  dist missing — rebuilding"
  cd "$WEB_DIR"
  npm run build
fi
find "$WEB_DIST" -name '._*' -delete 2>/dev/null || true
chmod 755 "$APP_DIR" "$APP_DIR/dist" "$APP_DIR/dist/apps" "$WEB_DIST"
find "$APP_DIR/dist" -type d -exec chmod 755 {} +
find "$APP_DIR/dist" -type f -exec chmod 644 {} +
echo "  dist files: $(ls $WEB_DIST 2>/dev/null | wc -l)"

echo "=== 6. Nginx ==="
# Update root to match actual dist path
sed -i "s|root .*;|root $WEB_DIST;|" /etc/nginx/sites-available/$DOMAIN 2>/dev/null || true
# Also rewrite proxy port if needed (old configs used 3000)
sed -i "s|proxy_pass.*127.0.0.1:3000|proxy_pass http://127.0.0.1:$API_PORT|g" /etc/nginx/sites-available/$DOMAIN 2>/dev/null || true
nginx -t && systemctl restart nginx && echo "  Nginx OK"

echo "=== 6b. SSL renewal ==="
apt-get install -y certbot python3-certbot-nginx
systemctl enable --now certbot.timer
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  certbot renew --quiet
  echo "  Existing Let's Encrypt cert renewed (if due)."
elif [ -n "$CERTBOT_EMAIL" ]; then
  certbot --nginx --non-interactive --agree-tos \
    -m "$CERTBOT_EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"
  echo "  New Let's Encrypt cert issued."
else
  echo "  CERTBOT_EMAIL unset and no existing Let's Encrypt cert found; keeping current cert."
fi

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  sed -i "s|ssl_certificate .*;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" "/etc/nginx/sites-available/$DOMAIN" 2>/dev/null || true
  sed -i "s|ssl_certificate_key .*;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" "/etc/nginx/sites-available/$DOMAIN" 2>/dev/null || true
  nginx -t && systemctl reload nginx && echo "  Nginx now uses Let's Encrypt cert paths."
fi

echo "=== 7. API via PM2 ==="
pm2 delete tradingbible-api 2>/dev/null || true
pm2 start npm --name "tradingbible-api" --env production --cwd "$API_DIR" -- start
pm2 save

echo "=== 8. Health checks ==="
sleep 4
pm2 status
echo -n "API  /health     : "; curl -fsS "http://127.0.0.1:$API_PORT/health" && echo " OK" || echo " FAIL"
echo -n "HTTP redirect    : "; curl -sI http://127.0.0.1/ | head -1
echo -n "HTTPS SPA        : "; curl -sko /dev/null -w '%{http_code}\n' https://127.0.0.1/
echo -n "HTTPS API quotes : "; curl -sko /dev/null -w '%{http_code}\n' "https://127.0.0.1/api/quotes?symbol=BTCUSD"

echo "=== 9. Recent logs ==="
tail -n 10 /var/log/nginx/error.log 2>/dev/null || true
pm2 logs tradingbible-api --lines 15 --nostream 2>/dev/null || true
echo "Done."
