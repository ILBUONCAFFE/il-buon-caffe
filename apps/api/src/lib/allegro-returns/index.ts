/**
 * Allegro Returns — Public API
 *
 * Re-exports everything from client.ts and state-mapping.ts.
 */

export {
  ALLEGRO_API_BASE,
  ALLEGRO_UPLOAD_BASE,
  AllegroReturnsRateLimitError,
  AllegroReturnsAuthError,
  AllegroReturnsApiError,
  listCustomerReturns,
  getCustomerReturn,
  acceptCustomerReturnRefund,
  rejectCustomerReturn,
  createPaymentRefund,
  getPaymentRefund,
  createCommissionRefundClaim,
  listCommissionRefundClaims,
  cancelCommissionRefundClaim,
  listIssues,
  getIssue,
  listIssueMessages,
  postIssueMessage,
  uploadIssueAttachment,
  createReturnLabel,
} from './client'

export type {
  AllegroCustomerReturn,
  AllegroCustomerReturnsResponse,
  AllegroPaymentRefund,
  AllegroRefundClaim,
  AllegroIssue,
  AllegroIssuesResponse,
  AllegroIssueMessage,
  AllegroCustomerReturnRefund,
} from './client'

export {
  mapAllegroReturnStatusToInternal,
  mapAllegroReasonToInternal,
  mapInternalStatusToOrderStatus,
} from './state-mapping'

export type {
  AllegroReturnStatus,
  AllegroReturnReason,
  InternalReturnStatus,
  InternalReturnReason,
  ReturnDrivenOrderStatus,
} from './state-mapping'
