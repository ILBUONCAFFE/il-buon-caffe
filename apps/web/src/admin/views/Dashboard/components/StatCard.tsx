'use client'

import { OrganicIcon } from '../../../components/ui/OrganicIcon'
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter'

type StatCardVariant = 'default' | 'warning' | 'success' | 'info'

const VARIANT_COLORS: Record<StatCardVariant, { bg: string; icon: string; value: string }> = {
  default: { bg: 'bg-[#EFF6FF]', icon: 'text-[#0066CC]', value: 'text-[#1A1A1A]' },
  warning: { bg: 'bg-[#FEF3C7]', icon: 'text-[#D97706]', value: 'text-[#D97706]' },
  success: { bg: 'bg-[#ECFDF5]', icon: 'text-[#059669]', value: 'text-[#059669]' },
  info:    { bg: 'bg-[#F0F9FF]', icon: 'text-[#0284C7]', value: 'text-[#0284C7]' },
}

type StatCardProps = {
  title: string
  value: number
  suffix?: string
  prefix?: string
  icon: React.ElementType
  variant?: StatCardVariant
  isLoading?: boolean
  /** Optional sub-label below the value */
  note?: string
}

export const StatCard = ({
  title, value, suffix = '', prefix = '',
  icon, variant = 'default', isLoading = false, note,
}: StatCardProps) => {
  const colors = VARIANT_COLORS[variant]
  const animated = useAnimatedCounter(value)

  return (
    <div className="card-light p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <OrganicIcon icon={icon} bgColor={colors.bg} iconColor={colors.icon} size="lg" />
        {isLoading && (
          <div className="w-16 h-4 rounded bg-[#E5E4E1] animate-pulse" />
        )}
      </div>
      <p className="text-label mb-1">{title}</p>
      {isLoading ? (
        <div className="h-8 w-24 rounded bg-[#E5E4E1] animate-pulse mt-1" />
      ) : (
        <>
          <p className={`text-value ${colors.value}`}>
            {prefix}{animated.toLocaleString('pl-PL')}{suffix}
          </p>
          {note && <p className="text-xs text-[#737373] mt-1">{note}</p>}
        </>
      )}
    </div>
  )
}
