#!/usr/bin/env bash
# TradingBible — inspect-first UFW helper.
#
# This script deliberately STOPS before enabling the firewall. Read the output,
# prove private SSH access from a second device, then enable UFW manually.
# Do not run on production without the recovery console open.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root after reading docs/security/12-PRODUCTION-HARDENING-RUNBOOK.md."
  exit 1
fi

echo "== Current UFW state =="
ufw status verbose || true
echo
echo "== Listening services =="
ss -tulpn || true
echo
echo "== Tailscale interface =="
ip link show tailscale0 || {
  echo "tailscale0 is not present. Install and verify Tailscale before changing SSH access."
  exit 2
}
echo
echo "== Tailscale status =="
tailscale status || true
echo
echo "This helper will now set default policies and allow SSH only on tailscale0."
read -r -p "Type PRIVATE-ACCESS-VERIFIED to continue: " CONFIRM
if [ "$CONFIRM" != "PRIVATE-ACCESS-VERIFIED" ]; then
  echo "Stopped without changes."
  exit 0
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow in on tailscale0 to any port 22 proto tcp

echo
echo "Rules staged. UFW is NOT enabled by this script."
ufw status numbered
echo
echo "Verify private SSH from a second authorised device, then run:"
echo "  ufw enable"
echo "  ufw status numbered"
echo
echo "If access fails, use the Hostinger console and run: ufw disable"
echo "Do not open public 80/443 when using Cloudflare Tunnel."
