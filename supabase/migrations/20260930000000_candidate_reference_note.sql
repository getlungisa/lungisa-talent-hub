-- Add an optional reference note field to candidates, following the same
-- nullable-text + authenticated-select pattern used for strengths_summary.

BEGIN;

ALTER TABLE public.candidates
  ADD COLUMN reference_note TEXT NULL;

GRANT SELECT
ON public.candidates
TO authenticated;

COMMIT;
