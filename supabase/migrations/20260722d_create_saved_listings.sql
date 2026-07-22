-- Persists the listing "favorite" heart, which previously was local React
-- state only and reset on every reload.
create table if not exists public.saved_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (user_id, listing_id)
);

alter table public.saved_listings enable row level security;

create policy "Users can view their own saved listings"
  on public.saved_listings for select
  using (auth.uid() = user_id);

create policy "Users can save listings"
  on public.saved_listings for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave listings"
  on public.saved_listings for delete
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, delete on public.saved_listings to authenticated;

create index idx_saved_listings_user_id on public.saved_listings(user_id);
create index idx_saved_listings_listing_id on public.saved_listings(listing_id);
