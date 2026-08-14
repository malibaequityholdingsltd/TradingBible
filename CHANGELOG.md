# Changelog

## v1.1.1 — Reliability + GitHub docs (2026-08-14)

### Fixes
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
