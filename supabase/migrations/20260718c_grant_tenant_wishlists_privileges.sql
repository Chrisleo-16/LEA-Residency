    -- RLS policies only govern row-level access; the underlying Postgres role
    -- also needs a base table-level GRANT, or Postgres denies the request
    -- before RLS is even evaluated (surfaced by Supabase as a 401).
    -- The original migration relied on project-level default privileges, which
    -- this project apparently doesn't have configured for new tables.

    grant usage on schema public to anon, authenticated;

    grant insert on public.tenant_wishlists to anon;
    grant select, insert, update, delete on public.tenant_wishlists to authenticated;
