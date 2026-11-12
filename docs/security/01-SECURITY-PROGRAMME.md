# Security Programme and Governance

**Controlled programme document · approval not recorded**

## 1. Purpose and scope

This programme protects the whole business, not only the public website. Its scope includes:

- TradingBible.app, customer accounts, login and support flows;
- trading journals, trading histories, watchlists and broker connections;
- customer identity, contact, billing and payment records;
- AI systems, prompts, research, signals and analytical models;
- source code, databases, APIs, cloud infrastructure and deployment pipelines;
- employee laptops, phones, email, source control and administrative accounts;
- payments, subscriptions, refunds and financial records;
- company intellectual property, investor documents and confidential records; and
- future enterprise, developer-API and white-label services.

The programme does not cover another company's systems, a customer's own brokerage account controls, or a future regulated product that has not received its own legal and security assessment. A future wallet, stored-value facility, card programme or token feature must not inherit an assumption that ordinary subscription-payment controls are sufficient.

## 2. Security objective

No firewall, antivirus product or certification guarantees that a company will never be breached. TradingBible's objective is to prevent attacks where practical, detect intrusions quickly, contain damage, restore operations and protect customer information if an attacker gets through.

This means the company must be able to answer five questions at any time:

1. What do we have, and who owns it?
2. Who can access it, and how is that access approved and reviewed?
3. What would tell us that access or data is being misused?
4. What do we do in the first hour, and who decides?
5. How do we restore service without destroying evidence or losing customer data?

## 3. Governance

| Role | Accountability |
| --- | --- |
| Board / CEO | Security accountability, material risk acceptance, budget and quarterly reporting. |
| Security owner / CISO | Programme ownership, control and risk registers, incident command, assurance plan. |
| Engineering lead | Secure development, application access control, dependency and secret scanning, release integrity. |
| Infrastructure lead | Edge, firewalls, private access, Ubuntu hardening, backups and monitoring. |
| General Counsel | Notification, contractual, employment, securities and regulatory assessment. |
| People Operations | Training records, onboarding, access removal and device return. |
| All staff and contractors | Follow policy, protect credentials and devices, report suspected incidents immediately. |

The security owner must have authority to stop a release, suspend an integration or revoke access without waiting for commercial approval. A named deputy must be documented for each critical role. The register currently shows **Security owner not appointed**; this is a launch-critical gap.

The board or CEO should receive a quarterly report covering material incidents, open critical risks, control gaps, assurance results, budget and any decision requested. Material incidents should be escalated immediately, not held for the quarterly cycle.

## 4. Risk method

Likelihood and impact are scored from 1 to 5. The register calculates `score = likelihood × impact`.

| Score | Rating | Treatment expectation |
| --- | --- | --- |
| 20–25 | Critical | Treat immediately; consider suspending the affected feature or access. |
| 12–19 | High | Named owner, target date and executive visibility. |
| 6–11 | Medium | Planned treatment and periodic review. |
| 1–5 | Low | Monitor or accept with a recorded review date. |

An accepted risk requires a named decision-maker, an acceptance reference and a review date. Acceptance is not a substitute for fixing a critical control that protects customer data. A closed risk requires closure evidence.

The initial seeded risks are programme findings, not a complete enterprise risk assessment. They include origin exposure, unverified RLS, administrator MFA, monitoring, restore testing, public headers, email-domain protection, supplier assessment, AI isolation, supply chain and the absence of independent penetration testing.

## 5. Current baseline and known gaps

The following observations were collected using read-only checks on 12 November 2026. They must be re-tested after any change.

| Observation | Evidence | Implication |
| --- | --- | --- |
| DNS authoritative nameservers are Hostinger parking nameservers. | `evidence/2026-11-12-dns-check.txt` | DNS is not observed behind the proposed Cloudflare edge. |
| No DS or DNSKEY response and no CAA record were returned. | Same | DNSSEC and certificate-authority authorisation need review. |
| DMARC is `p=none`; SPF ends in `~all`. | Same | Email-domain impersonation protection is not enforcing. |
| The public A record resolves to a Hostinger address and the origin responds. | Same; public header check | A WAF/tunnel bypass path may exist. |
| HTTPS uses a valid Let's Encrypt certificate and TLS 1.3. | `evidence/2026-11-12-tls-check.txt` | Transport encryption works; renewal monitoring still needs evidence. |
| The public HTML response did not show HSTS, CSP, frame, referrer or permissions headers. | `evidence/2026-11-12-public-header-check.txt` | The SPA is missing a reviewed header set. |
| API Helmet headers are present, but Nginx adds duplicate HSTS, nosniff, frame and referrer headers. | Same | Header ownership and conflict review are required. |
| The HTTP redirect discloses `nginx/1.30.4`. | Same | Server-version disclosure should be removed. |
| Unauthenticated `/api/admin/users` returns `401`. | Same | A basic admin gate is present, but role and session tests remain incomplete. |
| No production RLS audit, restore test, central SIEM, independent penetration test or certification is recorded. | Register | These are open assurance gaps, not implied failures or passes. |

## 6. Technology shortlist

The shortlist is a planning aid, not a claim that any product is installed.

| Area | Candidate | Priority | Decision note |
| --- | --- | --- | --- |
| Edge, DNS, WAF, DDoS, bot and rate limits | Cloudflare | Critical | Start with the plan that covers WAF, rate limits and tunnel. Validate rules in staging. |
| Origin hiding | Cloudflare Tunnel | Critical | Preferred target keeps public inbound web ports closed. |
| Private administrator access | Tailscale | Critical | Individual accounts, MFA and an access review are required. |
| Endpoint | Microsoft Defender for Business, CrowdStrike Falcon or SentinelOne | High | Choose one, configure it properly, do not buy overlapping products. |
| Identity | Microsoft Entra ID or Google Workspace | High | Choose one primary identity provider and integrate rather than fragmenting accounts. |
| Passwords and secrets | 1Password Business or equivalent | High | Enforce MFA and vault ownership. Do not share credentials in chat. |
| Monitoring | Wazuh or a managed detection service | High | A separate monitoring host is preferable to overloading the production VPS. |
| Code security | GitHub private repository controls plus Snyk or equivalent | Critical | Secret scanning, dependency alerts, branch protection and code review. |
| Hardware keys | YubiKey 5 NFC or equivalent FIDO2 key | Critical | Two per privileged administrator. |
| Assurance | Independent penetration tester | Critical | Written scope, rules of engagement, evidence handling and retest. |
| Incident support | Qualified incident-response retainer | High | Confirm availability and forensic handling before an incident. |

The existing stack includes Hostinger VPS, Supabase Cloud, Nginx, PM2, Node.js and a GitHub repository according to deployment documentation. Those components require configuration verification; their presence is not a security control.

## 7. Planning budget

These are planning ranges in USD, not quotations. Actual pricing depends on employee count, data volume, cloud architecture, log volume and plan tier.

| Area | Planning allowance |
| --- | --- |
| WAF, DNS and DDoS | $0–$500/month |
| Workforce identity and MFA | $50–$250/month |
| Password management | $30–$150/month |
| Endpoint protection | $50–$300/month |
| Monitoring and SIEM | $100–$700/month |
| Backups and recovery | $50–$300/month |
| Vulnerability scanning | $100–$500/month |
| Independent penetration test | $5,000–$20,000 per engagement |
| Incident-response retainer | $3,000–$15,000/year |

A small, carefully scoped operating budget may fall around **$500–$2,700 per month**, excluding major one-off testing and incident costs. Do not purchase every tool immediately. First map the systems, choose the architecture, configure existing services correctly and test the controls.

## 8. 90-day implementation plan

### Days 1–14 — Lock down the company

- Enable MFA and hardware-key protection for administrators.
- Secure email, domain registrar, DNS and hosting accounts.
- Inventory the public origin, ports, databases and administrative paths.
- Review Supabase tables, RLS policies and grants using the read-only audit.
- Remove exposed secrets and rotate any credential that may have been exposed.
- Protect source control and production deployment permissions.
- Configure encrypted backups and a restoration test.
- Keep an existing recovery session open while changing firewall or SSH access.

### Days 15–30 — Secure the application

- Apply a reviewed public security-header set and validate the CSP.
- Test authentication, password recovery, session management and admin authorisation.
- Test customer-to-customer data isolation through the UI, API and direct Supabase client.
- Test broker permissions, token revocation and webhook signature verification.
- Run dependency, secret and source-code scans and fix critical findings.
- Commission an independent application penetration test.
- Fix critical and high findings before expanding access to real customer data.

### Days 31–60 — Build detection and response

- Define the security-event schema and centralise logs.
- Configure high-priority alerts and test out-of-hours delivery.
- Deploy endpoint protection to company devices.
- Adopt the incident-response plan and test the contact tree.
- Restore a backup into isolation and record achieved recovery time.
- Train employees, developers and support staff.
- Assess critical suppliers and record evidence and review dates.

### Days 61–90 — Independent assurance

- Conduct a second security assessment and retest prior findings.
- Test disaster recovery and the ransomware scenario.
- Run a phishing simulation and follow-up training.
- Review privileged and workforce access.
- Close outstanding vulnerabilities or record approved exceptions.
- Produce a formal security assessment report and board summary.
- Approve the ongoing security budget and monitoring schedule.

## 9. Operating metrics

Track a small number of meaningful measures:

- percentage of launch-critical controls with verified evidence;
- number of open critical and high risks past their target date;
- mean time to patch critical internet-facing vulnerabilities;
- MFA and hardware-key enrolment for privileged users;
- percentage of company devices compliant with encryption, EDR and patching;
- restore-test success and achieved RPO/RTO;
- phishing report rate and repeat-click rate;
- alert acknowledgement and incident containment time; and
- supplier assessments overdue for review.

Do not use the total number of security products as a measure of security.

## 10. Review and change control

The programme is reviewed annually and after a material incident, a significant architecture change, a new regulated product or a critical audit finding. Policy adoption, board approval and risk acceptance are recorded separately from the document file. The admin register is the live control record; this document explains the design.
