/**
 * Allegro Shipments — on-demand fetch + 5min KV cache.
 *
 * Realne źródła statusu w Allegro REST API:
 *   1. GET /order/checkout-forms/{id}/shipments
 *      → lista paczek: { id, waybill, carrierId, carrierName }
 *   2. GET /shipment-management/shipments/{shipmentId}
 *      → status + statusHistory, ale tylko dla "Wysyłam z Allegro" (gdy mamy `id`)
 *
 * Dla ręcznych numerów listów (seller wkleja tracking) Allegro nie udostępnia
 * historii zdarzeń kurierskich publicznym API — pokazujemy "Nadana" + waybill.
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
  PICKED_UP: 'Odebrana przez kuriera',
  IN_TRANSIT: 'W drodze',
  ARRIVED_CARRIER_FACILITY: 'W sortowni',
  DEPARTED_CARRIER_FACILITY: 'Opuściła sortownię',
  OUT_FOR_DELIVERY: 'W doręczeniu',
  DELIVERED: 'Dostarczona',
  READY_FOR_PICKUP: 'Gotowa do odbioru',
  PICKUP_READY: 'Gotowa do odbioru',
  AVAILABLE_FOR_PICKUP: 'Czeka w punkcie',
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

  const enriched = await Promise.all(
    rows.map(async (row): Promise<ShipmentSnapshotEntry | null> => {
      const waybill = (row.waybill ?? row.trackingNumber ?? '').trim()
      if (!waybill) return null
      const carrierId = row.carrierId ?? 'UNKNOWN'

      // Wysyłam z Allegro: pobierz statusHistory.
      let events: Array<{ code: string; label: string | null; occurredAt: string | null }> = []
      let smStatus: string | null = null
      let smOccurredAt: string | null = null

      if (row.id) {
        const sm = await fetchSmShipment(token.apiBase, token.accessToken, row.id)
        if (sm) {
          smStatus = sm.status?.trim().toUpperCase() ?? null
          const rawHistory = sm.statusHistory ?? sm.history ?? []
          events = rawHistory
            .map(normalizeEvent)
            .filter((e): e is NonNullable<ReturnType<typeof normalizeEvent>> => e !== null)
            .sort((a, b) => {
              const ta = a.occurredAt ? Date.parse(a.occurredAt) : 0
              const tb = b.occurredAt ? Date.parse(b.occurredAt) : 0
              return ta - tb
            })
          // dedup consecutive
          const dedup: typeof events = []
          for (const e of events) {
            const prev = dedup[dedup.length - 1]
            if (!prev || prev.code !== e.code) dedup.push(e)
          }
          events = dedup
          smOccurredAt = sm.updatedAt ?? sm.createdAt ?? null
        }
      }

      const latest = events[events.length - 1]
      // Priorytet: ostatnie zdarzenie z historii > top-level status SM > 'SENT' (waybill istnieje w Allegro).
      const statusCode = latest?.code ?? smStatus ?? 'SENT'
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
  if (mapped.length === 0) return []

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
