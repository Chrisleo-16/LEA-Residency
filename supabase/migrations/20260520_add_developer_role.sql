-- Add developer role support to profiles table
-- This migration allows users with 'developer' role to access the developer dashboard

-- Drop existing check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new check constraint that includes developer role
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('tenant', 'landlord', 'admin', 'developer'));

-- Grant developers access to developer-specific tables if needed
-- (Add any additional RLS policies for developer role here)
