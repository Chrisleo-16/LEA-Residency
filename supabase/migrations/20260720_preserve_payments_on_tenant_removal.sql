-- Payment history must survive tenant removal, even though the tenant's
-- profile, messages, complaints, and requests are deleted. Previously
-- payments.tenant_id -> profiles.id was ON DELETE CASCADE, so approving a
-- tenant account-deletion request silently wiped their entire payment history.

alter table payments add column if not exists tenant_name text;
alter table payments add column if not exists tenant_email text;
comment on column payments.tenant_name is 'Snapshot of the tenant''s name, captured before profile deletion so payment history stays readable.';
comment on column payments.tenant_email is 'Snapshot of the tenant''s email, captured before profile deletion so payment history stays readable.';

alter table payments drop constraint if exists payments_tenant_id_fkey;
alter table payments
  add constraint payments_tenant_id_fkey
  foreign key (tenant_id) references profiles(id) on delete set null;
