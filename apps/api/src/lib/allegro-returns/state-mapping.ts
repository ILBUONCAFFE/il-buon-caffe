/**
 * Allegro Returns — State Mapping
 *
 * Pure functions, no side effects, fully unit-testable.
 * Maps Allegro API lifecycle values to our internal DB enums.
 */

// ── Allegro return lifecycle states ───────────────────────────────────────

export type AllegroReturnStatus =
  | 'CREATED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FINISHED'
  | 'FINISHED_APT'
  | 'REJECTED'
  | 'COMMISSION_REFUND_CLAIMED'
  | 'COMMISSION_REFUNDED'
  | 'WAREHOUSE_DELIVERED'
  | 'WAREHOUSE_VERIFICATION'

export type InternalReturnStatus =
  | 'new'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'closed'

/**
 * Maps an Allegro customer-return status string to our `returnStatusEnum`.
 * Unknown values fall back to `'new'` (safe default).
 */
export function mapAllegroReturnStatusToInternal(
  allegroStatus: string,
): InternalReturnStatus {
  switch (allegroStatus as AllegroReturnStatus) {
    case 'CREATED':
      return 'new'
    case 'DISPATCHED':
    case 'IN_TRANSIT':
      return 'in_review'
    case 'DELIVERED':
    case 'WAREHOUSE_DELIVERED':
    case 'WAREHOUSE_VERIFICATION':
      return 'approved'
    case 'FINISHED':
    case 'FINISHED_APT':
    case 'COMMISSION_REFUND_CLAIMED':
    case 'COMMISSION_REFUNDED':
      return 'refunded'
    case 'REJECTED':
      return 'rejected'
    default:
      return 'new'
  }
}

// ── Allegro return reason types ───────────────────────────────────────────

export type AllegroReturnReason =
  | 'DEFECT'
  | 'MISTAKE'
  | 'NOT_AS_DESCRIBED'
  | 'INCOMPLETE'
  | 'WRONG_DESCRIPTION'
  | 'CHANGE_OF_MIND'
  | 'DAMAGED'

export type InternalReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'change_of_mind'
  | 'defect'
  | 'mistake'
  | 'other'

/**
 * Maps an Allegro reason type string to our `returnReasonEnum`.
 * Unknown values fall back to `'other'`.
 */
export function mapAllegroReasonToInternal(
  allegroReason: string,
): InternalReturnReason {
  switch (allegroReason as AllegroReturnReason) {
    case 'DEFECT':
      return 'defect'
    case 'MISTAKE':
      return 'mistake'
    case 'NOT_AS_DESCRIBED':
      return 'not_as_described'
    case 'INCOMPLETE':
      return 'wrong_item'
    case 'WRONG_DESCRIPTION':
      // Intentionally lossy — no exact enum match; 'not_as_described' is the closest semantic equivalent
      return 'not_as_described'
    case 'CHANGE_OF_MIND':
      return 'change_of_mind'
    case 'DAMAGED':
      return 'damaged'
    default:
      return 'other'
  }
}

// ── Internal return status → order status ─────────────────────────────────

export type ReturnDrivenOrderStatus =
  | 'return_requested'
  | 'return_in_transit'
  | 'return_received'
  | 'refunded'

/**
 * Maps our internal return status to an `orderStatusEnum` value for
 * `orderStatusHistory` entries.
 *
 * Returns `null` when no order-level status change should be recorded
 * (e.g. rejected / closed returns do not advance the order status).
 */
export function mapInternalStatusToOrderStatus(
  returnStatus: InternalReturnStatus,
): ReturnDrivenOrderStatus | null {
  switch (returnStatus) {
    case 'new':
      return 'return_requested'
    case 'in_review':
      return 'return_in_transit'
    case 'approved':
      return 'return_received'
    case 'refunded':
      return 'refunded'
    case 'rejected':
      return null
    case 'closed':
      return null
  }
}
