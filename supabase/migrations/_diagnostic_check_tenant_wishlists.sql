-- Diagnostic only — not a schema change. Run in Supabase SQL Editor and
-- share the output.

select policyname, cmd, roles, qual, with_check
from pg_policies
where tablename = 'tenant_wishlists';

select has_table_privilege('anon', 'public.tenant_wishlists', 'INSERT') as anon_can_insert;

select has_schema_privilege('anon', 'public', 'USAGE') as anon_has_schema_usage;

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'tenant_wishlists';
