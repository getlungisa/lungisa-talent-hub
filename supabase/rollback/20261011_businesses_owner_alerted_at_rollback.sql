-- Roll back businesses.owner_alerted_at. Run manually only.
BEGIN;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS owner_alerted_at;
COMMIT;
