# Supabase Security Audit

`rls-audit.sql` is a read-only audit for public-schema tables, RLS, policies, grants, sensitive columns, functions and views.

## How to use

1. Run the SQL against a read-only or staging connection first.
2. Export the output to a controlled location.
3. Review every table with RLS disabled or with a broad `true` policy.
4. Review `anon` and `authenticated` grants separately from policies.
5. Test tenant isolation with two real test accounts and direct REST calls.
6. Record the date, reviewer and evidence reference in `/admin/security`.
7. Do not apply remediation SQL to production without a backup, a staging test and a rollback plan.

## Important boundaries

- The service-role key bypasses RLS. It must remain server-side.
- RLS enabled without policies is not automatically safe for customer-facing tables; it may be intentional for service-role-only tables.
- A policy that checks a user-editable column is not a secure role check.
- Storage bucket access and object ownership policies must be reviewed separately.
- A SQL result is not a substitute for an access-control test.

## Remediation design

For each exposed table, document:

- who should read, insert, update and delete;
- the ownership or membership column used for isolation;
- the policy for each operation;
- the test cases for allowed and denied access;
- the grant that supports the policy; and
- the reviewer and date.

Do not add a broad `for all using (true)` policy to make a feature work.
