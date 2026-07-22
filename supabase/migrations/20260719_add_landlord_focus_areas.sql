-- Lets a landlord personalize which sidebar sections they see, chosen during
-- setup ("what do you want LEA to help you with?") and editable later from
-- Settings. Null means "show everything" — the safe default for existing
-- landlords who set up before this column existed.
alter table profiles add column if not exists focus_areas text[];

comment on column profiles.focus_areas is
  'Landlord-selected sidebar focus areas (e.g. rent, tenants, maintenance, staff, policy). Null = show the full menu.';
