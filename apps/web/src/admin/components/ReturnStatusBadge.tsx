'use client'

import type { ReturnStatus } from '../types/admin-api'

interface ReturnStatusBadgeProps {
  status: ReturnStatus
}

const STATUS_CONFIG: Record<ReturnStatus, { label: string; className: string }> = {
  new:       { label: 'Zgłoszony',        className: 'badge-warning' },
  in_review: { label: 'W drodze',         className: 'badge-info' },
  approved:  { label: 'Do decyzji',       className: 'badge-success' },
  rejected:  { label: 'Odrzucony',        className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
  refunded:  { label: 'Zwrot rozliczony', className: 'badge-neutral text-[#9333EA] bg-[#FAF5FF]' },
  closed:    { label: 'Zamknięty',        className: 'badge-neutral' },
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }
  return <span className={config.className}>{config.label}</span>
}
