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
