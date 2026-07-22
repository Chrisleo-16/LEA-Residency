-- Tracks whether a pitch has already been folded into the tenant's evening
-- digest SMS, so the nightly cron doesn't re-notify the same pitch twice.
alter table wishlist_pitches add column if not exists notified_at timestamp with time zone;

create index if not exists idx_wishlist_pitches_notified_at
  on wishlist_pitches (notified_at)
  where notified_at is null;

comment on column wishlist_pitches.notified_at is
  'Set once this pitch has been included in the tenant''s evening digest SMS; null means still pending delivery.';


