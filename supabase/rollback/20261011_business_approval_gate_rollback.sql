-- Roll back the business approval gate. Run manually only.
-- WARNING: dropping the new businesses columns permanently deletes the sign-up
-- details (and pending/rejected status). Back them up first if needed. Any
-- pending/rejected businesses become ordinary (unrestricted) businesses again.
-- Table-level businesses privileges are restored to authenticated (the
-- pre-migration state assumed by the repository migrations).

BEGIN;

DROP FUNCTION IF EXISTS public.admin_create_business(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_list_pending_businesses();
DROP FUNCTION IF EXISTS public.admin_set_business_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.register_business(
  TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN
);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'candidates', 'candidate_allocations', 'placements', 'shortlists',
    'business_activity', 'candidate_references', 'verification_stages',
    'signals', 'behavioural_tasks', 'retention_tracking'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Approved business required" ON public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- Restore the pre-gate toggle_candidate_shortlist (shortlist redesign version).
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

DROP FUNCTION IF EXISTS public.user_can_access_approved_business(UUID);
DROP FUNCTION IF EXISTS public.user_has_approved_business();
DROP FUNCTION IF EXISTS public.current_user_is_admin();
DROP TABLE IF EXISTS public.user_flags;

-- Restore direct business privileges and the original INSERT policy.
REVOKE UPDATE ON TABLE public.businesses FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.businesses TO authenticated;

CREATE POLICY "Users can insert their own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_status_check,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS whatsapp_number,
  DROP COLUMN IF EXISTS area,
  DROP COLUMN IF EXISTS number_of_sites,
  DROP COLUMN IF EXISTS roles_hired,
  DROP COLUMN IF EXISTS website_or_social,
  DROP COLUMN IF EXISTS terms_accepted_at,
  DROP COLUMN IF EXISTS terms_version,
  DROP COLUMN IF EXISTS status_changed_at,
  DROP COLUMN IF EXISTS status_changed_by;

COMMIT;
