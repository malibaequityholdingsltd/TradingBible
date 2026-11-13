# TradingBible — Company, Product & Brand Brief
*Prepared for lenders, investors, partners and users. All statements below are sourced from the company repository and live product; figures marked TBD are to be supplied by the founder. This is a company brief, not an offering document, legal opinion or launch approval. Counsel and production acceptance still govern the gates listed in `docs/blocked-items.md`.*

## 1. Company snapshot
- **Legal name:** TradingBible Holdings, Inc. — *Delaware corporation; owner, operator and securities issuer.*
- **Form & domicile:** Delaware corporation (NAICS 511210); registered agent and entity records on file.
- **Tax/identity:** IRS EIN and D-U-N-S **14-997-6777** on file — disclose only to authorized counterparties.
- **Structure:** TradingBible Holdings, Inc. (owner, operator and securities issuer) → product divisions (Terminal, Intelligence, Prop, Developer, future Brokerage, proposed Coin) — *divisions, not subsidiaries.*
- **Parent holding company:** TradingBible Holdings, Inc. — *ticker TB requested, not reserved/confirmed.*
- **Native coin:** TBC (max 100M, Cosmos SDK baseline, proposed; 90-day testnet planned) — *TBC is not TB equity.*
- **Regulatory status:** Delaware incorporation is **not** a brokerage license. No live client deposits until a licensed entity + banking + safeguarding are operational.
- **Owner/operator:** TradingBible Holdings, Inc. owns and operates TradingBible and is the securities issuer.
- **Leadership:**
  - Malik Nlem — Founder & Chief Executive
  - Victor Okechukwu — Vice President
  - Maliba SI — Head of Quantitative Research (the platform's SI research function)
- **Team profile:** Operators, engineers, and quants from global markets and technology.
- **Domain & contacts:** tradingbible.app · support@tradingbible.app · legal@tradingbible.app · privacy@tradingbible.app · ads@tradingbible.app
- **Response target:** team aims to respond within one business day; this is a service target, not a guarantee.

## 2. What TradingBible is
TradingBible is a global financial technology (FinTech) platform that delivers institutional-grade market intelligence, advanced trading tools, real-time market analysis, educational resources, and SI-powered insights — in one terminal.

- **Mission:** empower individuals with transparent, data-driven market intelligence, innovative technology, and world-class educational resources that support smarter financial decision-making.
- **Vision:** become one of the world's leading financial technology platforms by making professional trading intelligence accessible to every trader and investor.

## 3. The web app — product tour (live at tradingbible.app)
AI-powered trading journal and analytics platform with a professional terminal experience. Key modules:
- **Terminal Pro** (`/app/terminal-pro`) — flagship 3-zone trading workstation: charts, watchlists, command strip.
- **Trade journal** (`/app/journal`) — entries, exits, notes; broker-synced; mistake detection.
- **Analytics** (`/app/analytics`) — equity, drawdown, P&L, discipline scoring.
- **SI reports** (`/app/reports`, Premium) — daily/weekly SI-generated reports.
- **SI Trading Coach** (`/app/coach`, Premium) — conversational SI that reviews trades, grades discipline, prescribes fixes.
- **Signals & indicators** (`/app/signals`, `/app/indicators`) — data-driven signals from 14 built-in indicators (RSI, MACD, Bollinger, EMA, etc.).
- **Risk tools** (`/app/tools`) — position sizer, risk/reward, breakeven, expectancy, ruin evaluator.
- **Backtest & paper trading** (`/app/backtest`, `/app/paper`) — strategy testing without capital at risk.
- **Challenges / prop firms** (`/app/challenges`) — funded-evaluation tickets, rules, and payouts across instruments.
- **Broker & prop-firm sync** (`/app/brokers`) — connected accounts with P&L tracking. Live read-only API adapters are currently implemented for Binance, Bybit and OKX; additional broker, OAuth and MT5 bridge providers remain marked unavailable until their adapter is live and tested. Self-custody BTC/ETH/USDC/Solana tracking is separate.
- **Price alerts, heatmaps, order flow, economic calendar** — full professional toolset.
- **Community** (`/app/community`) — forum with leaderboard ranked by real contributions (no fake P&L).
- **Academy, webinar rooms, guides, blog** — structured learning paths, courses and SI-hosted webinar rooms; the member schedule and replays live inside the product.
- **TradingBible TV** (`/tv`) — broadcast/ad rotation player with view/click tracking.
- **Wallet & billing** (`/app/wallet`, `/app/billing`) — Stripe fiat + non-custodial crypto funding; subscription management.
- **Developer platform** (enterprise quote) — REST API docs, personal API keys, webhooks and white-label presets, quoted separately from Premium.
- **$TBC page** (`/tbc`) — proposed token record. TBC platform credits are off-chain accounting units; the proposed token is not issued, sold, transferable, stakeable or live.
- **Admin portal** (`/admin`) — dashboard, users, analytics, billing, airdrops, content, reports, TV, integrations, API keys, plugins, mentors, wallet & credits, jobs and settings.
- **Onboarding:** 24-mission Pro-Guide checklist; auth via Supabase (OTP, magic links, WebAuthn passkeys) with branded emails.

## 4. Markets & data coverage
- **Crypto (~60):** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, PEPE, SHIB, BONK, WIF, FLOKI, and more — real-time via Binance.
- **Forex (~40):** majors, minors, exotics (EURUSD, GBPUSD, USDJPY … USDTRY, USDSEK, USDNOK).
- **Commodities (20):** gold (XAU/USD), silver, WTI, Brent, natgas, copper, platinum, coffee, cocoa, and more — dedicated gold & Bitcoin coverage.
- **Indices (6):** NQ, ES, DJI, SPX, RUT, VIX, plus 20 sector ETFs and ~100 US stocks (AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, JPM, V …).
- **Feeds:** Binance klines (crypto), Finnhub (US stocks, when keyed), public Yahoo quotes/candles and Alpha Vantage (cached, when keyed). Synthetic fallback is labelled `synthetic` and must never be represented as an executable price. Economic-calendar endpoint included.

## 5. Technology, security & compliance posture
- **Stack:** React 18 + Vite + Tailwind (web) · Node.js + Express 5 (API) · Supabase Postgres with row-level security as the designed tenant boundary · Stripe billing · VPS Ubuntu + PM2 + Nginx + Let's Encrypt TLS.
- **API surface:** 30+ route groups (`/api/*`: quotes, candles, indicator, heatmap, wallet, challenges, backtest, brokers, academy, affiliate, admin, jobs, company, and more); rate limiting, Helmet hardening and Stripe webhook signature verification. Live webhook delivery and RLS isolation are still pending production acceptance.
- **Security features for users:** passkeys where enrolled, session management, KYC-gated profiles (frozen after verification) and suspend/close lifecycle. Admin MFA enforcement is implemented behind `ADMIN_MFA_REQUIRED` and must be enabled after named administrators enroll.
- **Legal:** Terms, Privacy, Refund and FAQ are published in-product; the company is data controller; liability is capped at 12 months' fees or $100; 14-day money-back applies to the first subscription payment. Counsel review of Terms §8.1, corporate registration wording and the TB issuer record remains open.
- **Status:** product version 1.2.0, live in production. Public launch remains gated by the blockers in `docs/blocked-items.md`; this document is not an approval or a launch certificate.

## 6. Business model & monetization
- **Subscriptions (Stripe):**
  - Free — $0: account, Academy catalogue, community, paper trading and profile.
  - Premium — $19.99/month or $199/year: terminal, journal, analytics, SI coach, reports, signals, alerts, heatmaps, broker sync and risk tools.
- **Academy tuition (separate from Premium):** Individual $150, Pro $199, Family $299 and Teams $499, each described as lifetime access. Paid seat redemption is not yet accepted in production.
- **Additional revenue lines:** TradingBible TV advertising, affiliate/referral programme, funded-challenge rails, Academy enrollments and API/white-label licensing. TBC platform credits are not a token sale, deposit or investment product; TBC payment rails remain disabled pending written authorisation.
- **Actual financials, user counts, and revenue:** founder-confirmed figures only — see §9 (traction) and §10 (illustrative projections and raise scenarios). Nothing below is stated as an actual result.

## 7. Brand identity
- **Name:** TradingBible (short: TB). Positioning: the trader's bible — institutional-grade intelligence for everyone.
- **Look:** matte-black + gold luxury fintech. Gold `#d4af37` (light `#f4e6a8`, dark `#a67c1e`), dark `#0a0a0f`, card `#0f0f14`, text `#f0ecdd`.
- **Logo:** rounded dark square, gold border/chevron + dot; bundled + CDN copies; favicon set.
- **Voice:** professional, data-driven, educational — institutional quality without institutional gatekeeping.

## 8. For lenders & investors — what to ask for next
1. Financial statements / projections and use of funds — see illustrative scenarios in §10; founder to confirm actuals.
2. Traction: registered users, paying subscribers, churn, MRR — see tracking framework in §9; founder to confirm actuals.
3. Corporate documents: Delaware certificate of incorporation, EIN letter, bylaws, stock ledger and registered-agent confirmation.
4. D-U-N-S 14-997-6777 — D&B shows no financial statements on file; admin downloads draft Balance Sheet + Income Statement CSVs from Billing & Revenue for accountant review and D&B upload.
5. Product demo: live walkthrough of Terminal Pro, journal + SI Coach, and analytics on tradingbible.app.

## 9. Traction — status and tracking framework
**Status: NO verified traction figures exist in company records available for this brief. The table below is a reporting template — the founder confirms actuals before sharing with any lender or investor.**

| Metric | Actual (founder to confirm) |
|---|---|
| Registered users | — |
| Free accounts / Premium subscribers | — / — |
| MRR / ARR run-rate | — |
| Churn (%/mo) | — |
| Academy waitlist / community members | — |
| TBC platform-credit activity / TV views | — |

Track monthly: new free accounts, Free→Premium conversion, churn, ARPU, CAC and LTV. Product is live (v1.2.0); Stripe live checkout and webhook acceptance are still pending, so no revenue figure is verified.

## 11. Holdings master blueprint alignment (2026 Edition)
Full text: `docs/holdings-master-blueprint.md` (Official Company Profile & Strategic Master Blueprint — 2026 Edition). Structure: **TradingBible Holdings, Inc. (owner, operator and securities issuer) → product divisions.** Divisions under the operating company (Terminal, Intelligence, Prop, Developer, future Brokerage, proposed Coin). MT Bridge `MT_BRIDGE_URL=https://bridge.tradingbible.app` (proposed, not deployed). Roadmap with statuses: formation/EIN completed, D-U-N-S reported, verification audit required, revenue pending, terminal expansion, licensing planned, TBC planned, financing future, IPO long-term. First-90-day plan + official publication-ready About text in the blueprint. None of Goldman Sachs / Morgan Stanley / J.P. Morgan / Jefferies / Chapel Hill Denham / Renaissance Capital is engaged. Titles (Malik Nlem, Victor Okechukwu, Maliba SI) to be confirmed before publication as formal officers.

## 12. Financial projections & the raise — ILLUSTRATIVE SCENARIOS ONLY
**These are models, not results and not promises. Every figure below is computed from stated assumptions so a lender/investor can see the mechanics. Founder confirms which scenario (if any) to present.**

**Legacy three-tier model retired.** The previous Pro / Elite SI / Professional projections were built on prices that are no longer the public plan structure. They must not be presented to a lender or investor. The current public model is Free + Premium at $19.99/month or $199/year, with Academy tuition separate. A new projection must be built from verified conversion, churn, payment costs and infrastructure costs before any number is shared.

Raise-size options with use-of-funds splits (pick one instrument: loan, SAFE, or equity — terms TBD by founder):
| Raise | Product-led | Growth-led | Balanced |
|---|---|---|---|
| Micro (<$50k, e.g. $25k) | Product 55%, Data 10%, Ops 15%, Reserve 20% | Marketing 60%, Product 20%, Ops 10%, Reserve 10% | Product 35%, Marketing 35%, Data 10%, Ops 10%, Reserve 10% |
| Seed ($50–250k, e.g. $150k) | Product 50%, Hires 20%, Data 10%, Ops 10%, Reserve 10% | Marketing 55%, Product 20%, Data 5%, Ops 10%, Reserve 10% | Product 35%, Marketing 30%, Hires 15%, Data 5%, Ops 5%, Reserve 10% |
| Institutional (>$250k, e.g. $500k) | Product 40%, Hires 30%, Data 10%, Ops 10%, Reserve 10% | Marketing 45%, Product 25%, Hires 15%, Data 5%, Reserve 10% | Product 30%, Marketing 30%, Hires 20%, Data 5%, Ops 5%, Reserve 10% |
