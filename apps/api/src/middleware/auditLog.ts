import type { Context, Next } from 'hono'
import { createDb } from '@repo/db/client'
import { auditLog } from '@repo/db/schema'
import type { TokenPayload } from '../lib/jwt'

/**
 * Audit logging middleware for admin actions
 * Records admin access to sensitive data for RODO compliance
 *
 * Reuses the DB instance from `c.get('db')` (set by dbMiddleware) to avoid
 * creating a second Drizzle client per admin request — saves ~1 CU wake-up.
 *
 * @param action - The action being performed
 */
export function auditLogMiddleware(action: 'view_customer' | 'view_order' | 'export_data' | 'update_customer' | 'anonymize_customer' | 'admin_action') {
  return async (c: Context, next: Next) => {
    // Execute the request first
    await next()
    
    // Only log for successful requests
    if (c.res.status >= 400) {
      return
    }
    
    const user = c.get('user') as TokenPayload | undefined
    
    // Only log admin actions with a real user ID (skip internal proxy with id=0)
    if (!user || user.role !== 'admin' || user.sub === '0') {
      return
    }
    
    try {
      // Reuse DB from middleware context; fallback to creating one if not set
      const dbEnv = c.env as { DATABASE_URL: string; HYPERDRIVE?: { connectionString: string } }
      const db = c.get('db') ?? createDb(dbEnv.HYPERDRIVE?.connectionString ?? dbEnv.DATABASE_URL)
      const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
      const userAgent = c.req.header('User-Agent') || 'unknown'
      
      // Extract target user ID from request params if available
      const targetUserId = c.req.param('userId') 
        ? parseInt(c.req.param('userId')) 
        : undefined
      
      // Extract target order ID from request params if available
      const targetOrderId = c.req.param('orderId')
        ? parseInt(c.req.param('orderId'))
        : undefined
      
      await db.insert(auditLog).values({
        adminId: parseInt(user.sub),
        action,
        targetUserId: targetUserId || null,
        targetOrderId: targetOrderId || null,
        ipAddress,
        userAgent,
        details: {
          path: c.req.path,
          method: c.req.method,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      // Log error but don't fail the request
      console.error('Audit log error:', error)
    }
  }
}

/**
 * Quick helper to log custom audit events
 */
export async function logAuditEvent(
  db: ReturnType<typeof createDb>,
  event: {
    adminId?: number
    action: string
    targetUserId?: number
    targetOrderId?: number
    ipAddress?: string
    userAgent?: string
    details?: Record<string, unknown>
  }
) {
  try {
    await db.insert(auditLog).values({
      adminId: event.adminId || null,
      action: event.action as 'login' | 'logout' | 'view_customer' | 'view_order' | 'export_data' | 'update_customer' | 'anonymize_customer' | 'admin_action',
      targetUserId: event.targetUserId || null,
      targetOrderId: event.targetOrderId || null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      details: event.details || null
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
