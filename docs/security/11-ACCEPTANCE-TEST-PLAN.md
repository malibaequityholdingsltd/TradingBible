# Security Acceptance Test Plan

**Controlled programme document · reviewer sign-off not recorded**

## 1. Purpose

A firewall configuration, an EDR dashboard or a policy file is not proof that the platform is secure. This plan defines the tests that must be executed and evidenced before TradingBible claims its infrastructure is ready for expanded customer data.

The in-product register at `/admin/security` is the live acceptance record. A test marked `passed` requires a tester, date and evidence reference. A test marked `failed` requires evidence. A blocked or not-applicable test requires an explanation.

## 2. Test environment

Where possible, run tests against a production-like staging environment. Tests that must be run against production require written authorization, a maintenance window and a rollback plan. Do not run intrusive scanning, exploitation or load testing against production without explicit authorization and rules of engagement.

## 3. Acceptance tests

### T01 — External port and service exposure

**Expected:** No unintended public SSH, database, Node, Redis, dashboard or management service is reachable.

**Method:** From an authorised external host, check only the approved ports and services. Do not run a broad intrusive scan without authorization. Review the provider firewall, UFW and `ss -tulpn` output.

**Evidence:** Provider firewall export, `ufw status verbose`, listening-service inventory, dated external connection results.

### T02 — Public SSH access

**Expected:** A public SSH connection is blocked. Approved administrators connect over the private access path with individual accounts and MFA.

**Evidence:** Failed public connection result, Tailscale/private-access test from an authorised device, SSH configuration, named-account list.

### T03 — Direct database exposure

**Expected:** A direct public database connection is blocked. Application access is restricted, encrypted and logged.

**Evidence:** Connection failure from an external host, provider network rules, application connection configuration.

### T04 — Application access through the security edge

**Expected:** Customers reach the application through the approved edge. Direct origin access is denied or authenticated.

**Evidence:** Edge configuration, DNS record, direct-origin denial test, WAF request log.

### T05 — Administrator private access

**Expected:** An authorised device reaches the server over the private network. An unauthorised device is denied.

**Evidence:** Successful authorised connection, failed unauthorised connection, access-list export.

### T06 — Customer A to Customer B isolation

**Expected:** Customer A cannot read, update or delete Customer B records through the UI, API or direct Supabase client.

**Method:** Create two test accounts with representative data. Attempt object-ID substitution, query manipulation, direct Supabase REST requests and storage-object access. Test read, insert, update and delete.

**Evidence:** Requests, responses, policy references and reviewer sign-off.

### T07 — Unauthenticated and expired API requests

**Expected:** Protected routes reject missing, expired, malformed and insufficiently privileged tokens with 401 or 403.

**Evidence:** Route list, test cases and responses. Include admin, customer, staff, investor-letter and workforce routes.

### T08 — Leaked or revoked credential

**Expected:** A revoked or rotated credential no longer works and the exposure is recorded and investigated.

**Evidence:** Test credential created for the exercise, revocation record, failed-use result, incident or change record.

### T09 — Backup restoration

**Expected:** A backup restores into an isolated environment with verified data integrity and access controls.

**Evidence:** Backup source, restore start/end time, achieved RPO/RTO, table checks, sample record checks, RLS test, cleanup record.

### T10 — Security monitoring failure

**Expected:** Stopping a monitoring or backup agent generates an alert to the named owner.

**Evidence:** Agent stop time, alert time, recipient, recovery time, dashboard screenshot or log.

### T11 — Simulated critical incident

**Expected:** The response team contains the event, preserves evidence, communicates and records lessons within the documented process.

**Evidence:** Exercise plan, timeline, decision log, communications, after-action report and corrective actions.

### T12 — Payment webhook forgery and replay

**Expected:** An unsigned, invalid or replayed webhook is rejected without changing billing state.

**Evidence:** Test payloads, responses, ledger state before/after, signature-verification code and reconciliation check.

### T13 — AI tenant and prompt-injection boundary

**Expected:** A malicious prompt or uploaded document cannot retrieve another customer's context, expose system secrets or execute a consequential action without approval.

**Evidence:** Test prompts, uploaded test documents, model responses, tool-call logs, tenant-isolation proof and reviewer sign-off.

### T14 — Public and API security headers

**Expected:** The public SPA and API return consistent HSTS, CSP, frame, content-type, referrer and permissions policies without conflicting duplicates.

**Evidence:** Pre-change baseline, post-change header output, CSP violation review, browser console checks and rollback record.

## 4. Additional tests before enterprise or regulated expansion

- Broker OAuth scope and token revocation.
- Broker read-only permission proof.
- Storage bucket and signed-URL access.
- Investor-letter unsubscribe token forgery and replay.
- Workforce document access control.
- Admin export and bulk-data access logging.
- Supplier access revocation.
- Multi-tenant AI retrieval and memory isolation.
- Payment refund and payout authorisation.
- DDoS and rate-limit behaviour under controlled load.
- DNS takeover and dangling-record review.
- Backup deletion protection.

## 5. Pass criteria

A test passes only when:

1. the expected result is observed;
2. the tester and date are recorded;
3. the evidence reference points to a real artefact;
4. no critical or high exception remains unexplained; and
5. a qualified reviewer accepts the result.

An exception may be accepted only with a written risk assessment, compensating control, owner and expiry date. A critical customer-data isolation failure is not acceptable at launch.

## 6. Sign-off

| Role | Name | Decision | Date | Reference |
| --- | --- | --- | --- | --- |
| Security owner | Not recorded | Pending | — | — |
| Engineering lead | Not recorded | Pending | — | — |
| General Counsel (notifications) | Not recorded | Pending | — | — |
| Independent reviewer | Not recorded | Pending | — | — |

Do not enter a name or decision that has not actually been given. The table is intentionally blank until the real review occurs.

## 7. Evidence storage

Store sensitive evidence in a restricted location with access logging. Record only the reference in the security register. Do not store credentials, private keys, full customer records or unnecessary personal data in the evidence pack.

## 8. Re-test triggers

Re-run the affected tests after:

- a material architecture or firewall change;
- a new public API, upload path, AI tool or payment flow;
- a database policy or grant change;
- an incident or near miss;
- a critical dependency or supplier change; and
- a penetration-test finding or remediation.
