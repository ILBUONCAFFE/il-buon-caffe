/**
 * Allegro Shipments — on-demand fetch + 5min KV cache.
 *
 * Realne źródła statusu w Allegro REST API:
 *   1. GET /order/checkout-forms/{id}/shipments
 *      → lista paczek: { id, waybill, carrierId, carrierName }
 *   2. GET /order/carriers/{carrierId}/tracking?waybill={waybill}
 *      → historia statusów przewoźnika: waybills[].trackingDetails.statuses
 *   3. GET /shipment-management/shipments/{shipmentId}
 *      → fallback dla "Wysyłam z Allegro" (gdy mamy `id`)
 */

import { eq } from 'drizzle-orm'
import { orders } from '@repo/db/schema'
import type { createDb } from '@repo/db/client'
import { getActiveAllegroToken } from './allegro-tokens'
import { allegroHeaders } from './allegro-orders/helpers'
import { recordStatusChange } from './record-status-change'
import { currentOrderStatusSql } from './order-status'
import type { Env } from '../index'

// Tylko stany "wyższe" niż 'nadane' (paczka istnieje, więc waybill = nadane).
// Nie mapujemy READY_FOR_SHIPMENT/PROCESSING/NEW — Allegro fulfillment często
// laguje za rzeczywistym stanem paczki, a obecność wpisu w /shipments oznacza
// że paczka została już nadana → minimum 'SENT'.
const FULFILLMENT_TO_SHIPMENT_CODE: Record<string, string> = {
  PICKED_UP: 'DELIVERED',
  SENT: 'SENT',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
}

const KV_TTL_SECONDS = 5 * 60
const KV_PREFIX = 'shipment:fresh:'

export interface ShipmentSnapshotEntry {
  waybill: string
  carrierId: string
  carrierName?: string | null
  statusCode: string
  statusLabel: string | null
  occurredAt: string | null
  isSelected: boolean
  events?: Array<{ code: string; label: string | null; occurredAt: string | null }>
}

interface AllegroShipmentRow {
  id?: string
  waybill?: string
  trackingNumber?: string
  carrierId?: string
  carrierName?: string
  createdAt?: string
}

interface AllegroShipmentsResponse {
  shipments?: AllegroShipmentRow[]
}

interface AllegroSmStatusEntry {
  status?: string
  occurredAt?: string
  description?: string
}

interface AllegroSmShipmentResponse {
  id?: string
  status?: string
  statusHistory?: AllegroSmStatusEntry[]
  history?: AllegroSmStatusEntry[]
  waybill?: string
  carrier?: { id?: string; name?: string }
  createdAt?: string
  updatedAt?: string
}

const STATUS_LABEL_PL: Record<string, string> = {
  NEW: 'Nowa',
  CREATED: 'Etykieta utworzona',
  LABEL_CREATED: 'Etykieta utworzona',
  LABEL_PRINTED: 'Etykieta wydrukowana',
  PRINTED: 'Etykieta wydrukowana',
  READY: 'Gotowa do nadania',
  REGISTERED: 'Zarejestrowana',
  SENT: 'Nadana',
  PENDING: 'Oczekuje na nadanie',
  PICKED_UP: 'Odebrana przez kuriera',
  IN_TRANSIT: 'W drodze',
  RELEASED_FOR_DELIVERY: 'W doręczeniu',
  ARRIVED_CARRIER_FACILITY: 'W sortowni',
  DEPARTED_CARRIER_FACILITY: 'Opuściła sortownię',
  OUT_FOR_DELIVERY: 'W doręczeniu',
  DELIVERED: 'Dostarczona',
  READY_FOR_PICKUP: 'Gotowa do odbioru',
  PICKUP_READY: 'Gotowa do odbioru',
  AVAILABLE_FOR_PICKUP: 'Czeka w punkcie',
  NOTICE_LEFT: 'Awizowana',
  RETURNED: 'Zwrócona',
  RETURN_TO_SENDER: 'Zwrot do nadawcy',
  CANCELLED: 'Anulowana',
  EXCEPTION: 'Problem z doręczeniem',
  HOLD: 'Wstrzymana',
  FAILED: 'Niepowodzenie doręczenia',
  UNDELIVERED: 'Nie doręczono',
  ERROR: 'Błąd przesyłki',
}

function labelFor(code: string | null | undefined): string | null {
  if (!code) return null
  return STATUS_LABEL_PL[code.toUpperCase()] ?? code
}

function normalizeEvent(e: AllegroSmStatusEntry): { code: string; label: string | null; occurredAt: string | null } | null {
  const code = (e.status ?? '').trim().toUpperCase()
  if (!code) return null
  return {
    code,
    label: e.description?.trim() || labelFor(code),
    occurredAt: e.occurredAt ?? null,
  }
}

async function findSmShipmentIdByWaybill(
  apiBase: string,
  accessToken: string,
  waybill: string,
): Promise<string | null> {
  if (!waybill) return null
  try {
    const url = `${apiBase}/shipment-management/shipments?waybill=${encodeURIComponent(waybill)}&limit=5`
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { ...allegroHeaders(accessToken), 'Accept-Language': 'pl-PL' },
    })
    if (!resp.ok) {
      if (resp.status !== 404) console.warn(`[Shipments] SM list ${waybill} → ${resp.status}`)
      return null
    }
    const data = (await resp.json()) as { shipments?: Array<{ id?: string; waybill?: string }> }
    const list = data.shipments ?? []
    const match = list.find((s) => (s.waybill ?? '').trim() === waybill) ?? list[0]
    return match?.id ?? null
  } catch (err) {
    console.warn(`[Shipments] SM list lookup failed ${waybill}`, err)
    return null
  }
}

async function fetchSmShipment(
  apiBase: string,
  accessToken: string,
  shipmentId: string,
): Promise<AllegroSmShipmentResponse | null> {
  try {
    const resp = await fetch(`${apiBase}/shipment-management/shipments/${encodeURIComponent(shipmentId)}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { ...allegroHeaders(accessToken), 'Accept-Language': 'pl-PL' },
    })
    if (!resp.ok) {
      if (resp.status !== 404) {
        console.warn(`[Shipments] SM GET ${shipmentId} → ${resp.status}`)
      }
      return null
    }
    return (await resp.json()) as AllegroSmShipmentResponse
  } catch (err) {
    console.warn(`[Shipments] SM GET ${shipmentId} failed`, err)
    return null
  }
}

interface AllegroCarrierTrackingEvent {
  code?: string
  status?: string
  description?: string
  occurredAt?: string
  date?: string
  time?: string
}

interface AllegroCarrierTrackingWaybill {
  waybill?: string
  trackingDetails?: {
    statuses?: AllegroCarrierTrackingEvent[]
    createdAt?: string
  } | null
  statuses?: AllegroCarrierTrackingEvent[]
  events?: AllegroCarrierTrackingEvent[]
  history?: AllegroCarrierTrackingEvent[]
}

interface AllegroCarrierTrackingResponse {
  waybills?: AllegroCarrierTrackingWaybill[]
  shipments?: AllegroCarrierTrackingWaybill[]
  packages?: AllegroCarrierTrackingWaybill[]
  items?: AllegroCarrierTrackingWaybill[]
  tracking?: AllegroCarrierTrackingWaybill[]
  trackingHistory?: AllegroCarrierTrackingWaybill[]
  events?: AllegroCarrierTrackingEvent[]
  history?: AllegroCarrierTrackingEvent[]
  status?: string
}

function normalizeCarrierEvent(e: AllegroCarrierTrackingEvent): { code: string; label: string | null; occurredAt: string | null } | null {
  const code = (e.code ?? e.status ?? '').trim().toUpperCase()
  if (!code) return null
  return {
    code,
    label: e.description?.trim() || labelFor(code),
    occurredAt: e.occurredAt ?? e.time ?? e.date ?? null,
  }
}

function collectCarrierEvents(data: AllegroCarrierTrackingResponse, waybill: string): AllegroCarrierTrackingEvent[] {
  const normalizedWaybill = waybill.trim().toUpperCase()
  const buckets = [
    ...(data.waybills ?? []),
    ...(data.shipments ?? []),
    ...(data.packages ?? []),
    ...(data.items ?? []),
    ...(data.tracking ?? []),
    ...(data.trackingHistory ?? []),
  ]

  const matchingBucket = buckets.find((bucket) => {
    const bucketWaybill = (bucket.waybill ?? '').trim().toUpperCase()
    return !bucketWaybill || bucketWaybill === normalizedWaybill
  })

  const bucketEvents = matchingBucket
    ? [
        ...(matchingBucket.trackingDetails?.statuses ?? []),
        ...(matchingBucket.statuses ?? []),
        ...(matchingBucket.events ?? []),
        ...(matchingBucket.history ?? []),
      ]
    : []

  return [
    ...bucketEvents,
    ...(data.events ?? []),
    ...(data.history ?? []),
  ]
}

async function fetchCarrierTracking(
  apiBase: string,
  accessToken: string,
  carrierId: string,
  waybill: string,
): Promise<Array<{ code: string; label: string | null; occurredAt: string | null }>> {
  if (!carrierId || !waybill || carrierId === 'UNKNOWN') return []
  try {
    const url = `${apiBase}/order/carriers/${encodeURIComponent(carrierId)}/tracking?waybill=${encodeURIComponent(waybill)}`
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { ...allegroHeaders(accessToken), 'Accept-Language': 'pl-PL' },
    })
    if (!resp.ok) {
      if (resp.status !== 404) console.warn(`[Shipments] tracking ${carrierId}/${waybill} → ${resp.status}`)
      return []
    }
    const data = (await resp.json()) as AllegroCarrierTrackingResponse
    const raw = collectCarrierEvents(data, waybill)
    const normalized = raw
      .map(normalizeCarrierEvent)
      .filter((e): e is NonNullable<ReturnType<typeof normalizeCarrierEvent>> => e !== null)
      .sort((a, b) => {
        const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0
        const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0
        return ta - tb
      })
    const dedup: typeof normalized = []
    for (const e of normalized) {
      const prev = dedup[dedup.length - 1]
      if (!prev || prev.code !== e.code) dedup.push(e)
    }
    return dedup
  } catch (err) {
    console.warn(`[Shipments] tracking fetch failed ${carrierId}/${waybill}`, err)
    return []
  }
}

async function fetchFulfillmentStatus(
  apiBase: string,
  accessToken: string,
  externalId: string,
): Promise<string | null> {
  try {
    const resp = await fetch(`${apiBase}/order/checkout-forms/${externalId}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { ...allegroHeaders(accessToken), 'Accept-Language': 'pl-PL' },
    })
    if (!resp.ok) {
      if (resp.status !== 404) console.warn(`[Shipments] GET checkout-form ${externalId} → ${resp.status}`)
      return null
    }
    const data = (await resp.json()) as { fulfillment?: { status?: string } }
    const raw = data.fulfillment?.status?.trim().toUpperCase()
    return raw || null
  } catch (err) {
    console.warn(`[Shipments] GET checkout-form ${externalId} failed`, err)
    return null
  }
}

export interface FetchShipmentsResult {
  shipments: ShipmentSnapshotEntry[]
  fulfillmentStatus: string | null
}

export async function fetchAllegroShipments(env: Env, externalId: string): Promise<FetchShipmentsResult | null> {
  const token = await getActiveAllegroToken(env)
  if (!token) return null

  const [shipmentsResp, fulfillmentStatus] = await Promise.all([
    fetch(`${token.apiBase}/order/checkout-forms/${externalId}/shipments`, {
      signal: AbortSignal.timeout(10_000),
      headers: { ...allegroHeaders(token.accessToken), 'Accept-Language': 'pl-PL' },
    }),
    fetchFulfillmentStatus(token.apiBase, token.accessToken, externalId),
  ])

  if (!shipmentsResp.ok) {
    if (shipmentsResp.status === 404) return { shipments: [], fulfillmentStatus }
    console.warn(`[Shipments] GET shipments → ${shipmentsResp.status} (allegro id: ${externalId})`)
    return null
  }

  const data = (await shipmentsResp.json()) as AllegroShipmentsResponse
  const rows = data.shipments ?? []
  if (rows.length === 0) return { shipments: [], fulfillmentStatus }

  const fulfillmentDerivedCode = fulfillmentStatus
    ? FULFILLMENT_TO_SHIPMENT_CODE[fulfillmentStatus] ?? null
    : null

  const enriched = await Promise.all(
    rows.map(async (row): Promise<ShipmentSnapshotEntry | null> => {
      const waybill = (row.waybill ?? row.trackingNumber ?? '').trim()
      if (!waybill) return null
      const carrierId = row.carrierId ?? 'UNKNOWN'

      // Źródła w kolejności priorytetu:
      //   1. /order/carriers/{carrierId}/tracking?waybill= — realne zdarzenia kuriera
      //   2. /shipment-management/shipments/{id} — tylko Wysyłam z Allegro
      //   3. fulfillment.status — fallback (PICKED_UP, SENT, etc.)
      let events: Array<{ code: string; label: string | null; occurredAt: string | null }> = []
      let smStatus: string | null = null
      let smOccurredAt: string | null = null

      const carrierEvents = await fetchCarrierTracking(token.apiBase, token.accessToken, carrierId, waybill)
      if (carrierEvents.length > 0) {
        events = carrierEvents
      }

      // SM lookup: użyj row.id jeśli jest, inaczej spróbuj znaleźć po waybill.
      let smShipmentId = row.id ?? null
      if (events.length === 0 && !smShipmentId) {
        smShipmentId = await findSmShipmentIdByWaybill(token.apiBase, token.accessToken, waybill)
        if (smShipmentId) {
          console.log(`[Shipments][debug] SM id resolved by waybill ${waybill} → ${smShipmentId}`)
        }
      }

      if (events.length === 0 && smShipmentId) {
        const sm = await fetchSmShipment(token.apiBase, token.accessToken, smShipmentId)
        if (sm) {
          smStatus = sm.status?.trim().toUpperCase() ?? null
          const rawHistory = sm.statusHistory ?? sm.history ?? []
          const smEvents = rawHistory
            .map(normalizeEvent)
            .filter((e): e is NonNullable<ReturnType<typeof normalizeEvent>> => e !== null)
            .sort((a, b) => {
              const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0
              const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0
              return ta - tb
            })
          const dedup: typeof smEvents = []
          for (const e of smEvents) {
            const prev = dedup[dedup.length - 1]
            if (!prev || prev.code !== e.code) dedup.push(e)
          }
          events = dedup
          smOccurredAt = sm.updatedAt ?? sm.createdAt ?? null
        }
      }

      const latest = events[events.length - 1]
      // Priorytet: ostatnie zdarzenie z historii > top-level status SM > fulfillment.status mapowany > 'SENT'.
      // Dla manualnych waybilli SM nie istnieje, więc fulfillment (PICKED_UP/SENT/CANCELLED) jest jedynym źródłem prawdy o dostarczeniu.
      const statusCode = latest?.code ?? smStatus ?? fulfillmentDerivedCode ?? 'SENT'
      const statusLabel = latest?.label ?? labelFor(statusCode)
      const occurredAt = latest?.occurredAt ?? smOccurredAt ?? row.createdAt ?? null

      return {
        waybill,
        carrierId,
        carrierName: row.carrierName ?? null,
        statusCode,
        statusLabel,
        occurredAt,
        isSelected: false,
        events: events.length > 0 ? events : undefined,
      }
    }),
  )

  const mapped = enriched.filter((s): s is ShipmentSnapshotEntry => s !== null)
  if (mapped.length === 0) return { shipments: [], fulfillmentStatus }

  const sortedIdx = mapped
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const aDead = a.s.statusCode === 'CANCELLED' || a.s.statusCode === 'RETURNED' ? 1 : 0
      const bDead = b.s.statusCode === 'CANCELLED' || b.s.statusCode === 'RETURNED' ? 1 : 0
      if (aDead !== bDead) return aDead - bDead
      const ta = a.s.occurredAt ? Date.parse(a.s.occurredAt) : 0
      const tb = b.s.occurredAt ? Date.parse(b.s.occurredAt) : 0
      return tb - ta
    })
  mapped[sortedIdx[0].i].isSelected = true

  return { shipments: mapped, fulfillmentStatus }
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
    .select({
      id: orders.id,
      externalId: orders.externalId,
      source: orders.source,
      status: currentOrderStatusSql(orders.id),
      snapshot: orders.allegroShipmentsSnapshot,
      trackingNumber: orders.trackingNumber,
      allegroFulfillmentStatus: orders.allegroFulfillmentStatus,
    })
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

  const result = await fetchAllegroShipments(env, order.externalId)
  if (result === null) {
    return { refreshed: false, cached: false, snapshot: order.snapshot ?? null }
  }

  const { shipments: snapshot, fulfillmentStatus } = result
  const selected = snapshot.find((s) => s.isSelected) ?? snapshot[0] ?? null

  // Promote local order status. Sources of truth (in priority):
  //   1. Allegro fulfillment.status PICKED_UP → delivered
  //   2. Allegro fulfillment.status SENT → shipped
  //   3. Shipment row with waybill present → at least 'shipped'
  //      (sprzedawca często dodaje tracking lokalnie, ale w panelu Allegro
  //      nigdy nie klika "Wysłałem" → fulfillment.status laguje na PROCESSING.
  //      Sama obecność waybilla = paczka nadana.)
  let promotedStatus: 'shipped' | 'delivered' | null = null
  const now = new Date()
  const hasWaybill = snapshot.some((s) => s.waybill && s.statusCode !== 'CANCELLED')
  if (
    fulfillmentStatus === 'PICKED_UP' &&
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    order.status !== 'refunded' &&
    order.status !== 'return_in_transit' &&
    order.status !== 'return_received' &&
    order.status !== 'return_requested'
  ) {
    promotedStatus = 'delivered'
  } else if (
    (fulfillmentStatus === 'SENT' || hasWaybill) &&
    (order.status === 'paid' || order.status === 'processing')
  ) {
    promotedStatus = 'shipped'
  }

  // Carrier tracking event DELIVERED (real Allegro source) → promote even gdy fulfillment laguje.
  if (
    !promotedStatus &&
    snapshot.some((s) => s.statusCode === 'DELIVERED' || s.statusCode === 'PICKED_UP') &&
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    order.status !== 'refunded' &&
    order.status !== 'return_in_transit' &&
    order.status !== 'return_received' &&
    order.status !== 'return_requested'
  ) {
    promotedStatus = 'delivered'
  }

  const updateCols: Record<string, unknown> = {
    allegroShipmentsSnapshot: snapshot,
    updatedAt: now,
  }
  if (selected?.waybill && selected.waybill !== order.trackingNumber) {
    updateCols.trackingNumber = selected.waybill.slice(0, 100)
  }
  if (fulfillmentStatus && fulfillmentStatus !== order.allegroFulfillmentStatus) {
    updateCols.allegroFulfillmentStatus = fulfillmentStatus
  }
  if (promotedStatus === 'shipped') updateCols.shippedAt = now
  if (promotedStatus === 'delivered') updateCols.deliveredAt = now

  await db.update(orders).set(updateCols).where(eq(orders.id, orderId))

  if (promotedStatus) {
    // recordStatusChange (category 'status') appends to order_status_history.
    await recordStatusChange(db, {
      orderId,
      category: 'status',
      newValue: promotedStatus,
      source: 'allegro_sync',
      sourceRef: order.externalId,
      metadata: { fulfillmentStatus, via: 'shipments-refresh' },
    }).catch((err) => console.warn('[Shipments] order status promotion history failed', err))
  }

  if (selected?.statusCode && selected.statusCode !== 'UNKNOWN') {
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
