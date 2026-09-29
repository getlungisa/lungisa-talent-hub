-- Rollback for the secondary_user_id business-access workaround.
--
-- This script restores the policies and function to their exact definitions
-- from the pre-workaround state, then removes the workaround schema objects.
-- It does not assign or modify any secondary_user_id values before removal.

BEGIN;

-- Restore businesses policies.
DROP POLICY IF EXISTS "Users can view their own business"
  ON public.businesses;

CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own business"
  ON public.businesses;

CREATE POLICY "Users can insert their own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business"
  ON public.businesses;

CREATE POLICY "Users can update their own business"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

-- Restore needs policies.
DROP POLICY IF EXISTS "Users can view needs for their businesses"
  ON public.needs;

CREATE POLICY "Users can view needs for their businesses"
  ON public.needs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = needs.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert needs for their businesses"
  ON public.needs;

CREATE POLICY "Users can insert needs for their businesses"
  ON public.needs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = needs.business_id AND b.user_id = auth.uid()
  ));

-- Restore the employer-side candidate visibility policy.
DROP POLICY IF EXISTS "Users can view candidates allocated to their business"
  ON public.candidates;

CREATE POLICY "Users can view candidates allocated to their business"
  ON public.candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_allocations ca
      JOIN public.businesses b ON ca.business_id = b.id
      WHERE ca.candidate_id = candidates.id 
        AND ca.status IN ('shortlisted', 'placed', 'confirmed')
        AND b.user_id = auth.uid()
    )
  );

-- Restore candidate_allocations policies.
DROP POLICY IF EXISTS "Users can view allocations for their business"
  ON public.candidate_allocations;

CREATE POLICY "Users can view allocations for their business"
  ON public.candidate_allocations FOR SELECT
  USING (
    business_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update allocations for their business"
  ON public.candidate_allocations;

CREATE POLICY "Users can update allocations for their business"
  ON public.candidate_allocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- Restore placements policies.
DROP POLICY IF EXISTS "Users can view placements for their business"
  ON public.placements;

CREATE POLICY "Users can view placements for their business"
  ON public.placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert placements for their business"
  ON public.placements;

CREATE POLICY "Users can insert placements for their business"
  ON public.placements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update placements for their business"
  ON public.placements;

CREATE POLICY "Users can update placements for their business"
  ON public.placements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- Restore business_activity policies.
DROP POLICY IF EXISTS "Users can view activity for their business"
  ON public.business_activity;

CREATE POLICY "Users can view activity for their business"
  ON public.business_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert activity for their business"
  ON public.business_activity;

CREATE POLICY "Users can insert activity for their business"
  ON public.business_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- Restore the exact pre-workaround shortlist function.
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

-- Remove workaround objects after all dependent policies/functions have been restored.
DROP FUNCTION IF EXISTS public.user_can_access_business(UUID);
DROP INDEX IF EXISTS public.businesses_secondary_user_id_unique;
ALTER TABLE public.businesses
DROP COLUMN IF EXISTS secondary_user_id;

COMMIT;
