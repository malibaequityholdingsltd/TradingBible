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
