-- ─────────────────────────────────────────────────────────────────────────
-- TBC durable controls migration
--
-- Apply this file in the Supabase SQL editor BEFORE switching the API from
-- the local JSON execution register to database-backed execution evidence.
--
-- Scope:
--   • execution records + append-only, hash-chained events
--   • allocations, vesting schedules, sale orders, governance records
--   • an append-only platform audit stream
--
-- No public RLS policy is created. Only the API service role may read or
-- write these tables. The token gates remain environment-controlled and are
-- NOT enabled by any row in this schema.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Execution register: one current-state row per document slug.
create table if not exists public.tbc_execution_records (
  slug text primary key,
  document_number text not null,
  visibility text not null check (visibility in ('public', 'internal')),
  envelope_id text,
  provider text not null default 'docusign',
  provider_status text,
  approval_status text not null default 'not_requested',
  approval_note text,
  approval_by text,
  approval_at timestamptz,
  completed_at timestamptz,
  last_synced_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tbc_execution_records_envelope_idx
  on public.tbc_execution_records (envelope_id)
  where envelope_id is not null;

-- Append-only evidence. The API computes prev_hash and hash over the
-- canonical event payload; triggers prevent UPDATE and DELETE.
create table if not exists public.tbc_execution_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.tbc_execution_records(slug) on delete restrict,
  seq bigint not null,
  event_type text not null,
  actor text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now(),
  unique (slug, seq)
);

create index if not exists tbc_execution_events_slug_created_idx
  on public.tbc_execution_events (slug, created_at desc);

-- Allocation ledger (illustrative until approved; do not seed production
-- allocations before legal and board approval).
create table if not exists public.tbc_allocations (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  beneficiary_reference text,
  percent numeric(7,4) check (percent >= 0 and percent <= 100),
  token_amount numeric(30,8) check (token_amount >= 0),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'issued', 'cancelled')),
  approval_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tbc_vesting_schedules (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.tbc_allocations(id) on delete restrict,
  cliff_months integer not null default 0 check (cliff_months >= 0),
  vesting_months integer not null default 0 check (vesting_months >= 0),
  start_at timestamptz not null,
  released_amount numeric(30,8) not null default 0 check (released_amount >= 0),
  status text not null default 'proposed'
    check (status in ('proposed', 'active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No order may move past 'awaiting_approval' without an approval reference
-- written by an authorised operator.
create table if not exists public.tbc_sale_orders (
  id uuid primary key default gen_random_uuid(),
  purchaser_reference text not null,
  jurisdiction text not null,
  amount_kwd numeric(18,4) not null check (amount_kwd >= 0),
  token_amount numeric(30,8) check (token_amount >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'eligibility_pending', 'awaiting_approval', 'approved', 'settled', 'refunded', 'cancelled')),
  eligibility_evidence jsonb not null default '{}'::jsonb,
  approval_reference text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tbc_governance_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'open', 'passed', 'rejected', 'cancelled')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tbc_governance_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.tbc_governance_proposals(id) on delete restrict,
  voter_reference text not null,
  weight numeric(30,8) not null default 0,
  choice text not null check (choice in ('for', 'against', 'abstain')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (proposal_id, voter_reference)
);

-- Append-only platform audit. Service-role only.
create table if not exists public.tbc_audit_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  actor text,
  action text not null,
  target text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists tbc_audit_events_created_idx
  on public.tbc_audit_events (created_at desc);

-- Immutability guards.
create or replace function public.tbc_reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'append-only table: % cannot be updated or deleted', tg_table_name;
end;
$$;

drop trigger if exists tbc_execution_events_immutable on public.tbc_execution_events;
create trigger tbc_execution_events_immutable
before update or delete on public.tbc_execution_events
for each row execute function public.tbc_reject_mutation();

drop trigger if exists tbc_audit_events_immutable on public.tbc_audit_events;
create trigger tbc_audit_events_immutable
before update or delete on public.tbc_audit_events
for each row execute function public.tbc_reject_mutation();

-- Updated-at helpers.
create or replace function public.tbc_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tbc_execution_records', 'tbc_allocations', 'tbc_vesting_schedules',
    'tbc_sale_orders', 'tbc_governance_proposals'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.tbc_touch_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

-- RLS is enabled with no policies. The service role bypasses RLS; anon and
-- authenticated clients receive no access.
alter table public.tbc_execution_records enable row level security;
alter table public.tbc_execution_events enable row level security;
alter table public.tbc_allocations enable row level security;
alter table public.tbc_vesting_schedules enable row level security;
alter table public.tbc_sale_orders enable row level security;
alter table public.tbc_governance_proposals enable row level security;
alter table public.tbc_governance_votes enable row level security;
alter table public.tbc_audit_events enable row level security;

comment on table public.tbc_execution_records is
  'Current DocuSign/approval state per TBC document. Evidence is in tbc_execution_events.';
comment on table public.tbc_execution_events is
  'Append-only hash-chained execution evidence. Never update or delete.';
comment on table public.tbc_audit_events is
  'Append-only platform audit stream. Service-role only.';
