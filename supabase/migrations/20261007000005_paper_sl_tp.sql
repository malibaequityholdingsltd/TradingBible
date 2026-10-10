-- Paper trading: stop-loss / take-profit columns.
alter table public.paper_trades add column if not exists stop numeric;
alter table public.paper_trades add column if not exists target numeric;
alter table public.paper_trades add column if not exists close_reason text;
-- Personal TBC receiving address (user's own EOA) on the money rails.
alter table public.wallet_money_rails add column if not exists tbc_address text;
