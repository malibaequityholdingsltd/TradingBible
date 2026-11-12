# Production Security Templates

These files are reviewed templates, not an automatic deployment. Do not apply them to the live VPS without the preflight, backup, recovery path and authorization described in `docs/security/12-PRODUCTION-HARDENING-RUNBOOK.md`.

| File | Purpose |
| --- | --- |
| `nginx-tradingbible-tunnel.conf` | Loopback Nginx listener for a Cloudflare Tunnel deployment, with security headers and API proxy |
| `nginx-security-headers.conf` | Shared public-edge headers and CSP; include it inside HTML/static locations, never on the API proxy |
| `sshd-10-tradingbible-hardening.conf` | Immediate key-only SSH hardening; sorts before cloud-init drop-ins |
| `sshd-99-tradingbible.conf` | Future named-account and private-access target; do not apply while root is the only admin |
| `ufw-tradingbible.sh` | Inspect-first UFW helper; it stops before enabling the firewall |
| `fail2ban-tradingbible.local` | SSH, Nginx scanning and repeat-offender jails |
| `audit-tradingbible.rules` | Local auditd watches for identity, SSH, edge, persistence and application changes |
| `tradingbible-app-backup.sh` | Encrypted snapshot of code, SPA, controlled documents and runtime registers; excludes `.env` |
| `tradingbible-app-backup.service` | One-shot systemd unit for the encrypted snapshot |
| `tradingbible-app-backup.timer` | Daily 03:15 UTC schedule with persistent catch-up |
| `cloudflared-config.yml.example` | Tunnel ingress example; replace all placeholders |
| `hostinger-firewall.md` | Provider firewall design for the tunnel architecture |

## Rules

- Keep the Hostinger browser console and an existing SSH session open while changing access.
- Do not open public 80/443 when using a tunnel.
- Do not copy an old Cloudflare IP range from a blog. Use the official current list.
- Do not commit tunnel credentials, private keys, backup passphrases or environment files.
- Test the CSP and headers against the actual app before enforcing them.
- Record the change and verification evidence in the security register.
- The encrypted app snapshot is local-only. Escrow the backup passphrase offline and configure a separate off-site, immutable repository before calling the backup control complete.
