#!/usr/bin/env bash
# TradingBible database snapshot (Supabase REST → JSON).
# Runs daily via cron; keeps the last 14 daily snapshots.
set -euo pipefail

API_DIR="/var/www/tradingbible/apps/api"
ENV_FILE="$API_DIR/.env"
OUT_ROOT="/root/backups/tradingbible-db"
TODAY=$(date +%Y-%m-%d)
OUT="$OUT_ROOT/$TODAY"
KEEP_DAYS=14

TABLES=(
  users profiles forum_threads forum_replies academy_waitlist
  admin_integrations admin_platform_settings admin_api_keys user_api_keys
  branding_settings notifications billing_events bank_cards bank_transactions
  affiliate_codes affiliate_signups broker_accounts prop_firm_accounts crypto_accounts
  trades watchlists chart_drawings terminal_layouts trading_signals price_alerts alert_history
  school_classrooms school_students school_teachers school_assessments school_submissions school_certificates
  _integratedaimessages _integratedaiimages
)

# Load only the two vars we need (values contain no quotes/special chars).
SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)

mkdir -p "$OUT"
FAILED=0
for t in "${TABLES[@]}"; do
  code=$(curl -s -o "$OUT/$t.json" -w "%{http_code}" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/$t?select=*&limit=10000")
  if [ "$code" != "200" ]; then
    rm -f "$OUT/$t.json"
    FAILED=$((FAILED + 1))
  fi
done

# Prune snapshots older than KEEP_DAYS.
find "$OUT_ROOT" -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} + 2>/dev/null || true

COUNT=$(ls "$OUT"/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$FAILED" -gt 0 ]; then
  echo "[$(date -Is)] backup degraded: $COUNT tables saved, $FAILED failed"
  exit 1
fi
echo "[$(date -Is)] backup ok: $COUNT tables → $OUT"
