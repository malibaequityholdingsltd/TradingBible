-- TradingBible Academy: access grant + AI-generated curriculum/lessons/progress/certificates/webinars

-- ── users: academy access (one-time purchase, not a subscription) ───
alter table public.users add column if not exists "academyAccess" boolean not null default false;
alter table public.users add column if not exists "academyPurchasedAt" timestamptz;

-- ── academy purchases (one-time $149.00 / $150.00 transactions) ─────
create table if not exists public.academy_purchases (
  id bigint generated always as identity primary key,
  owner uuid not null,
  "transactionId" text,
  amount numeric,
  currency text,
  status text,
  "createdAt" timestamptz not null default now()
);
alter table public.academy_purchases enable row level security;
drop policy if exists academy_purchases_owner on public.academy_purchases;
create policy academy_purchases_owner on public.academy_purchases
  for select using (owner = auth.uid());

-- ── enrollments + certificates ─────────────────────────────────────
create table if not exists public.academy_enrollments (
  owner uuid not null,
  "pathKey" text not null,
  "enrolledAt" timestamptz not null default now(),
  "certificateCode" text,
  "certificateText" text,
  "certificateGeneratedAt" timestamptz,
  primary key (owner, "pathKey")
);
alter table public.academy_enrollments enable row level security;
drop policy if exists academy_enrollments_owner on public.academy_enrollments;
create policy academy_enrollments_owner on public.academy_enrollments
  for select using (owner = auth.uid());

-- ── AI-generated curricula (cached per user + path) ────────────────
create table if not exists public.academy_curricula (
  owner uuid not null,
  "pathKey" text not null,
  curriculum jsonb not null,
  "updatedAt" timestamptz not null default now(),
  primary key (owner, "pathKey")
);
alter table public.academy_curricula enable row level security;
drop policy if exists academy_curricula_owner on public.academy_curricula;
create policy academy_curricula_owner on public.academy_curricula
  for select using (owner = auth.uid());

-- ── AI-generated lesson content (cached per user + lesson) ─────────
create table if not exists public.academy_lessons (
  owner uuid not null,
  "pathKey" text not null,
  "courseKey" text not null,
  "lessonKey" text not null,
  content jsonb not null,
  "updatedAt" timestamptz not null default now(),
  primary key (owner, "pathKey", "courseKey", "lessonKey")
);
alter table public.academy_lessons enable row level security;
drop policy if exists academy_lessons_owner on public.academy_lessons;
create policy academy_lessons_owner on public.academy_lessons
  for select using (owner = auth.uid());

-- ── progress: completion + AI-graded quiz scores ───────────────────
create table if not exists public.academy_progress (
  owner uuid not null,
  "pathKey" text not null,
  "courseKey" text not null,
  "lessonKey" text not null,
  completed boolean not null default false,
  "quizScore" numeric,
  "quizTotal" integer,
  "quizFeedback" text,
  "completedAt" timestamptz,
  primary key (owner, "pathKey", "courseKey", "lessonKey")
);
alter table public.academy_progress enable row level security;
drop policy if exists academy_progress_owner on public.academy_progress;
create policy academy_progress_owner on public.academy_progress
  for select using (owner = auth.uid());

-- ── webinar RSVPs ──────────────────────────────────────────────────
create table if not exists public.academy_webinar_rsvps (
  owner uuid not null,
  "webinarId" text not null,
  "rsvpAt" timestamptz not null default now(),
  primary key (owner, "webinarId")
);
alter table public.academy_webinar_rsvps enable row level security;
drop policy if exists academy_webinar_rsvps_owner on public.academy_webinar_rsvps;
create policy academy_webinar_rsvps_owner on public.academy_webinar_rsvps
  for select using (owner = auth.uid());

-- indexes for ownership lookups
create index if not exists academy_purchases_owner_idx on public.academy_purchases (owner);
create index if not exists academy_progress_owner_idx on public.academy_progress (owner);
