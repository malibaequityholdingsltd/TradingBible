# DocuSign setup and execution runbook

The code path is complete. Envelopes cannot be sent until the API host has a
DocuSign developer/production account and the five environment values below.
This is an external credential dependency, not a web-app bug.

## 1. Create the DocuSign app

1. Sign in to DocuSign and open **Settings → Apps and Keys**.
2. Create an **Integration Key** (app). Add a **RSA keypair**; keep the private
   key on the API host only.
3. Grant the app **JWT impersonation** for the API user. Copy the **User ID**
   (GUID) and **Account ID** (GUID).
4. For demo testing use `account-d.docusign.com`; production uses
   `account.docusign.com`.

## 2. Add environment values

Set these on the API host (never in the web bundle):

```bash
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_USER_ID=...
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_CONNECT_HMAC_KEY=...
# Optional:
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
DOCUSIGN_SEND_ON_CREATE=true
```

`DOCUSIGN_PRIVATE_KEY` accepts a PEM with real newlines, escaped `\n`, or a
base64-encoded PEM. Restart the API after changing any value.

## 3. Configure the Connect webhook

In DocuSign **Settings → Connect**, create a configuration:

- URL: `https://<api-host>/hcgi/api/webhooks/docusign`
- Include **Recipient Events** and **Envelope Events**.
- Enable **Include HMAC Signature** and use the same value as
  `DOCUSIGN_CONNECT_HMAC_KEY`.
- Include the raw request body. The API captures `req.rawBody` specifically
  for HMAC verification in `apps/api/src/main.js`.

A missing or invalid HMAC returns `401`; an unknown envelope returns `202`
without changing state.

## 4. Prepare a public test envelope

1. Sign in as an admin and open **Admin → TBC Legal Vault**.
2. Choose a public summary, for example `P-01 TBC Whitepaper`.
3. Confirm the two recipients:
   - **Malik Nlem — Issuer Representative**
   - **Professional Reviewer**
4. Enter their full names and email addresses, keep **Send immediately**
   checked, and press **Send via DocuSign**.
5. Complete both signing blocks in DocuSign. Each recipient only receives the
   tabs anchored to their own block:
   - Issuer: `Capacity:` line (signature + capacity + date) and the printed
     name line.
   - Reviewer: `Professional capacity:` line (signature + capacity + date)
     and the reviewer name line.

## 5. What happens after completion

- The Connect webhook (or **Sync** in the admin panel) stores the completed
  status and writes an executed DOCX record.
- The public library automatically serves the executed DOCX from
  `/hcgi/api/tbc/documents/:slug/docx`, labelled **Executed copy**.
- Admin downloads use the same executed copy when present.
- `Executed` means the DocuSign envelope is complete. It does **not** enable
  a token sale, staking, governance, migration, brokerage or chain feature.
  Those states still require an explicit admin approval record and the
  server-side gates.

## 6. Verify without sending

The admin panel reports the missing environment variable names. The verifier
`apps/api/src/services/docusign.js` also exposes `verifyConnectSignature()`
for a unit test; it uses a timing-safe HMAC comparison.

## 7. Evidence limits

- The DOCX execution record is a readable transparency record, not the legally
  operative signed PDF or DocuSign certificate of completion.
- The JSON execution register is suitable for a single API host only. Apply
  `apps/api/sql/2026-10-tbc-durable-controls.sql` in Supabase before relying on
  it as production evidence, and move the register adapter to those tables.
- Configure DocuSign retention separately. Do not delete completed envelopes.
