-- Test the photo gallery setup
-- Run these commands in Supabase SQL Editor to verify everything is working

-- 1. Check if the photos table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'photos';

-- 2. Check if the storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'photos';

-- 3. Test inserting a sample photo record (you'll need to replace user_id with a real one)
-- First, get a real user ID:
SELECT id, full_name, role FROM profiles LIMIT 1;

-- Then insert a test photo (replace the user_id):
INSERT INTO photos (
  user_id, 
  title, 
  description, 
  file_url, 
  file_name, 
  file_size, 
  mime_type, 
  category, 
  tags, 
  is_public
) VALUES (
  'YOUR_REAL_USER_ID_HERE',
  'Test Property Photo',
  'A beautiful view of the property',
  'https://via.placeholder.com/800x600/4CAF50/FFFFFF?text=Test+Photo',
  'test-photo.jpg',
  123456,
  'image/jpeg',
  'property',
  ARRAY['exterior', 'garden', 'sunny'],
  true
);

-- 4. Query all photos to verify
SELECT 
  p.*,
  pr.full_name,
  pr.role
FROM photos p
LEFT JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.uploaded_at DESC;

-- 5. Test storage policies
SELECT * FROM pg_policies WHERE tablename = 'photos';
SELECT * FROM pg_policies WHERE tablename LIKE '%storage%';

-- 6. Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'photos' 
AND schemaname = 'public';
