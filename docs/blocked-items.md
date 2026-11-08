# Blocked and Non-Working Inventory

**Status:** 8 November 2026  
**Operator:** TradingBible Holdings, Inc.  
**Scope:** web app, API, billing, cards, fund, legal/corporate records and production validation.

This is the honest readiness list. It separates work that is complete from work that is blocked by an external provider, a legal/professional review or a product decision. No blocked item is presented in the product as live, funded, issued, registered or approved.

## Status key

| Status | Meaning |
|---|---|
| **Fixed** | Implemented and verified in this pass. |
| **Blocked — external** | Cannot be completed without a provider, credential, authorization or professional review. |
| **Decision needed** | The product behaviour is not defined; no code should guess. |
| **Intentionally unavailable** | The UI is deliberately truthful and must stay unavailable until the underlying service exists. |

## 1. Fixed in this pass

| Item | What changed | Verification |
|---|---|---|
| Company name | Standardised on **TradingBible Holdings, Inc.** as owner, operator and TB securities issuer across source, legal/public copy, investor records and generated documents. | `rg` found no stale `TradingBible, Inc.` outside replacement rules; TB stock DOCX/PDF library regenerated. |
| TV widget bounds | The launcher, mini panel and expanded panel now use the painted sidebar, topbar/mobile-bar and bottom navigation edges. Drag, keyboard movement, SI shift and phone layout clamp to those edges. | Playwright at 1440×900, 1024×768 and 390×844; desktop expanded panel sat at sidebar/topbar lines and above the bottom edge; phone panel sat above the dock. |
| Academy coverage | Expanded to **17 paths · 76 courses · 347 lessons**, including derivatives, macro, quant, fund management, market mechanics and institutional FX. | `npm run verify:academy` passes; web/API catalogs both import at 17/76/347; `academySchools.test.js` passes. |
| Fund surface | Public `/fund` surface for **TradingBible Capital** explicitly says *in formation*, with no vehicle, AUM, track record or offering. | Public page copy and route checks pass. |
| Card previews | Realistic virtual/physical card designs with a chip, contactless mark, masked placeholder PAN, `CARDHOLDER NAME`, `MM/YY`, `Not issued` and `Preview only`. No PAN, expiry, CVV, balance, issuer/network claim or activation state is generated. | Playwright found two previews at the ISO/IEC 7810 ID-1 ratio (`1.586`) and no long digit sequences. |
| Footer company sentence | Removed the doubled full stop after `TradingBible Holdings, Inc.` | Local page text check. |
| Stripe sandbox payment matrix | Exact `/stripe/checkout-session` and `/wallet/deposit` routes created sessions for every current product with the expected mode and amount. Test-mode payments were then completed for Premium monthly ($19.99), Premium annual ($199), Platform Teams monthly ($199), Academy individual ($150), Academy Pro ($199), Academy Family ($299), Academy Teams ($499) and a $25 wallet deposit. | All sessions and payments were `livemode: false`; subscriptions were cancelled after payment; one wrong Teams $19.99 test price was refunded. Hosted Checkout UI and webhook delivery remain unverified. |
| Lithic sandbox connectivity | A sandbox-only Lithic client and authenticated `/wallet/cards/*` routes can create and close a virtual sandbox card. PAN/CVV are never stored or returned; production issuance is hard-disabled. | Sandbox key validated; route test returned `201` for create and `200` for close; the Lithic card ended in `CLOSED`. |
| Release controls | PWA, DocuSign, TBC, exam-bank, translation and curated-path guards remain intact. | `npm run verify:release` passes. |
| Lint/build/tests | Web/API lint, production build and unit tests pass after the changes. | `npm run lint`, `npm run build`, `npm test` (26 tests). |

## 2. Blocked — external

### 2.1 Live Stripe checkout and webhook acceptance

**Status:** Blocked — external.  
**Current behaviour:** Test-mode secret/publishable keys have been validated locally. The exact app routes created checkout sessions for Premium monthly ($19.99), Premium annual ($199), Platform Teams monthly ($199), Academy individual ($150), Academy Pro ($199), Academy Family ($299), Academy Teams ($499) and a $25 wallet deposit. All were `livemode: false` and matched the expected mode and amount. Test payments were completed for every product through Stripe test PaymentIntents and subscription invoices, then test subscriptions were cancelled; one incorrect Teams $19.99 test price was refunded. The hosted Checkout UI itself was not completed, so the browser card-entry path is still unverified. Stripe also flagged the temporary sandbox harness for confirming PaymentIntents without `return_url`; that harness was test-only and has been removed. The app itself uses Checkout Sessions with `success_url`/`cancel_url`, and the Stripe Connect and Identity flows already send `return_url`. The `/stripe/webhook` handler accepted a correctly signed `customer.subscription.updated` event (`200`) and rejected an invalid signature (`400`) in a local harness with mocked user storage; real webhook delivery has not been observed. The supplied test keys belong to a separate Stripe account from the production live keys; they were not written to the repo or production `.env`. The test account currently reports `charges_enabled: false` and `payouts_enabled: false`, so live activation is not complete.  
**What is missing:**

- A Stripe test webhook signing secret and a test webhook endpoint.
- A real non-admin learner account for the hosted checkout and seat-redemption flow.
- Stripe account activation for live charges/payouts.
- Explicit written authorisation before any live charge.
- Confirmation of the live price IDs for Premium monthly and annual (and any Academy tier that is offered).
- Confirm the Platform Teams price. The code and AdminPortal currently use **$199/month**, not $19.99; if Teams should be $19.99, the product copy and price must change together.

**Environment names:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_PREMIUM_ANNUAL`, `STRIPE_PRICE_ACADEMY`, `STRIPE_PRICE_ACADEMY_FAMILY`, and optionally `STRIPE_PRICE_ACADEMY_PRO`, `STRIPE_PRICE_ACADEMY_TEAM`, `STRIPE_PRICE_TEAMS`. Sandbox aliases use `STRIPE_SANDBOX_*`.

**Do not** take a live payment without authorisation. The existing fallback inline prices ($19.99/month, $199/year) are intentional and are not a substitute for a completed Stripe test.

### 2.2 TBC payment rails for plans and checkout

**Status:** Intentionally unavailable — authorisation required.  
**Current behaviour:** `POST /wallet/pay` returns `503 tbc_unavailable` for `intent: "tbc"` or `plan: "tbc"`. Plans and checkout settle in cash. TBC remains the in-app ledger currency, not legal tender, an on-chain token or an investment.  
**What is missing:**

- Written authorisation to enable TBC as a payment rail.
- Treasury/ledger policy covering conversion, settlement, refunds, reversals, tax and reconciliation.
- A price source or fixed conversion policy if TBC is to be valued.
- Legal confirmation that the rail does not create a security, deposit or e-money product.
- A deliberate rollout flag and admin controls.

No API key can substitute for this authorisation.

### 2.3 Virtual and physical card issuance

**Status:** Blocked — external.  
**Current behaviour:** The wallet shows both card products, but every production card is a preview only. `Register interest` creates a real `/tbc/support` ticket. A Lithic **sandbox** key is validated and a sandbox-only integration can create/close a virtual test card for an administrator when `LITHIC_SANDBOX_ISSUANCE_ENABLED=true` (or for all users only when `LITHIC_SANDBOX_ALLOW_ALL_USERS=true` on a dedicated staging instance). The sandbox card is clearly labeled, has no real funds, and its PAN/CVV are never stored or returned. No production card is issued, funded, activated or provisioned.  
**What is missing:**

- An approved production card issuer and card programme.
- Cardholder KYC/AML and terms acceptance.
- Production issuer credentials, programme/card-product IDs and webhook signing secret.
- Funding/custody arrangement and spending controls.
- Cardholder and privacy terms, fee disclosures and complaint handling.

**Recommended path:** Continue with Lithic for sandbox integration testing, then complete production programme approval, card-product configuration, KYC/AML, funding and webhook signing before any real card is issued. Stripe Issuing remains an alternative because Stripe is already integrated. Required for production: issuer approval, production API key, programme/card-product IDs, webhook secret, and authorisation to create cardholders/cards.

### 2.4 First real family/team purchase and seat redemption

**Status:** Blocked — external.  
**Current behaviour:** Family and Academy Teams checkout code and share-code redemption exist. No real purchase, seat allocation or redemption has been observed.  
**What is needed:** An authorised test purchase (test mode first) and a learner account to redeem the seat. This is a validation gap, not a missing UI.

### 2.5 Platform Teams self-serve seat invites

**Status:** Decision needed.  
**Current behaviour:** The platform Teams plan is not part of the public two-plan pricing surface. Academy Teams uses a share code. Copy describes support provisioning rather than self-serve email invitations.  
**Decision:** Either keep Teams support-provisioned, or define and build email invitations, seat acceptance, removal and billing rules. Do not add an invite UI until the product rules are approved.

### 2.6 Real-account production acceptance

**Status:** Blocked — external.  
**Current behaviour:** Production checks used mocked Supabase auth/API. No real production account, real TBC balance or real subscription was observed.  
**What is needed:** A real non-admin test account (or permission to create one), a real learner session and explicit permission to exercise account, wallet and billing flows. Do not read or copy the production `.env`; set credentials on the server or use a secret manager.

### 2.7 DocuSign

**Status:** Blocked — external.  
**Current behaviour:** The integration is real-only and refuses to run without complete credentials. No live envelope has been sent or signed.  
**Environment names:** `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_PRIVATE_KEY`, `DOCUSIGN_CONNECT_HMAC_KEY`, `DOCUSIGN_AUTH_SERVER`, `DOCUSIGN_BASE_URL`, `DOCUSIGN_SEND_ON_CREATE`.

### 2.8 Fund and asset-management offering

**Status:** Blocked — external and intentionally unavailable.  
**Current behaviour:** `/fund` presents TradingBible Capital as a proposed division **in formation**. There is no fund vehicle, outside capital, AUM, track record, PPM, subscription document or investor offering.  
**What is missing:** Fund entity, investment-adviser registration or exemption, PPM/LPA and subscription documents, auditor, administrator, prime broker, custody, AML/KYC programme, compliance manual, insurance, seed capital and a real track record. The public page must not claim any of these until they exist.

## 3. Legal and corporate confirmations

| Item | Status | What is needed |
|---|---|---|
| Terms of Service §8.1 (Academy Pro licence) | Blocked — counsel | Counsel review of the licence scope, resale/redistribution restriction and termination wording. |
| Corporate registration details | Blocked — counsel | Confirm Delaware registration, registered agent, authorised shares, par value, officers/directors and the public wording before external reliance. |
| TB securities-issuer record | Blocked — counsel | Confirm that TradingBible Holdings, Inc. is the issuer of TB and that the private-record, no-offering and no-listing language is accurate. |
| Employment entity and workforce policy | Blocked — counsel | Confirm TradingBible Holdings, Inc. as the U.S. employing entity and review the global workforce policy. |
| Fund structure and offering | Blocked — counsel/regulatory | Entity, adviser registration/exemption, PPM, custody, AML/KYC and marketing restrictions. |

## 4. Intentionally unavailable or honest empty states

These are not bugs and must not be “fixed” by inventing data:

- **Card previews:** `Not issued`; no PAN, expiry, CVV, balance, issuer/network claim or activation.
- **Fund documents:** empty state until real documents exist.
- **Fund performance/AUM:** no figures until a real vehicle and track record exist.
- **Signals:** failed feeds render an explicit empty state, never fabricated values.
- **TV providers:** 15 reference-only provider cards plus 7 streaming services; no fabricated streams. TStv inactive, Luft uncertain, YouTube TV/Pluto TV region-restricted.
- **Investor portal:** private, read-only records; no share price, market capitalisation or listing claim.
- **TBC:** ledger-backed in-app currency; member staking retired; no token sale or investment claim.

## 5. Credentials and authorisations requested

**Do not paste secrets into chat.** Set them in the server environment or a secret manager, then confirm they are available. The API `.env` must not be printed, copied or overwritten by an agent.

### Priority 1 — billing validation

- Stripe **test** secret and publishable key: received and validated in test mode.
- A real Stripe test webhook endpoint and its signing secret (the handler itself has passed a locally signed event test).
- Stripe test price IDs for Academy individual/family (Premium monthly/annual work through the fixed inline prices).
- A real test learner account.
- Stripe account activation for live charges/payouts, plus written authorisation for one live charge and refund **after** test-mode acceptance.
- Rotate the test keys after acceptance because they were shared in chat.

### Priority 2 — cards

- Lithic **sandbox** key: received and validated; sandbox virtual card create/close passed.
- Production issuer/programme approval, production API key, programme/card-product IDs and webhook secret.
- Confirmation that KYC/AML, cardholder terms, privacy/fee disclosures and funding are approved.
- Explicit authorisation before creating any production cardholder or card.

### Priority 3 — TBC rails

- Written authorisation to enable TBC payments.
- Treasury/ledger and refund policy.
- Legal classification memo.
- Conversion/price-source decision.

### Priority 4 — legal, corporate and fund

- Counsel memos for Terms §8.1, corporate registration, TB issuer record and employment entity.
- Fund counsel and the service providers listed in §2.8.

### Priority 5 — production and optional integrations

- Real non-admin test account or permission to create one.
- DocuSign developer credentials listed in §2.7.
- SMTP delivery/DKIM access if email verification is in scope.
- Optional market/AI keys: `ALPHA_VANTAGE_API_KEY`, `FINNHUB_API_KEY`, `DEEPSEEK_API_KEY` or `INTEGRATED_AI_API_URL`/`INTEGRATED_AI_API_KEY`.
- Optional D&B: `DNB_CLIENT_ID`, `DNB_CLIENT_SECRET`.
- Optional Circle x402: `CIRCLE_X402_SELLER_ADDRESS` and related settings.

## 6. Production verification (8 November 2026)

- Web assets deployed; `/`, `/fund`, `/investors`, `/academy`, `/pricing` and `/llms.txt` return `200`.
- API health returns `200`; PM2 `tradingbible-api` is online.
- Production TV geometry verified at 1440×900: expanded panel left/top sat on the sidebar/topbar lines and stayed inside the viewport.
- Production card previews verified at the ISO/IEC 7810 ID-1 ratio (`1.586`), with `NOT ISSUED` / `PREVIEW ONLY` and no long digit sequence.
- Production acceptance still used mocked Supabase auth/API for the authenticated checks; see §2.6. No real charge, card issuance or TBC payment was performed.

## 7. Current safe state

The app can be deployed and used with the current truthful states:

- Free accounts and TradingBible Premium ($19.99/month or $199/year) remain the public plans.
- TBC wallet is ledger-backed and shows virtual/physical card products as previews.
- Card interest creates a support ticket.
- The fund page is a status page, not an offering.
- No live payment, card issuance or TBC payment rail is enabled without the authorisations above.
