# Apple design system notes

This is the shared Apple-inspired design layer for the TradingBible web app. It
covers phone, tablet and desktop; the phone layout itself remains the most
compact expression of the system. Desktop navigation and content structure are
preserved, with Apple typography, spacing, materials and accessibility applied.

## Apple resources used

| Resource | How it is used |
| --- | --- |
| iOS 27 / iPadOS 27 UI kit patterns | 44pt touch targets, 56px phone navigation bar, safe-area-aware tab bars, sheet detents, 8pt spacing rhythm, card-first data |
| macOS 27 UI kit patterns | Persistent operator/trader rail, toolbar chrome, 258px navigation rail, translucent top bars, 1360px content measure |
| SF Pro | `-apple-system` / `SF Pro Text` / `SF Pro Display` system stack across every breakpoint. No Apple font files are redistributed. |
| SF Mono | `ui-monospace` / `SF Mono` for market prices, ticker tape, timestamps, table labels and dense financial data |
| SF Arabic / SF Hebrew | Resolved by the iOS/macOS system fallback when those scripts render |
| App Icon Template | Opaque 180×180 `apple-touch-icon` plus 192/512 manifest icons, generated from the brand mark. No transparency and no rounded corners baked in; the OS applies the mask. |
| Accessibility guidance | `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, visible keyboard focus, 40–44px touch controls, no iOS input zoom |
| iOS 27 type ramp | Large title / title / headline / body / subheadline / footnote / caption tokens in `mobile-v2.css`; SF Pro Display headline tracking in `apple-ui.css` |

The phone layer uses the HIG Subheadline size (15px) as the base for dense
financial data instead of the 17pt body size. Larger type is used for marketing
heroes and page titles.

## Breakpoint behaviour

- **Phone (<640px):** single-column marketing, member wallet/coach cards, admin
  cards, five-tab dock, compact terminal chart, full legal disclosure. Admin
  tables become stacked cards with a 40px checkbox wrapper.
- **Tablet (640–1023px):** 760px centred content measure for member and operator
  pages; the admin rail is replaced by a 560px floating iPad-style tab bar;
  the users table keeps user, role, verification and 40px row actions, with
  plan/join date available in the view/edit sheet. Secondary admin page actions
  stack at 640–767px. Touch-capable shells get HIG-sized controls.
- **Desktop (≥1024px):** the existing trader/operator rails and data density are
  retained, with SF Pro text, SF Mono data, macOS-style translucent chrome and
  16px content rhythm. At 1024–1279px the compact users table stays in use
  because the 258px rail leaves less room; at 1280px the full plan/joined
  columns return.

## Deliberately not used in this web app

These resources target native Apple platforms or require Apple account /
merchant provisioning. They are not faked in the web UI:

- tvOS, watchOS and visionOS UI kits — there is no corresponding native surface
  in this product. The web TV page remains a browser experience.
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

- Public, auth, member and admin views checked at 390×844, 640×1000, 820×1180,
  1024×900 and 1440×900, in dark and light themes.
- No page-level horizontal scroll; only intentional ticker, chart and tab-strip
  scrollers overflow.
- Admin users table becomes stacked cards on phones and a prioritised table on
  tablets; row view/edit actions, checkbox selection, dock navigation and search
  were exercised.
- Public terminal legal disclosure wraps in full; links keep 40px targets.
- Theme and language controls inside the public mobile menu are functional.
- Build, ESLint and the web test suite pass.

Apple, SF Pro, SF Mono, iOS, iPadOS and macOS are trademarks of Apple Inc. This
is a web implementation of Apple design guidance, not a native Apple-platform
app and not an Apple-endorsed product.
