-- TradingBible — read-only Supabase RLS and grant audit
--
-- This file is for review and evidence collection. It does not change the
-- database. Run it against a read-only connection or the Supabase SQL editor
-- with the minimum role needed to inspect catalogs. Do not run remediation SQL
-- against production without a backup, a staging test and a rollback plan.
--
-- Export the result to controlled storage and record the reference in
-- /admin/security. A clean query result is not proof that every policy behaves
-- correctly; tenant-isolation tests are still required.

-- 1. Public tables and whether RLS is enabled.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public')
order by c.relname;

-- 2. Tables with RLS disabled. Any exposed table in this list is a review item.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = false
order by c.relname;

-- 3. Policies by table, role and command.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Tables with RLS enabled but no policy. Service-role-only tables may be
-- intentional; customer-facing tables are not.
select
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = n.nspname
      and p.tablename = c.relname
  )
order by c.relname;

-- 5. Broad policies that allow every row or every insert. Review each one.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    qual = 'true'
    or with_check = 'true'
  )
order by tablename, policyname;

-- 6. Table grants to anon and authenticated. Policies and grants must be
-- reviewed together; a grant can expose a table even when the UI never uses it.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 7. Column-level grants. Sensitive columns should not be selectable by roles
-- that do not need them.
select
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

-- 8. Functions in the public schema and their execute grants. Security-definer
-- functions require particular care.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proacl, ', '), '(default)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- 9. Views in the public schema. A view can bypass intended table access if it
-- is owned by a privileged role and exposed without security_invoker.
select
  schemaname,
  viewname,
  viewowner
from pg_views
where schemaname = 'public'
order by viewname;

-- 10. Storage buckets and object policies are managed in the Supabase storage
-- schema and dashboard. Review bucket visibility separately:
--   - private buckets for customer documents and identity evidence;
--   - no public bucket for broker credentials, invoices or HR records;
--   - object ownership policies aligned to user or organisation membership.
--
-- Do not put anon keys, service-role keys, customer records or identity
-- documents in the evidence export.
