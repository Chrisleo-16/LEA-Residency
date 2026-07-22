-- Tracks whether a user has completed (or skipped) the in-app guided tour.
alter table profiles add column if not exists tour_completed boolean not null default false;
comment on column profiles.tour_completed is 'Whether the user has completed or dismissed the sidebar guided tour.';
