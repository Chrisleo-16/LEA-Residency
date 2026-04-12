-- LEA Platform - Database Schema Updates
-- Add Voice Engine and USSD Manager tables

-- ============================================================================
-- UPDATE USSD SESSIONS TABLE
-- ============================================================================

-- Rename current_menu_level to current_menu if needed (PostgreSQL doesn't support rename in migration)
ALTER TABLE ussd_sessions ADD COLUMN IF NOT EXISTS current_menu VARCHAR(100) DEFAULT 'main';

-- ============================================================================
-- UPDATE VOICE CALLS TABLE (expand voice_call_logs)
-- ============================================================================

-- Drop old voice_call_logs if exists and create new voice_calls table
DROP TABLE IF EXISTS voice_call_logs CASCADE;

CREATE TABLE voice_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  status VARCHAR(20) DEFAULT 'initiated', -- initiated, ringing, active, completed, failed
  call_data JSONB DEFAULT '{}',
  recording_url TEXT,
  transcription TEXT,
  duration_seconds INTEGER,
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (direction IN ('inbound', 'outbound')),
  CHECK (status IN ('initiated', 'ringing', 'active', 'completed', 'failed')),
  INDEX (phone_number, created_at),
  INDEX (call_id),
  INDEX (status),
  INDEX (initiated_at)
);

-- ============================================================================
-- INDEXES FOR NEW TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ussd_sessions_phone ON ussd_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_status ON ussd_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_phone ON voice_calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_direction ON voice_calls(direction);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ussd_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Test USSD session
INSERT INTO ussd_sessions (phone_number, session_id, current_menu, session_status, session_data)
VALUES (
  '+254712000000',
  'test_ussd_001',
  'main',
  'active',
  '{"steps": 0, "country": "KE"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Test voice call
INSERT INTO voice_calls (call_id, phone_number, direction, status, call_data)
VALUES (
  'test_call_001',
  '+254712000000',
  'inbound',
  'completed',
  '{"type": "payment_inquiry", "duration": 120}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================

-- After running this schema, verify:
-- 1. USSD sessions are created correctly: SELECT * FROM ussd_sessions LIMIT 1;
-- 2. Voice calls are created correctly: SELECT * FROM voice_calls LIMIT 1;
-- 3. All indexes are present: SELECT * FROM pg_indexes WHERE tablename = 'voice_calls';
