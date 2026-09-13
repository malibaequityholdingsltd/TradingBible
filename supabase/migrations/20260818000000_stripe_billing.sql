-- Stripe billing columns — additive, does not touch existing Paddle columns or designs
alter table public.users add column if not exists "stripeCustomerId" text;
create unique index if not exists users_stripe_customer_idx on public.users ("stripeCustomerId") where "stripeCustomerId" is not null;
-- subscriptionId / subscriptionStatus / subscriptionPriceId / currentPeriodEnd / cancelScheduled already exist and are reused by Stripe
