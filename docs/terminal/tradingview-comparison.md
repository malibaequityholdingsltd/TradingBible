# TradingView vs TradingBible terminal — working comparison

**Status:** WORKING NOTE — NOT A PUBLIC CLAIM, NOT A PARITY ASSERTION  
**Date:** 14 November 2026  
**Scope:** repository inspection of the current uncommitted terminal, chart, drawing, data, order-flow, replay, alerts and workspace code. TradingView statements are a high-level summary of its published product set on this date and may change.

## Bottom line

TradingBible is not a TradingView replacement and should not be marketed as one.

TradingBible is a chart-first trading workspace built on the open-source `lightweight-charts` library, with a custom drawing layer, native order-flow tools, and integrated journal, risk, paper-challenge and Academy workflows. TradingView remains the much broader charting, data, scripting, publishing and community platform. The terminal already offers TradingView's free Advanced Chart as an optional third-party view, but drawings and indicators made inside that embed stay in TradingView.

The defensible product position is **one workspace for analysis, practice and learning**, not "more TradingView than TradingView".

## Capability comparison

| Area | TradingBible — current repository | TradingView — public product, high level | Practical reading |
| --- | --- | --- | --- |
| Native chart engine | `lightweight-charts` `5.2.1`; six native price styles (candles, hollow candles, bars, line, area, baseline) plus a TradingView embed | Broad proprietary charting engine with many time-based and non-time-based styles | TradingBible is intentionally smaller and owns its drawing layer; TradingView has the deeper chart-type catalogue |
| Instruments | 246 catalogue symbols: 60 crypto, 40 FX, 20 commodities, 6 indices, 20 sectors, 100 stocks | Very broad global exchange, broker and data-provider coverage | TradingBible coverage is curated and provider-dependent, not exhaustive |
| Timeframes | Supported catalogue with client-side aggregation from base intervals | Wide interval catalogue and custom intervals | TradingBible data quality depends on the upstream candle provider; custom intervals are aggregated, not native |
| Drawing tools | 14 tools: trend line, ray, arrow, horizontal line, vertical line, rectangle, ellipse, triangle, parallel channel, Fibonacci retracement, path, text, measure, cursor | Extensive drawing set with many specialist tools, style controls and drawing alerts | TradingBible covers the common desk tools; TradingView has the long tail |
| Drawing interaction | Click-click and press-drag-release for two-point tools; path click-click; body drag; endpoint and path editing; resize; selection; undo/redo; magnet; lock; hide; object list; per-symbol persistence | Mature object model with rich styling, multi-select, grouping, locking, templates and alerts on objects | TradingBible's core interaction is usable by mouse and touch; advanced object styling and drawing alerts remain gaps |
| Drawing storage | `{ time, price }` chart-space points; rendered through a series primitive; local mirror plus PocketBase `chart_drawings`; named templates | Cloud-saved layouts and drawings inside TradingView's account model | TradingBible keeps drawings tied to its own chart and journal; cloud sync is best-effort and RLS is not yet proven |
| Indicators | 22 native definitions: SMA, EMA, WMA, Bollinger, Ichimoku, VWAP, VWMA, Donchian, Keltner, RSI, MACD, Stochastic, Stoch RSI, ATR, StdDev, ADX, OBV, Volume ROC, CCI, MFI, Williams %R, ROC | Very large built-in library plus Pine Script and a large public script community | No custom scripting language, no public script ecosystem and no server-side indicator execution in TradingBible |
| Alerts | Price and percentage alerts, alert history, pause/update/delete, terminal bottom-dock view, prefilled alert creation from the chart | Rich conditional alerts, server-side evaluation, webhooks and app/email delivery | TradingBible alert delivery is not independently verified; conditions are narrower |
| Order flow | Native canvas heatmap with bid/ask depth, trade bubbles, VWAP, session stats, docked ladder, tape and pause/reset/fullscreen | Footprint, volume profile, DOM and order-flow products on higher plans | TradingBible's order flow is a differentiated in-product desk, but data depth and symbol coverage are narrower |
| Footprint | Live bid x ask volume by price level, 5-minute buckets, POC, delta strip; crypto from the live aggregate-trade tape, other symbols from polled prints classified by tick rule | Mature footprint with configurable inputs, data from supported feeds | TradingBible is explicit that nothing is backfilled; feed depth and history are limited |
| Replay | Candle-step replay with play/pause/step/restart, separate local practice journal and paper-only simulation | Bar Replay across chart history and intervals on paid plans | TradingBible replay is useful for practice but does not replay order-flow depth or broker fills |
| Layouts | Single, two-chart and four-chart layouts; per-pane symbol and timeframe | Multiple layout configurations, saved layouts and templates | TradingBible covers the common 1/2/4 desk layouts; TradingView has more layout and synchronization controls |
| Workspace persistence | Local-first workspace plus optional PocketBase sync; saved versions and desk presets | Cloud account, saved layouts, templates and cross-device sync | TradingBible's local-first design is resilient offline; cross-device cloud behavior is not yet production-proven |
| Broker execution | Paper and challenge orders only in this workspace; live brokerage execution is explicitly not connected | Broker integrations and execution through supported partners | This is a product boundary, not a hidden capability; do not imply live execution |
| News and calendar | Integrated news desk and economic calendar | News, economic calendar, community ideas and broad market coverage | TradingBible integrates news next to the desk; TradingView has the larger content and community surface |
| Journal and learning | Trade journal, paper/challenge journal, AI coach, Academy, programmes and webinars | Not an education or journaling product in the same sense | This is TradingBible's clearest differentiated surface |
| Mobile | Responsive web terminal with touch drawing and mobile chart controls | Native mobile and desktop applications | TradingBible has no native app; mobile is browser-based |
| Community and publishing | No public idea/script marketplace | Large public ideas, scripts and follower graph | TradingBible deliberately has no social trading layer |
| Data transparency | Source labels, `SIM`/`CLOSED` states, honest empty/error states, no backfilled footprint claim | Broad data with plan-dependent real-time entitlements | TradingBible is transparent about synthetic/closed data; TradingView has more data but plan-dependent access |
| Security and assurance | Pre-launch; no ISO/IEC 27001, SOC 2, PCI DSS, audit opinion or independent penetration test claimed | Established commercial platform with its own assurance and compliance programme | Do not compare security certifications; TradingBible has none to claim |

## What is verified

- Unit tests cover drawing geometry and the logical-index/pixel coordinate bridge (`geometry.test.js`, `coordinates.test.js`).
- The chart acceptance record documents desktop and mobile runtime checks for custom intervals, chart types, indicators, comparison, trend-line drawing, object/settings modals, split layout, fullscreen and symbol switching in a mocked harness.
- Current web tests pass: 9 files, 49 tests.
- Current web and API lint, web production build and root `npm run verify` pass.
- Public-site audits cover the marketing pages, not the authenticated terminal.

## What is not verified

- Real authenticated subscriber sessions on the current build.
- Live broker execution, live payments, refunds or entitlement changes.
- Production PocketBase/Supabase row-level security and tenant isolation.
- Cross-device drawing sync, conflict handling or recovery after a failed cloud save.
- Alert evaluation and delivery outside the mocked harness.
- Order-flow/footprint depth and history across all 246 symbols.
- Replay of order-book depth, fills or execution.
- Performance at large drawing counts, long sessions or many open panes.
- Any feature, performance, price or reliability parity with TradingView.

## Product decisions

1. Keep the `lightweight-charts`-based chart as the primary analysis surface; keep the TradingView embed optional and clearly attributed.
2. Do not use "TradingView alternative", "TradingView clone" or parity claims in public copy.
3. Compete on the integrated desk, journal, risk, practice and Academy workflow, not on the size of the indicator or drawing catalogue.
4. Close reliability gaps before adding chart breadth: real-session auth, cloud persistence, alert delivery, data coverage and mobile performance.
5. Treat drawing alerts, custom scripting, advanced object styling, deeper replay and native apps as roadmap items, not current capabilities.

## Next comparison work

- Benchmark the same 20 symbols and 5 timeframes against the live candle provider, recording gaps, latency and synthetic/closed states.
- Measure drawing interaction at 50, 100 and 500 objects on desktop and mobile.
- Test cloud save, reload, second device, conflict and offline recovery with a real account.
- Verify alert creation, evaluation, delivery and history end to end.
- Compare order-flow and footprint depth against a paid TradingView plan using the same symbols and session.
- Re-check all public copy for any accidental parity or superiority claim before launch.

## Boundaries

TradingView is a trademark of TradingView, Inc. TradingBible is not affiliated with or endorsed by TradingView. The `lightweight-charts` attribution link remains visible as required by its license. This note is an internal working document, not marketing copy, investment material or a representation of TradingView's current or future product.
