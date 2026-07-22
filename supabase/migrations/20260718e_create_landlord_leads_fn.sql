-- Lets a landlord see tenant wishlists matched to their OWN listings, without
-- opening up the admin-only SELECT policy on tenant_wishlists to all landlords.
-- SECURITY DEFINER bypasses that RLS internally, but the join on
-- l.created_by = auth.uid() means a landlord only ever sees wishlists that
-- match at least one property they own — never the full wishlist table.
-- Matching logic mirrors notifyMatchingLandlords() in app/api/wishlist/route.ts.
create or replace function public.get_landlord_leads()
returns table (
  wishlist_id uuid,
  first_name text,
  last_name text,
  max_budget bigint,
  neighborhoods text[],
  bedrooms text,
  move_in_date date,
  amenities text[],
  notes text,
  created_at timestamp with time zone,
  listing_id uuid,
  listing_title text,
  already_pitched boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.id,
    w.first_name,
    w.last_name,
    w.max_budget,
    w.neighborhoods,
    w.bedrooms,
    w.move_in_date,
    w.amenities,
    w.notes,
    w.created_at,
    l.id,
    l.title,
    exists (
      select 1 from wishlist_pitches p
      where p.wishlist_id = w.id and p.listing_id = l.id
    )
  from tenant_wishlists w
  join listings l on l.created_by = auth.uid()
  where w.status = 'active'
    and l.price <= w.max_budget
    and (
      (w.bedrooms = 'studio' and l.bedrooms <= 1) or
      (w.bedrooms = '1' and l.bedrooms = 1) or
      (w.bedrooms = '2' and l.bedrooms = 2) or
      (w.bedrooms = '3+' and l.bedrooms >= 3)
    )
    and exists (
      select 1 from unnest(w.neighborhoods) as n(area)
      where l.location ilike '%' || split_part(n.area, ',', 1) || '%'
    )
  order by w.created_at desc;
$$;

revoke all on function public.get_landlord_leads() from public;
grant execute on function public.get_landlord_leads() to authenticated;

comment on function public.get_landlord_leads() is
  'Tenant wishlists matched to the calling landlord''s own listings, scoped via auth.uid() = listings.created_by.';
