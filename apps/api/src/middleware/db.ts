/**
 * Database middleware — creates ONE Drizzle client per request.
 *
 * Every handler and downstream middleware reads `c.get('db')` instead of
 * calling `createDb()` individually. This avoids redundant neon() initialisations
 * and keeps the per-request overhead to a single HTTP-client setup.
 *
 * Connection strategy:
 * - Production (HYPERDRIVE present): WebSocket Pool routed through Hyperdrive for
 *   persistent edge-side connection pooling and reduced TLS handshake overhead.
 * - Local dev (LOCAL_DEV=true) or no HYPERDRIVE binding: Neon HTTP driver with
 *   DATABASE_URL directly — Wrangler's Hyperdrive emulation is incompatible with
 *   @neondatabase/serverless WebSocket Pool.
 */
import type { Context, Next } from 'hono'
import { createDb, setHttpMode } from '@repo/db/client'

type DbEnv = { DATABASE_URL: string; LOCAL_DEV?: string; HYPERDRIVE?: { connectionString: string } }

export function dbMiddleware() {
  return async (c: Context, next: Next) => {
    const env = c.env as DbEnv
    const isLocal = env.LOCAL_DEV === 'true'

    // HTTP Driver is used universally because WebSocket Serverless Pool throws exceptions natively
    // when paired with the local Hyperdrive TCP Proxy endpoint.
    setHttpMode(true, env.DATABASE_URL)
    const db = createDb(env.DATABASE_URL)

    c.set('db', db)
    await next()
  }
}
