# TradingBible — Company, Product & Brand Brief
*Prepared for lenders, investors, partners, and users. All statements below are sourced from the company repository and live product; figures marked TBD are to be supplied by the founder.*

## 1. Company snapshot
- **Legal name (current + sole operator):** TradingBible LLC — *sole company; Holdings Inc. ON HOLD, not formed.*
- **Form & domicile:** Delaware limited liability company, formed **August 10, 2026** (NAICS 511210), c/o Delaware Registered Agent, Inc.
- **Tax/identity:** IRS EIN **issued** (CP575G); D-U-N-S **14-997-6777 — verified**.
- **Structure:** one LLC + product divisions (Terminal, Intelligence, Prop, Developer, future Brokerage, proposed Coin) — *divisions, not subsidiaries.*
- **Proposed public parent:** TradingBible Holdings, Inc. — *proposed only; ticker TB requested, not reserved/confirmed.*
- **Native coin:** TBC (max 100M, Cosmos SDK baseline, proposed; 90-day testnet planned) — *TBC is not TB equity.*
- **Regulatory status:** Delaware incorporation is **not** a brokerage license. No live client deposits until a licensed entity + banking + safeguarding are operational.
- **Owner/operator:** TradingBible LLC owns and operates the platform solely.
- **Leadership:**
  - Malik Nlem — Founder & Chief Executive
  - Victor Okechukwu — Vice President
  - Maliba SI — Head of Quantitative Research (the platform's SI research function)
- **Team profile:** Operators, engineers, and quants from global markets and technology.
- **Domain & contacts:** tradingbible.app · support@tradingbible.app · legal@tradingbible.app · privacy@tradingbible.app · ads@tradingbible.app
- **Response commitment:** team responds within one business day.

## 2. What TradingBible is
TradingBible is a global financial technology (FinTech) platform that delivers institutional-grade market intelligence, advanced trading tools, real-time market analysis, educational resources, and SI-powered insights — in one terminal.

- **Mission:** empower individuals with transparent, data-driven market intelligence, innovative technology, and world-class educational resources that support smarter financial decision-making.
- **Vision:** become one of the world's leading financial technology platforms by making professional trading intelligence accessible to every trader and investor.

## 3. The web app — product tour (live at tradingbible.app)
AI-powered trading journal and analytics platform with a Bloomberg-grade terminal experience. Key modules:
- **Terminal Pro** (`/app/terminal-pro`) — flagship 3-zone trading workstation: charts, watchlists, command strip.
- **Trade journal** (`/app/journal`) — entries, exits, notes; broker-synced; mistake detection.
- **Analytics** (`/app/analytics`) — equity, drawdown, P&L, discipline scoring.
- **SI reports** (`/app/reports`, Elite+) — daily/weekly SI-generated reports.
- **SI Trading Coach** (`/app/coach`, Elite+) — conversational SI that reviews trades, grades discipline, prescribes fixes.
- **Signals & indicators** (`/app/signals`, `/app/indicators`) — data-driven signals from 14 built-in indicators (RSI, MACD, Bollinger, EMA, etc.).
- **Risk tools** (`/app/tools`) — position sizer, risk/reward, breakeven, expectancy, ruin evaluator.
- **Backtest & paper trading** (`/app/backtest`, `/app/paper`) — strategy testing without capital at risk.
- **Challenges / prop firms** (`/app/challenges`) — funded-evaluation tickets, rules, and payouts across instruments.
- **Broker & prop-firm sync** (`/app/brokers`) — connected accounts with P&L tracking (Binance, Deriv, easyMarkets, IBKR, Alpaca, Coinbase — live accounts; MT5 bridge; self-custody BTC/ETH/USDC/Solana).
- **Price alerts, heatmaps, order flow, economic calendar** — full professional toolset.
- **Community** (`/app/community`) — forum with leaderboard ranked by real contributions (no fake P&L).
- **Academy, mentors, webinars, guides, blog** — structured learning paths, courses, mentor booking.
- **TradingBible TV** (`/tv`) — broadcast/ad rotation player with view/click tracking.
- **Wallet & billing** (`/app/wallet`, `/app/billing`) — Stripe fiat + non-custodial crypto funding; subscription management.
- **Developer platform** (Professional) — REST API docs, personal API keys, webhooks, white-label presets.
- **$TBC token page** (`/tbc`) — ecosystem token with lockups/vesting schedules; staking yields.
- **Admin portal** (`/admin`) — dashboard, users, analytics, billing, airdrops, content, reports, TV, integrations, API keys, plugins, mentors, wallet & staking, jobs, settings.
- **Onboarding:** 24-mission Pro-Guide checklist; auth via Supabase (OTP, magic links, WebAuthn passkeys) with branded emails.

## 4. Markets & data coverage
- **Crypto (~60):** BTC, ETH, SOL, BNB, XRP, ADA, DOGE, PEPE, SHIB, BONK, WIF, FLOKI, and more — real-time via Binance.
- **Forex (~40):** majors, minors, exotics (EURUSD, GBPUSD, USDJPY … USDTRY, USDSEK, USDNOK).
- **Commodities (20):** gold (XAU/USD), silver, WTI, Brent, natgas, copper, platinum, coffee, cocoa, and more — dedicated gold & Bitcoin coverage.
- **Indices (6):** NQ, ES, DJI, SPX, RUT, VIX, plus 20 sector ETFs and ~100 US stocks (AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, JPM, V …).
- **Feeds:** Binance klines (crypto), Finnhub (US stocks), Alpha Vantage (cached equities/forex), with synthetic fallback so charts never render empty. Economic-calendar endpoint included.

## 5. Technology, security & compliance posture
- **Stack:** React 18 + Vite + Tailwind (web) · Node.js + Express 5 (API) · Supabase Postgres with row-level security (auth/data) · Paddle/Stripe billing · VPS Ubuntu + PM2 + Nginx + Let's Encrypt TLS.
- **API surface:** 30+ route groups (`/api/*`: quotes, candles, indicator, heatmap, wallet, challenges, backtest, brokers, academy, affiliate, admin, jobs, company, and more); rate limiting, Helmet hardening, verified webhook signatures.
- **Security features for users:** passkeys, session management, KYC-gated profiles (frozen after verification), suspend/close lifecycle.
- **Legal:** Terms, Privacy, Refund, FAQ published in-product; company is data controller; liability capped at 12 months' fees or $100; 14-day money-back on first subscription payment.
- **Status:** product version 1.2.0, live in production.

## 6. Business model & monetization
- **Subscriptions (Stripe; no free trial, card required):**
  - Pro — $19.99/mo: unlimited trades, full analytics, SI scoring, 5 brokers, calendar.
  - Elite SI — $49.99/mo (most popular): everything in Pro + SI Coach chat, daily/weekly SI reports, mistake detection, 15 brokers, priority queue.
  - Professional — $99/mo: everything in Elite + unlimited brokers, team seats, API & webhooks, white-label, white-glove onboarding, success manager.
- **Additional revenue lines:** TradingBible TV advertising, affiliate/referral program, funded-challenge rails, academy enrollments, $TBC ecosystem activity, API/white-label licensing.
- **Actual financials, user counts, and revenue:** founder-confirmed figures only — see §9 (traction) and §10 (illustrative projections and raise scenarios). Nothing below is stated as an actual result.

## 7. Brand identity
- **Name:** TradingBible (short: TB). Positioning: the trader's bible — institutional-grade intelligence for everyone.
- **Look:** matte-black + gold luxury fintech. Gold `#d4af37` (light `#f4e6a8`, dark `#a67c1e`), dark `#0a0a0f`, card `#0f0f14`, text `#f0ecdd`.
- **Logo:** rounded dark square, gold border/chevron + dot; bundled + CDN copies; favicon set.
- **Voice:** professional, data-driven, educational — institutional quality without institutional gatekeeping.

## 8. For lenders & investors — what to ask for next
1. Financial statements / projections and use of funds — see illustrative scenarios in §10; founder to confirm actuals.
2. Traction: registered users, paying subscribers, churn, MRR — see tracking framework in §9; founder to confirm actuals.
3. Corporate documents: Delaware certificate of formation, EIN letter, operating agreement, registered-agent confirmation.
4. D-U-N-S 14-997-6777 — D&B shows no financial statements on file; admin downloads draft Balance Sheet + Income Statement CSVs from Billing & Revenue for accountant review and D&B upload.
5. Product demo: live walkthrough of Terminal Pro, journal + SI Coach, and analytics on tradingbible.app.

## 9. Traction — status and tracking framework
**Status: NO verified traction figures exist in company records available for this brief. The table below is a reporting template — the founder confirms actuals before sharing with any lender or investor.**

| Metric | Actual (founder to confirm) |
|---|---|
| Registered users | — |
| Paying subscribers (Pro / Elite / Professional) | — / — / — |
| MRR / ARR run-rate | — |
| Churn (%/mo) | — |
| Academy waitlist / community members | — |
| $TBC activity (stakers, TV views) | — |

Track monthly: new trials, trial→paid conversion, churn by plan, ARPU, CAC, LTV. Product is live (v1.2.0) with full subscription billing via Stripe.

## 11. Holdings master blueprint alignment (2026 Edition)
Full text: `docs/holdings-master-blueprint.md` (Official Company Profile & Strategic Master Blueprint — 2026 Edition). Founder decision: **LLC sole entity; Holdings ON HOLD.** Divisions under one LLC (Terminal, Intelligence, Prop, Developer, future Brokerage, proposed Coin). MT Bridge `MT_BRIDGE_URL=https://bridge.tradingbible.app` (proposed, not deployed). Roadmap with statuses: formation/EIN completed, D-U-N-S reported, verification audit required, revenue pending, terminal expansion, licensing planned, TBC planned, financing future, IPO long-term. First-90-day plan + official publication-ready About text in the blueprint. None of Goldman Sachs / Morgan Stanley / J.P. Morgan / Jefferies / Chapel Hill Denham / Renaissance Capital is engaged. Titles (Malik Nlem, Victor Okechukwu, Maliba SI) to be confirmed before publication as formal officers.

## 12. Financial projections & the raise — ILLUSTRATIVE SCENARIOS ONLY
**These are models, not results and not promises. Every figure below is computed from stated assumptions so a lender/investor can see the mechanics. Founder confirms which scenario (if any) to present.**

Shared assumptions: plan prices Pro $19.99 / Elite SI $49.99 / Professional $99; illustrative mix 60/30/10 → ARPU ≈ $36.89; linear net adds from zero base; Stripe fees ~3–5% and infra (VPS, Supabase, data feeds) scale with usage and are excluded — founder to supply cost schedule.

| | Conservative (+40 net subs/mo) | Aggressive (+120 net subs/mo) |
|---|---|---|
| Month 3 subs / MRR | 120 / $4,427 | 360 / $13,281 |
| Month 6 subs / MRR | 240 / $8,854 | 720 / $26,562 |
| Month 9 subs / MRR | 360 / $13,281 | 1,080 / $39,842 |
| Month 12 subs / MRR | 480 / $17,708 | 1,440 / $53,123 |
| Yr-1 cash collected (approx) | ~$115,100 | ~$345,300 |
| ARR run-rate at M12 | ~$212,500 | ~$637,500 |

Raise-size options with use-of-funds splits (pick one instrument: loan, SAFE, or equity — terms TBD by founder):
| Raise | Product-led | Growth-led | Balanced |
|---|---|---|---|
| Micro (<$50k, e.g. $25k) | Product 55%, Data 10%, Ops 15%, Reserve 20% | Marketing 60%, Product 20%, Ops 10%, Reserve 10% | Product 35%, Marketing 35%, Data 10%, Ops 10%, Reserve 10% |
| Seed ($50–250k, e.g. $150k) | Product 50%, Hires 20%, Data 10%, Ops 10%, Reserve 10% | Marketing 55%, Product 20%, Data 5%, Ops 10%, Reserve 10% | Product 35%, Marketing 30%, Hires 15%, Data 5%, Ops 5%, Reserve 10% |
| Institutional (>$250k, e.g. $500k) | Product 40%, Hires 30%, Data 10%, Ops 10%, Reserve 10% | Marketing 45%, Product 25%, Hires 15%, Data 5%, Reserve 10% | Product 30%, Marketing 30%, Hires 20%, Data 5%, Ops 5%, Reserve 10% |
