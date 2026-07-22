-- Standalone follow-up: creates the verification-documents bucket + its
-- storage policies. Safe to run even if some of 20260708_create_verification_requests.sql
-- already partially applied — drops policies before recreating them.

INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow users to upload own verification documents" ON storage.objects;
CREATE POLICY "Allow users to upload own verification documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Allow users to view own verification documents" ON storage.objects;
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
