-- Idempotency marker for the notify-new-business owner alert.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS owner_alerted_at TIMESTAMPTZ NULL;
