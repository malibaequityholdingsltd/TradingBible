#!/usr/bin/env bash
# TradingBible — Sunday economic-calendar email digest cron installer.
# Installs a system cron that fires hourly on Sundays; the API endpoint itself
# checks admin_platform_settings (digestEnabled + digestHourUTC, default 18:00
# UTC) and no-ops outside the configured hour. Run as root on the VPS.
set -euo pipefail

APP_DIR="/var/www/tradingbible"
API_DIR="$APP_DIR/apps/api"
ENV_FILE="$API_DIR/.env"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (sudo -i)."
  exit 1
fi

# 1. Ensure CRON_SECRET exists (never printed).
if ! grep -q "^CRON_SECRET=" "$ENV_FILE" 2>/dev/null; then
  SECRET="$(openssl rand -hex 24)"
  printf '\nCRON_SECRET=%s\n' "$SECRET" >> "$ENV_FILE"
  echo "CRON_SECRET created in $ENV_FILE"
else
  echo "CRON_SECRET already present"
fi
chmod 600 "$ENV_FILE"

# 2. Restart API so the new env var loads.
pm2 restart tradingbible-api --update-env >/dev/null 2>&1 || pm2 restart tradingbible-api >/dev/null 2>&1 || true

# 3. Install idempotent Sunday-hourly cron (endpoint gates on digest hour).
CRON_LINE='0 * * * SUN /usr/bin/curl -fsS -m 90 -X POST http://127.0.0.1:3001/admin/digest/weekly -H "X-Cron-Secret: $(grep ^CRON_SECRET= /var/www/tradingbible/apps/api/.env | cut -d= -f2-)" >> /var/log/tradingbible-digest.log 2>&1'
( crontab -l 2>/dev/null | grep -v "admin/digest/weekly" || true; echo "$CRON_LINE" ) | crontab -
echo "Cron installed (Sundays, hourly — API sends at the configured digest hour):"
crontab -l | grep "admin/digest/weekly"
