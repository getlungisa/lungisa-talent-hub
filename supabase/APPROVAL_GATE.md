# Business approval gate

Migration: `migrations/20261011000000_business_approval_gate.sql`
Rollback: `rollback/20261011_business_approval_gate_rollback.sql`
Verification / security tests (run with psql after migrating, ends in ROLLBACK):
`psql -v ON_ERROR_STOP=1 -f supabase/tests/business_approval_gate_verification.sql`

## Before / after

| Who | Before | After |
| --- | --- | --- |
| anon | Could read whatever the live permissive policies + column grants allowed (e.g. available candidates) | No rows from any candidate-derived table |
| signed-in, no business | Available candidates via the "available candidates" policy | Nothing |
| pending / rejected business user (primary or secondary) | Same as approved (no status existed) | Nothing; only their own `businesses` row (status) is readable |
| approved business user (primary or secondary) | Existing access | Unchanged |
| training partner | Linked candidates / allocations via live TP policies | Unchanged **while their business is approved** (all existing businesses are backfilled to approved). Training partners are `businesses` rows, so the approved requirement applies uniformly |
| admin (`user_flags.is_admin`) | n/a | Admin functions only; no extra candidate access |

## How candidate data is gated

`user_has_approved_business()` (SECURITY DEFINER, fixed `search_path`, covers `user_id` and `secondary_user_id`)
backs a **RESTRICTIVE** policy `"Approved business required"` (FOR ALL, TO public) on:
`candidates, candidate_allocations, placements, shortlists, business_activity, candidate_references,
verification_stages, signals, behavioural_tasks, retention_tracking`.
Restrictive policies are ANDed with every permissive policy, including the live-only ones
(training-partner visibility, `can_view_allocation_by_*`, `user_can_access_business` paths), so each existing
path (direct queries, joins, Recommended, activity, placements, shortlists) is gated without rewriting
policies whose live definitions are not in the repo. Tables absent from a database are skipped with a NOTICE.

SECURITY DEFINER functions bypass RLS, so they are gated explicitly:
`toggle_candidate_shortlist` now raises `business_not_found` / `business_not_approved`.

Recommended is the client query `fetchCandidates()` on `candidates`; it is gated by the policy above and the
app only mounts it behind `BusinessGate` (approved only).

Column grants are not touched; `candidates.whatsapp_number` stays ungranted to anon/authenticated (verified by the script).

## Businesses table

* `status` pending|approved|rejected, NOT NULL, default `pending`; existing rows backfilled `approved`.
* New columns: `contact_name, whatsapp_number, area, number_of_sites, roles_hired, website_or_social,
  terms_accepted_at, terms_version, status_changed_at, status_changed_by`. (`whatsapp_number` is an addition to the
  requested list because the form collects it.) The deployed `"contact email"` column name is used; the migration
  aborts if it is missing.
* No direct INSERT/DELETE for anon/authenticated; UPDATE is restricted to profile columns (not `status`, `status_*`,
  `terms_*`, `user_id`, `is_training_partner`). The old "Users can insert their own business" policy is dropped.
* `register_business(...)` (authenticated only): `auth.uid()` only, email taken from `auth.users`, validates and
  length-limits every field, refuses if the user already owns/is assigned a business, inserts `pending`, records
  terms acceptance + version. No status/owner arguments.
* `admin_set_business_status`, `admin_list_pending_businesses`, `admin_create_business`: check `is_admin` inside.

## is_admin

The repository has no profile table, so the flag lives in `public.user_flags(user_id, is_admin)`, RLS on and no
grants to anon/authenticated (not selectable/updatable by normal users). Set yours manually:

```sql
INSERT INTO public.user_flags (user_id, is_admin)
SELECT id, true FROM auth.users WHERE email = 'you@example.com'
ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
```

## Manual route (equivalent of admin_create_business)

If the in-function auth-user creation is rejected by your GoTrue version, create the user in
Dashboard > Authentication > Add user, then (SQL editor, as postgres):

```sql
INSERT INTO public.businesses (user_id, name, "contact email", status, status_changed_at)
SELECT id, 'Business name', email, 'approved', now()
FROM auth.users WHERE lower(email) = lower('owner@example.com')
  AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.users.id OR b.secondary_user_id = auth.users.id);
```

## App behaviour

* `/join` (QR-friendly): validated form + honeypot; sends the magic link with `shouldCreateUser: true`, redirecting
  to `/join`, where the saved draft is submitted through `register_business`. The draft is kept in localStorage
  (24h) so it survives the email round-trip; `BusinessGate` also completes it if the link lands on `/`.
  Add `<origin>/join` to the Supabase Auth redirect allow-list.
* "Email already has a business": checked after authentication (`business_already_exists` -> `/`). A pre-auth
  lookup would let anyone enumerate registered emails, so none is exposed.
* `/sign-in` now uses `shouldCreateUser: false`; unknown emails get the same "link sent" message (no enumeration).
* `ensureBusiness` (client INSERT of placeholder rows) is removed; `fetchOwnBusiness` is read-only.
* `/` is wrapped in `BusinessGate`: pending/rejected/missing businesses see static screens and no candidate query runs.
* `/admin/businesses`: admin-only, mobile-first list with Approve/Reject; user text is rendered via React (escaped), links only for http(s).

## Not verified / open items (no guessing)

* Live definitions of `can_view_allocation_by_business`, `can_view_allocation_by_training_partner`,
  `is_training_partner_for_business`, `is_training_partner_for_candidate`, `is_candidate_training_partner`,
  `create_default_candidate_allocation` and the live-only table policies are not in the repo and were **not** rewritten.
  They are boolean predicates / a trigger; any row exposure goes through the gated tables. The verification script
  prints other candidate-related SECURITY DEFINER functions (`REVIEW ...`) for manual inspection
  (`SELECT pg_get_functiondef('public.<name>'::regproc)`).
* Repo vs live drift (e.g. `needs` vs `"Needs"`, `contact_email` vs `"contact email"`, `allocation_date` vs `allocated_at`)
  means the migration was validated on a PostgreSQL 16 instance rebuilt from the repo migrations plus the supplied
  live facts, not on the real database.
* `admin_create_business` new-user path writes `auth.users`/`auth.identities`; confirm on live (the script warns, not fails).
* Generated `src/integrations/supabase/types.ts` is stale (no allocation tables/functions), so local runtime types are used.
* "Needs" and `needs` are not treated as candidate-derived and are not gated.
