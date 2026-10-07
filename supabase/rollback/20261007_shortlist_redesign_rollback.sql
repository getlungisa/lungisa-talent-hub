-- Restore the live exclusive-shortlist RPC and remove the redesigned shortlist table.
-- Run manually only when rolling back the shortlist redesign.

BEGIN;

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
  affected_rows INTEGER;
BEGIN
  IF NOT public.user_can_access_business(p_business_id) THEN
    RAISE EXCEPTION 'business_not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_currently_shortlisted THEN
    UPDATE public.candidate_allocations
    SET
      status = 'available',
      business_id = NULL,
      allocated_at = NULL,
      updated_at = now()
    WHERE candidate_id = p_candidate_id
      AND business_id = p_business_id
      AND status = 'shortlisted';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
      RAISE EXCEPTION 'candidate_already_claimed'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN FALSE;
  END IF;

  UPDATE public.candidate_allocations
  SET
    status = 'shortlisted',
    business_id = p_business_id,
    allocated_at = now(),
    updated_at = now()
  WHERE candidate_id = p_candidate_id
    AND status = 'available'
    AND business_id IS NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'candidate_already_claimed'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL
ON FUNCTION public.toggle_candidate_shortlist(UUID, UUID, BOOLEAN)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.toggle_candidate_shortlist(UUID, UUID, BOOLEAN)
TO authenticated;

DROP TABLE IF EXISTS public.shortlists;

COMMIT;
