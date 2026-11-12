# Host hardening verification — 12 November 2026

**Target:** production VPS `2.25.166.110` (Hostinger), Ubuntu 26.10  
**Operator:** OpenCode agent, under explicit user authorization  
**Scope:** host firewall, SSH, API bind address, fail2ban, auditd, Nginx headers  
**Independent review:** not yet recorded

## Results

### Firewall and exposure

`ufw status verbose` reported:

- Status: active
- Default: deny incoming; allow outgoing; routed disabled
- Allowed inbound: `22/tcp`, `80/tcp`, `443/tcp` (IPv4 and IPv6 only)
- No database, Node, Redis, dashboard or management port allowed

External scan from the development machine to `2.25.166.110`:

| Port | Result |
| --- | --- |
| 22 | open (temporary public SSH; private access not yet implemented) |
| 80 | open |
| 443 | open |
| 3001 | closed |
| 5432 | closed |
| 6379 | closed |
| 8080 | closed |
| 3306 | closed |
| 27017 | closed |

The API now binds only to `127.0.0.1:3001`. Nginx proxies `/api/` to that loopback listener. The public Node port is closed.

`ss -tulpn` showed only these public listeners: `22/tcp`, `80/tcp` and
`443/tcp`. The API (`127.0.0.1:3001`), Ollama (`127.0.0.1:11434`) and
`llama-server` (`127.0.0.1:38527`) are loopback-only. Tailscale's UDP/41641
listener exists but is denied externally by UFW; external scans of 11434, 38527
and 41641 returned closed.

### SSH

Effective configuration after installing `/etc/ssh/sshd_config.d/10-tradingbible-hardening.conf`:

```text
LoginGraceTime 30
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
PermitRootLogin prohibit-password
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
```

A fresh SSH connection using the existing key succeeded after the reload. Root is still the only administrative account, so root key login remains enabled; `PermitRootLogin no` is intentionally not applied until a named sudo account is created and tested.

### Intrusion prevention

`fail2ban` is active with three jails:

- `sshd` (aggressive mode, four failures, one-hour ban)
- `nginx-botsearch` (web scanning, one-hour ban)
- `recidive` (repeat offenders, one-week all-port ban)

At test time: zero currently banned, zero total failed for the SSH jail. A
controlled ban of the TEST-NET address `192.0.2.123` created an nftables
`addr-set-sshd` element and a reject rule on TCP/22; unbanning removed the
element. The Nginx jail was corrected to read `/var/log/nginx/access.log`
rather than the Nginx systemd journal; a TEST-NET ban on `192.0.2.124` created
an nftables set with reject rules on TCP/80 and TCP/443 and was then removed.
The recidive jail reads `/var/log/fail2ban.log`. No production client address
was used.

### Audit logging

`auditd` is active. Rules were loaded from `/etc/audit/rules.d/99-tradingbible.rules` and confirmed with `auditctl -l`. They watch:

- identity files, sudoers and root SSH keys;
- SSH, Nginx and TLS configuration;
- cron, systemd units and other persistence locations;
- the production API `.env`, source tree and controlled storage;
- privilege-transition syscalls for interactive accounts.

Audit records are local only. There is no central log destination or SIEM and no tested alert route yet.

### Tailscale (installed, authentication pending)

Tailscale `1.104.6` was installed from the vendor package repository and
`tailscaled` is active. `tailscale up --accept-dns=false --ssh=false` is waiting
for device authorization. `tailscale status` still reports `Logged out`, so no
private path is claimed yet. A UFW rule allows TCP/22 only on the future
`tailscale0` interface; public SSH on 22 remains enabled as the fallback until a
fresh session over Tailscale is proven.

### Nginx and API headers

The public HTML response now returns HSTS, CSP, `nosniff`, frame, referrer and permissions headers. The API returns the Helmet-owned headers without duplicate edge copies. The HTTP redirect returns `server: nginx` without a version. A browser check of eight public routes recorded zero CSP violations, page errors, failed requests or navigation failures.

## Limitations

This evidence does **not** establish:

- a Hostinger provider firewall or private origin path;
- Tailscale or any private administrator network;
- MFA or hardware-key enrolment for administrators;
- a WAF, DDoS provider or Cloudflare Tunnel;
- a central SIEM, alert destination or on-call test;
- a database backup or database restoration test;
- any certification, audit opinion or independent penetration test.

## Commands used

The checks used read-only or documented hardening commands, including `ufw status verbose`, `ss -tulpn`, `/usr/sbin/sshd -T`, a fresh `ssh` connection, `fail2ban-client status`, `auditctl -l`, HTTP header checks and an external TCP connect scan. No secret values were printed or recorded.
