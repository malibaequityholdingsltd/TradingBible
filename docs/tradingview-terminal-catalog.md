# TradingView chart terminal — public feature catalog

**Compiled:** 15 November 2026  
**Surface:** <https://www.tradingview.com/chart/>  
**Status:** Public research, not an endorsement and not a claim of affiliation.

This is a catalog of the publicly visible TradingView chart terminal and its official documentation. It is deliberately not a dump of every symbol or every community script: those libraries are dynamic and effectively unbounded. The live menus, the official built-in indicator folder and the symbol search are the authoritative lists. Some items below are plan-gated, region-gated, data-gated or broker-gated.

## 1. Top toolbar and page chrome

- Symbol search / ticker lookup; exchange-qualified symbols.
- Compare symbol overlay.
- Time interval selector (including custom intervals).
- Chart type selector.
- Indicators, metrics and strategies picker.
- Favorite indicators and quick-access indicator slots.
- Indicator templates and chart templates.
- Create alert.
- Bar Replay.
- Chart layout selector (single, split, multi-chart).
- Save / load chart layout; rename, copy and delete layouts.
- Quick search / command search.
- Chart settings.
- Fullscreen.
- Snapshot / copy chart image.
- Share and publish chart.
- Trade panel / broker order entry.
- Upgrade / plan controls.
- Account, notifications, help and language/theme controls.

## 2. Chart types visible in the picker

Bars · Candles · Hollow candles · Volume candles · Line · Line with markers · Step line · Area · HLC area · Baseline · Columns · High-low · Volume footprint · Time price opportunity (TPO) · Session volume profile · Heikin Ashi · Renko · Line break · Kagi · Point & figure · Range.

Gating examples: Volume Profile is an Essential-or-higher feature; TPO and Volume Footprint are Plus-or-higher; automatic chart-pattern recognition is Premium-or-higher. Availability also depends on the instrument and data package.

## 3. Timeframes and ranges

- Custom interval.
- Ticks: 1, 10, 100, 1000.
- Seconds: 1, 5, 10, 15, 30, 45.
- Minutes: 1, 2, 3, 5, 10, 15, 30, 45.
- Hours: 1, 2, 3, 4.
- Days / weeks / months: 1D, 1W, 1M, 3M, 6M, 12M.
- Range bars: 1, 10, 100, 1000.
- Visible-range shortcuts on the chart: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, All.
- Go-to-date control, timezone selection, session breaks, extended-hours display and dividend adjustment.

History depth, intraday limits and some data types depend on the plan and the exchange/data entitlement.

## 4. Drawing and measurement tools

TradingView advertises **110+ smart drawing tools**. The left rail groups them into:

- Cursors and selection.
- Trend lines: trend line, ray, extended line, horizontal line, horizontal ray, vertical line, cross line, parallel channel, regression trend, flat-top/bottom channel, disjoint angle, price range, date range, date-and-price range.
- Gann and Fibonacci: Gann fan, Gann square, Gann square fixed, Fibonacci retracement, Fibonacci extension, Fibonacci channel, Fibonacci time zone, Fibonacci speed-resistance fan, Fibonacci arcs, Fibonacci circles, Fibonacci spiral, Fibonacci wedges, Fibonacci levels, trend-based Fibonacci extension and time.
- Patterns: XABCD, ABCD, triangle, wedge, head-and-shoulders, cup-and-handle, double top/bottom, triple top/bottom and related pattern tools.
- Forecasting and measurement: long position, short position, forecast, projected volume, measure, ghost feed and risk/reward tools.
- Geometric shapes: rectangle, rotated rectangle, ellipse, circle, triangle, arc, curve, polyline, path and parallel channel.
- Annotation: text, note, callout, price note, comment, signpost, table and labels.
- Icons, arrows, markers, stickers, emojis, brushes, highlighter and image tools.
- Drawing actions: select, multi-select, clone, lock, hide/show, bring forward/back, remove, undo/redo, magnet/snap, object tree, drawing templates and drawing properties.
- Alerts can be attached to supported drawing objects.

The exact tool set changes with the plan and the instrument. The live left rail is the authoritative list.

## 5. Built-in indicators, metrics and strategies

TradingView advertises **400+ built-in indicators and strategies**. Public categories include:

- Moving averages: SMA, EMA, WMA, HMA, VWMA, ALMA, McGinley Dynamic, least-squares MA and related envelopes.
- Oscillators and momentum: RSI, Stoch RSI, Stochastic, MACD, CCI, Williams %R, ROC, Momentum, Awesome Oscillator, Ultimate Oscillator, TRIX, KST, DPO, Aroon, Chande momentum and others.
- Trend: ADX/DMI, Parabolic SAR, Supertrend, Ichimoku, Aroon, Vortex, linear regression, Donchian and Keltner channels.
- Volatility and bands: Bollinger Bands, ATR, standard deviation, Keltner, Donchian, historical volatility and choppiness.
- Volume: volume, OBV, VWAP, VWMA, MFI, Chaikin money flow, force index, ease of movement, volume profile and volume-weighted measures.
- Market structure: pivot points, support/resistance, swing highs/lows, zig-zag and price channels.
- Candlestick and chart patterns: candlestick pattern recognition and automatic chart-pattern detection.
- Cycles and statistics: correlation, beta, linear regression, forecast and statistical bands.
- Bill Williams, Ichimoku, Gann, Fibonacci, session and order-flow tools.
- Fundamental, economic and options-related metrics where data is available.
- Strategy versions of many indicators, with the Strategy Tester.

Indicator limits by plan (official pricing page): Basic **2**, Essential **5**, Plus **10**, Premium **25**, Ultimate **50** indicators per chart.

The authoritative built-in list is TradingView's official folder: <https://www.tradingview.com/support/folders/43000587405-built-in-indicators/>.

## 6. Community scripts and Pine Script

- TradingView advertises **100,000+ public indicators** and **150K+ community-powered indicators** across its public/pricing pages.
- Public scripts can be open-source, protected, invite-only or paid; not every script is free or visible.
- Scripts cover indicators, strategies, alerts, screens, libraries and visual tools.
- Pine Script editor: write, compile, add to chart, debug, create strategies, run the Strategy Tester, create alerts and publish.
- Script publishing controls, house rules, moderation, version history and public/private visibility.
- Community scripts are user-generated and are not endorsed by TradingView; they are not a fixed catalog.

## 7. Symbols, markets and data coverage

Symbol search tabs include **Stocks, Funds, Futures, Forex, Crypto, Indices, Bonds, Economy and Options**. Search supports exchange-qualified symbols such as `NASDAQ:AAPL` and `OANDA:XAUUSD`.

Official public coverage figures include:

- **2,019,615 instruments** cited on the data-coverage page (November 2025).
- **100+** global stock and futures exchanges.
- **50+** brokerage feeds.
- **50+** crypto centralized/decentralized venues.
- **65+** news providers.
- **40,000+** bonds.

The instrument universe is dynamic and cannot be enumerated exhaustively. Real-time versus delayed data, exchange fees, regional restrictions and broker entitlements vary by user and plan.

## 8. Options

- Options tab and options chain.
- Calls and puts, strikes, expirations and implied volatility.
- Options Strategy Finder for strategy discovery.
- Multi-leg Options Strategy Builder with adjustable price, strike, expiration and size.
- Standard strategy handbook and what-if scenarios.
- Payoff/risk visualization and strategy analysis.
- Options data availability depends on the underlying symbol, data package and region.

## 9. Bar Replay

- Select a historical start date.
- Play/pause, step forward, speed control, restart and jump to real-time.
- Drawings and indicators continue to work during replay.
- Known limitations: Regression Trend and Fixed Range Volume Profile do not work in replay; indicators that use `security()` are limited.
- Replay is bar-by-bar playback, not a guarantee of historical execution or fills.

## 10. Alerts and notifications

- Price alerts.
- Indicator and strategy alerts.
- Drawing-based alerts where supported.
- Alert manager/log, active-alert list and alert history.
- In-app notifications, email and mobile push where configured.
- Webhook delivery on supported plans.
- Alert expiration, repeat frequency and condition controls.
- Server-side alerts and alert limits vary by plan.

## 11. Watchlists, layouts and workspaces

- Multiple watchlists and symbol lists.
- Add/remove/reorder symbols; drag symbols into charts.
- Multiple chart layouts and tabs.
- Saved chart layouts and templates.
- Per-symbol drawings, indicators and compare settings.
- Cloud sync for signed-in users.
- Chart settings: theme, grid, watermark, volume, last-price line, crosshair, scales, colors, sessions, timezone and precision.
- Fullscreen, floating panels and pane maximize.
- Snapshot, copy image, share, publish and embed.
- Export chart data where available.

## 12. News, calendars, screeners and community

- News stream with 65+ providers.
- Economic calendar; earnings, dividends and splits.
- Stock, crypto, forex and other screeners.
- Community ideas, scripts, streams, chats and comments.
- Notifications, direct messages and chat rooms.
- Help Center, tutorials and keyboard-shortcut reference.
- Public/private publishing and moderation controls.

## 13. Trading and broker connections

- Trade panel and order ticket.
- Broker connection and account selection.
- Market, limit, stop and stop-limit order types where the broker supports them.
- Chart trading, DOM/order book and position/order/history panels.
- Paper trading where available.
- TradingView routes orders through connected brokers; it is not itself a broker.
- Broker coverage, order types and regional availability vary.

## 14. Plan gates (examples)

| Feature | Minimum plan observed/documented |
|---|---|
| Indicators per chart | Basic 2 · Essential 5 · Plus 10 · Premium 25 · Ultimate 50 |
| Volume Profile | Essential+ |
| TPO / Volume Footprint | Plus+ |
| Automatic chart patterns | Premium+ |
| More server-side alerts / advanced alert features | Higher plans |
| More layouts, watchlists, data and history | Higher plans |

Plan names, prices, limits and entitlements change. Check <https://www.tradingview.com/pricing> for the current contract.

## 15. Hidden / advanced controls to look for

These are easy to miss because they appear on hover, right-click, double-click or after selecting an object:

- Right-click the chart, a drawing, an indicator pane, the price scale or the time scale.
- Double-click a drawing or pane title to edit properties.
- Pane menu: maximize, restore, move, remove, add indicator, add alert.
- Object tree and data window.
- Chart properties, symbol properties, series properties and indicator properties.
- Price-scale settings: linear/log, percentage, indexed-to-100, invert, auto-scale, lock scale.
- Time-scale settings: timezone, session breaks, extended hours, weekends/holidays, bar spacing.
- Go-to-date, reset chart, scroll to real-time and “fit content.”
- Hide/show drawings, indicators, marks, news, alerts, trades, volume and last-price line.
- Lock all drawings, hide all drawings, remove all drawings.
- Drawing templates, indicator templates and chart templates.
- Hotkey list, quick search, command search and keyboard shortcuts.
- Snapshot, copy image, share, publish, embed and export.
- Replay controls, alert log, trade panel, DOM and broker account switcher.
- Theme, language, accessibility and notification settings.

## 16. Important limits

1. **The symbol universe is dynamic.** TradingView cites millions of instruments; there is no stable complete list to copy.
2. **The community-script library is dynamic.** It is user-generated, with open, protected, invite-only and paid scripts.
3. **Built-in indicators are proprietary.** TradingView advertises 400+ built-ins; reproducing all of them is a licensing/product decision, not a simple data import.
4. **Plan, region and data entitlements change.** A feature visible in one account may be absent in another.
5. **TradingView branding in the free embed is required.** The free widget's logo/attribution cannot be removed or rebranded without the appropriate TradingView license. Use TradingView's charting library under a license if full white-labeling is required.
6. **This catalog is not a promise of parity.** It records what is publicly visible/documented; it does not claim that TradingBible has implemented every item.

## Sources

- <https://www.tradingview.com/chart/>
- <https://www.tradingview.com/features/>
- <https://www.tradingview.com/pricing>
- <https://www.tradingview.com/support/folders/43000587405-built-in-indicators/>
- <https://www.tradingview.com/data-coverage/>
- <https://www.tradingview.com/support/solutions/43000764889-symbols-you-can-analyze-and-trade-on-tradingview/>
- <https://www.tradingview.com/support/solutions/43000760837/>
- <https://www.tradingview.com/support/solutions/43000774565-options-strategy-finder-simplify-strategy-discovery>
- <https://www.tradingview.com/support/solutions/43000707214-options-strategy-builder-design-your-trades-with-precision>
- <https://www.tradingview.com/support/solutions/43000712747-bar-replay-how-and-why-to-test-a-strategy-in-the-past>
