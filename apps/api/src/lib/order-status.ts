import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { Database } from '@repo/db/client'

export const DEFAULT_ORDER_STATUS = 'pending'

export function currentOrderStatusSql(orderId: SQL | unknown): SQL<string> {
  return sql<string>`COALESCE((
    SELECT osh.new_value
    FROM order_status_history osh
    WHERE osh.order_id = ${orderId}
      AND osh.category = 'status'
    ORDER BY osh.occurred_at DESC, osh.id DESC
    LIMIT 1
  ), ${DEFAULT_ORDER_STATUS})`
}

export function orderStatusEq(orderId: SQL | unknown, status: string): SQL {
  return sql`${currentOrderStatusSql(orderId)} = ${status}`
}

export function orderStatusNe(orderId: SQL | unknown, status: string): SQL {
  return sql`${currentOrderStatusSql(orderId)} <> ${status}`
}

export function orderStatusIn(orderId: SQL | unknown, statuses: string[]): SQL {
  return sql`${currentOrderStatusSql(orderId)} IN (${sql.join(statuses.map((status) => sql`${status}`), sql`, `)})`
}

export async function getCurrentOrderStatus(db: Database, orderId: number): Promise<string> {
  const result = await db.execute(sql`
    SELECT COALESCE((
      SELECT osh.new_value
      FROM order_status_history osh
      WHERE osh.order_id = ${orderId}
        AND osh.category = 'status'
      ORDER BY osh.occurred_at DESC, osh.id DESC
      LIMIT 1
    ), ${DEFAULT_ORDER_STATUS}) AS status
  `)

  return String(result.rows[0]?.status ?? DEFAULT_ORDER_STATUS)
}

export async function getCurrentOrderStatusMap(db: Database, orderIds: number[]): Promise<Map<number, string>> {
  if (orderIds.length === 0) return new Map()

  const result = await db.execute(sql`
    SELECT DISTINCT ON (osh.order_id)
           osh.order_id,
           osh.new_value AS status
    FROM order_status_history osh
    WHERE osh.order_id IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})
      AND osh.category = 'status'
    ORDER BY osh.order_id, osh.occurred_at DESC, osh.id DESC
  `)

  return new Map(
    result.rows.map((row) => [Number(row.order_id), String(row.status)]),
  )
}

export async function attachCurrentOrderStatuses<T extends { id: number }>(
  db: Database,
  rows: T[],
): Promise<Array<T & { status: string }>> {
  const statusMap = await getCurrentOrderStatusMap(db, rows.map((row) => row.id))
  return rows.map((row) => ({
    ...row,
    status: statusMap.get(row.id) ?? DEFAULT_ORDER_STATUS,
  }))
}
