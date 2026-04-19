'use client'

import type { ComplaintStatus } from '../types/admin-api'

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus | string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DISPUTE_ONGOING:    { label: 'W toku',         className: 'badge-info' },
  DISPUTE_CLOSED:     { label: 'Zamknięta',      className: 'badge-neutral' },
  DISPUTE_UNRESOLVED: { label: 'Nierozwiązana',  className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
  CLAIM_SUBMITTED:    { label: 'Zgłoszona',      className: 'badge-warning' },
  CLAIM_ACCEPTED:     { label: 'Uznana',         className: 'badge-success' },
  CLAIM_REJECTED:     { label: 'Odrzucona',      className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
}

export function ComplaintStatusBadge({ status }: ComplaintStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }
  return <span className={config.className}>{config.label}</span>
}
