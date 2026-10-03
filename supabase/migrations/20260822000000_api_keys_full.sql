-- Full lifecycle columns for admin API keys (server-side issuance)
alter table public.admin_api_keys add column if not exists "permissions" text[] default '{}';
alter table public.admin_api_keys add column if not exists "assignedTo" text;
alter table public.admin_api_keys add column if not exists "expiresAt" timestamptz;
alter table public.admin_api_keys add column if not exists "usageCount" integer default 0;
