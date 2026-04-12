import type { OrderStatus, ShipmentDisplayStatus } from '../types/admin-api'

interface ShipmentStage {
  step: number
  label: string
  isIssue?: boolean
  isCancelled?: boolean
}

const DISPLAY_STATUS_MAP: Record<string, ShipmentStage> = {
  none: { step: 0, label: 'Brak przesyłki' },
  unknown: { step: 1, label: 'Status nieznany' },
  label_created: { step: 1, label: 'Etykieta utworzona' },
  in_transit: { step: 2, label: 'W drodze' },
  out_for_delivery: { step: 2, label: 'W doreczeniu' },
  delivered: { step: 3, label: 'Dostarczona' },
  issue: { step: 2, label: 'Problem z przesylka', isIssue: true },
}

const ALLEGRO_FULFILLMENT_MAP: Record<string, ShipmentStage> = {
  NEW: { step: 0, label: 'Przyjete w Allegro' },
  PROCESSING: { step: 1, label: 'W przygotowaniu' },
  READY_FOR_SHIPMENT: { step: 1, label: 'Gotowe do nadania' },
  SENT: { step: 2, label: 'Nadane' },
  PICKED_UP: { step: 3, label: 'Odebrane' },
  CANCELLED: { step: 0, label: 'Przesylka anulowana', isCancelled: true },
}

const ORDER_STATUS_MAP: Record<string, ShipmentStage> = {
  pending: { step: 0, label: 'Przyjete' },
  paid: { step: 0, label: 'Oplacone' },
  processing: { step: 1, label: 'W realizacji' },
  shipped: { step: 2, label: 'Wyslane' },
  delivered: { step: 3, label: 'Dostarczone' },
  completed: { step: 3, label: 'Dostarczone' },
  cancelled: { step: 0, label: 'Anulowane', isCancelled: true },
  refunded: { step: 0, label: 'Zwrocone', isCancelled: true },
}

function normalizeStatus(status: string | null | undefined): string | null {
  const value = status?.trim()
  if (!value) return null
  return value
}

function normalizeFulfillmentStatus(status: string | null | undefined): string | null {
  const value = normalizeStatus(status)
  if (!value) return null
  return value.toUpperCase()
}

export interface ResolveShipmentStatusInput {
  status: OrderStatus | string
  shipmentDisplayStatus?: ShipmentDisplayStatus | string | null
  allegroFulfillmentStatus?: string | null
}

export interface ResolvedShipmentStatus {
  step: number
  label: string
  detail: string | null
  isIssue: boolean
  isCancelled: boolean
}

export function resolveShipmentStatus({
  status,
  shipmentDisplayStatus,
  allegroFulfillmentStatus,
}: ResolveShipmentStatusInput): ResolvedShipmentStatus {
  const normalizedDisplayStatus = normalizeStatus(shipmentDisplayStatus)
  const normalizedFulfillmentStatus = normalizeFulfillmentStatus(allegroFulfillmentStatus)

  const byDisplay = normalizedDisplayStatus
    ? DISPLAY_STATUS_MAP[normalizedDisplayStatus]
    : undefined

  const byFulfillment = normalizedFulfillmentStatus
    ? ALLEGRO_FULFILLMENT_MAP[normalizedFulfillmentStatus]
    : undefined

  const byOrder = ORDER_STATUS_MAP[status] ?? { step: 0, label: 'Przyjete' }

  const base = byDisplay ?? byFulfillment ?? byOrder

  const detail = byDisplay
    ? (byFulfillment ? `Allegro: ${byFulfillment.label}` : null)
    : (normalizedFulfillmentStatus && !byFulfillment
      ? `Allegro: ${normalizedFulfillmentStatus}`
      : null)

  return {
    step: base.step,
    label: base.label,
    detail,
    isIssue: Boolean(base.isIssue),
    isCancelled: Boolean(base.isCancelled),
  }
}
