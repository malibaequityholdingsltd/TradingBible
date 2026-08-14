# Changelog

## v1.1.3 (next) — Terminal-wide redesign + drawings fix

- **Page redesign across the terminal**: new premium `PageHeader` hero (icon chip,
  kicker, description, actions) replacing the plain intro paragraphs on
  Reports, Broker Connections, Prop Firm Center, Community, Billing and
  Affiliate; polished stat tiles, status pills, hover states and empty states
  on those pages.
- **Reports**: upgraded stat tiles (daily/weekly/monthly P&L, trader score),
  fixed truncated Export PDF / Print button labels, improved print/PDF layout.
- **Billing**: Paddle developer credentials warning now visible to admins only
  (was leaking `PADDLE_*` env guidance to all users).
- **Charts**: drawing tools (trendlines, levels, annotations) now enabled in
  Split and 4-Grid layouts, not just Single; added migration
  `20260814000000_chart_drawings_extend.sql` (`is_template`/`shared`/`name`
  columns) so per-symbol drawings and templates actually persist.

## v1.1.2 (next) — Real wallet tracking

Replaced the simulated wallet (demo deposit/withdraw/cards/buy/sell) with **real
wallet balance tracking**. TradingBible does **not** custody funds: users add
their own public addresses and the app reads live balances straight from the
blockchain (keyless, no API keys required):

- **Bitcoin** — mempool.space (fallback: Blockstream)
- **Ethereum (ETH)** — public RPCs
- **USDC** on Ethereum / Base / Polygon, **USDT** on Ethereum — `eth_call` token balances
- **Solana (SOL)** — public RPC
- USD values from Binance (fallback: CoinGecko), 30s price cache / 10s balance cache
- New table `wallet_trackers` (owner-scoped RLS), API `GET/POST /api/wallet`, `DELETE /api/wallet/:id`
- Wallet page rewritten: add/remove tracked addresses, live balances + USD totals,
  explorer links. All deposit/withdraw/buy/sell/send/card flows removed.

## v1.1.1 — Reliability + GitHub docs (2026-08-14)

### Fixes
- **Wallet** works end-to-end: added missing `reserved`/`holdings` (`crypto_accounts`), card fields (`bank_cards`) and `asset`/`fiatValue`/`counterparty` (`bank_transactions`) via migration `20260814001000_wallet_columns.sql` — deposit/withdraw/buy/sell/send/cards previously failed with "column does not exist"
- **Series endpoints** (`/intraday`, `/daily`, `/weekly`, `/monthly`) no longer return empty candles: crypto now proxies live Binance klines (`BTCUSDT` symbols canonicalized), non-crypto falls back to Alpha Vantage → synthetic so charts always render
- **Quotes** accept Binance-style symbols (`BTCUSDT → BTCUSD`, `PAXGUSDT → XAUUSD`) and resolve to live data
- **Community forum** works end-to-end: added missing `category`/`authorName`/`authorAvatar`/`replyCount` columns (migration `20260814000000_forum_content_columns.sql`), seeded starter threads, idempotent seed scripts (`scripts/seed-forum.js`, `scripts/seed-demo-ads.js`)
- **Academy waitlist** join no longer fails (form wrote a nonexistent `interest` column)
- **Learn & Connect** (Community/Academy) now visible to all logged-in users, not just subscribers
- **TV ads feed** seeded with a placeholder broadcast so TradingBible TV renders content
- **Branded auth emails** go live via the Supabase Send Email hook → `POST /api/auth/send-email` (signature-verified, Hostinger SMTP)
- Git remote moved to `github.com/malibaequityholdingsltd/TradingBible`

### Docs
- New GitHub documentation set: `docs/architecture.md`, `docs/api.md`, `docs/environment.md`, `docs/database.md`, `docs/deployment.md`; README rewritten

## v1.1.0 — AI assistant on DeepSeek V4 Flash + redesigned chat widget

### Features
- AI assistant now runs on **DeepSeek V4 Flash** (`deepseek-v4-flash`), with the
  retired `deepseek-chat` default replaced (provider resolution: Integrated AI
  proxy → local **opencode gateway** (`opencode/deepseek-v4-flash-free`, free,
  chat-only agent) → DeepSeek → any OpenAI-compatible endpoint)
- Expanded system prompt: full instructions on how the model receives input
  (text/image, stateless turns, history replay) and how it must output
  (concise Markdown, no fabricated numbers, platform knowledge)
- Complete redesign of the floating AI assistant widget: glassmorphism panel
  with frosted header, amber terminal accents, Coach/Tools/About tabs, quick
  prompt grid, avatar-framed bubbles, resized 25rem window
- Full integration docs: `docs/deepseek-integration.md` (providers, env vars,
  input/output wire format)

## v1.0.0 — Production-ready release

### Features
- AI-powered trading journal with broker & prop-firm sync
- Real-time market data (Binance, Finnhub, Polygon.io)
- Advanced charting with 14 technical indicators and persistent drawings
- Technical-indicator signal service (`GET /indicator`) returning buy/sell/hold
  signals with confidence scores
- Watchlists, price alerts, trading signals, economic calendar
- Crypto banking dashboard (wallet, cards, transactions)
- AI Coach, analytics, reports, risk tools
- Community forums, academy, PWA support
- OTP passwordless auth, optional 2FA, Paddle billing

### Changes in this release
- Removed all KYC/KYB components, pages, routes, navigation and legal references
- Purged KYC submission and audit-log records from the database
- Responsive polish across breakpoints (320px / 768px / 1024px)
- Added `.env.example`, `.gitignore`, `README.md`, `CHANGELOG.md`

### Known limitations
- Native iOS/macOS apps, StoreKit in-app purchases and biometric auth require a
  native environment and are out of scope for the web stack.
- Scheduled/background jobs are not supported on the hosting tier.
- All accounts start empty ($0.00) until a real broker connection provides data.
