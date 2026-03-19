'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ShoppingBag, Store } from 'lucide-react'
import type { AdminOrder } from '../../../types/admin-api'

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
      className="bg-white p-4 rounded-xl border border-[#E5E4E1] shadow-sm mb-3 group relative cursor-pointer hover:border-[#0066CC] transition-colors"
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-[#A3A3A3] hover:text-[#525252]"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </div>
      <div className="pl-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium text-[#0066CC]">{order.orderNumber}</span>
            {order.source === 'allegro'
              ? <ShoppingBag size={12} className="text-[#FF5A00]" />
              : <Store size={12} className="text-[#0066CC]" />}
          </div>
          <span className="text-xs text-[#737373]">{date}</span>
        </div>
        <p className="font-medium text-[#1A1A1A] text-sm mb-1">{customerName}</p>
        <p className="text-xs text-[#525252] mb-3 line-clamp-1">{itemsSummary}</p>
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-[#E5E4E1]/50">
          <span className="font-mono font-semibold text-[#1A1A1A] text-sm">{Number(order.total).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
        </div>
      </div>
    </div>
  )
}
