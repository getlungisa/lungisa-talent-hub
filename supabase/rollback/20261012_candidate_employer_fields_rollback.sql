-- Rollback for 20261012000000_candidate_employer_fields.sql
-- WARNING: permanently deletes any data entered in these columns.

BEGIN;

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_trained_on_max_length,
  DROP CONSTRAINT IF EXISTS candidates_work_history_max_length,
  DROP CONSTRAINT IF EXISTS candidates_proud_of_max_length,
  DROP COLUMN IF EXISTS trained_on,
  DROP COLUMN IF EXISTS work_history,
  DROP COLUMN IF EXISTS proud_of;

COMMIT;
