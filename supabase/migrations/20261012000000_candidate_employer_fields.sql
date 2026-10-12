-- Optional employer-facing candidate fields, filled in via the Supabase table
-- editor. Nullable; length limits enforced by CHECK constraints.
--
-- Grants: the only role that can read employer-visible candidate columns is
-- `authenticated` (see 20260930000000_candidate_reference_note.sql), and rows
-- are only visible to approved businesses via the approval-gate RLS policies
-- (unchanged here). anon is deliberately NOT granted. No RLS/policy changes.

BEGIN;

ALTER TABLE public.candidates
  ADD COLUMN trained_on TEXT NULL,
  ADD COLUMN work_history TEXT NULL,
  ADD COLUMN proud_of TEXT NULL,
  ADD CONSTRAINT candidates_trained_on_max_length CHECK (char_length(trained_on) <= 300),
  ADD CONSTRAINT candidates_work_history_max_length CHECK (char_length(work_history) <= 400),
  ADD CONSTRAINT candidates_proud_of_max_length CHECK (char_length(proud_of) <= 200);

GRANT SELECT (trained_on, work_history, proud_of)
ON public.candidates
TO authenticated;

COMMIT;
