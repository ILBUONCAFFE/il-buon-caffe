import type { ShipmentState } from '@repo/types'

export type { ShipmentState }

export interface AllegroShipmentRecord {
  id: string
  waybillNumber?: string
  carrierId?: string
  status?: string              // raw Allegro carrier code
  trackingUrl?: string
  sentAt?: string
  deliveredAt?: string
}

export interface CadenceRule {
  intervalMs: number
  maxLifetimeMs: number | null   // null = no lifetime cap
  lifetimeExceededState: ShipmentState | 'delivered'
}

export interface PollResult {
  orderId: number
  previousState: ShipmentState | null
  newState: ShipmentState
  stateChanged: boolean
  snapshot: AllegroShipmentRecord[]
}

export interface PollFailure {
  orderId: number
  kind: 'http' | 'auth' | 'rate_limit' | 'parse' | 'unknown'
  retryAfterSec?: number
  message: string
}

export interface CycleSummary {
  processed: number
  updated: number
  stateChanges: number
  failures: number
  skippedReason?: 'not_due' | 'circuit_open' | 'rate_limited'
  nextDueAt: Date | null
}
