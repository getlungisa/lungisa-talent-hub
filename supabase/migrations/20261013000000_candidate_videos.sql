BEGIN;

ALTER TABLE public.candidates
  ADD COLUMN video_path TEXT NULL,
  ADD CONSTRAINT candidates_video_path_check CHECK (
    char_length(video_path) <= 200
    AND left(video_path, 1) <> '/'
    AND position('..' IN video_path) = 0
  );

GRANT SELECT (video_path) ON public.candidates TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('candidate-videos', 'candidate-videos', false, 52428800, ARRAY['video/mp4', 'video/quicktime']);

CREATE POLICY "Approved businesses can read candidate videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'candidate-videos' AND public.user_has_approved_business());

-- Restrictive policies also guard against broader existing storage policies.
CREATE POLICY "Candidate videos require approved business"
ON storage.objects AS RESTRICTIVE FOR SELECT TO public
USING (
  bucket_id <> 'candidate-videos'
  OR (auth.role() = 'authenticated' AND public.user_has_approved_business())
);

CREATE POLICY "Candidate videos cannot be inserted by clients"
ON storage.objects AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (bucket_id <> 'candidate-videos');

CREATE POLICY "Candidate videos cannot be updated by clients"
ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
USING (bucket_id <> 'candidate-videos')
WITH CHECK (bucket_id <> 'candidate-videos');

CREATE POLICY "Candidate videos cannot be deleted by clients"
ON storage.objects AS RESTRICTIVE FOR DELETE TO public
USING (bucket_id <> 'candidate-videos');

COMMIT;
