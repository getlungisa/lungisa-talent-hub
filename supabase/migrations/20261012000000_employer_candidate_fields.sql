BEGIN;

ALTER TABLE public.candidates
  ADD COLUMN trained_on TEXT NULL,
  ADD COLUMN work_history TEXT NULL,
  ADD COLUMN proud_of TEXT NULL,
  ADD CONSTRAINT candidates_trained_on_length_check
    CHECK (trained_on IS NULL OR char_length(trained_on) <= 300),
  ADD CONSTRAINT candidates_work_history_length_check
    CHECK (work_history IS NULL OR char_length(work_history) <= 400),
  ADD CONSTRAINT candidates_proud_of_length_check
    CHECK (proud_of IS NULL OR char_length(proud_of) <= 200);

GRANT SELECT (trained_on, work_history, proud_of)
ON public.candidates
TO authenticated;

COMMIT;
