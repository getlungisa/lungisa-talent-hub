BEGIN;

CREATE TABLE public.shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT shortlists_business_candidate_unique UNIQUE (business_id, candidate_id)
);

ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.shortlists FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.shortlists TO authenticated;

CREATE POLICY "Businesses can view their shortlists"
  ON public.shortlists FOR SELECT TO authenticated
  USING (public.user_can_access_business(business_id));

INSERT INTO public.shortlists (business_id, candidate_id, created_at)
SELECT DISTINCT ON (business_id, candidate_id)
  business_id,
  candidate_id,
  created_at
FROM public.candidate_allocations
WHERE status = 'shortlisted'
  AND business_id IS NOT NULL
ORDER BY business_id, candidate_id, created_at;

UPDATE public.candidate_allocations
SET
  status = 'available',
  business_id = NULL,
  allocated_at = NULL,
  need_id = NULL,
  updated_at = now()
WHERE status = 'shortlisted';

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

COMMIT;