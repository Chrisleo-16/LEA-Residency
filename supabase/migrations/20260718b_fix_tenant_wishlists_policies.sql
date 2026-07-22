-- Idempotent fix: ensure tenant_wishlists RLS policies exist.
-- If the original migration was applied more than once, a "policy already
-- exists" error on one CREATE POLICY statement can abort the script before
-- later policies run, leaving RLS enabled with no INSERT policy — which
-- makes Postgres deny all access (surfaced by Supabase as a 401).

alter table tenant_wishlists enable row level security;

drop policy if exists "Anyone can submit a wishlist" on tenant_wishlists;
create policy "Anyone can submit a wishlist"
  on tenant_wishlists for insert
  with check (true);

drop policy if exists "Admins can view all wishlists" on tenant_wishlists;
create policy "Admins can view all wishlists"
  on tenant_wishlists for select
  using (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "Admins can update wishlists" on tenant_wishlists;
create policy "Admins can update wishlists"
  on tenant_wishlists for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

drop policy if exists "Admins can delete wishlists" on tenant_wishlists;
create policy "Admins can delete wishlists"
  on tenant_wishlists for delete
  using (auth.jwt() ->> 'role' = 'admin');
