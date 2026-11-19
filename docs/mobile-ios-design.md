# Mobile iOS design notes

This is the phone-only design layer for the TradingBible web app. It is scoped
to `max-width: 639px`; desktop and tablet layouts are unchanged.

## Apple resources used

| Resource | How it is used |
| --- | --- |
| iOS 27 / iPadOS 27 UI kit patterns | 44pt touch targets, 56px phone navigation bar, safe-area-aware tab bar, sheet detents, 8pt spacing rhythm, card-first data |
| SF Pro | `-apple-system` / `SF Pro Text` / `SF Pro Display` system stack on phones. No Apple font files are redistributed. |
| SF Mono | `ui-monospace` / `SF Mono` for market prices, ticker tape, timestamps and dense table labels |
| SF Arabic / SF Hebrew | Resolved by the iOS system fallback when those locales render |
| App Icon Template | A real 180×180 PNG `apple-touch-icon` is linked for Add to Home Screen |
| Accessibility guidance | `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, visible keyboard focus, no iOS input zoom |
| iOS 27 type ramp | Large title / title / headline / body / subheadline / footnote / caption tokens in `mobile-v2.css` |

The phone layer uses the HIG Subheadline size (15px) as the base for dense
financial data instead of the 17pt body size. Larger type is used for marketing
heroes and page titles.

## Deliberately not used in this web app

These resources target native Apple platforms or require Apple account /
merchant provisioning. They are not faked in the web UI:

- macOS, tvOS, watchOS and visionOS UI kits — no corresponding product surface.
- SF Compact — watchOS-optimised.
- New York — an editorial serif that conflicts with the TradingBible wordmark.
- SF Symbols binary assets — Apple licenses the symbol library for Apple-platform
  app development; the product uses its own `IosIcon` line-icon language instead.
- Icon Composer and Parallax image tools — native app packaging / tvOS-visionOS
  motion assets.
- Product bezels — marketing artwork, not part of the running product.
- Sign in with Apple, Apple Pay and Wallet passes — these need an Apple Developer
  Service ID, merchant ID, domain verification and signing credentials before a
  button can be functional. They are not enabled without those credentials.

## Verification

- Public, auth, member and admin views checked at 375×667, 390×844 and 430×932.
- No page-level horizontal scroll; only intentional ticker, chart and tab-strip
  scrollers overflow.
- Admin users table becomes stacked cards; selection uses a 40px tap wrapper.
- Public terminal legal disclosure wraps in full; links keep 40px targets.
- Theme and language controls inside the public mobile menu are functional.
- Build, ESLint and the web test suite pass.
