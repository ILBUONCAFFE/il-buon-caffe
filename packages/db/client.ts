/**
 * Database Client Factory
 *
 * - Uses Neon HTTP driver with DATABASE_URL.
 *
 * Call `setHttpMode(true, connStr)` to store an explicit URL override.
 */

import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Cloudflare Workers exposes a global WebSocket — required by @neondatabase/serverless Pool.
if (typeof WebSocket !== 'undefined') {
  // @ts-ignore — CF Workers WebSocket lacks `binaryType` vs @neondatabase/serverless's WebSocketLike
  neonConfig.webSocketConstructor = WebSocket;
}

/** When true, createDb uses the HTTP driver instead of WebSocket Pool. */
let _httpMode = false;
let _httpConnectionString: string | null = null;

/**
 * Enable HTTP mode for local development.
 * @param connStr - Direct DATABASE_URL to use.
 */
export function setHttpMode(on: boolean, connStr?: string) {
  _httpMode = on;
  _httpConnectionString = connStr ?? null;
}

/**
 * Create a database client.
 * Automatically switches to HTTP driver when httpMode is enabled.
 * In httpMode, uses the stored DATABASE_URL override when provided.
 */
// createDb always returns the HTTP type.
// Explicit return type avoids union-type overload resolution issues in TypeScript.
export function createDb(connectionString: string): NeonHttpDatabase<typeof schema> {
  const sql = neon(_httpConnectionString ?? connectionString);
  return drizzleHttp({ client: sql, schema });
}

/**
 * Create a database client using Neon's HTTP driver (explicit).
 */
export function createDbHttp(connectionString: string) {
  const sql = neon(connectionString);
  return drizzleHttp({ client: sql, schema });
}

/**
 * Create a database client with an explicit `end()` for lifecycle management.
 * Use this in cron / one-shot contexts where the Pool must be closed after use
 * to prevent hanging WebSocket connections in CF Workers stateless execution.
 *
 * @example
 *   const { db, end } = createDbWithPool(connectionString)
 *   try { await db.select()... } finally { await end() }
 */
export function createDbWithPool(connectionString: string) {
  if (_httpMode) {
    const url = _httpConnectionString ?? connectionString;
    const sql = neon(url);
    const db = drizzleHttp({ client: sql, schema });
    return { db, end: async () => {} }; // HTTP driver has no persistent connection
  }
  const pool = new Pool({ connectionString });
  const db = drizzleWs({ client: pool, schema });
  return { db, end: () => pool.end() };
}

/**
 * Create a WebSocket Pool-based DB client that bypasses _httpMode.
 * Use for bulk operations where the neon HTTP driver would hit the
 * Cloudflare Workers subrequest limit (50 free / 1000 paid).
 * A single WebSocket connection is not subject to that limit.
 *
 * Returns the same `NeonHttpDatabase` type alias as `createDb` — both drivers
 * share the full Drizzle query API, and this cast avoids union-type TS errors.
 */
export function createDbWsPool(connectionString: string): { db: NeonHttpDatabase<typeof schema>; end: () => Promise<void> } {
  const pool = new Pool({ connectionString });
  const db = drizzleWs({ client: pool, schema }) as unknown as NeonHttpDatabase<typeof schema>;
  return { db, end: () => pool.end() };
}

/**
 * Lazy-init HTTP client for Next.js server components/actions.
 * Uses DATABASE_URL from process.env — only works in Node.js runtime.
 */
let _nextDb: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_nextDb) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const sql = neon(url);
    _nextDb = drizzleHttp({ client: sql, schema });
  }
  return _nextDb;
}

/**
 * Type for the database client
 */
export type Database = ReturnType<typeof createDb>;

// Re-export schema
export * from './schema';
