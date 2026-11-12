# Data, Database, Broker and AI Security

**Controlled programme document · management approval not recorded**

## 1. Data classification

| Class | Examples | Minimum handling |
| --- | --- | --- |
| Public | Marketing pages, published pricing, public research | Integrity and availability controls |
| Internal | Internal notes, operational plans, non-public metrics | Company-managed storage; access on a need-to-know basis |
| Confidential | Source code, investor documents, contracts, security records | Restricted access, encryption, logging, NDA |
| Restricted | Customer identity, journals, broker tokens, payment data, employee identity and payroll data | Least privilege, encryption, tenant isolation, audited access, retention limits |

Do not place restricted data in chat, personal email, personal cloud storage or an unapproved AI tool.

## 2. Data minimisation

Collect only what is necessary for the product, contract or legal obligation. Do not retain broker passwords. Do not store full card numbers or CVV values. Do not collect identity documents, medical records or tax identifiers in the security register. Where possible, tokenise or encrypt sensitive credentials and never return them to the client.

## 3. Supabase Row Level Security

RLS is mandatory on every exposed table. Enabling RLS without correct policies and grants is not sufficient.

For each table, verify:

- RLS is enabled;
- `anon` has no unintended access;
- `authenticated` access is scoped to the owning user or an approved role;
- SELECT, INSERT, UPDATE and DELETE are tested separately;
- service-role access is server-only;
- storage buckets and object ownership policies are reviewed;
- functions and views do not bypass policies;
- grants do not exceed the intended policy; and
- migrations are applied consistently across environments.

Repository migrations show owner policies for many tables, including journals, broker accounts, academy, wallet, paper and terminal data. A **production** audit of every table, grant and operation is still required and must be recorded in the security register.

Use `supabase/security/rls-audit.sql` as a read-only starting point. Do not run remediation SQL against production without review, a backup and a staging test.

## 4. Service-role and secret keys

- The service-role key bypasses RLS. It must never be in the React/Vite bundle, a mobile app, a public repository, a screenshot or a log.
- The browser may receive only a publishable/anon key appropriate for public client use.
- Administrative API routes use the service role only after server-side authentication and authorisation.
- CI and deployment secrets are scoped to the environment that needs them.
- Rotate a key after suspected exposure and review logs for misuse.
- Do not use the service-role key as a shortcut for customer-facing queries that should be user-scoped.

## 5. Encryption

- Enforce TLS for browser, API, database, broker and payment connections.
- Confirm the database provider's at-rest encryption and backup encryption.
- Use application-level AES-256-GCM for broker credentials through the API vault.
- Keep encryption keys outside the database and outside source control.
- Do not invent a custom cipher. Use the approved vault utility.
- Have a key-rotation and recovery procedure before storing production secrets.

## 6. Broker connections

- Use authorised broker APIs and OAuth where supported.
- Request read-only permissions when the product only synchronises trading data.
- Never request withdrawal or transfer permission for a journaling integration.
- Encrypt access tokens server-side; never return them to the browser.
- Use separate credentials for each customer.
- Allow the customer to disconnect and revoke the token.
- Log access and unusual synchronisation.
- Monitor for repeated failures or unexpected account changes.
- Suspend the integration on suspected compromise.
- Do not store broker passwords.

## 7. Payments

- Use a PCI-compliant provider and hosted components where possible.
- Do not store card numbers or CVV values.
- Verify webhook signatures over the raw body.
- Prevent duplicate processing with idempotency keys and event records.
- Restrict refunds, payout changes and bank-instruction changes to authorised roles with a second approval where appropriate.
- Reconcile provider settlements against the company ledger.
- Monitor unusual refunds, disputes and payment patterns.
- Treat a future wallet, stored-value facility, card programme or token payment as a separate regulated and security assessment.

## 8. AI systems

- Keep each customer's conversation, memory and retrieved documents isolated.
- Do not expose internal system prompts, secrets or unrestricted company data to the model.
- Validate tool calls on the server and restrict the actions an agent can perform.
- Require human approval for consequential financial or compliance actions.
- Treat external web content and uploaded files as untrusted.
- Scan and validate documents before processing.
- Redact personal information from logs where possible.
- Monitor AI usage and unexpected API consumption.
- Test prompt injection, data exfiltration, cross-tenant retrieval and malicious uploads.
- Keep human review for financial, legal and compliance output.

An AI system must not execute a financial transaction solely because a user or uploaded document instructs it to do so.

## 9. Logging and monitoring

Log authentication events, authorisation failures, administrative changes, data exports, broker-token access, payment webhook failures, AI tool actions and bulk reads. Do not log passwords, tokens, full card data or unnecessary personal information.

Alert on:

- repeated login failures;
- administrator login from an unusual location;
- privileged account creation;
- bulk database export;
- unexpected production deployment;
- secret exposure;
- unusual broker activity;
- backup deletion or failure; and
- unusual refund or payout activity.

## 10. Retention and deletion

Define retention by record type:

- customer account and journal data as required for the service and legal obligations;
- billing and tax records for the applicable statutory period;
- security and access logs for the investigation and compliance period;
- support records only as long as needed;
- employee and contractor records under the workforce retention schedule; and
- incident evidence under legal hold where required.

Deletion must not destroy records subject to a legal hold, regulatory retention or an active investigation. Record the deletion method and verification.

## 11. Data exports and administrative access

- Require a named business owner and a documented purpose for bulk exports.
- Log the export, fields, row count, actor and destination.
- Do not send exports to personal email or unapproved storage.
- Restrict support access to the minimum needed and time-box it.
- Do not let an employee casually view or export all customers' broker credentials or complete trading histories.
- Review exported files for retention and deletion.

## 12. Supplier and AI data flows

Before sending data to a supplier or AI provider, determine what data is sent, where it is stored, whether it is used for training, how long it is retained, how access is revoked and what happens on termination. Record the assessment in the vendor register.

## 13. Evidence

Record in the security register: RLS audit output, policy tests, grant review, encryption evidence, vault configuration, broker permission tests, webhook tests, AI isolation tests, data inventory, retention schedule and export-review records.
