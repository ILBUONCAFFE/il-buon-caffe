/**
 * Re-exports drizzle-orm utilities from the shared package.
 *
 * Web app files should import from '@repo/db/orm' instead of 'drizzle-orm'
 * directly. This ensures a single drizzle-orm instance across the monorepo
 * (avoids type incompatibilities when schema and db client are from different
 * instances of drizzle-orm installed in different workspace packages).
 */
export {
  eq, ne, gt, gte, lt, lte,
  and, or, not,
  isNull, isNotNull,
  inArray, notInArray,
  between, notBetween,
  like, ilike, notLike,
  sql,
  desc, asc,
  count, sum, avg, min, max,
  exists, notExists,
} from 'drizzle-orm';
export type { SQL } from 'drizzle-orm';
