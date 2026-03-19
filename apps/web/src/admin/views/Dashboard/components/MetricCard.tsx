'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { OrganicIcon } from '../../../components/ui/OrganicIcon'
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter'

type MetricCardProps = {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  bgColor: string
  iconColor: string
  isAnimated?: boolean
}

export const MetricCard = ({
  title, value, change, trend, icon: Icon, bgColor, iconColor, isAnimated = false
}: MetricCardProps) => {
  const numericValue = parseInt(value.replace(/[^\d]/g, ''))
  const suffix = value.replace(/[\d]/g, '')
  const animatedCount = useAnimatedCounter(numericValue)
  const displayValue = isAnimated ? animatedCount : numericValue

  return (
    <div className="card-light p-6 cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <OrganicIcon icon={Icon} bgColor={bgColor} iconColor={iconColor} size="lg" />
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
          trend === 'up' ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#DC2626]/10 text-[#DC2626]'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </div>
      </div>
      <p className="text-label mb-2">{title}</p>
      <p className="text-value text-[#1A1A1A]">
        {displayValue.toLocaleString()}{suffix}
      </p>
    </div>
  )
}
