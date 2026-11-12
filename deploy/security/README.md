# Production Security Templates

These files are reviewed templates, not an automatic deployment. Do not apply them to the live VPS without the preflight, backup, recovery path and authorization described in `docs/security/12-PRODUCTION-HARDENING-RUNBOOK.md`.

| File | Purpose |
| --- | --- |
| `nginx-tradingbible-tunnel.conf` | Loopback Nginx listener for a Cloudflare Tunnel deployment, with security headers and API proxy |
| `sshd-99-tradingbible.conf` | SSH hardening for named accounts and private access |
| `ufw-tradingbible.sh` | Inspect-first UFW helper; it stops before enabling the firewall |
| `cloudflared-config.yml.example` | Tunnel ingress example; replace all placeholders |
| `hostinger-firewall.md` | Provider firewall design for the tunnel architecture |

## Rules

- Keep the Hostinger browser console and an existing SSH session open while changing access.
- Do not open public 80/443 when using a tunnel.
- Do not copy an old Cloudflare IP range from a blog. Use the official current list.
- Do not commit tunnel credentials, private keys or environment files.
- Test the CSP and headers against the actual app before enforcing them.
- Record the change and verification evidence in the security register.
