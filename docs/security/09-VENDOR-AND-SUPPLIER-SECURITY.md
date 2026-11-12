# Vendor and Supplier Security

**Controlled programme document · management approval not recorded**

## 1. Purpose

A supplier can become the route through which an attacker enters TradingBible. This policy sets minimum due diligence for providers that receive company or customer data, can change production, or can affect payments, identity, email or recovery.

## 2. Supplier criticality

| Tier | Definition | Examples | Minimum review |
| --- | --- | --- | --- |
| Critical | Can access or destroy customer data, production, payments, identity, source code or backups; outage stops the business. | Cloud hosting, Supabase, Cloudflare, identity provider, payment provider, source control, backup provider, incident-response retainer. | Full assessment before use; annual review; security and legal review. |
| High | Material operational or data exposure but not immediate production control. | Email, analytics, support, AI provider, payroll, monitoring, SMS. | Assessment before use; annual review. |
| Medium | Limited data or short-lived integration. | Design tools, scheduling, non-sensitive research. | Lightweight review; review on renewal. |
| Low | No company or customer data; no production access. | Public content subscriptions. | Register and review on renewal. |

## 3. Due diligence

Before connecting a critical or high supplier, record:

- what customer and company data it receives;
- whether data is encrypted in transit and at rest;
- whether MFA and single sign-on are supported and enforceable;
- where data is stored and which subcontractors are used;
- whether it has an independent security audit or certification, and the scope, period and exceptions;
- how it reports security incidents and how quickly;
- whether access can be revoked immediately;
- what happens to data on termination;
- backup, retention and deletion terms;
- availability and recovery commitments;
- liability, indemnity, insurance and notification terms; and
- whether the contract addresses data protection and security responsibilities.

A SOC 2 Type II report or ISO 27001 certificate is useful evidence, but a badge alone is not an assessment. Review the scope, period, exceptions and whether the service actually covered by the report is the service TradingBible uses.

## 4. Contract clauses

Critical and high suppliers should address:

- confidentiality and permitted use;
- data protection, subprocessors and international transfers;
- security incident notification without undue delay;
- cooperation with investigation and regulators;
- access control, MFA and personnel screening;
- vulnerability management and penetration-test evidence;
- backup, disaster recovery and data return;
- deletion and certification of deletion on termination;
- audit rights or independent assurance;
- service levels and termination assistance;
- liability, indemnity and insurance; and
- governing law and dispute resolution.

Do not accept a supplier's standard terms without review when the service is critical.

## 5. Access control

- Use a named individual account, not a shared supplier login.
- Require MFA.
- Grant the minimum scope and time window.
- Log supplier access.
- Revoke access when the engagement ends or the supplier changes personnel.
- Do not give a supplier permanent production administrator access for convenience.
- Require approval before a supplier connects a new integration or subprocessor.

## 6. AI suppliers

For an AI provider, record:

- what prompts, files and customer data are sent;
- whether inputs or outputs are used for model training;
- retention and deletion periods;
- where processing occurs;
- whether human reviewers can access the data;
- model and vendor change-notification terms;
- data-processing and confidentiality terms; and
- how to disable the integration and delete data.

Do not send customer data, source code, credentials or material non-public information to an unapproved AI service.

## 7. Payment and financial suppliers

Payment providers must be PCI-compliant for the relevant service. Confirm:

- hosted components or tokenisation so TradingBible does not store card data;
- webhook signature and replay controls;
- settlement, refund and dispute permissions;
- incident notification;
- account-takeover protections;
- payout and bank-instruction change controls; and
- reconciliation reporting.

A payment provider's compliance does not make TradingBible PCI-compliant for its own systems.

## 8. Register fields

The admin vendor register records:

- name, purpose and relationship (current, proposed or former);
- criticality;
- data categories;
- MFA and encryption evidence;
- certification or audit evidence reference;
- data-processing agreement status;
- incident-notification terms;
- assessment status and reference;
- review date; and
- notes and conditions.

Approval requires a dated assessment reference. A rejected supplier requires a reason.

## 9. Review and termination

- Review critical suppliers annually and after a material incident or service change.
- Reassess when the supplier changes ownership, subprocessors, data location or security posture.
- On termination, confirm data return, deletion, access revocation and certificate of deletion where required.
- Remove the supplier from the register only after the relationship and data obligations end.
- Keep evidence for the applicable retention period.

## 10. Evidence

Store assessment reports, contract clauses, security questionnaires, certification scope, data-processing agreements, access-review records, incident notices and termination evidence in controlled storage. Record the reference in the register, not the confidential evidence itself.
