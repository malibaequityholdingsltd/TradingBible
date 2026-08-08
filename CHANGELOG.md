# Changelog

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
