# Cloudflare and Network Controls

**Controlled configuration guide · change authorization not recorded**

## 1. Purpose

This guide describes the recommended Cloudflare configuration for TradingBible.app. It is not evidence that Cloudflare is currently managing the domain. On 12 November 2026, read-only DNS checks showed Hostinger parking nameservers and a directly responding origin.

## 2. Prerequisites

Before changing DNS:

- take a full recovery backup;
- export the current DNS records and Nginx configuration;
- confirm registrar access and MFA;
- confirm the Hostinger recovery console works;
- choose the tunnel or conventional-proxy design, not both casually;
- lower the TTL on records that will change;
- schedule a maintenance window; and
- have a rollback owner available.

## 3. DNS and registrar

1. Enable registrar lock, MFA and login alerts on the domain registrar.
2. Move authoritative DNS to Cloudflare only after reviewing every record.
3. Inventory A, AAAA, CNAME, MX, TXT, CAA, SRV and verification records.
4. Remove dangling records that point to decommissioned services.
5. Enable DNSSEC after confirming the registrar supports the DS record and the resolver path works.
6. Add CAA records for the certificate authorities in use.
7. Confirm SPF, DKIM and DMARC alignment with the mail provider.
8. Do not copy DNS records from an old screenshot; verify each one.

### Email authentication

Current observed records on 12 November 2026:

```text
SPF:   v=spf1 include:_spf.mail.hostinger.com ~all
DMARC: v=DMARC1; p=none
```

The recommended sequence is:

1. confirm the actual sending providers and IPs;
2. configure DKIM for each sender;
3. tighten SPF to only the required providers;
4. publish a DMARC reporting address;
5. monitor reports;
6. move DMARC to `p=quarantine`, then `p=reject`; and
7. record the final policy and evidence.

Do not move to `p=reject` before every legitimate sender is aligned. A mistaken DMARC rollout can stop password-reset and investor-letter email.

## 4. TLS

- Set SSL/TLS mode to **Full (strict)** only when the origin has a valid certificate.
- Enforce HTTPS and automatic HTTPS rewrites.
- Enable TLS 1.2 and 1.3; disable obsolete protocols.
- Enable HSTS only after confirming every subdomain supports HTTPS. A long HSTS policy with `includeSubDomains` can lock users out of an HTTP-only subdomain.
- Monitor certificate expiry at both the edge and origin.
- Do not use the "Flexible" mode for an application that handles authentication or payment data.

## 5. WAF

Start in a controlled mode, review events and then enforce.

Recommended rule groups:

1. Cloudflare managed rules for common exploits.
2. OWASP Core Rule Set where the plan supports it.
3. Custom rules for admin paths and authentication endpoints.
4. Rate limits for login, password reset, signup, public writes and AI.
5. Bot protection for automated abuse.
6. Country or IP restrictions only where legally and operationally justified; do not block a customer market by accident.

### Suggested rate-limit design

| Path | Suggested initial limit | Action |
| --- | --- | --- |
| `/api/auth/send-email` | 10–15 per 15 minutes per IP and email | Managed challenge or block with a clear error |
| Login and passkey endpoints | 20 per 15 minutes per IP | Challenge, then block |
| Password reset | 5–10 per hour per IP and account | Challenge, then temporary block |
| Public write or application endpoints | 30 per 10 minutes per IP | Challenge or block |
| AI endpoints | Plan-specific quota per authenticated user | Throttle and alert |
| Admin paths | Allow approved networks or Access policy | Block or require Access |

Rate limits at the edge and in the API should complement each other, not contradict each other. Test the real client IP behind the tunnel or proxy. Do not create a global rule that blocks monitoring, payment webhooks or legitimate API clients.

### Custom WAF rules

- Block obvious path traversal and known exploit patterns.
- Challenge requests to administrative paths from unexpected locations.
- Protect against credential stuffing with a combination of rate limit and bot score.
- Allow payment-provider webhook paths only from the provider's documented sources where feasible; verify signatures in the application regardless.
- Do not rely on a WAF to fix broken access control or an exposed database.

## 6. DDoS

- Enable the provider's automatic L3/L4 and L7 DDoS protection.
- Configure alerts for attack volume and origin health.
- Confirm the origin is not directly reachable during an attack.
- Keep a runbook for enabling "under attack" mode, but test the customer impact first.
- Do not silently block a whole region or ISP without a legal and commercial review.

## 7. Bot protection

Use bot protection for signup, login, password reset, public forms and API abuse. Prefer risk-based challenges over permanent CAPTCHA. Monitor false positives and provide an accessible support route for customers who cannot complete a challenge.

## 8. Cloudflare Tunnel

The preferred design:

- install `cloudflared` on the VPS from the official package;
- create a named tunnel;
- route `tradingbible.app` and `www` to `http://127.0.0.1:8080`;
- keep Nginx bound to loopback;
- keep Node bound to loopback;
- close public 80/443 at the provider and host firewall;
- protect the tunnel credentials with restrictive permissions; and
- store recovery credentials offline.

Do not paste tunnel credentials into chat, Git, a public ticket or the frontend. Do not run the tunnel as an unprivileged user with access to unrelated secrets if a dedicated service account is available.

## 9. Cloudflare Access for administrative surfaces

If administrative dashboards are exposed through the edge, put them behind Cloudflare Access or an equivalent identity-aware proxy:

- require MFA;
- restrict to named users or groups;
- use short session lifetimes;
- log access; and
- keep a break-glass path that is tested and audited.

Cloudflare Access does not replace application-level admin authorisation. Both layers should exist.

## 10. Conventional proxy alternative

If a tunnel is not used:

- allow only the current official Cloudflare IPv4 and IPv6 ranges to the origin;
- verify both protocols;
- ensure the origin firewall does not allow the rest of the internet;
- configure Nginx to trust the correct forwarded headers;
- confirm the API trusts one explicit proxy hop; and
- test direct-origin access from outside the allowed ranges.

Use the official Cloudflare IP list at `https://www.cloudflare.com/ips/`. Do not copy an old list from a blog. Re-check the list periodically and automate the update only with a tested process.

## 11. Alerts

Configure alerts for:

- WAF attack spikes;
- DDoS activity;
- unusual 5xx or origin errors;
- rate-limit blocks above a threshold;
- certificate expiry;
- DNS record changes;
- tunnel disconnection;
- unusual admin-path traffic; and
- bot-score or challenge anomalies.

Send critical alerts to a monitored destination outside the affected production account. Test delivery, not just configuration.

## 12. Verification

After a change:

```bash
curl -sS -D - -o /dev/null https://tradingbible.app
curl -sS -D - -o /dev/null https://tradingbible.app/api/health
curl -sS -D - -o /dev/null http://tradingbible.app
dig +short A tradingbible.app
dig +short AAAA tradingbible.app
dig +short CAA tradingbible.app
dig +short TXT _dmarc.tradingbible.app
```

Check:

- the expected edge is serving the domain;
- direct origin access is blocked or authenticated;
- TLS is valid and HTTPS is enforced;
- headers are present without conflicting duplicates;
- login, password reset, uploads, websockets, payment callbacks and admin routes work; and
- the rollback path is still available.

## 13. Non-claims

A Cloudflare subscription is not a security programme. A WAF does not replace secure application code, database isolation, MFA or incident response. Record the actual configuration, test result and reviewer in `/admin/security` before marking a control implemented or verified.
