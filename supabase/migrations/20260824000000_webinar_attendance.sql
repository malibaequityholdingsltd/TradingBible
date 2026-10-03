-- Webinar attendance tracking (additive)
alter table public.academy_webinar_rsvps add column if not exists "attendedAt" timestamptz;
