-- Frontend reads/writes these columns; backfill for DBs created before them.
alter table public.watchlists add column if not exists "isDefault" boolean default false;
alter table public.trades add column if not exists "tradeDate" timestamptz;
-- Backfill tradeDate from close/open/created so existing rows sort correctly.
update public.trades set "tradeDate" = coalesce("closedAt", "openedAt", created) where "tradeDate" is null;
