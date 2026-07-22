-- Reconcile the listing schema to support more than sale/long-term-rent:
-- adds a listing_type category, a flexible details bag for type-specific
-- fields, amenities, and a placeholder for future 360/3D virtual tours.
-- Existing rows default to 'sale' so nothing already listed changes shape.

alter table public.listings
  add column if not exists listing_type varchar(20) not null default 'sale'
    check (listing_type in ('sale', 'long_term_rent', 'short_term_rent', 'commercial', 'land')),
  add column if not exists amenities text[] not null default '{}',
  add column if not exists virtual_tour_url text,
  add column if not exists details jsonb not null default '{}';

create index if not exists idx_listings_listing_type on public.listings(listing_type);

comment on column public.listings.listing_type is 'sale, long_term_rent, short_term_rent, commercial, or land';
comment on column public.listings.details is 'Type-specific extra fields, e.g. nightly_price, lease_term_months, land_size_acres, zoning';
comment on column public.listings.virtual_tour_url is 'Placeholder for a future 360/3D virtual tour embed link';
