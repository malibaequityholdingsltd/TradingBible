-- TradingBible DB setup — Part 2/4: challenges + marketplace + mentors.
-- Run in Supabase SQL editor. Safe to re-run.
create extension if not exists "pgcrypto";

-- ═══ from supabase/migrations/20261006000003_ecosystem.sql ═══
-- TradingBible ecosystem expansion: challenges, marketplace, mentorship,
-- paper trading, leaderboard. Run once in Supabase SQL editor.
-- TB Points (journal-to-earn) are awarded by trigger into bank_transactions
-- (kind='reward', asset='TBP'); convertible to TBC at listing (rate TBD).

-- ── Funded challenges ────────────────────────────────────────────
create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  product_key text not null,
  product_name text not null default '',
  fee_paid numeric not null default 0,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  decided_at timestamptz,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.challenge_attempts enable row level security;
drop policy if exists "own attempts" on public.challenge_attempts;
create policy "own attempts" on public.challenge_attempts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists challenge_attempts_owner_idx on public.challenge_attempts (owner);

-- ── Signal marketplace subscriptions ───────────────────────────
create table if not exists public.signal_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  creator uuid not null references auth.users (id) on delete cascade,
  price numeric not null default 0,
  platform_fee numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(owner, creator)
);
alter table public.signal_subscriptions enable row level security;
drop policy if exists "own subscriptions" on public.signal_subscriptions;
create policy "own subscriptions" on public.signal_subscriptions
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists signal_subscriptions_creator_idx on public.signal_subscriptions (creator);

-- ── Mentorship ─────────────────────────────────────────────────
create table if not exists public.mentors (
  owner uuid primary key references auth.users (id) on delete cascade,
  headline text not null default '',
  topics text[] not null default '{}',
  price_usd numeric not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.mentors enable row level security;
drop policy if exists "own mentor profile" on public.mentors;
create policy "own mentor profile" on public.mentors
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  mentor uuid not null references auth.users (id) on delete cascade,
  scheduled_for timestamptz,
  topic text not null default '',
  price_usd numeric not null default 0,
  platform_fee numeric not null default 0,
  status text not null default 'booked',
  created_at timestamptz not null default now()
);
alter table public.mentor_sessions enable row level security;
drop policy if exists "own sessions" on public.mentor_sessions;
create policy "own sessions" on public.mentor_sessions
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists mentor_sessions_mentor_idx on public.mentor_sessions (mentor);

-- ── Paper trading (+ competitions) ─────────────────────────────
