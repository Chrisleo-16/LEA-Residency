-- Records a tenant tapping "I'm Interested" on a listing. This is the
-- automation piece: one tap here triggers a push (and best-effort SMS) to
-- the listing owner with the tenant's name and phone number, so leads land
-- directly with the landlord instead of going through an agent.
create table if not exists public.listing_interests (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  message text,
  created_at timestamp with time zone default now(),
  unique (listing_id, tenant_id)
);

alter table public.listing_interests enable row level security;

create policy "Tenants can view their own interests"
  on public.listing_interests for select
  using (auth.uid() = tenant_id);

create policy "Tenants can express interest"
  on public.listing_interests for insert
  with check (auth.uid() = tenant_id);

create policy "Listing owners can view interest in their listings"
  on public.listing_interests for select
  using (
    auth.uid() = (select created_by from public.listings where id = listing_interests.listing_id)
  );

create policy "Developers can view all interests"
  on public.listing_interests for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'developer')
  );

grant usage on schema public to authenticated;
grant select, insert on public.listing_interests to authenticated;

create index idx_listing_interests_listing_id on public.listing_interests(listing_id);
create index idx_listing_interests_tenant_id on public.listing_interests(tenant_id);

comment on table public.listing_interests is 'Tenant "I''m Interested" taps on a listing — triggers landlord auto-notify with tenant contact info';
