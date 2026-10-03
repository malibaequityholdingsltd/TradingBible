-- School grading + relations (additive)
alter table public.school_submissions add column if not exists "studentId" uuid;
alter table public.school_submissions add column if not exists "assessmentId" uuid;
alter table public.school_submissions add column if not exists score numeric;
alter table public.school_submissions add column if not exists feedback text;
create index if not exists school_submissions_student_idx on public.school_submissions ("studentId");
create index if not exists school_submissions_assessment_idx on public.school_submissions ("assessmentId");
