-- Landlord identity verification requests (fraud & verification feature)
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_document_url TEXT NOT NULL,
  id_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification requests; developers can view all
CREATE POLICY "verification_requests_select"
  ON public.verification_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- Users can submit their own verification requests
CREATE POLICY "verification_requests_insert"
  ON public.verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only developers can update status (approve/reject)
CREATE POLICY "verification_requests_update_developer"
  ON public.verification_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- Developers need to be able to flip profiles.kyc_verified when approving a request
CREATE POLICY "profiles_update_developer"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'developer'
    )
  );

-- Private storage bucket for ID documents (not public — sensitive)
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own document, under a folder named after their user id
CREATE POLICY "Allow users to upload own verification documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own document; developers can view all
CREATE POLICY "Allow users to view own verification documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
      )
    )
  );
