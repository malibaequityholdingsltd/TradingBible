-- Member identity: first/last name, date of birth, phone. Usernames are
-- retired from the product (kept as columns for backward compatibility).
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
alter table public.users add column if not exists dob date;
alter table public.users add column if not exists phone text;

-- Backfill from existing display data (first word → first name, rest → last).
update public.users
set first_name = coalesce(first_name, split_part(coalesce(nullif(name, ''), nullif(username, ''), split_part(email, '@', 1)), ' ', 1)),
    last_name = coalesce(last_name, nullif(trim(substr(coalesce(nullif(name, ''), nullif(username, ''), split_part(email, '@', 1)), length(split_part(coalesce(nullif(name, ''), nullif(username, ''), split_part(email, '@', 1)), ' ', 1)) + 1)), ''))
where first_name is null;
