# Ads System Implementation - Todo List

## Phase 1: Core Data Structures & Types
- [x] Create ad types/TypeScript interfaces
- [x] Create ad configuration schemas (JSON schemas)
- [x] Create ad placement/enum definitions

## Phase 2: Ad Serving Logic (Core)
- [x] Create ad targeting/matching engine
- [x] Create ad rotation/scheduling logic
- [x] Create frequency capping logic
- [x] Create ad targeting by user segment
- [x] Create A/B testing framework
- [x] Create VAST/VMAP video ad support

## Phase 3: Ad Display Components (React)
- [x] Create base AdComponent wrapper
- [x] Create BannerAd component (leaderboard, skyscraper, rectangle)
- [x] Create VideoAd component (VAST/VMAP + native video)
- [x] Create NativeAd component (in-feed, content-ad)
- [x] Create InterstitialAd component (full-screen)
- [x] Create RewardedAd component (rewarded video)
- [x] Create NativeAdItem component (for feed integration)
- [x] Create AdSlot/AdContainer component (placement wrapper)

## Phase 4: Ad Tracking & Analytics
- [x] Create impression tracking
- [x] Create click tracking
- [x] Create viewability tracking (IntersectionObserver)
- [x] Create conversion tracking
- [x] Create event batching/queue system

## Phase 5: Ad Scheduling & Rotation
- [x] Create ad rotation algorithms (weighted, round-robin, priority)
- [x] Create frequency capping (per user, per session, global)
- [x] Create dayparting/time-based scheduling
- [x] Create pacing/spread algorithms

## Phase 6: Ad Targeting
- [x] User segment targeting (plan, activity, behavior)
- [x] Geo targeting
- [x] Device/browser targeting
- [x] Time-based targeting (dayparting)
- [x] Retargeting/sequential messaging

## Phase 7: Frequency Capping & Pacing
- [x] Per-user frequency caps (impressions/day/hour)
- [x] Global frequency caps
- [x] Even pacing/spread algorithms

## Phase 8: A/B Testing Framework
- [x] Variant assignment (consistent hashing)
- [x] Experiment configuration
- [x] Statistical significance calculation (two-proportion z-test with exposure tracking; binomial count-test fallback)
- [x] Results reporting

## Phase 9: Ad Display Components (React)
- [x] AdSlot component (placement container)
- [x] BannerAd component (responsive)
- [x] VideoAd component (VAST/VMAP + native)
- [x] NativeAd component (in-feed)
- [x] InterstitialAd (full-screen modal)
- [x] RewardedAd (with reward callback)
- [x] AdSkeleton/loading states
- [x] AdErrorBoundary

## Phase 10: CSS/Animations
- [x] Ad entrance/exit animations
- [x] Loading skeletons
- [x] Responsive breakpoints
- [x] Reduced motion support
- [x] Dark/light theme support

## Phase 11: Tracking & Analytics
- [x] Impression pixel firing
- [x] Click tracking with redirect
- [x] Viewability tracking (IntersectionObserver)
- [x] Quartile tracking for video (25%, 50%, 75%, 100%)
- [x] Event batching/queue for performance

## Phase 12: Frequency Capping & Pacing
- [x] Per-user frequency caps (localStorage + server sync)
- [x] Session-level caps
- [x] Global campaign caps
- [x] Even pacing/spread algorithms

## Phase 13: A/B Testing Framework
- [x] Experiment configuration
- [x] Consistent variant assignment (hash-based)
- [x] Statistical significance calculation
- [x] Results aggregation

## Phase 14: VAST/VMAP Video Ad Support
- [x] VAST parser (XML)
- [x] VMAP parser (XML)
- [x] Ad pod support (pre/mid/post-roll)
- [x] Companion ads
- [x] Non-linear/overlay ads

## Phase 15: Mobile Ad Formats
- [x] Responsive ad units
- [x] AMP-compatible ads (zero-JS static creative + toAmpHTML() serializer)
- [x] Web Stories format (9:16 tap-through story viewer with progress + auto-advance)
- [x] Sticky/anchor ads

## Phase 16: PWA/Manifest Updates
- [ ] Update manifest.webmanifest
- [ ] Add service worker for offline ads
- [ ] Add install prompt
- [ ] Background sync for ad logs

## Phase 17: HTML Meta Tags for Social Sharing
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data (JSON-LD)
- [ ] Dynamic meta tags per page

## Phase 18: Integration & Testing
- [x] Demo page for all ad formats
- [ ] Unit tests for core logic
- [x] Integration with existing app (route added at /__ads-demo)
- [ ] Performance benchmarks
