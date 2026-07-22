-- Make "Schedule a Viewing" actually per-listing and actually insertable.
--
-- Two bugs fixed here:
-- 1. viewing_requests had no listing_id, so a viewing request could never be
--    tied back to the property it was about, and the API always notified a
--    single hardcoded landlord phone number instead of the real owner.
-- 2. The original RLS policies required auth.jwt() ->> 'role' = 'admin', a
--    claim nothing in this codebase ever sets (the rest of the app uses the
--    profiles.role column instead) — so anonymous submissions from the public
--    viewing form were very likely being silently rejected by Postgres.

alter table public.viewing_requests
  add column if not exists listing_id uuid references public.listings(id) on delete set null,
  add column if not exists tenant_id uuid references auth.users(id) on delete set null;

create index if not exists idx_viewing_requests_listing_id on public.viewing_requests(listing_id);

drop policy if exists "Admins can view all viewing requests" on public.viewing_requests;
drop policy if exists "Admins can insert viewing requests" on public.viewing_requests;
drop policy if exists "Admins can update viewing requests" on public.viewing_requests;
drop policy if exists "Admins can delete viewing requests" on public.viewing_requests;

-- Anyone (including anonymous visitors) can submit a viewing request,
-- matching the public-lead-capture pattern used by tenant_wishlists.
create policy "Anyone can submit a viewing request"
  on public.viewing_requests for insert
  with check (true);

-- The tenant who submitted the request can see their own.
create policy "Tenants can view their own viewing requests"
  on public.viewing_requests for select
  using (auth.uid() = tenant_id);

-- The owner of the listing being viewed can see (and later confirm) requests for it.
create policy "Listing owners can view requests for their listings"
  on public.viewing_requests for select
  using (
    auth.uid() = (select created_by from public.listings where id = viewing_requests.listing_id)
  );

create policy "Listing owners can update requests for their listings"
  on public.viewing_requests for update
  using (
    auth.uid() = (select created_by from public.listings where id = viewing_requests.listing_id)
  )
  with check (
    auth.uid() = (select created_by from public.listings where id = viewing_requests.listing_id)
  );

-- Developers/staff can see and manage everything, aligned with the
-- profiles.role pattern used throughout the rest of the app.
create policy "Developers can view all viewing requests"
  on public.viewing_requests for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'developer')
  );

create policy "Developers can manage all viewing requests"
  on public.viewing_requests for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'developer')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'developer')
  );

-- RLS policies alone aren't enough — the underlying Postgres role also needs
-- a base table-level GRANT, or Postgres denies the request before RLS is
-- even evaluated (this project has no default privileges configured for
-- new tables — see 20260718c_grant_tenant_wishlists_privileges.sql).
grant usage on schema public to anon, authenticated;
grant insert on public.viewing_requests to anon;
grant select, insert, update on public.viewing_requests to authenticated;
