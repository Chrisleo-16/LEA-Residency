-- Create listings table for property management
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  price BIGINT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  area DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_listings_created_by ON public.listings(created_by);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings(location);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow users to view all listings
CREATE POLICY "Allow users to view all listings"
  ON public.listings
  FOR SELECT
  USING (true);

-- RLS Policy: Allow users to create listings
CREATE POLICY "Allow landlords to create listings"
  ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Allow users to update their own listings
CREATE POLICY "Allow users to update own listings"
  ON public.listings
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Allow users to delete their own listings
CREATE POLICY "Allow users to delete own listings"
  ON public.listings
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for storage: Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload listing images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'listings' AND auth.role() = 'authenticated'
  );

-- RLS Policy for storage: Allow public read access
CREATE POLICY "Allow public read access to listing images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listings');

-- RLS Policy for storage: Allow users to delete their own images
CREATE POLICY "Allow users to delete their own listing images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'listings' AND auth.uid() = owner
  );
