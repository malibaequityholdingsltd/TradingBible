-- Challenge attempts: account-type selection (standard / swing).
alter table public.challenge_attempts add column if not exists account_type text not null default 'standard';
