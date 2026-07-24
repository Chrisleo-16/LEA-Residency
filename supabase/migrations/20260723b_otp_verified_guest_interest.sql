-- Lets a tenant express interest WITHOUT an account, by verifying their
-- phone number with an SMS code instead of logging in. Replaces the hard
-- login requirement on "I'm Interested" with a lighter phone-ownership
-- check — matches the precedent already set by viewing_requests, which
-- accepts anonymous submissions with raw name/phone fields.
--
-- interest_verification_codes is intentionally NOT given any RLS policies
-- (RLS enabled, zero grants to anon/authenticated) — the only way a row is
-- read or written is via the server-side API routes using the service-role
-- client. This guarantees a listing_interests guest row can only ever be
-- created after a real code match, not via a directly-callable open policy.
create table if not exists public.interest_verification_codes (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamp with time zone not null,
  attempts integer not null default 0,
  verified boolean not null default false,
  created_at timestamp with time zone default now()
);

alter table public.interest_verification_codes enable row level security;

create index idx_interest_verification_codes_lookup
  on public.interest_verification_codes(listing_id, phone, created_at desc);

comment on table public.interest_verification_codes is 'Short-lived SMS codes proving phone ownership for guest (no-account) "I''m Interested" taps. Server-side (service role) access only.';

-- listing_interests: tenant_id becomes optional, guest_name/guest_phone
-- added for the no-account path. Exactly one of (tenant_id) or
-- (guest_phone) must be set.
alter table public.listing_interests
  alter column tenant_id drop not null,
  add column if not exists guest_name text,
  add column if not exists guest_phone text,
  add constraint listing_interests_tenant_or_guest check (
    (tenant_id is not null and guest_phone is null) or
    (tenant_id is null and guest_phone is not null)
  );

-- Prevent duplicate guest submissions the same way the existing
-- unique(listing_id, tenant_id) prevents duplicate account submissions.
create unique index if not exists idx_listing_interests_listing_guest_phone
  on public.listing_interests(listing_id, guest_phone)
  where guest_phone is not null;

comment on column public.listing_interests.guest_name is 'Name given at OTP verification time, for a tenant with no account';
comment on column public.listing_interests.guest_phone is 'Phone verified via interest_verification_codes, for a tenant with no account';
