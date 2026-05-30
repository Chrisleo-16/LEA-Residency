-- Update landlord_payment_settings to support multiple channels and bank details

-- 1. Drop the UNIQUE constraint on landlord_id
ALTER TABLE landlord_payment_settings DROP CONSTRAINT IF EXISTS landlord_payment_settings_landlord_id_key;

-- 2. Update payment_type check constraint to include 'bank'
ALTER TABLE landlord_payment_settings DROP CONSTRAINT IF EXISTS landlord_payment_settings_payment_type_check;
ALTER TABLE landlord_payment_settings ADD CONSTRAINT landlord_payment_settings_payment_type_check
  CHECK (payment_type IN ('paybill', 'till', 'bank'));

-- 3. Add new columns for PayHero integration and bank details
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS payhero_channel_id INTEGER;
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS bank_shortcode TEXT;
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS paybill_account_number TEXT;

-- 4. Add index for faster lookups by landlord_id (since we removed unique constraint)
CREATE INDEX IF NOT EXISTS idx_landlord_payment_settings_landlord_id ON landlord_payment_settings(landlord_id);

-- 5. Add a unique constraint on (landlord_id, payment_type, paybill_number) to prevent duplicates
-- Excluding bank for now as they might have same paybill but different account numbers,
-- or adding it to the composite if unique enough
ALTER TABLE landlord_payment_settings ADD CONSTRAINT landlord_payment_channel_unique
  UNIQUE (landlord_id, payment_type, paybill_number);
