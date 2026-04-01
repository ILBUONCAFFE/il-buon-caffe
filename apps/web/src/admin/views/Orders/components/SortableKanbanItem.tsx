'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ShoppingBag, Store } from 'lucide-react'
import type { AdminOrder } from '../../../types/admin-api'
import { getStatusBadge } from '../../../utils/getStatusBadge'

type SortableKanbanItemProps = {
  order: AdminOrder
  onClick: () => void
}

export const SortableKanbanItem = ({ order, onClick }: SortableKanbanItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
  }

  const customerName = order.customerData?.name || '—'
  const itemsSummary = order.items?.length
    ? (order.items.length === 1 ? order.items[0].productName : `${order.items[0].productName} +${order.items.length - 1}`)
    : '—'
  const date = new Date(order.paidAt ?? order.createdAt).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-xl border border-[#E5E4E1] group relative cursor-pointer hover:border-[#D4D3D0] transition-colors"
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-[#D4D3D0] hover:text-[#A3A3A3]"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>
      <div className="pl-5">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium text-[#525252]">{order.orderNumber}</span>
            {order.source === 'allegro'
              ? <ShoppingBag size={10} className="text-[#EA580C]" />
              : <Store size={10} className="text-[#0066CC]" />}
          </div>
          <span className="text-[11px] text-[#A3A3A3]">{date}</span>
        </div>
        <p className="font-medium text-[#1A1A1A] text-sm">{customerName}</p>
        <p className="text-xs text-[#737373] mt-0.5 line-clamp-1">{itemsSummary}</p>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#F0EFEC]">
          <span className="font-mono font-semibold text-[#1A1A1A] text-sm tabular-nums">
            {Number(order.total).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {order.currency}
          </span>
          {getStatusBadge(order.status, order.paymentMethod, order.paidAt)}
        </div>
      </div>
    </div>
  )
}
