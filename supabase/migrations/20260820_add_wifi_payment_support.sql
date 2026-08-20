-- Add wifi support to rent_settings and landlord_payment_settings tables

-- 1. Add wifi columns to rent_settings
ALTER TABLE rent_settings ADD COLUMN IF NOT EXISTS wifi_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE rent_settings ADD COLUMN IF NOT EXISTS wifi_amount NUMERIC(10,2) DEFAULT 1000.00;

-- 2. Add is_wifi column to landlord_payment_settings
ALTER TABLE landlord_payment_settings ADD COLUMN IF NOT EXISTS is_wifi BOOLEAN DEFAULT FALSE;

-- 3. Update select policy for landlord_payment_settings to allow linked tenants to select them
DROP POLICY IF EXISTS "payment_settings_select_landlord" ON landlord_payment_settings;
CREATE POLICY "payment_settings_select_all" ON landlord_payment_settings
  FOR SELECT TO authenticated USING (true);
