/**
 * Allegro Order Sync — Helper functions
 */

import { createDb } from '@repo/db/client'
import { allegroState } from '@repo/db/schema'
import { CURSOR_KV_KEY, CURSOR_DB_KEY, type AllegroAddress, type AllegroCheckoutForm } from './types'

// ── Cursor operations ─────────────────────────────────────────────────────

export async function readCursor(kv: KVNamespace): Promise<string | null> {
  return kv.get(CURSOR_KV_KEY)
}

export async function writeCursor(
  kv: KVNamespace,
  db: ReturnType<typeof createDb>,
  cursor: string,
): Promise<void> {
  await Promise.all([
    kv.put(CURSOR_KV_KEY, cursor),
    db.insert(allegroState)
      .values({ key: CURSOR_DB_KEY, value: cursor, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: allegroState.key,
        set:    { value: cursor, updatedAt: new Date() },
      }),
  ])
}

// ── Order number generation ───────────────────────────────────────────────

export function generateOrderNumber(checkoutFormId: string): string {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const short = checkoutFormId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `AL-${date}-${short}`
}

// ── Address building ──────────────────────────────────────────────────────

export function buildShippingAddress(addr: AllegroAddress | undefined) {
  if (!addr) return undefined
  return {
    name:       `${addr.firstName} ${addr.lastName}`.trim(),
    street:     addr.street,
    city:       addr.city,
    postalCode: addr.zipCode ?? addr.postCode ?? '',
    country:    addr.countryCode,
    phone:      addr.phoneNumber,
  }
}

// ── Allegro API calls ─────────────────────────────────────────────────────

export async function fetchCheckoutForm(
  apiBase: string,
  accessToken: string,
  checkoutFormId: string,
): Promise<AllegroCheckoutForm | null> {
  const resp = await fetch(`${apiBase}/order/checkout-forms/${checkoutFormId}`, {
    signal:  AbortSignal.timeout(10_000),
    headers: allegroHeaders(accessToken),
  })
  if (!resp.ok) {
    console.error(`[AllegroOrders] GET /checkout-forms/${checkoutFormId} → ${resp.status}`)
    return null
  }
  return resp.json() as Promise<AllegroCheckoutForm>
}

// ── Allegro-compatible headers ─────────────────────────────────────────────

const ALLEGRO_USER_AGENT = 'IlBuonCaffe/1.0 (+https://ilbuoncaffe.pl/api-info)'

export function allegroHeaders(accessToken: string, contentType = false) {
  const headers: Record<string, string> = {
    Authorization:  `Bearer ${accessToken}`,
    Accept:         'application/vnd.allegro.public.v1+json',
    'User-Agent':   ALLEGRO_USER_AGENT,
  }
  if (contentType) {
    headers['Content-Type'] = 'application/vnd.allegro.public.v1+json'
  }
  return headers
}

// ── Small delay helper (rate-limit friendly, like Electron app 100ms) ──────

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Retry with exponential backoff ─────────────────────────────────────────

/** Retry a DB operation up to `maxRetries` times with exponential backoff. */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = Math.min(500 * Math.pow(2, attempt - 1), 4000)
      console.warn(`[Retry] attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, err instanceof Error ? err.message : err)
      await sleep(delay)
    }
  }
  throw new Error('unreachable')
}

// ── Customer data builder ─────────────────────────────────────────────────

/**
 * Build customerData from an Allegro checkout form.
 * Includes invoice/billing fields when Allegro sends them.
 */
export function buildCustomerData(form: AllegroCheckoutForm): {
  email:           string
  name:            string
  phone?:          string
  shippingAddress: ReturnType<typeof buildShippingAddress> | undefined
  billingAddress?: {
    name:       string
    street:     string
    city:       string
    postalCode: string
    country:    string
  } | undefined
  companyName?:    string
  taxId?:          string
  allegroLogin:    string
} {
  const inv     = form.invoice
  const invAddr = inv?.address?.address

  const billingName = (() => {
    if (inv?.address?.company?.name) return inv.address.company.name
    const np = inv?.address?.naturalPerson
    if (np) {
      const n = `${np.firstName} ${np.lastName}`.trim()
      if (n) return n
    }
    if (form.buyer.firstName && form.buyer.lastName) {
      return `${form.buyer.firstName} ${form.buyer.lastName}`.trim()
    }
    return form.buyer.login
  })()

  const billingAddress = invAddr
    ? {
        name:       billingName,
        street:     invAddr.street      ?? '',
        city:       invAddr.city        ?? '',
        postalCode: invAddr.zipCode     ?? invAddr.postCode ?? '',
        country:    invAddr.countryCode ?? '',
      }
    : undefined

  return {
    email:           form.buyer.email,
    name:            `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
    phone:           form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
    shippingAddress: buildShippingAddress(form.delivery.address),
    billingAddress,
    companyName:     inv?.address?.company?.name,
    taxId:           inv?.address?.company?.taxId,
    allegroLogin:    form.buyer.login,
  }
}
