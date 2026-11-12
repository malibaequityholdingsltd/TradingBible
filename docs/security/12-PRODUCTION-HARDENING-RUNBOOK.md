# Production Hardening Runbook

**Controlled operational runbook · change authorization not recorded**

> **Do not run this runbook end-to-end on a live server without authorization.** A firewall, SSH, DNS or tunnel mistake can lock the company out of production. Keep an existing SSH session and the Hostinger browser console open while making access changes. Take a recovery backup and read the rollback section first.

## 1. Target outcome

- Hostinger provider firewall denies public inbound traffic by default.
- Ubuntu UFW denies inbound traffic by default.
- SSH is available only over a private Tailscale interface, with named accounts and no root login.
- Cloudflare Tunnel or an authenticated origin path exposes the public application; the VPS has no public HTTP/HTTPS ports in the tunnel design.
- Nginx listens on loopback and proxies to a Node API bound to loopback.
- Security headers are applied consistently.
- The public DNS, TLS, WAF, DDoS and rate controls are verified.
- Backups, monitoring and recovery are tested before the change is declared complete.

## 2. Preflight inspection

Run these first and save the output as evidence. Do not change anything yet.

```bash
sudo -i
date -u
hostnamectl
whoami
ss -tulpn
sudo ufw status verbose
systemctl status ssh --no-pager
systemctl status nginx --no-pager
pm2 status
node -v
nginx -v
cloudflared --version 2>/dev/null || true
tailscale status 2>/dev/null || true
df -h
free -h
```

Also record:

- the current public DNS A/AAAA records;
- the current Hostinger firewall group;
- the current Nginx site configuration and a copy;
- the current SSH configuration and a copy;
- the current PM2 process list;
- the current TLS certificate and expiry;
- the current public security headers; and
- the current backup location and restore procedure.

Never copy `apps/api/.env` into a ticket, chat, Git commit or screenshot. If a configuration export is needed, redact secrets.

## 3. Recovery backup

Take a fresh backup before changes. Preserve the current runtime stores if they exist:

- `apps/api/storage/investor-letters/letters.json`
- `apps/api/storage/workforce/compliance.json`
- `apps/api/storage/security/programme.json`
- database backups and controlled HR/investor documents

Example application archive (adjust paths to the actual deployment):

```bash
sudo mkdir -p /root/tradingbible-recovery
sudo tar -czf /root/tradingbible-recovery/app-$(date -u +%Y%m%dT%H%M%SZ).tar.gz \
  --exclude='node_modules' \
  --exclude='apps/api/.env' \
  -C /var/www tradingbible
sudo chmod 600 /root/tradingbible-recovery/*.tar.gz
```

Take a database backup through the approved provider procedure. Verify that the backup can be listed and that the recovery key is available offline.

### 3.1 Encrypted application and runtime snapshot

`deploy/security/tradingbible-app-backup.sh` and the matching systemd unit and
timer create an AES256-encrypted snapshot of the API source, SPA, controlled
documents and runtime JSON stores. They exclude `.env` and `node_modules`.

```bash
sudo install -m 755 deploy/security/tradingbible-app-backup.sh /usr/local/sbin/tradingbible-app-backup
sudo install -m 644 deploy/security/tradingbible-app-backup.service /etc/systemd/system/
sudo install -m 644 deploy/security/tradingbible-app-backup.timer /etc/systemd/system/
sudo install -d -m 700 /var/backups/tradingbible /root/.config/tradingbible
sudo test -s /root/.config/tradingbible/backup.key || openssl rand -base64 48 | sudo tee /root/.config/tradingbible/backup.key >/dev/null
sudo chmod 600 /root/.config/tradingbible/backup.key
sudo systemctl daemon-reload
sudo systemctl start tradingbible-app-backup.service
sudo systemctl enable --now tradingbible-app-backup.timer
```

This is a **local** recovery aid. Escrow the passphrase offline and copy the
encrypted snapshots to a separate account with immutability/restricted deletion
before treating the backup control as complete. It does not back up Supabase
data or storage objects.

## 4. Stage 1 — Private administrator access

### 4.1 Install Tailscale

Use the official package instructions for Ubuntu 24.04. Verify the downloaded package and repository before installing. The convenience script is not a substitute for reviewing what is installed.

```bash
curl -fsSL https://tailscale.com/install.sh -o /tmp/tailscale-install.sh
less /tmp/tailscale-install.sh
sudo sh /tmp/tailscale-install.sh
sudo tailscale up
```

Authenticate the VPS in the Tailscale admin console. Require MFA on the identity provider. Restrict which users can reach the VPS.

### 4.2 Verify before changing SSH

From a second authorised device on the tailnet:

```bash
tailscale status
ssh tbadmin@<tailscale-ip-or-magic-dns-name>
```

Do not close the original SSH session until the private path is proven. If it fails, fix Tailscale before touching UFW or SSH.

### 4.3 Named accounts

```bash
sudo adduser tbadmin
sudo usermod -aG sudo tbadmin
sudo adduser --system --group --home /opt/tradingbible --shell /usr/sbin/nologin tbapp
sudo mkdir -p /opt/tradingbible
sudo chown -R tbapp:tbapp /opt/tradingbible
sudo chmod 750 /opt/tradingbible
```

Use `tbadmin` for administration and `tbapp` for the application service. Do not run the application as root.

### 4.4a Immediate key-only hardening (root-only host)

While root is the only administrative account, install
`/etc/ssh/sshd_config.d/10-tradingbible-hardening.conf`. The `10-` prefix is
required: OpenSSH keeps the first value it reads, and the Ubuntu cloud image
ships `50-cloud-init.conf` with `PasswordAuthentication yes`. A `99-*` file is
processed too late to override it.

```text
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
```

Validate, reload and prove a fresh key-authenticated session before keeping the
change:

```bash
sudo sshd -t
sudo systemctl reload ssh
ssh -o BatchMode=yes root@HOST 'echo SSH_OK'
sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin|maxauthtries'
```

The live production host uses this immediate hardening as of 12 November 2026.
Public SSH is still reachable on port 22; private access and administrator MFA
are not yet implemented.

### 4.4b Named-account target

After creating and testing `tbadmin`, and after private access is proven,
replace the immediate file with `/etc/ssh/sshd_config.d/99-tradingbible.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
```

Do not set `PermitRootLogin no` while root is the only way in. Validate with
`sshd -t` and test a second private session before disconnecting the original.

## 5. Stage 2 — Firewalls

### 5.1 Hostinger provider firewall

In hPanel, create a firewall group named `TRADINGBIBLE-PRODUCTION-LOCKDOWN` and apply it to the VPS.

For the tunnel design:

| Direction | Protocol | Port | Source | Action |
| --- | --- | --- | --- | --- |
| Inbound | All | All | Anywhere | Deny by default |
| Outbound | TCP | 443 | Anywhere | Allow |
| Outbound | UDP | 41641 | Anywhere | Allow if Tailscale direct connections are required |
| Outbound | TCP | 80 | Anywhere | Allow only if package/certificate services require it |
| Outbound | DNS | 53 | Approved resolver | Allow |
| Outbound | Other | As required | Approved destinations | Allow by policy |

Do not block outbound traffic blindly. The tunnel, DNS, package updates, application APIs, email and monitoring need outbound connectivity.

### 5.2 UFW

Install and set defaults:

```bash
sudo apt update
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

Allow SSH only over the private Tailscale interface. Confirm the interface exists first:

```bash
ip link show tailscale0
sudo ufw allow in on tailscale0 to any port 22 proto tcp
```

If the tunnel design is in place, do **not** open public 80/443. If a conventional Cloudflare-proxied origin is used, allow only the current official Cloudflare IP ranges and verify IPv4 and IPv6.

Enable and inspect:

```bash
sudo ufw enable
sudo ufw status numbered
sudo ss -tulpn
```

Expected: public 22, 80, 443, 3000, 3001, 5432, 6379, 8080 and 3306 are not reachable. Only the private interface should allow SSH.

### 5.3 Rollback

If access is lost:

- use the Hostinger browser console or recovery console;
- `sudo ufw disable` temporarily;
- restore the previous UFW rules and SSH configuration;
- restore the Hostinger firewall group;
- verify SSH before re-enabling.

Do not re-enable a restrictive firewall until the recovery path is proven.

## 6. Stage 3 — Nginx and Node binding

The tunnel should route to Nginx on loopback. Example `/etc/nginx/sites-available/tradingbible` for the tunnel design:

```nginx
server {
    listen 127.0.0.1:8080;
    server_name tradingbible.app www.tradingbible.app;

    server_tokens off;
    client_max_body_size 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'self' https:; media-src 'self' https: blob:; worker-src 'self' blob:;" always;

    root /var/www/tradingbible/dist/apps/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
}
```

This is a starting template. Validate the CSP against the real app before enforcing it. YouTube/TradingView frames, payment components, fonts, websockets and inline styles may require explicit sources. A broken CSP that gets disabled is worse than a tested rollout.

If Nginx owns HSTS, avoid duplicate HSTS from the API. Use the environment switch documented in `apps/api/.env.example` (`HELMET_HSTS=false`) and keep one owner for each header. Test the final response.

Enable and test:

```bash
sudo ln -sfn /etc/nginx/sites-available/tradingbible /etc/nginx/sites-enabled/tradingbible
sudo nginx -t
sudo systemctl reload nginx
sudo ss -tulpn | grep -E ':(80|443|8080|3001)\b' || true
```

Approve only after health checks and public tests pass.

## 7. Stage 4 — Cloudflare Tunnel

Install `cloudflared` using the official package instructions. Create a named tunnel and route DNS. Do not paste tunnel credentials into chat, Git or the frontend.

High-level sequence:

```bash
cloudflared tunnel login
cloudflared tunnel create tradingbible-prod
cloudflared tunnel route dns tradingbible-prod tradingbible.app
cloudflared tunnel route dns tradingbible-prod www.tradingbible.app
```

Create a root-owned config at `/etc/cloudflared/config.yml` with the tunnel UUID and a credentials file protected by restrictive permissions. Route `tradingbible.app` and `www` to `http://127.0.0.1:8080`.

Install and start the service using the provider's documented method. Then verify:

```bash
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared -n 80 --no-pager
sudo ss -tulpn | grep -E ':(80|443)\b' || true
curl -sS -D - -o /dev/null https://tradingbible.app
curl -sS -D - -o /dev/null https://tradingbible.app/api/health
```

Expected: public traffic succeeds through the edge, the origin has no public web port, and direct-origin access is denied or authenticated. The hostname may take time to propagate; use a low DNS TTL during the change.

### Rollback

- restore the previous DNS records at the registrar;
- stop and disable `cloudflared` if it is the cause;
- restore the previous Nginx listener and firewall rules;
- verify HTTPS and API health from a separate network; and
- record the failed change and the recovery time.

Do not combine a DNS cutover, firewall change and application deployment in one step.

## 8. Stage 5 — DNS, email and certificate controls

- Enable registrar lock and MFA on the registrar and DNS accounts.
- Inventory every DNS record and remove dangling records that could be taken over.
- Enable DNSSEC only after confirming the provider and resolver path.
- Add CAA records for the certificate authorities actually used.
- Confirm SPF, DKIM and DMARC alignment with the mail provider.
- Move DMARC from `p=none` to `quarantine`, then `reject`, only after monitoring reports.
- Confirm certificate renewal automation and expiry alerting.

## 9. Stage 6 — Verification and evidence

Run the read-only checks in `scripts/security-live-check.sh` and save the output. Record in `/admin/security`:

- firewall and UFW export;
- private-access test;
- public port result;
- TLS and header scan;
- DNS and email-authentication evidence;
- backup and restore test;
- monitoring alert test; and
- incident contact-tree test.

Do not mark a control verified because the command was run. Mark it verified only when the expected result is observed, dated and attributable to a tester.

## 10. Emergency rollback checklist

1. Open the Hostinger browser console.
2. If SSH is lost, disable UFW or restore the previous rules.
3. Remove or restore the active SSH drop-in from the backup. If the immediate `10-tradingbible-hardening.conf` change caused the loss, remove it and reload SSH; if the named-account `99-tradingbible.conf` change caused the loss, restore the previous file and reload SSH.
4. Restore the previous Nginx site and reload.
5. Restore the previous Hostinger firewall group.
6. Revert DNS if the edge cutover caused the outage.
7. Verify the public site, API health and admin login from a separate network.
8. Preserve logs and record the timeline.
9. Do not retry the same change until the failure is understood.

## 11. Change record

Record the change window, operator, approver, backup location, commands applied, verification results, rollback decision and any follow-up items. A production hardening change without a change record is incomplete.
