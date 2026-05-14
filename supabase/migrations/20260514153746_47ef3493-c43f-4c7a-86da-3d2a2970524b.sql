
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  timing TEXT NOT NULL,
  must_haves TEXT,
  status TEXT NOT NULL DEFAULT 'in_review',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_needs_business_id ON public.needs(business_id);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view needs for their businesses"
  ON public.needs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = needs.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert needs for their businesses"
  ON public.needs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = needs.business_id AND b.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_needs_updated_at
  BEFORE UPDATE ON public.needs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
