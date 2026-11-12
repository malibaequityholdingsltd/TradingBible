#!/usr/bin/env bash
# TradingBible — encrypted application and runtime snapshot.
# Install at /usr/local/sbin/tradingbible-app-backup.
#
# This backs up code, the built SPA, controlled documents and the runtime JSON
# stores. It deliberately excludes .env and node_modules.
#
# The passphrase is stored on the production host for automated execution. That
# is not a substitute for an offline escrow copy, a separate backup account or
# an immutable off-site repository. Those remain open requirements.
set -euo pipefail
umask 077

APP_DIR="/var/www/tradingbible"
BACKUP_DIR="/var/backups/tradingbible"
KEY_FILE="/root/.config/tradingbible/backup.key"
RETENTION_DAYS=14
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="app-${STAMP}.tar.gz.gpg"

exec 9>/run/lock/tradingbible-app-backup.lock
if ! flock -n 9; then
  echo "backup already running"
  exit 0
fi

test -f "$KEY_FILE" || { echo "missing backup key: $KEY_FILE" >&2; exit 1; }
test "$(stat -c %a "$KEY_FILE")" = "600" || { echo "backup key must be mode 600" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
TMP_DIR="$(mktemp -d "$BACKUP_DIR/.tmp.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

tar \
  --warning=no-file-changed \
  -czf "$TMP_DIR/app.tar.gz" \
  -C "$APP_DIR" \
  apps/api/src \
  apps/api/package.json \
  apps/api/storage \
  dist/apps/web \
  docs/security \
  docs/hr \
  scripts

# The archive must never contain a live environment file.
if tar -tzf "$TMP_DIR/app.tar.gz" | grep -qE '(^|/)\.env$'; then
  echo "refusing to back up an archive containing .env" >&2
  exit 1
fi

gpg \
  --batch --yes --quiet \
  --pinentry-mode loopback \
  --passphrase-file "$KEY_FILE" \
  --symmetric --cipher-algo AES256 \
  --no-symkey-cache \
  -o "$BACKUP_DIR/$NAME" \
  "$TMP_DIR/app.tar.gz"

sha256sum "$BACKUP_DIR/$NAME" > "$BACKUP_DIR/$NAME.sha256"
chmod 600 "$BACKUP_DIR/$NAME" "$BACKUP_DIR/$NAME.sha256"

# Keep the most recent snapshots. Retention is deliberately short and local;
# this is not the off-site recovery copy.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'app-*.tar.gz.gpg' -o -name 'app-*.tar.gz.gpg.sha256' \) -mtime +"$RETENTION_DAYS" -delete

echo "backup ok: $BACKUP_DIR/$NAME ($(stat -c %s "$BACKUP_DIR/$NAME") bytes)"
