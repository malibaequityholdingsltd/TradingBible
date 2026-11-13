# TradingBible Holdings, Inc. — Security and Resilience Programme

**Controlled programme library · management approval not recorded**

This library defines the security controls, operating procedures and assurance gates for TradingBible. It is a controlled reference set, not evidence that a control is operating, that management has adopted a policy, or that an independent tester has signed off the platform.

The live control state, evidence references, risk register, incident log, supplier assessments, access reviews, training records and acceptance results are maintained in the admin console at **`/admin/security`** and stored server-side in `apps/api/storage/security/programme.json` with restricted file permissions. The JSON store is generated at runtime and is not committed.

## What this programme is for

TradingBible processes customer identity and contact data, trading journals and histories, broker connections, AI conversations, payment and billing records, source code and confidential company documents. A breach could harm customers, stop the service, trigger legal and regulatory duties and damage trust.

The objective is not to promise that TradingBible will never be hacked. The objective is to:

1. prevent attacks where practical;
2. detect intrusions quickly;
3. contain damage;
4. restore operations from verified backups; and
5. protect customer information even if an attacker gets through.

## Framework

The programme is organised around **NIST Cybersecurity Framework 2.0**: Govern, Identify, Protect, Detect, Respond and Recover. It uses the CIS Critical Security Controls for practical safeguards and the OWASP Top 10:2025 and OWASP API Security Top 10 for application testing.

TradingBible has **not** recorded an ISO/IEC 27001 certificate, a SOC 2 attestation, a PCI DSS assessment or a completed independent penetration test. See `14-ASSURANCE-AND-CERTIFICATION.md` before making any public security claim.

## Control layers

| Layer | Scope | Core question |
| --- | --- | --- |
| L1 Internet and network | DNS, WAF, DDoS, firewalls, origin path | Can an attacker reach the origin or management plane directly? |
| L2 Application and API | React/Vite, Node/Express, authentication, uploads, releases | Can the application be abused through its own features? |
| L3 Identity and access | MFA, passkeys, least privilege, reviews, offboarding | Who can administer the company, and how is that proven? |
| L4 Infrastructure, data and AI | Supabase, RLS, secrets, backups, broker tokens, AI context, payments | Can one customer or employee reach another party's data? |
| L5 Detection, response and recovery | Logs, alerts, EDR, SIEM, incident response, restore tests | Would we know, contain it and recover? |
| L6 Governance and assurance | Ownership, policies, risk, vendors, training, testing | Is accountability and independent evidence in place? |

## Document index

| Document | Purpose |
| --- | --- |
| `01-SECURITY-PROGRAMME.md` | Scope, governance, risk method, budget, technology shortlist and 90-day plan |
| `02-ZERO-TRUST-ARCHITECTURE.md` | Target architecture, trust boundaries and deployment principles |
| `03-INCIDENT-RESPONSE-PLAN.md` | Severity, command roles, containment, evidence, notification and recovery |
| `04-IDENTITY-AND-ACCESS-POLICY.md` | MFA, phishing-resistant authentication, least privilege and reviews |
| `05-DEVICE-AND-ENDPOINT-POLICY.md` | Company devices, encryption, patching, loss and return |
| `06-APPLICATION-AND-API-SECURITY-STANDARD.md` | Secure development, OWASP, release gates, headers and API controls |
| `07-DATA-DATABASE-BROKER-AND-AI-SECURITY.md` | RLS, service roles, customer isolation, broker tokens, payments and AI |
| `08-BACKUP-AND-DISASTER-RECOVERY.md` | Proposed RPO/RTO, backup layers, restoration tests and recovery |
| `09-VENDOR-AND-SUPPLIER-SECURITY.md` | Supplier criticality, diligence, contract terms and review |
| `10-SECURITY-AWARENESS-AND-PHISHING.md` | Employee rules, training, simulations and reporting |
| `11-ACCEPTANCE-TEST-PLAN.md` | The tests and evidence required before security sign-off |
| `12-PRODUCTION-HARDENING-RUNBOOK.md` | Staged UFW, SSH, Nginx, tunnel and rollback procedure |
| `13-CLOUDFLARE-AND-NETWORK-CONTROLS.md` | DNS, WAF, DDoS, rate limits, tunnel and origin lockdown |
| `14-ASSURANCE-AND-CERTIFICATION.md` | What may and may not be claimed about audits and certifications |

## Evidence rules

A control is not complete because a product was purchased, a policy file exists or a checkbox was clicked.

- `implemented` requires a real evidence reference: a configuration export, code path, signed document, screenshot in controlled storage or dated test.
- `verified` requires dated test evidence and a reviewer.
- `not_applicable` requires an explanatory note and an approval reference.
- A risk accepted by management requires an acceptance reference and a review date.
- A closed incident requires a resolution time, evidence reference and recorded lessons.
- A vendor approval requires a dated assessment reference. A SOC 2 or ISO badge alone is not an assessment.
- A passed acceptance test requires tester, date and evidence.

The platform records what an operator enters. It does not create counsel approval, a board decision, an EIN, a firewall rule, a backup or an independent test.

## Current baseline observations

Initial read-only checks on **12 November 2026** are preserved in `evidence/`:

- `2026-11-12-public-header-check.txt` — pre-hardening HTTPS, API headers, unauthenticated admin API response and HTTP redirect.
- `2026-11-12-dns-check.txt` — nameservers, A/AAAA, CAA, MX, SPF, DMARC and DNSSEC records.
- `2026-11-12-tls-check.txt` — certificate subject, issuer, validity, fingerprint and negotiated TLS.

Host hardening performed on **12 November 2026** is recorded in:

- `2026-11-12-host-hardening.md` — UFW, external port scan, key-only SSH, fail2ban, auditd and API loopback binding.
- `2026-11-12-public-header-check-after.txt` — HSTS, CSP, frame, content-type, referrer and permissions headers after removing duplicate edge/API copies.
- `2026-11-12-csp-browser-check.txt` — Chromium check of eight public routes with zero CSP violations or page errors.
- `2026-11-12-app-restore-test.md` — 33 MB application archive restored, syntax-checked and served successfully.
- `2026-11-12-encrypted-app-backup-test.md` — daily AES256 snapshot, checksum verification, decryption, register/handbook restore and SPA HTTP 200.
- `2026-11-12-postdeploy-verification.md` — final build gate, route status, headers, ownership normalization and backup timer state.
- `2026-11-12-error-handler-review.md` — production 5xx detail suppression, request-ID correlation and unauthenticated 401 verification.
- `2026-11-12-public-claims-and-access-control.md` — broker/webinar/funded/security-page claim corrections, exact admin allowlist, optional AAL2 MFA gate and live Chromium check.

Remaining observed gaps include public DNS at Hostinger parking nameservers, no observed DNSSEC, no CAA record, DMARC at `p=none`, no observed Cloudflare edge, a directly reachable origin, public SSH on port 22 without private access or administrator MFA, no WAF/DDoS provider, no central SIEM or alert destination, and no database restore test. These are evidence inputs and open risks, not permission to change a live server.

## Change boundary

Do not apply the firewall, SSH, DNS, Cloudflare, Tailscale, Supabase policy or Nginx changes in this library directly to production without:

1. a fresh recovery backup and a second recovery path;
2. a staging test or a controlled maintenance window;
3. explicit authorization from the system owner; and
4. a rollback plan that has been read by the operator.

The administration console is a register, not an execution engine. It does not modify Cloudflare, Hostinger, Tailscale, Supabase or the host firewall.

## Data boundary

Do not store the following in the security register:

- passwords, API keys, private keys or session tokens;
- customer names, trading records or broker credentials;
- identity documents, medical records or bank details;
- full incident evidence that contains personal data; or
- payment-card numbers or CVV values.

Record a controlled evidence reference and the restricted location instead.

## Review cadence

| Activity | Cadence |
| --- | --- |
| Privileged access review | Monthly |
| Full workforce access review | Quarterly |
| Risk register review | Quarterly, or after a material change |
| Critical supplier review | Annually, or after a material change |
| Incident-response exercise | At least every six months |
| Backup restoration test | At least monthly |
| Security awareness training | At onboarding and annually |
| Board or CEO security report | Quarterly |
| Full policy review | Annually and after a material incident |
