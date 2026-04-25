/**
 * Allegro Shipments — on-demand fetch + 5min KV cache.
 *
 * No cron. Admin presses "refresh" or opens an order modal → we hit
 * GET /order/checkout-forms/{id}/shipments, persist to allegro_shipments_snapshot,
 * and append any new statusCode to order_status_history (category='tracking').
 */

import { eq } from 'drizzle-orm'
import { orders } from '@repo/db/schema'
import type { createDb } from '@repo/db/client'
import { getActiveAllegroToken } from './allegro-tokens'
import { allegroHeaders } from './allegro-orders/helpers'
import { recordStatusChange } from './record-status-change'
import type { Env } from '../index'

const KV_TTL_SECONDS = 5 * 60
const KV_PREFIX = 'shipment:fresh:'

export interface ShipmentSnapshotEntry {
  waybill: string
  carrierId: string
  statusCode: string
  statusLabel: string | null
  occurredAt: string | null
  isSelected: boolean
  events?: Array<{ code: string; label: string | null; occurredAt: string | null }>
}

interface AllegroShipmentEvent {
  status?: string
  occurredAt?: string
  description?: string
}

interface AllegroShipmentRow {
  id?: string
  waybill?: string
  trackingNumber?: string
  carrierId?: string
  status?: string
  statusLabel?: string
  occurredAt?: string
  createdAt?: string
  events?: AllegroShipmentEvent[]
  history?: AllegroShipmentEvent[]
}

interface AllegroShipmentsResponse {
  shipments?: AllegroShipmentRow[]
}

const STATUS_LABEL_PL: Record<string, string> = {
  CREATED: 'Etykieta utworzona',
  LABEL_CREATED: 'Etykieta utworzona',
  REGISTERED: 'Zarejestrowana',
  SENT: 'Nadana',
  IN_TRANSIT: 'W drodze',
  OUT_FOR_DELIVERY: 'W doręczeniu',
  DELIVERED: 'Dostarczona',
  PICKED_UP: 'Odebrana',
  RETURNED: 'Zwrócona',
  CANCELLED: 'Anulowana',
  EXCEPTION: 'Problem z doręczeniem',
  FAILED: 'Niepowodzenie doręczenia',
  UNDELIVERED: 'Nie doręczono',
}

function labelFor(code: string | null | undefined): string | null {
  if (!code) return null
  return STATUS_LABEL_PL[code.toUpperCase()] ?? code
}

function normalizeEvent(e: AllegroShipmentEvent): { code: string; label: string | null; occurredAt: string | null } | null {
  const code = e.status?.trim()
  if (!code) return null
  return {
    code,
    label: e.description?.trim() || labelFor(code),
    occurredAt: e.occurredAt ?? null,
  }
}

function mapShipment(row: AllegroShipmentRow, isSelected: boolean): ShipmentSnapshotEntry | null {
  const waybill = (row.waybill ?? row.trackingNumber ?? '').trim()
  if (!waybill) return null
  const events = [...(row.events ?? []), ...(row.history ?? [])]
    .map(normalizeEvent)
    .filter((e): e is NonNullable<ReturnType<typeof normalizeEvent>> => e !== null)
    .sort((a, b) => {
      const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0
      const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0
      return ta - tb
    })
  const latest = events[events.length - 1]
  const statusCode = latest?.code ?? row.status ?? 'UNKNOWN'
  const statusLabel = latest?.label ?? row.statusLabel ?? labelFor(row.status ?? null)
  const occurredAt = latest?.occurredAt ?? row.occurredAt ?? row.createdAt ?? null
  return {
    waybill,
    carrierId: row.carrierId ?? 'UNKNOWN',
    statusCode,
    statusLabel,
    occurredAt,
    isSelected,
    events: events.length > 0 ? events : undefined,
  }
}

export async function fetchAllegroShipments(env: Env, externalId: string): Promise<ShipmentSnapshotEntry[] | null> {
  const token = await getActiveAllegroToken(env)
  if (!token) return null

  const resp = await fetch(`${token.apiBase}/order/checkout-forms/${externalId}/shipments`, {
    signal: AbortSignal.timeout(10_000),
    headers: { ...allegroHeaders(token.accessToken), 'Accept-Language': 'pl-PL' },
  })

  if (!resp.ok) {
    if (resp.status === 404) return []
    console.warn(`[Shipments] GET shipments → ${resp.status} (allegro id: ${externalId})`)
    return null
  }

  const data = (await resp.json()) as AllegroShipmentsResponse
  const rows = data.shipments ?? []
  if (rows.length === 0) return []

  // Selected = first non-cancelled, latest occurredAt; fallback first row.
  const mapped: ShipmentSnapshotEntry[] = []
  for (let i = 0; i < rows.length; i++) {
    const m = mapShipment(rows[i], false)
    if (m) mapped.push(m)
  }
  if (mapped.length === 0) return []

  const sortedIdx = mapped
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const aCancel = a.s.statusCode === 'CANCELLED' ? 1 : 0
      const bCancel = b.s.statusCode === 'CANCELLED' ? 1 : 0
      if (aCancel !== bCancel) return aCancel - bCancel
      const ta = a.s.occurredAt ? Date.parse(a.s.occurredAt) : 0
      const tb = b.s.occurredAt ? Date.parse(b.s.occurredAt) : 0
      return tb - ta
    })
  const selectedIdx = sortedIdx[0].i
  mapped[selectedIdx].isSelected = true

  return mapped
}

export interface RefreshShipmentResult {
  refreshed: boolean
  cached: boolean
  snapshot: ShipmentSnapshotEntry[] | null
}

export async function refreshOrderShipments(
  db: ReturnType<typeof createDb>,
  env: Env,
  orderId: number,
  options: { force?: boolean } = {},
): Promise<RefreshShipmentResult> {
  const [order] = await db
    .select({ id: orders.id, externalId: orders.externalId, source: orders.source, snapshot: orders.allegroShipmentsSnapshot, trackingNumber: orders.trackingNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!order || order.source !== 'allegro' || !order.externalId) {
    return { refreshed: false, cached: false, snapshot: order?.snapshot ?? null }
  }

  const cacheKey = `${KV_PREFIX}${orderId}`
  if (!options.force && env.ALLEGRO_KV) {
    const cached = await env.ALLEGRO_KV.get(cacheKey)
    if (cached) return { refreshed: false, cached: true, snapshot: order.snapshot ?? null }
  }

  const snapshot = await fetchAllegroShipments(env, order.externalId)
  if (snapshot === null) {
    return { refreshed: false, cached: false, snapshot: order.snapshot ?? null }
  }

  // Persist snapshot + sync trackingNumber to selected waybill.
  const selected = snapshot.find((s) => s.isSelected) ?? snapshot[0] ?? null
  await db
    .update(orders)
    .set({
      allegroShipmentsSnapshot: snapshot,
      ...(selected?.waybill && selected.waybill !== order.trackingNumber
        ? { trackingNumber: selected.waybill.slice(0, 100) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))

  // Append new tracking event to history (dedup vs latest history entry).
  if (selected?.statusCode) {
    await recordStatusChange(db, {
      orderId,
      category: 'tracking',
      newValue: selected.statusCode,
      source: 'allegro_sync',
      sourceRef: selected.waybill || null,
      metadata: { carrierId: selected.carrierId, statusLabel: selected.statusLabel, occurredAt: selected.occurredAt },
    }).catch((err) => console.warn('[Shipments] history insert failed', err))
  }

  if (env.ALLEGRO_KV) {
    await env.ALLEGRO_KV.put(cacheKey, '1', { expirationTtl: KV_TTL_SECONDS }).catch(() => {})
  }

  return { refreshed: true, cached: false, snapshot }
}
