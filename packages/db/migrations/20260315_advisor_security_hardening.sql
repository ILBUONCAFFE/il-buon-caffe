-- 2026-03-15: Database advisor security hardening
-- Addresses:
-- - RLS Disabled in Public
-- - Sensitive Columns Exposed
-- - Function Search Path Mutable
-- - Extension in Public (pg_trgm)

BEGIN;

-- 1) Move extension(s) out of public schema.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    BEGIN
      ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not move extension pg_trgm to schema extensions: %', SQLERRM;
    END;
  END IF;
END
$$;

-- 2) Enable RLS on advisor-reported tables (only if they exist).
DO $$
DECLARE
  t TEXT;
  target_tables TEXT[] := ARRAY[
    'users',
    'categories',
    'legal_documents',
    'products',
    'user_consents',
    'order_items',
    'orders',
    'product_images',
    'stock_changes',
    'allegro_credentials',
    'allegro_sync_log',
    'allegro_state',
    'audit_log',
    'password_resets'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END
$$;

-- 3) Lock down sensitive tables for anon/authenticated API roles.
-- Keep explicit grants only on tables that should be publicly readable.
DO $$
DECLARE
  t TEXT;
  role_list TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'users',
    'user_consents',
    'order_items',
    'orders',
    'stock_changes',
    'allegro_credentials',
    'allegro_sync_log',
    'allegro_state',
    'audit_log',
    'password_resets'
  ];
BEGIN
  SELECT string_agg(quote_ident(r.rolname), ', ')
  INTO role_list
  FROM pg_roles r
  WHERE r.rolname IN ('anon', 'authenticated');

  IF role_list IS NULL THEN
    RAISE NOTICE 'Skipping role grants/revokes: roles anon/authenticated not found';
    RETURN;
  END IF;

  FOREACH t IN ARRAY sensitive_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %s', t, role_list);
    END IF;
  END LOOP;
END
$$;

-- 4) Public read-only access for catalog/legal content tables.
-- If your app should not expose these publicly, remove these grants and policies.
DO $$
DECLARE
  role_list TEXT;
BEGIN
  SELECT string_agg(quote_ident(r.rolname), ', ')
  INTO role_list
  FROM pg_roles r
  WHERE r.rolname IN ('anon', 'authenticated');

  IF role_list IS NULL THEN
    RAISE NOTICE 'Skipping public read grants/policies: roles anon/authenticated not found';
    RETURN;
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON TABLE public.categories TO %s', role_list);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'categories'
        AND policyname = 'categories_public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY categories_public_read ON public.categories FOR SELECT TO %s USING (is_active = true)',
        role_list
      );
    END IF;
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON TABLE public.products TO %s', role_list);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'products'
        AND policyname = 'products_public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY products_public_read ON public.products FOR SELECT TO %s USING (is_active = true)',
        role_list
      );
    END IF;
  END IF;

  IF to_regclass('public.product_images') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON TABLE public.product_images TO %s', role_list);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'product_images'
        AND policyname = 'product_images_public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY product_images_public_read ON public.product_images FOR SELECT TO %s USING (true)',
        role_list
      );
    END IF;
  END IF;

  IF to_regclass('public.legal_documents') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON TABLE public.legal_documents TO %s', role_list);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'legal_documents'
        AND policyname = 'legal_documents_public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY legal_documents_public_read ON public.legal_documents FOR SELECT TO %s USING (effective_from <= now())',
        role_list
      );
    END IF;
  END IF;
END
$$;

-- 5) Fix mutable search_path on reported functions.
DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('update_updated_at_column', 'update_current_legal_doc')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = pg_catalog, public',
        f.schema_name,
        f.function_name,
        f.args
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter function %.%: %', f.schema_name, f.function_name, SQLERRM;
    END;
  END LOOP;
END
$$;

DO $$
DECLARE
  f RECORD;
BEGIN
  FOR f IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'pgrst'
      AND p.proname = 'pre_config'
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = pgrst, pg_catalog, public',
        f.schema_name,
        f.function_name,
        f.args
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter function %.%: %', f.schema_name, f.function_name, SQLERRM;
    END;
  END LOOP;
END
$$;

COMMIT;
