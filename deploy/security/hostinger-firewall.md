# Hostinger Firewall Design — Tunnel Architecture

Apply only in a controlled window after reading the production hardening runbook.

## Firewall group

Name: `TRADINGBIBLE-PRODUCTION-LOCKDOWN`

Default inbound: deny/drop.

| Direction | Protocol | Port | Source | Action |
| --- | --- | --- | --- | --- |
| Inbound | All | All | Anywhere | Deny by default |
| Outbound | TCP | 443 | Anywhere | Allow |
| Outbound | UDP | 41641 | Anywhere | Allow if Tailscale direct connections are required |
| Outbound | TCP | 80 | Anywhere | Allow only if package or certificate services require it |
| Outbound | DNS | 53 | Approved resolver | Allow |
| Outbound | Other | As required | Approved destinations | Allow by policy |

## What not to open

- Public SSH
- Public HTTP or HTTPS when using Cloudflare Tunnel
- PostgreSQL 5432
- Redis 6379
- MySQL 3306
- Node.js 3001
- Internal dashboards or development tools

## Verification

- Check the Hostinger firewall group is attached to the correct VPS.
- Test from an external network, not only from the server.
- Check IPv4 and IPv6.
- Keep the Hostinger browser console open while changing rules.
- Record the firewall export and the test result in `/admin/security`.

## Rollback

Remove the group or restore the previous group. Confirm public access and private SSH before declaring recovery complete.
