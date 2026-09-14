-- Full wallet ledger — intentionally DDL-free.
-- The ledger reuses the pre-existing public.bank_transactions table
-- (kind, amount, currency, status, reference, counterparty, asset, fiatValue):
--   kind 'deposit'         → Stripe/manual funding (positive amount)
--   kind 'withdraw'        → fiat payout, pending until admin/Stripe settles
--   kind 'withdraw_crypto' → manual crypto payout (counterparty = address)
--   kind 'pay'             → plan/academy purchase (asset = plan intent)
-- Balance = sum of non-failed rows per owner. No new tables required, so
-- deposits, withdrawals and wallet-pay work without running any SQL.
-- (An earlier revision of this file created wallet_balances /
-- wallet_transactions; those tables were never created and are not needed.)

-- Ensure Stripe customer column exists for billing lookups (idempotent).
alter table public.users add column if not exists "stripeCustomerId" text;
create unique index if not exists users_stripe_customer_idx on public.users ("stripeCustomerId") where "stripeCustomerId" is not null;
