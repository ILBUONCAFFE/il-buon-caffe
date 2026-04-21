'use client'

interface OrderStatusBadgeProps {
  status: string
  source?: string
  allegroFulfillmentStatus?: string | null
  paymentMethod?: string | null
  paidAt?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Oczekujace', className: 'badge-warning' },
  paid: { label: 'Oplacone', className: 'badge-success' },
  processing: { label: 'W realizacji', className: 'badge-info' },
  shipped: { label: 'Wyslane', className: 'badge-neutral' },
  delivered: { label: 'Dostarczone', className: 'badge-success' },
  completed: { label: 'Dostarczone', className: 'badge-success' },
  cancelled: { label: 'Anulowane', className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
  refunded: { label: 'Zwrocone', className: 'badge-neutral text-[#9333EA] bg-[#FAF5FF]' },
}

const ALLEGRO_SYNC_MAP: Record<string, string[]> = {
  pending: ['NEW'],
  paid: ['NEW', 'PROCESSING'],
  processing: ['PROCESSING', 'READY_FOR_SHIPMENT'],
  shipped: ['SENT'],
  delivered: ['PICKED_UP'],
  completed: ['PICKED_UP'],
  cancelled: ['CANCELLED'],
}

export function OrderStatusBadge({
  status,
  source,
  allegroFulfillmentStatus,
  paymentMethod,
  paidAt,
}: OrderStatusBadgeProps) {
  const isCod = paymentMethod === 'CASH_ON_DELIVERY'
  if (isCod && status !== 'cancelled') {
    const isPaid = status === 'delivered' || status === 'completed' || !!paidAt
    if (status === 'shipped') {
      return <span className="badge-neutral">Wyslane</span>
    }
    if (status === 'delivered' || status === 'completed') {
      return <span className="badge-success">Dostarczone</span>
    }
    return <span className="badge-success">{isPaid ? 'Oplacone' : 'Platnosc przy odbiorze'}</span>
  }

  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }

  const isAllegro = source === 'allegro'
  const hasAllegroStatus = isAllegro && !!allegroFulfillmentStatus
  const isSynced = hasAllegroStatus
    ? (ALLEGRO_SYNC_MAP[status] ?? []).includes(allegroFulfillmentStatus)
    : true

  if (!isAllegro || !hasAllegroStatus) {
    return <span className={config.className}>{config.label}</span>
  }

  return (
    <span className={`${config.className} inline-flex items-center gap-1.5`}>
      {config.label}
      {isSynced ? (
        <span className="text-[10px] opacity-60" title={`Allegro: ${allegroFulfillmentStatus}`}>
          {allegroFulfillmentStatus}
        </span>
      ) : (
        <span
          className="text-[10px] text-amber-600 font-medium"
          title={`Rozbieznosc: lokalny=${status}, Allegro=${allegroFulfillmentStatus}`}
        >
          ! {allegroFulfillmentStatus}
        </span>
      )}
    </span>
  )
}
