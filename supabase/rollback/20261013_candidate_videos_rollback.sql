-- Remove all objects from candidate-videos through the Storage dashboard first.
-- WARNING: dropping video_path permanently deletes its values.
BEGIN;

DROP POLICY IF EXISTS "Approved businesses can read candidate videos" ON storage.objects;
DROP POLICY IF EXISTS "Candidate videos require approved business" ON storage.objects;
DROP POLICY IF EXISTS "Candidate videos cannot be inserted by clients" ON storage.objects;
DROP POLICY IF EXISTS "Candidate videos cannot be updated by clients" ON storage.objects;
DROP POLICY IF EXISTS "Candidate videos cannot be deleted by clients" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'candidate-videos';

ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_video_path_check,
  DROP COLUMN IF EXISTS video_path;

COMMIT;
