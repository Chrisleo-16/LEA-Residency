-- Photo Gallery Table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT DEFAULT 'general', -- 'property', 'maintenance', 'community', 'personal', 'general'
  tags TEXT[], -- PostgreSQL array for tags
  is_public BOOLEAN DEFAULT false, -- Whether all tenants can see this photo
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policies for photos table
CREATE POLICY "Users can view their own photos"
  ON photos FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

-- Landlords can view all photos in their property
CREATE POLICY "Landlords can view all photos"
  ON photos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'landlord'
    )
  );

-- Indexes for better performance
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_is_public ON photos(is_public);
