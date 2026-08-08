#!/usr/bin/env bash
# TradingBible — VPS deploy (monorepo structure).
# Expects: /var/www/tradingbible/apps/web/ and /var/www/tradingbible/apps/api/
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

echo "==> 1/10 System packages"
apt-get update -y
apt-get install -y nginx git curl openssl
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "==> 2/10 Remove any local PocketBase service"
systemctl stop pocketbase 2>/dev/null || true
systemctl disable pocketbase 2>/dev/null || true
rm -f /etc/systemd/system/pocketbase.service
systemctl daemon-reload || true

echo "==> 3/10 Clone / update source (correct monorepo structure)"
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repo exists — pulling latest"
  git -C "$APP_DIR" pull --ff-only
else
  echo "  Fresh clone into $APP_DIR"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

# Verify monorepo structure
echo "  Verifying structure..."
test -f "$APP_DIR/package.json"   || { echo "ERROR: root package.json missing"; exit 1; }
test -d "$WEB_DIR"                || { echo "ERROR: apps/web/ missing"; exit 1; }
test -f "$WEB_DIR/package.json"   || { echo "ERROR: apps/web/package.json missing"; exit 1; }
test -f "$WEB_DIR/vite.config.js" || { echo "ERROR: apps/web/vite.config.js missing"; exit 1; }
test -d "$API_DIR"                || { echo "ERROR: apps/api/ missing"; exit 1; }
test -f "$API_DIR/package.json"   || { echo "ERROR: apps/api/package.json missing"; exit 1; }
test -f "$API_DIR/src/main.js"    || test -f "$API_DIR/src/index.js" || { echo "ERROR: apps/api/src/main.js or index.js missing"; exit 1; }
echo "  Structure OK"
ls -la "$APP_DIR/apps/"

echo "==> 4/10 Install dependencies"
cd "$APP_DIR"
# Root (hoists shared deps for workspaces)
npm install
# Web workspace
echo "  Installing apps/web deps..."
npm install --workspace apps/web
# API workspace
echo "  Installing apps/api deps..."
npm install --workspace apps/api

echo "==> 5/10 API environment"
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
  echo "  Created $API_DIR/.env — fill in cloud database URL + API keys"
fi

echo "==> 6/10 Build web app"
cd "$WEB_DIR"
npm run build
test -f "$WEB_DIST/index.html" || { echo "BUILD FAILED: index.html missing in dist/"; exit 1; }
find "$WEB_DIST" -name '._*' -delete 2>/dev/null || true
chmod 755 "$APP_DIR" "$APP_DIR/dist" "$APP_DIR/dist/apps" "$WEB_DIST"
find "$APP_DIR/dist" -type d -exec chmod 755 {} +
find "$APP_DIR/dist" -type f -exec chmod 644 {} +
echo "  Build OK: $(ls $WEB_DIST | wc -l) files in dist/"

echo "==> 7/10 SSL + Nginx"
if [ ! -f /etc/ssl/certs/tradingbible.crt ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/tradingbible.key \
    -out /etc/ssl/certs/tradingbible.crt \
    -subj "/CN=$DOMAIN"
fi

SSL_CERT_PATH="/etc/ssl/certs/tradingbible.crt"
SSL_KEY_PATH="/etc/ssl/private/tradingbible.key"
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
  SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
fi

# Write Nginx config pointing at the built dist path
cat > /etc/nginx/sites-available/$DOMAIN <<NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate     $SSL_CERT_PATH;
    ssl_certificate_key $SSL_KEY_PATH;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    server_tokens       off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    root $WEB_DIST;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    location ~* \.(js|css|woff2?|ttf|svg|png|jpg|webp|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:$API_PORT/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location /hcgi/api/ {
        proxy_pass         http://127.0.0.1:$API_PORT/;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
NGINXEOF
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

if [ -n "$CERTBOT_EMAIL" ]; then
  echo "  Enabling Let's Encrypt certificate issuance + auto-renew"
  apt-get install -y certbot python3-certbot-nginx
  systemctl enable --now certbot.timer
  certbot --nginx --non-interactive --agree-tos \
    -m "$CERTBOT_EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    sed -i "s|ssl_certificate .*;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" "/etc/nginx/sites-available/$DOMAIN"
    sed -i "s|ssl_certificate_key .*;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" "/etc/nginx/sites-available/$DOMAIN"
  fi
  nginx -t
  systemctl reload nginx
else
  echo "  CERTBOT_EMAIL is unset; using self-signed certificate."
fi

echo "==> 8/10 Prepare API runtime"
test -f "$API_DIR/.env" || { echo "ERROR: $API_DIR/.env missing"; exit 1; }

echo "==> 9/10 Start API via PM2"
pm2 delete tradingbible-api 2>/dev/null || true
pm2 start npm \
  --name "tradingbible-api" \
  --env production \
  --cwd "$API_DIR" \
  -- start
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null || true

echo "==> 10/10 Verification"
sleep 4
pm2 status
echo -n "  API /health     : "; curl -fsS "http://127.0.0.1:$API_PORT/health" && echo " OK" || echo " FAIL"
echo -n "  HTTP redirect   : "; curl -sI http://127.0.0.1/ | head -1
echo -n "  HTTPS SPA       : "; curl -fskS https://127.0.0.1/ -o /dev/null && echo "OK" || echo "FAIL"
echo -n "  API quotes      : "; curl -fskS "https://127.0.0.1/api/quotes?symbol=BTCUSD" | head -c 200; echo

echo ""
echo "=== Deployment complete — https://$DOMAIN ==="
