# Employer-facing candidate fields

Migration: `migrations/20261012000000_employer_candidate_fields.sql`  
Rollback: `rollback/20261012_employer_candidate_fields_rollback.sql`  
Verification: `psql -v ON_ERROR_STOP=1 -f supabase/tests/business_approval_gate_verification.sql`

## Live grant and policy inspection

Live inspection was unavailable while preparing this change: this environment has no database connection configuration or Supabase CLI. No live before-state grant or policy result is claimed. Run the following against the live database **before applying the migration** and retain its output as the exact before-state.

```sql
SELECT
  a.attname AS column_name,
  has_column_privilege('anon', c.oid, a.attname, 'SELECT') AS anon_can_select,
  has_column_privilege('authenticated', c.oid, a.attname, 'SELECT') AS authenticated_can_select,
  c.relacl AS table_grants,
  a.attacl AS column_grants
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname = 'candidates'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'candidates'
  AND policyname = 'Approved business required';
```

The first query reports effective SELECT access for the Supabase business role (`authenticated`) and `anon` on every candidate column, including `whatsapp_number` and any trainer-note columns. It also returns the underlying table and column ACLs.

## Intended after-state

The migration adds nullable text columns with database-enforced character limits and grants `SELECT` only on `trained_on`, `work_history`, and `proud_of` to `authenticated`, the role used by business sessions. It does not grant `anon` access, touch any existing grants, change `whatsapp_number` or trainer-note access, or alter the restrictive approval-gate policy. The verification SQL asserts the new column access, denies `whatsapp_number` and trainer-note access to business sessions, checks pending businesses see no candidates, and confirms the restrictive policy remains.

Because live inspection was unavailable, compare the saved before-state with the post-migration result of the inspection query and verification script before considering deployment complete. If the live before-state shows broad table-level SELECT, stop and reconcile it rather than assuming that column-level grants restrict it.

## Apply and verify

Apply the forward migration using the repository's Supabase migration workflow, then run:

```sh
psql -v ON_ERROR_STOP=1 -f supabase/tests/business_approval_gate_verification.sql
```

The verification script uses transaction-local fixtures and ends in `ROLLBACK`. Run the rollback SQL only to reverse the schema change; it drops the three columns and their data.
