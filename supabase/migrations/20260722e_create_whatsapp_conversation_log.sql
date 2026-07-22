-- Tracks WhatsApp business-initiated template sends so we can enforce Meta's
-- rolling-24h unique-new-conversation messaging limit ourselves before Meta
-- rejects a send outright, and expose current usage to the dashboard.
--
-- Each row is one send attempt. is_new_conversation = true means this send
-- opened a fresh 24h conversation window (counts against the cap); false means
-- it reused an already-open window (free, per WhatsApp's own rules). A
-- 'skipped_quota' status row means we deliberately did not call the WhatsApp
-- API because the cap was already reached that rolling window.
create table if not exists public.whatsapp_conversation_log (
  id uuid default gen_random_uuid() primary key,
  recipient_phone text not null,
  template_name text not null,
  is_new_conversation boolean not null,
  status text not null check (status in ('sent', 'failed', 'skipped_quota')),
  message_id text,
  created_at timestamp with time zone default now()
);

create index idx_whatsapp_log_recipient on public.whatsapp_conversation_log(recipient_phone);
create index idx_whatsapp_log_new_conv_time on public.whatsapp_conversation_log(is_new_conversation, created_at);

alter table public.whatsapp_conversation_log enable row level security;

-- Deliberately no policies for anon/authenticated: this table is written and
-- read exclusively via the service-role client server-side (same pattern as
-- push_subscriptions in lib/pushServer.ts), and service_role bypasses RLS
-- entirely, so default-deny is correct here rather than an oversight.

comment on table public.whatsapp_conversation_log is 'Tracks WhatsApp template sends to enforce and report the rolling-24h unique-new-conversation messaging cap';
comment on column public.whatsapp_conversation_log.is_new_conversation is 'true = opened a new 24h window (counts against the cap), false = reused an already-open window (free)';
comment on column public.whatsapp_conversation_log.status is 'sent, failed, or skipped_quota (cap was already reached, so we never called the WhatsApp API)';
