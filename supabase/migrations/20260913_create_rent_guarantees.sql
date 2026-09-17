-- Rent Guarantee pilot (manual underwriting)
-- Run in Supabase SQL editor or via migration pipeline.

-- ============================================================================
-- PROPERTY FLAG: landlord opts property into guarantee product
-- ============================================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS guarantee_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.properties.guarantee_enabled IS
  'When true, tenants on this property can apply for a LEA rent guarantee (deposit waiver pilot).';

-- ============================================================================
-- RENT GUARANTEES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rent_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_slot_id UUID REFERENCES public.tenant_slots(id) ON DELETE SET NULL,

  monthly_rent NUMERIC(12, 2) NOT NULL,
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  monthly_fee_amount NUMERIC(12, 2) NOT NULL,
  coverage_months INTEGER NOT NULL DEFAULT 12
    CHECK (coverage_months >= 1 AND coverage_months <= 24),

  status VARCHAR(20) NOT NULL DEFAULT 'applied'
    CHECK (status IN (
      'applied',
      'under_review',
      'approved',
      'active',
      'rejected',
      'defaulted',
      'claimed',
      'ended'
    )),

  -- Tenant application inputs (manual underwriting)
  phone_number TEXT,
  employer_name TEXT,
  declared_income NUMERIC(12, 2),
  mpesa_statement_path TEXT,
  tenant_notes TEXT,

  -- Ops review
  ops_notes TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Coverage window
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  coverage_start DATE,
  coverage_end DATE,

  -- Claims (landlord files; ops resolves offline for pilot)
  claim_filed_at TIMESTAMPTZ,
  claim_amount NUMERIC(12, 2),
  claim_notes TEXT,
  claim_resolved_at TIMESTAMPTZ,
  claim_payout_reference TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rent_guarantees_tenant_id ON public.rent_guarantees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_guarantees_landlord_id ON public.rent_guarantees(landlord_id);
CREATE INDEX IF NOT EXISTS idx_rent_guarantees_status ON public.rent_guarantees(status);
CREATE INDEX IF NOT EXISTS idx_rent_guarantees_property_id ON public.rent_guarantees(property_id);

-- One open application/coverage per tenant at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_guarantees_one_open_per_tenant
  ON public.rent_guarantees(tenant_id)
  WHERE status IN ('applied', 'under_review', 'approved', 'active', 'defaulted', 'claimed');

ALTER TABLE public.rent_guarantees ENABLE ROW LEVEL SECURITY;

-- Tenants see own; landlords see their portfolio; developers see all
CREATE POLICY "rent_guarantees_select"
  ON public.rent_guarantees
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid()
    OR landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- Tenants can apply (insert their own row)
CREATE POLICY "rent_guarantees_insert_tenant"
  ON public.rent_guarantees
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Tenants can update own application while still pending (e.g. add statement)
CREATE POLICY "rent_guarantees_update_tenant_pending"
  ON public.rent_guarantees
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = auth.uid()
    AND status IN ('applied', 'under_review')
  )
  WITH CHECK (tenant_id = auth.uid());

-- Landlords can file claims on active/defaulted guarantees in their portfolio
CREATE POLICY "rent_guarantees_update_landlord_claim"
  ON public.rent_guarantees
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Developers can update any row (approve / reject / resolve claims)
CREATE POLICY "rent_guarantees_update_developer"
  ON public.rent_guarantees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'developer'
    )
  );

-- ============================================================================
-- STORAGE: M-Pesa statements for underwriting
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('guarantee-documents', 'guarantee-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "guarantee_docs_upload_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'guarantee-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "guarantee_docs_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'guarantee-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('developer', 'landlord')
      )
    )
  );
