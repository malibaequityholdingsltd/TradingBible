-- Wallet columns used by apps/web/src/hooks/useWallet.jsx.
-- Without these, every wallet action (deposit/withdraw/buy/sell/send/card)
-- failed with "column does not exist".
alter table public.crypto_accounts
  add column if not exists reserved numeric default 0,
  add column if not exists holdings jsonb default '{}'::jsonb;

alter table public.bank_cards
  add column if not exists status text default 'active',
  add column if not exists network text,
  add column if not exists "cardKind" text,
  add column if not exists form text,
  add column if not exists label text,
  add column if not exists "spendingLimit" numeric,
  add column if not exists "creditLimit" numeric,
  add column if not exists "creditUsed" numeric;

alter table public.bank_transactions
  add column if not exists asset text,
  add column if not exists "fiatValue" numeric,
  add column if not exists counterparty text;