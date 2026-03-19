/**
 * Allegro Order Sync — Faza 2
 * Polls GET /order/events (ALL types) and handles each per docs/ALLEGRO_API_STRATEGY.md Dodatek C.
 *
 * Event routing (Dodatek C):
 *  BOUGHT              → create order (status: pending)           — waiting for payment
 *  FILLED_IN           → update delivery address                  — buyer filled address
 *  READY_FOR_PROCESSING→ mark paid + deduct stock                 — ★ main import
 *  BUYER_CANCELLED     → cancel order + restore stock if was paid
 *  AUTO_CANCELLED      → cancel order + restore stock if was paid
 *
 * Cursor strategy: KV primary, DB backup. Conditional writes only (§Dodatek D).
 */

import { createDb, createDbWsPool, setHttpMode } from '@repo/db/client'
import {
  orders,
  orderItems,
  products,
  allegroSyncLog,
  allegroState,
  allegroCredentials,
  stockChanges,
} from '@repo/db/schema'
import { eq, and, or, sql, desc } from 'drizzle-orm'
import { getAllegroApiBase, KV_KEYS, refreshAllegroToken, AllegroInvalidGrantError, type AllegroEnvironment } from './allegro'
import { decryptText } from './crypto'
import type { Env } from '../index'

// ── KV & DB cursor keys ───────────────────────────────────────────────────

const CURSOR_KV_KEY = 'allegro:cursor:orders'
const CURSOR_DB_KEY = 'order_events_cursor'

// ── Allegro API event types we handle ────────────────────────────────────

const HANDLED_EVENT_TYPES = new Set([
  'BOUGHT',
  'FILLED_IN',
  'READY_FOR_PROCESSING',
  'BUYER_CANCELLED',
  'AUTO_CANCELLED',
])

// ── Allegro API response types ────────────────────────────────────────────

interface AllegroOrderEvent {
  id: string
  occurredAt: string
  type: string
  order: {
    checkoutForm: { id: string }
  }
}

interface AllegroAddress {
  firstName:    string
  lastName:     string
  phoneNumber?: string
  street:       string
  city:         string
  zipCode?:     string
  postCode?:    string   // sandbox returns postCode, prod returns zipCode
  countryCode:  string
}

interface AllegroCheckoutForm {
  id:     string
  status: string
  buyer: {
    id:            string
    email:         string
    login:         string
    firstName?:    string
    lastName?:     string
    phoneNumber?:  string
    address?:      AllegroAddress
  }
  payment: {
    id?:         string
    type:        string
    provider?:   string
    finishedAt?: string
    paidAmount?: { amount: string; currency: string }
  }
  delivery: {
    method?:  { id: string; name: string }
    address?: AllegroAddress
    cost?:    { amount: string; currency: string }
  }
  lineItems: Array<{
    id:       string
    quantity: number
    boughtAt?: string
    price:    { amount: string; currency: string }
    offer:    { id: string; name: string }
  }>
  summary: {
    totalToPay: { amount: string; currency: string }
  }
  messageToSeller?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function readCursor(kv: KVNamespace): Promise<string | null> {
  return kv.get(CURSOR_KV_KEY)
}

async function writeCursor(
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

function generateOrderNumber(checkoutFormId: string): string {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const short = checkoutFormId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `AL-${date}-${short}`
}

function buildShippingAddress(addr: AllegroAddress | undefined) {
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

async function fetchCheckoutForm(
  apiBase: string,
  accessToken: string,
  checkoutFormId: string,
): Promise<AllegroCheckoutForm | null> {
  const resp = await fetch(`${apiBase}/order/checkout-forms/${checkoutFormId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept:        'application/vnd.allegro.public.v1+json',
    },
  })
  if (!resp.ok) {
    console.error(`[AllegroOrders] GET /checkout-forms/${checkoutFormId} → ${resp.status}`)
    return null
  }
  return resp.json() as Promise<AllegroCheckoutForm>
}

// ── Event handlers ────────────────────────────────────────────────────────

/**
 * BOUGHT — Buyer placed order (payment may still be pending).
 * Action: Create order with status `pending`. No stock deduction yet.
 */
async function handleBought(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
  // Idempotency — skip if already exists
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.externalId, form.id))
    .limit(1)
  if (existing) return

  const totalAmount    = form.summary.totalToPay.amount
  const currency       = form.summary.totalToPay.currency
  const shippingAmount = form.delivery.cost?.amount ?? '0'
  const subtotal       = (parseFloat(totalAmount) - parseFloat(shippingAmount)).toFixed(2)

  const customerData = {
    email:        form.buyer.email,
    name:         `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
    phone:        form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
    shippingAddress: buildShippingAddress(form.delivery.address),
    allegroLogin: form.buyer.login,
  }

  const internalNotes = JSON.stringify({
    allegroCheckoutFormId: form.id,
    allegroDelivery:       form.delivery.method?.name,
  })

  const inserted = await db.insert(orders).values({
    orderNumber:    generateOrderNumber(form.id),
    source:         'allegro',
    status:         'pending',
    externalId:     form.id,
    idempotencyKey: `allegro-${form.id}`,
    customerData,
    subtotal,
    shippingCost:   shippingAmount,
    total:          totalAmount,
    currency,
    totalPln:       currency === 'PLN' ? totalAmount : null,
    paymentMethod:  form.payment.type ?? 'allegro',
    shippingMethod: form.delivery.method?.name ?? null,
    notes:          form.messageToSeller ?? null,
    internalNotes,
  }).onConflictDoNothing().returning({ id: orders.id })

  if (inserted.length === 0) return // already exists (race condition)

  const newOrder = inserted[0]

  // Save all line items immediately — use real SKU if mapped, else Allegro offer ID
  for (const item of form.lineItems) {
    const [product] = await db
      .select({ sku: products.sku, name: products.name })
      .from(products)
      .where(eq(products.allegroOfferId, item.offer.id))
      .limit(1)

    await db.insert(orderItems).values({
      orderId:     newOrder.id,
      productSku:  product?.sku ?? item.offer.id,
      productName: product?.name ?? item.offer.name,
      quantity:    item.quantity,
      unitPrice:   item.price.amount,
      totalPrice:  (parseFloat(item.price.amount) * item.quantity).toFixed(2),
    })
  }

  console.log(`[AllegroOrders] BOUGHT → pending (allegro id: ${form.id})`)
}

/**
 * FILLED_IN — Buyer filled in missing delivery data.
 * Action: Update customerData (address may now be complete).
 */
async function handleFilledIn(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.externalId, form.id))
    .limit(1)

  if (!existing) {
    // Edge case: missed BOUGHT event — treat like BOUGHT
    await handleBought(db, form)
    return
  }

  const customerData = {
    email:           form.buyer.email,
    name:            `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
    phone:           form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
    shippingAddress: buildShippingAddress(form.delivery.address),
    allegroLogin:    form.buyer.login,
  }

  await db
    .update(orders)
    .set({ customerData, updatedAt: new Date() })
    .where(eq(orders.externalId, form.id))

  console.log(`[AllegroOrders] FILLED_IN → address updated (allegro id: ${form.id})`)
}

/**
 * READY_FOR_PROCESSING — Payment confirmed, order ready to fulfil.
 * Action: Create order if missing, set status=paid, deduct stock.
 * Note: neon-http driver does NOT support db.transaction() — we use
 * sequential idempotent operations instead.
 */
async function handleReadyForProcessing(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
): Promise<void> {
  const [existing] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.externalId, form.id))
    .limit(1)

  // Better payment date inference (like Electron app — multiple API versions)
  const paidAt = form.payment.finishedAt
    ? new Date(form.payment.finishedAt)
    : new Date()

  let orderId: number

  if (!existing) {
    // Missed BOUGHT/FILLED_IN — create directly as paid
    const totalAmount    = form.summary.totalToPay.amount
    const currency       = form.summary.totalToPay.currency
    const shippingAmount = form.delivery.cost?.amount ?? '0'
    const subtotal       = (parseFloat(totalAmount) - parseFloat(shippingAmount)).toFixed(2)

    const customerData = {
      email:           form.buyer.email,
      name:            `${form.buyer.firstName ?? ''} ${form.buyer.lastName ?? ''}`.trim() || form.buyer.login,
      phone:           form.buyer.phoneNumber ?? form.buyer.address?.phoneNumber,
      shippingAddress: buildShippingAddress(form.delivery.address),
      allegroLogin:    form.buyer.login,
    }

    const internalNotes = JSON.stringify({
      allegroCheckoutFormId: form.id,
      allegroDelivery:       form.delivery.method?.name,
    })

    // Use onConflictDoNothing to handle race conditions (e.g. BOUGHT created order
    // moments before this READY_FOR_PROCESSING in the same cron run)
    const inserted = await db.insert(orders).values({
      orderNumber:    generateOrderNumber(form.id),
      source:         'allegro',
      status:         'paid',
      externalId:     form.id,
      idempotencyKey: `allegro-${form.id}`,
      customerData,
      subtotal,
      shippingCost:   shippingAmount,
      total:          totalAmount,
      currency,
      totalPln:       currency === 'PLN' ? totalAmount : null,
      paymentMethod:  form.payment.type ?? 'allegro',
      shippingMethod: form.delivery.method?.name ?? null,
      paidAt,
      notes:          form.messageToSeller ?? null,
      internalNotes,
    }).onConflictDoNothing().returning({ id: orders.id })

    if (inserted.length > 0) {
      orderId = inserted[0].id
    } else {
      // Conflict — order was created by a concurrent event, re-fetch it
      const [reFetched] = await db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.externalId, form.id))
        .limit(1)
      if (!reFetched) return // should not happen
      if (reFetched.status !== 'pending') {
        console.log(`[AllegroOrders] READY_FOR_PROCESSING conflict resolved (status: ${reFetched.status}, allegro id: ${form.id})`)
        return
      }
      await db
        .update(orders)
        .set({ status: 'paid', paidAt, updatedAt: new Date() })
        .where(eq(orders.externalId, form.id))
      orderId = reFetched.id
    }
  } else if (existing.status !== 'pending') {
    // Already processed (paid/processing/shipped) — skip stock deduction
    console.log(`[AllegroOrders] READY_FOR_PROCESSING już przetworzone (status: ${existing.status}, allegro id: ${form.id})`)
    return
  } else {
    // Exists as pending → mark paid
    await db
      .update(orders)
      .set({ status: 'paid', paidAt, updatedAt: new Date() })
      .where(eq(orders.externalId, form.id))
    orderId = existing.id
  }

  // Deduct stock + insert order_items for mapped products
  for (const item of form.lineItems) {
    const [product] = await db
      .select({ sku: products.sku, name: products.name, stock: products.stock, reserved: products.reserved })
      .from(products)
      .where(eq(products.allegroOfferId, item.offer.id))
      .limit(1)

    // Avoid duplicate order_items if this is a re-run (e.g. BOUGHT already saved them)
    // Match per-lineItem: look for item with this offer ID or mapped product SKU
    const skuMatch = product
      ? or(eq(orderItems.productSku, item.offer.id), eq(orderItems.productSku, product.sku))
      : eq(orderItems.productSku, item.offer.id)

    const [existingItem] = await db
      .select({ id: orderItems.id, productSku: orderItems.productSku })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), skuMatch))
      .limit(1)

    if (!existingItem) {
      // Items not yet saved (order skipped BOUGHT event) — insert now
      await db.insert(orderItems).values({
        orderId,
        productSku:  product?.sku ?? item.offer.id,
        productName: product?.name ?? item.offer.name,
        quantity:    item.quantity,
        unitPrice:   item.price.amount,
        totalPrice:  (parseFloat(item.price.amount) * item.quantity).toFixed(2),
      })
    } else if (product && existingItem.productSku !== product.sku) {
      // Upgrade placeholder (offer ID) to real product SKU now that we know it
      await db
        .update(orderItems)
        .set({ productSku: product.sku, productName: product.name })
        .where(eq(orderItems.id, existingItem.id))
    }

    if (!product) {
      console.warn(`[AllegroOrders] Brak mappingu dla offerId=${item.offer.id} (${item.offer.name}) — zapisano offer ID`)
      continue
    }

    // Deduct stock only for mapped products
    const newStock    = Math.max(0, product.stock    - item.quantity)
    const newReserved = Math.max(0, product.reserved - item.quantity)

    await db
      .update(products)
      .set({ stock: newStock, reserved: newReserved, updatedAt: new Date() })
      .where(eq(products.sku, product.sku))

    await db.insert(stockChanges).values({
      productSku:    product.sku,
      previousStock: product.stock,
      newStock,
      change:        -item.quantity,
      reason:        'order',
      orderId,
    })
  }

  await db.insert(allegroSyncLog).values({
    action:  'order_sync',
    status:  'success',
    offerId: form.id,
    responsePayload: { orderId, orderNumber: `AL-...` },
  })

  console.log(`[AllegroOrders] READY_FOR_PROCESSING → paid (allegro id: ${form.id})`)
}

/**
 * BUYER_CANCELLED / AUTO_CANCELLED — Order was cancelled.
 * Action: Set status=cancelled. If order was already paid, restore stock.
 */
async function handleCancelled(
  db: ReturnType<typeof createDb>,
  form: AllegroCheckoutForm,
  eventType: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.externalId, form.id))
    .limit(1)

  if (!existing) {
    // Never imported (e.g. cancelled before BOUGHT was processed) — nothing to do
    return
  }

  if (existing.status === 'cancelled') return  // already cancelled

  // Mark cancelled
  await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(orders.externalId, form.id))

  // Restore stock only if order was paid (stock was previously deducted)
  if (existing.status === 'paid' || existing.status === 'processing' || existing.status === 'shipped') {
    const items = await db
      .select({
        productSku: orderItems.productSku,
        quantity:   orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, existing.id))

    for (const item of items) {
      const [product] = await db
        .select({ sku: products.sku, stock: products.stock })
        .from(products)
        .where(eq(products.sku, item.productSku))
        .limit(1)

      if (!product) continue

      const newStock = product.stock + item.quantity

      await db
        .update(products)
        .set({ stock: newStock, updatedAt: new Date() })
        .where(eq(products.sku, product.sku))

      await db.insert(stockChanges).values({
        productSku:    product.sku,
        previousStock: product.stock,
        newStock,
        change:        item.quantity,
        reason:        'order',
        orderId:       existing.id,
        notes:         `Zwrot stocku: ${eventType}`,
      })
    }
  }

  await db.insert(allegroSyncLog).values({
    action:  'order_sync',
    status:  'success',
    offerId: form.id,
    responsePayload: { event: eventType, orderId: existing.id },
  })

  console.log(`[AllegroOrders] ${eventType} → cancelled (allegro id: ${form.id})`)
}

// ── Allegro-compatible headers ─────────────────────────────────────────────

function allegroHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept:        'application/vnd.allegro.public.v1+json',
  }
}

// ── Small delay helper (rate-limit friendly, like Electron app 100ms) ──────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Retry a DB operation up to `maxRetries` times with exponential backoff. */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const delay = 500 * Math.pow(2, attempt - 1)
      console.warn(`[Retry] attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, err instanceof Error ? err.message : err)
      await sleep(delay)
    }
  }
  throw new Error('unreachable')
}

// ── Process a single event ────────────────────────────────────────────────

async function processEvent(
  db: ReturnType<typeof createDb>,
  apiBase: string,
  accessToken: string,
  event: AllegroOrderEvent,
): Promise<boolean> {
  const checkoutFormId = event.order.checkoutForm.id

  const form = await fetchCheckoutForm(apiBase, accessToken, checkoutFormId)
  if (!form) {
    await db.insert(allegroSyncLog).values({
      offerId:      checkoutFormId,
      action:       'order_sync',
      status:       'error',
      errorMessage: `GET /checkout-forms HTTP error`,
      errorCode:    event.type,
    }).catch(() => {})
    return true // advance cursor — unfetchable event should not block progress
  }

  switch (event.type) {
    case 'BOUGHT':
      await handleBought(db, form)
      break
    case 'FILLED_IN':
      await handleFilledIn(db, form)
      break
    case 'READY_FOR_PROCESSING':
      await handleReadyForProcessing(db, form)
      break
    case 'BUYER_CANCELLED':
    case 'AUTO_CANCELLED':
      await handleCancelled(db, form, event.type)
      break
  }

  return true
}

// ── Backfill: one-time import until last saved order ─────────────────────

export interface BackfillResult {
  imported: number
  skipped: number
  errors: number
  stoppedReason: 'caught_up' | 'end_of_data' | 'auth_error' | 'api_error'
}

/**
 * One-time backfill: fetch Allegro checkout-forms (newest first) and import
 * orders that are missing in the local DB. Stops when an entire batch is
 * already present ("do ostatniego zapisanego") or after MAX_PAGES batches.
 *
 * After the backfill, sets the event-stream cursor to the latest Allegro
 * event so the regular cron sync continues from now onwards.
 */
export async function backfillAllegroOrders(env: Env): Promise<BackfillResult> {
  const kv = env.ALLEGRO_KV
  if (!kv) throw new Error('ALLEGRO_KV not configured')

  // Use WebSocket Pool driver — neon HTTP driver hits CF Workers subrequest limit
  // (50 free / 1000 paid) after a few orders. A single WebSocket connection is unlimited.
  const { db, end } = createDbWsPool(env.DATABASE_URL)

  try {
    return await _backfillInner(env, kv, db)
  } finally {
    await end()
  }
}

async function _backfillInner(
  env: Env,
  kv: KVNamespace,
  db: ReturnType<typeof createDb>,
): Promise<BackfillResult> {
  // ── Resolve access token (same logic as syncAllegroOrders) ────────────
  let accessToken = await kv.get(KV_KEYS.ACCESS_TOKEN)

  if (!accessToken) {
    let credRows: (typeof allegroCredentials.$inferSelect)[] = []
    try {
      credRows = await db
        .select()
        .from(allegroCredentials)
        .where(eq(allegroCredentials.isActive, true))
        .orderBy(desc(allegroCredentials.updatedAt))
        .limit(1)
    } catch { /* DB unavailable */ }
    const cred = credRows[0]
    if (!cred) throw new Error('Brak połączenia z Allegro (brak credentials)')

    const encKey = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
    const allegroEnvCred = cred.environment as AllegroEnvironment

    if (cred.expiresAt <= new Date()) {
      const rawRefresh = encKey ? await decryptText(cred.refreshToken, encKey) : cred.refreshToken
      const tokens = await refreshAllegroToken({
        refreshToken: rawRefresh,
        clientId:     env.ALLEGRO_CLIENT_ID,
        clientSecret: env.ALLEGRO_CLIENT_SECRET,
        environment:  allegroEnvCred,
      })
      accessToken = tokens.access_token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
      const ttl = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60)
      await kv.put(KV_KEYS.ACCESS_TOKEN, accessToken, { expirationTtl: ttl }).catch(() => {})
    } else {
      accessToken = encKey ? await decryptText(cred.accessToken, encKey) : cred.accessToken
      const ttl = Math.max(Math.floor((cred.expiresAt.getTime() - Date.now()) / 1000), 60)
      await kv.put(KV_KEYS.ACCESS_TOKEN, accessToken, { expirationTtl: ttl }).catch(() => {})
    }
  }

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase    = getAllegroApiBase(allegroEnv)

  // ── Fetch checkout-forms (newest first) in batches ────────────────────
  const BATCH_SIZE = 100
  const MAX_PAGES  = 50   // safety: max 5 000 orders
  let offset       = 0
  let imported      = 0
  let skipped       = 0
  let errors        = 0
  let stoppedReason: BackfillResult['stoppedReason'] = 'end_of_data'

  console.log(`[Backfill] Start — pobieranie zamówień z Allegro (newest first)`)

  for (let page = 0; page < MAX_PAGES; page++) {
    const resp = await fetch(
      `${apiBase}/order/checkout-forms?limit=${BATCH_SIZE}&offset=${offset}&sort=-lineItems.boughtAt`,
      { headers: allegroHeaders(accessToken) },
    )

    if (resp.status === 401) {
      console.warn('[Backfill] Token wygasł (401)')
      stoppedReason = 'auth_error'
      break
    }
    if (!resp.ok) {
      console.error(`[Backfill] GET /checkout-forms → ${resp.status}`)
      stoppedReason = 'api_error'
      break
    }

    const data = await resp.json() as { checkoutForms: AllegroCheckoutForm[] }
    const forms = data.checkoutForms ?? []
    if (forms.length === 0) break

    let batchSkipped = 0

    for (const form of forms) {
      // Check if order already exists in DB (with retry for transient neon HTTP failures)
      let existing: { id: number } | undefined
      try {
        const rows = await withRetry(() =>
          db.select({ id: orders.id })
            .from(orders)
            .where(eq(orders.externalId, form.id))
            .limit(1)
        )
        existing = rows[0]
      } catch (err) {
        errors++
        console.error(`[Backfill] Existence check failed for ${form.id}:`, err instanceof Error ? err.message : err)
        await sleep(1000)
        continue
      }

      if (existing) {
        batchSkipped++
        skipped++
        continue
      }

      // Import missing order
      try {
        await withRetry(async () => {
          const isPaid = form.payment?.finishedAt
            || form.payment?.paidAmount
            || form.status === 'READY_FOR_PROCESSING'
          const isCancelled = form.status === 'CANCELLED'

          if (isCancelled) {
            await handleCancelled(db, form, 'AUTO_CANCELLED')
          } else if (isPaid) {
            await handleReadyForProcessing(db, form)
          } else {
            await handleBought(db, form)
            if (form.delivery?.address) {
              await handleFilledIn(db, form)
            }
          }
        })
        imported++
      } catch (err) {
        errors++
        console.error(`[Backfill] Błąd importu ${form.id}:`, err instanceof Error ? err.message : err)
      }

      // Throttle to avoid overwhelming Neon HTTP API
      await sleep(150)
    }

    console.log(`[Backfill] Strona ${page + 1}: ${forms.length} form(s), imported=${imported}, skipped(existing)=${batchSkipped}`)

    // Stop if the entire batch already existed — we've caught up
    if (batchSkipped === forms.length) {
      stoppedReason = 'caught_up'
      console.log(`[Backfill] Cały batch już istnieje w DB — zatrzymuję (do ostatniego zapisanego)`)
      break
    }

    if (forms.length < BATCH_SIZE) break // last page

    offset += BATCH_SIZE
    await sleep(200)
  }

  // ── Set event-stream cursor to latest so cron sync continues from now ──
  try {
    const resp = await fetch(`${apiBase}/order/event-stats`, {
      headers: allegroHeaders(accessToken),
    })
    if (resp.ok) {
      const data = await resp.json() as { latestEvent?: { id: string } }
      if (data.latestEvent?.id) {
        await writeCursor(kv, db, data.latestEvent.id)
        console.log(`[Backfill] Cursor ustawiony na najnowszy event ${data.latestEvent.id}`)
      }
    }
  } catch { /* non-critical */ }

  console.log(`[Backfill] Zakończono — imported: ${imported}, skipped: ${skipped}, errors: ${errors}, reason: ${stoppedReason}`)
  return { imported, skipped, errors, stoppedReason }
}

// ── Core sync function ────────────────────────────────────────────────────

export async function syncAllegroOrders(env: Env): Promise<void> {
  const kv = env.ALLEGRO_KV
  if (!kv) {
    console.log('[AllegroOrders] Brak ALLEGRO_KV — pomijam')
    return
  }

  // ── Resolve access token: KV first, then DB fallback ─────────────────
  // For token resolution we may need a quick DB read — use HTTP driver (1 subrequest)
  let accessToken = await kv.get(KV_KEYS.ACCESS_TOKEN)

  if (!accessToken) {
    // KV TTL may have expired — restore from DB (single HTTP query, saves WS pool overhead)
    setHttpMode(true, env.DATABASE_URL)
    const httpDb = createDb(env.DATABASE_URL)
    let credRows: (typeof allegroCredentials.$inferSelect)[] = []
    try {
      credRows = await httpDb
        .select()
        .from(allegroCredentials)
        .where(eq(allegroCredentials.isActive, true))
        .orderBy(desc(allegroCredentials.updatedAt))
        .limit(1)
    } catch { /* DB unavailable */ }
    const cred = credRows[0]

    if (!cred) {
      console.warn('[AllegroOrders] Brak połączenia z Allegro (brak credentials w DB) — pomijam sync')
      return
    }

    const encKey     = env.ALLEGRO_TOKEN_ENCRYPTION_KEY
    const allegroEnvFromCred = cred.environment as AllegroEnvironment

    if (cred.expiresAt <= new Date()) {
      // Token expired — try refresh
      try {
        const rawRefresh = encKey ? await decryptText(cred.refreshToken, encKey) : cred.refreshToken
        const tokens = await refreshAllegroToken({
          refreshToken: rawRefresh,
          clientId:     env.ALLEGRO_CLIENT_ID,
          clientSecret: env.ALLEGRO_CLIENT_SECRET,
          environment:  allegroEnvFromCred,
        })
        accessToken = tokens.access_token
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
        const ttl = Math.max(Math.floor((expiresAt.getTime() - Date.now()) / 1000), 60)
        await kv.put(KV_KEYS.ACCESS_TOKEN, accessToken, { expirationTtl: ttl }).catch(() => {})
        console.log('[AllegroOrders] Token wygasł — odświeżono i zapisano do KV')
      } catch (err) {
        if (err instanceof AllegroInvalidGrantError) {
          console.warn('[AllegroOrders] Refresh token unieważniony — pomijam sync (wymagane ponowne połączenie)')
        } else {
          console.error('[AllegroOrders] Błąd odświeżania wygasłego tokenu:', err instanceof Error ? err.message : err)
        }
        return
      }
    } else {
      // Token still valid in DB — restore to KV
      accessToken = encKey ? await decryptText(cred.accessToken, encKey) : cred.accessToken
      const ttl = Math.max(Math.floor((cred.expiresAt.getTime() - Date.now()) / 1000), 60)
      await kv.put(KV_KEYS.ACCESS_TOKEN, accessToken, { expirationTtl: ttl }).catch(() => {})
      console.log('[AllegroOrders] Token przywrócony z DB do KV')
    }
  }

  const allegroEnv = (env.ALLEGRO_ENVIRONMENT ?? 'sandbox') as AllegroEnvironment
  const apiBase    = getAllegroApiBase(allegroEnv)
  const cursor     = await readCursor(kv)

  // ── If no cursor: skip full sync, start from current latest event ──
  if (!cursor) {
    try {
      const resp = await fetch(`${apiBase}/order/event-stats`, {
        headers: allegroHeaders(accessToken),
      })
      if (resp.ok) {
        const data = await resp.json() as { latestEvent?: { id: string } }
        const latestId = data.latestEvent?.id
        if (latestId) {
          // Write cursor to KV only — skip DB write for initial cursor (saves CU)
          await kv.put(CURSOR_KV_KEY, latestId)
          console.log(`[AllegroOrders] Brak kursora — ustawiono na najnowszy event ${latestId}, sync od teraz`)
        }
      }
    } catch { /* non-critical */ }
    return
  }

  // ── Fetch first event page BEFORE opening DB connection ──────────────
  // This avoids waking up Neon on idle runs (0 events = no DB needed).
  // Subrequest budget: CF Workers limit 1000. Each fetch() counts.
  // WebSocket DB queries do NOT count (single connection).
  // Budget: ~10 for setup → ~990 for checkout-form fetches. Cap at 200 for safety.
  const MAX_CHECKOUT_FETCHES = 200
  const PAGE_SIZE = 1000
  const MAX_PAGES = 5

  let nextFrom: string | null = cursor
  let totalProcessed = 0
  let fetchesDone = 0
  let pagesProcessed = 0

  // Lazy WS pool — only opened when we actually have events to process
  let _pool: { db: ReturnType<typeof createDb>; end: () => Promise<void> } | null = null
  function getPool() {
    if (!_pool) _pool = createDbWsPool(env.DATABASE_URL)
    return _pool.db
  }

  try {

  while (nextFrom !== null && pagesProcessed < MAX_PAGES && fetchesDone < MAX_CHECKOUT_FETCHES) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
    params.set('from', nextFrom)

    let eventsJson: { events: AllegroOrderEvent[] }
    try {
      const resp = await fetch(`${apiBase}/order/events?${params}`, {
        headers: allegroHeaders(accessToken),
      })
      if (resp.status === 401) {
        console.warn('[AllegroOrders] Token wygasł (401) — cron odświeży za chwilę')
        return
      }
      if (!resp.ok) {
        console.error(`[AllegroOrders] GET /order/events → ${resp.status}`)
        return
      }
      eventsJson = await resp.json() as { events: AllegroOrderEvent[] }
    } catch (err) {
      console.error('[AllegroOrders] Network error:', err)
      return
    }

    const allEvents = eventsJson.events ?? []
    const events = allEvents.filter(e => HANDLED_EVENT_TYPES.has(e.type))

    // ★ No events at all — we're caught up. No DB connection needed.
    if (allEvents.length === 0) break

    // If only non-handled events, just advance KV cursor (no DB)
    if (events.length === 0) {
      const pageLastId = allEvents[allEvents.length - 1]?.id
      if (pageLastId && pageLastId !== nextFrom) {
        await kv.put(CURSOR_KV_KEY, pageLastId)
      }
      if (allEvents.length < PAGE_SIZE) break
      nextFrom = pageLastId ?? nextFrom
      pagesProcessed++
      continue
    }

    // ── Deduplicate: group events by checkoutFormId, keep only the highest-priority event ──
    // Multiple events for the same order (BOUGHT → FILLED_IN → READY_FOR_PROCESSING) produce
    // redundant fetchCheckoutForm calls. We only need to process the latest/most-important one.
    const EVENT_PRIORITY: Record<string, number> = {
      'BUYER_CANCELLED':      5,
      'AUTO_CANCELLED':       5,
      'READY_FOR_PROCESSING': 4,
      'FILLED_IN':            2,
      'BOUGHT':               1,
    }

    const bestEventPerOrder = new Map<string, AllegroOrderEvent>()

    for (const event of events) {
      const formId = event.order.checkoutForm.id
      const existing = bestEventPerOrder.get(formId)
      const priority = EVENT_PRIORITY[event.type] ?? 0
      const existingPriority = existing ? (EVENT_PRIORITY[existing.type] ?? 0) : -1

      if (priority > existingPriority) {
        bestEventPerOrder.set(formId, event)
      }
    }

    const dedupedEvents = Array.from(bestEventPerOrder.values())

    console.log(`[AllegroOrders] Strona ${pagesProcessed + 1}: ${events.length} eventów → ${dedupedEvents.length} unikalnych zamówień (z ${allEvents.length} total)`)

    let lastCursor: string = nextFrom
    const db = getPool() // ← DB connection opened HERE, only when events exist

    for (const event of dedupedEvents) {
      if (fetchesDone >= MAX_CHECKOUT_FETCHES) {
        console.log(`[AllegroOrders] Osiągnięto limit ${MAX_CHECKOUT_FETCHES} fetch'y — kontynuacja w następnym cron run`)
        break
      }

      try {
        const ok = await processEvent(db, apiBase, accessToken, event)
        if (ok) lastCursor = event.id
        totalProcessed++
        fetchesDone++
      } catch (err) {
        console.error(`[AllegroOrders] Błąd przy ${event.type}/${event.order.checkoutForm.id}:`, err instanceof Error ? err.message : err)
        await db.insert(allegroSyncLog).values({
          offerId:      event.order.checkoutForm.id,
          action:       'order_sync',
          status:       'error',
          errorMessage: err instanceof Error ? err.message : String(err),
          errorCode:    event.type,
        }).catch(() => {})
        fetchesDone++ // count failed fetches too — they still consumed a subrequest
      }
    }

    // Always advance cursor to end of page (even non-handled events advance the stream)
    const pageLastId = allEvents[allEvents.length - 1]?.id
    if (pageLastId) lastCursor = pageLastId

    // Persist cursor — KV always, DB only when events were processed (saves CU on idle runs)
    if (lastCursor && lastCursor !== nextFrom) {
      if (totalProcessed > 0) {
        await writeCursor(kv, db, lastCursor)
      } else {
        await kv.put(CURSOR_KV_KEY, lastCursor)
      }
    }

    // Continue paging only if page was full
    if (allEvents.length < PAGE_SIZE) break

    nextFrom = lastCursor
    pagesProcessed++
    await sleep(100) // Rate-limit friendly delay between pages
  }

  if (totalProcessed > 0) {
    console.log(`[AllegroOrders] Sync zakończony — ${totalProcessed} eventów przetworzonych, ${fetchesDone} fetch'y Allegro API`)
  }

  } finally {
    // Close WS pool only if it was opened
    if (_pool) await _pool.end()
  }
}
