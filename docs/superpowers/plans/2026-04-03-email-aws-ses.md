# Email — AWS SES — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate AWS SES for transactional emails: account verification, password reset, and order confirmation — all in Polish.

**Architecture:** Cloudflare Workers cannot use the Node.js AWS SDK. We use `aws4fetch` (edge-compatible, uses Web Crypto API) to sign requests to the SES v2 HTTP API. Email sending is fire-and-forget wrapped in try/catch — a failed email never breaks the main flow. Templates are pure functions returning `{ subject, html }`.

**Tech Stack:** `aws4fetch`, AWS SES v2 REST API, Hono.js, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/api/src/lib/email.ts` | **Create** | SES sender + all email templates |
| `apps/api/src/index.ts` | **Modify** | Add SES fields to `Env` interface (lines 28-58) |
| `apps/api/wrangler.json` | **Modify** | Add `AWS_SES_REGION` and `AWS_SES_FROM_ADDRESS` to vars |
| `apps/api/src/routes/auth.ts` | **Modify** | Wire emails at lines 179, 629, 766 |
| `apps/api/src/routes/orders.ts` | **Modify** | Wire order confirmation after line 239 |

---

### Task 1: Install aws4fetch

**Files:**
- Modify: `apps/api/package.json` (npm adds this automatically)

- [ ] **Step 1: Install dependency**

```bash
npm install aws4fetch --workspace=apps/api
```

Expected: `aws4fetch` appears in `apps/api/package.json` dependencies.

- [ ] **Step 2: Verify it resolves in TypeScript**

```bash
cd apps/api && node -e "require('aws4fetch')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json package-lock.json
git commit -m "chore(api): add aws4fetch for SES integration"
```

---

### Task 2: Update Env interface and wrangler.json

**Files:**
- Modify: `apps/api/src/index.ts` lines 53-58
- Modify: `apps/api/wrangler.json`

- [ ] **Step 1: Add SES fields to Env interface in `apps/api/src/index.ts`**

Find the block ending at line 58 (`}`). Add after `HYPERDRIVE?: Hyperdrive` (line 57):

```typescript
  // ── AWS SES ───────────────────────────────────────────────────────────────
  AWS_SES_ACCESS_KEY_ID: string
  AWS_SES_SECRET_ACCESS_KEY: string
  AWS_SES_REGION: string         // e.g. eu-west-1
  AWS_SES_FROM_ADDRESS: string   // e.g. kontakt@ilbuoncaffe.pl
```

The full Env interface block should now end with:
```typescript
  // Cloudflare Hyperdrive — connection pool at edge
  HYPERDRIVE?: Hyperdrive

  // ── AWS SES ───────────────────────────────────────────────────────────────
  AWS_SES_ACCESS_KEY_ID: string
  AWS_SES_SECRET_ACCESS_KEY: string
  AWS_SES_REGION: string
  AWS_SES_FROM_ADDRESS: string
}
```

- [ ] **Step 2: Add non-secret SES vars to `apps/api/wrangler.json`**

In the `"vars"` section of `apps/api/wrangler.json`, add:
```json
"AWS_SES_REGION": "eu-west-1",
"AWS_SES_FROM_ADDRESS": "kontakt@ilbuoncaffe.pl"
```

(Replace `eu-west-1` with your actual SES region, and the email with your verified sender address.)

`AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY` are secrets — set them via wrangler CLI (see Task 6), never in wrangler.json.

- [ ] **Step 3: Type-check**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/api/wrangler.json
git commit -m "feat(api): add AWS SES fields to Env interface"
```

---

### Task 3: Create email.ts — sender and templates

**Files:**
- Create: `apps/api/src/lib/email.ts`

- [ ] **Step 1: Create the file**

Create `apps/api/src/lib/email.ts` with this full content:

```typescript
import { AwsClient } from 'aws4fetch'

// ── Types ─────────────────────────────────────────────────────────────────

interface SESEnv {
  AWS_SES_ACCESS_KEY_ID: string
  AWS_SES_SECRET_ACCESS_KEY: string
  AWS_SES_REGION: string
  AWS_SES_FROM_ADDRESS: string
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export interface OrderEmailData {
  orderNumber: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  total: number
  shippingCost: number
  customerName: string
  shippingAddress: {
    street: string
    city: string
    postalCode: string
  }
}

// ── Sender ────────────────────────────────────────────────────────────────

export async function sendEmail(env: SESEnv, options: SendEmailOptions): Promise<void> {
  const aws = new AwsClient({
    accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
    region: env.AWS_SES_REGION,
    service: 'ses',
  })

  const response = await aws.fetch(
    `https://email.${env.AWS_SES_REGION}.amazonaws.com/v2/email/outbound-emails`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FromEmailAddress: env.AWS_SES_FROM_ADDRESS,
        Destination: { ToAddresses: [options.to] },
        Content: {
          Simple: {
            Subject: { Data: options.subject, Charset: 'UTF-8' },
            Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`SES ${response.status}: ${body}`)
  }
}

// ── Shared layout ─────────────────────────────────────────────────────────

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#1a0a00;padding:24px 32px;">
            <p style="margin:0;color:#d4a96a;font-size:22px;letter-spacing:2px;">IL BUON CAFFÈ</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f5f0eb;text-align:center;">
            <p style="margin:0;color:#888;font-size:12px;">Il Buon Caffè · kontakt@ilbuoncaffe.pl</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1a0a00;color:#fff;padding:12px 28px;text-decoration:none;border-radius:4px;font-size:15px;margin:20px 0;">${label}</a>`
}

function formatPLN(grosz: number): string {
  return (grosz / 100).toFixed(2).replace('.', ',') + ' zł'
}

// ── Templates ─────────────────────────────────────────────────────────────

export function buildVerificationEmail(
  token: string,
  frontendUrl: string
): { subject: string; html: string } {
  const link = `${frontendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`
  return {
    subject: 'Zweryfikuj swój adres email — Il Buon Caffè',
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Witaj w Il Buon Caffè</h2>
      <p style="color:#333;line-height:1.6;">Dziękujemy za rejestrację. Kliknij poniższy przycisk, aby potwierdzić swój adres email.</p>
      <p style="color:#666;font-size:14px;">Link jest ważny przez <strong>6 godzin</strong>.</p>
      ${btn(link, 'Zweryfikuj adres email')}
      <p style="color:#999;font-size:13px;margin-top:24px;">Jeśli nie rejestrowano konta w Il Buon Caffè, zignoruj tę wiadomość.</p>
      <p style="color:#bbb;font-size:12px;word-break:break-all;">Lub skopiuj link: ${link}</p>
    `),
  }
}

export function buildPasswordResetEmail(
  token: string,
  frontendUrl: string
): { subject: string; html: string } {
  const link = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`
  return {
    subject: 'Reset hasła — Il Buon Caffè',
    html: emailLayout(`
      <h2 style="margin:0 0 16px;color:#1a0a00;font-size:22px;">Reset hasła</h2>
      <p style="color:#333;line-height:1.6;">Otrzymaliśmy prośbę o reset hasła do Twojego konta.</p>
      <p style="color:#c0392b;font-size:14px;font-weight:bold;">Link jest ważny przez <strong>15 minut</strong>.</p>
      ${btn(link, 'Ustaw nowe hasło')}
      <p style="color:#999;font-size:13px;margin-top:24px;">Jeśli nie wysyłano prośby o reset hasła, zignoruj tę wiadomość. Twoje hasło pozostaje bez zmian.</p>
      <p style="color:#bbb;font-size:12px;word-break:break-all;">Lub skopiuj link: ${link}</p>
    `),
  }
}

export function buildOrderConfirmationEmail(
  order: OrderEmailData
): { subject: string; html: string } {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;color:#333;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:10px 0;color:#333;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${formatPLN(item.unitPrice * item.quantity)}</td>
      </tr>`
    )
    .join('')

  const { street, city, postalCode } = order.shippingAddress

  return {
    subject: `Potwierdzenie zamówienia #${order.orderNumber} — Il Buon Caffè`,
    html: emailLayout(`
      <h2 style="margin:0 0 8px;color:#1a0a00;font-size:22px;">Dziękujemy za zamówienie!</h2>
      <p style="color:#666;margin:0 0 24px;">Numer zamówienia: <strong style="color:#1a0a00;">#${order.orderNumber}</strong></p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px 0;text-align:left;color:#888;font-size:13px;border-bottom:2px solid #eee;">Produkt</th>
            <th style="padding:8px 0;text-align:center;color:#888;font-size:13px;border-bottom:2px solid #eee;">Ilość</th>
            <th style="padding:8px 0;text-align:right;color:#888;font-size:13px;border-bottom:2px solid #eee;">Kwota</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 0;color:#666;font-size:14px;">Dostawa</td>
            <td style="padding:10px 0;text-align:right;color:#333;">${formatPLN(order.shippingCost)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:12px 0;color:#1a0a00;font-weight:bold;font-size:16px;border-top:2px solid #eee;">Razem</td>
            <td style="padding:12px 0;text-align:right;color:#1a0a00;font-weight:bold;font-size:16px;border-top:2px solid #eee;">${formatPLN(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:24px;padding:16px;background:#f5f0eb;border-radius:6px;">
        <p style="margin:0 0 8px;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Adres dostawy</p>
        <p style="margin:0;color:#333;line-height:1.6;">${order.customerName}<br>${street}<br>${postalCode} ${city}</p>
      </div>

      <p style="color:#888;font-size:13px;margin-top:24px;">O wysyłce zamówienia poinformujemy Cię osobnym emailem z numerem śledzenia.</p>
    `),
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/email.ts
git commit -m "feat(api): add AWS SES email sender and Polish templates"
```

---

### Task 4: Wire emails into auth.ts

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

- [ ] **Step 1: Add import at top of auth.ts**

At the top of `apps/api/src/routes/auth.ts`, add after the last existing import:

```typescript
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from '../lib/email'
```

- [ ] **Step 2: Wire verification email in POST /register (line ~179)**

Find the comment `// TODO: Send verification email (Week 4 - SES integration)` (around line 179) and replace it with:

```typescript
try {
  const { subject, html } = buildVerificationEmail(verificationToken, c.env.FRONTEND_URL)
  await sendEmail(c.env, { to: email, subject, html })
} catch (err) {
  console.error('[email] Failed to send verification email:', err)
  // Registration succeeds even if email fails — user can use resend endpoint
}
```

- [ ] **Step 3: Wire password reset email in POST /forgot-password (line ~629)**

Find the comment `// TODO: Send password reset email (Week 4 - SES integration)` (around line 629) and replace it with:

```typescript
try {
  const { subject, html } = buildPasswordResetEmail(resetToken, c.env.FRONTEND_URL)
  await sendEmail(c.env, { to: user.email, subject, html })
} catch (err) {
  console.error('[email] Failed to send password reset email:', err)
}
```

- [ ] **Step 4: Wire verification email in POST /resend-verification (line ~766)**

Find the comment `// TODO: Send verification email (Week 4 - SES integration)` (around line 766) in the resend handler and replace it with:

```typescript
try {
  const { subject, html } = buildVerificationEmail(newToken, c.env.FRONTEND_URL)
  await sendEmail(c.env, { to: user.email, subject, html })
} catch (err) {
  console.error('[email] Failed to send verification email:', err)
}
```

Note: `newToken` is the raw token variable name in that handler. Verify the variable name matches what's in the code at that location.

- [ ] **Step 5: Type-check**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/auth.ts
git commit -m "feat(api): wire AWS SES emails into auth routes"
```

---

### Task 5: Wire order confirmation email into orders.ts

**Files:**
- Modify: `apps/api/src/routes/orders.ts`

- [ ] **Step 1: Add import at top of orders.ts**

Add after the last existing import:

```typescript
import { sendEmail, buildOrderConfirmationEmail, type OrderEmailData } from '../lib/email'
```

- [ ] **Step 2: Locate the data available after order creation**

In `apps/api/src/routes/orders.ts`, at the point after order items are inserted (around line 239), the following variables are in scope:
- `orderNumber` — string, e.g. `"IBC-2026-00001"`
- `total` — number in grosze (integer)
- `shippingCost` — number in grosze
- `customerData` — object with `email`, `firstName`, `lastName`, `shippingAddress`
- `reservedItems` — array of items from the stock reservation step, each with `productSku`, `quantity`, `unitPrice`, `name`

Check the actual variable names in the file at that location and adjust the code below accordingly.

- [ ] **Step 3: Add order confirmation email after order items insert (after line ~239)**

Find the block that inserts order items and ends the order creation. After the items insert (and before the success response), add:

```typescript
// Send order confirmation email — fire and forget
try {
  const emailData: OrderEmailData = {
    orderNumber,
    items: reservedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    total,
    shippingCost,
    customerName: `${customerData.firstName} ${customerData.lastName}`,
    shippingAddress: {
      street: customerData.shippingAddress.street,
      city: customerData.shippingAddress.city,
      postalCode: customerData.shippingAddress.postalCode,
    },
  }
  const { subject, html } = buildOrderConfirmationEmail(emailData)
  await sendEmail(c.env, { to: customerData.email, subject, html })
} catch (err) {
  console.error('[email] Failed to send order confirmation:', err)
}
```

Note: if the variable names in scope don't match (`reservedItems`, `customerData`, etc.), check the actual code and use the real variable names. The structure above is based on the exploration results — `unitPrice` is stored per item in the stock reservation.

- [ ] **Step 4: Type-check**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors. If type errors occur due to mismatched property names, check the actual variable shapes in orders.ts and adjust the mapping.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/orders.ts
git commit -m "feat(api): send order confirmation email via AWS SES"
```

---

### Task 6: Set SES secrets in Cloudflare Workers

**Files:** None (wrangler CLI only)

- [ ] **Step 1: Set access key and secret key**

```bash
cd apps/api
npx wrangler secret put AWS_SES_ACCESS_KEY_ID
npx wrangler secret put AWS_SES_SECRET_ACCESS_KEY
```

Paste the values from your AWS IAM user that has `ses:SendEmail` permission.

- [ ] **Step 2: Verify SES sender address is verified in AWS console**

In AWS Console → SES → Verified Identities, confirm `kontakt@ilbuoncaffe.pl` (or your FROM address) shows "Verified" status. If not, verify the domain or email address before deploying.

- [ ] **Step 3: Deploy updated API**

```bash
cd apps/api && npx wrangler deploy
```

- [ ] **Step 4: Smoke test email via registration**

In the deployed app, register a new account with a real email address. Verify:
- Registration succeeds (HTTP 201)
- Verification email arrives within ~30 seconds
- Email link contains correct domain (`ilbuoncaffe.pl`)
- Clicking the link verifies the account successfully

- [ ] **Step 5: Smoke test password reset**

On the login page, trigger "Forgot password" with the test email. Verify:
- Reset email arrives
- Link is valid for 15 minutes
- New password can be set via the link

---

## Done Criteria

- [ ] `aws4fetch` installed in `apps/api`
- [ ] `Env` interface has all 4 SES fields
- [ ] `apps/api/src/lib/email.ts` exists with `sendEmail` + 3 template builders
- [ ] Registration sends verification email
- [ ] Forgot password sends reset email
- [ ] Resend verification sends email
- [ ] New order sends confirmation email
- [ ] Type-check passes with zero errors
- [ ] Deployed and smoke-tested on production
