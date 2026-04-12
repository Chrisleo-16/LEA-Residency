-- Create push_subscriptions table for storing user push notification subscriptions
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  auth_key text not null,
  p256dh_key text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true,
  user_agent text,
  ip_address text
);

-- Enable row level security
alter table push_subscriptions enable row level security;

-- Create policies
create policy "Users can view their own subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
  on push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index idx_push_subscriptions_user_id on push_subscriptions(user_id);
create index idx_push_subscriptions_endpoint on push_subscriptions(endpoint);
create index idx_push_subscriptions_active on push_subscriptions(is_active);

-- Create updated_at trigger
create or replace function update_push_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger push_subscriptions_updated_at_trigger
before update on push_subscriptions
for each row
execute function update_push_subscriptions_updated_at();
