import { describe, it, expect } from 'vitest'
import {
  mapAllegroReturnStatusToInternal,
  mapAllegroReasonToInternal,
  mapInternalStatusToOrderStatus,
} from '../state-mapping'

describe('mapAllegroReturnStatusToInternal', () => {
  const cases: [string, string][] = [
    ['CREATED', 'new'],
    ['REFUND_OFFERED', 'in_review'],
    ['REFUNDED', 'refunded'],
    ['REJECTED', 'rejected'],
    ['CANCELLED', 'closed'],
    ['UNKNOWN_VALUE', 'new'],
  ]
  it.each(cases)('%s → %s', (input, expected) => {
    expect(mapAllegroReturnStatusToInternal(input)).toBe(expected)
  })
})

describe('mapAllegroReasonToInternal', () => {
  const cases: [string, string][] = [
    ['DEFECT', 'defect'],
    ['MISTAKE', 'mistake'],
    ['NOT_AS_DESCRIBED', 'not_as_described'],
    ['INCOMPLETE', 'wrong_item'],
    ['WRONG_DESCRIPTION', 'not_as_described'],
    ['CHANGE_OF_MIND', 'change_of_mind'],
    ['DAMAGED', 'damaged'],
    ['RANDOM', 'other'],
  ]
  it.each(cases)('%s → %s', (input, expected) => {
    expect(mapAllegroReasonToInternal(input)).toBe(expected)
  })
})

describe('mapInternalStatusToOrderStatus', () => {
  const cases: [string, string | null][] = [
    ['new', 'return_requested'],
    ['in_review', 'return_in_transit'],
    ['approved', 'return_received'],
    ['refunded', 'refunded'],
    ['rejected', null],
    ['closed', null],
  ]
  it.each(cases)('%s → %s', (input, expected) => {
    expect(mapInternalStatusToOrderStatus(input as any)).toBe(expected)
  })
})
