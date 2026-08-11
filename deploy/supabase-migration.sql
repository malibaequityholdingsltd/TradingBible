-- TradingBible: provision missing schema for the Supabase-backed app.
-- Idempotent: safe to run more than once. Run in Dashboard > SQL Editor,
-- or hand this file to the deployment tool together with a Personal Access
-- Token (sbp_...) so it can be executed via the Management API.

-- ── users: columns written by Paddle webhooks / app code ──────────
alter table public.users add column if not exists "subscriptionId" text;
alter table public.users add column if not exists "subscriptionStatus" text;
alter table public.users add column if not exists "subscriptionPriceId" text;
alter table public.users add column if not exists "currentPeriodEnd" timestamptz;
alter table public.users add column if not exists "cancelScheduled" boolean default false;
alter table public.users add column if not exists "paddleCustomerId" text;
alter table public.users add column if not exists "plan" text;
create unique index if not exists users_paddle_customer_idx on public.users ("paddleCustomerId") where "paddleCustomerId" is not null;

-- ── billing_events (Billing activity history; written by Paddle webhooks) ──
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  "eventType" text,
  "subscriptionId" text,
  "transactionId" text,
  status text,
  "planName" text,
  amount numeric default 0,
  currency text,
  "invoiceUrl" text,
  "occurredAt" timestamptz,
  created timestamptz default now()
);
alter table public.billing_events enable row level security;
drop policy if exists billing_events_owner on public.billing_events;
create policy billing_events_owner on public.billing_events
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists billing_events_owner_idx on public.billing_events (owner);

-- ── affiliates ─────────────────────────────────────────────────────
create table if not exists public.affiliate_codes (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  code text not null,
  clicks integer default 0,
  signups integer default 0,
  "commissionRate" numeric default 0,
  status text default 'active',
  created timestamptz default now()
);
create unique index if not exists affiliate_codes_code_idx on public.affiliate_codes (code);
alter table public.affiliate_codes enable row level security;
drop policy if exists affiliate_codes_owner on public.affiliate_codes;
create policy affiliate_codes_owner on public.affiliate_codes
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.affiliate_signups (
  id uuid primary key default gen_random_uuid(),
  "codeId" uuid,
  code text,
  email text,
  status text default 'signed_up',
  commission numeric default 0,
  created timestamptz default now()
);
create index if not exists affiliate_signups_code_idx on public.affiliate_signups (code);
create index if not exists affiliate_signups_email_idx on public.affiliate_signups (email);

-- ── notifications (login + account activity, in-app) ───────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  kind text,
  title text,
  message text,
  link text,
  seen boolean default false,
  created timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists notifications_owner_idx on public.notifications (owner, created desc);

-- ── AI chat history / images ───────────────────────────────────────
create table if not exists public._integratedAiMessages (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  "userId" text,
  role text,
  content jsonb,
  created timestamptz default now()
);
alter table public._integratedAiMessages enable row level security;
drop policy if exists ai_messages_owner on public._integratedAiMessages;
create policy ai_messages_owner on public._integratedAiMessages
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists ai_messages_owner_idx on public._integratedAiMessages (owner, created);

create table if not exists public._integratedAiImages (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  file text,
  created timestamptz default now()
);
alter table public._integratedAiImages enable row level security;
drop policy if exists ai_images_owner on public._integratedAiImages;
create policy ai_images_owner on public._integratedAiImages
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── broker / prop / crypto accounts ────────────────────────────────
create table if not exists public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  broker text,
  "accountId" text,
  "accountKind" text default 'live',
  status text default 'linked',
  balance numeric default 0,
  equity numeric default 0,
  currency text default 'USD',
  meta jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.broker_accounts enable row level security;
drop policy if exists broker_accounts_owner on public.broker_accounts;
create policy broker_accounts_owner on public.broker_accounts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists broker_accounts_owner_idx on public.broker_accounts (owner);

create table if not exists public.prop_firm_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  firm text,
  "accountId" text,
  "accountKind" text default 'prop',
  status text default 'active',
  balance numeric default 0,
  equity numeric default 0,
  challenge text,
  meta jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.prop_firm_accounts enable row level security;
drop policy if exists prop_firm_accounts_owner on public.prop_firm_accounts;
create policy prop_firm_accounts_owner on public.prop_firm_accounts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists prop_firm_accounts_owner_idx on public.prop_firm_accounts (owner);

create table if not exists public.crypto_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  exchange text,
  address text,
  balance numeric default 0,
  currency text default 'USDT',
  meta jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.crypto_accounts enable row level security;
drop policy if exists crypto_accounts_owner on public.crypto_accounts;
create policy crypto_accounts_owner on public.crypto_accounts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── alerts ─────────────────────────────────────────────────────────
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  symbol text,
  direction text,
  price numeric,
  note text,
  active boolean default true,
  triggered boolean default false,
  created timestamptz default now()
);
alter table public.price_alerts enable row level security;
drop policy if exists price_alerts_owner on public.price_alerts;
create policy price_alerts_owner on public.price_alerts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists price_alerts_owner_idx on public.price_alerts (owner);

create table if not exists public.alert_history (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  symbol text,
  direction text,
  price numeric,
  message text,
  created timestamptz default now()
);
alter table public.alert_history enable row level security;
drop policy if exists alert_history_owner on public.alert_history;
create policy alert_history_owner on public.alert_history
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── trading data ───────────────────────────────────────────────────
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  symbol text,
  side text,
  "qty" numeric default 0,
  entry numeric,
  "exit" numeric,
  pnl numeric default 0,
  fees numeric default 0,
  status text default 'closed',
  "openedAt" timestamptz,
  "closedAt" timestamptz,
  notes text,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.trades enable row level security;
drop policy if exists trades_owner on public.trades;
create policy trades_owner on public.trades
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists trades_owner_idx on public.trades (owner, created desc);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  name text,
  symbols jsonb default '[]'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.watchlists enable row level security;
drop policy if exists watchlists_owner on public.watchlists;
create policy watchlists_owner on public.watchlists
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.chart_drawings (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  symbol text,
  data jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.chart_drawings enable row level security;
drop policy if exists chart_drawings_owner on public.chart_drawings;
create policy chart_drawings_owner on public.chart_drawings
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.terminal_layouts (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  name text,
  symbol text,
  layout jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.terminal_layouts enable row level security;
drop policy if exists terminal_layouts_owner on public.terminal_layouts;
create policy terminal_layouts_owner on public.terminal_layouts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.trading_signals (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  symbol text,
  side text,
  entry numeric,
  target numeric,
  stop numeric,
  status text default 'new',
  source text,
  meta jsonb default '{}'::jsonb,
  created timestamptz default now()
);
alter table public.trading_signals enable row level security;
drop policy if exists trading_signals_owner on public.trading_signals;
create policy trading_signals_owner on public.trading_signals
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── wallet (bank) ──────────────────────────────────────────────────
create table if not exists public.bank_cards (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  brand text,
  last4 text,
  holder text,
  expiry text,
  meta jsonb default '{}'::jsonb,
  created timestamptz default now()
);
alter table public.bank_cards enable row level security;
drop policy if exists bank_cards_owner on public.bank_cards;
create policy bank_cards_owner on public.bank_cards
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  kind text,
  amount numeric default 0,
  currency text default 'USD',
  status text default 'pending',
  reference text,
  created timestamptz default now()
);
alter table public.bank_transactions enable row level security;
drop policy if exists bank_transactions_owner on public.bank_transactions;
create policy bank_transactions_owner on public.bank_transactions
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── community forum ────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  title text,
  body text,
  pinned boolean default false,
  locked boolean default false,
  "viewCount" integer default 0,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.forum_threads enable row level security;
drop policy if exists forum_threads_select on public.forum_threads;
drop policy if exists forum_threads_insert on public.forum_threads;
create policy forum_threads_select on public.forum_threads
  for select using (true);
create policy forum_threads_insert on public.forum_threads
  for insert with check (auth.uid() = owner);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  thread uuid references public.forum_threads (id) on delete cascade,
  body text,
  created timestamptz default now()
);
alter table public.forum_replies enable row level security;
drop policy if exists forum_replies_select on public.forum_replies;
drop policy if exists forum_replies_insert on public.forum_replies;
create policy forum_replies_select on public.forum_replies
  for select using (true);
create policy forum_replies_insert on public.forum_replies
  for insert with check (auth.uid() = owner);

-- ── profiles (auth fallback mirror of users) ───────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  name text,
  user_role text,
  account_type text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

-- ── platform admin / branding ──────────────────────────────────────
create table if not exists public.branding_settings (
  key text primary key,
  value jsonb,
  updated timestamptz default now()
);
alter table public.branding_settings enable row level security;
drop policy if exists branding_settings_read on public.branding_settings;
create policy branding_settings_read on public.branding_settings for select using (true);

create table if not exists public.admin_integrations (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  provider text,
  config jsonb default '{}'::jsonb,
  enabled boolean default true,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.admin_integrations enable row level security;

create table if not exists public.admin_plugins (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  name text,
  version text,
  enabled boolean default true,
  config jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated timestamptz default now()
);
alter table public.admin_plugins enable row level security;

create table if not exists public.admin_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  name text,
  keyhash text,
  enabled boolean default true,
  created timestamptz default now()
);
alter table public.admin_api_keys enable row level security;

-- ── academy waitlist ───────────────────────────────────────────────
create table if not exists public.academy_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  status text default 'pending',
  created timestamptz default now()
);
alter table public.academy_waitlist enable row level security;
drop policy if exists academy_waitlist_insert on public.academy_waitlist;
create policy academy_waitlist_insert on public.academy_waitlist
  for insert to anon, authenticated with check (true);

-- ── RPC: sign up an auth user from the waitlist (used by admin) ────
create or replace function public.enroll_waitlist(p_email text)
returns void language plpgsql security definer as $$
begin
  update public.academy_waitlist set status = 'enrolled' where email = lower(p_email);
end $$;

-- ── users RLS repair: drop any recursive/broken policies, install sane one ──
do $$ declare p record; begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='users' loop
    execute format('drop policy %I on public.users', p.policyname);
  end loop;
end $$;
alter table public.users enable row level security;
drop policy if exists users_rls_default on public.users;
create policy users_rls_default on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ── normalize base privileges (imported tables often lack grants) ────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;

-- ── harden SECURITY DEFINER RPCs: no anonymous execution ───────────
revoke execute on function public.save_user_settings(jsonb) from anon;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.enroll_waitlist(text) from anon;
grant execute on function public.save_user_settings(jsonb) to authenticated;
grant execute on function public.rls_auto_enable() to authenticated;