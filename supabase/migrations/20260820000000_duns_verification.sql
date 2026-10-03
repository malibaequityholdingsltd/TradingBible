-- DUNS verification columns — additive, company KYB readiness (Dun & Bradstreet).
-- dunsStatus: 'unverified' | 'pending' | 'verified' | 'failed'
alter table public.users add column if not exists "dunsNumber" text;
alter table public.users add column if not exists "dunsStatus" text default 'unverified';
alter table public.users add column if not exists "dunsVerifiedAt" timestamptz;
alter table public.users add column if not exists "dunsProfile" jsonb;
create index if not exists users_duns_number_idx on public.users ("dunsNumber") where "dunsNumber" is not null;
