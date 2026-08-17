-- Public read for admin_platform_settings: the SPA needs to fetch platform
-- branding/toggles (name, tagline, trial days, maintenance mode, feature
-- switches) for logged-out visitors too. Data is public config, never secrets.
-- RLS policies are OR'd, so the admin ALL policy still applies on top.
alter table public.admin_platform_settings enable row level security;
drop policy if exists admin_platform_settings_public_read on public.admin_platform_settings;
create policy admin_platform_settings_public_read on public.admin_platform_settings
  for select using (true);
