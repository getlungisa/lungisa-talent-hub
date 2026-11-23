-- Run after 20261013000000_candidate_videos.sql in the SQL editor.
-- Fixtures and deliberately broad policies are rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000b3', 'video-pending@example.test'),
  ('00000000-0000-0000-0000-0000000000d3', 'video-approved@example.test');
INSERT INTO public.businesses (id, user_id, name, "contact email", status) VALUES
  ('00000000-0000-0000-0000-00000000f0b3', '00000000-0000-0000-0000-0000000000b3', 'Video Pending', 'video-pending@example.test', 'pending'),
  ('00000000-0000-0000-0000-00000000f0d3', '00000000-0000-0000-0000-0000000000d3', 'Video Approved', 'video-approved@example.test', 'approved');

INSERT INTO storage.buckets (id, name, public) VALUES ('video-test-other', 'video-test-other', false);
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('candidate-videos', 'verification/intro.mp4'),
  ('video-test-other', 'verification/other.mp4');

-- Simulate pre-existing broad policies; the bucket restrictions must still hold.
CREATE POLICY "Video test broad select" ON storage.objects FOR SELECT TO public USING (true);
CREATE POLICY "Video test broad insert" ON storage.objects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Video test broad update" ON storage.objects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Video test broad delete" ON storage.objects FOR DELETE TO public USING (true);

DO $$
DECLARE
  cid UUID;
  n BIGINT;
  affected BIGINT;
  bad_path TEXT;
  role_name TEXT;
  claims TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'candidate-videos' AND public = false AND file_size_limit = 52428800
      AND allowed_mime_types = ARRAY['video/mp4', 'video/quicktime']
  ) THEN RAISE EXCEPTION 'FAIL: bucket configuration'; END IF;

  IF NOT has_column_privilege('authenticated', 'public.candidates', 'video_path', 'SELECT')
     OR has_column_privilege('anon', 'public.candidates', 'video_path', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: video_path grants';
  END IF;

  INSERT INTO public.candidates (name, whatsapp_number, entry_route, video_path)
  VALUES ('Video Test', '0000000000', 'training_school', 'verification/intro.mp4')
  RETURNING id INTO cid;
  INSERT INTO public.candidate_allocations (candidate_id, status)
  VALUES (cid, 'available') ON CONFLICT (candidate_id) DO NOTHING;

  FOREACH bad_path IN ARRAY ARRAY[repeat('x', 201), '/intro.mp4', 'candidate/../intro.mp4'] LOOP
    BEGIN
      UPDATE public.candidates SET video_path = bad_path WHERE id = cid;
      RAISE EXCEPTION 'FAIL: invalid path accepted: %', bad_path;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;
  UPDATE public.candidates SET video_path = repeat('x', 200) WHERE id = cid;
  UPDATE public.candidates SET video_path = NULL WHERE id = cid;
  UPDATE public.candidates SET video_path = 'verification/intro.mp4' WHERE id = cid;

  FOREACH role_name IN ARRAY ARRAY['anon', 'pending', 'approved'] LOOP
    claims := CASE role_name
      WHEN 'anon' THEN '{"role":"anon"}'
      WHEN 'pending' THEN '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}'
      ELSE '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}'
    END;
    PERFORM set_config('request.jwt.claims', claims, true);
    PERFORM set_config('request.jwt.claim.sub',
      CASE role_name WHEN 'anon' THEN '' WHEN 'pending' THEN '00000000-0000-0000-0000-0000000000b3'
      ELSE '00000000-0000-0000-0000-0000000000d3' END, true);
    IF role_name = 'anon' THEN
      EXECUTE 'SET LOCAL ROLE anon';
    ELSE
      EXECUTE 'SET LOCAL ROLE authenticated';
    END IF;

    SELECT count(*) INTO n FROM storage.objects
    WHERE bucket_id = 'candidate-videos' AND name = 'verification/intro.mp4';
    IF n <> (CASE WHEN role_name = 'approved' THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'FAIL: % sees % video objects', role_name, n;
    END IF;
    SELECT count(*) INTO n FROM storage.objects
    WHERE bucket_id = 'video-test-other' AND name = 'verification/other.mp4';
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL: other bucket restricted for %', role_name; END IF;

    IF role_name <> 'anon' THEN
      SELECT count(*) INTO n FROM public.candidates WHERE id = cid AND video_path = 'verification/intro.mp4';
      IF n <> (CASE WHEN role_name = 'approved' THEN 1 ELSE 0 END) THEN
        RAISE EXCEPTION 'FAIL: candidate video_path visibility for %', role_name;
      END IF;
    END IF;

    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('candidate-videos', 'verification/forbidden.mp4');
      RAISE EXCEPTION 'FAIL: % could insert a video', role_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    UPDATE storage.objects SET name = 'verification/changed.mp4'
      WHERE bucket_id = 'candidate-videos' AND name = 'verification/intro.mp4';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: % could update a video', role_name; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'candidate-videos' AND name = 'verification/intro.mp4';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: % could delete a video', role_name; END IF;
    BEGIN
      UPDATE storage.objects SET bucket_id = 'candidate-videos'
      WHERE bucket_id = 'video-test-other' AND name = 'verification/other.mp4';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: % could move an object into the video bucket', role_name; END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;
  END LOOP;

  RAISE NOTICE 'OK: candidate video checks';
END
$$;

ROLLBACK;
