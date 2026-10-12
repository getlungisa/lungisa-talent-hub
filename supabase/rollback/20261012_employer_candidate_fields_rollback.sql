BEGIN;

ALTER TABLE public.candidates
  DROP COLUMN IF EXISTS trained_on,
  DROP COLUMN IF EXISTS work_history,
  DROP COLUMN IF EXISTS proud_of;

COMMIT;
