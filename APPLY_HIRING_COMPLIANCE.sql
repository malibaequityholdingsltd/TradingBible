-- TradingBible one-click setup: hiring compliance gate (Oct 2026).
-- Paste and run once in Supabase → SQL editor, then reload /admin/jobs.
-- Stores the lawful-hiring confirmation per application. Safe to re-run.
alter table public.job_applications
  add column if not exists compliance jsonb default '{}'::jsonb;
