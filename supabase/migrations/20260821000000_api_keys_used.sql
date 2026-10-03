-- Usage tracking for admin API keys (server-side verification)
alter table public.admin_api_keys add column if not exists "lastUsedAt" timestamptz;
