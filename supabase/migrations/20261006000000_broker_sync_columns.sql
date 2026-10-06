-- Broker sync columns: align tables with backend/frontend writes.
-- broker_accounts: backend writes accountRef/status/balance/lastSync + broker/tag/accountKind/owner
-- prop_firm_accounts: frontend writes login/server/size/limits/current/syncStatus/lastSync
-- trades: Binance sync writes market/strategy/broker/brokerTradeId/quantity/price/quoteQty/commission/tradeDate
-- Idempotent: safe to run multiple times.

-- ── broker_accounts ──
alter table public.broker_accounts add column if not exists tag text;
alter table public.broker_accounts add column if not exists "accountRef" text;
alter table public.broker_accounts add column if not exists "lastSync" timestamptz;
-- normalize camelCase access: keep quoted "accountKind" (already exists)

-- ── prop_firm_accounts ──
alter table public.prop_firm_accounts add column if not exists "accountLogin" text;
alter table public.prop_firm_accounts add column if not exists server text;
alter table public.prop_firm_accounts add column if not exists "accountSize" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "dailyLossLimit" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "maxDrawdown" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "profitTarget" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "currentDailyLoss" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "currentDrawdown" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "currentProfit" numeric default 0;
alter table public.prop_firm_accounts add column if not exists "syncStatus" text default 'pending';
alter table public.prop_firm_accounts add column if not exists "lastSync" timestamptz;

-- ── trades (broker import) ──
alter table public.trades add column if not exists market text;
alter table public.trades add column if not exists strategy text;
alter table public.trades add column if not exists broker text;
alter table public.trades add column if not exists "brokerTradeId" text;
alter table public.trades add column if not exists quantity numeric default 0;
alter table public.trades add column if not exists price numeric default 0;
alter table public.trades add column if not exists "quoteQty" numeric default 0;
alter table public.trades add column if not exists commission numeric default 0;
alter table public.trades add column if not exists "tradeDate" timestamptz;
create unique index if not exists trades_owner_brokertradeid_uidx
  on public.trades ("owner", "brokerTradeId") where "brokerTradeId" is not null;
