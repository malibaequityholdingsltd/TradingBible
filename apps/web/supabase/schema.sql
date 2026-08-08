-- TradingBible Supabase baseline schema
-- Run in Supabase SQL editor as project owner.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text,
  name text,
  role text not null default 'user',
  "accountType" text default 'individual',
  "companyName" text,
  plan text default 'trial',
  tutorialDone boolean default false,
  primaryMarket text,
  experience text,
  goal text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at before update on public.users
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  symbols jsonb not null default '[]'::jsonb,
  "isDefault" boolean default false,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  condition text,
  targetPrice numeric,
  status text default 'active',
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alert_history (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  symbol text,
  triggerPrice numeric,
  message text,
  seen boolean default false,
  created timestamptz default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  symbol text,
  side text,
  quantity numeric,
  entryPrice numeric,
  exitPrice numeric,
  pnl numeric,
  tradeDate timestamptz default now(),
  notes text,
  created timestamptz default now()
);

create table if not exists public.trading_signals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  symbol text,
  interval text,
  signal text,
  confidence numeric,
  outcome text,
  payload jsonb default '{}'::jsonb,
  created timestamptz default now()
);

create table if not exists public.chart_drawings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  symbol text,
  "timeframe" text,
  data jsonb not null default '[]'::jsonb,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.terminal_layouts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  layout jsonb not null default '{}'::jsonb,
  "isActive" boolean default false,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  provider text,
  accountId text,
  status text,
  balance numeric,
  equity numeric,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.crypto_accounts (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  walletAddress text,
  balance numeric default 0,
  metadata jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bank_cards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  brand text,
  last4 text,
  holderName text,
  status text,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  type text,
  amount numeric,
  currency text,
  description text,
  created timestamptz default now()
);

create table if not exists public.branding_settings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  settings jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  authorName text,
  authorAvatar text,
  replyCount integer default 0,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  thread uuid not null references public.forum_threads(id) on delete cascade,
  body text not null,
  authorName text,
  authorAvatar text,
  created timestamptz default now()
);

create table if not exists public.academy_waitlist (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  email text,
  payload jsonb default '{}'::jsonb,
  created timestamptz default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  eventType text,
  subscriptionId text,
  transactionId text,
  status text,
  planName text,
  amount numeric,
  currency text,
  invoiceUrl text,
  occurredAt timestamptz,
  created timestamptz default now()
);

create table if not exists public.admin_integrations (
  id uuid primary key default gen_random_uuid(),
  key text,
  provider text,
  status text,
  config jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  name text,
  keyPrefix text,
  status text default 'active',
  lastUsedAt timestamptz,
  created timestamptz default now()
);

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text,
  keyPrefix text,
  keyHash text,
  status text default 'active',
  lastUsedAt timestamptz,
  created timestamptz default now()
);

create table if not exists public.admin_platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null default 'default',
  settings jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.school_classrooms (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  "schoolName" text,
  name text not null,
  "studentsCount" integer default 0,
  "teachersCount" integer default 0,
  created timestamptz default now()
);

create table if not exists public.school_assessments (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text default 'quiz',
  status text default 'draft',
  payload jsonb default '{}'::jsonb,
  created timestamptz default now()
);

create table if not exists public.school_certificates (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "studentName" text,
  "issuedAt" timestamptz,
  payload jsonb default '{}'::jsonb,
  created timestamptz default now()
);

create table if not exists public.school_students (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  classroom text,
  "academyInterest" boolean default true,
  status text default 'active',
  created timestamptz default now()
);

create table if not exists public.school_teachers (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  subject text,
  created timestamptz default now()
);

create table if not exists public.school_submissions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  "studentName" text not null,
  "assessmentTitle" text not null,
  type text default 'quiz',
  content text,
  status text default 'submitted',
  score numeric,
  feedback text,
  "submittedAt" timestamptz default now(),
  "gradedAt" timestamptz,
  created timestamptz default now()
);

create table if not exists public.admin_plugins (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  name text,
  enabled boolean default false,
  config jsonb default '{}'::jsonb,
  created timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public._integratedAiMessages (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid references auth.users(id) on delete cascade,
  role text not null,
  content jsonb not null,
  created timestamptz default now()
);

alter table public.users enable row level security;
alter table public.watchlists enable row level security;
alter table public.price_alerts enable row level security;
alter table public.alert_history enable row level security;
alter table public.trades enable row level security;
alter table public.trading_signals enable row level security;
alter table public.chart_drawings enable row level security;
alter table public.terminal_layouts enable row level security;
alter table public.broker_accounts enable row level security;
alter table public.crypto_accounts enable row level security;
alter table public.bank_cards enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.branding_settings enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;
alter table public.academy_waitlist enable row level security;
alter table public.billing_events enable row level security;
alter table public.admin_integrations enable row level security;
alter table public.admin_api_keys enable row level security;
alter table public.user_api_keys enable row level security;
alter table public.admin_plugins enable row level security;
alter table public.admin_platform_settings enable row level security;
alter table public.school_classrooms enable row level security;
alter table public.school_assessments enable row level security;
alter table public.school_certificates enable row level security;
alter table public.school_students enable row level security;
alter table public.school_teachers enable row level security;
alter table public.school_submissions enable row level security;
alter table public._integratedAiMessages enable row level security;

create policy users_select_self_or_admin on public.users
for select using (id = auth.uid() or public.is_admin());
create policy users_update_self_or_admin on public.users
for update using (id = auth.uid() or public.is_admin());
create policy users_insert_self on public.users
for insert with check (id = auth.uid() or public.is_admin());

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'watchlists','price_alerts','alert_history','trades','trading_signals',
      'chart_drawings','terminal_layouts','broker_accounts','crypto_accounts',
      'bank_cards','bank_transactions','branding_settings','forum_threads',
      'forum_replies','academy_waitlist','billing_events','admin_api_keys',
      'user_api_keys','school_classrooms','school_assessments','school_certificates',
      'school_students','school_teachers','school_submissions'
    ])
  loop
    execute format('create policy %I_select_owner_or_admin on public.%I for select using (owner = auth.uid() or public.is_admin())', t, t);
    execute format('create policy %I_insert_owner_or_admin on public.%I for insert with check (owner = auth.uid() or public.is_admin())', t, t);
    execute format('create policy %I_update_owner_or_admin on public.%I for update using (owner = auth.uid() or public.is_admin())', t, t);
    execute format('create policy %I_delete_owner_or_admin on public.%I for delete using (owner = auth.uid() or public.is_admin())', t, t);
  end loop;
exception when duplicate_object then null;
end $$;

create policy admin_integrations_admin_only on public.admin_integrations
for all using (public.is_admin()) with check (public.is_admin());
create policy admin_plugins_admin_only on public.admin_plugins
for all using (public.is_admin()) with check (public.is_admin());
create policy admin_platform_settings_admin_only on public.admin_platform_settings
for all using (public.is_admin()) with check (public.is_admin());

create policy integrated_ai_messages_select_self_or_admin on public._integratedAiMessages
for select using ("userId" = auth.uid() or public.is_admin());
create policy integrated_ai_messages_insert_self_or_admin on public._integratedAiMessages
for insert with check ("userId" = auth.uid() or public.is_admin());
create policy integrated_ai_messages_delete_self_or_admin on public._integratedAiMessages
for delete using ("userId" = auth.uid() or public.is_admin());
