# Il Buon Caffè — Public Launch Roadmap

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** MVP public launch — own storefront + P24 payments + InPost shipping. Allegro integration is post-launch.

---

## Current State

~70% ready. Core e-commerce infrastructure (auth, catalog, orders, admin, DB) is solid. Critical gaps:

| Area | Status | Notes |
|---|---|---|
| Auth (login, register, JWT, sessions) | DONE | Fully implemented |
| Product catalog UI | DONE | Shop pages, product detail, ISR caching |
| Order management backend | DONE | Idempotency, stock changes, audit log |
| Admin panel | MOSTLY DONE | Dashboard, orders, customers, products views exist |
| Checkout → P24 | MISSING | Frontend uses mock with 2.5s fake timeout |
| Email | MISSING | No provider integrated — blocks auth verification + order confirmation |
| InPost shipping | MISSING | No integration |
| Product data | MISSING | No products in DB yet |
| Legal pages | MISSING | Regulamin, polityka prywatności, polityka zwrotów |
| Product creator (admin) | PARTIAL | Needs verification — product content entry depends on this |

---

## Architecture

Unchanged from existing stack:
- **Frontend:** Next.js 16 App Router on Cloudflare Workers (OpenNext)
- **Backend:** Hono.js on Cloudflare Workers
- **DB:** Neon PostgreSQL via Drizzle ORM
- **Email:** AWS SES via fetch (no Node.js SDK — Workers constraint)
- **Payments:** Przelewy24 (backend API already partially implemented)
- **Shipping:** InPost API (shipment creation, label generation, paczkomat picker)
- **Storage:** Cloudflare R2 (product images)

---

## Launch Strategy: Parallel Tracks

Two tracks run simultaneously. P24 registration is the longest lead-time item — it determines the launch date.

**Track A — Business/External (start Day 1, cannot be accelerated by code)**
1. Register P24 merchant account (3–7 business days)
2. Verify sending domain in AWS SES (1–2 days)
3. Engage lawyers: Regulamin, Polityka prywatności, Polityka zwrotów (must comply with Polish consumer law, 14-day return period)
4. Register InPost API account (SendingMethod)

**Track B — Technical (runs in parallel with Track A)**
Covered in Phases 1–2 below.

**Critical path:** P24 credentials → final checkout wiring → smoke test → LAUNCH. Everything else must be ready before credentials arrive.

---

## Phase 0 — External (Day 1, no code)

| Task | Owner | Lead time |
|---|---|---|
| Register P24 merchant account | Business | 3–7 business days |
| Verify sending domain in AWS SES | Tech/Business | 1–2 days |
| Legal documents (Regulamin, Privacy Policy, Returns Policy) | Lawyers | Variable |
| Register InPost API account | Business | 1–3 days |

---

## Phase 1 — Foundation (launch blocker — nothing works without this)

### 1.1 Infrastructure & Deploy
- Verify all required secrets are set in Cloudflare Workers dashboard:
  - `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_SECRET`
  - `P24_MERCHANT_ID`, `P24_API_KEY`, `P24_CRC_KEY`
  - `ALLEGRO_TOKEN_ENCRYPTION_KEY` (prevents plaintext token storage)
  - `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, `AWS_SES_FROM_ADDRESS`
  - `INPOST_API_TOKEN`
- Run DB migrations on production (`drizzle-kit migrate`)
- Deploy API + web to production domain with SSL
- Verify admin panel accessible and functional on production

### 1.2 Product Creator (Admin)
- Full CRUD for products in admin panel: name, description, price, SKU, category, stock, weight
- Image upload to R2 with preview
- Stock management (manual adjustment)
- Without this, there is nothing to sell

### 1.3 Email — AWS SES Integration
- Implement SES email sender in API using `fetch` (no AWS SDK — Workers constraint)
  - `POST https://email.{region}.amazonaws.com/` with AWS Signature V4
  - Or use SES SMTP via Workers fetch
- Email templates (HTML, Polish):
  - **Weryfikacja konta** — link ważny 24h
  - **Reset hasła** — link ważny 1h
  - **Potwierdzenie zamówienia** — numer zamówienia, lista produktów, suma, adres dostawy
- Wire into existing auth routes and order creation endpoint

### 1.4 Checkout → P24 Wiring
- Replace mock in `/checkout/payment` with real call to `/api/payments/p24/initiate`
- Capture P24 `sessionId` and redirect to P24 hosted payment page
- Handle return URL: `/checkout/success?sessionId=...` → verify payment status via P24 API
- Handle cancel URL: redirect back to cart
- Verify existing webhook handler (`/api/webhooks/przelewy24`) correctly updates order status
- Send order confirmation email after successful payment
- **Requires P24 credentials from Phase 0**

### 1.5 InPost in Checkout
- InPost Paczkomat picker widget embedded in checkout address step
- Alternatively: delivery address form for courier option
- Shipping cost calculation based on cart weight/value
- Save selected delivery method + point/address to order `customerData` JSONB

### 1.6 Legal Pages
- Static pages: `/regulamin`, `/polityka-prywatnosci`, `/polityka-zwrotow`
- Cookie consent banner (RODO) — first-visit, accept/reject, persisted in cookie
- Links in footer
- **Content provided by lawyers from Phase 0**
- Without these, launching is legally risky under Polish consumer law

---

## Phase 2 — Launch-Quality (store works but incomplete without this)

### 2.1 InPost Fulfillment (Admin)
- From order detail in admin: create InPost shipment via API
- Generate and download shipping label (PDF)
- Add `trackingNumber varchar` column to `orders` table, save InPost tracking number there

### 2.2 Shipping Notification Email
- Template: **Powiadomienie o wysyłce** — numer zamówienia, numer śledzenia InPost, link do śledzenia
- Triggered when admin marks order as shipped / saves tracking number

### 2.3 Returns Flow
- Customer-facing: form at `/konto/zamowienia/[id]/zwrot` — reason, item selection
- Creates `return` record in DB (new table needed: `orderReturns`)
- Admin view: list of return requests, approve/reject, mark as received
- Refund trigger: approved return → call P24 refund API

### 2.4 VAT Invoices
- Generate PDF invoice for each order (customer NIP optional, required if B2B)
- Available for download in customer account and admin
- Polish VAT rates: 23% standard, 8% food products, 5% books

---

## Phase 3 — Post-Launch

- Allegro integration (order sync, offer management)
- Discount codes and promotions
- Analytics dashboard
- Product reviews
- Abandoned cart recovery

---

## Data Model Changes Needed

| Table | Change |
|---|---|
| `orders` | Add `trackingNumber varchar`, `shippingMethod varchar`, `inpostPointId varchar` |
| `orderReturns` (new) | `id`, `orderId`, `reason`, `status enum`, `items jsonb`, `createdAt`, `updatedAt` |

---

## Definition of Done (Launch)

A launch is safe when:
- [ ] Customer can register, verify email, log in
- [ ] Customer can browse products and add to cart
- [ ] Customer can complete checkout with real P24 payment
- [ ] Customer receives order confirmation email
- [ ] Admin sees the order and can manage its status
- [ ] Admin can create InPost shipment from order
- [ ] Customer receives shipping notification with tracking
- [ ] Legal pages live: regulamin, polityka prywatności, polityka zwrotów
- [ ] Cookie consent banner working
- [ ] At least one product category with products in DB
- [ ] All production secrets set and verified
