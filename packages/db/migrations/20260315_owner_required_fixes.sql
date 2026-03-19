-- Owner-required final fixes for advisor items that neondb_owner cannot change directly.
-- Current blockers detected:
-- - pgrst.pre_config owner: neon_service
-- - public.set_limit owner: cloud_admin (used by pg_trgm extension move)
--
-- Run this in Neon SQL Editor with an owner/superuser-equivalent role.

BEGIN;

-- 1) Move pg_trgm extension out of public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2) Pin search_path for the pgrst pre_config function.
ALTER FUNCTION pgrst.pre_config() SET search_path = pgrst, pg_catalog, public;

COMMIT;

-- Verification queries:
-- select e.extname, n.nspname as schema
-- from pg_extension e
-- join pg_namespace n on n.oid = e.extnamespace
-- where e.extname = 'pg_trgm';
--
-- select n.nspname as schema, p.proname, coalesce(array_to_string(p.proconfig, ','), '') as proconfig
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'pgrst' and p.proname = 'pre_config';
