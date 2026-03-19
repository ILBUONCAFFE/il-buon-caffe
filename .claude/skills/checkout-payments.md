---
name: checkout-payments
description: >
  Implement checkout flow and Przelewy24 (P24) payment integration for Il Buon Caffè.
  Use this skill whenever the user works on checkout, payment processing, order creation, stock reservation,
  payment webhooks, or Przelewy24 configuration. Triggers on: "checkout", "płatność", "payment", "P24",
  "Przelewy24", "BLIK", "koszyk", "zamówienie", "order creation", "stock reservation", "idempotency",
  "webhook", "payment status", or any work on the checkout/payment flow. Also use when handling
  order status transitions or payment error handling.
---

# Checkout & Payments Skill — Il Buon Caffè

Implement the checkout flow with Przelewy24 (P24) payments, supporting card, BLIK, and bank transfers.

## Project Context

- Checkout pages in `apps/web/app/(shop)/checkout/`
- Payment API routes in `apps/api/src/routes/orders/` and `apps/api/src/routes/payments/`
- Przelewy24 — the primary Polish payment gateway
- Supports: card payments, BLIK, bank transfers
- All prices in PLN (Polish złoty)

## Checkout Flow

```
Cart → Checkout Form → Create Order → P24 Payment → Confirmation
  │        │               │              │              │
  │   Address + method     │         Redirect to     Webhook confirms
  │                   Stock reservation  P24 page      payment
  │                   + idempotency key
  │
  Guest or logged-in user
```

### Step 1: Cart → Checkout

User reviews cart, enters shipping details. Both guest and registered checkout supported.

```tsx
// apps/web/app/(shop)/checkout/page.tsx
// Client component — needs form state
'use client';

export default function CheckoutPage() {
  // Shipping form
  // Payment method selection (card, BLIK, bank transfer)
  // Order summary from cart
  // "Zamawiam i płacę" button
}
```

### Step 2: Create Order (API)

```typescript
// POST /api/orders
app.post('/',
  zValidator('json', createOrderSchema),
  async (c) => {
    const data = c.req.valid('json');
    const idempotencyKey = c.req.header('Idempotency-Key');

    // Check idempotency — prevent duplicate orders
    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey, c.env);
      if (existing) return c.json({ data: existing }, 200);
    }

    const db = c.get('db');

    // Transaction: reserve stock + create order
    const order = await db.transaction(async (tx) => {
      // 1. Verify stock availability
      for (const item of data.items) {
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });
        if (!product || product.stock < item.quantity) {
          throw new HTTPException(409, {
            message: `Niewystarczający stan magazynowy: ${product?.name}`,
          });
        }
      }

      // 2. Reserve stock (decrement)
      for (const item of data.items) {
        await tx.update(products)
          .set({ stock: sql`stock - ${item.quantity}` })
          .where(eq(products.id, item.productId));

        // Log stock change
        await tx.insert(stockChanges).values({
          productId: item.productId,
          changeType: 'reservation',
          quantity: -item.quantity,
          reason: 'order_created',
        });
      }

      // 3. Create order
      const [order] = await tx.insert(orders).values({
        userId: c.get('user')?.id || null,  // null for guest
        guestEmail: data.guestEmail || null,
        status: 'pending',
        totalAmount: calculateTotal(data.items),
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
        idempotencyKey,
      }).returning();

      // 4. Create order items
      await tx.insert(orderItems).values(
        data.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
        }))
      );

      return order;
    });

    // 5. Store idempotency key
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, order, c.env);
    }

    // 6. Register payment with P24
    const paymentUrl = await registerP24Payment(order, c.env);

    return c.json({ data: { order, paymentUrl } }, 201);
  }
);
```

### Step 3: Przelewy24 Payment

#### Register Transaction

```typescript
async function registerP24Payment(order: Order, env: Env): Promise<string> {
  const p24Base = env.P24_SANDBOX
    ? 'https://sandbox.przelewy24.pl'
    : 'https://secure.przelewy24.pl';

  const payload = {
    merchantId: Number(env.P24_MERCHANT_ID),
    posId: Number(env.P24_POS_ID),
    sessionId: order.id, // unique per transaction
    amount: Math.round(order.totalAmount * 100), // P24 uses grosze (cents)
    currency: 'PLN',
    description: `Zamówienie #${order.id.slice(0, 8)}`,
    email: order.guestEmail || order.user?.email,
    country: 'PL',
    language: 'pl',
    urlReturn: `${env.APP_URL}/checkout/confirmation?orderId=${order.id}`,
    urlStatus: `${env.API_URL}/api/payments/p24/webhook`,
    sign: calculateP24Sign(order, env), // CRC checksum
  };

  const response = await fetch(`${p24Base}/api/v1/transaction/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${env.P24_POS_ID}:${env.P24_API_KEY}`)}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.data?.token) {
    throw new Error('P24 registration failed');
  }

  // Store P24 token on order
  await db.update(orders)
    .set({ paymentId: result.data.token })
    .where(eq(orders.id, order.id));

  // Redirect URL
  return `${p24Base}/trnRequest/${result.data.token}`;
}
```

#### CRC Sign Calculation

```typescript
function calculateP24Sign(order: Order, env: Env): string {
  const data = JSON.stringify({
    sessionId: order.id,
    merchantId: Number(env.P24_MERCHANT_ID),
    amount: Math.round(order.totalAmount * 100),
    currency: 'PLN',
    crc: env.P24_CRC_KEY,
  });

  // SHA-384 hash
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-384', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

#### Webhook — Payment Confirmation

```typescript
// POST /api/payments/p24/webhook
app.post('/p24/webhook', async (c) => {
  const body = await c.req.json();

  // Verify the webhook signature
  const isValid = verifyP24Webhook(body, c.env);
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // Verify transaction with P24
  const verified = await verifyP24Transaction(body, c.env);

  if (verified) {
    // Update order status
    await db.update(orders)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(orders.id, body.sessionId));

    // Log to audit
    await logAudit('order', body.sessionId, 'payment_confirmed', c);
  } else {
    // Payment failed — release stock
    await releaseOrderStock(body.sessionId);

    await db.update(orders)
      .set({ status: 'payment_failed' })
      .where(eq(orders.id, body.sessionId));
  }

  return c.json({ status: 'ok' });
});
```

## Idempotency Keys

Prevent duplicate order creation from network retries:

```typescript
// Client sends: Idempotency-Key: <uuid>
// Server checks KV before processing:

async function checkIdempotency(key: string, env: Env) {
  const cached = await env.KV.get(`idempotency:${key}`);
  return cached ? JSON.parse(cached) : null;
}

async function storeIdempotency(key: string, result: any, env: Env) {
  await env.KV.put(`idempotency:${key}`, JSON.stringify(result), {
    expirationTtl: 86400, // 24 hours
  });
}
```

## Order Status Flow

```
pending → paid → processing → shipped → delivered
   │         │
   │         └→ refunded
   └→ payment_failed → (stock released)
   └→ cancelled → (stock released)
```

## Stock Release on Failure/Cancellation

```typescript
async function releaseOrderStock(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(products)
        .set({ stock: sql`stock + ${item.quantity}` })
        .where(eq(products.id, item.productId));

      await tx.insert(stockChanges).values({
        productId: item.productId,
        changeType: 'release',
        quantity: item.quantity,
        reason: 'order_cancelled',
        orderId,
      });
    }
  });
}
```

## Key Conventions

- All monetary amounts stored as `decimal(10,2)` in DB, converted to grosze (×100) for P24
- Guest checkout: `userId` is null, `guestEmail` is required
- Every order creation requires an `Idempotency-Key` header from the frontend
- Stock is reserved immediately on order creation, released on failure/cancellation
- P24 sandbox for development: `https://sandbox.przelewy24.pl`
- P24 production: `https://secure.przelewy24.pl`
