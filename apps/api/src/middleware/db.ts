/**
 * Database middleware — creates ONE Drizzle client per request.
 *
 * Every handler and downstream middleware reads `c.get('db')` instead of
 * calling `createDb()` individually. This avoids redundant neon() initialisations
 * and keeps the per-request overhead to a single HTTP-client setup.
 *
 * Connection strategy:
 * - Use Neon HTTP driver with DATABASE_URL directly in all environments.
 */
import type { Context, Next } from 'hono'
import { createDb, setHttpMode } from '@repo/db/client'

type DbEnv = { DATABASE_URL: string }

export function dbMiddleware() {
  return async (c: Context, next: Next) => {
    const env = c.env as DbEnv

    // HTTP driver is used universally in this project.
    setHttpMode(true, env.DATABASE_URL)
    const db = createDb(env.DATABASE_URL)

    c.set('db', db)
    await next()
  }
}
