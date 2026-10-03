-- Signal tracking columns (auto-resolved outcomes for trust)
alter table public.trading_signals add column if not exists "signalType" text;
alter table public.trading_signals add column if not exists "timeframe" text;
alter table public.trading_signals add column if not exists strength text;
alter table public.trading_signals add column if not exists indicators jsonb default '[]'::jsonb;
alter table public.trading_signals add column if not exists reason text;
alter table public.trading_signals add column if not exists price numeric;
alter table public.trading_signals add column if not exists outcome text default 'open';
alter table public.trading_signals add column if not exists "resolvedPrice" numeric;
alter table public.trading_signals add column if not exists "resolvedAt" timestamptz;
alter table public.trading_signals add column if not exists "pnlPct" numeric;
