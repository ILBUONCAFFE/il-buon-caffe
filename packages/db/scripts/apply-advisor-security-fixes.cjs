#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const RLS_TABLES = [
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
  'password_resets',
];

const SENSITIVE_TABLES = [
  'users',
  'user_consents',
  'order_items',
  'orders',
  'stock_changes',
  'allegro_credentials',
  'allegro_sync_log',
  'allegro_state',
  'audit_log',
  'password_resets',
];

const PUBLIC_READ_POLICIES = [
  {
    table: 'categories',
    policy: 'categories_public_read',
    usingExpr: 'is_active = true',
  },
  {
    table: 'products',
    policy: 'products_public_read',
    usingExpr: 'is_active = true',
  },
  {
    table: 'product_images',
    policy: 'product_images_public_read',
    usingExpr: 'true',
  },
  {
    table: 'legal_documents',
    policy: 'legal_documents_public_read',
    usingExpr: 'effective_from <= now()',
  },
];

function qIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function tableExists(sql, schema, table) {
  const rows = await sql.query(
    "select to_regclass($1) is not null as exists",
    [schema + '.' + table],
  );
  return Boolean(rows[0] && rows[0].exists);
}

async function policyExists(sql, table, policy) {
  const rows = await sql.query(
    "select exists (select 1 from pg_policies where schemaname='public' and tablename=$1 and policyname=$2) as exists",
    [table, policy],
  );
  return Boolean(rows[0] && rows[0].exists);
}

async function functionExists(sql, schema, fnName) {
  const rows = await sql.query(
    "select oid, pg_get_function_identity_arguments(oid) as args from pg_proc where pronamespace = $1::regnamespace and proname = $2",
    [schema, fnName],
  );
  return rows;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);

  const roleRows = await sql.query(
    "select rolname from pg_roles where rolname in ('anon','authenticated') order by rolname",
  );
  const apiRoles = roleRows.map((r) => r.rolname);
  const hasApiRoles = apiRoles.length > 0;
  const roleList = hasApiRoles ? apiRoles.join(', ') : '';

  await sql.query('create schema if not exists extensions');

  const extRows = await sql.query(
    "select extname from pg_extension where extname = 'pg_trgm'",
  );
  if (extRows.length > 0) {
    try {
      await sql.query('alter extension pg_trgm set schema extensions');
    } catch (err) {
      // Some managed environments do not allow altering extension ownership/schema.
      console.warn('PG_TRGM_MOVE_SKIPPED:' + err.message);
    }
  }

  for (const table of RLS_TABLES) {
    if (await tableExists(sql, 'public', table)) {
      await sql.query(
        'alter table public.' + qIdent(table) + ' enable row level security',
      );
    }
  }

  for (const table of SENSITIVE_TABLES) {
    if (await tableExists(sql, 'public', table)) {
      if (hasApiRoles) {
        await sql.query(
          'revoke all privileges on table public.' + qIdent(table) + ' from ' + roleList,
        );
      }
    }
  }

  for (const item of PUBLIC_READ_POLICIES) {
    if (!(await tableExists(sql, 'public', item.table))) continue;

    if (!hasApiRoles) continue;

    await sql.query(
      'grant select on table public.' + qIdent(item.table) + ' to ' + roleList,
    );

    if (!(await policyExists(sql, item.table, item.policy))) {
      await sql.query(
        'create policy ' +
          qIdent(item.policy) +
          ' on public.' +
          qIdent(item.table) +
          ' for select to ' +
          roleList +
          ' using (' +
          item.usingExpr +
          ')',
      );
    }
  }

  const publicFunctions = ['update_updated_at_column', 'update_current_legal_doc'];
  for (const fnName of publicFunctions) {
    const fns = await functionExists(sql, 'public', fnName);
    for (const fn of fns) {
      try {
        await sql.query(
          'alter function public.' +
            qIdent(fnName) +
            '(' +
            fn.args +
            ') set search_path = pg_catalog, public',
        );
      } catch (err) {
        console.warn('PUBLIC_FUNCTION_PATH_SKIPPED:' + fnName + ':' + err.message);
      }
    }
  }

  const pgrstFns = await functionExists(sql, 'pgrst', 'pre_config');
  for (const fn of pgrstFns) {
    try {
      await sql.query(
        'alter function pgrst.pre_config(' +
          fn.args +
          ') set search_path = pgrst, pg_catalog, public',
      );
    } catch (err) {
      console.warn('PGRST_FUNCTION_PATH_SKIPPED:' + err.message);
    }
  }

  if (!hasApiRoles) {
    console.warn('API_ROLES_SKIPPED: roles anon/authenticated are not present');
  }

  console.log('ADVISOR_FIXES_APPLIED');
}

main().catch((err) => {
  console.error('ADVISOR_FIXES_ERROR:' + err.message);
  process.exit(1);
});
