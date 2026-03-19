export const getStatusBadge = (status: string) => {
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
