-- Retire two legacy closed job postings that used the non-filed name
-- "TradingBible LLC" and unrecorded Founder/Chief Executive/Vice President
-- titles. They are not public openings; this update keeps the historical
-- record factual without presenting those titles as appointments.
--
-- Also normalizes any remaining open-role copy that referred to an
-- unrecorded founder title or the old LLC name. Safe to re-run.

update public.job_postings
set
  title = 'President',
  description = 'Closed legacy posting. The incorporator’s initial resolutions record Malik Nlem as President, Treasurer and Director of TradingBible Holdings. Inc. No employment agreement or compensation arrangement is recorded.',
  requirements = 'Statutory officer record; no employment agreement or compensation recorded.'
where id = '6e66936c-f7a8-41e2-ba0d-42b4e085f17d';

update public.job_postings
set
  title = 'Operations leadership',
  description = 'Closed legacy posting for a planned operations leadership role. No appointment is recorded. Any future employment would be with TradingBible Holdings. Inc. under a written agreement; no compensation is recorded.',
  requirements = 'Closed legacy posting; no appointment or compensation recorded.'
where id = 'cdce77d1-dcd8-4194-ae55-aeab806163b7';

-- Normalize any remaining founder reference in open-role copy.
update public.job_postings
set description = replace(
  replace(description, 'Drive the founder operating system', 'Drive the President’s operating system'),
  'the founder',
  'the President'
)
where description ilike '%founder%';

-- Remove the non-filed LLC name wherever it remains in a posting.
update public.job_postings
set description = replace(
  replace(description, 'TradingBible Holdings LLC', 'TradingBible Holdings. Inc.'),
  'TradingBible LLC',
  'TradingBible Holdings. Inc.'
)
where description ilike '%TradingBible LLC%'
   or description ilike '%TradingBible Holdings LLC%';
