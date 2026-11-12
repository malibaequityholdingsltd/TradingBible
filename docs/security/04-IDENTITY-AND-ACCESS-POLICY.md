# Identity and Access Policy

**Controlled programme document · management approval not recorded**

## 1. Policy statement

Access to TradingBible systems is granted to a named person or service for a defined purpose, with the minimum privilege needed and a recorded approver. Network location, employment seniority or possession of a company laptop does not create automatic trust.

## 2. Scope

This policy applies to founders, directors, employees, contractors, advisers, suppliers and service accounts with access to:

- email, identity and password-management systems;
- source control, CI/CD and production deployment;
- Hostinger VPS, Cloudflare, DNS and registrar accounts;
- Supabase, databases, storage and backups;
- payment, billing, payroll and banking systems;
- AI tools, internal research, customer-support tools and company documents; and
- customer or investor data stored anywhere.

## 3. Account rules

1. Every human uses a named account. Shared human accounts are prohibited.
2. Privileged administrators use a separate administrative account from their normal email and browsing account.
3. Shared root or global administrator credentials are prohibited. Break-glass credentials are sealed, logged and tested.
4. Service accounts are named for the service, documented, scoped and owned. They are not used by humans for interactive work.
5. Accounts are disabled on the exit date or immediately on a security event.
6. Personal email is not used for company business. Company data is not stored in personal cloud accounts.
7. Credentials are never sent in chat, email, tickets or documents. Use the approved password manager or secret-sharing process.
8. One person may not approve their own production access, deployment or privilege elevation.

## 4. Authentication standard

| Account type | Minimum requirement |
| --- | --- |
| Customer account | Strong password or passwordless sign-in; MFA available; rate-limited login and recovery. |
| Employee normal account | Company identity provider with MFA. |
| Administrator / founder privileged account | Phishing-resistant FIDO2 key or device-bound passkey; two keys per person. |
| Finance, payroll, banking and payment administration | Phishing-resistant MFA where supported; dual approval for high-impact actions. |
| Source control and CI/CD | MFA; branch protection; restricted deployment rights. |
| Service account | Secret stored server-side; scoped; rotated; no interactive login. |

SMS is a fallback only where a stronger factor is unavailable. It is not the preferred factor for email, cloud, source control, finance or production administration.

## 5. Hardware security keys

Privileged users receive two FIDO2 keys:

- a primary key kept with the user;
- a backup key stored securely offline or in a controlled safe.

Record the key serial number, holder, enrolment date, backup location and return/disable date. Test recovery before relying on the backup. Do not leave a backup key permanently connected to a laptop.

## 6. Least privilege

Access is based on role and task, not convenience. The following separation is required:

| Function | Who may approve | Who may execute |
| --- | --- | --- |
| Production deployment | Engineering lead or delegate | Authorised engineer, with review |
| Production database change | Engineering lead plus security review for sensitive changes | Authorised database operator |
| DNS / registrar change | Security or infrastructure lead | Authorised administrator |
| Payment refund or payout change | Finance lead plus second approver | Authorised finance operator |
| Customer-data export | Named business owner and privacy/legal review where required | Authorised operator, logged |
| Broker credential access | Security owner | Scoped service only; no casual human export |
| Admin-role grant | Security owner or CEO | Identity administrator, logged |

A person who writes code should not be able to approve their own production release and access all production customer data without oversight.

## 7. Session management

- Use short, appropriate session lifetimes for administrative systems.
- Require re-authentication for sensitive actions where supported.
- Revoke sessions on password reset, role change, device loss or suspected compromise.
- Do not share session cookies or bearer tokens.
- Do not store production tokens in browser local storage where a safer server-side session is available.
- Review active devices and sessions after a security event.
- Configure the API to trust one explicit proxy hop, not an arbitrary forwarding chain.

## 8. Access reviews

| Review | Frequency | Record |
| --- | --- | --- |
| Privileged production, database, DNS, cloud and payment access | Monthly | Reviewer, accounts, decision, removals |
| All workforce access | Quarterly | Role matrix, exceptions, removals |
| Supplier and contractor access | At renewal and on exit | Scope, owner, removal |
| Service accounts and API keys | Quarterly | Owner, purpose, last use, rotation |
| Break-glass access | After every use and at least annually | Reason, authoriser, actions, reseal |

Overdue reviews are a control gap. A review that only says "looks fine" without listing accounts is not evidence.

## 9. Joiner, mover and leaver

### Joiner

- approve the role and access before the start date;
- create a named identity and enrol MFA;
- issue a managed device and, for privileged roles, hardware keys;
- record policy acknowledgements;
- grant only the required systems; and
- confirm completion before access to customer data.

### Mover

- review access on role change;
- remove access that no longer fits;
- require a new approval for elevated access; and
- update the access matrix and manager record.

### Leaver

- disable identity and revoke sessions on the exit date;
- remove source control, cloud, database, payment, payroll and AI access;
- recover devices, keys and tokens;
- transfer or revoke customer-data access;
- record completion; and
- test that the account cannot sign in.

## 10. Account recovery

Recovery must not be easy to social-engineer. Support staff verify identity through an approved method before resetting MFA, changing an email address or transferring account ownership. High-impact accounts require a second approver. Record every recovery action.

Do not use publicly available information, a recent email address alone or a caller's knowledge of a customer record as sufficient proof of identity.

## 11. Service accounts and API keys

- Inventory every service account and API key.
- Document owner, purpose, scope, creation date, last use and rotation date.
- Store secrets server-side in a controlled secret store or restricted environment file.
- Never expose a Supabase service-role key to the browser.
- Use separate keys for development, staging and production.
- Revoke unused keys promptly.
- Alert on unexpected use or privilege changes.

## 12. Contractors and suppliers

Contractors receive the same identity, device and access standards as employees, scaled to their role. Time-limited access must expire automatically where possible. Supplier support access requires a named individual, an approved purpose, a time window and logging. Do not give a supplier a permanent shared administrator account.

## 13. Exceptions

An exception requires a written reason, risk assessment, compensating control, owner, expiry date and approval by the security owner. Exceptions are reviewed at least quarterly. A permanent exception to MFA for a privileged account is not acceptable.

## 14. Evidence

Record in the security register:

- MFA and hardware-key enrolment reports;
- role catalogue and access matrix;
- privileged and workforce access-review records;
- joiner/mover/leaver test evidence;
- service-account inventory;
- secret-rotation records; and
- exceptions with expiry dates.
