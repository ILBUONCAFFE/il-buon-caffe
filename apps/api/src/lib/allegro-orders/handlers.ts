/**
 * Allegro Order Sync — Event handlers
 */

import { createDb } from '@repo/db/client'
import {
  orders,
  orderItems,
  products,
  allegroSyncLog,
  stockChanges,
} from '@repo/db/schema'
import { eq, and, or } from 'drizzle-orm'
import type { AllegroCheckoutForm, AllegroOrderEvent } from './types'
import { generateOrderNumber, buildShippingAddress, fetchCheckoutForm } from './helpers'

// ── Event handlers ────────────────────────────────────────────────────────

/**
 * BOUGHT — Buyer placed order (payment may still be pending).
 * Action: Create order with status `pending`. No stock deduction yet.
 */
export async function handleBought(
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
export async function handleFilledIn(
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
export async function handleReadyForProcessing(
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
export async function handleCancelled(
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

// ── Process a single event ────────────────────────────────────────────────

export async function processEvent(
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
