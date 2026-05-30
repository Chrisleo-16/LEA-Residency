-- ============================================================================
-- LEA BLOCKCHAIN MULTI-LANDLORD UNIFIED SCHEMA (PRODUCTION READY)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CORE BLOCKCHAIN TABLES
CREATE TABLE IF NOT EXISTS public.landlord_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL,
  block_hash VARCHAR(64) UNIQUE NOT NULL, 
  previous_block_hash VARCHAR(64),
  block_number BIGINT NOT NULL,
  landlord_code VARCHAR(20) UNIQUE NOT NULL, 
  landlord_name VARCHAR(255) NOT NULL,
  landlord_email VARCHAR(255) NOT NULL,
  property_capacity INTEGER NOT NULL DEFAULT 0, 
  property_used INTEGER NOT NULL DEFAULT 0, 
  block_data JSONB NOT NULL DEFAULT '{}', 
  blockchain_signature TEXT, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nonce BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  CHECK (property_capacity >= 0),
  CHECK (property_used >= 0),
  CHECK (property_used <= property_capacity),
  CHECK (block_number >= 0)
);

-- Properties Table (Now cleanly maps as the bridge)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_block_id UUID NOT NULL REFERENCES public.landlord_blocks(id) ON DELETE CASCADE,
  property_name VARCHAR(255) NOT NULL,
  property_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant slots (Fixed constraints)
CREATE TABLE IF NOT EXISTS public.tenant_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_block_id UUID NOT NULL REFERENCES public.landlord_blocks(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL, -- Linked directly to physical property
  slot_number INTEGER NOT NULL, 
  tenant_code VARCHAR(20) UNIQUE NOT NULL, 
  is_occupied BOOLEAN DEFAULT FALSE,
  tenant_id UUID, 
  tenant_name VARCHAR(255),
  tenant_email VARCHAR(255),
  tenant_phone VARCHAR(20),
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  occupied_at TIMESTAMP,
  vacated_at TIMESTAMP,
  
  CHECK (slot_number > 0),
  UNIQUE(landlord_block_id, slot_number),
  CHECK (tenant_id IS NULL OR is_occupied = TRUE)
);

-- Blockchain transaction ledger
CREATE TABLE IF NOT EXISTS public.blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_hash VARCHAR(64) UNIQUE NOT NULL,
  block_hash VARCHAR(64) NOT NULL REFERENCES public.landlord_blocks(block_hash),
  transaction_type VARCHAR(50) NOT NULL, 
  from_entity VARCHAR(50), 
  to_entity VARCHAR(50), 
  transaction_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmations INTEGER DEFAULT 0,
  
  CHECK (transaction_type IN ('landlord_register', 'tenant_assign', 'tenant_vacate', 'capacity_update', 'block_creation'))
);

-- ============================================================================
-- 2. AUTOMATION & TRIGGERS (AGGREGATION FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_block_metrics()
RETURNS TRIGGER AS $$
DECLARE
  target_block_id UUID;
BEGIN
  -- Determine which block needs an update
  IF TG_OP = 'DELETE' THEN
    target_block_id := OLD.landlord_block_id;
  ELSE
    target_block_id := NEW.landlord_block_id;
  END IF;

  -- Run a clean aggregate function instead of doing fragile row math (+1/-1)
  UPDATE public.landlord_blocks 
  SET 
    property_capacity = (SELECT COUNT(*) FROM public.tenant_slots WHERE landlord_block_id = target_block_id),
    property_used = (SELECT COUNT(*) FROM public.tenant_slots WHERE landlord_block_id = target_block_id AND is_occupied = true)
  WHERE id = target_block_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_block_metrics
  AFTER INSERT OR UPDATE OF is_occupied OR DELETE ON public.tenant_slots
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_block_metrics();

-- ============================================================================
-- 3. EXPANDED ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.landlord_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Landlord view rules
CREATE POLICY "Landlords can manage their own blocks"
  ON public.landlord_blocks FOR ALL
  USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can manage slots"
  ON public.tenant_slots FOR ALL
  USING (landlord_block_id IN (SELECT id FROM public.landlord_blocks WHERE landlord_id = auth.uid()));

-- Tenant view rules (CRITICAL FIX)
CREATE POLICY "Tenants can view their assigned slots"
  ON public.tenant_slots FOR SELECT
  USING (tenant_id = auth.uid());


-- Safely inject blockchain tracking columns into your existing profiles structure
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS landlord_block_id UUID REFERENCES public.landlord_blocks(id),
  ADD COLUMN IF NOT EXISTS landlord_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS blockchain_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS property_setup_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Apply a clean logical check: Only landlords can be assigned a landlord block space
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_block_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_block_check 
  CHECK (role = 'landlord' OR landlord_block_id IS NULL);

-- ============================================================================
-- 4. PERFORMANCE TUNING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_landlord_blocks_landlord_id ON public.landlord_blocks(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_blocks_code ON public.landlord_blocks(landlord_code);
CREATE INDEX IF NOT EXISTS idx_landlord_blocks_hash ON public.landlord_blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_tenant_slots_block_id ON public.tenant_slots(landlord_block_id);
CREATE INDEX IF NOT EXISTS idx_tenant_slots_occupied ON public.tenant_slots(is_occupied);
CREATE INDEX IF NOT EXISTS idx_tenant_slots_tenant_code ON public.tenant_slots(tenant_code);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_type ON public.blockchain_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_block_id ON public.profiles(landlord_block_id);
CREATE INDEX IF NOT EXISTS idx_properties_block_id ON public.properties(landlord_block_id);