/**
 * Allegro Order Sync — Types & Constants
 */

// ── KV & DB cursor keys ───────────────────────────────────────────────────

export const CURSOR_KV_KEY = 'allegro:cursor:orders'
export const CURSOR_DB_KEY = 'order_events_cursor'

// ── Allegro API event types we handle ────────────────────────────────────

export const HANDLED_EVENT_TYPES = new Set([
  'BOUGHT',
  'FILLED_IN',
  'READY_FOR_PROCESSING',
  'BUYER_CANCELLED',
  'AUTO_CANCELLED',
])

// ── Allegro API response types ────────────────────────────────────────────

export interface AllegroOrderEvent {
  id: string
  occurredAt: string
  type: string
  order: {
    checkoutForm: { id: string }
  }
}

export interface AllegroAddress {
  firstName:    string
  lastName:     string
  phoneNumber?: string
  street:       string
  city:         string
  zipCode?:     string
  postCode?:    string   // sandbox returns postCode, prod returns zipCode
  countryCode:  string
}

export interface AllegroInvoiceAddress {
  company?: {
    name:  string
    taxId: string
  }
  naturalPerson?: {
    firstName: string
    lastName:  string
  }
  address?: {
    street:      string
    city:        string
    zipCode?:    string
    postCode?:   string
    countryCode: string
  }
}

export interface AllegroInvoice {
  required: boolean
  address?: AllegroInvoiceAddress
}

export interface AllegroCheckoutForm {
  id:        string
  status:    string
  revision?: string
  fulfillment?: {
    status: string  // NEW | PROCESSING | READY_FOR_SHIPMENT | READY_FOR_PICKUP | SENT | PICKED_UP | CANCELLED | SUSPENDED | RETURNED
  }
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
  invoice?: AllegroInvoice
}

// ── Backfill result ──────────────────────────────────────────────────────

export interface BackfillResult {
  imported: number
  skipped: number
  errors: number
  stoppedReason: 'caught_up' | 'end_of_data' | 'auth_error' | 'api_error'
}
