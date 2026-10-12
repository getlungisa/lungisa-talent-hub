-- Verification + executable security tests for 20261011000000_business_approval_gate.sql
--
-- Run AFTER the migration, as a privileged role (e.g. the Supabase SQL editor
-- or `psql -v ON_ERROR_STOP=1 -f ...`). Everything runs in one transaction that
-- ends in ROLLBACK, so the fixtures (test auth users + businesses) are never
-- persisted. Any failed assertion raises an exception; a clean run ends with
-- "ALL APPROVAL GATE CHECKS PASSED".
--
-- Fixture users (fixed UUIDs, created inside the transaction only):
--   ...a1 admin   ...b1 pending owner   ...b2 pending secondary user
--   ...c1 rejected owner   ...d1 approved owner   ...d2 approved secondary
--   ...e1 plain user (no business)   ...e2 second plain user
--
-- Candidate-derived tables checked (live-only ones are skipped with a NOTICE
-- if absent): candidates, candidate_allocations, placements, shortlists,
-- business_activity, candidate_references, verification_stages, signals,
-- behavioural_tasks, retention_tracking.

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'gate-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'gate-pending@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'gate-pending2@example.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'gate-rejected@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'gate-approved@example.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'gate-approved2@example.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'gate-plain@example.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'gate-plain2@example.test');

INSERT INTO public.user_flags (user_id, is_admin)
VALUES ('00000000-0000-0000-0000-0000000000a1', true);

INSERT INTO public.businesses (id, user_id, secondary_user_id, name, "contact email", status) VALUES
  ('00000000-0000-0000-0000-00000000f0b1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'Gate Pending',  'gate-pending@example.test',  'pending'),
  ('00000000-0000-0000-0000-00000000f0c1', '00000000-0000-0000-0000-0000000000c1', NULL,                                   'Gate Rejected', 'gate-rejected@example.test', 'rejected'),
  ('00000000-0000-0000-0000-00000000f0d1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', 'Gate Approved', 'gate-approved@example.test', 'approved');

DO $$
DECLARE
  tables CONSTANT TEXT[] := ARRAY[
    'candidates', 'candidate_allocations', 'placements', 'shortlists',
    'business_activity', 'candidate_references', 'verification_stages',
    'signals', 'behavioural_tasks', 'retention_tracking'
  ];
  t TEXT;
  p RECORD;
  n BIGINT;
  msg TEXT;
  fn TEXT;
  pending_biz CONSTANT UUID := '00000000-0000-0000-0000-00000000f0b1';
  rejected_biz CONSTANT UUID := '00000000-0000-0000-0000-00000000f0c1';
  approved_biz CONSTANT UUID := '00000000-0000-0000-0000-00000000f0d1';
  new_id UUID;
  new_status TEXT;
  changed_by UUID;
  available_exists BOOLEAN;
BEGIN
  -------------------------------------------------------------------------
  -- A. Structure: policies, grants, function hardening
  -------------------------------------------------------------------------
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'SKIP table public.% not present in this database', t;
      CONTINUE;
    END IF;

    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || t)::regclass) THEN
      RAISE EXCEPTION 'FAIL: RLS is not enabled on public.%', t;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND policyname = 'Approved business required'
        AND permissive = 'RESTRICTIVE'
        AND qual ILIKE '%user_has_approved_business%'
    ) THEN
      RAISE EXCEPTION 'FAIL: public.% has no restrictive approved-business policy', t;
    END IF;
  END LOOP;

  IF has_column_privilege('anon', 'public.candidates', 'whatsapp_number', 'SELECT')
     OR has_column_privilege('authenticated', 'public.candidates', 'whatsapp_number', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon/authenticated can SELECT candidates.whatsapp_number';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.candidates', 'trained_on', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.candidates', 'work_history', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.candidates', 'proud_of', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot SELECT all employer-facing candidate fields';
  END IF;

  IF has_column_privilege('anon', 'public.candidates', 'trained_on', 'SELECT')
     OR has_column_privilege('anon', 'public.candidates', 'work_history', 'SELECT')
     OR has_column_privilege('anon', 'public.candidates', 'proud_of', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon can SELECT employer-facing candidate fields';
  END IF;

  FOR p IN
    SELECT attname
    FROM pg_attribute
    WHERE attrelid = 'public.candidates'::regclass
      AND attnum > 0
      AND NOT attisdropped
      AND (
        attname ILIKE '%trainer%'
        OR attname ILIKE '%training%note%'
        OR attname ILIKE '%private%note%'
        OR attname ILIKE '%internal%note%'
      )
  LOOP
    IF has_column_privilege('anon', 'public.candidates', p.attname, 'SELECT')
       OR has_column_privilege('authenticated', 'public.candidates', p.attname, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL: anon/authenticated can SELECT trainer/internal candidate field %', p.attname;
    END IF;
  END LOOP;

  IF has_any_column_privilege('anon', 'public.user_flags', 'SELECT,UPDATE,INSERT')
     OR has_any_column_privilege('authenticated', 'public.user_flags', 'SELECT,UPDATE,INSERT') THEN
    RAISE EXCEPTION 'FAIL: normal roles have privileges on public.user_flags (is_admin)';
  END IF;

  IF has_table_privilege('authenticated', 'public.businesses', 'INSERT')
     OR has_table_privilege('anon', 'public.businesses', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: normal roles can INSERT into businesses directly';
  END IF;

  IF has_column_privilege('authenticated', 'public.businesses', 'status', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.businesses', 'status_changed_by', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.businesses', 'user_id', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.businesses', 'terms_accepted_at', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can UPDATE a protected businesses column';
  END IF;

  FOREACH fn IN ARRAY ARRAY[
    'public.register_business(text,text,text,text,integer,text,text,text,boolean,boolean)',
    'public.admin_set_business_status(uuid,text)',
    'public.admin_list_pending_businesses()',
    'public.admin_create_business(text,text)',
    'public.toggle_candidate_shortlist(uuid,uuid,boolean)',
    'public.current_user_is_admin()',
    'public.user_can_access_approved_business(uuid)'
  ] LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') OR has_function_privilege('public', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: anon/PUBLIC can EXECUTE %', fn;
    END IF;
    IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: authenticated cannot EXECUTE %', fn;
    END IF;
  END LOOP;

  FOR p IN
    SELECT proname, prosecdef, proconfig, pg_get_function_arguments(oid) AS args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('register_business', 'admin_set_business_status',
                      'admin_list_pending_businesses', 'admin_create_business',
                      'user_has_approved_business', 'user_can_access_approved_business',
                      'current_user_is_admin')
  LOOP
    IF NOT p.prosecdef THEN
      RAISE EXCEPTION 'FAIL: % is not SECURITY DEFINER', p.proname;
    END IF;
    IF p.proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%') THEN
      RAISE EXCEPTION 'FAIL: % has no fixed search_path', p.proname;
    END IF;
    IF p.proname = 'register_business' AND p.args ~* '(status|owner|user_id)' THEN
      RAISE EXCEPTION 'FAIL: register_business accepts caller-controlled status/owner: %', p.args;
    END IF;
  END LOOP;

  IF pg_get_functiondef('public.toggle_candidate_shortlist(uuid,uuid,boolean)'::regprocedure)
       NOT ILIKE '%user_can_access_approved_business%' THEN
    RAISE EXCEPTION 'FAIL: toggle_candidate_shortlist does not require an approved business';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'businesses'
      AND column_name = 'status' AND is_nullable = 'NO' AND column_default LIKE '%pending%'
  ) THEN
    RAISE EXCEPTION 'FAIL: businesses.status must be NOT NULL DEFAULT ''pending''';
  END IF;

  RAISE NOTICE 'OK: structure checks (policies, grants, function hardening)';

  -- Other SECURITY DEFINER functions that mention candidate data and are NOT
  -- replaced by this migration. They are boolean/visibility predicates used by
  -- policies (gated by the restrictive policies); review manually.
  FOR p IN
    SELECT proname FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND prosecdef
      AND (prosrc ILIKE '%candidate%')
      AND proname NOT IN ('toggle_candidate_shortlist', 'register_business',
                          'admin_create_business', 'admin_list_pending_businesses',
                          'admin_set_business_status')
  LOOP
    RAISE NOTICE 'REVIEW candidate-related SECURITY DEFINER function: public.%', p.proname;
  END LOOP;

  -------------------------------------------------------------------------
  -- B. Pending / rejected / no-business / anon see NO candidate data
  -------------------------------------------------------------------------
  FOR p IN
    SELECT * FROM (VALUES
      ('pending owner',      'authenticated', '00000000-0000-0000-0000-0000000000b1'),
      ('pending secondary',  'authenticated', '00000000-0000-0000-0000-0000000000b2'),
      ('rejected owner',     'authenticated', '00000000-0000-0000-0000-0000000000c1'),
      ('user without business', 'authenticated', '00000000-0000-0000-0000-0000000000e1'),
      ('anon',               'anon',          '')
    ) AS v(persona, rolename, uid)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', p.uid, true);
    PERFORM set_config('request.jwt.claims',
      CASE WHEN p.uid = '' THEN '{}' ELSE json_build_object('sub', p.uid, 'role', p.rolename)::TEXT END, true);
    EXECUTE format('SET LOCAL ROLE %I', p.rolename);

    FOREACH t IN ARRAY tables LOOP
      IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      EXCEPTION WHEN insufficient_privilege THEN
        n := 0; -- no table grant at all is also "sees nothing"
      END;
      IF n <> 0 THEN
        RAISE EXCEPTION 'FAIL: % can see % rows in public.%', p.persona, n, t;
      END IF;
    END LOOP;

    RESET ROLE;
  END LOOP;
  RAISE NOTICE 'OK: pending/rejected/no-business/anon see no candidate-derived rows';

  -------------------------------------------------------------------------
  -- C. Approved primary and secondary users keep access
  -------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE EXISTS (SELECT 1 FROM public.candidate_allocations a
                  WHERE a.candidate_id = c.id AND a.status = 'available')
  ) INTO available_exists;

  FOR p IN
    SELECT * FROM (VALUES
      ('approved owner',     '00000000-0000-0000-0000-0000000000d1'),
      ('approved secondary', '00000000-0000-0000-0000-0000000000d2')
    ) AS v(persona, uid)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', p.uid, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p.uid, 'role', 'authenticated')::TEXT, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    IF NOT public.user_has_approved_business() THEN
      RAISE EXCEPTION 'FAIL: % should satisfy user_has_approved_business()', p.persona;
    END IF;

    EXECUTE 'SELECT count(id) FROM public.candidates' INTO n;
    IF available_exists AND n = 0 THEN
      RAISE EXCEPTION 'FAIL: % cannot see available candidates', p.persona;
    END IF;

    BEGIN
      EXECUTE 'SELECT trained_on, work_history, proud_of FROM public.candidates LIMIT 1';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'FAIL: % cannot read the employer-facing candidate fields', p.persona;
    END;

    msg := NULL;
    BEGIN
      EXECUTE 'SELECT whatsapp_number FROM public.candidates LIMIT 0';
    EXCEPTION WHEN insufficient_privilege THEN
      msg := SQLSTATE;
    END;
    IF msg IS NULL THEN
      RAISE EXCEPTION 'FAIL: % can read candidates.whatsapp_number', p.persona;
    END IF;

    RAISE NOTICE '% sees % candidates', p.persona, n;

    RESET ROLE;
  END LOOP;
  RAISE NOTICE 'OK: approved primary and secondary users keep candidate access';

  -- A secondary user of a pending business follows the pending rule.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF public.user_has_approved_business() THEN
    RAISE EXCEPTION 'FAIL: pending secondary user passes user_has_approved_business()';
  END IF;
  RESET ROLE;

  -------------------------------------------------------------------------
  -- D. toggle_candidate_shortlist
  -------------------------------------------------------------------------
  FOR p IN
    SELECT * FROM (VALUES
      ('pending',  '00000000-0000-0000-0000-0000000000b1', pending_biz),
      ('pending secondary', '00000000-0000-0000-0000-0000000000b2', pending_biz),
      ('rejected', '00000000-0000-0000-0000-0000000000c1', rejected_biz)
    ) AS v(persona, uid, biz)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', p.uid, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p.uid, 'role', 'authenticated')::TEXT, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    msg := NULL;
    BEGIN
      PERFORM public.toggle_candidate_shortlist(p.biz, gen_random_uuid(), false);
    EXCEPTION WHEN OTHERS THEN
      msg := SQLERRM;
    END;
    RESET ROLE;
    IF msg IS DISTINCT FROM 'business_not_approved' THEN
      RAISE EXCEPTION 'FAIL: toggle_candidate_shortlist for % business returned %', p.persona, COALESCE(msg, 'success');
    END IF;
  END LOOP;

  -- Approved business passes the gate (unknown candidate -> candidate_already_claimed).
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  msg := NULL;
  BEGIN
    PERFORM public.toggle_candidate_shortlist(approved_biz, gen_random_uuid(), false);
  EXCEPTION WHEN OTHERS THEN
    msg := SQLERRM;
  END;
  RESET ROLE;
  IF msg = 'business_not_approved' OR msg = 'business_not_found' THEN
    RAISE EXCEPTION 'FAIL: approved secondary user blocked by toggle_candidate_shortlist: %', msg;
  END IF;
  RAISE NOTICE 'OK: toggle_candidate_shortlist rejects pending/rejected, allows approved';

  -------------------------------------------------------------------------
  -- E. A business cannot approve itself / insert approved rows / take ownership
  -------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    UPDATE public.businesses SET status = 'approved' WHERE id = pending_biz;
    RAISE EXCEPTION 'FAIL: pending owner could UPDATE status';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.businesses (user_id, name, "contact email", status)
    VALUES ('00000000-0000-0000-0000-0000000000b1', 'x', 'x@example.test', 'approved');
    RAISE EXCEPTION 'FAIL: user could INSERT an approved business';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.businesses SET user_id = '00000000-0000-0000-0000-0000000000e1' WHERE id = pending_biz;
    RAISE EXCEPTION 'FAIL: user could change business owner';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Pending/rejected users must still be able to read their own business row
  -- (BusinessGate relies on it to show the review/rejected screens).
  SELECT count(*) INTO n FROM public.businesses WHERE id = pending_biz AND status = 'pending';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: pending owner cannot read their own business row';
  END IF;

  UPDATE public.businesses SET name = 'Gate Pending Renamed' WHERE id = pending_biz;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: owner can no longer update ordinary business fields (check businesses UPDATE policy)';
  END IF;
  RESET ROLE;

  SELECT status INTO new_status FROM public.businesses WHERE id = pending_biz;
  IF new_status <> 'pending' THEN
    RAISE EXCEPTION 'FAIL: pending business status changed to %', new_status;
  END IF;
  RAISE NOTICE 'OK: businesses cannot approve themselves or insert approved rows';

  -------------------------------------------------------------------------
  -- F. Non-admins cannot call admin functions
  -------------------------------------------------------------------------
  FOR p IN
    SELECT * FROM (VALUES
      ('pending',  '00000000-0000-0000-0000-0000000000b1'),
      ('approved', '00000000-0000-0000-0000-0000000000d1'),
      ('plain',    '00000000-0000-0000-0000-0000000000e1')
    ) AS v(persona, uid)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', p.uid, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p.uid, 'role', 'authenticated')::TEXT, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    msg := NULL;
    BEGIN PERFORM public.admin_set_business_status(pending_biz, 'approved');
    EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
    IF msg IS DISTINCT FROM 'not_authorized' THEN
      RAISE EXCEPTION 'FAIL: % could call admin_set_business_status (%)', p.persona, COALESCE(msg, 'success');
    END IF;

    msg := NULL;
    BEGIN PERFORM * FROM public.admin_list_pending_businesses();
    EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
    IF msg IS DISTINCT FROM 'not_authorized' THEN
      RAISE EXCEPTION 'FAIL: % could call admin_list_pending_businesses (%)', p.persona, COALESCE(msg, 'success');
    END IF;

    msg := NULL;
    BEGIN PERFORM public.admin_create_business('gate-new@example.test', 'Nope');
    EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
    IF msg IS DISTINCT FROM 'not_authorized' THEN
      RAISE EXCEPTION 'FAIL: % could call admin_create_business (%)', p.persona, COALESCE(msg, 'success');
    END IF;

    RESET ROLE;
  END LOOP;
  RAISE NOTICE 'OK: non-admins cannot call admin functions';

  -------------------------------------------------------------------------
  -- G. Admin flows
  -------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO n FROM public.admin_list_pending_businesses() WHERE id = pending_biz;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: admin cannot list the pending test business'; END IF;

  PERFORM public.admin_set_business_status(pending_biz, 'approved');
  RESET ROLE;

  SELECT status, status_changed_by INTO new_status, changed_by FROM public.businesses WHERE id = pending_biz;
  IF new_status <> 'approved' OR changed_by <> '00000000-0000-0000-0000-0000000000a1'
     OR (SELECT status_changed_at FROM public.businesses WHERE id = pending_biz) IS NULL THEN
    RAISE EXCEPTION 'FAIL: admin_set_business_status did not record status/changed_by/changed_at';
  END IF;

  -- Existing user -> approved business in one step.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  new_id := public.admin_create_business('GATE-PLAIN2@example.test', 'Created By Admin');
  RESET ROLE;
  SELECT status INTO new_status FROM public.businesses WHERE id = new_id;
  IF new_status <> 'approved' THEN RAISE EXCEPTION 'FAIL: admin_create_business did not create an approved business'; END IF;

  -- New auth user path (writes auth.users/auth.identities; see APPROVAL_GATE.md).
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.admin_create_business('gate-brand-new@example.test', 'Brand New');
    RESET ROLE;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'gate-brand-new@example.test') THEN
      RAISE EXCEPTION 'auth user not created';
    END IF;
    RAISE NOTICE 'OK: admin_create_business created a new auth user';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RAISE WARNING 'admin_create_business new-user path failed (%): use the manual route in supabase/APPROVAL_GATE.md', SQLERRM;
  END;
  RAISE NOTICE 'OK: admin flows';

  -------------------------------------------------------------------------
  -- H. register_business
  -------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  msg := NULL;
  BEGIN PERFORM public.register_business('A', 'Jo', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  IF msg IS DISTINCT FROM 'invalid_business_details' THEN RAISE EXCEPTION 'FAIL: short name accepted (%)', msg; END IF;

  msg := NULL;
  BEGIN PERFORM public.register_business(repeat('x', 121), 'Jo', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  IF msg IS DISTINCT FROM 'invalid_business_details' THEN RAISE EXCEPTION 'FAIL: over-long name accepted (%)', msg; END IF;

  msg := NULL;
  BEGIN PERFORM public.register_business('Shop', 'Jo', 'not a phone', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  IF msg IS DISTINCT FROM 'invalid_whatsapp_number' THEN RAISE EXCEPTION 'FAIL: bad phone accepted (%)', msg; END IF;

  msg := NULL;
  BEGIN PERFORM public.register_business('Shop', 'Jo', '0821234567', 'Cape Town', 0, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  IF msg IS DISTINCT FROM 'invalid_number_of_sites' THEN RAISE EXCEPTION 'FAIL: 0 sites accepted (%)', msg; END IF;

  msg := NULL;
  BEGIN PERFORM public.register_business('Shop', 'Jo', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, false);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  IF msg IS DISTINCT FROM 'terms_not_accepted' THEN RAISE EXCEPTION 'FAIL: missing fee acceptance accepted (%)', msg; END IF;

  new_id := public.register_business('New Shop', 'Jo Soap', '+27 82 123 4567', 'Cape Town', 2, 'Cashier, cook', '@newshop', 'v1', true, true);
  RESET ROLE;

  SELECT status INTO new_status FROM public.businesses
  WHERE id = new_id AND user_id = '00000000-0000-0000-0000-0000000000e1'
    AND "contact email" = 'gate-plain@example.test' AND terms_accepted_at IS NOT NULL AND terms_version = 'v1';
  IF new_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'FAIL: register_business did not create a pending row owned by the caller (%)', new_status;
  END IF;

  -- Pending sign-up sees nothing yet.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.candidates' INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: freshly registered business can see candidates'; END IF;

  -- Second registration, and registration by a secondary/assigned user, are refused.
  msg := NULL;
  BEGIN PERFORM public.register_business('Again', 'Jo Soap', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  RESET ROLE;
  IF msg IS DISTINCT FROM 'business_already_exists' THEN RAISE EXCEPTION 'FAIL: duplicate registration allowed (%)', msg; END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  msg := NULL;
  BEGIN PERFORM public.register_business('Again', 'Jo Soap', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN OTHERS THEN msg := SQLERRM; END;
  RESET ROLE;
  IF msg IS DISTINCT FROM 'business_already_exists' THEN RAISE EXCEPTION 'FAIL: assigned secondary user could register (%)', msg; END IF;

  -- Unauthenticated callers cannot execute it at all.
  EXECUTE 'SET LOCAL ROLE anon';
  msg := NULL;
  BEGIN PERFORM public.register_business('Anon', 'Jo Soap', '0821234567', 'Cape Town', 1, 'Cashier', NULL, 'v1', true, true);
  EXCEPTION WHEN insufficient_privilege THEN msg := 'denied'; END;
  RESET ROLE;
  IF msg IS DISTINCT FROM 'denied' THEN RAISE EXCEPTION 'FAIL: anon could call register_business'; END IF;
  RAISE NOTICE 'OK: register_business';
END
$$;

SELECT 'ALL APPROVAL GATE CHECKS PASSED' AS result;

ROLLBACK;
