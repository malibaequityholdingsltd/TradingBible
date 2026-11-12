# Application and API Security Standard

**Controlled programme document · management approval not recorded**

## 1. Scope

This standard applies to the React/Vite frontend, Node/Express API, Supabase access, payment integrations, broker adapters, AI features and any future developer API or white-label service.

The application must be tested against the OWASP Top 10:2025 and OWASP API Security Top 10. Testing must cover the actual deployed configuration, not only a code review.

## 2. Secure development lifecycle

### Before code is merged

- issue or requirement reviewed for security and privacy impact;
- code review by someone other than the author;
- no secrets in source or tests;
- dependency changes reviewed;
- input validation and authorisation considered;
- logging does not contain passwords, tokens or unnecessary personal data; and
- tests cover the security-relevant behaviour.

### Before production deployment

- CI lint, build, tests and release guards pass;
- dependency and secret scans have no unresolved critical finding;
- database migrations are reviewed and tested against a non-production database;
- release artefacts are traceable to a commit;
- deployment permissions are restricted;
- a rollback path exists; and
- the change does not require an unreviewed production configuration change.

### Prohibited

- hardcoded passwords, API keys, private keys or service-role keys;
- exposing a server secret through Vite `VITE_*` variables;
- direct unreviewed production database changes;
- disabling authorisation to make a feature work;
- committing a `.env` file;
- trusting a client-supplied role, plan or user ID for authorisation;
- using `eval`, dynamic code execution or unsanitised HTML with untrusted input; and
- deploying directly to production from an unreviewed local build.

## 3. Authentication and authorisation

- Verify identity on the server for every protected route.
- Verify role and object-level permission on the server.
- Do not rely on a hidden button, a client-side route guard or a UI plan badge.
- Use a central admin authorisation check for administrative routes.
- Separate customer, staff and administrator capabilities.
- Expire and revoke sessions appropriately.
- Rate-limit login, registration, password reset and passkey endpoints.
- Protect against credential stuffing and account enumeration where practical.

### Required tests

- missing token → 401;
- expired token → 401;
- valid non-admin token → 403 on admin routes;
- admin token → allowed only for intended actions;
- customer A cannot read, update or delete customer B data;
- a user cannot change their own plan or role through a request body; and
- a signed-out session cannot continue using a captured token.

## 4. Input validation and output handling

- Validate type, length, format and allowed values on the server.
- Reject unknown or unexpected fields for sensitive operations.
- Use parameterised queries or the approved data client; never concatenate SQL.
- Encode output in HTML, email templates and generated documents.
- Treat filenames, URLs, webhooks, AI output and uploaded documents as untrusted.
- Set request-body limits and reject oversized payloads.
- Avoid exposing internal stack traces, SQL errors or secret values in responses.

## 5. API controls

- Maintain an inventory of public, authenticated, admin and webhook routes.
- Require authentication by default; make public routes explicit.
- Apply object-level authorisation, not only role checks.
- Rate-limit by the correct client identity behind the trusted proxy.
- Validate content type and request size.
- Return consistent error responses without leaking sensitive detail.
- Log administrative actions and security-relevant failures.
- Version or deprecate APIs deliberately; do not leave forgotten debug routes.
- Apply CORS only to approved origins and never combine wildcard origin with credentials.

## 6. File uploads

- Enforce file count, size and allowed MIME types.
- Verify magic bytes, not only the client-supplied MIME type.
- Store uploads outside the web root or in a private object store.
- Use non-executable storage and unpredictable object names.
- Scan untrusted files where supported.
- Do not trust an image extension or a client-side resize.
- Expire or delete temporary files.

## 7. Webhooks and payment callbacks

- Verify the provider signature over the raw request body.
- Reject invalid, unsigned and replayed events.
- Use a timestamp and unique event ID where the provider supports it.
- Make processing idempotent and prevent duplicate charges or credits.
- Reconcile provider records against the company ledger.
- Log failures without logging full payment details.
- Do not expose a webhook endpoint that changes billing state without signature verification.

## 8. Security headers

The public SPA and API should return a reviewed set:

- `Strict-Transport-Security` on HTTPS;
- `Content-Security-Policy` with an explicit allow-list;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: SAMEORIGIN` or CSP `frame-ancestors`;
- `Referrer-Policy: strict-origin-when-cross-origin` or stricter;
- `Permissions-Policy` denying unnecessary browser capabilities; and
- no conflicting duplicate headers from Nginx and the API.

The CSP must be tested against the actual app: Vite assets, fonts, images, YouTube or TradingView frames, websockets, payment components and any inline styles. A policy that is copied from a template and breaks the product will be disabled, which is worse than a measured rollout.

## 9. Supply chain and CI/CD

- Use private repositories with MFA and restricted access.
- Protect main branches and require code-owner review.
- Pin dependencies and review lockfile changes.
- Enable dependency, secret and code scanning.
- Restrict CI secrets and deployment credentials.
- Do not let a pull request from an untrusted fork receive production secrets.
- Produce traceable build artefacts.
- Separate development, staging and production environments.
- Rotate a CI secret after suspected exposure.

## 10. AI application controls

- Validate tool calls on the server against an allow-list.
- Require explicit human approval for financial, compliance or irreversible actions.
- Isolate each customer's context and memory.
- Do not expose system prompts or internal configuration.
- Treat external web content and uploaded files as untrusted.
- Scan and validate documents before processing.
- Redact personal information from logs where possible.
- Test prompt injection, data exfiltration and malicious file handling.
- Do not let an AI agent access an unrestricted company database.

## 11. Broker and market-data integrations

- Use OAuth or read-only API keys where the product only journals.
- Never request withdrawal or transfer permission for a journaling feature.
- Encrypt tokens server-side and never return them to the client.
- Revoke tokens on disconnect.
- Log access and unusual synchronisation patterns.
- Apply provider rate limits and request validation.
- Verify webhook signatures and prevent replay.
- Suspend an integration on suspected credential exposure.

## 12. Release and emergency change

An emergency change may bypass the normal schedule only with:

- a named approver;
- a written reason;
- a tested or reversible change;
- a security review after the change; and
- a follow-up ticket to restore the normal control.

Emergency change is not permission to disable logging, MFA or authorisation permanently.

## 13. Evidence

Store in the security register: CI results, dependency and secret scans, SAST/DAST reports, authorisation tests, header scans, upload tests, webhook forgery tests, penetration-test findings, remediation evidence and approved exceptions.
