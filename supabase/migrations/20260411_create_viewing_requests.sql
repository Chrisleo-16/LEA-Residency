-- Create viewing_requests table for storing property viewing scheduling requests
create table if not exists viewing_requests (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  property_type text not null,
  preferred_date date not null,
  preferred_time text not null,
  message text,
  group_size text not null,
  budget text,
  urgency text not null check (urgency in ('immediate', 'soon', 'flexible')),
  agreed_to_terms boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Enable row level security
alter table viewing_requests enable row level security;

-- Create policies (only admins can view/manage viewing requests)
create policy "Admins can view all viewing requests"
  on viewing_requests for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can insert viewing requests"
  on viewing_requests for insert
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can update viewing requests"
  on viewing_requests for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can delete viewing requests"
  on viewing_requests for delete
  using (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for better performance
create index idx_viewing_requests_email on viewing_requests(email);
create index idx_viewing_requests_status on viewing_requests(status);
create index idx_viewing_requests_preferred_date on viewing_requests(preferred_date);
create index idx_viewing_requests_property_type on viewing_requests(property_type);
create index idx_viewing_requests_urgency on viewing_requests(urgency);
create index idx_viewing_requests_created_at on viewing_requests(created_at);

-- Create updated_at trigger
create or replace function update_viewing_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger viewing_requests_updated_at_trigger
before update on viewing_requests
for each row
execute function update_viewing_requests_updated_at();

-- Add comments
comment on table viewing_requests is 'Stores property viewing scheduling requests from the website';
comment on column viewing_requests.status is 'Current status of the request: pending, confirmed, completed, cancelled';
comment on column viewing_requests.property_type is 'Type of property requested: apartment, villa, townhouse, penthouse, studio, student-housing';
comment on column viewing_requests.preferred_time is 'Preferred time slot: morning, afternoon, evening';
comment on column viewing_requests.urgency is 'Move-in urgency: immediate, soon, flexible';
comment on column viewing_requests.group_size is 'Number of people in the group: 1, 2, 3, 4, 5+';
