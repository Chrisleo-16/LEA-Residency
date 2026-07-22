-- Records a landlord's "Pitch My Room" response to a matched tenant wishlist.
create table if not exists wishlist_pitches (
  id uuid default gen_random_uuid() primary key,
  wishlist_id uuid not null references tenant_wishlists(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  landlord_id uuid not null references auth.users(id) on delete cascade,
  message text,
  created_at timestamp with time zone default now(),
  unique (wishlist_id, listing_id)
);

alter table wishlist_pitches enable row level security;

create policy "Landlords can view their own pitches"
  on wishlist_pitches for select
  using (auth.uid() = landlord_id);

create policy "Landlords can create their own pitches"
  on wishlist_pitches for insert
  with check (auth.uid() = landlord_id);

create policy "Admins can view all pitches"
  on wishlist_pitches for select
  using (auth.jwt() ->> 'role' = 'admin');

-- RLS policies alone aren't enough — the underlying Postgres role also
-- needs a base table-level GRANT (see tenant_wishlists migration history).
grant usage on schema public to authenticated;
grant select, insert on public.wishlist_pitches to authenticated;

create index idx_wishlist_pitches_wishlist_id on wishlist_pitches(wishlist_id);
create index idx_wishlist_pitches_landlord_id on wishlist_pitches(landlord_id);
