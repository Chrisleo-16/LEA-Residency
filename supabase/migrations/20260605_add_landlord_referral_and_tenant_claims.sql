-- Add landlord referral and tenant claim support for multi-landlord tenancy

-- Landlord referral links allow a landlord to create a shareable invite link
CREATE TABLE IF NOT EXISTS public.landlord_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_block_id UUID NOT NULL REFERENCES public.landlord_blocks(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referral_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INTEGER NOT NULL DEFAULT 0,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landlord_referral_links_landlord_id ON public.landlord_referral_links(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_referral_links_code ON public.landlord_referral_links(referral_code);

-- Tenant claims track which landlord referral a tenant used and which slot they claimed
CREATE TABLE IF NOT EXISTS public.tenant_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slot_id UUID NOT NULL REFERENCES public.tenant_slots(id) ON DELETE CASCADE,
  landlord_referral_link_id UUID REFERENCES public.landlord_referral_links(id) ON DELETE SET NULL,
  landlord_block_id UUID NOT NULL REFERENCES public.landlord_blocks(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.profiles(id),
  tenant_email TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  referral_code TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landlord_link',
  status TEXT NOT NULL DEFAULT 'claimed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_claims_landlord_id ON public.tenant_claims(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenant_claims_tenant_slot_id ON public.tenant_claims(tenant_slot_id);
CREATE INDEX IF NOT EXISTS idx_tenant_claims_tenant_email ON public.tenant_claims(tenant_email);

-- Keep the main referral code visible for tenant validation.
CREATE POLICY "Landlords can view their own referral links" ON public.landlord_referral_links
  FOR SELECT USING (landlord_id = current_user_id());

CREATE POLICY "Landlords can manage their own referral links" ON public.landlord_referral_links
  FOR ALL USING (landlord_id = current_user_id());

CREATE POLICY "Tenants can view their own tenant claims" ON public.tenant_claims
  FOR SELECT USING (tenant_id = current_user_id());

CREATE POLICY "Landlords can view their own tenant claims" ON public.tenant_claims
  FOR SELECT USING (landlord_id = current_user_id());
