-- Run AFTER 20261012000000_candidate_employer_fields.sql as a privileged role
-- (Supabase SQL Editor). Fixtures live in one transaction that ends in
-- ROLLBACK. Checks: pending business sees no candidates; approved business
-- sees the new columns; neither can read whatsapp_number (if the column exists).

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'cef-pending@example.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'cef-approved@example.test');

INSERT INTO public.businesses (id, user_id, name, "contact email", status) VALUES
  ('00000000-0000-0000-0000-00000000f0b1', '00000000-0000-0000-0000-0000000000b1', 'CEF Pending',  'cef-pending@example.test',  'pending'),
  ('00000000-0000-0000-0000-00000000f0d1', '00000000-0000-0000-0000-0000000000d1', 'CEF Approved', 'cef-approved@example.test', 'approved');

DO $$
DECLARE
  n BIGINT;
  cid UUID;
  has_wa BOOLEAN;
  denied BOOLEAN;
BEGIN
  -- Fixture candidate with the new fields. Adjust if your live table has
  -- extra NOT NULL columns.
  INSERT INTO public.candidates (name, whatsapp_number, trained_on, work_history, proud_of)
  VALUES ('CEF Test', '0000000000', 'Barista course', '2 yrs, Cafe X', 'Finished my course')
  RETURNING id INTO cid;
  INSERT INTO public.candidate_allocations (candidate_id, status)
  VALUES (cid, 'available')
  ON CONFLICT (candidate_id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='candidates'
                   AND column_name='whatsapp_number') INTO has_wa;

  -- Pending business: sees nothing.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.candidates;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: pending business sees % candidates', n; END IF;
  RESET ROLE;

  -- Approved business: sees the new columns.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.candidates
  WHERE id = cid AND trained_on IS NOT NULL AND work_history IS NOT NULL AND proud_of IS NOT NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: approved business cannot read the new columns'; END IF;

  -- ...but not whatsapp_number.
  IF has_wa THEN
    denied := false;
    BEGIN
      EXECUTE 'SELECT whatsapp_number FROM public.candidates LIMIT 1';
    EXCEPTION WHEN insufficient_privilege THEN denied := true;
    END;
    IF NOT denied THEN
      RAISE EXCEPTION 'FAIL: approved business can read candidates.whatsapp_number';
    END IF;
  ELSE
    RAISE NOTICE 'candidates.whatsapp_number does not exist; skipped';
  END IF;
  RESET ROLE;

  -- Length limits.
  BEGIN
    UPDATE public.candidates SET proud_of = repeat('x', 201) WHERE id = cid;
    RAISE EXCEPTION 'FAIL: proud_of > 200 chars accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'OK: candidate employer fields checks';
END
$$;

SELECT 'CANDIDATE EMPLOYER FIELDS CHECKS PASSED' AS result;

ROLLBACK;
