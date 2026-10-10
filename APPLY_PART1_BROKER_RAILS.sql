-- TradingBible DB setup — Part 1/4: broker vault + money rails (bank + ID features).
-- Run in Supabase SQL editor. Safe to re-run.
create extension if not exists "pgcrypto";

-- ═══ from supabase/migrations/20261006000001_broker_credentials.sql ═══
-- TradingBible broker credential vault + connection health.
-- Run once in Supabase SQL editor. Secrets live ONLY in `secret_enc`
-- (AES-256-GCM, server key); clients must never select that column.
create table if not exists public.broker_credentials (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  label text,
  auth_type text not null default 'api_key',
  secret_enc text not null,
  secret_hint text,
  permissions text[] not null default '{}',
  status text not null default 'pending',
  last_sync_at timestamptz,
  last_error text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.broker_credentials enable row level security;
drop policy if exists "own credentials" on public.broker_credentials;
create policy "own credentials" on public.broker_credentials
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists broker_credentials_owner_idx on public.broker_credentials (owner);

-- ═══ from supabase/migrations/20261006000002_wallet_money_rails.sql ═══
-- TradingBible real-money rails: Stripe Connect payout accounts + KYC status.
-- Run once in Supabase SQL editor (or `supabase db push`).
-- One row per user. Connect account IDs and KYC state live here so no
-- existing table needs new columns. Service role bypasses RLS; the owner
-- policy below allows direct client reads of one's own row if ever needed.
create table if not exists public.wallet_money_rails (
  owner uuid primary key references auth.users (id) on delete cascade,
  connect_account_id text,
  connect_status text not null default 'none',
  kyc_status text not null default 'none',
  kyc_session_id text,
  kyc_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wallet_money_rails enable row level security;
drop policy if exists "own money rails" on public.wallet_money_rails;
create policy "own money rails" on public.wallet_money_rails
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
