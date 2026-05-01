export type TimelineCategory = 'status' | 'tracking' | 'payment' | 'allegro' | 'admin' | 'system'

export interface TimelineEvent {
  id: string
  category: TimelineCategory
  label: string
  occurredAt: string
  source: string
  sourceRef?: string
  previousValue?: string | null
  newValue?: string
}

export interface OrderItem {
  id: number
  sku: string
  name: string
  imageUrl: string | null
  quantity: number
  unitPrice: string
  totalPrice: string
  returnedQty: number
  complainedQty: number
  mapped: boolean
}

export interface ShipmentParcel {
  waybill: string
  carrier: string
  statusCode: string
  statusLabel: string
  occurredAt: string
  isSelected: boolean
  events: { code: string; label: string; occurredAt: string }[]
}

export interface PaymentEntry {
  id: string
  type: 'charge' | 'refund'
  amount: string
  date: string
  status: string
  initiatedBy: string
  reference: string
}

export interface ReturnEntry {
  id: string
  status: 'reported' | 'accepted' | 'rejected' | 'received' | 'settled' | 'cancelled'
  reason: string
  comment: string
  items: { sku: string; name: string; quantity: number }[]
  refundAmount: string
  shippingRefund: string
  returnMethod: string
  waybill?: string
  attachments: string[]
  reportedAt: string
  slaDeadline?: string
  timeline: { label: string; at: string }[]
}

export interface ComplaintEntry {
  id: string
  type: 'quality' | 'mismatch' | 'damage' | 'missing' | 'other'
  status: 'open' | 'in_progress' | 'awaiting_customer' | 'awaiting_us' | 'resolved' | 'escalated' | 'closed'
  origin: 'customer' | 'admin' | 'allegro_protect'
  escalated: boolean
  escalationDeadline?: string
  proposedResolution?: string
  attachments: string[]
  messageCount: number
  openedAt: string
}

export interface DisputeEntry {
  id: string
  topic: string
  status: 'open' | 'pending_seller' | 'pending_buyer' | 'resolved' | 'escalated'
  lastActivity: string
  messageCount: number
  slaDeadline?: string
}

export interface MessageThread {
  id: string
  channel: 'allegro' | 'email'
  direction: 'in' | 'out'
  body: string
  attachments: string[]
  sentAt: string
  read: boolean
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  target: string
  at: string
}

export interface OrderDetailMock {
  orderNumber: string
  source: 'shop' | 'allegro'
  allegroEnv?: 'sandbox' | 'production'
  status: string
  allegroFulfillmentStatus?: string
  allegroRevision?: string
  externalId?: string
  smart: boolean
  paymentMethod: string
  p24Status: string
  p24TransactionId: string
  p24SessionId: string
  paidAt: string
  total: string
  subtotal: string
  shippingCost: string
  taxAmount: string
  currency: string
  totalPln?: string
  exchangeRate?: string
  rateDate?: string
  refundedTotal: string
  invoiceRequired: boolean
  invoiceStatus: 'none' | 'issued' | 'sent' | 'corrected'
  invoiceNumber?: string
  invoicePdfUrl?: string
  shippingMethod: string
  trackingNumber?: string
  pickupPoint?: { id: string; address: string }
  shippedAt?: string
  deliveredAt?: string
  notes: string
  internalNotes: string
  retentionStatus: string
  customer: {
    name: string
    email: string
    phone: string
    isCompany: boolean
    nip?: string
    companyName?: string
    allegroLogin?: string
    allegroBuyerId?: string
    isFirstTime: boolean
    totalOrders: number
    ltvPln: string
    avgOrderPln: string
    consents: { type: string; granted: boolean; at: string }[]
  }
  shippingAddress: { street: string; city: string; postalCode: string; country: string }
  billingAddress?: { street: string; city: string; postalCode: string; country: string }
  items: OrderItem[]
  parcels: ShipmentParcel[]
  payments: PaymentEntry[]
  timeline: TimelineEvent[]
  messages: MessageThread[]
  returns: ReturnEntry[]
  complaints: ComplaintEntry[]
  disputes: DisputeEntry[]
  feedback?: { rating: number; body: string; at: string; reply?: string }
  audit: AuditEntry[]
  createdAt: string
  warnings: { level: 'warn' | 'error'; text: string }[]
}

export function getMockOrder(id: string): OrderDetailMock {
  return {
    orderNumber: `2026/04/${id.padStart(5, '0')}`,
    source: 'allegro',
    allegroEnv: 'production',
    status: 'shipped',
    allegroFulfillmentStatus: 'SENT',
    allegroRevision: 'rev-7a2f',
    externalId: 'AL-9384572',
    smart: true,
    paymentMethod: 'allegro_pay',
    p24Status: 'success',
    p24TransactionId: 'P24-TX-88419',
    p24SessionId: 'sess-22d9',
    paidAt: '2026-04-28T09:14:00Z',
    total: '348.50',
    subtotal: '329.00',
    shippingCost: '19.50',
    taxAmount: '64.94',
    currency: 'PLN',
    refundedTotal: '0.00',
    invoiceRequired: true,
    invoiceStatus: 'issued',
    invoiceNumber: 'FV/2026/04/142',
    invoicePdfUrl: '#',
    shippingMethod: 'InPost Paczkomat',
    trackingNumber: '620012345678901234',
    pickupPoint: { id: 'WAW123M', address: 'ul. Marszalkowska 12, 00-026 Warszawa' },
    shippedAt: '2026-04-29T11:00:00Z',
    notes: 'Prosze zapakowac jako prezent.',
    internalNotes: 'Staly klient — priorytet pakowania.',
    retentionStatus: 'active',
    customer: {
      name: 'Anna Kowalska',
      email: 'anna.kowalska@example.com',
      phone: '+48 600 123 456',
      isCompany: true,
      nip: '5252123456',
      companyName: 'Cafe Roma Sp. z o.o.',
      allegroLogin: 'anna_k_82',
      allegroBuyerId: 'AL-USER-77234',
      isFirstTime: false,
      totalOrders: 7,
      ltvPln: '2 184,00',
      avgOrderPln: '312,00',
      consents: [
        { type: 'terms', granted: true, at: '2025-09-01' },
        { type: 'marketing', granted: false, at: '2025-09-01' },
        { type: 'analytics', granted: true, at: '2025-09-01' },
      ],
    },
    shippingAddress: { street: 'ul. Marszalkowska 12', city: 'Warszawa', postalCode: '00-026', country: 'PL' },
    billingAddress: { street: 'ul. Biurowa 5', city: 'Warszawa', postalCode: '00-100', country: 'PL' },
    items: [
      {
        id: 1,
        sku: 'COFFEE-LAVAZZA-ORO-1KG',
        name: 'Lavazza Qualita Oro 1kg ziarnista',
        imageUrl: null,
        quantity: 2,
        unitPrice: '129.00',
        totalPrice: '258.00',
        returnedQty: 0,
        complainedQty: 0,
        mapped: true,
      },
      {
        id: 2,
        sku: 'WINE-BAROLO-2019',
        name: 'Barolo DOCG 2019 Tenuta Carretta',
        imageUrl: null,
        quantity: 1,
        unitPrice: '71.00',
        totalPrice: '71.00',
        returnedQty: 0,
        complainedQty: 1,
        mapped: false,
      },
    ],
    parcels: [
      {
        waybill: '620012345678901234',
        carrier: 'InPost',
        statusCode: 'IN_TRANSIT',
        statusLabel: 'W drodze',
        occurredAt: '2026-04-30T08:22:00Z',
        isSelected: true,
        events: [
          { code: 'CREATED', label: 'Etykieta utworzona', occurredAt: '2026-04-29T10:00:00Z' },
          { code: 'PICKED_UP', label: 'Odebrana przez kuriera', occurredAt: '2026-04-29T15:30:00Z' },
          { code: 'IN_TRANSIT', label: 'W drodze do paczkomatu', occurredAt: '2026-04-30T08:22:00Z' },
        ],
      },
    ],
    payments: [
      {
        id: 'pay-1',
        type: 'charge',
        amount: '348.50',
        date: '2026-04-28T09:14:00Z',
        status: 'success',
        initiatedBy: 'klient',
        reference: 'P24-TX-88419',
      },
    ],
    timeline: [
      { id: 't1', category: 'status', label: 'Zamowienie utworzone', occurredAt: '2026-04-28T09:10:00Z', source: 'allegro_order_event', sourceRef: 'AL-EVT-1', newValue: 'pending' },
      { id: 't2', category: 'payment', label: 'Platnosc potwierdzona', occurredAt: '2026-04-28T09:14:00Z', source: 'p24_webhook', sourceRef: 'P24-TX-88419', previousValue: 'pending', newValue: 'paid' },
      { id: 't3', category: 'admin', label: 'Status zmieniony recznie', occurredAt: '2026-04-29T08:00:00Z', source: 'admin', sourceRef: 'admin@ilbuoncaffe.pl', previousValue: 'paid', newValue: 'processing' },
      { id: 't4', category: 'allegro', label: 'Etykieta zakupiona przez Allegro', occurredAt: '2026-04-29T10:00:00Z', source: 'allegro_shipment_event', sourceRef: '620012345678901234' },
      { id: 't5', category: 'tracking', label: 'Paczka odebrana przez kuriera', occurredAt: '2026-04-29T15:30:00Z', source: 'inpost', sourceRef: 'PICKED_UP' },
      { id: 't6', category: 'tracking', label: 'W drodze do paczkomatu', occurredAt: '2026-04-30T08:22:00Z', source: 'inpost', sourceRef: 'IN_TRANSIT' },
      { id: 't7', category: 'status', label: 'Zamowienie wyslane', occurredAt: '2026-04-29T11:00:00Z', source: 'system', previousValue: 'processing', newValue: 'shipped' },
    ],
    messages: [
      { id: 'm1', channel: 'allegro', direction: 'in', body: 'Czy mozna zapakowac na prezent?', attachments: [], sentAt: '2026-04-28T10:00:00Z', read: true },
      { id: 'm2', channel: 'allegro', direction: 'out', body: 'Tak, zapakujemy. Czy dolaczyc liscik?', attachments: [], sentAt: '2026-04-28T10:15:00Z', read: true },
      { id: 'm3', channel: 'allegro', direction: 'in', body: 'Tak, prosze: "Wszystkiego najlepszego!"', attachments: [], sentAt: '2026-04-28T10:20:00Z', read: false },
    ],
    returns: [
      {
        id: 'RET-001',
        status: 'reported',
        reason: 'Niezgodny z opisem',
        comment: 'Wino mialo byc rocznikiem 2018, dostalem 2019.',
        items: [{ sku: 'WINE-BAROLO-2019', name: 'Barolo DOCG 2019', quantity: 1 }],
        refundAmount: '71.00',
        shippingRefund: '0.00',
        returnMethod: 'paczkomat_seller_paid',
        attachments: ['photo1.jpg'],
        reportedAt: '2026-04-30T12:00:00Z',
        slaDeadline: '2026-05-07T12:00:00Z',
        timeline: [{ label: 'Zgloszenie zwrotu', at: '2026-04-30T12:00:00Z' }],
      },
    ],
    complaints: [
      {
        id: 'CMP-014',
        type: 'damage',
        status: 'open',
        origin: 'customer',
        escalated: false,
        proposedResolution: 'Czesciowy zwrot 30 PLN',
        attachments: ['damage1.jpg', 'damage2.jpg'],
        messageCount: 2,
        openedAt: '2026-04-30T13:00:00Z',
      },
    ],
    disputes: [],
    audit: [
      { id: 'a1', actor: 'admin@ilbuoncaffe.pl', action: 'view', target: 'order', at: '2026-04-29T07:55:00Z' },
      { id: 'a2', actor: 'admin@ilbuoncaffe.pl', action: 'status_change', target: 'order.status: paid -> processing', at: '2026-04-29T08:00:00Z' },
    ],
    createdAt: '2026-04-28T09:10:00Z',
    warnings: [
      { level: 'warn', text: 'Otwarte zgloszenie zwrotu — termin reakcji do 2026-05-07' },
      { level: 'warn', text: 'Otwarta reklamacja — czeka na decyzje' },
    ],
  }
}
