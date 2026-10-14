# TradingBible Holdings, Inc. — Global Brokerage, Technology, Blockchain & Public Stock Market Master Blueprint 2.0
*October 13, 2026 · Proposed ticker: TB (Nasdaq / NYSE / NGX strategy) · Native coin: TBC*

> Source: founder master blueprint (Oct 13, 2026). This file is the canonical in-repo copy.
> Two binding distinctions: (1) TradingBible LLC (Delaware) is **not** a licensed broker — incorporation ≠ license. (2) **TB** is a *requested* stock ticker, not a reserved/confirmed symbol. **TBC ≠ TB equity.**

## Executive vision
Integrated ecosystem with four core businesses:
1. **TradingBible Markets** — independently licensed brokerage (forex, gold, BTC derivatives, indices, commodities).
2. **TradingBible Technologies** — proprietary terminal, charting engine, order-flow, heatmaps, brokerage connectivity, embeddable APIs.
3. **TradingBible Digital Assets** — proposed TBC blockchain ecosystem + separately regulated spot crypto business.
4. **TradingBible Holdings** — proposed public-company parent (ticker TB, subject to exchange approval).

## 1. Corporate / legal structure (proposed — do not create all at once)
| Entity | Role | Status |
|---|---|---|
| TradingBible LLC | Existing Delaware company | Existing (user-reported) |
| TradingBible Holdings, Inc. | Future IPO parent | Proposed |
| TradingBible Markets | FX/derivatives brokerage | Proposed |
| TradingBible Securities | Actual stock trading | Proposed |
| TradingBible Digital Assets | Crypto exchange + custody | Proposed |
| TradingBible Technologies | Software + API licensing | Proposed |
| TradingBible Blockchain | TBC network + governance | Proposed |

Each subsidiary adds legal/tax/reporting cost — create only when needed.
Delaware LLC → corporation: direct conversion **or** corporate holding company + reorg beneath it. Verify ownership, operating agreements, liabilities, IP, tax elections, conversion approvals, share issuance, change-of-control restrictions. Future IPO issuer needs audited financials, board + independent directors, audit committee, internal controls, SEC-ready disclosures.

## 2. Stock ticker TB (proposed)
- Common stock: **TB** — corporate ownership + shareholder rights.
- Coin: **TBC** — rights defined by token economics + applicable law only.
- Owning TBC ≠ owning Holdings unless a structured securities arrangement says so. Never advertise interchangeably.
- TB requires formal availability verification + reservation through listing (market-data search is not enough; NYSE has a formal reservation step).

## 3. Independent brokerage licensing
Delaware incorporation is not a license. Managing from Nigeria may create Nigerian regulatory/employment/tax/substance obligations even if the brokerage incorporates elsewhere. Legal work must cover: where activity is performed, eligible client countries, product classification, capacity (principal/agent/exchange/custodian/intermediary), segregation, capital, AML/KYC, reporting, disputes, U.S. solicitation rules. U.S. retail forex: $20M minimum adjusted net capital (plus add-ons). Evaluate several jurisdictions + written legal opinions; never pick on fee alone.

## 4. Six market categories
Forex (FX liquidity/dealing/risk) · Gold XAU/USD (metals pricing/execution) · Bitcoin BTC/USD derivatives (crypto-derivatives liquidity/margin) · Stocks & indices (custody + derivative gateways) · Commodities oil/silver+ (pricing/execution) · Crypto spot BTC/ETH+ (matching/custody/settlement). Launch regulated with a manageable set — custodial assets need more than MT5 symbols.

## 5. MetaTrader 5 broker infrastructure
Retail MT5 app + Python terminal ≠ broker-server/admin rights. Need institutional broker-side rights.
```
Clients (Web/iOS/Android/MT5) → Brokerage Backend (Identity·KYC·CRM·Payments·Ledger) → MT5 Broker Gateway (Manager APIs·Routing·Sync) → MT5 Trade Servers + Risk → LPs/Exchanges
```
Dedicated licensed production infra, redundant access servers, backups/DR, protected admin networks, execution monitoring, reconciliation. Hostinger Ubuntu 24.04 = dev gateway only, not full production stack.

## 6. MT Bridge deployment (proposed)
`MT_BRIDGE_URL=https://mt-bridge.tradingbible.app` · dev token: `openssl rand -hex 32` → `MT_BRIDGE_TOKEN`. Endpoints: `POST /v1/accounts`, `GET /v1/accounts/{id}`, `GET /v1/positions`, `POST /v1/orders`, `GET /v1/orders/{id}`, `GET /v1/history`, `GET /v1/stream`, `GET /v1/health`. Production: service identities, scoped credentials, mTLS, rotation, audit logs, account-level auth. Never expose management interfaces/credentials in mobile apps.

## 7. Proprietary terminal (independent commercial asset, not an MT5 skin)
Terminal Pro: candlesticks, indicators, multi-chart, drawings + saved analysis, depth, order-flow footprints, heatmaps, positions, journals, broker sync. Future Chart SDK (`Charts by TradingBible`) = licensing business. Stack: React/Next.js, native/cross-platform mobile, PostgreSQL, Redis, event stream, object storage, WebSockets, dedicated OMS/risk. Preserve execution IDs, sequence numbers, idempotency keys, reconciliation checkpoints, durable workspace storage. **Logout must not erase trades or saved analysis.**

## 8. Liquidity / execution / risk
Seek multiple institutional quotes (e.g. LMAX, B2PRIME, oneZero tech). Contracts: collateral, jurisdictions, instruments, spreads, commissions, execution, API, hedging, counterparty risk, DR. Start largely externally hedged. Risk engine: net exposure, leverage, margin, stop-out, feed anomalies, slippage, hedging failures, outages, concentration.

## 9. Payments / banking / asset protection
Separate: operating money, regulatory capital, client funds, crypto assets. Controls: KYC, sanctions, SoF, monitoring, withdrawal approvals, reconciliation, chargebacks, reviewed records. Spot crypto needs its own custody/settlement. **No live deposits until licensed entity + banking + safeguarding are live.**

## 10. IPO exchange comparison
- **Nasdaq Capital Market (preferred):** alternative financial standards; needs float, distribution, market value, price, governance. ([Guide](https://www.nasdaq.com))
- **NYSE (larger-company):** main board = larger scale; assess NYSE American separately.
- **NGX Growth Board (alternative):** Entry/Standard segments; Nigerian PLC structure + securities-law compliance.
| Requirement | Nasdaq Capital | NYSE main IPO | NGX Growth Entry |
|---|---|---|---|
| Publicly held shares | 1M | 1.1M | 10% float min |
| Shareholders | 300 round-lot | 400 round-lot | 21 public |
| Public float value | $15M | $40M | deal-dependent |
| Market cap | standard-dependent | test-dependent | ≥ ₦50M |
| Financials | equity/market-value/income route | earnings/market-cap route | track record / alternatives |
Thresholds are selected, not complete tests. Strategy: Nasdaq first, NYSE American separately, NGX as alternative — decide on audited financials + adviser analysis.

## 11. Stock structure / founder control (illustrative, not issued)
100M fully diluted: founder 60M (60%), private 15M (15%), employee pool 10M (10%), public 15M (15%). Default one-share-one-vote; board nomination rights where permissible; independent directors/committees; vesting; investor protections. Dual-class only if justified + acceptable. Authorized shares ≠ control — raises/awards/IPO dilute.

## 12. Valuation / fundraising (illustrative math, not forecasts)
$5M×2=$10M · $15M×3=$45M · $30M×4=$120M · $60M×5=$300M · $100M×6=$600M. E.g. $120M / 100M shares = $1.20 (< $4 Nasdaq bid-price norm; reverse split changes price, not value/float). Build 3-yr forecast: accounts, volume, net trading revenue, SaaS revenue, payment/custody, liquidity, compliance, staff, EBITDA, cash flow, capital, dilution.

## 13. Costs / capital planning (planning ranges, not quotes)
Brokerage launch $720K–$2.09M (legal/licensing 75–250K, MT5 90–240K, liquidity/bridge 50–150K, terminal tech 150–450K, infra/security 40–120K, KYC/CRM/payments 40–130K, staffing 200–550K, audit/testing 75–200K; excludes regulatory capital/collateral/acquisitions/spot-crypto/equities builds). U.S. IPO prep $1.1M–$4M + underwriting % + ongoing compliance. Separate: dev spend, regulatory capital, collateral, client assets (not funding), IPO expenses/proceeds. IPO cannot fund pre-launch regulatory requirements.

## 14. Banks / advisers (none engaged)
Goldman Sachs, Morgan Stanley, J.P. Morgan, Jefferies (U.S. IPO); Chapel Hill Denham, Renaissance Capital (Nigeria/Africa). Hire first: Delaware corporate counsel, U.S. securities counsel, Nigerian capital-markets counsel, cross-border tax, regulatory adviser. Auditors/banks later, matched to offering size.

## 15. SEC / exchange filings
U.S.: restructuring, audited financials, Form S-1, prospectus, SEC review, exchange application, underwriting, pricing; then periodic reporting, insider compliance, disclosures, governance, controls. Nigeria: issuer eligibility, SEC registration, NGX admission, advisers, prospectus, audited accounts, governance/distribution. Delaware LLC cannot assume direct NGX Growth listing. Readiness docs: cap table, 3-yr projections, audited accounts, licenses, risk disclosures, IP records, material contracts, cybersecurity, litigation, governance, use of proceeds.

## 16. TBC / blockchain division (legally distinct from TB stock)
TBC: max 100M, Cosmos SDK + CometBFT + Cosmos EVM baseline, fixed supply (no routine minting), private dev-chain prototype, $50K testnet planning budget, independent audits, mainnet gated on legal/security/ops. Allocation/staking/issuance/sale need separate legal analysis. Public-company disclosures required for material TBC holdings/issuance/related-party/custody/liabilities.

## 17. Combined roadmap (indicative)
01 Corporate/legal 2026–27 (gate: feasibility + funding) → 02 Licensing/capital 2027–28 (gate: licensed + capitalized) → 03 Technology 2027–28 (gate: security/integration tested) → 04 Controlled launch 2028–29 (gate: live + risk approval) → 05 Revenue/governance 2028–30 (gate: sustainable + audited) → 06 IPO prep 2029–31+ (gate: eligible) → 07 Listing 2030–32+ (gate: IPO + admission) → 08 Public-company expansion (gate: ongoing compliance). Dates may slip substantially.

## 18. First 90 days
Days 1–30: verify records/ownership/tax, appoint counsel, commission licensing + IPO feasibility. Days 31–60: business plan, financial model, capital needs, corporate architecture, MT5/liquidity RFQs. Days 61–90: jurisdiction shortlist, vendor quotes, prototype scope, funding/governance plan.

## 19. Strategic targets
Holdings Inc. · TB (subject to approval) · Nasdaq Capital preferred (NYSE/NYSE American/NGX alternatives) · independently licensed multi-asset brokerage · MT5 + proprietary terminal · Charts + SDK · order-flow/heatmaps/analytics · TradingBible Chain · TBC ≤100M · audited reporting + independent oversight · Nigeria management base with proper substance. Strongest structure: regulated brokerage + proprietary tech (licensing/market-data/enterprise revenue), not commissions alone. IPO is a milestone earned via performance/eligibility, not a launch prerequisite. First binding decisions: legal feasibility, jurisdiction, ownership, funding, regulatory capital.
