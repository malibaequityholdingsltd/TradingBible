# Error-handler review and correlation check — 12 November 2026

**Code:** `apps/api/src/middleware/error.js`  \
**Operator:** OpenCode agent, under explicit user authorization  \
**Scope:** production error responses, stack-detail exposure, request correlation

## Change

The error middleware now:

- includes `[requestId]` in the server-side error log line;
- returns the same `requestId` in the JSON error body; and
- returns only `Something went wrong!` with no error object for production 5xx
  responses.

Client errors continue to return the safe validation message and error name.
The `X-Request-ID` response header is set earlier by the request middleware.

## Local production-mode check

With `NODE_ENV=production` and request ID `req-test-123`:

```text
server 500 -> {"message":"Something went wrong!","requestId":"req-test-123"}
client 400 -> {"message":"Bad request","requestId":"req-test-123","error":{"name":"Error","message":"Bad request"}}
error middleware check OK
```

The simulated internal detail and stack appeared only in the local server log,
not in the 500 response body.

## Production verification

After deploying the one-file change and restarting PM2:

```text
$ curl -s -i https://tradingbible.app/api/security-programme/admin/overview
HTTP/2 401
x-request-id: d353e975-9163-43f0-a0de-9bca701674f9

$ curl -s https://tradingbible.app/api/security-programme/admin/overview
{"message":"Please sign in or create an account to use the chat.","requestId":"6f29ff2b-f711-43fb-9a3f-40312c797843","error":{"name":"Error","message":"Please sign in or create an account to use the chat."}}
```

The public `/api/health` route returned 200 after the restart, and the API
headers remained single-owner.

## Limitations

This is a code and response-shape check, not a full application penetration test.
It does not prove that every route uses the shared error middleware or that logs
are shipped to a central SIEM.
