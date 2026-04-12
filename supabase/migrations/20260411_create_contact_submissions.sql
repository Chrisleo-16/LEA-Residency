-- Create contact_submissions table for storing contact form submissions
create table if not exists contact_submissions (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  inquiry_type text not null,
  preferred_contact text not null default 'email',
  agreed_to_terms boolean not null default false,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'closed')),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

-- Enable row level security
alter table contact_submissions enable row level security;

-- Create policies (only admins can view/manage submissions)
create policy "Admins can view all submissions"
  on contact_submissions for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can insert submissions"
  on contact_submissions for insert
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can update submissions"
  on contact_submissions for update
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "Admins can delete submissions"
  on contact_submissions for delete
  using (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for better performance
create index idx_contact_submissions_email on contact_submissions(email);
create index idx_contact_submissions_status on contact_submissions(status);
create index idx_contact_submissions_inquiry_type on contact_submissions(inquiry_type);
create index idx_contact_submissions_created_at on contact_submissions(created_at);

-- Create updated_at trigger
create or replace function update_contact_submissions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contact_submissions_updated_at_trigger
before update on contact_submissions
for each row
execute function update_contact_submissions_updated_at();

-- Add comments
comment on table contact_submissions is 'Stores contact form submissions from the website';
comment on column contact_submissions.status is 'Current status of the submission: new, in_progress, resolved, closed';
comment on column contact_submissions.inquiry_type is 'Type of inquiry: general, property, viewing, partnership, support, complaint';
comment on column contact_submissions.preferred_contact is 'How the contact prefers to be reached: email, phone, whatsapp';
