BEGIN;

ALTER TABLE public.businesses
  ADD COLUMN secondary_user_id UUID NULL;

CREATE UNIQUE INDEX businesses_secondary_user_id_unique
  ON public.businesses (secondary_user_id)
  WHERE secondary_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.user_can_access_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND (user_id = auth.uid() OR secondary_user_id = auth.uid())
  );
$$;

REVOKE ALL
ON FUNCTION public.user_can_access_business(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.user_can_access_business(UUID)
TO authenticated;

-- Businesses: both assigned users may read/update the business. Only the
-- primary owner may create a new business row.
DROP POLICY IF EXISTS "Users can view their own business"
  ON public.businesses;

CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (public.user_can_access_business(id));

DROP POLICY IF EXISTS "Users can insert their own business"
  ON public.businesses;

CREATE POLICY "Users can insert their own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business"
  ON public.businesses;

CREATE POLICY "Users can update their own business"
  ON public.businesses FOR UPDATE
  USING (public.user_can_access_business(id))
  WITH CHECK (
    user_id = (SELECT b.user_id FROM public.businesses b WHERE b.id = businesses.id)
    AND (
      secondary_user_id IS NULL
      OR secondary_user_id = (SELECT b.secondary_user_id FROM public.businesses b WHERE b.id = businesses.id)
      OR public.user_can_access_business(id)
    )
  );

-- Needs.
DROP POLICY IF EXISTS "Users can view needs for their businesses"
  ON public.needs;

CREATE POLICY "Users can view needs for their businesses"
  ON public.needs FOR SELECT
  USING (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can insert needs for their businesses"
  ON public.needs;

CREATE POLICY "Users can insert needs for their businesses"
  ON public.needs FOR INSERT
  WITH CHECK (public.user_can_access_business(business_id));

-- Candidate visibility for employer allocations.
DROP POLICY IF EXISTS "Users can view candidates allocated to their business"
  ON public.candidates;

CREATE POLICY "Users can view candidates allocated to their business"
  ON public.candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.candidate_allocations ca
      WHERE ca.candidate_id = candidates.id
        AND ca.status IN ('shortlisted', 'placed', 'confirmed')
        AND public.user_can_access_business(ca.business_id)
    )
  );

-- Candidate allocations.
DROP POLICY IF EXISTS "Users can view allocations for their business"
  ON public.candidate_allocations;

CREATE POLICY "Users can view allocations for their business"
  ON public.candidate_allocations FOR SELECT
  USING (
    business_id IS NULL OR public.user_can_access_business(business_id)
  );

DROP POLICY IF EXISTS "Users can update allocations for their business"
  ON public.candidate_allocations;

CREATE POLICY "Users can update allocations for their business"
  ON public.candidate_allocations FOR UPDATE
  USING (public.user_can_access_business(business_id))
  WITH CHECK (
    business_id IS NULL OR public.user_can_access_business(business_id)
  );

-- Placements.
DROP POLICY IF EXISTS "Users can view placements for their business"
  ON public.placements;

CREATE POLICY "Users can view placements for their business"
  ON public.placements FOR SELECT
  USING (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can insert placements for their business"
  ON public.placements;

CREATE POLICY "Users can insert placements for their business"
  ON public.placements FOR INSERT
  WITH CHECK (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can update placements for their business"
  ON public.placements;

CREATE POLICY "Users can update placements for their business"
  ON public.placements FOR UPDATE
  USING (public.user_can_access_business(business_id))
  WITH CHECK (public.user_can_access_business(business_id));

-- Business activity.
DROP POLICY IF EXISTS "Users can view activity for their business"
  ON public.business_activity;

CREATE POLICY "Users can view activity for their business"
  ON public.business_activity FOR SELECT
  USING (public.user_can_access_business(business_id));

DROP POLICY IF EXISTS "Users can insert activity for their business"
  ON public.business_activity;

CREATE POLICY "Users can insert activity for their business"
  ON public.business_activity FOR INSERT
  WITH CHECK (public.user_can_access_business(business_id));

-- Shortlist RPC.
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

COMMIT;
