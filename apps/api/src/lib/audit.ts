import { auditLog } from '@repo/db/schema'

type AuditValues = typeof auditLog.$inferInsert

/**
 * Insert an admin audit log entry.
 * Accepts `adminSub` (the JWT `sub` claim as a string) instead of `adminId`
 * to consolidate the scattered `parseInt(admin.sub)` calls.
 */
export async function logAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  opts: Omit<AuditValues, 'adminId'> & { adminSub: string },
): Promise<void> {
  const { adminSub, ...values } = opts
  await db.insert(auditLog).values({ ...values, adminId: parseInt(adminSub) })
}
