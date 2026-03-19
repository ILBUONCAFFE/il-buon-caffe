'use client'

import Link from 'next/link'
import { Plus, Users, Tag, Package } from 'lucide-react'
import { OrganicIcon } from '../../../components/ui/OrganicIcon'

const actions = [
  { icon: Plus,    label: 'Nowy produkt', href: '/admin/products/new',  bgColor: 'bg-[#EFF6FF]', iconColor: 'text-[#0066CC]' },
  { icon: Users,   label: 'Klienci',      href: '/admin/customers',     bgColor: 'bg-[#ECFDF5]', iconColor: 'text-[#059669]' },
  { icon: Tag,     label: 'Promocje',     href: '/admin/marketing',     bgColor: 'bg-[#FFFBEB]', iconColor: 'text-[#D97706]' },
  { icon: Package, label: 'Magazyn',      href: '/admin/products',      bgColor: 'bg-[#F0F9FF]', iconColor: 'text-[#0284C7]' },
]

export const QuickActions = () => {
  return (
    <div className="card-light p-6 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-h3 text-[#1A1A1A] mb-6">Szybkie działania</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-[#F5F4F1] transition-all duration-200 group"
          >
            <OrganicIcon icon={action.icon} bgColor={action.bgColor} iconColor={action.iconColor} size="lg" />
            <span className="text-sm font-medium text-[#1A1A1A] text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

