export const getStatusBadge = (status: string, paymentMethod?: string | null, paidAt?: string | null) => {
  const isCod = paymentMethod === 'CASH_ON_DELIVERY'

  if (isCod) {
    const isPaid = status === 'delivered' || status === 'completed' || !!paidAt
    const paymentBadge = isPaid
      ? <span className="badge-success">Opłacone</span>
      : <span className="badge-success">Płatność przy odbiorze</span>

    if (status === 'cancelled') {
      return <span className="badge-neutral text-[#DC2626] bg-[#FEF2F2]">Anulowane</span>
    }

    if (status === 'shipped') return <span className="badge-neutral">Wysłane</span>
    if (status === 'delivered' || status === 'completed') return <span className="badge-success">Dostarczone</span>
    return paymentBadge
  }

  switch (status) {
    case 'completed':
    case 'delivered':
      return <span className="badge-success">Zakończone</span>
    case 'paid':
      return <span className="badge-success">Opłacone</span>
    case 'processing':
      return <span className="badge-info">W realizacji</span>
    case 'pending':
      return <span className="badge-warning">Oczekujące</span>
    case 'shipped':
      return <span className="badge-neutral">Wysłane</span>
    case 'cancelled':
      return <span className="badge-neutral text-[#DC2626] bg-[#FEF2F2]">Anulowane</span>
    case 'refunded':
      return <span className="badge-neutral text-[#9333EA] bg-[#FAF5FF]">Zwrócone</span>
    default:
      return <span className="badge-neutral">{status}</span>
  }
}
