/**
 * Allegro Returns API Client
 *
 * Thin HTTP wrappers over Allegro REST/BETA endpoints for:
 * - Customer returns (BETA)
 * - Payment refunds
 * - Commission refund claims
 * - Disputes / Post-Purchase-Issues (BETA)
 * - Return labels
 *
 * All endpoints use the beta Accept header:
 *   application/vnd.allegro.beta.v1+json
 *
 * Token resolution is NOT done here — callers pass `accessToken: string`
 * already resolved from KV via `resolveAccessToken`.
 *
 * The `db` param is typed as `any` to avoid cross-package import issues
 * in the Cloudflare Workers edge runtime. Callers pass a Drizzle client
 * created by `createDb()` from `@repo/db/client`.
 */

import { allegroSyncLog } from '@repo/db/schema'

// ── Base URLs ──────────────────────────────────────────────────────────────

export const ALLEGRO_API_BASE = {
  production: 'https://api.allegro.pl',
  sandbox: 'https://api.allegro.pl.allegrosandbox.pl',
} as const

export const ALLEGRO_UPLOAD_BASE = {
  production: 'https://upload.allegro.pl',
  sandbox: 'https://upload.allegro.pl.allegrosandbox.pl',
} as const

// ── Error types ────────────────────────────────────────────────────────────

export class AllegroReturnsRateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super('rate_limited')
  }
}

export class AllegroReturnsAuthError extends Error {}

export class AllegroReturnsApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`HTTP ${status}`)
  }
}

// ── Response types ─────────────────────────────────────────────────────────

export interface AllegroCustomerReturn {
  id: string
  referenceNumber?: string
  orderId: string
  createdAt: string
  status?: string
  items: Array<{
    reason?: { type: string; userComment?: string }
    quantity?: number
    offerId?: string
    offerTitle?: string
    price?: { amount: string; currency: string }
  }>
  buyer?: { login: string; email: string }
  refund?: {
    value?: { amount: string; currency: string }
    status?: string
    bankAccount?: Record<string, unknown>
  }
  parcels?: Array<{ transportingCarrierId?: string; trackingNumber?: string }>
  rejection?: { code?: string; reason?: string; createdAt?: string }
  isFulfillment?: boolean
}

export interface AllegroCustomerReturnsResponse {
  customerReturns: AllegroCustomerReturn[]
  count?: number
}

export interface AllegroPaymentRefund {
  id: string
  status: string
  totalValue?: { amount: string; currency: string }
  payment?: { id: string }
}

export interface AllegroRefundClaim {
  id: string
  orderId?: string
  status: string
  amount?: { amount: string; currency: string }
  createdAt?: string
}

export interface AllegroIssue {
  id: string
  status: string
  subject?: string
  checkoutForm?: { id: string }
  lastMessageAt?: string
}

export interface AllegroIssuesResponse {
  issues: AllegroIssue[]
}

export interface AllegroIssueMessage {
  id: string
  text?: string
  attachments?: Array<{ id: string; fileName?: string }>
  author?: { login?: string; role?: string }
  createdAt: string
}

export type AllegroCustomerReturnRefund = AllegroPaymentRefund

// ── Internal helpers ───────────────────────────────────────────────────────

const ALLEGRO_USER_AGENT = 'IlBuonCaffe/1.0 (+https://ilbuoncaffe.pl/api-info)'
const BETA_CONTENT_TYPE = 'application/vnd.allegro.beta.v1+json'

/** Returns beta-flavoured headers for Allegro Returns API calls. */
function allegroReturnHeaders(
  accessToken: string,
  withContentType = false,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: BETA_CONTENT_TYPE,
    'User-Agent': ALLEGRO_USER_AGENT,
  }
  if (withContentType) {
    headers['Content-Type'] = BETA_CONTENT_TYPE
  }
  return headers
}

/** Write a fire-and-forget log entry to allegro_sync_log. Never throws. */
function log(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  action: string,
  request: unknown,
  response: unknown,
  error?: unknown,
): void {
  db
    .insert(allegroSyncLog)
    .values({
      action,
      status: error ? 'error' : 'success',
      requestPayload: request as Record<string, unknown>,
      responsePayload: error ? null : (response as Record<string, unknown>),
      errorMessage: error instanceof Error ? error.message : error ? String(error) : null,
    })
    .catch(() => {
      // intentionally swallowed — logging must not block or throw
    })
}

/**
 * Execute a fetch call and handle common Allegro error codes:
 * - 401 → AllegroReturnsAuthError
 * - 429 → AllegroReturnsRateLimitError
 * - non-OK → AllegroReturnsApiError
 */
async function allegroFetch(url: string, init: RequestInit): Promise<unknown> {
  const resp = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  })

  if (resp.status === 401) {
    throw new AllegroReturnsAuthError('Allegro token unauthorised')
  }

  if (resp.status === 429) {
    const retryAfter = parseInt(resp.headers.get('Retry-After') ?? '60', 10)
    throw new AllegroReturnsRateLimitError(retryAfter)
  }

  if (resp.status === 204) {
    return null
  }

  const body = await resp.json().catch(() => null)

  if (!resp.ok) {
    throw new AllegroReturnsApiError(resp.status, body)
  }

  return body
}

// ── Customer returns (BETA) ────────────────────────────────────────────────

export async function listCustomerReturns(
  params: {
    orderId?: string
    status?: string
    createdAtGte?: string
    createdAtLte?: string
    limit?: number
    offset?: number
  },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroCustomerReturnsResponse> {
  const qs = new URLSearchParams()
  if (params.orderId) qs.set('order.id', params.orderId)
  if (params.status) qs.set('status', params.status)
  if (params.createdAtGte) qs.set('createdAt.gte', params.createdAtGte)
  if (params.createdAtLte) qs.set('createdAt.lte', params.createdAtLte)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))

  const url = `${apiBase}/order/customer-returns?${qs.toString()}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'customer_return_fetch', { params }, result)
    return result as AllegroCustomerReturnsResponse
  } catch (err) {
    log(db, 'customer_return_fetch', { params }, null, err)
    throw err
  }
}

export async function getCustomerReturn(
  id: string,
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroCustomerReturn> {
  const url = `${apiBase}/order/customer-returns/${id}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'customer_return_fetch', { id }, result)
    return result as AllegroCustomerReturn
  } catch (err) {
    log(db, 'customer_return_fetch', { id }, null, err)
    throw err
  }
}

export async function acceptCustomerReturnRefund(
  id: string,
  body: Record<string, unknown>,
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroCustomerReturnRefund> {
  const url = `${apiBase}/order/customer-returns/${id}/refund`
  let result: unknown
  try {
    result = await allegroFetch(url, {
      method: 'POST',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'customer_return_refund', { id, body }, result)
    return result as AllegroCustomerReturnRefund
  } catch (err) {
    log(db, 'customer_return_refund', { id, body }, null, err)
    throw err
  }
}

export async function rejectCustomerReturn(
  id: string,
  body: { rejection: { code: string; reason?: string } },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<void> {
  const url = `${apiBase}/order/customer-returns/${id}/rejection`
  try {
    await allegroFetch(url, {
      method: 'PUT',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'customer_return_reject', { id, body }, null) // 204 No Content — null response is correct
  } catch (err) {
    log(db, 'customer_return_reject', { id, body }, null, err)
    throw err
  }
}

// ── Payment refunds ────────────────────────────────────────────────────────

export async function createPaymentRefund(
  body: {
    payment: { id: string }
    order?: { id: string }
    commandId: string
    reason?: string
    lineItems?: Array<{
      id: string
      type: 'QUANTITY' | 'VALUE'
      quantity?: number
      value?: { amount: string; currency: string }
    }>
    delivery?: { value: { amount: string; currency: string } }
  },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroPaymentRefund> {
  const url = `${apiBase}/payments/refunds/commands/${body.commandId}`
  let result: unknown
  try {
    result = await allegroFetch(url, {
      method: 'PUT',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'payment_refund_create', { commandId: body.commandId }, result)
    return result as AllegroPaymentRefund
  } catch (err) {
    log(db, 'payment_refund_create', { commandId: body.commandId }, null, err)
    throw err
  }
}

export async function getPaymentRefund(
  id: string,
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroPaymentRefund> {
  const url = `${apiBase}/payments/refunds/commands/${id}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'payment_refund_fetch', { id }, result)
    return result as AllegroPaymentRefund
  } catch (err) {
    log(db, 'payment_refund_fetch', { id }, null, err)
    throw err
  }
}

// ── Commission refund claims ───────────────────────────────────────────────

export async function createCommissionRefundClaim(
  body: { orderId: string; reason?: string },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroRefundClaim> {
  const url = `${apiBase}/sale/commission-refund-claims`
  let result: unknown
  try {
    result = await allegroFetch(url, {
      method: 'POST',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'refund_claim_create', body, result)
    return result as AllegroRefundClaim
  } catch (err) {
    log(db, 'refund_claim_create', body, null, err)
    throw err
  }
}

export async function listCommissionRefundClaims(
  params: { status?: string; from?: string; limit?: number },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<{ refundClaims: AllegroRefundClaim[] }> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.from) qs.set('from', params.from)
  if (params.limit != null) qs.set('limit', String(params.limit))

  const url = `${apiBase}/sale/commission-refund-claims?${qs.toString()}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'refund_claim_fetch', { params }, result)
    return result as { refundClaims: AllegroRefundClaim[] }
  } catch (err) {
    log(db, 'refund_claim_fetch', { params }, null, err)
    throw err
  }
}

export async function cancelCommissionRefundClaim(
  claimId: string,
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<void> {
  const url = `${apiBase}/sale/commission-refund-claims/${claimId}`
  try {
    await allegroFetch(url, {
      method: 'DELETE',
      headers: allegroReturnHeaders(accessToken),
    })
    log(db, 'refund_claim_cancel', { claimId }, null) // 204 No Content — null response is correct
  } catch (err) {
    log(db, 'refund_claim_cancel', { claimId }, null, err)
    throw err
  }
}

// ── Disputes / Post-Purchase-Issues (BETA) ─────────────────────────────────

export async function listIssues(
  params: {
    status?: string
    checkoutFormId?: string
    limit?: number
    offset?: number
  },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroIssuesResponse> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.checkoutFormId) qs.set('checkoutForm.id', params.checkoutFormId)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))

  const url = `${apiBase}/sale/user-issues?${qs.toString()}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'issue_list', { params }, result)
    return result as AllegroIssuesResponse
  } catch (err) {
    log(db, 'issue_list', { params }, null, err)
    throw err
  }
}

export async function getIssue(
  id: string,
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroIssue> {
  const url = `${apiBase}/sale/user-issues/${id}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'issue_get', { id }, result)
    return result as AllegroIssue
  } catch (err) {
    log(db, 'issue_get', { id }, null, err)
    throw err
  }
}

export async function listIssueMessages(
  id: string,
  params: { limit?: number },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<{ messages: AllegroIssueMessage[] }> {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))

  const url = `${apiBase}/sale/user-issues/${id}/messages?${qs.toString()}`
  let result: unknown
  try {
    result = await allegroFetch(url, { headers: allegroReturnHeaders(accessToken) })
    log(db, 'issue_messages_fetch', { id, params }, result)
    return result as { messages: AllegroIssueMessage[] }
  } catch (err) {
    log(db, 'issue_messages_fetch', { id, params }, null, err)
    throw err
  }
}

export async function postIssueMessage(
  id: string,
  body: { text?: string; attachmentIds?: string[] },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AllegroIssueMessage> {
  const url = `${apiBase}/sale/user-issues/${id}/messages`
  let result: unknown
  try {
    result = await allegroFetch(url, {
      method: 'POST',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'issue_message_post', { id, body }, result)
    return result as AllegroIssueMessage
  } catch (err) {
    log(db, 'issue_message_post', { id, body }, null, err)
    throw err
  }
}

export async function uploadIssueAttachment(
  file: Uint8Array,
  mimeType: string,
  uploadBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<{ id: string }> {
  const url = `${uploadBase}/sale/user-issues/attachments`
  let result: unknown
  try {
    const headers = {
      ...allegroReturnHeaders(accessToken),
      'Content-Type': mimeType, // Override beta content-type with binary MIME for upload
    }
    result = await allegroFetch(url, {
      method: 'POST',
      headers,
      body: file,
    })
    log(db, 'issue_attachment_upload', { mimeType, bytes: file.byteLength }, result)
    return result as { id: string }
  } catch (err) {
    log(db, 'issue_attachment_upload', { mimeType, bytes: file.byteLength }, null, err)
    throw err
  }
}

// ── Return labels (Allegro Delivery only) ─────────────────────────────────

export async function createReturnLabel(
  body: { shipmentId: string },
  apiBase: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<{ label: string }> {
  const url = `${apiBase}/order/return-labels`
  let result: unknown
  try {
    result = await allegroFetch(url, {
      method: 'POST',
      headers: allegroReturnHeaders(accessToken, true),
      body: JSON.stringify(body),
    })
    log(db, 'return_label_create', body, result)
    return result as { label: string }
  } catch (err) {
    log(db, 'return_label_create', body, null, err)
    throw err
  }
}
