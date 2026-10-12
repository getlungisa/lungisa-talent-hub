-- Read-only: run in the Supabase SQL Editor BEFORE and AFTER the migration.
-- Shows who can SELECT each column of public.candidates (table-level grants
-- count for every column). Expect: new columns -> authenticated only;
-- whatsapp_number (if present) and trainer-note columns -> NOT anon/authenticated.
SELECT a.attname AS column_name,
       r.rolname AS role,
       has_column_privilege(r.rolname, 'public.candidates', a.attname, 'SELECT') AS can_select
FROM pg_attribute a
CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
WHERE a.attrelid = 'public.candidates'::regclass
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attname, r.rolname;

-- Raw grant entries (table + column level):
SELECT 'table' AS level, grantee, privilege_type, NULL AS column_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'candidates'
UNION ALL
SELECT 'column', grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'candidates'
  AND grantee IN ('anon', 'authenticated')
ORDER BY 1, 2, 4;
