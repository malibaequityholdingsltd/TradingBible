# Zero-Trust Architecture and Trust Boundaries

**Controlled programme document · approval not recorded**

## 1. Design principle

Nobody, no device and no application gets automatic trust because it is connected to the company network. Every request must be authenticated, authorised and logged according to its sensitivity. Network location is a signal, not a permission.

For TradingBible this means:

- the public cannot reach the database, SSH, Node.js or internal dashboards directly;
- administrators do not use a shared root login or a permanent public SSH port;
- customer data is scoped to the customer at the database and API layers, not only in the React UI;
- broker credentials are encrypted server-side and scoped to read-only access where the product only journals;
- an AI agent cannot perform a consequential action solely because a user or uploaded document instructs it to; and
- a compromised laptop or stolen session does not automatically grant production administration.

## 2. Current deployment reality

Repository and deployment documentation describe:

- a React/Vite frontend built to static assets;
- a Node/Express API on a Hostinger VPS running Ubuntu 24.04;
- Nginx as the local reverse proxy;
- PM2 managing the API process;
- Supabase Cloud for authentication, PostgreSQL and storage; and
- public DNS currently at Hostinger parking nameservers.

Read-only checks on 12 November 2026 found the public origin responding directly and no observed Cloudflare edge. Do not assume the target architecture below is already deployed.

## 3. Target architecture

```text
Customers, staff, API clients
          |
          v
Cloudflare security edge
DNS · DNSSEC · DDoS · WAF · bot controls · rate limits · TLS
          |
          |  Cloudflare Tunnel (outbound from VPS; no public web ports)
          v
Hostinger VPS — Ubuntu 24.04 LTS
Hostinger provider firewall · UFW host firewall
Nginx bound to 127.0.0.1:8080
Node.js API bound to 127.0.0.1:3001
          |
          |  outbound authenticated connection only
          v
Supabase Cloud
Auth · PostgreSQL · Storage · backups available on selected plan

Administrator access
Authorised person + MFA + private device
          |
          v
Tailscale tailnet (or approved private access gateway)
          |
          v
SSH on tailscale0 only · named administrator account · no root login

Independent services
EDR · central logs · encrypted backup account · alert destination
```

The tunnel is preferred because it avoids exposing public HTTP and HTTPS ports. If a conventional Cloudflare-proxied origin is used instead, allow only the current official Cloudflare IP ranges at the provider and host firewall, and verify IPv4 and IPv6. Do not copy an old range from a blog.

## 4. Trust boundaries

| Boundary | Untrusted side | Trusted side | Required control |
| --- | --- | --- | --- |
| Internet to edge | Any client | Cloudflare edge | TLS, WAF, DDoS, bot and rate controls |
| Edge to origin | Cloudflare tunnel or approved proxy | Nginx on loopback | Tunnel or authenticated origin pull; no public origin bypass |
| Public app to API | Browser session | Node API | Server-side token validation and authorisation |
| API to database | Application service | Supabase | Service-role key server-only; RLS for user-scoped access |
| Customer A to Customer B | Another tenant | Own tenant | RLS, API object checks, isolation tests |
| Employee laptop to production | Managed device | Private administration path | EDR, encryption, MFA, least privilege, access review |
| AI model to tools/data | Untrusted prompt or document | Company systems | Server-side tool allow-list, tenant isolation, approval gate |
| Payment provider to billing | Webhook caller | Company ledger | Signature verification, replay defence, idempotency |
| Backup account to production | Separate recovery plane | Production data | Separate credentials, immutability, deletion protection |

## 5. Service-binding rules

- Nginx listens on loopback, not all interfaces, when a tunnel is used.
- Node.js listens on `127.0.0.1`, never `0.0.0.0` on a public host.
- PostgreSQL, Redis, MySQL, internal dashboards and development tools are not public.
- The API trusts one explicit proxy hop, not an arbitrary `X-Forwarded-For` chain.
- The browser never receives a Supabase service-role key or another administrative secret.
- The application uses separate credentials for user-scoped and administrative database access.
- Environment files are owned by the deployment user, readable only by that user and the service account, and never committed.

## 6. Identity and administration

- Use one primary workforce identity provider. Do not create disconnected accounts for every supplier.
- Enforce MFA for email, source control, cloud, Supabase, hosting, DNS, payroll, banking and password management.
- Issue two FIDO2 hardware keys or device-bound passkeys per privileged administrator. Prefer them over SMS.
- Use named accounts. Disable shared root and shared administrator logins.
- Use a separate normal account for daily email and browsing.
- Put SSH on the private tailnet only. Keep the Hostinger browser console available while changing access.
- Review privileged access monthly and all workforce access quarterly.
- Remove access and recover devices on the exit date.
- Test the break-glass recovery path before relying on it.

## 7. Database and customer isolation

- Enable RLS on every exposed Supabase table.
- Test SELECT, INSERT, UPDATE and DELETE separately for each role and operation.
- Keep the service-role key server-side. A Vite bundle is public to the user who downloads it.
- Do not assume that enabling RLS is sufficient; review grants and policies together.
- Restrict storage buckets and object ownership policies.
- Use separate production and test databases. Do not test destructive migrations against production.
- Log bulk exports and unusual database access.
- Never store broker passwords. Use read-only OAuth or API keys and encrypt tokens.

## 8. Application and API trust

- Authenticate and authorise on the server for every sensitive route.
- Treat the UI as a convenience, not a security boundary.
- Validate request shape and allowed values on the server.
- Apply object-level authorisation, not only role-level checks.
- Rate-limit login, password reset, public writes, AI and API endpoints.
- Verify payment webhook signatures over the raw body and reject replays.
- Validate upload size, type and magic bytes; store outside the web root.
- Set a reviewed CSP, HSTS, frame, nosniff, referrer and permissions policy on the public SPA and API.
- Separate development, staging and production. A developer must not be able to change code, approve their own release and access all production data without oversight.

## 9. AI trust boundary

- Separate each customer's AI conversation and memory.
- Do not expose system prompts, credentials or secret configuration.
- Validate every AI tool call on the server against an allow-list.
- Require human approval for consequential financial, compliance or irreversible actions.
- Treat web content and uploaded files as untrusted; scan and validate them.
- Prevent one tenant's context from entering another session.
- Redact personal information from logs where possible.
- Test prompt injection, data exfiltration and malicious document handling.
- Maintain human review for financial or compliance outputs.

## 10. Payment trust boundary

- Use a PCI-compliant provider and hosted payment components where possible.
- Do not store full card numbers or CVV values.
- Verify Stripe and Paddle webhook signatures cryptographically.
- Prevent duplicate processing and reconcile the provider ledger against company records.
- Require additional approval for refunds, payouts and changes to banking instructions.
- Treat a future wallet, stored-value facility, card programme or token payment as a separate regulated and security assessment.

## 11. Deployment sequence

The detailed commands are in `12-PRODUCTION-HARDENING-RUNBOOK.md`. The safe order is:

1. Take a recovery backup and verify access to the Hostinger console.
2. Install and verify private administrative access before disabling public SSH.
3. Apply the provider firewall and UFW rules in a controlled window.
4. Connect the domain to the chosen edge and verify the tunnel or proxy path.
5. Enable WAF, DDoS, bot and rate controls in staging or monitor mode first.
6. Bind Nginx and Node to loopback and verify health through the edge.
7. Apply security headers and test the public SPA, API, uploads, websockets and payment callbacks.
8. Run the acceptance tests and record evidence.
9. Keep the previous configuration and a rollback command ready.

Do not combine a tunnel migration, DNS cutover, firewall change and application deployment in one untested step.

## 12. Docker warning

Docker can bypass ordinary UFW filtering for published container ports. If Docker is introduced, review its forwarding chains and published ports explicitly. The current documented deployment uses PM2 and Nginx, not container publication, but that must be re-verified before any Docker migration.

## 13. Explicit non-claims

This architecture is a target design. It is not evidence that Cloudflare, Tailscale, UFW, EDR, SIEM, immutable backups or private SSH are configured. Those controls become complete only when the admin register contains a real configuration export, test result or dated evidence reference.
