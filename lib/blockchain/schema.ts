/**
 * Blockchain Database Schema
 * Tables for storing blockchain records immutably
 */

export const BLOCKCHAIN_SCHEMA = `
-- Blockchain ledger table
CREATE TABLE IF NOT EXISTS blockchain_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Block data
  block_id VARCHAR(16) NOT NULL UNIQUE,
  timestamp BIGINT NOT NULL,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
  
  -- Cryptographic data
  code_hash VARCHAR(64) NOT NULL,
  public_key VARCHAR(16) NOT NULL,
  signature VARCHAR(64) NOT NULL,
  previous_block_hash VARCHAR(64) NOT NULL DEFAULT '',
  nonce INTEGER NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_timestamp TIMESTAMP,
  
  -- Chain data
  chain_position INTEGER NOT NULL,
  chain_hash VARCHAR(64) NOT NULL
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_blockchain_block_id ON blockchain_ledger(block_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_landlord_id ON blockchain_ledger(landlord_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_code_hash ON blockchain_ledger(code_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_chain_position ON blockchain_ledger(chain_position);

-- 4-digit codes mapping table
CREATE TABLE IF NOT EXISTS landlord_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  landlord_id UUID NOT NULL UNIQUE REFERENCES landlords(id) ON DELETE CASCADE,
  code VARCHAR(4) NOT NULL UNIQUE,
  code_hash VARCHAR(64) NOT NULL,
  
  -- Blockchain reference
  block_id VARCHAR(16) NOT NULL REFERENCES blockchain_ledger(block_id) ON DELETE RESTRICT,
  
  -- Security
  is_active BOOLEAN DEFAULT TRUE,
  activation_attempts INTEGER DEFAULT 0,
  last_activation_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Indexes for code lookups
CREATE INDEX IF NOT EXISTS idx_codes_code ON landlord_codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_landlord ON landlord_codes(landlord_id);
CREATE INDEX IF NOT EXISTS idx_codes_is_active ON landlord_codes(is_active);

-- Tenant login attempts (using 4-digit code)
CREATE TABLE IF NOT EXISTS tenant_code_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code_used VARCHAR(4) NOT NULL,
  landlord_id UUID NOT NULL REFERENCES landlords(id),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Authentication flow
  ip_address INET NOT NULL,
  user_agent TEXT,
  login_success BOOLEAN NOT NULL,
  session_id VARCHAR(64),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_code_logins_code ON tenant_code_logins(code_used);
CREATE INDEX IF NOT EXISTS idx_code_logins_landlord ON tenant_code_logins(landlord_id);
CREATE INDEX IF NOT EXISTS idx_code_logins_tenant ON tenant_code_logins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_logins_success ON tenant_code_logins(login_success);

-- Blockchain integrity verification table
CREATE TABLE IF NOT EXISTS blockchain_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  block_id VARCHAR(16) NOT NULL,
  verification_type VARCHAR(50) NOT NULL, -- 'code_validation', 'chain_validation', 'record_audit'
  is_valid BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Verification details
  verified_by_system TEXT DEFAULT 'system_auto',
  verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_verification_block ON blockchain_verification_log(block_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON blockchain_verification_log(verification_type);

-- Enable RLS
ALTER TABLE blockchain_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_code_logins ENABLE ROW LEVEL SECURITY;
`;

/**
 * RLS Policies for Blockchain Tables
 */
export const BLOCKCHAIN_RLS_POLICIES = `
-- blockchain_ledger policies
CREATE POLICY "Blockchain ledger is readable by all" ON blockchain_ledger
  FOR SELECT USING (true);

CREATE POLICY "Blockchain ledger insertable only by system" ON blockchain_ledger
  FOR INSERT WITH CHECK (current_user_id = 'system');

-- landlord_codes policies
CREATE POLICY "Landlords see their own codes" ON landlord_codes
  FOR SELECT USING (landlord_id = current_user_id);

CREATE POLICY "Tenants can lookup landlord by code" ON landlord_codes
  FOR SELECT USING (is_active = true);

-- tenant_code_logins policies
CREATE POLICY "Tenants see their own login attempts" ON tenant_code_logins
  FOR SELECT USING (tenant_id = current_user_id);

CREATE POLICY "Landlords see tenant logins on their codes" ON tenant_code_logins
  FOR SELECT USING (landlord_id = current_user_id);
`;
