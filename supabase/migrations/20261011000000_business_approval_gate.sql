-- Self-serve business sign-up with an approval gate.
--
-- * businesses.status (pending | approved | rejected); all existing rows -> approved
-- * user_flags.is_admin (not readable/writable by anon/authenticated)
-- * user_has_approved_business() helper + RESTRICTIVE policies on every
--   candidate-derived table, so every existing (and live-only) permissive
--   policy is additionally ANDed with "caller has an approved business"
-- * toggle_candidate_shortlist requires an approved business
-- * register_business / admin_set_business_status / admin_list_pending_businesses
--   / admin_create_business SECURITY DEFINER functions
--
-- See supabase/APPROVAL_GATE.md for the access matrix and open questions.

BEGIN;

-- Preflight: the deployed column is the quoted "contact email" (not contact_email).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'businesses'
      AND column_name = 'contact email'
  ) THEN
    RAISE EXCEPTION 'public.businesses."contact email" column not found; reconcile the deployed schema before running this migration';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1. businesses: status + sign-up columns
-- ---------------------------------------------------------------------------

-- Existing rows are backfilled as approved by adding the column with an
-- 'approved' default, then switching the default to 'pending' for new rows.
ALTER TABLE public.businesses
  ADD COLUMN status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN contact_name TEXT NULL,
  ADD COLUMN whatsapp_number TEXT NULL,
  ADD COLUMN area TEXT NULL,
  ADD COLUMN number_of_sites INTEGER NULL,
  ADD COLUMN roles_hired TEXT NULL,
  ADD COLUMN website_or_social TEXT NULL,
  ADD COLUMN terms_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN terms_version TEXT NULL,
  ADD COLUMN status_changed_at TIMESTAMPTZ NULL,
  ADD COLUMN status_changed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.businesses
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX businesses_status_idx ON public.businesses (status);

-- ---------------------------------------------------------------------------
-- 2. Admin flag
-- ---------------------------------------------------------------------------
-- The repository has no profile table, so the flag lives in its own table.
-- No privileges are granted to anon/authenticated and RLS is enabled with no
-- policies: normal users cannot select or update it. Set it manually, e.g.
--   INSERT INTO public.user_flags (user_id, is_admin)
--   VALUES ('<your auth.users id>', true)
--   ON CONFLICT (user_id) DO UPDATE SET is_admin = true;

CREATE TABLE public.user_flags (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.user_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_flags FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_flags
    WHERE user_id = auth.uid()
      AND is_admin
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- True when the caller is the primary or secondary user of an approved business.
CREATE OR REPLACE FUNCTION public.user_has_approved_business()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE status = 'approved'
      AND (user_id = auth.uid() OR secondary_user_id = auth.uid())
  );
$$;

-- anon needs EXECUTE only because the restrictive policies below apply to every
-- role; for anon the function simply returns false (auth.uid() is NULL).
REVOKE ALL ON FUNCTION public.user_has_approved_business() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_approved_business() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_approved_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND status = 'approved'
      AND (user_id = auth.uid() OR secondary_user_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_approved_business(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_approved_business(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Approved-business gate on every candidate-derived table
-- ---------------------------------------------------------------------------
-- A RESTRICTIVE policy is ANDed with all permissive policies, including the
-- live-only ones (training-partner visibility, can_view_allocation_by_*, ...),
-- so none of them can expose candidate data to a pending/rejected business.
-- Training partners are businesses (businesses.is_training_partner), so their
-- access is preserved while their business is approved (all existing rows are).
-- SECURITY DEFINER functions run as the table owner and are gated explicitly.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'candidates',
    'candidate_allocations',
    'placements',
    'shortlists',
    'business_activity',
    'candidate_references',
    'verification_stages',
    'signals',
    'behavioural_tasks',
    'retention_tracking'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'public.% does not exist in this database; skipped (verify on live)', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Approved business required" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Approved business required" ON public.%I AS RESTRICTIVE FOR ALL TO public '
      'USING (public.user_has_approved_business()) '
      'WITH CHECK (public.user_has_approved_business())',
      t
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. toggle_candidate_shortlist requires an approved business
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_candidate_shortlist(
  p_business_id UUID,
  p_candidate_id UUID,
  p_currently_shortlisted BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allocation_status TEXT;
BEGIN
  IF NOT public.user_can_access_business(p_business_id) THEN
    RAISE EXCEPTION 'business_not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.user_can_access_approved_business(p_business_id) THEN
    RAISE EXCEPTION 'business_not_approved'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_currently_shortlisted THEN
    DELETE FROM public.shortlists
    WHERE business_id = p_business_id
      AND candidate_id = p_candidate_id;

    RETURN FALSE;
  END IF;

  SELECT status
  INTO allocation_status
  FROM public.candidate_allocations
  WHERE candidate_id = p_candidate_id
  FOR UPDATE;

  IF allocation_status IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'candidate_already_claimed'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.shortlists (business_id, candidate_id)
  VALUES (p_business_id, p_candidate_id)
  ON CONFLICT (business_id, candidate_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL
ON FUNCTION public.toggle_candidate_shortlist(UUID, UUID, BOOLEAN)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.toggle_candidate_shortlist(UUID, UUID, BOOLEAN)
TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Users can no longer create businesses or touch status/ownership directly
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert their own business"
  ON public.businesses;

REVOKE INSERT, DELETE ON TABLE public.businesses FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.businesses FROM PUBLIC, anon, authenticated;

-- Only ordinary profile columns remain updatable. status, status_changed_*,
-- terms_*, user_id and is_training_partner are not (secondary_user_id stays
-- updatable; prevent_business_owner_change() still restricts it to the owner).
GRANT UPDATE (
  name,
  "contact email",
  location,
  secondary_user_id,
  contact_name,
  whatsapp_number,
  area,
  number_of_sites,
  roles_hired,
  website_or_social
) ON TABLE public.businesses TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. register_business: self-serve sign-up (always status = 'pending')
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_business(
  p_business_name TEXT,
  p_contact_name TEXT,
  p_whatsapp_number TEXT,
  p_area TEXT,
  p_number_of_sites INTEGER,
  p_roles_hired TEXT,
  p_website_or_social TEXT,
  p_terms_version TEXT,
  p_terms_accepted BOOLEAN,
  p_fee_accepted BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_name TEXT := btrim(p_business_name);
  v_contact TEXT := btrim(p_contact_name);
  v_whatsapp TEXT := btrim(p_whatsapp_number);
  v_area TEXT := btrim(p_area);
  v_roles TEXT := btrim(p_roles_hired);
  v_web TEXT := NULLIF(btrim(COALESCE(p_website_or_social, '')), '');
  v_version TEXT := btrim(p_terms_version);
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120
     OR v_contact IS NULL OR char_length(v_contact) NOT BETWEEN 2 AND 100
     OR v_area IS NULL OR char_length(v_area) NOT BETWEEN 2 AND 100
     OR v_roles IS NULL OR char_length(v_roles) NOT BETWEEN 2 AND 300
     OR (v_web IS NOT NULL AND char_length(v_web) > 200)
     OR v_name ~ '[[:cntrl:]]' OR v_contact ~ '[[:cntrl:]]'
     OR v_area ~ '[[:cntrl:]]' OR v_roles ~ '[[:cntrl:]]'
     OR v_web ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'invalid_business_details' USING ERRCODE = '22023';
  END IF;

  IF v_whatsapp IS NULL OR v_whatsapp !~ '^\+?[0-9 ()-]{7,20}$' THEN
    RAISE EXCEPTION 'invalid_whatsapp_number' USING ERRCODE = '22023';
  END IF;

  IF p_number_of_sites IS NULL OR p_number_of_sites NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'invalid_number_of_sites' USING ERRCODE = '22023';
  END IF;

  IF v_version IS NULL OR v_version !~ '^[A-Za-z0-9._-]{1,40}$' THEN
    RAISE EXCEPTION 'invalid_terms_version' USING ERRCODE = '22023';
  END IF;

  IF p_terms_accepted IS NOT TRUE OR p_fee_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'terms_not_accepted' USING ERRCODE = '22023';
  END IF;

  -- Serialise concurrent sign-ups for the same user.
  PERFORM pg_advisory_xact_lock(hashtext('register_business:' || v_uid::TEXT));

  IF EXISTS (
    SELECT 1 FROM public.businesses
    WHERE user_id = v_uid OR secondary_user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'business_already_exists' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL OR char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.businesses (
    user_id, name, "contact email", contact_name, whatsapp_number, area,
    number_of_sites, roles_hired, website_or_social, status,
    terms_accepted_at, terms_version
  )
  VALUES (
    v_uid, v_name, v_email, v_contact, v_whatsapp, v_area,
    p_number_of_sites, v_roles, v_web, 'pending',
    now(), v_version
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_business(
  TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_business(
  TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Admin-only functions (is_admin is checked inside each function)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_business_status(
  p_business_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses
  SET status = p_status,
      status_changed_at = now(),
      status_changed_by = auth.uid()
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_business_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_business_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_pending_businesses()
RETURNS TABLE (
  id UUID,
  name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  whatsapp_number TEXT,
  area TEXT,
  number_of_sites INTEGER,
  roles_hired TEXT,
  website_or_social TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT b.id, b.name, b.contact_name, b."contact email", b.whatsapp_number,
         b.area, b.number_of_sites, b.roles_hired, b.website_or_social,
         b.created_at
  FROM public.businesses b
  WHERE b.status = 'pending'
  ORDER BY b.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pending_businesses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_businesses() TO authenticated;

-- Creates an approved business for an existing auth user, or for a new one.
-- Creating an auth user from SQL writes to auth.users / auth.identities, which
-- only works because this function is SECURITY DEFINER (owner privileges); the
-- admin check below is therefore the only gate. If your GoTrue version rejects
-- the insert, create the user in Dashboard > Authentication > Add user and call
-- this function again (it then takes the "existing user" path).
CREATE OR REPLACE FUNCTION public.admin_create_business(
  p_email TEXT,
  p_business_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT := lower(btrim(p_email));
  v_name TEXT := btrim(p_business_name);
  v_user_id UUID;
  v_business_id UUID;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF v_email IS NULL OR char_length(v_email) > 254
     OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;

  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120
     OR v_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'invalid_business_details' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated',
      'authenticated', v_email, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_user_id, v_user_id::TEXT, 'email',
      jsonb_build_object('sub', v_user_id::TEXT, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  ELSIF EXISTS (
    SELECT 1 FROM public.businesses
    WHERE user_id = v_user_id OR secondary_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'business_already_exists' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.businesses (
    user_id, name, "contact email", status, status_changed_at, status_changed_by
  )
  VALUES (v_user_id, v_name, v_email, 'approved', now(), auth.uid())
  RETURNING id INTO v_business_id;

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_business(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_business(TEXT, TEXT) TO authenticated;

COMMIT;
