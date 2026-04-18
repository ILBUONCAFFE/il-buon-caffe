import { describe, it, expect } from 'vitest'
import {
  mapAllegroStatus,
  deriveWorstState,
  computeNextCheckAt,
  computeBackoffNextCheckAt,
  checkLifetimeExceeded,
  CADENCE,
} from '../state-machine'

describe('mapAllegroStatus', () => {
  it('maps DELIVERED → delivered', () => {
    expect(mapAllegroStatus('DELIVERED')).toBe('delivered')
  })
  it('is case-insensitive', () => {
    expect(mapAllegroStatus('delivered')).toBe('delivered')
    expect(mapAllegroStatus(' In_Transit ')).toBe('in_transit')
  })
  it('returns null for unknown', () => {
    expect(mapAllegroStatus('SOMETHING_WEIRD')).toBeNull()
  })
  it('returns null for empty/null', () => {
    expect(mapAllegroStatus(null)).toBeNull()
    expect(mapAllegroStatus('')).toBeNull()
  })
})

describe('deriveWorstState', () => {
  it('returns fallback on empty array', () => {
    expect(deriveWorstState([])).toBe('awaiting_handover')
    expect(deriveWorstState([], 'label_created')).toBe('label_created')
  })
  it('returns delivered when all parcels delivered', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'DELIVERED' },
    ])).toBe('delivered')
  })
  it('picks worst across parcels (one in_transit, one delivered)', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'IN_TRANSIT' },
    ])).toBe('in_transit')
  })
  it('exception beats everything', () => {
    expect(deriveWorstState([
      { id: 'a', status: 'DELIVERED' },
      { id: 'b', status: 'RETURNED' },
    ])).toBe('exception')
  })
  it('unknown parcel codes fall back to in_transit', () => {
    expect(deriveWorstState([{ id: 'a', status: 'WHATEVER' }])).toBe('in_transit')
  })
})

describe('computeNextCheckAt', () => {
  it('returns future date with correct interval for in_transit', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeNextCheckAt('in_transit', now)
    expect(next?.toISOString()).toBe('2026-04-18T16:00:00.000Z')
  })
  it('returns null for terminal states', () => {
    expect(computeNextCheckAt('delivered')).toBeNull()
    expect(computeNextCheckAt('stale')).toBeNull()
  })
})

describe('computeBackoffNextCheckAt', () => {
  it('first attempt = 10min (2^1 * 5min)', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeBackoffNextCheckAt(1, now)
    expect(next.getTime() - now.getTime()).toBe(10 * 60 * 1000)
  })
  it('caps at 4h after many attempts', () => {
    const now = new Date('2026-04-18T10:00:00Z')
    const next = computeBackoffNextCheckAt(20, now)
    expect(next.getTime() - now.getTime()).toBe(4 * 60 * 60 * 1000)
  })
})

describe('checkLifetimeExceeded', () => {
  it('returns null when still within window', () => {
    const changed = new Date('2026-04-18T10:00:00Z')
    const now    = new Date('2026-04-18T11:00:00Z')
    expect(checkLifetimeExceeded('awaiting_handover', changed, now)).toBeNull()
  })
  it('escalates awaiting_handover → exception after 24h', () => {
    const changed = new Date('2026-04-17T09:00:00Z')
    const now    = new Date('2026-04-18T10:00:00Z')
    expect(checkLifetimeExceeded('awaiting_handover', changed, now)).toBe('exception')
  })
  it('escalates in_transit → stale after 14d', () => {
    const changed = new Date('2026-04-01T10:00:00Z')
    const now    = new Date('2026-04-18T10:00:00Z')
    expect(checkLifetimeExceeded('in_transit', changed, now)).toBe('stale')
  })
})

describe('CADENCE completeness', () => {
  it('has a rule for every state', () => {
    const states = ['awaiting_handover','label_created','in_transit','out_for_delivery','delivered','exception','stale'] as const
    for (const s of states) expect(CADENCE[s]).toBeDefined()
  })
})
