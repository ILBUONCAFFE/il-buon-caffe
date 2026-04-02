'use client'

import { motion } from 'framer-motion'
import {
  RefreshCw,
  Download,
  Plus,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'

type QuickActionsProps = {
  pathname: string
}

type ActionButtonProps = {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'primary' | 'warning'
  onClick?: () => void
}

const variantClasses: Record<string, string> = {
  default:
    'bg-white border-[#E5E4E1] text-[#525252] hover:border-[#D4D3D0] hover:text-[#1A1A1A] hover:shadow-sm',
  primary:
    'bg-[#0066CC] border-transparent text-white hover:bg-[#0052A3]',
  warning:
    'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]',
}

function ActionButton({ icon, label, variant = 'default', onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer ${variantClasses[variant]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function Separator() {
  return <div className="w-px h-5 bg-[#E5E4E1] mx-1" />
}

export function hasQuickActions(pathname: string): boolean {
  if (pathname === '/admin' || pathname === '/admin/dashboard') return true
  if (pathname.startsWith('/admin/orders')) return true
  if (pathname.startsWith('/admin/inventory/products')) return true
  if (pathname.startsWith('/admin/customers')) return true
  return false
}

function getActions(pathname: string): React.ReactNode | null {
  if (pathname === '/admin' || pathname === '/admin/dashboard') {
    return (
      <>
        <ActionButton icon={<RefreshCw size={14} />} label="Odśwież dane" />
        <Separator />
        <ActionButton icon={<Download size={14} />} label="Eksportuj raport" />
      </>
    )
  }

  if (pathname.startsWith('/admin/orders')) {
    return (
      <>
        <ActionButton icon={<Plus size={14} />} label="Nowe zamówienie" variant="primary" />
        <Separator />
        <ActionButton icon={<Download size={14} />} label="Eksportuj CSV" />
        <ActionButton icon={<SlidersHorizontal size={14} />} label="Filtruj zaawansowane" />
      </>
    )
  }

  if (pathname.startsWith('/admin/inventory/products')) {
    return (
      <>
        <ActionButton icon={<Plus size={14} />} label="Nowy produkt" variant="primary" />
        <Separator />
        <ActionButton icon={<Upload size={14} />} label="Import CSV" />
        <ActionButton icon={<RefreshCw size={14} />} label="Synchronizuj Allegro" />
      </>
    )
  }

  if (pathname.startsWith('/admin/customers')) {
    return (
      <>
        <ActionButton icon={<Download size={14} />} label="Eksportuj bazę" />
        <ActionButton icon={<SlidersHorizontal size={14} />} label="Filtruj segmenty" />
      </>
    )
  }

  return null
}

export function QuickActions({ pathname }: QuickActionsProps) {
  const actions = getActions(pathname)

  if (!actions) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
      className="overflow-hidden"
    >
      <div className="px-8 py-2.5 border-t border-[#F5F4F1] flex items-center gap-2 bg-[#FAFAF9]/50">
        {actions}
      </div>
    </motion.div>
  )
}
