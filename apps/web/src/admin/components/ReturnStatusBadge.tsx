'use client'

import type { ReturnStatus } from '../types/admin-api'

interface ReturnStatusBadgeProps {
  status: ReturnStatus
}

const STATUS_CONFIG: Record<ReturnStatus, { label: string; className: string }> = {
  new:       { label: 'Nowy',           className: 'badge-warning' },
  in_review: { label: 'W rozpatrzeniu', className: 'badge-info' },
  approved:  { label: 'Zaakceptowany',  className: 'badge-success' },
  rejected:  { label: 'Odrzucony',      className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
  refunded:  { label: 'Zwrot wyslany',  className: 'badge-neutral text-[#9333EA] bg-[#FAF5FF]' },
  closed:    { label: 'Zamkniety',      className: 'badge-neutral' },
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }
  return <span className={config.className}>{config.label}</span>
}
