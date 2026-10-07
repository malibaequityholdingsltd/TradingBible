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
