-- Full wallet ledger: internal balances + transactions (custodial simulation)
-- Extends read-only wallet_trackers with a proper ledger for deposits/withdrawals and wallet-pay

-- Wallet balances per user/currency (USD base + crypto)
create table if not exists public.wallet_balances (
  owner uuid references auth.users (id) on delete cascade,
  currency text not null,
  balance numeric not null default 0,
  updated timestamptz default now(),
  primary key (owner, currency)
);
alter table public.wallet_balances enable row level security;
drop policy if exists wallet_balances_owner on public.wallet_balances;
create policy wallet_balances_owner on public.wallet_balances
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Wallet transactions ledger
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  type text not null, -- deposit, withdraw, pay, refund, adjustment
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'completed', -- pending, completed, failed
  reference text, -- stripe session id / tx hash
  meta jsonb default '{}'::jsonb,
  created timestamptz default now()
);
alter table public.wallet_transactions enable row level security;
drop policy if exists wallet_transactions_owner on public.wallet_transactions;
create policy wallet_transactions_owner on public.wallet_transactions
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists wallet_transactions_owner_idx on public.wallet_transactions (owner, created desc);

-- Ensure stripeCustomerId still added if missing (idempotent)
alter table public.users add column if not exists "stripeCustomerId" text;
create unique index if not exists users_stripe_customer_idx on public.users ("stripeCustomerId") where "stripeCustomerId" is not null;
