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
  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'business_not_found'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_currently_shortlisted THEN
    UPDATE public.candidate_allocations
    SET
      status = 'available',
      business_id = NULL,
      allocation_date = NULL,
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
    allocation_date = now(),
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
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.toggle_candidate_shortlist(UUID, UUID, BOOLEAN)
TO authenticated;
