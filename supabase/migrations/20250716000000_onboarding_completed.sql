-- Ensure landlord onboarding flag exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text;

COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'True when landlord finished the guided /onboarding wizard';
