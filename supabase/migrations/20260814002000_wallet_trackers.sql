-- Real-wallet balance tracking: users register their own addresses and the
-- app reads public balances. TradingBible never holds funds, so there are no
-- deposit/withdrawal/card capabilities — this table is read-only tracking.
create table if not exists public.wallet_trackers (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  label text,
  network text not null,
  address text not null,
  created timestamptz default now()
);
alter table public.wallet_trackers enable row level security;
drop policy if exists wallet_trackers_owner on public.wallet_trackers;
create policy wallet_trackers_owner on public.wallet_trackers
  for all using (auth.uid() = owner) with check (auth.uid() = owner);
