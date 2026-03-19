/**
 * Database client for Next.js — thin proxy over @repo/db/client.
 *
 * Using getDb() from the shared package ensures a SINGLE drizzle-orm instance
 * across the monorepo. All type imports come from @repo/db to avoid the
 * duplicate-instance incompatibility that arises from importing drizzle-orm
 * directly in this workspace.
 */
import { getDb } from '@repo/db/client';
import type { Database } from '@repo/db/client';

export { getDb };
export type { Database };

// Proxy-based lazy accessor — allows `import { db } from '@/db'` usage
// without calling getDb() at import time (safe for SSR/edge environments).
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
