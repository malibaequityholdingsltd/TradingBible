-- Trader/Teacher account model (TradingBible Academy is the school).
-- Migrate legacy account types forward; new signups write trader/teacher.
update public.users set "accountType" = 'trader' where "accountType" = 'individual';
update public.users set "accountType" = 'teacher' where "accountType" = 'company';

-- Job board (public careers portal, admin-managed)
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text default 'Academy',
  employmentType text default 'full-time',
  location text default 'Remote',
  description text default '',
  requirements text default '',
  status text default 'open',
  created timestamptz default now()
);
alter table public.job_postings enable row level security;
drop policy if exists job_postings_public_read on public.job_postings;
create policy job_postings_public_read on public.job_postings for select using (status = 'open');

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  "jobId" uuid references public.job_postings (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  coverLetter text default '',
  resumeUrl text,
  status text default 'new',
  created timestamptz default now()
);
alter table public.job_applications enable row level security;
drop policy if exists job_applications_public_apply on public.job_applications;
create policy job_applications_public_apply on public.job_applications for insert with check (true);
create index if not exists job_applications_job_idx on public.job_applications ("jobId");
create index if not exists job_applications_email_idx on public.job_applications (email);
