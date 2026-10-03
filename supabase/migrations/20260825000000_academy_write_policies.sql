-- Academy tables: owner write policies (reads are select-only today;
-- writes go through the service-role API, these allow future direct use)
drop policy if exists academy_enrollments_write on public.academy_enrollments;
create policy academy_enrollments_write on public.academy_enrollments
  for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists academy_curricula_write on public.academy_curricula;
create policy academy_curricula_write on public.academy_curricula
  for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists academy_lessons_write on public.academy_lessons;
create policy academy_lessons_write on public.academy_lessons
  for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists academy_progress_write on public.academy_progress;
create policy academy_progress_write on public.academy_progress
  for all using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists academy_webinar_rsvps_write on public.academy_webinar_rsvps;
create policy academy_webinar_rsvps_write on public.academy_webinar_rsvps
  for all using (owner = auth.uid()) with check (owner = auth.uid());
