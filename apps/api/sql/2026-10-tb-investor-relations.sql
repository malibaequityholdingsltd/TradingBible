-- ─────────────────────────────────────────────────────────────────────────
-- TradingBible — TB investor relations, shareholder and equity controls
--
-- Phase 1–3 data model for:
--   • public IR announcements, documents, financial reports and IPO progress
--   • a private shareholder register with positions, certificates and access
--   • corporate equity proposals, approvals and an append-only audit stream
--   • investor subscriptions and IR contact requests
--
-- Design rules:
--   • TB is a proposed future ticker. No table in this migration creates a
--     listed security, a share price, a market capitalisation or an order book.
--   • Sensitive tables have RLS enabled and no public policies. The API service
--     role is the only reader/writer. Public reads go through /api/investor.
--   • Positions are evidence records, not an issuance or transfer engine.
--   • Financial rows are only public after approval and publication.
--
-- Apply in the Supabase SQL editor before enabling the investor API surfaces.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── updated_at helper ────────────────────────────────────────────────────
create or replace function public.tb_ir_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Public corporate disclosures ─────────────────────────────────────────
create table if not exists public.tb_investor_announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'Corporate',
  title text not null,
  summary text not null default '',
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create index if not exists tb_investor_announcements_public_idx
  on public.tb_investor_announcements (status, published_at desc);

drop trigger if exists tb_investor_announcements_touch on public.tb_investor_announcements;
create trigger tb_investor_announcements_touch
  before update on public.tb_investor_announcements
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_investor_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Corporate',
  document_type text not null default 'PDF',
  summary text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'restricted')),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'published', 'archived')),
  url text,
  storage_path text,
  version text not null default '1.0',
  checksum_sha256 text,
  source_note text,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create index if not exists tb_investor_documents_public_idx
  on public.tb_investor_documents (status, visibility, published_at desc);

drop trigger if exists tb_investor_documents_touch on public.tb_investor_documents;
create trigger tb_investor_documents_touch
  before update on public.tb_investor_documents
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_financial_reports (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  period_end date,
  report_type text not null default 'annual'
    check (report_type in ('annual', 'quarterly', 'monthly', 'other')),
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'under_review', 'approved', 'published', 'archived')),
  auditor_status text not null default 'unaudited'
    check (auditor_status in ('unaudited', 'reviewed', 'audited')),
  currency text not null default 'USD',
  revenue numeric(20, 2),
  operating_expenses numeric(20, 2),
  net_income numeric(20, 2),
  total_assets numeric(20, 2),
  total_liabilities numeric(20, 2),
  cash_flow_operating numeric(20, 2),
  shareholders_equity numeric(20, 2),
  eps numeric(20, 6),
  source_note text,
  document_url text,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create index if not exists tb_financial_reports_public_idx
  on public.tb_financial_reports (status, period_end desc);

drop trigger if exists tb_financial_reports_touch on public.tb_financial_reports;
create trigger tb_financial_reports_touch
  before update on public.tb_financial_reports
  for each row execute function public.tb_ir_touch_updated_at();

-- ── IPO readiness ────────────────────────────────────────────────────────
create table if not exists public.tb_ipo_milestones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  phase text not null default 'Preparation',
  title text not null,
  description text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'blocked', 'complete')),
  evidence text,
  owner text,
  due_date date,
  sort_order integer not null default 100,
  is_public boolean not null default true,
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create index if not exists tb_ipo_milestones_public_idx
  on public.tb_ipo_milestones (is_public, sort_order);

drop trigger if exists tb_ipo_milestones_touch on public.tb_ipo_milestones;
create trigger tb_ipo_milestones_touch
  before update on public.tb_ipo_milestones
  for each row execute function public.tb_ir_touch_updated_at();

-- ── Equity ledger ────────────────────────────────────────────────────────
create table if not exists public.tb_share_classes (
  id uuid primary key default gen_random_uuid(),
  class_code text not null unique,
  name text not null,
  authorized_shares numeric(20, 4) not null default 0 check (authorized_shares >= 0),
  issued_shares numeric(20, 4) not null default 0 check (issued_shares >= 0),
  outstanding_shares numeric(20, 4) not null default 0 check (outstanding_shares >= 0),
  treasury_shares numeric(20, 4) not null default 0 check (treasury_shares >= 0),
  votes_per_share numeric(12, 4) not null default 1,
  rights text,
  status text not null default 'proposed'
    check (status in ('proposed', 'authorized', 'retired')),
  effective_date date,
  approved_by text,
  approved_at timestamptz,
  is_public boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tb_share_classes_touch on public.tb_share_classes;
create trigger tb_share_classes_touch
  before update on public.tb_share_classes
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_shareholders (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  email text not null,
  user_id uuid,
  entity_type text not null default 'individual'
    check (entity_type in ('individual', 'entity', 'trust', 'custodian', 'other')),
  jurisdiction text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  access_status text not null default 'requested'
    check (access_status in ('requested', 'approved', 'suspended', 'revoked')),
  verification_note text,
  verified_by text,
  verified_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tb_shareholders_email_idx on public.tb_shareholders (lower(email));
create index if not exists tb_shareholders_user_idx on public.tb_shareholders (user_id);

drop trigger if exists tb_shareholders_touch on public.tb_shareholders;
create trigger tb_shareholders_touch
  before update on public.tb_shareholders
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_equity_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  proposal_type text not null default 'other'
    check (proposal_type in ('issuance', 'option_pool', 'transfer', 'conversion', 'dividend', 'split', 'governance', 'other')),
  summary text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'executed')),
  proposed_by text,
  supporting_document_id uuid references public.tb_investor_documents(id) on delete set null,
  supporting_document_url text,
  decision_note text,
  approved_by text,
  approved_at timestamptz,
  execution_reference text,
  executed_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tb_equity_proposals_touch on public.tb_equity_proposals;
create trigger tb_equity_proposals_touch
  before update on public.tb_equity_proposals
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_equity_approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.tb_equity_proposals(id) on delete cascade,
  approver_email text not null,
  decision text not null check (decision in ('approve', 'reject', 'abstain')),
  note text,
  decided_at timestamptz not null default now()
);

create index if not exists tb_equity_approvals_proposal_idx
  on public.tb_equity_approvals (proposal_id, decided_at desc);

create table if not exists public.tb_share_positions (
  id uuid primary key default gen_random_uuid(),
  shareholder_id uuid not null references public.tb_shareholders(id) on delete restrict,
  share_class_id uuid not null references public.tb_share_classes(id) on delete restrict,
  certificate_number text,
  shares numeric(20, 4) not null check (shares > 0),
  ownership_pct numeric(9, 6),
  issued_date date,
  vesting_start date,
  vesting_cliff_months integer check (vesting_cliff_months is null or vesting_cliff_months >= 0),
  vesting_months integer check (vesting_months is null or vesting_months >= 0),
  transfer_restrictions text,
  status text not null default 'active'
    check (status in ('active', 'transferred', 'cancelled')),
  source_reference text not null,
  source_document_id uuid references public.tb_investor_documents(id) on delete set null,
  proposal_id uuid references public.tb_equity_proposals(id) on delete set null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tb_share_positions_shareholder_idx
  on public.tb_share_positions (shareholder_id, status);
create index if not exists tb_share_positions_class_idx
  on public.tb_share_positions (share_class_id, status);

drop trigger if exists tb_share_positions_touch on public.tb_share_positions;
create trigger tb_share_positions_touch
  before update on public.tb_share_positions
  for each row execute function public.tb_ir_touch_updated_at();

-- ── Meetings and voting records ──────────────────────────────────────────
create table if not exists public.tb_shareholder_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date timestamptz,
  record_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  notice_url text,
  details text,
  is_public boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tb_shareholder_meetings_touch on public.tb_shareholder_meetings;
create trigger tb_shareholder_meetings_touch
  before update on public.tb_shareholder_meetings
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_voting_records (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.tb_shareholder_meetings(id) on delete cascade,
  shareholder_id uuid not null references public.tb_shareholders(id) on delete cascade,
  agenda_item text not null,
  vote text not null check (vote in ('for', 'against', 'abstain', 'not_voted')),
  recorded_at timestamptz not null default now(),
  created_by text
);

create index if not exists tb_voting_records_shareholder_idx
  on public.tb_voting_records (shareholder_id, recorded_at desc);

-- ── IR audience and requests ─────────────────────────────────────────────
create table if not exists public.tb_investor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  confirmation_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text not null default 'investor-site',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tb_investor_subscriptions_email_idx
  on public.tb_investor_subscriptions (lower(email));

drop trigger if exists tb_investor_subscriptions_touch on public.tb_investor_subscriptions;
create trigger tb_investor_subscriptions_touch
  before update on public.tb_investor_subscriptions
  for each row execute function public.tb_ir_touch_updated_at();

create table if not exists public.tb_investor_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  inquiry_type text not null default 'General',
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'closed')),
  handled_at timestamptz,
  handled_by text,
  created_at timestamptz not null default now()
);

create index if not exists tb_investor_contacts_status_idx
  on public.tb_investor_contacts (status, created_at desc);

-- ── Append-only equity audit stream ──────────────────────────────────────
create table if not exists public.tb_equity_audit_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null unique,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  detail jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists tb_equity_audit_events_seq_idx
  on public.tb_equity_audit_events (seq desc);

-- ── RLS: service-role only (the API is the only public door) ─────────────
alter table public.tb_investor_announcements enable row level security;
alter table public.tb_investor_documents enable row level security;
alter table public.tb_financial_reports enable row level security;
alter table public.tb_ipo_milestones enable row level security;
alter table public.tb_share_classes enable row level security;
alter table public.tb_shareholders enable row level security;
alter table public.tb_equity_proposals enable row level security;
alter table public.tb_equity_approvals enable row level security;
alter table public.tb_share_positions enable row level security;
alter table public.tb_shareholder_meetings enable row level security;
alter table public.tb_voting_records enable row level security;
alter table public.tb_investor_subscriptions enable row level security;
alter table public.tb_investor_contacts enable row level security;
alter table public.tb_equity_audit_events enable row level security;

revoke all on public.tb_investor_announcements from anon, authenticated;
revoke all on public.tb_investor_documents from anon, authenticated;
revoke all on public.tb_financial_reports from anon, authenticated;
revoke all on public.tb_ipo_milestones from anon, authenticated;
revoke all on public.tb_share_classes from anon, authenticated;
revoke all on public.tb_shareholders from anon, authenticated;
revoke all on public.tb_equity_proposals from anon, authenticated;
revoke all on public.tb_equity_approvals from anon, authenticated;
revoke all on public.tb_share_positions from anon, authenticated;
revoke all on public.tb_shareholder_meetings from anon, authenticated;
revoke all on public.tb_voting_records from anon, authenticated;
revoke all on public.tb_investor_subscriptions from anon, authenticated;
revoke all on public.tb_investor_contacts from anon, authenticated;
revoke all on public.tb_equity_audit_events from anon, authenticated;

grant select, insert, update, delete on public.tb_investor_announcements to service_role;
grant select, insert, update, delete on public.tb_investor_documents to service_role;
grant select, insert, update, delete on public.tb_financial_reports to service_role;
grant select, insert, update, delete on public.tb_ipo_milestones to service_role;
grant select, insert, update, delete on public.tb_share_classes to service_role;
grant select, insert, update, delete on public.tb_shareholders to service_role;
grant select, insert, update, delete on public.tb_equity_proposals to service_role;
grant select, insert, update, delete on public.tb_equity_approvals to service_role;
grant select, insert, update, delete on public.tb_share_positions to service_role;
grant select, insert, update, delete on public.tb_shareholder_meetings to service_role;
grant select, insert, update, delete on public.tb_voting_records to service_role;
grant select, insert, update, delete on public.tb_investor_subscriptions to service_role;
grant select, insert, update, delete on public.tb_investor_contacts to service_role;
grant select, insert, update, delete on public.tb_equity_audit_events to service_role;

-- ── Preparation checklist (no milestone is marked complete) ──────────────
insert into public.tb_ipo_milestones
  (slug, phase, title, description, status, owner, sort_order, is_public)
values
  ('corporate-conversion', 'Corporate', 'Convert to a Delaware C-Corporation',
   'Prepare and approve the conversion from the current LLC structure, adopt a certificate of incorporation and bylaws, and appoint a board.', 'not_started', null, 10, true),
  ('board-governance', 'Governance', 'Constitute an independent board and committees',
   'Define board composition, independence, audit committee, compensation committee and corporate governance guidelines.', 'not_started', null, 20, true),
  ('audited-financials', 'Financial reporting', 'Complete audited financial statements',
   'Engage an independent auditor, complete audit fieldwork and approve financial statements for the required reporting periods.', 'not_started', null, 30, true),
  ('equity-ledger-reconciliation', 'Equity', 'Reconcile the capitalization table',
   'Reconcile issued, outstanding, treasury and reserved shares against executed corporate records and certificates.', 'not_started', null, 40, true),
  ('sec-registration', 'Regulatory', 'Prepare SEC registration and prospectus',
   'Complete securities counsel review, draft the registration statement and prospectus, and establish disclosure controls.', 'not_started', null, 50, true),
  ('underwriter-selection', 'Transaction', 'Select managing underwriters',
   'Run an underwriter process, agree engagement terms and establish the working-group responsibilities.', 'not_started', null, 60, true),
  ('nasdaq-eligibility', 'Exchange', 'Assess Nasdaq eligibility',
   'Evaluate quantitative and qualitative listing standards with counsel and the exchange. No application or approval is implied.', 'not_started', null, 70, true),
  ('due-diligence-room', 'Transaction', 'Build the due-diligence data room',
   'Organize corporate, financial, legal, tax, technology and material-contract records with access controls and evidence logs.', 'not_started', null, 80, true),
  ('disclosure-controls', 'Governance', 'Operate investor disclosure controls',
   'Establish review, approval, publication, retention and correction procedures for material investor information.', 'not_started', null, 90, true),
  ('transfer-agent', 'Equity', 'Engage a qualified transfer agent',
   'Select and contract a transfer agent for future registered share records, certificates and shareholder services.', 'not_started', null, 100, true),
  ('roadshow-readiness', 'Transaction', 'Prepare roadshow and investor materials',
   'Prepare approved presentations, management rehearsal and a process for correcting or updating materials.', 'not_started', null, 110, true),
  ('listing-readiness', 'Exchange', 'Complete final listing-readiness review',
   'Obtain written legal, audit, governance and exchange readiness sign-offs before any listing application or public trading.', 'not_started', null, 120, true)
on conflict (slug) do nothing;

-- ── Notes for operators ──────────────────────────────────────────────────
-- 1. Do not insert a share price, market capitalisation, volume or order-book
--    row here. Those require a listed security and licensed market data.
-- 2. Do not mark an IPO milestone complete without evidence. The API rejects
--    completion without an evidence record.
-- 3. Public financial reports require source_note, approved_by and published_at.
-- 4. Share positions require source_reference and approved_by. They record
--    executed/approved ownership evidence; this schema does not mint or transfer
--    shares and does not connect to a transfer agent.
