-- Create enum types for allocation and placement status
CREATE TYPE public.allocation_status AS ENUM ('available', 'shortlisted', 'placed', 'confirmed');
CREATE TYPE public.placement_status AS ENUM ('active', 'ended');

-- Create candidates table (shared pool, no business_id)
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  role TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  assessment TEXT,
  background TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  transport TEXT,
  earliest_start TEXT,
  weekends TEXT,
  languages TEXT,
  work_status TEXT,
  availability TEXT,
  experience TEXT,
  is_removed_by_candidate BOOLEAN NOT NULL DEFAULT false,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate_allocations table (the critical exclusivity table)
CREATE TABLE public.candidate_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  status public.allocation_status NOT NULL DEFAULT 'available',
  allocation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT business_id_null_when_available CHECK (
    (status = 'available' AND business_id IS NULL) OR 
    (status IN ('shortlisted', 'placed', 'confirmed') AND business_id IS NOT NULL)
  )
);

-- Create placements table
CREATE TABLE public.placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  total_days INTEGER NOT NULL DEFAULT 90,
  status public.placement_status NOT NULL DEFAULT 'active',
  reason_ended TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_activity table (tracks interview requests and other actions)
CREATE TABLE public.business_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('interview_requested', 'shortlisted', 'placement_started')),
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_candidate_allocations_business_id ON public.candidate_allocations(business_id);
CREATE INDEX idx_candidate_allocations_status ON public.candidate_allocations(status);
CREATE INDEX idx_placements_business_id ON public.placements(business_id);
CREATE INDEX idx_placements_candidate_id ON public.placements(candidate_id);
CREATE INDEX idx_placements_status ON public.placements(status);
CREATE INDEX idx_business_activity_business_id ON public.business_activity(business_id);
CREATE INDEX idx_business_activity_candidate_id ON public.business_activity(candidate_id);
CREATE INDEX idx_business_activity_action_type ON public.business_activity(action_type);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_activity ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view available candidates
CREATE POLICY "Anyone can view available candidates"
  ON public.candidates FOR SELECT
  USING (
    is_removed_by_candidate = false AND
    EXISTS (
      SELECT 1 FROM public.candidate_allocations ca
      WHERE ca.candidate_id = candidates.id AND ca.status = 'available'
    )
  );

-- RLS: Only business-associated users can view non-available candidates (their own allocations)
CREATE POLICY "Users can view candidates allocated to their business"
  ON public.candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_allocations ca
      JOIN public.businesses b ON ca.business_id = b.id
      WHERE ca.candidate_id = candidates.id 
        AND ca.status IN ('shortlisted', 'placed', 'confirmed')
        AND b.user_id = auth.uid()
    )
  );

-- RLS: candidate_allocations visibility
CREATE POLICY "Users can view allocations for their business"
  ON public.candidate_allocations FOR SELECT
  USING (
    business_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update allocations for their business"
  ON public.candidate_allocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- RLS: placements visibility
CREATE POLICY "Users can view placements for their business"
  ON public.placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert placements for their business"
  ON public.placements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update placements for their business"
  ON public.placements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- RLS: business_activity visibility and insertion
CREATE POLICY "Users can view activity for their business"
  ON public.business_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity for their business"
  ON public.business_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_id AND b.user_id = auth.uid()
    )
  );

-- Trigger for updated_at columns
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_allocations_updated_at
  BEFORE UPDATE ON public.candidate_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_placements_updated_at
  BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
