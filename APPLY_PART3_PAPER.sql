-- TradingBible DB setup — Part 3/4: paper trading + leaderboard + TB Points trigger.
-- Run in Supabase SQL editor. Safe to re-run.
create extension if not exists "pgcrypto";

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
