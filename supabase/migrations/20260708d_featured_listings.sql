-- Featured-listing paywall: landlords pay a small fee to boost a listing's
-- visibility for a set number of days. Launch-phase pricing (see PDF):
-- KES 300 / 7 days, KES 600 / 14 days.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.featured_listing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14)),
  amount NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_featured_requests_landlord ON public.featured_listing_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_featured_requests_status ON public.featured_listing_requests(status);

ALTER TABLE public.featured_listing_requests ENABLE ROW LEVEL SECURITY;

-- Landlords see their own requests; developers see all
CREATE POLICY "featured_requests_select"
  ON public.featured_listing_requests
  FOR SELECT
  TO authenticated
  USING (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- Landlords can submit a request for their own listing
CREATE POLICY "featured_requests_insert"
  ON public.featured_listing_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    landlord_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_id AND listings.created_by = auth.uid()
    )
  );

-- Only developers can approve/reject
CREATE POLICY "featured_requests_update_developer"
  ON public.featured_listing_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- Developers need to be able to set listings.featured_until on approval
-- (existing policy already lets owners update their own listing — this adds
-- an additional path for developers, it does not replace the owner policy)
CREATE POLICY "listings_update_developer"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );
