# Database Schema

Supabase project: `yxuzrishocchfbofqazt` (region us-west-2). Schema + RLS policies are defined in `supabase/migrations/` (the canonical source — apply pending migrations with `supabase db push` or the dashboard SQL editor).

All tables sit in the `public` schema. RLS is enabled; the browser only ever sees rows its policies permit (the API uses the service-role key and bypasses RLS).

## Users & Profiles

| Table | Purpose |
|---|---|
| `users` | App users: identity, plan (`trial/pro/elite/professional`), role (`user/admin/company`), preferences, Paddle customer id |
| `profiles` | Legacy/alternate profile store (only used as fallback) |

## Billing

| Table | Purpose |
|---|---|
| `billing_events` | Paddle webhook event log (idempotency) |
| `bank_cards` `bank_transactions` | Saved cards and transactions |
| `price_alerts` `alert_history` | Alert definitions + delivery log |

## Trading Data

| Table | Purpose |
|---|---|
| `broker_accounts` `prop_firm_accounts` `crypto_accounts` | Connected accounts (sync with live P&L) |
| `trades` | Trade journaling records |
| `wallet_trackers` | Self-custody wallet tracking — registered public addresses (`owner`, `network`, `address`, `label`); balances are read live from the blockchain, TradingBible never holds funds |
| `watchlists` | User symbol lists |
| `chart_drawings` `terminal_layouts` | Persisted UI state |
| `trading_signals` | Generated indicator signals |

## Community & Content

| Table | Purpose |
|---|---|
| `forum_threads` | Forum posts (`title`, `body`, `category`, `authorName`, `authorAvatar`, `replyCount`, `pinned`, `locked`) |
| `forum_replies` | Replies linked to threads (`thread` FK, cascade delete) |
| `academy_waitlist` | Academy signups (email join list) |

## Platform / Admin

| Table | Purpose |
|---|---|
| `admin_integrations` | Flexible key/value store — TV ads (`key = "ad:<slug>"`), plugins, integrations |
| `admin_platform_settings` | Global platform settings |
| `admin_plugins` | Plugin registry |
| `admin_api_keys` | Public API key grants |
| `user_api_keys` | Per-user API keys |
| `branding_settings` | Branding + TV settings (`key = "tv_ads"` for TV rotation config) |
| `notifications` | In-app notifications |

## Affiliates

| Table | Purpose |
|---|---|
| `affiliate_codes` | Per-owner referral codes |
| `affiliate_signups` | Referred signups with status (`signed_up/active/pending_payout`) |

## Education (company/school plans)

| Table | Purpose |
|---|---|
| `school_classrooms` `school_students` `school_teachers` | School management |
| `school_assessments` `school_submissions` `school_certificates` | Grading + certification |

## Integrated AI

| Table | Purpose |
|---|---|
| `_integratedAiMessages` | Chat history |
| `_integratedAiImages` | Generated image persistence |

## Conventions

- Timestamps: `created`/`updated` (`timestamptz`), default `now()`.
- RLS: `select` typically `using (true)` for shared content; `insert`/`update` scoped to `auth.uid()` owner.
- The API never reads `auth.users` directly for app data — user records live in `users` (row synced from auth on first login).

## Backups

- Supabase free tier: daily backups (walg-enabled, no PITR). None exist on record yet — trigger a manual `pg_dump`/`supabase db dump` for restorable snapshots.
- Community forum + ads also have idempotent seed scripts: `apps/api/scripts/seed-forum.js`, `apps/api/scripts/seed-demo-ads.js` (run with `node --env-file=.env scripts/<file>.js`).