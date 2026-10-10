-- TradingBible: native tbc1… address column for TBC claims/staking.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- The API returns `setup_required` on the address form until this is applied.

alter table public.wallet_money_rails
  add column if not exists tbc_native_address text;
