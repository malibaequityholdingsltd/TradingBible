-- Hiring compliance gate (global workforce policy, Oct 2026).
-- Stores the lawful-hiring confirmation per application: work country +
-- region, arrangement (direct/eor/contractor/subsidiary/peo), agreement,
-- IP, payroll readiness, manager approval. Nullable + defaulted so existing
-- rows and the public apply flow are unaffected. The API enforces the gate
-- from the request body even before this is applied.
alter table public.job_applications
  add column if not exists compliance jsonb default '{}'::jsonb;
