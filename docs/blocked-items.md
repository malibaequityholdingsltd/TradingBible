# Blocked and Non-Working Inventory

**Status:** 12 November 2026
**Operator:** TradingBible Holdings, Inc.  
**Scope:** web app, API, billing, cards, fund, fundraising packet, company communications, legal/corporate records and production validation.

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
| Confidential fundraising packet | 20 branded final-form DOCX/PDF documents covering the readiness memo, board resolutions, officer certificate, SAFE, investor certificates, Form D worksheet, Reg CF readiness and reporting. Admin-only, no public page, no solicitation. | Builder generated all 20 files plus manifest; every one of the 232 DocuSign anchors appears exactly once in its PDF; packet ZIP route tested. |
| Fundraising DocuSign controls | Custom text and checkbox tabs for investor questionnaires; unique per-document anchors; separate execution register; execution locked behind `FUNDRAISING_EXECUTION_ENABLED=true`. | Module import, route registration, anchor uniqueness and gate checks pass. |
| Company communications registry | 45 branded email/SMS/in-app templates across seven categories, each with a distinct layout, light/dark mode support, absolute logo URL, hidden preheader, marketing footer and compliance labels. | Registry renders 45 templates; all seven category layouts render in auto, light and dark modes; Markdown pack exports. |
| Admin communications console | Admin-only list, preview and single-recipient test-send. No bulk sender or audience list. | Route and UI wired; test sends are limited to the signed-in administrator. |

### 1.1 Fixed 12 November 2026 — public claims and access control

| Item | What changed | Verification |
|---|---|---|
| Public broker claims | Public copy now limits live read-only API sync to Binance, Bybit and OKX. Other providers appear only when their adapter is live and tested. | Served bundle check and live route check; see `docs/security/evidence/2026-11-12-public-claims-and-access-control.md`. |
| Broker UI dead ends | Unsupported providers remain visible but show “Adapter not live yet” and cannot open a connect flow. | `LIVE_BROKER_ADAPTERS` guard in `apps/web/src/pages/ExtraPages.jsx`; lint and served-bundle check passed. |
| Funded-evaluation framing | Home and translated hero copy now say `$200K` maximum account and `$400K` scaling ceiling, matching the live catalogue. | Served bundle contains both corrected figures; no “maximum evaluation size” claim remains. |
| Webinar claims | “8 live webinars” claims were replaced with “weekly SI-hosted webinar rooms” and member-area schedule/replay language. | Served bundle check; no “8 live webinars” claim remains. |
| Public security page | RLS is described as the designed tenant boundary and explicitly “being independently verified”; admin MFA and email delivery are described as being completed; broker sync is limited to verified adapters. | Served bundle contains the corrected language; no “verified staff session” or RLS-isolation claim remains. |
| Admin allowlist | API now uses exact addresses plus optional `ADMIN_EMAILS`; the catch-all `@tradingbible.app`/`.net` auto-admin rule was removed. Profile `role = admin` still grants access. | Code review and lint passed; unauthenticated `/api/admin/health` returns `401`. Real admin login acceptance remains pending. |
| Optional admin MFA gate | `ADMIN_MFA_REQUIRED=true` requires Supabase AAL2 with TOTP, passkey/WebAuthn, SSO or MFA. It is documented and off by default. | Code and lint passed. Not enabled in production; enrollment and break-glass testing remain external. |
| Public signup gate | New public signups are hard-gated by `VITE_PUBLIC_SIGNUP_ENABLED=false` until SMTP/email-code delivery is accepted. Login and admin invitations are unaffected. | Build-time gate in `apps/web/src/lib/platformSettings.js`; `/signup` shows the paused state and the home CTA no longer opens signup. |
| Stale company pricing brief | `docs/company-profile.md` now uses Free + Premium at `$19.99/month` or `$199/year`; the retired three-tier projections were removed instead of being recalculated with invented assumptions. | Text search and review; see the evidence record. |

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

### 2.8 Fundraising packet, Form D and Regulation CF

**Status:** Blocked — external, legal and corporate records.
**Current behaviour:** The 20-document confidential packet is generated, branded and readable only by admins. Each instrument is marked `EXECUTION COPY · SIGNATURE REQUIRED` or `CONTROLLED RECORD · COMPANY USE`; none is an editable working copy. There is no public fundraising page, investment button, payment collection or securities issuance. The private-placement track is documented as Rule 506(b) plus a Regulation S offshore tranche; Regulation CF is a separate later track and is not qualified.
**What is missing:**

- Counsel review of the exact document version and the communications gate.
- Confirmed certificate of incorporation date, principal address, fiscal year end, officers/directors and registered agent.
- Board authorization for the security, offering amount, minimum target, price, valuation cap and use-of-proceeds budget.
- A reconciled cap table, SAFE register, option pool and related-party disclosures.
- Audited or reviewed financial statements and the accountant identity.
- A filed Form D (the packet contains only a preparation worksheet; official Form D is filed through EDGAR).
- A registered intermediary, CRD number, escrow arrangement and qualified Regulation CF offering through the SEC/portal process.
- Production DocuSign credentials and a real-account envelope test.

**Environment names:** `FUNDRAISING_EXECUTION_ENABLED` (must remain unset or `false` until board and counsel authorization), plus every `DOCUSIGN_*` credential in §2.7. Do not set the execution flag merely to preview a document.

### 2.9 Company communication delivery

**Status:** Blocked — external and compliance.
**Current behaviour:** The registry has 45 branded email, SMS and in-app templates. The admin console can preview them and send a single test email only to the signed-in administrator. There is no bulk sender, member list, investor list or marketing automation. SMS is design-only.
**What is missing:**

- A verified `COMPANY_POSTAL_ADDRESS` before any commercial email is sent.
- A production SMTP sender with SPF, DKIM and DMARC verification.
- An SMS provider, documented consent records, quiet hours and opt-out handling.
- Counsel approval for fundraising templates and a controlled recipient/audience process.
- A real unsubscribe/preference centre and suppression-list handling for marketing email.

Fundraising templates remain restricted even if ordinary transactional email is configured. A test send to the administrator is not an investor communication or a send authorization.

### 2.10 Fund and asset-management offering

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
| Private-placement packet and SAFE terms | Blocked — counsel/board | Confirm Rule 506(b) and Regulation S eligibility, accredited-investor verification, board-authorized terms, valuation cap, minimum target, use of proceeds and closing conditions. |
| Form D and blue-sky filings | Blocked — filing | The packet contains a worksheet only. File official Form D through EDGAR within the applicable deadline and make any required state notice filings. |
| Regulation CF offering | Blocked — SEC/portal | Requires a registered FINRA intermediary, Form C qualification, audited or reviewed financials as applicable, escrow and ongoing reporting. The packet is preparation material, not a qualified offering. |
| Fundraising and investor communications | Blocked — counsel | Approve the exact copy, audience, timing and delivery channel. Private-placement messages must stay one-to-one and relationship-based; Reg CF messages must follow the qualified portal rules. |

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
- Fund counsel and the service providers listed in §2.10.
- Fundraising counsel for the private-placement packet, SAFE terms, Form D worksheet and Regulation CF readiness memorandum.
- Board authorization for the exact offering terms before any DocuSign execution gate is opened.

### Priority 5 — production and optional integrations

- Real non-admin test account or permission to create one.
- DocuSign developer credentials listed in §2.7.
- Production SMTP sender with SPF/DKIM/DMARC and a verified `COMPANY_POSTAL_ADDRESS` before commercial email.
- An SMS provider, consent records and opt-out handling before SMS delivery.
- SMTP delivery/DKIM access if email verification is in scope.
- Optional market/AI keys: `ALPHA_VANTAGE_API_KEY`, `FINNHUB_API_KEY`, `DEEPSEEK_API_KEY` or `INTEGRATED_AI_API_URL`/`INTEGRATED_AI_API_KEY`.
- Optional D&B: `DNB_CLIENT_ID`, `DNB_CLIENT_SECRET`.
- Optional Circle x402: `CIRCLE_X402_SELLER_ADDRESS` and related settings.

## 6. Production verification (10 November 2026)

- Web assets deployed; `/`, `/fund`, `/investors`, `/academy`, `/pricing`, `/admin/fundraising-documents`, `/admin/communications` and `/llms.txt` return `200`.
- API health returns `200`; PM2 `tradingbible-api` is online.
- The production API loads the 20-document fundraising manifest and both new admin routers.
- `/api/admin/fundraising-documents`, `/api/admin/fundraising-documents/executions` and `/api/admin/communications/templates` return `401` without an admin session; no fundraising packet or template registry is public.
- The new admin page chunks return `200` from the production build. The packet ZIP was generated and parsed locally: 43 entries, 8.8 MB, including all 20 DOCX/PDF pairs, the manifest, the communications pack and the README.
- The fundraising execution gate remains locked. No production `FUNDRAISING_EXECUTION_ENABLED`, DocuSign, SMTP or postal-address value was read or changed.
- Production TV geometry verified at 1440×900: expanded panel left/top sat on the sidebar/topbar lines and stayed inside the viewport.
- Production card previews verified at the ISO/IEC 7810 ID-1 ratio (`1.586`), with `NOT ISSUED` / `PREVIEW ONLY` and no long digit sequence.
- Production acceptance still used mocked Supabase auth/API for the authenticated checks; see §2.6. No real charge, card issuance, TBC payment, securities issuance or investor communication was performed.
- Authenticated admin UI acceptance still needs a real admin session.

### Admin rebuild deployment (10 November 2026)

- Commit `a4645d6` deployed: Atelier admin shell, centralized route catalogue, product/Academy/challenges/signals/community/affiliates/public-site/compliance operator pages, and the public no-offering fundraising page.
- Production returns `200` for `/fundraising`, `/admin`, `/admin/product-surfaces`, `/admin/academy`, `/admin/challenges`, `/admin/signals`, `/admin/community`, `/admin/affiliates`, `/admin/public-site`, `/admin/compliance`, `/admin/fundraising-documents` and `/admin/communications`.
- The new admin chunks (`AdminOperationsPages`, `AdminPortal`, `FundraisingStatusPage`) and the current CSS/entry bundles return `200`.
- `/api/admin/users`, `/api/admin/affiliates`, `/api/admin/health`, `/api/admin/fundraising-documents` and `/api/admin/communications/templates` return `401` without an admin session.
- `/llms.txt` no longer lists `/admin`, `/staff` or test-only routes.
- The production `/fundraising` bundle contains the no-offering, no-sale and Form D not-filed language; no investment button or payment link is present.
- Authenticated admin UI acceptance still needs a real admin session; no authentication was bypassed.

## 7. Current safe state

The app can be deployed and used with the current truthful states:

- Free accounts and TradingBible Premium ($19.99/month or $199/year) remain the public plans.
- TBC wallet is ledger-backed and shows virtual/physical card products as previews.
- Card interest creates a support ticket.
- The fund page is a status page, not an offering.
- No live payment, card issuance or TBC payment rail is enabled without the authorisations above.
