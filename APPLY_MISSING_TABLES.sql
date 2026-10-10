-- TradingBible — ONE-PASTE database setup (Supabase SQL editor).
-- Run this ONCE. It creates every table the app needs that is missing
-- (broker vault, money rails, challenges, marketplace, mentors, paper
-- trading, leaderboard, terminal workspaces). Safe to re-run: every
-- statement uses IF NOT EXISTS guards.

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
create table if not exists public.paper_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Paper',
  balance numeric not null default 100000,
  contest text,
  created_at timestamptz not null default now()
);
alter table public.paper_accounts enable row level security;
drop policy if exists "own paper accounts" on public.paper_accounts;
create policy "own paper accounts" on public.paper_accounts
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists paper_accounts_owner_idx on public.paper_accounts (owner);

create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.paper_accounts (id) on delete cascade,
  symbol text not null,
  side text not null,
  qty numeric not null,
  entry numeric not null,
  exit numeric,
  pnl numeric,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.paper_trades enable row level security;
drop policy if exists "own paper trades" on public.paper_trades;
create policy "own paper trades" on public.paper_trades
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists paper_trades_account_idx on public.paper_trades (account_id);

-- ── Leaderboard opt-ins ────────────────────────────────────────
create table if not exists public.leaderboard_optins (
  owner uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.leaderboard_optins enable row level security;
drop policy if exists "own optin" on public.leaderboard_optins;
create policy "own optin" on public.leaderboard_optins
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── TB Points: +1 per logged trade, max 5/day ───────────────────
create or replace function public.award_trade_point()
returns trigger
language plpgsql
security definer
as $$
declare
  today_count integer;
begin
  select count(*) into today_count
  from public.bank_transactions
  where owner = NEW.owner
    and kind = 'reward'
    and asset = 'TBP'
    and created >= date_trunc('day', now());
  if today_count < 5 then
    insert into public.bank_transactions (owner, kind, amount, currency, status, reference, counterparty, asset, fiatValue)
    values (NEW.owner, 'reward', 1, 'USD', 'completed', 'trade:' || coalesce(NEW.id::text, ''), 'journal', 'TBP', 0);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_trade_point on public.trades;
create trigger trg_award_trade_point
  after insert on public.trades
  for each row execute function public.award_trade_point();

-- ═══ from supabase/migrations/20261007000004_terminal_premium.sql ═══
-- TradingBible Terminal Premium: cloud workspaces + trade snapshots.
-- Workspaces store SAVED WORK ONLY (drawings, indicators, layouts, watchlists,
-- timeframes, chart position, orderflow/heatmap config). Live account remains
-- authority for orders/positions/fills — never stored here.
-- Snapshots are chart-state records attached to journal entries, not fills.

create table if not exists public.terminal_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My Desk',
  layout jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.terminal_workspaces enable row level security;
drop policy if exists "own workspaces" on public.terminal_workspaces;
create policy "own workspaces" on public.terminal_workspaces
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists terminal_workspaces_owner_idx on public.terminal_workspaces (owner);

create table if not exists public.terminal_versions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.terminal_workspaces (id) on delete cascade,
  name text not null default '',
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.terminal_versions enable row level security;
drop policy if exists "own versions" on public.terminal_versions;
create policy "own versions" on public.terminal_versions
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists terminal_versions_owner_idx on public.terminal_versions (owner);

create table if not exists public.trade_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  symbol text not null default '',
  timeframe text not null default '1h',
  state jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.trade_snapshots enable row level security;
drop policy if exists "own snapshots" on public.trade_snapshots;
create policy "own snapshots" on public.trade_snapshots
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
create index if not exists trade_snapshots_owner_idx on public.trade_snapshots (owner);

-- ═══ paper_trades: stop / target / close_reason (new) ═══
alter table public.paper_trades add column if not exists stop numeric;
alter table public.paper_trades add column if not exists target numeric;
alter table public.paper_trades add column if not exists close_reason text;
