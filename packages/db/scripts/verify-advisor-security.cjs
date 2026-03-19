#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);

  const rls = await sql.query(
    "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname='public' and c.relname in ('users','categories','legal_documents','products','user_consents','order_items','orders','product_images','stock_changes','allegro_credentials','allegro_sync_log','allegro_state','audit_log','password_resets') and c.relkind='r' order by c.relname"
  );

  const extensionRow = await sql.query(
    "select n.nspname as schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm'"
  );

  const fnRows = await sql.query(
    "select n.nspname||'.'||p.proname as fn, coalesce(array_to_string(p.proconfig, ','), '') as cfg from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('update_updated_at_column','update_current_legal_doc')) or (n.nspname='pgrst' and p.proname='pre_config') order by 1"
  );

  const enabled = rls.filter((r) => r.relrowsecurity).length;
  console.log('RLS_ENABLED', enabled + '/' + rls.length);
  console.log('PG_TRGM_SCHEMA', extensionRow[0] ? extensionRow[0].schema : 'missing');
  for (const row of fnRows) {
    console.log('FN_CFG', row.fn, row.cfg || '(empty)');
  }
}

main().catch((err) => {
  console.error('VERIFY_ERROR:' + err.message);
  process.exit(1);
});
