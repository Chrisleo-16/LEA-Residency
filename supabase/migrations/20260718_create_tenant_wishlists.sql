-- Create tenant_wishlists table for the reverse-matchmaking flow:
-- a tenant broadcasts what they want, managers get matched and pitch back.
create table if not exists tenant_wishlists (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  max_budget bigint not null,
  neighborhoods text[] not null default '{}',
  bedrooms text not null check (bedrooms in ('studio', '1', '2', '3+')),
  move_in_date date not null,
  amenities text[] not null default '{}',
  notes text,
  agreed_to_terms boolean not null default false,
  status text not null default 'active' check (status in ('active', 'matched', 'closed')),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  closed_at timestamp with time zone
);

-- Enable row level security
alter table tenant_wishlists enable row level security;

-- Anyone (including anonymous visitors) can submit a wishlist
create policy "Anyone can submit a wishlist"
  on tenant_wishlists for insert
  with check (true);

-- Only admins can browse or manage submitted wishlists
create policy "Admins can view all wishlists"
  on tenant_wishlists for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can update wishlists"
  on tenant_wishlists for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can delete wishlists"
  on tenant_wishlists for delete
  using (auth.jwt() ->> 'role' = 'admin');

-- Indexes for matching + admin queries
create index idx_tenant_wishlists_status on tenant_wishlists(status);
create index idx_tenant_wishlists_bedrooms on tenant_wishlists(bedrooms);
create index idx_tenant_wishlists_neighborhoods on tenant_wishlists using gin(neighborhoods);
create index idx_tenant_wishlists_created_at on tenant_wishlists(created_at);

-- Keep updated_at fresh
create or replace function update_tenant_wishlists_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenant_wishlists_updated_at_trigger
before update on tenant_wishlists
for each row
execute function update_tenant_wishlists_updated_at();

comment on table tenant_wishlists is 'Tenant house-hunting wishlists broadcast to managers for reverse matchmaking';
comment on column tenant_wishlists.status is 'active = still hunting, matched = house found, closed = withdrawn';
comment on column tenant_wishlists.bedrooms is 'Desired unit size: studio, 1, 2, 3+';
comment on column tenant_wishlists.neighborhoods is 'Target areas the tenant is open to, e.g. Kilimani, Hurlingham';
comment on column tenant_wishlists.amenities is 'Non-negotiable lifestyle requirements, e.g. borehole water, secure parking';
