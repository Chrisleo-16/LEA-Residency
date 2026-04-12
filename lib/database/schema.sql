-- LEA Platform - Production PostgreSQL Schema
-- Supabase Compatible
-- April 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUTHENTICATION & MULTI-TENANCY
-- ============================================================================

-- Landlord/Property Manager accounts
CREATE TABLE landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) DEFAULT 'KE', -- KE, NG, UG, TZ, GH
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_document_url TEXT,
  password_hash VARCHAR(255) NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (country IN ('KE', 'NG', 'UG', 'TZ', 'GH'))
);

-- Tenant accounts
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) DEFAULT 'KE',
  id_number VARCHAR(20) UNIQUE,
  national_id_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (country IN ('KE', 'NG', 'UG', 'TZ', 'GH'))
);

-- Guest accounts (Airbnb-style marketplace)
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) DEFAULT 'KE',
  verification_status VARCHAR(20) DEFAULT 'unverified', -- unverified, email_verified, phone_verified, fully_verified
  profile_photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (country IN ('KE', 'NG', 'UG', 'TZ', 'GH')),
  CHECK (verification_status IN ('unverified', 'email_verified', 'phone_verified', 'fully_verified'))
);

-- ============================================================================
-- PROPERTY & UNIT MANAGEMENT
-- ============================================================================

-- Properties (buildings/compounds)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(50) NOT NULL, -- apartment_block, villa, house, commercial, mixed
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(2) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_units INTEGER NOT NULL DEFAULT 0,
  year_built INTEGER,
  description TEXT,
  amenities JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (country IN ('KE', 'NG', 'UG', 'TZ', 'GH')),
  CHECK (property_type IN ('apartment_block', 'villa', 'house', 'commercial', 'mixed')),
  CHECK (year_built IS NULL OR year_built > 1900)
);

-- Individual units/apartments
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  unit_type VARCHAR(50) NOT NULL, -- 1br, 2br, 3br, studio, office
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_meters DECIMAL(8, 2),
  monthly_rent DECIMAL(12, 2) NOT NULL,
  security_deposit DECIMAL(12, 2),
  utilities_included BOOLEAN DEFAULT FALSE,
  utilities_cost DECIMAL(12, 2),
  features JSONB DEFAULT '[]',
  photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(30) DEFAULT 'vacant', -- vacant, occupied, maintenance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(property_id, unit_number),
  CHECK (unit_type IN ('1br', '2br', '3br', 'studio', 'office')),
  CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  CHECK (bedrooms >= 0),
  CHECK (monthly_rent > 0)
);

-- ============================================================================
-- TENANCY & LEASING
-- ============================================================================

-- Lease agreements
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  monthly_rent DECIMAL(12, 2) NOT NULL,
  security_deposit DECIMAL(12, 2),
  lease_document_url TEXT,
  status VARCHAR(20) DEFAULT 'active', -- draft, active, expired, terminated
  auto_renewal BOOLEAN DEFAULT TRUE,
  renewal_notice_days INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  terminated_at TIMESTAMP,
  terminated_reason TEXT,
  deleted_at TIMESTAMP,
  CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  CHECK (lease_end_date > lease_start_date)
);

-- ============================================================================
-- PAYMENT SYSTEM
-- ============================================================================

-- Payment records (rent, deposits, utilities)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL,
  payment_type VARCHAR(30) NOT NULL, -- rent, deposit, utilities, other
  payment_method VARCHAR(30) NOT NULL, -- mpesa, bank_transfer, cash, other
  reference_number VARCHAR(100) UNIQUE,
  mpesa_transaction_id VARCHAR(100) UNIQUE,
  due_date DATE NOT NULL,
  paid_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, disputed
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (payment_type IN ('rent', 'deposit', 'utilities', 'other')),
  CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash', 'other')),
  CHECK (status IN ('pending', 'completed', 'failed', 'disputed')),
  CHECK (amount > 0)
);

-- SMS/Payment notifications log
CREATE TABLE payment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  message_type VARCHAR(30) NOT NULL, -- payment_reminder, payment_confirmation, overdue_alert
  message_content TEXT NOT NULL,
  channel VARCHAR(20) DEFAULT 'sms', -- sms, email, push
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, delivered, failed, bounced
  delivery_timestamp TIMESTAMP,
  failure_reason TEXT,
  delivery_attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (message_type IN ('payment_reminder', 'payment_confirmation', 'overdue_alert')),
  CHECK (channel IN ('sms', 'email', 'push')),
  CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'bounced'))
);

-- ============================================================================
-- MARKETPLACE (AIRBNB-STYLE SHORT-TERM RENTALS)
-- ============================================================================

-- Listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  nightly_price DECIMAL(12, 2) NOT NULL,
  weekly_discount DECIMAL(5, 2) DEFAULT 0, -- percentage discount
  monthly_discount DECIMAL(5, 2) DEFAULT 0,
  deposit_percentage DECIMAL(5, 2) DEFAULT 10, -- percentage of first night
  max_guests INTEGER DEFAULT 4,
  minimum_stay_nights INTEGER DEFAULT 1,
  listing_type VARCHAR(30) DEFAULT 'short_term', -- short_term, furnished, serviced
  is_active BOOLEAN DEFAULT TRUE,
  photos_compressed JSONB DEFAULT '[]', -- base64 compressed thumbnails
  amenity_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  house_rules TEXT,
  cancellation_policy VARCHAR(30) DEFAULT 'moderate', -- strict, moderate, flexible
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (nightly_price > 0),
  CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
  CHECK (minimum_stay_nights > 0),
  CHECK (listing_type IN ('short_term', 'furnished', 'serviced')),
  CHECK (cancellation_policy IN ('strict', 'moderate', 'flexible'))
);

-- Bookings (guest reservations)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE RESTRICT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  nightly_rate DECIMAL(12, 2) NOT NULL,
  total_nights INTEGER NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  deposit_amount DECIMAL(12, 2),
  cleaning_fee DECIMAL(12, 2),
  service_fee DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending_deposit', -- pending_deposit, confirmed, checked_in, checked_out, cancelled, disputed
  deposit_payment_id UUID REFERENCES payments(id),
  booking_reference VARCHAR(50) UNIQUE,
  special_requests TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (check_out_date > check_in_date),
  CHECK (number_of_guests > 0),
  CHECK (total_nights > 0),
  CHECK (status IN ('pending_deposit', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'disputed'))
);

-- Reviews and ratings
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL, -- either guest or landlord
  reviewer_type VARCHAR(20) NOT NULL, -- guest, landlord
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  cleanliness_rating INTEGER,
  accuracy_rating INTEGER,
  communication_rating INTEGER,
  location_rating INTEGER,
  review_text TEXT,
  review_source VARCHAR(20) DEFAULT 'app', -- app, sms, voice
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_response BOOLEAN DEFAULT FALSE,
  response_to_review_id UUID REFERENCES reviews(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (reviewer_type IN ('guest', 'landlord')),
  CHECK (rating >= 1 AND rating <= 5),
  CHECK (cleanliness_rating IS NULL OR (cleanliness_rating >= 1 AND cleanliness_rating <= 5))
);

-- ============================================================================
-- MAINTENANCE & ISSUES
-- ============================================================================

-- Maintenance requests
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  issue_title VARCHAR(255) NOT NULL,
  issue_description TEXT NOT NULL,
  issue_category VARCHAR(50) NOT NULL, -- plumbing, electrical, appliance, structural, cleaning, other
  urgency VARCHAR(20) DEFAULT 'normal', -- low, normal, urgent, emergency
  photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(30) DEFAULT 'open', -- open, assigned, in_progress, completed, closed, rejected
  assigned_to_contractor_id UUID,
  estimated_cost DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2),
  reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  target_completion_date DATE,
  actual_completion_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (issue_category IN ('plumbing', 'electrical', 'appliance', 'structural', 'cleaning', 'other')),
  CHECK (urgency IN ('low', 'normal', 'urgent', 'emergency')),
  CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'closed', 'rejected'))
);

-- ============================================================================
-- MOVE-IN/MOVE-OUT INSPECTIONS
-- ============================================================================

-- Move-in/move-out condition reports
CREATE TABLE condition_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL, -- move_in, move_out
  inspection_date DATE NOT NULL,
  inspector_name VARCHAR(255),
  inspector_contact VARCHAR(20),
  overall_condition VARCHAR(50), -- excellent, good, fair, poor
  room_conditions JSONB DEFAULT '{}', -- {bedroom1: {condition: good, notes: "..."}, ...}
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  discrepancies JSONB DEFAULT '[]', -- [{location: "...", damage: "...", severity: "high|medium|low"}, ...]
  estimated_repair_cost DECIMAL(12, 2),
  notes TEXT,
  signed_by_tenant_at TIMESTAMP,
  signed_by_landlord_at TIMESTAMP,
  pdf_report_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CHECK (report_type IN ('move_in', 'move_out'))
);

-- ============================================================================
-- FINANCIAL METRICS & ANALYTICS
-- ============================================================================

-- Monthly financial summary (denormalized for performance)
CREATE TABLE financial_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  summary_month DATE NOT NULL, -- first day of month
  expected_rent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  actual_rent_collected DECIMAL(12, 2) NOT NULL DEFAULT 0,
  collection_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- percentage
  expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expenses_breakdown JSONB DEFAULT '{}'::JSONB,
  net_profit DECIMAL(12, 2),
  overdue_payments DECIMAL(12, 2) NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  vacancy_count INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5, 2), -- percentage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(landlord_id, property_id, summary_month)
);

-- ============================================================================
-- COMMUNICATION LOGS (SMS/USSD/VOICE)
-- ============================================================================

-- SMS queue and history
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(30) NOT NULL, -- payment_alert, maintenance_update, review_request, booking_confirmation, etc
  sender_entity_id UUID, -- landlord_id or tenant_id or system
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
  failure_reason TEXT,
  africa_talking_message_id VARCHAR(100),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  INDEX (phone_number, created_at),
  INDEX (delivery_status, next_retry_at)
);

-- USSD session tracking
CREATE TABLE ussd_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  current_menu_level VARCHAR(100),
  session_data JSONB DEFAULT '{}',
  last_input VARCHAR(255),
  session_status VARCHAR(20) DEFAULT 'active', -- active, completed, expired
  initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (session_status IN ('active', 'completed', 'expired')),
  INDEX (phone_number, session_status),
  INDEX (last_interaction_at)
);

-- Voice call logs
CREATE TABLE voice_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  call_id VARCHAR(100) UNIQUE,
  call_type VARCHAR(20), -- inbound, outbound
  call_purpose VARCHAR(50), -- balance_check, booking_inquiry, complaint, support
  duration_seconds INTEGER,
  recording_url TEXT,
  transcription TEXT,
  ai_interaction JSONB DEFAULT '{}',
  call_status VARCHAR(20), -- completed, missed, failed
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (phone_number, created_at)
);

-- ============================================================================
-- OFFLINE SYNC QUEUE (for app offline resilience)
-- ============================================================================

-- Offline transaction queue
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- tenant_id or landlord_id or guest_id
  user_type VARCHAR(20) NOT NULL, -- tenant, landlord, guest
  transaction_type VARCHAR(50) NOT NULL, -- payment_initiate, review_submit, maintenance_report, etc
  transaction_data JSONB NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed
  last_sync_attempt TIMESTAMP,
  sync_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  CHECK (user_type IN ('tenant', 'landlord', 'guest')),
  CHECK (sync_status IN ('pending', 'synced', 'failed')),
  INDEX (user_id, sync_status),
  INDEX (next_retry_at, sync_status)
);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

-- Audit trail for sensitive operations
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type VARCHAR(20), -- landlord, tenant, guest, system, admin
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (actor_id, created_at),
  INDEX (resource_type, resource_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_landlord_id ON leases(landlord_id);
CREATE INDEX idx_leases_unit_id ON leases(unit_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_landlord_id ON payments(landlord_id);
CREATE INDEX idx_payments_status_due ON payments(status, due_date);
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_listings_landlord_active ON listings(landlord_id, is_active);
CREATE INDEX idx_condition_reports_lease_id ON condition_reports(lease_id);
CREATE INDEX idx_financial_summaries_month ON financial_summaries(summary_month);
CREATE INDEX idx_offline_queue_sync ON offline_queue(sync_status, next_retry_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (Enable in production)
-- ============================================================================

ALTER TABLE landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples - expand as needed)
CREATE POLICY "Landlords can view their own data"
  ON landlords FOR SELECT
  USING (id = current_user_id());

CREATE POLICY "Tenants can view their own leases"
  ON leases FOR SELECT
  USING (tenant_id = current_user_id() OR landlord_id = current_user_id());

CREATE POLICY "Guests can view their own bookings"
  ON bookings FOR SELECT
  USING (guest_id = current_user_id() OR landlord_id = current_user_id());
