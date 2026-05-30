-- Add columns needed for landlord onboarding flow

-- ============================================================================
-- ADD ONBOARDING COLUMNS TO PROFILES
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_link TEXT;

-- Update existing profiles that don't have onboarding_completed set
UPDATE profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;

-- ============================================================================
-- CREATE UNITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_landlord_id ON units(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_unit_number ON units(unit_number);

-- ============================================================================
-- CREATE LANDLORD_PAYMENT_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS landlord_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('paybill', 'till')),
  paybill_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_landlord_payment_settings_landlord_id ON landlord_payment_settings(landlord_id);

-- ============================================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_payment_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR UNITS
-- ============================================================================

-- Landlords can insert their own units
CREATE POLICY "units_insert_landlord" ON units
FOR INSERT TO authenticated
WITH CHECK (landlord_id = auth.uid());

-- Landlords can select their own units
CREATE POLICY "units_select_landlord" ON units
FOR SELECT TO authenticated
USING (landlord_id = auth.uid());

-- Landlords can update their own units
CREATE POLICY "units_update_landlord" ON units
FOR UPDATE TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

-- Landlords can delete their own units
CREATE POLICY "units_delete_landlord" ON units
FOR DELETE TO authenticated
USING (landlord_id = auth.uid());

-- ============================================================================
-- CREATE RLS POLICIES FOR LANDLORD_PAYMENT_SETTINGS
-- ============================================================================

-- Landlords can insert their own payment settings
CREATE POLICY "payment_settings_insert_landlord" ON landlord_payment_settings
FOR INSERT TO authenticated
WITH CHECK (landlord_id = auth.uid());

-- Landlords can select their own payment settings
CREATE POLICY "payment_settings_select_landlord" ON landlord_payment_settings
FOR SELECT TO authenticated
USING (landlord_id = auth.uid());

-- Landlords can update their own payment settings
CREATE POLICY "payment_settings_update_landlord" ON landlord_payment_settings
FOR UPDATE TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());
