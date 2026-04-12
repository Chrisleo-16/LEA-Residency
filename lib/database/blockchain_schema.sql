-- LEA Blockchain Multi-Landlord Schema
-- Enhanced for multi-landlord block system with tenant slot management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BLOCKCHAIN LANDLORD BLOCKS (Each landlord gets their own block)
-- ============================================================================

-- Landlord blockchain blocks
CREATE TABLE landlord_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL,
  block_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
  previous_block_hash VARCHAR(64),
  block_number BIGINT NOT NULL,
  landlord_code VARCHAR(20) UNIQUE NOT NULL, -- LEA-XYZ123-ABC format
  landlord_name VARCHAR(255) NOT NULL,
  landlord_email VARCHAR(255) NOT NULL,
  property_capacity INTEGER NOT NULL DEFAULT 0, -- Total tenant slots
  property_used INTEGER NOT NULL DEFAULT 0, -- Used tenant slots
  block_data JSONB NOT NULL DEFAULT '{}', -- Encrypted block data
  blockchain_signature TEXT, -- Digital signature
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nonce BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  CHECK (property_capacity >= 0),
  CHECK (property_used >= 0),
  CHECK (property_used <= property_capacity),
  CHECK (block_number >= 0)
);

-- Tenant slots within each landlord block
CREATE TABLE tenant_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_block_id UUID NOT NULL REFERENCES landlord_blocks(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL, -- Unit/Slot number (1, 2, 3...)
  tenant_code VARCHAR(20) UNIQUE NOT NULL, -- Unique code for this slot
  is_occupied BOOLEAN DEFAULT FALSE,
  tenant_id UUID, -- Reference to tenant when occupied
  tenant_name VARCHAR(255),
  tenant_email VARCHAR(255),
  tenant_phone VARCHAR(20),
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  occupied_at TIMESTAMP,
  vacated_at TIMESTAMP,
  
  -- Constraints
  CHECK (slot_number > 0),
  UNIQUE(landlord_block_id, slot_number),
  CHECK (tenant_id IS NULL OR is_occupied = TRUE)
);

-- Blockchain transaction ledger
CREATE TABLE blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_hash VARCHAR(64) UNIQUE NOT NULL,
  block_hash VARCHAR(64) NOT NULL REFERENCES landlord_blocks(block_hash),
  transaction_type VARCHAR(50) NOT NULL, -- landlord_register, tenant_assign, tenant_vacate, capacity_update
  from_entity VARCHAR(50), -- landlord_id, tenant_id, system
  to_entity VARCHAR(50), -- landlord_id, tenant_id, system
  transaction_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmations INTEGER DEFAULT 0,
  
  CHECK (transaction_type IN ('landlord_register', 'tenant_assign', 'tenant_vacate', 'capacity_update', 'block_creation'))
);

-- ============================================================================
-- ENHANCED PROFILES TABLE (Blockchain integration)
-- ============================================================================

-- User profiles with blockchain integration
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'tenant', -- landlord, tenant, admin
  phone_number VARCHAR(20),
  landlord_block_id UUID REFERENCES landlord_blocks(id),
  landlord_code VARCHAR(20),
  blockchain_verified BOOLEAN DEFAULT FALSE,
  property_setup_complete BOOLEAN DEFAULT FALSE,
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (role IN ('landlord', 'tenant', 'admin')),
  CHECK (role = 'landlord' OR landlord_block_id IS NULL) -- Only landlords have blocks
);

-- ============================================================================
-- PROPERTY MANAGEMENT (Blockchain-integrated)
-- ============================================================================

-- Properties linked to landlord blocks
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_block_id UUID NOT NULL REFERENCES landlord_blocks(id) ON DELETE CASCADE,
  property_name VARCHAR(255) NOT NULL,
  property_address TEXT NOT NULL,
  total_units INTEGER NOT NULL,
  available_units INTEGER NOT NULL,
  blockchain_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (total_units > 0),
  CHECK (available_units >= 0),
  CHECK (available_units <= total_units)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_landlord_blocks_landlord_id ON landlord_blocks(landlord_id);
CREATE INDEX idx_landlord_blocks_code ON landlord_blocks(landlord_code);
CREATE INDEX idx_landlord_blocks_hash ON landlord_blocks(block_hash);
CREATE INDEX idx_tenant_slots_block_id ON tenant_slots(landlord_block_id);
CREATE INDEX idx_tenant_slots_occupied ON tenant_slots(is_occupied);
CREATE INDEX idx_tenant_slots_tenant_code ON tenant_slots(tenant_code);
CREATE INDEX idx_blockchain_transactions_block ON blockchain_transactions(block_hash);
CREATE INDEX idx_blockchain_transactions_type ON blockchain_transactions(transaction_type);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_block_id ON profiles(landlord_block_id);
CREATE INDEX idx_properties_block_id ON properties(landlord_block_id);

-- ============================================================================
-- TRIGGERS FOR BLOCKCHAIN INTEGRITY
-- ============================================================================

-- Update landlord block capacity when tenant slots are created/updated
CREATE OR REPLACE FUNCTION update_landlord_block_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New tenant slot created
    UPDATE landlord_blocks 
    SET property_capacity = property_capacity + 1
    WHERE id = NEW.landlord_block_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Tenant slot occupancy changed
    IF OLD.is_occupied != NEW.is_occupied THEN
      IF NEW.is_occupied THEN
        UPDATE landlord_blocks 
        SET property_used = property_used + 1
        WHERE id = NEW.landlord_block_id;
      ELSE
        UPDATE landlord_blocks 
        SET property_used = property_used - 1
        WHERE id = NEW.landlord_block_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Tenant slot deleted
    UPDATE landlord_blocks 
    SET property_capacity = property_capacity - 1,
        property_used = property_used - CASE WHEN OLD.is_occupied THEN 1 ELSE 0 END
    WHERE id = OLD.landlord_block_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_landlord_block_capacity
  AFTER INSERT OR UPDATE OR DELETE ON tenant_slots
  FOR EACH ROW EXECUTE FUNCTION update_landlord_block_capacity();

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE landlord_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Landlords can view their own blocks"
  ON landlord_blocks FOR SELECT
  USING (landlord_id = current_user_id());

CREATE POLICY "Landlords can manage their tenant slots"
  ON tenant_slots FOR ALL
  USING (landlord_block_id IN (
    SELECT id FROM landlord_blocks WHERE landlord_id = current_user_id()
  ));

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = current_user_id());

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert a sample landlord block for testing
INSERT INTO landlord_blocks (
  landlord_id,
  block_hash,
  previous_block_hash,
  block_number,
  landlord_code,
  landlord_name,
  landlord_email,
  property_capacity,
  block_data
) VALUES (
  uuid_generate_v4(),
  'block_hash_001',
  NULL,
  1,
  'LEA-TEST123-ABC',
  'Test Landlord',
  'test@landlord.com',
  12,
  '{"version": "1.0", "type": "genesis_block"}'
);

-- Create sample tenant slots
INSERT INTO tenant_slots (
  landlord_block_id,
  slot_number,
  tenant_code,
  is_occupied
) SELECT 
  id,
  generate_series(1, 12),
  'LEA-TENANT-' || generate_series(1, 12)::text,
  false
FROM landlord_blocks 
WHERE landlord_code = 'LEA-TEST123-ABC';
