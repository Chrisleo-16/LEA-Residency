-- Standing policy: every landlord (existing and future) gets 30 days of free
-- access before the subscription paywall applies. Set once, lazily, in
-- GET /api/billing/status the first time a landlord's subscription row is seen.
alter table landlord_subscriptions add column if not exists free_access_until timestamptz;
comment on column landlord_subscriptions.free_access_until is 'Standing 30-day free-access grant, set once on first billing status check; access is unblocked while this is in the future regardless of status.';
